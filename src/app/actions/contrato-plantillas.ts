"use server";

import { revalidatePath } from "next/cache";
import { redirect }       from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession }        from "@/lib/auth/session";
import { createContratoPlantillasRepository } from "@/lib/repositories/contrato-plantillas";
import type { ContratoTipo } from "@/types/contratos";

function repo() {
  // helper — gets session + repo inline (called inside each action)
  return null; // placeholder — each action calls getSession() directly
}
void repo;

export async function createPlantilla(_prev: unknown, formData: FormData) {
  const session = await getSession();
  const r = createContratoPlantillasRepository(createAdminClient(), session.tenant_id);

  const nombre         = (formData.get("nombre")         as string)?.trim();
  const tipo           = (formData.get("tipo")           as string) || null;
  const descripcion    = (formData.get("descripcion")    as string)?.trim() || null;
  const contenido_html = (formData.get("contenido_html") as string) ?? "";

  if (!nombre) return { error: "El nombre es requerido." };

  try {
    await r.create({
      nombre,
      tipo:           tipo as ContratoTipo | null,
      descripcion,
      contenido_html,
      created_by:     session.user_id,
    });
  } catch {
    return { error: "No se pudo crear la plantilla." };
  }

  revalidatePath("/configuracion/plantillas");
  redirect("/configuracion/plantillas");
}

export async function updatePlantilla(_prev: unknown, formData: FormData) {
  const session = await getSession();
  const r = createContratoPlantillasRepository(createAdminClient(), session.tenant_id);

  const id             = formData.get("id")             as string;
  const nombre         = (formData.get("nombre")         as string)?.trim();
  const tipo           = (formData.get("tipo")           as string) || null;
  const descripcion    = (formData.get("descripcion")    as string)?.trim() || null;
  const contenido_html = (formData.get("contenido_html") as string) ?? "";

  if (!id)     return { error: "ID requerido." };
  if (!nombre) return { error: "El nombre es requerido." };

  try {
    await r.update(id, {
      nombre,
      tipo:           tipo as ContratoTipo | null,
      descripcion,
      contenido_html,
      updated_by:     session.user_id,
    });
  } catch {
    return { error: "No se pudo actualizar la plantilla." };
  }

  revalidatePath("/configuracion/plantillas");
  redirect("/configuracion/plantillas");
}

export async function deletePlantilla(id: string) {
  const session = await getSession();
  const r = createContratoPlantillasRepository(createAdminClient(), session.tenant_id);

  try {
    await r.delete(id);
  } catch {
    return { error: "No se pudo eliminar la plantilla." };
  }

  revalidatePath("/configuracion/plantillas");
  return { success: true };
}
