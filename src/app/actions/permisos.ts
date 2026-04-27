"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPermisosRepository } from "@/lib/repositories/permisos";
import { getSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { logError } from "@/lib/logger";
import type { PermitStatus } from "@/types/permits";

// Campos legibles para el diff
const FIELD_LABELS: Record<string, string> = {
  nombre:             "Nombre",
  tipo:               "Tipo",
  numero_expediente:  "Nº Expediente",
  entidad_reguladora: "Entidad reguladora",
  ubicacion:          "Ubicación",
  descripcion:        "Descripción",
  fecha_solicitud:    "Fecha solicitud",
  fecha_emision:      "Fecha emisión",
  fecha_vencimiento:  "Fecha vencimiento",
  responsable_nombre: "Responsable",
};

// ─── Crear permiso ─────────────────────────────────────────────
export async function crearPermiso(formData: FormData) {
  const session = await getSession();
  try {
    const client  = createAdminClient();
    const repo    = createPermisosRepository(client, session.tenant_id);

    const valorTramiteRaw = (formData.get("valor_tramite") as string)?.trim();
    const tieneProvisional = formData.get("tiene_provisional") === "true";

    const input = {
      tenant_id:                  session.tenant_id,
      nombre:                     formData.get("nombre") as string,
      tipo:                       formData.get("tipo") as string,
      numero_expediente:          (formData.get("numero_expediente") as string) || undefined,
      entidad_reguladora:         (formData.get("entidad_reguladora") as string) || undefined,
      responsable_id:             (formData.get("responsable_id") as string) || undefined,
      responsable_nombre:         (formData.get("responsable_nombre") as string) || undefined,
      ubicacion_id:               (formData.get("ubicacion_id") as string) || undefined,
      ubicacion:                  (formData.get("ubicacion") as string) || undefined,
      descripcion:                (formData.get("descripcion") as string) || undefined,
      fecha_solicitud:            (formData.get("fecha_solicitud") as string) || undefined,
      fecha_emision:              (formData.get("fecha_emision") as string) || undefined,
      fecha_vencimiento:          (formData.get("fecha_vencimiento") as string) || undefined,
      tiene_provisional:          tieneProvisional || undefined,
      fecha_emision_provisional:  (formData.get("fecha_emision_provisional") as string) || undefined,
      fecha_vencimiento_provisional: (formData.get("fecha_vencimiento_provisional") as string) || undefined,
      valor_tramite:              valorTramiteRaw ? parseFloat(valorTramiteRaw) : undefined,
      moneda:                     (formData.get("moneda") as string) || undefined,
      base_legal:                 (formData.get("base_legal") as string) || undefined,
      riesgo_incumplimiento:      (formData.get("riesgo_incumplimiento") as string) || undefined,
      base_legal_incumplimiento:  (formData.get("base_legal_incumplimiento") as string) || undefined,
    };

    if (!input.nombre || !input.tipo) {
      throw new Error("Nombre y tipo son obligatorios");
    }

    const permiso = await repo.create(input);

    await logActivity({
      tenant_id:    session.tenant_id,
      user_id:      session.user_id,
      user_nombre:  session.nombre,
      accion:       "crear_permiso",
      modulo:       "permisos",
      recurso_id:   permiso.id,
      recurso_desc: input.nombre,
    });

    revalidatePath("/permisos");
    redirect(`/permisos/${permiso.id}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       "/permisos",
      action:     "crearPermiso",
    });
    throw err;
  }
}

// ─── Editar permiso ────────────────────────────────────────────
export async function editarPermiso(id: string, formData: FormData) {
  const session = await getSession();
  try {
  const client  = createAdminClient();
  const repo    = createPermisosRepository(client, session.tenant_id);

  // Fetch estado actual para detectar cambios
  const actual = await repo.getById(id);

  const valorTramiteEditRaw = (formData.get("valor_tramite") as string)?.trim();
  const tieneProvisionalEdit = formData.get("tiene_provisional") === "true";

  const input: Record<string, string | number | boolean | null | undefined> = {
    nombre:                     formData.get("nombre") as string,
    tipo:                       formData.get("tipo") as string,
    numero_expediente:          (formData.get("numero_expediente") as string) || undefined,
    entidad_reguladora:         (formData.get("entidad_reguladora") as string) || undefined,
    responsable_id:             (formData.get("responsable_id") as string) || null,
    responsable_nombre:         (formData.get("responsable_nombre") as string) || undefined,
    ubicacion_id:               (formData.get("ubicacion_id") as string) || null,
    ubicacion:                  (formData.get("ubicacion") as string) || undefined,
    descripcion:                (formData.get("descripcion") as string) || undefined,
    fecha_solicitud:            (formData.get("fecha_solicitud") as string) || undefined,
    fecha_emision:              (formData.get("fecha_emision") as string) || undefined,
    fecha_vencimiento:          (formData.get("fecha_vencimiento") as string) || undefined,
    tiene_provisional:          tieneProvisionalEdit,
    fecha_emision_provisional:  (formData.get("fecha_emision_provisional") as string) || null,
    fecha_vencimiento_provisional: (formData.get("fecha_vencimiento_provisional") as string) || null,
    valor_tramite:              valorTramiteEditRaw ? parseFloat(valorTramiteEditRaw) : null,
    moneda:                     (formData.get("moneda") as string) || undefined,
    base_legal:                 (formData.get("base_legal") as string) || undefined,
    riesgo_incumplimiento:      (formData.get("riesgo_incumplimiento") as string) || undefined,
    base_legal_incumplimiento:  (formData.get("base_legal_incumplimiento") as string) || undefined,
  };

  // Calcular diff de campos
  const cambios: Array<{ campo: string; de: string | null; a: string | null }> = [];
  if (actual) {
    for (const key of Object.keys(FIELD_LABELS)) {
      const valorAntes    = (actual as unknown as Record<string, unknown>)[key];
      const valorDespues  = input[key];
      const toStr = (v: unknown): string | null => {
        if (v === "" || v === null || v === undefined) return null;
        return String(v);
      };
      if (toStr(valorAntes) !== toStr(valorDespues)) {
        cambios.push({ campo: FIELD_LABELS[key], de: toStr(valorAntes), a: toStr(valorDespues) });
      }
    }

    // Detect date changes and register history
    const fechaEmisionCambia =
      (actual.fecha_emision ?? null) !== ((input.fecha_emision as string) || null);
    const fechaVencimientoCambia =
      (actual.fecha_vencimiento ?? null) !== ((input.fecha_vencimiento as string) || null);

    if (fechaEmisionCambia || fechaVencimientoCambia) {
      await repo.registrarCambioFechas(id, {
        fecha_emision_anterior:    actual.fecha_emision ?? null,
        fecha_vencimiento_anterior: actual.fecha_vencimiento ?? null,
        changed_by_nombre:         session.nombre,
        motivo:                    "Edición de permiso",
      });
    }
  }

  await repo.update(id, input);

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "editar_permiso",
    modulo:       "permisos",
    recurso_id:   id,
    recurso_desc: input.nombre as string | undefined,
    metadata:     cambios.length > 0 ? { cambios } : undefined,
  });

  revalidatePath(`/permisos/${id}`);
  revalidatePath("/permisos");
  redirect(`/permisos/${id}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       `/permisos/${id}`,
      action:     "editarPermiso",
    });
    throw err;
  }
}

// ─── Cambiar estado (workflow) ─────────────────────────────────
export async function cambiarEstado(
  id: string,
  newStatus: PermitStatus,
  comment?: string
) {
  const session = await getSession();
  try {
    const client  = createAdminClient();
    const repo    = createPermisosRepository(client, session.tenant_id);

    // Obtener estado anterior para el metadata
    const actual = await repo.getById(id);
    await repo.changeStatus(id, newStatus, comment);

    await logActivity({
      tenant_id:    session.tenant_id,
      user_id:      session.user_id,
      user_nombre:  session.nombre,
      accion:       "cambiar_estado",
      modulo:       "permisos",
      recurso_id:   id,
      recurso_desc: actual?.nombre,
      metadata: {
        estado_anterior: actual?.estado ?? null,
        estado_nuevo:    newStatus,
        comentario:      comment || null,
      },
    });

    revalidatePath(`/permisos/${id}`);
    revalidatePath("/permisos");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       `/permisos/${id}`,
      action:     "cambiarEstado",
    });
    throw err;
  }
}

// ─── Eliminar permiso ──────────────────────────────────────────
export async function eliminarPermiso(id: string) {
  const session = await getSession();
  try {
    const client  = createAdminClient();
    const repo    = createPermisosRepository(client, session.tenant_id);

    const actual = await repo.getById(id);
    await repo.delete(id);

    await logActivity({
      tenant_id:    session.tenant_id,
      user_id:      session.user_id,
      user_nombre:  session.nombre,
      accion:       "eliminar_permiso",
      modulo:       "permisos",
      recurso_id:   id,
      recurso_desc: actual?.nombre,
    });

    revalidatePath("/permisos");
    redirect("/permisos");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       `/permisos/${id}`,
      action:     "eliminarPermiso",
    });
    throw err;
  }
}
