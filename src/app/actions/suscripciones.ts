"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSuscripcionesRepository } from "@/lib/repositories/suscripciones";
import type { ResourceType } from "@/types/access-control";

function resourcePath(resourceType: ResourceType, resourceId: string) {
  return resourceType === "permiso"
    ? `/permisos/${resourceId}`
    : `/contratos/${resourceId}`;
}

/** El usuario actual se suscribe a alertas de un recurso */
export async function suscribirse(resourceType: ResourceType, resourceId: string) {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createSuscripcionesRepository(client, session.tenant_id);
  await repo.subscribe(resourceType, resourceId, session.user_id, session.user_id);
  revalidatePath(resourcePath(resourceType, resourceId));
}

/** El usuario actual cancela su suscripción */
export async function cancelarSuscripcion(resourceType: ResourceType, resourceId: string) {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createSuscripcionesRepository(client, session.tenant_id);
  await repo.unsubscribe(resourceType, resourceId, session.user_id);
  revalidatePath(resourcePath(resourceType, resourceId));
}

/** Admin o creador suscribe a otro usuario */
export async function suscribirUsuario(
  resourceType: ResourceType,
  resourceId: string,
  userId: string,
) {
  const session = await getSession();
  const client  = createAdminClient();

  // Solo admin o creador del recurso pueden suscribir a otros
  if (session.rol !== "admin") {
    const table = resourceType === "permiso" ? "permisos" : "contratos";
    const { data } = await client
      .from(table)
      .select("created_by")
      .eq("id", resourceId)
      .eq("tenant_id", session.tenant_id)
      .single();
    if (data?.created_by !== session.user_id) {
      throw new Error("No tienes permisos para suscribir a otros usuarios");
    }
  }

  const repo = createSuscripcionesRepository(client, session.tenant_id);
  await repo.subscribe(resourceType, resourceId, userId, session.user_id);
  revalidatePath(resourcePath(resourceType, resourceId));
}

/** Admin o creador elimina la suscripción de otro usuario */
export async function removerSuscriptor(
  resourceType: ResourceType,
  resourceId: string,
  userId: string,
) {
  const session = await getSession();
  const client  = createAdminClient();

  if (session.rol !== "admin") {
    const table = resourceType === "permiso" ? "permisos" : "contratos";
    const { data } = await client
      .from(table)
      .select("created_by")
      .eq("id", resourceId)
      .eq("tenant_id", session.tenant_id)
      .single();
    if (data?.created_by !== session.user_id) {
      throw new Error("No tienes permisos para remover suscriptores");
    }
  }

  const repo = createSuscripcionesRepository(client, session.tenant_id);
  await repo.unsubscribe(resourceType, resourceId, userId);
  revalidatePath(resourcePath(resourceType, resourceId));
}
