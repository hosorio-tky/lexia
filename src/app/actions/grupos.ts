"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createGruposRepository } from "@/lib/repositories/grupos";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/session";

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

  const repo  = createGruposRepository(createAdminClient(), session.tenant_id);
  const grupo = await repo.create({ nombre, descripcion, color });
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

  const repo = createGruposRepository(createAdminClient(), session.tenant_id);
  await repo.update(id, { nombre, descripcion, color });
  revalidatePath(PATH);
  return { success: true };
}

export async function eliminarGrupo(id: string): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);
  const repo = createGruposRepository(createAdminClient(), session.tenant_id);
  await repo.delete(id);
  revalidatePath(PATH);
}

export async function agregarMiembro(grupoId: string, userId: string): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);
  const repo = createGruposRepository(createAdminClient(), session.tenant_id);
  await repo.addMember(grupoId, userId);
  revalidatePath(PATH);
}

export async function eliminarMiembro(grupoId: string, userId: string): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);
  const repo = createGruposRepository(createAdminClient(), session.tenant_id);
  await repo.removeMember(grupoId, userId);
  revalidatePath(PATH);
}
