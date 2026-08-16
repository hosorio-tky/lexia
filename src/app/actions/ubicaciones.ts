"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUbicacionesRepository } from "@/lib/repositories/ubicaciones";
import { getSession, requireRole } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import type { Ubicacion } from "@/lib/repositories/ubicaciones";

export async function crearUbicacion(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; ubicacion?: Ubicacion }> {
  const session      = await getSession();
  requireRole(session, ["admin"]);
  const nombre       = (formData.get("nombre")       as string)?.trim();
  const direccion    = (formData.get("direccion")    as string)?.trim() || undefined;
  const ciudad       = (formData.get("ciudad")       as string)?.trim() || undefined;
  const departamento = (formData.get("departamento") as string)?.trim() || undefined;

  if (!nombre) return { error: "El nombre es obligatorio" };

  const repo     = createUbicacionesRepository(createAdminClient(), session.tenant_id);
  const ubicacion = await repo.create({ nombre, direccion, ciudad, departamento });

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "crear_ubicacion",
    modulo:       "configuracion",
    recurso_id:   ubicacion.id,
    recurso_desc: nombre,
  });

  revalidatePath("/configuracion/ubicaciones");
  return { ubicacion };
}

export async function editarUbicacion(
  id: string,
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session      = await getSession();
  requireRole(session, ["admin"]);
  const nombre       = (formData.get("nombre")       as string)?.trim();
  const direccion    = (formData.get("direccion")    as string)?.trim() || null;
  const ciudad       = (formData.get("ciudad")       as string)?.trim() || null;
  const departamento = (formData.get("departamento") as string)?.trim() || null;

  if (!nombre) return { error: "El nombre es obligatorio" };

  const client = createAdminClient();

  const { data: actual } = await client
    .from("ubicaciones")
    .select("nombre, direccion, ciudad, departamento")
    .eq("id", id)
    .eq("tenant_id", session.tenant_id)
    .single();

  const repo = createUbicacionesRepository(client, session.tenant_id);
  await repo.update(id, { nombre, direccion, ciudad, departamento });

  const LABELS: Record<string, string> = { nombre: "Nombre", direccion: "Dirección", ciudad: "Ciudad", departamento: "Departamento" };
  const toStr = (v: unknown) => (v === "" || v == null ? null : String(v));
  const newVals: Record<string, unknown> = { nombre, direccion, ciudad, departamento };
  const cambios = actual
    ? Object.keys(LABELS)
        .filter((k) => toStr((actual as Record<string, unknown>)[k]) !== toStr(newVals[k]))
        .map((k) => ({ campo: LABELS[k], de: toStr((actual as Record<string, unknown>)[k]), a: toStr(newVals[k]) }))
    : [];

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "editar_ubicacion",
    modulo:       "configuracion",
    recurso_id:   id,
    recurso_desc: nombre,
    metadata:     cambios.length > 0 ? { cambios } : undefined,
  });

  revalidatePath("/configuracion/ubicaciones");
  return { success: true };
}

export async function toggleUbicacion(id: string, activo: boolean): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);
  const repo = createUbicacionesRepository(createAdminClient(), session.tenant_id);
  await repo.update(id, { activo });

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       activo ? "desactivar_ubicacion" : "activar_ubicacion",
    modulo:       "configuracion",
    recurso_id:   id,
  });

  revalidatePath("/configuracion/ubicaciones");
}

export async function eliminarUbicacion(id: string): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);
  const client = createAdminClient();

  const { data: ubicacion } = await client
    .from("ubicaciones")
    .select("nombre")
    .eq("id", id)
    .eq("tenant_id", session.tenant_id)
    .single();

  const repo = createUbicacionesRepository(client, session.tenant_id);
  await repo.delete(id);

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "eliminar_ubicacion",
    modulo:       "configuracion",
    recurso_id:   id,
    recurso_desc: ubicacion?.nombre,
  });

  revalidatePath("/configuracion/ubicaciones");
}
