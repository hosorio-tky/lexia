"use server";

import * as XLSX from "xlsx";
import { createAdminClient } from "@/lib/supabase/admin";
import { createContratosRepository } from "@/lib/repositories/contratos";
import { getSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";

import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { createResponsablesRepository } from "@/lib/repositories/responsables";
import { MONEDAS_CONTRATO } from "@/types/contratos";
import { revalidatePath } from "next/cache";

// ── Tipos de resultado ────────────────────────────────────────
export interface FilaError {
  fila: number;
  nombre: string;
  errores: string[];
}

export interface ImportResult {
  total:     number;
  exitosos:  number;
  errores:   FilaError[];
}

// ── Parseo de fechas DD/MM/AAAA o serial Excel ────────────────
function parseFecha(valor: unknown): string | undefined {
  if (!valor) return undefined;

  // Serial numérico de Excel
  if (typeof valor === "number") {
    const date = XLSX.SSF.parse_date_code(valor);
    if (!date) return undefined;
    const y = date.y;
    const m = String(date.m).padStart(2, "0");
    const d = String(date.d).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const str = String(valor).trim();
  if (!str) return undefined;

  // DD/MM/AAAA o DD-MM-AAAA
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // ISO AAAA-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  return undefined;
}

// ── Parseo de monto numérico (acepta "1,500.00", "1500", etc.) ─
function parseMonto(valor: unknown): number | undefined | null {
  if (valor === undefined || valor === null || valor === "") return undefined;
  if (typeof valor === "number") return valor;
  const str = String(valor).trim().replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  if (!str) return undefined;
  const num = Number(str);
  return Number.isFinite(num) ? num : null; // null = valor inválido
}

// ── Validación simple de email ─────────────────────────────────
function esEmailValido(str: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

// ── Server Action principal ───────────────────────────────────
export async function importarContratos(
  formData: FormData
): Promise<ImportResult> {
  const session = await getSession();
  const file    = formData.get("archivo") as File | null;

  if (!file) throw new Error("No se recibió ningún archivo");

  const buffer     = await file.arrayBuffer();
  const wb         = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName  = wb.SheetNames[0];
  const ws         = wb.Sheets[sheetName];

  // Estructura de la plantilla:
  //   Fila 1: headers → keys del objeto (titulo, tipo, ...)
  //   Fila 2+: datos  → incluye la fila de ejemplo de la plantilla si el
  //                     usuario no la borró ni la sobrescribió; se procesa
  //                     igual que cualquier otra fila (sin caso especial
  //                     por nombre) para que el comportamiento sea
  //                     predecible: lo que está en el Excel se importa.
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: true,
  });

  // Solo se descartan filas totalmente vacías (ej: filas sobrantes al final
  // del archivo). Cualquier fila con algún dato, incluida una sin "titulo",
  // se valida y reporta — nunca se descarta en silencio.
  const filas = raw.filter((row) =>
    Object.values(row).some((v) => v !== "" && v !== null && v !== undefined)
  );

  const result: ImportResult = { total: filas.length, exitosos: 0, errores: [] };

  if (filas.length === 0) return result;

  const client = createAdminClient();
  const repo   = createContratosRepository(client, session.tenant_id);

  // Catálogos y listas para resolver todas las FKs por nombre.
  const configRepo = createConfiguracionRepository(client, session.tenant_id);
  async function fetchEstadosContrato(): Promise<{ id: string; valor: string }[]> {
    try {
      const { data } = await client.from("workflow_estados").select("id, valor").eq("modulo", "contratos");
      return (data ?? []) as { id: string; valor: string }[];
    } catch {
      return [];
    }
  }
  const [tiposCatalogo, responsablesList, estadosRows] = await Promise.all([
    configRepo.getCatalogos("contratos", "tipo_contrato").catch(() => []),
    createResponsablesRepository(client, session.tenant_id).list().catch(() => []),
    fetchEstadosContrato(),
  ]);

  // ── Fase 1: validar TODAS las filas antes de escribir nada ──────
  // Importación todo-o-nada: si cualquier fila falla, no se crea ningún
  // contrato — se reportan todos los errores para corregir el Excel de
  // una vez y volver a subirlo, sin dejar registros a medias ni FKs
  // huérfanas.
  interface FilaValida {
    numFila: number;
    titulo: string;
    data: Parameters<typeof repo.create>[0];
  }
  const validas: FilaValida[] = [];

  for (let i = 0; i < filas.length; i++) {
    const row       = filas[i];
    const numFila   = i + 2; // fila 1=headers, fila 2+=datos
    const errores: string[] = [];

    // ── Validaciones ────────────────────────────────────────
    const titulo = String(row["titulo"] ?? "").trim();
    if (!titulo) errores.push("El campo 'titulo' es obligatorio");

    const tipoRaw = String(row["tipo"] ?? "").trim();
    let tipoId: string | undefined;
    if (!tipoRaw) {
      errores.push("El campo 'tipo' es obligatorio");
    } else {
      const match = tiposCatalogo.find((c) => c.valor.toLowerCase() === tipoRaw.toLowerCase());
      if (match) {
        tipoId = match.id;
      } else {
        errores.push(`Tipo no encontrado en catálogo: "${tipoRaw}". Verifica los tipos configurados en Configuración → Catálogos.`);
      }
    }

    const responsableRaw = String(row["responsable_nombre"] ?? "").trim();
    let responsableId: string | undefined;
    let responsableNombre: string | undefined;
    if (responsableRaw) {
      const match = responsablesList.find(
        (r) =>
          r.nombre.toLowerCase() === responsableRaw.toLowerCase() ||
          (r.email && r.email.toLowerCase() === responsableRaw.toLowerCase())
      );
      if (match) {
        responsableId     = match.id;
        responsableNombre = match.nombre;
      } else {
        errores.push(`Responsable no encontrado: "${responsableRaw}". Verifica los responsables configurados en Configuración → Responsables.`);
      }
    }

    const estadoRaw = String(row["estado"] ?? "").trim();
    let estadoId: string | undefined;
    if (estadoRaw) {
      const match = estadosRows.find((e) => e.valor.toLowerCase() === estadoRaw.toLowerCase());
      if (match) {
        estadoId = match.id;
      } else {
        errores.push(`Estado no encontrado: "${estadoRaw}". Verifica los valores permitidos en la hoja "Instrucciones".`);
      }
    }

    const valor = parseMonto(row["valor"]);
    if (valor === null) errores.push("El campo 'valor' debe ser numérico");

    const monedaRaw = String(row["moneda"] ?? "").trim().toUpperCase();
    if (monedaRaw && !(MONEDAS_CONTRATO as readonly string[]).includes(monedaRaw)) {
      errores.push(`Moneda inválida: "${monedaRaw}". Usa una de: ${MONEDAS_CONTRATO.join(", ")}.`);
    }

    const contraparteEmailRaw = String(row["contraparte_email"] ?? "").trim();
    if (contraparteEmailRaw && !esEmailValido(contraparteEmailRaw)) {
      errores.push(`Correo de contraparte inválido: "${contraparteEmailRaw}".`);
    }

    const fechaInicio = parseFecha(row["fecha_inicio"]);
    const fechaFirma  = parseFecha(row["fecha_firma"]);
    const fechaFin    = parseFecha(row["fecha_fin"]);

    if (row["fecha_inicio"] && !fechaInicio) errores.push("Fecha de inicio inválida (usa DD/MM/AAAA)");
    if (row["fecha_firma"]  && !fechaFirma)  errores.push("Fecha de firma inválida (usa DD/MM/AAAA)");
    if (row["fecha_fin"]    && !fechaFin)    errores.push("Fecha de fin inválida (usa DD/MM/AAAA)");

    if (errores.length > 0) {
      result.errores.push({ fila: numFila, nombre: titulo || "(sin título)", errores });
      continue;
    }

    validas.push({
      numFila,
      titulo,
      data: {
        tenant_id:           session.tenant_id,
        titulo,
        tipo_id:             tipoId,
        estado_id:           estadoId,
        numero:              String(row["numero"] ?? "").trim() || undefined,
        descripcion:         String(row["descripcion"] ?? "").trim() || undefined,
        contraparte_nombre:  String(row["contraparte_nombre"] ?? "").trim() || undefined,
        contraparte_email:   contraparteEmailRaw || undefined,
        valor:               valor ?? undefined,
        moneda:              monedaRaw || undefined,
        fecha_inicio:        fechaInicio,
        fecha_firma:         fechaFirma,
        fecha_fin:           fechaFin,
        responsable_id:      responsableId,
        responsable_ids:     responsableId ? [responsableId] : undefined,
        responsable_nombre:  responsableNombre,
        created_by:          session.user_id,
      },
    });
  }

  // Si CUALQUIER fila falló la validación, no se escribe nada — se
  // reportan todos los errores para corregir el Excel completo de una vez.
  if (result.errores.length > 0) {
    return result;
  }

  // ── Fase 2: todas las filas son válidas — insertar ──────────────
  for (const { numFila, titulo, data } of validas) {
    try {
      await repo.create(data);
      result.exitosos++;
    } catch (err) {
      result.errores.push({
        fila:    numFila,
        nombre:  titulo,
        errores: [err instanceof Error ? err.message : "Error al guardar el registro"],
      });
    }
  }

  if (result.exitosos > 0) {
    await logActivity({
      tenant_id:   session.tenant_id,
      user_id:     session.user_id,
      user_nombre: session.nombre,
      accion:      "importar_contratos",
      modulo:      "contratos",
      recurso_id:  "bulk",
      metadata:    { total: result.total, exitosos: result.exitosos, errores: result.errores.length },
    });
    revalidatePath("/contratos");
  }

  return result;
}
