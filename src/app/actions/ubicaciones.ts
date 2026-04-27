"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUbicacionesRepository } from "@/lib/repositories/ubicaciones";
import { getSession } from "@/lib/auth/session";
import type { Ubicacion } from "@/lib/repositories/ubicaciones";

export async function crearUbicacion(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; ubicacion?: Ubicacion }> {
  const session     = await getSession();
  const nombre      = (formData.get("nombre")      as string)?.trim();
  const direccion   = (formData.get("direccion")   as string)?.trim() || undefined;
  const ciudad      = (formData.get("ciudad")      as string)?.trim() || undefined;
  const departamento = (formData.get("departamento") as string)?.trim() || undefined;

  if (!nombre) return { error: "El nombre es obligatorio" };

  const repo = createUbicacionesRepository(createAdminClient(), session.tenant_id);
  const ubicacion = await repo.create({ nombre, direccion, ciudad, departamento });
  revalidatePath("/configuracion/ubicaciones");
  return { ubicacion };
}

export async function editarUbicacion(
  id: string,
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session     = await getSession();
  const nombre      = (formData.get("nombre")      as string)?.trim();
  const direccion   = (formData.get("direccion")   as string)?.trim() || null;
  const ciudad      = (formData.get("ciudad")      as string)?.trim() || null;
  const departamento = (formData.get("departamento") as string)?.trim() || null;

  if (!nombre) return { error: "El nombre es obligatorio" };

  const repo = createUbicacionesRepository(createAdminClient(), session.tenant_id);
  await repo.update(id, { nombre, direccion, ciudad, departamento });
  revalidatePath("/configuracion/ubicaciones");
  return { success: true };
}

export async function toggleUbicacion(id: string, activo: boolean): Promise<void> {
  const session = await getSession();
  const repo = createUbicacionesRepository(createAdminClient(), session.tenant_id);
  await repo.update(id, { activo });
  revalidatePath("/configuracion/ubicaciones");
}

export async function eliminarUbicacion(id: string): Promise<void> {
  const session = await getSession();
  const repo = createUbicacionesRepository(createAdminClient(), session.tenant_id);
  await repo.delete(id);
  revalidatePath("/configuracion/ubicaciones");
}
