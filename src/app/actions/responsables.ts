"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createResponsablesRepository } from "@/lib/repositories/responsables";
import { getSession, requireRole } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import type { Responsable } from "@/lib/repositories/responsables";

async function resolveProfileData(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  userId: string
): Promise<{ nombre: string; email: string | undefined; area: string | undefined }> {
  const { data } = await admin
    .from("profiles")
    .select("nombre, apellido, email, depto_cat:catalogos!departamento_id(valor)")
    .eq("id", userId)
    .eq("tenant_id", tenantId)
    .single();
  if (!data) throw new Error("Usuario no encontrado");
  const apellido = (data.apellido as string | null) ?? "";
  const nombre = apellido ? `${data.nombre} ${apellido}` : (data.nombre as string);
  const deptoCat = data.depto_cat as unknown as { valor: string } | null;
  return {
    nombre,
    email: (data.email as string) || undefined,
    area: deptoCat?.valor || undefined,
  };
}

export async function crearResponsable(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; responsable?: Responsable }> {
  const session = await getSession();
  requireRole(session, ["admin"]);
  const admin   = createAdminClient();
  const userId  = (formData.get("user_id") as string)?.trim() || undefined;

  let nombre: string;
  let area:   string | undefined;
  let email:  string | undefined;

  if (userId) {
    try {
      const resolved = await resolveProfileData(admin, session.tenant_id, userId);
      nombre = resolved.nombre;
      email  = resolved.email;
      area   = resolved.area;
    } catch {
      return { error: "Usuario no encontrado" };
    }
  } else {
    nombre = (formData.get("nombre") as string)?.trim();
    area   = (formData.get("area")   as string)?.trim() || undefined;
    email  = (formData.get("email")  as string)?.trim() || undefined;
    if (!nombre) return { error: "El nombre es obligatorio" };
  }

  const repo = createResponsablesRepository(admin, session.tenant_id);
  const responsable = await repo.create({ nombre, area, email, user_id: userId });

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "crear_responsable",
    modulo:       "configuracion",
    recurso_id:   responsable.id,
    recurso_desc: nombre,
  });

  revalidatePath("/configuracion/responsables");
  return { responsable };
}

export async function editarResponsable(
  id: string,
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();
  requireRole(session, ["admin"]);
  const admin   = createAdminClient();
  const userId  = (formData.get("user_id") as string)?.trim() || undefined;

  let nombre: string;
  let area:   string | null;
  let email:  string | null;

  if (userId) {
    try {
      const resolved = await resolveProfileData(admin, session.tenant_id, userId);
      nombre = resolved.nombre;
      email  = resolved.email ?? null;
      area   = resolved.area ?? null;
    } catch {
      return { error: "Usuario no encontrado" };
    }
  } else {
    nombre = (formData.get("nombre") as string)?.trim();
    area   = (formData.get("area")   as string)?.trim() || null;
    email  = (formData.get("email")  as string)?.trim() || null;
    if (!nombre) return { error: "El nombre es obligatorio" };
  }

  const repo = createResponsablesRepository(admin, session.tenant_id);
  await repo.update(id, { nombre, area, email, user_id: userId ?? null });

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "editar_responsable",
    modulo:       "configuracion",
    recurso_id:   id,
    recurso_desc: nombre,
  });

  revalidatePath("/configuracion/responsables");
  return { success: true };
}

export async function toggleResponsable(id: string, activo: boolean): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);
  const repo = createResponsablesRepository(createAdminClient(), session.tenant_id);
  await repo.update(id, { activo });

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       activo ? "desactivar_responsable" : "activar_responsable",
    modulo:       "configuracion",
    recurso_id:   id,
  });

  revalidatePath("/configuracion/responsables");
}

export async function eliminarResponsable(id: string): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);
  const client = createAdminClient();

  const { data: responsable } = await client
    .from("responsables")
    .select("nombre")
    .eq("id", id)
    .eq("tenant_id", session.tenant_id)
    .single();

  const repo = createResponsablesRepository(client, session.tenant_id);
  await repo.delete(id);

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "eliminar_responsable",
    modulo:       "configuracion",
    recurso_id:   id,
    recurso_desc: responsable?.nombre,
  });

  revalidatePath("/configuracion/responsables");
}
