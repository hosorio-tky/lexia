"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAccesoRepository } from "@/lib/repositories/acceso";
import { logActivity } from "@/lib/activity";
import { logError } from "@/lib/logger";
import type { ResourceType, NivelAcceso, SubjectType } from "@/types/access-control";

function resourcePath(resourceType: ResourceType, resourceId: string) {
  return resourceType === "permiso"
    ? `/permisos/${resourceId}`
    : `/contratos/${resourceId}`;
}

async function assertCanManage(
  resourceType: ResourceType,
  resourceId: string,
  tenantId: string,
  userId: string,
  rol: string
) {
  if (rol === "admin") return;
  const client = createAdminClient();
  const table = resourceType === "permiso" ? "permisos" : "contratos";
  const { data } = await client
    .from(table)
    .select("created_by")
    .eq("id", resourceId)
    .eq("tenant_id", tenantId)
    .single();
  if (data?.created_by !== userId) {
    throw new Error("No tienes permisos para gestionar el acceso de este recurso");
  }
}

export async function setVisibilidad(
  resourceType: ResourceType,
  resourceId: string,
  visibilidad: "publico" | "restringido"
) {
  try {
    const session = await getSession();
    await assertCanManage(resourceType, resourceId, session.tenant_id, session.user_id, session.rol);

    const client = createAdminClient();
    const repo = createAccesoRepository(client, session.tenant_id);

    // Read current value for the log
    const table = resourceType === "permiso" ? "permisos" : "contratos";
    const { data: current } = await client
      .from(table)
      .select("visibilidad")
      .eq("id", resourceId)
      .single();

    await repo.setVisibilidad(resourceType, resourceId, visibilidad);

    await logActivity({
      tenant_id:    session.tenant_id,
      user_id:      session.user_id,
      user_nombre:  session.nombre,
      accion:       "cambiar_visibilidad",
      modulo:       resourceType === "permiso" ? "permisos" : "contratos",
      recurso_id:   resourceId,
      recurso_desc: `Visibilidad: ${visibilidad === "publico" ? "Público" : "Restringido"}`,
      metadata: {
        anterior: current?.visibilidad === "publico" ? "Público" : "Restringido",
        nuevo:    visibilidad === "publico" ? "Público" : "Restringido",
      },
    });

    revalidatePath(resourcePath(resourceType, resourceId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, { path: "/actions/acceso", action: "setVisibilidad" });
    throw err;
  }
}

async function resolveSubjectName(
  client: ReturnType<typeof createAdminClient>,
  tenantId: string,
  subjectType: SubjectType,
  subjectId: string
): Promise<string> {
  if (subjectType === "user") {
    const { data } = await client
      .from("profiles")
      .select("nombre, apellido")
      .eq("id", subjectId)
      .single();
    if (data) return [data.nombre, data.apellido].filter(Boolean).join(" ");
  } else {
    const { data } = await client
      .from("grupos")
      .select("nombre")
      .eq("id", subjectId)
      .eq("tenant_id", tenantId)
      .single();
    if (data) return data.nombre;
  }
  return subjectId;
}

export async function grantAcceso(
  resourceType: ResourceType,
  resourceId: string,
  subjectType: SubjectType,
  subjectId: string,
  nivel: NivelAcceso
) {
  try {
    const session = await getSession();
    await assertCanManage(resourceType, resourceId, session.tenant_id, session.user_id, session.rol);

    const client = createAdminClient();
    const repo = createAccesoRepository(client, session.tenant_id);
    await repo.grant({ resourceType, resourceId, subjectType, subjectId, nivel });

    const subjectName = await resolveSubjectName(client, session.tenant_id, subjectType, subjectId);
    const nivelLabel  = nivel === "edicion" ? "Edición" : "Lectura";
    const typeLabel   = subjectType === "user" ? "Usuario" : "Grupo";

    await logActivity({
      tenant_id:    session.tenant_id,
      user_id:      session.user_id,
      user_nombre:  session.nombre,
      accion:       "otorgar_acceso",
      modulo:       resourceType === "permiso" ? "permisos" : "contratos",
      recurso_id:   resourceId,
      recurso_desc: `Acceso otorgado a ${subjectName} (${nivelLabel})`,
      metadata: {
        subject_type: typeLabel,
        subject_name: subjectName,
        nivel:        nivelLabel,
      },
    });

    revalidatePath(resourcePath(resourceType, resourceId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, { path: "/actions/acceso", action: "grantAcceso" });
    throw err;
  }
}

export async function revokeAcceso(
  resourceType: ResourceType,
  resourceId: string,
  subjectType: SubjectType,
  subjectId: string
) {
  try {
    const session = await getSession();
    await assertCanManage(resourceType, resourceId, session.tenant_id, session.user_id, session.rol);

    const client = createAdminClient();
    const repo = createAccesoRepository(client, session.tenant_id);

    const subjectName = await resolveSubjectName(client, session.tenant_id, subjectType, subjectId);
    const typeLabel   = subjectType === "user" ? "Usuario" : "Grupo";

    await repo.revoke({ resourceType, resourceId, subjectType, subjectId });

    await logActivity({
      tenant_id:    session.tenant_id,
      user_id:      session.user_id,
      user_nombre:  session.nombre,
      accion:       "revocar_acceso",
      modulo:       resourceType === "permiso" ? "permisos" : "contratos",
      recurso_id:   resourceId,
      recurso_desc: `Acceso revocado a ${subjectName}`,
      metadata: {
        subject_type: typeLabel,
        subject_name: subjectName,
      },
    });

    revalidatePath(resourcePath(resourceType, resourceId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, { path: "/actions/acceso", action: "revokeAcceso" });
    throw err;
  }
}
