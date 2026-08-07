"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createResponsablesRepository } from "@/lib/repositories/responsables";
import { getSession } from "@/lib/auth/session";
import type { Responsable } from "@/lib/repositories/responsables";

async function resolveNombreEmail(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  userId: string
): Promise<{ nombre: string; email: string | undefined }> {
  const { data } = await admin
    .from("profiles")
    .select("nombre, apellido, email")
    .eq("id", userId)
    .eq("tenant_id", tenantId)
    .single();
  if (!data) throw new Error("Usuario no encontrado");
  const apellido = (data.apellido as string | null) ?? "";
  const nombre = apellido ? `${data.nombre} ${apellido}` : (data.nombre as string);
  return { nombre, email: (data.email as string) || undefined };
}

export async function crearResponsable(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; responsable?: Responsable }> {
  const session = await getSession();
  const admin   = createAdminClient();
  const userId  = (formData.get("user_id") as string)?.trim() || undefined;

  let nombre: string;
  let area:   string | undefined;
  let email:  string | undefined;

  if (userId) {
    try {
      const resolved = await resolveNombreEmail(admin, session.tenant_id, userId);
      nombre = resolved.nombre;
      email  = resolved.email;
    } catch {
      return { error: "Usuario no encontrado" };
    }
    area = (formData.get("area") as string)?.trim() || undefined;
  } else {
    nombre = (formData.get("nombre") as string)?.trim();
    area   = (formData.get("area")   as string)?.trim() || undefined;
    email  = (formData.get("email")  as string)?.trim() || undefined;
    if (!nombre) return { error: "El nombre es obligatorio" };
  }

  const repo = createResponsablesRepository(admin, session.tenant_id);
  const responsable = await repo.create({ nombre, area, email, user_id: userId });
  revalidatePath("/configuracion/responsables");
  return { responsable };
}

export async function editarResponsable(
  id: string,
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();
  const admin   = createAdminClient();
  const userId  = (formData.get("user_id") as string)?.trim() || undefined;

  let nombre: string;
  let area:   string | null;
  let email:  string | null;

  if (userId) {
    try {
      const resolved = await resolveNombreEmail(admin, session.tenant_id, userId);
      nombre = resolved.nombre;
      email  = resolved.email ?? null;
    } catch {
      return { error: "Usuario no encontrado" };
    }
    area = (formData.get("area") as string)?.trim() || null;
  } else {
    nombre = (formData.get("nombre") as string)?.trim();
    area   = (formData.get("area")   as string)?.trim() || null;
    email  = (formData.get("email")  as string)?.trim() || null;
    if (!nombre) return { error: "El nombre es obligatorio" };
  }

  const repo = createResponsablesRepository(admin, session.tenant_id);
  await repo.update(id, { nombre, area, email, user_id: userId ?? null });
  revalidatePath("/configuracion/responsables");
  return { success: true };
}

export async function toggleResponsable(id: string, activo: boolean): Promise<void> {
  const session = await getSession();
  const repo = createResponsablesRepository(createAdminClient(), session.tenant_id);
  await repo.update(id, { activo });
  revalidatePath("/configuracion/responsables");
}

export async function eliminarResponsable(id: string): Promise<void> {
  const session = await getSession();
  const repo = createResponsablesRepository(createAdminClient(), session.tenant_id);
  await repo.delete(id);
  revalidatePath("/configuracion/responsables");
}
