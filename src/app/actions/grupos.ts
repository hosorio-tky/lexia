"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createGruposRepository } from "@/lib/repositories/grupos";
import { getSession, requireRole } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";

const PATH = "/configuracion/grupos";

export async function crearGrupo(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; id?: string }> {
  const session = await getSession();
  requireRole(session, ["admin"]);

  const nombre      = (formData.get("nombre")      as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim() || undefined;
  const color       = (formData.get("color")       as string)?.trim() || "#64748B";

  if (!nombre) return { error: "El nombre es obligatorio" };

  const client = createAdminClient();
  const repo  = createGruposRepository(client, session.tenant_id);
  const grupo = await repo.create({ nombre, descripcion, color });

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "crear_grupo",
    modulo:       "configuracion",
    recurso_id:   grupo.id,
    recurso_desc: nombre,
  });

  revalidatePath(PATH);
  return { id: grupo.id };
}

export async function editarGrupo(
  id: string,
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();
  requireRole(session, ["admin"]);

  const nombre      = (formData.get("nombre")      as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim() || undefined;
  const color       = (formData.get("color")       as string)?.trim() || "#64748B";

  if (!nombre) return { error: "El nombre es obligatorio" };

  const client = createAdminClient();
  const repo = createGruposRepository(client, session.tenant_id);
  await repo.update(id, { nombre, descripcion, color });

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "editar_grupo",
    modulo:       "configuracion",
    recurso_id:   id,
    recurso_desc: nombre,
  });

  revalidatePath(PATH);
  return { success: true };
}

export async function eliminarGrupo(id: string): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);
  const client = createAdminClient();

  const { data: grupo } = await client
    .from("grupos")
    .select("nombre")
    .eq("id", id)
    .eq("tenant_id", session.tenant_id)
    .single();

  const repo = createGruposRepository(client, session.tenant_id);
  await repo.delete(id);

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "eliminar_grupo",
    modulo:       "configuracion",
    recurso_id:   id,
    recurso_desc: grupo?.nombre,
  });

  revalidatePath(PATH);
}

export async function agregarMiembro(grupoId: string, userId: string): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);
  const repo = createGruposRepository(createAdminClient(), session.tenant_id);
  await repo.addMember(grupoId, userId);

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "agregar_miembro_grupo",
    modulo:       "configuracion",
    recurso_id:   grupoId,
    metadata:     { miembro_id: userId },
  });

  revalidatePath(PATH);
}

export async function eliminarMiembro(grupoId: string, userId: string): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);
  const repo = createGruposRepository(createAdminClient(), session.tenant_id);
  await repo.removeMember(grupoId, userId);

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "eliminar_miembro_grupo",
    modulo:       "configuracion",
    recurso_id:   grupoId,
    metadata:     { miembro_id: userId },
  });

  revalidatePath(PATH);
}
