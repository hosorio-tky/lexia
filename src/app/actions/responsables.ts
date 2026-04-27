"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createResponsablesRepository } from "@/lib/repositories/responsables";
import { getSession } from "@/lib/auth/session";
import type { Responsable } from "@/lib/repositories/responsables";

export async function crearResponsable(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; responsable?: Responsable }> {
  const session = await getSession();
  const nombre  = (formData.get("nombre") as string)?.trim();
  const area    = (formData.get("area")   as string)?.trim() || undefined;
  const email   = (formData.get("email")  as string)?.trim() || undefined;

  if (!nombre) return { error: "El nombre es obligatorio" };

  const repo = createResponsablesRepository(createAdminClient(), session.tenant_id);
  const responsable = await repo.create({ nombre, area, email });
  revalidatePath("/configuracion/responsables");
  return { responsable };
}

export async function editarResponsable(
  id: string,
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();
  const nombre  = (formData.get("nombre") as string)?.trim();
  const area    = (formData.get("area")   as string)?.trim() || null;
  const email   = (formData.get("email")  as string)?.trim() || null;

  if (!nombre) return { error: "El nombre es obligatorio" };

  const repo = createResponsablesRepository(createAdminClient(), session.tenant_id);
  await repo.update(id, { nombre, area, email });
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
