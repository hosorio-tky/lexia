"use server";

import { revalidatePath } from "next/cache";
import { redirect }       from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession, requireRole } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { createContratoPlantillasRepository } from "@/lib/repositories/contrato-plantillas";
import type { ContratoTipo } from "@/types/contratos";

export async function createPlantilla(_prev: unknown, formData: FormData) {
  const session = await getSession();
  requireRole(session, ["admin"]);
  const r = createContratoPlantillasRepository(createAdminClient(), session.tenant_id);

  const nombre         = (formData.get("nombre")         as string)?.trim();
  const tipo           = (formData.get("tipo")           as string) || null;
  const descripcion    = (formData.get("descripcion")    as string)?.trim() || null;
  const contenido_html = (formData.get("contenido_html") as string) ?? "";

  if (!nombre) return { error: "El nombre es requerido." };

  try {
    const plantilla = await r.create({
      nombre,
      tipo:           tipo as ContratoTipo | null,
      descripcion,
      contenido_html,
      created_by:     session.user_id,
    });

    await logActivity({
      tenant_id:    session.tenant_id,
      user_id:      session.user_id,
      user_nombre:  session.nombre,
      accion:       "crear_plantilla_contrato",
      modulo:       "configuracion",
      recurso_id:   plantilla.id,
      recurso_desc: nombre,
    });
  } catch {
    return { error: "No se pudo crear la plantilla." };
  }

  revalidatePath("/configuracion/plantillas");
  redirect("/configuracion/plantillas");
}

export async function updatePlantilla(_prev: unknown, formData: FormData) {
  const session = await getSession();
  requireRole(session, ["admin"]);
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

    await logActivity({
      tenant_id:    session.tenant_id,
      user_id:      session.user_id,
      user_nombre:  session.nombre,
      accion:       "editar_plantilla_contrato",
      modulo:       "configuracion",
      recurso_id:   id,
      recurso_desc: nombre,
    });
  } catch {
    return { error: "No se pudo actualizar la plantilla." };
  }

  revalidatePath("/configuracion/plantillas");
  redirect("/configuracion/plantillas");
}

export async function deletePlantilla(id: string) {
  const session = await getSession();
  requireRole(session, ["admin"]);
  const client = createAdminClient();

  const { data: plantilla } = await client
    .from("contrato_plantillas")
    .select("nombre")
    .eq("id", id)
    .eq("tenant_id", session.tenant_id)
    .single();

  const r = createContratoPlantillasRepository(client, session.tenant_id);

  try {
    await r.delete(id);
  } catch {
    return { error: "No se pudo eliminar la plantilla." };
  }

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "eliminar_plantilla_contrato",
    modulo:       "configuracion",
    recurso_id:   id,
    recurso_desc: plantilla?.nombre,
  });

  revalidatePath("/configuracion/plantillas");
  return { success: true };
}
