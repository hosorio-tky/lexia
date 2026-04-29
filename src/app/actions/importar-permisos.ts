"use server";

import * as XLSX from "xlsx";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPermisosRepository } from "@/lib/repositories/permisos";
import { getSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { PERMIT_TYPES, PERMIT_STATUSES } from "@/types/permits";
import type { PermitType, PermitStatus } from "@/types/permits";
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
  //   Fila 1: headers  → keys del objeto (nombre, tipo, ...)
  //   Fila 2: ejemplo  → se detecta y omite automáticamente
  //   Fila 3+: datos reales
  //
  // Se omiten filas donde "nombre" esté vacío o sea el texto de ejemplo exacto.
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: true,
  });

  const NOMBRE_EJEMPLO = "Registro Sanitario Planta Norte";

  const filas = raw.filter((row) => {
    const nombre = String(row["nombre"] ?? "").trim();
    if (!nombre || nombre === NOMBRE_EJEMPLO) return false;
    return Object.values(row).some((v) => v !== "" && v !== null && v !== undefined);
  });

  const result: ImportResult = { total: filas.length, exitosos: 0, errores: [] };

  if (filas.length === 0) return result;

  const client = createAdminClient();
  const repo   = createPermisosRepository(client, session.tenant_id);

  for (let i = 0; i < filas.length; i++) {
    const row       = filas[i];
    const numFila   = i + 3; // fila 1=headers, fila 2=ejemplo, fila 3+=datos
    const errores: string[] = [];

    // ── Validaciones ────────────────────────────────────────
    const nombre = String(row["nombre"] ?? "").trim();
    if (!nombre) errores.push("El campo 'nombre' es obligatorio");

    const tipoRaw = String(row["tipo"] ?? "").trim();
    if (!tipoRaw) {
      errores.push("El campo 'tipo' es obligatorio");
    } else if (!PERMIT_TYPES.includes(tipoRaw as PermitType)) {
      errores.push(`Tipo inválido: "${tipoRaw}". Valores válidos: ${PERMIT_TYPES.join(", ")}`);
    }

    const estadoRaw = String(row["estado"] ?? "").trim();
    if (estadoRaw && !PERMIT_STATUSES.includes(estadoRaw as PermitStatus)) {
      errores.push(`Estado inválido: "${estadoRaw}". Valores válidos: ${PERMIT_STATUSES.join(", ")}`);
    }

    const fechaSolicitud   = parseFecha(row["fecha_solicitud"]);
    const fechaEmision     = parseFecha(row["fecha_emision"]);
    const fechaVencimiento = parseFecha(row["fecha_vencimiento"]);

    if (row["fecha_solicitud"]   && !fechaSolicitud)   errores.push("Fecha de solicitud inválida (usa DD/MM/AAAA)");
    if (row["fecha_emision"]     && !fechaEmision)     errores.push("Fecha de emisión inválida (usa DD/MM/AAAA)");
    if (row["fecha_vencimiento"] && !fechaVencimiento) errores.push("Fecha de vencimiento inválida (usa DD/MM/AAAA)");

    if (errores.length > 0) {
      result.errores.push({ fila: numFila, nombre: nombre || "(sin nombre)", errores });
      continue;
    }

    // ── Inserción ────────────────────────────────────────────
    try {
      await repo.create({
        tenant_id:           session.tenant_id,
        nombre,
        tipo:                tipoRaw as PermitType,
        numero_expediente:   String(row["numero_expediente"] ?? "").trim() || undefined,
        entidad_reguladora:  String(row["entidad_reguladora"] ?? "").trim() || undefined,
        ubicacion:           String(row["ubicacion"] ?? "").trim() || undefined,
        descripcion:         String(row["descripcion"] ?? "").trim() || undefined,
        responsable_nombre:  String(row["responsable_nombre"] ?? "").trim() || undefined,
        fecha_solicitud:     fechaSolicitud,
        fecha_emision:       fechaEmision,
        fecha_vencimiento:   fechaVencimiento,
        ...(estadoRaw ? { estado: estadoRaw as PermitStatus } : {}),
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
