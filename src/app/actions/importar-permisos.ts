"use server";

import * as XLSX from "xlsx";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPermisosRepository } from "@/lib/repositories/permisos";
import { getSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";

import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { createUbicacionesRepository } from "@/lib/repositories/ubicaciones";
import { createResponsablesRepository } from "@/lib/repositories/responsables";
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

// ── Parseo de booleano en español ("Sí"/"No") ─────────────────
function parseBooleano(valor: unknown): boolean | undefined | null {
  const str = String(valor ?? "").trim().toLowerCase();
  if (!str) return undefined;
  if (["si", "sí", "true", "1", "x", "yes"].includes(str)) return true;
  if (["no", "false", "0"].includes(str)) return false;
  return null; // valor inválido
}

// ── Server Action principal ───────────────────────────────────
export async function importarPermisos(
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
  //   Fila 1: headers → keys del objeto (nombre, tipo, ...)
  //   Fila 2+: datos  → incluye la fila de ejemplo de la plantilla si el
  //                     usuario no la borró ni la sobrescribió; se procesa
  //                     igual que cualquier otra fila (sin caso especial
  //                     por nombre) para que el comportamiento sea
  //                     predecible: lo que está en el Excel se importa.
  //
  // Se omiten únicamente filas completamente vacías o sin "nombre".
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: true,
  });

  const filas = raw.filter((row) => {
    const nombre = String(row["nombre"] ?? "").trim();
    if (!nombre) return false;
    return Object.values(row).some((v) => v !== "" && v !== null && v !== undefined);
  });

  const result: ImportResult = { total: filas.length, exitosos: 0, errores: [] };

  if (filas.length === 0) return result;

  const client = createAdminClient();
  const repo   = createPermisosRepository(client, session.tenant_id);

  // Catálogos y listas para resolver todas las FKs por nombre.
  const configRepo = createConfiguracionRepository(client, session.tenant_id);
  async function fetchEstadosPermiso(): Promise<{ id: string; valor: string }[]> {
    try {
      const { data } = await client.from("workflow_estados").select("id, valor").eq("modulo", "permisos");
      return (data ?? []) as { id: string; valor: string }[];
    } catch {
      return [];
    }
  }
  const [tiposCatalogo, entidadesCatalogo, ubicacionesList, responsablesList, estadosRows] =
    await Promise.all([
      configRepo.getCatalogos("permisos", "tipo_permiso").catch(() => []),
      configRepo.getCatalogos("permisos", "entidad_reguladora").catch(() => []),
      createUbicacionesRepository(client, session.tenant_id).list().catch(() => []),
      createResponsablesRepository(client, session.tenant_id).list().catch(() => []),
      fetchEstadosPermiso(),
    ]);

  for (let i = 0; i < filas.length; i++) {
    const row       = filas[i];
    const numFila   = i + 2; // fila 1=headers, fila 2+=datos
    const errores: string[] = [];

    // ── Validaciones ────────────────────────────────────────
    const nombre = String(row["nombre"] ?? "").trim();
    if (!nombre) errores.push("El campo 'nombre' es obligatorio");

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

    const entidadRaw = String(row["entidad_reguladora"] ?? "").trim();
    let entidadId: string | undefined;
    if (entidadRaw) {
      const match = entidadesCatalogo.find((c) => c.valor.toLowerCase() === entidadRaw.toLowerCase());
      if (match) {
        entidadId = match.id;
      } else {
        errores.push(`Entidad reguladora no encontrada: "${entidadRaw}". Verifica las entidades configuradas en Configuración → Catálogos.`);
      }
    }

    const ubicacionRaw = String(row["ubicacion"] ?? "").trim();
    let ubicacionId: string | undefined;
    let ubicacionNombre: string | undefined;
    if (ubicacionRaw) {
      const match = ubicacionesList.find((u) => u.nombre.toLowerCase() === ubicacionRaw.toLowerCase());
      if (match) {
        ubicacionId     = match.id;
        ubicacionNombre = match.nombre;
      } else {
        errores.push(`Ubicación no encontrada: "${ubicacionRaw}". Verifica las ubicaciones configuradas en Configuración → Ubicaciones.`);
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

    const valorTramite = parseMonto(row["valor_tramite"]);
    if (valorTramite === null) errores.push("El campo 'valor_tramite' debe ser numérico");

    const monedaRaw = String(row["moneda"] ?? "").trim().toUpperCase();
    if (monedaRaw && !/^[A-Z]{3}$/.test(monedaRaw)) {
      errores.push(`Moneda inválida: "${monedaRaw}". Usa un código de 3 letras (ej: USD).`);
    }

    const tieneProvisional = parseBooleano(row["tiene_provisional"]);
    if (tieneProvisional === null) errores.push(`El campo 'tiene_provisional' debe ser "Sí" o "No"`);

    const fechaSolicitud             = parseFecha(row["fecha_solicitud"]);
    const fechaEmision               = parseFecha(row["fecha_emision"]);
    const fechaVencimiento           = parseFecha(row["fecha_vencimiento"]);
    const fechaEmisionProvisional    = parseFecha(row["fecha_emision_provisional"]);
    const fechaVencimientoProvisional = parseFecha(row["fecha_vencimiento_provisional"]);

    if (row["fecha_solicitud"]                 && !fechaSolicitud)                 errores.push("Fecha de solicitud inválida (usa DD/MM/AAAA)");
    if (row["fecha_emision"]                   && !fechaEmision)                   errores.push("Fecha de emisión inválida (usa DD/MM/AAAA)");
    if (row["fecha_vencimiento"]                && !fechaVencimiento)              errores.push("Fecha de vencimiento inválida (usa DD/MM/AAAA)");
    if (row["fecha_emision_provisional"]        && !fechaEmisionProvisional)       errores.push("Fecha de emisión provisional inválida (usa DD/MM/AAAA)");
    if (row["fecha_vencimiento_provisional"]    && !fechaVencimientoProvisional)   errores.push("Fecha de vencimiento provisional inválida (usa DD/MM/AAAA)");

    if (errores.length > 0) {
      result.errores.push({ fila: numFila, nombre: nombre || "(sin nombre)", errores });
      continue;
    }

    // ── Inserción ────────────────────────────────────────────
    try {
      await repo.create({
        tenant_id:                     session.tenant_id,
        nombre,
        tipo_id:                       tipoId,
        estado_id:                     estadoId,
        numero_expediente:             String(row["numero_expediente"] ?? "").trim() || undefined,
        entidad_reguladora_id:         entidadId,
        ubicacion_id:                  ubicacionId,
        ubicacion:                     ubicacionNombre,
        descripcion:                   String(row["descripcion"] ?? "").trim() || undefined,
        responsable_id:                responsableId,
        responsable_ids:               responsableId ? [responsableId] : undefined,
        responsable_nombre:            responsableNombre,
        fecha_solicitud:               fechaSolicitud,
        fecha_emision:                 fechaEmision,
        fecha_vencimiento:             fechaVencimiento,
        valor_tramite:                 valorTramite ?? undefined,
        moneda:                        monedaRaw || undefined,
        base_legal:                    String(row["base_legal"] ?? "").trim() || undefined,
        riesgo_incumplimiento:         String(row["riesgo_incumplimiento"] ?? "").trim() || undefined,
        base_legal_incumplimiento:     String(row["base_legal_incumplimiento"] ?? "").trim() || undefined,
        tiene_provisional:             tieneProvisional ?? undefined,
        fecha_emision_provisional:     fechaEmisionProvisional,
        fecha_vencimiento_provisional: fechaVencimientoProvisional,
      });
      result.exitosos++;
    } catch (err) {
      result.errores.push({
        fila:    numFila,
        nombre,
        errores: [err instanceof Error ? err.message : "Error al guardar el registro"],
      });
    }
  }

  if (result.exitosos > 0) {
    await logActivity({
      tenant_id:   session.tenant_id,
      user_id:     session.user_id,
      user_nombre: session.nombre,
      accion:      "importar_permisos",
      modulo:      "permisos",
      recurso_id:  "bulk",
      metadata:    { total: result.total, exitosos: result.exitosos, errores: result.errores.length },
    });
    revalidatePath("/permisos");
  }

  return result;
}
