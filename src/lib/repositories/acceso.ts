import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecursoAcceso, NivelAcceso, ResourceType, SubjectType } from "@/types/access-control";

/**
 * Returns the set of resource IDs of `resourceType` that `userId` can access
 * either directly or through a group membership.
 * Used to enforce visibility restrictions without RLS.
 */
export async function getAccessibleIds(
  client: SupabaseClient,
  tenantId: string,
  resourceType: ResourceType,
  userId: string,
): Promise<Set<string>> {
  const [{ data: userAccess }, { data: memberships }] = await Promise.all([
    client
      .from("recurso_acceso")
      .select("resource_id")
      .eq("tenant_id", tenantId)
      .eq("resource_type", resourceType)
      .eq("subject_type", "user")
      .eq("subject_id", userId),
    client
      .from("grupo_miembros")
      .select("grupo_id")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId),
  ]);

  const ids = new Set<string>((userAccess ?? []).map((r: { resource_id: string }) => r.resource_id));

  const grupoIds = (memberships ?? []).map((m: { grupo_id: string }) => m.grupo_id);
  if (grupoIds.length > 0) {
    const { data: groupAccess } = await client
      .from("recurso_acceso")
      .select("resource_id")
      .eq("tenant_id", tenantId)
      .eq("resource_type", resourceType)
      .eq("subject_type", "group")
      .in("subject_id", grupoIds);
    (groupAccess ?? []).forEach((r: { resource_id: string }) => ids.add(r.resource_id));
  }

  return ids;
}

/**
 * Returns the effective access level for a user on a specific resource.
 * Admins and resource creators always get 'edicion'.
 * Otherwise checks direct and group-based access in recurso_acceso.
 */
export async function getUserNivel(
  client: SupabaseClient,
  tenantId: string,
  resourceType: ResourceType,
  resourceId: string,
  userId: string,
  userRol: string,
  createdBy?: string,
): Promise<"edicion" | "lectura" | "none"> {
  if (userRol === "admin" || createdBy === userId) return "edicion";

  const [{ data: direct }, { data: memberships }] = await Promise.all([
    client
      .from("recurso_acceso")
      .select("nivel")
      .eq("tenant_id", tenantId)
      .eq("resource_type", resourceType)
      .eq("resource_id", resourceId)
      .eq("subject_type", "user")
      .eq("subject_id", userId)
      .maybeSingle(),
    client
      .from("grupo_miembros")
      .select("grupo_id")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId),
  ]);

  const grupoIds = (memberships ?? []).map((m: { grupo_id: string }) => m.grupo_id);
  let groupNivel: string | null = null;

  if (grupoIds.length > 0) {
    const { data: groupAccess } = await client
      .from("recurso_acceso")
      .select("nivel")
      .eq("tenant_id", tenantId)
      .eq("resource_type", resourceType)
      .eq("resource_id", resourceId)
      .eq("subject_type", "group")
      .in("subject_id", grupoIds);
    if (groupAccess?.some((a: { nivel: string }) => a.nivel === "edicion")) groupNivel = "edicion";
    else if (groupAccess?.length) groupNivel = "lectura";
  }

  const efectivo = direct?.nivel === "edicion" || groupNivel === "edicion"
    ? "edicion"
    : direct?.nivel === "lectura" || groupNivel === "lectura"
      ? "lectura"
      : "none";

  return efectivo;
}

/**
 * Given a list of resources (with id, visibilidad, created_by), returns the
 * set of IDs the user can EDIT (not just view). Admins can edit everything.
 * For non-admins: public resources + restricted ones where they are the creator
 * or have an explicit "edicion" access (direct or via group).
 */
export async function getEditableIds(
  client: SupabaseClient,
  tenantId: string,
  resourceType: ResourceType,
  resources: Array<{ id: string; visibilidad?: string | null; created_by?: string | null }>,
  userId: string,
  userRol: string,
): Promise<Set<string>> {
  if (userRol === "admin" || resources.length === 0) {
    return new Set(resources.map((r) => r.id));
  }

  const editableIds = new Set<string>();
  const needCheck: string[] = [];

  for (const r of resources) {
    if (!r.visibilidad || r.visibilidad === "publico") {
      editableIds.add(r.id);
    } else if (r.created_by === userId) {
      editableIds.add(r.id);
    } else {
      needCheck.push(r.id);
    }
  }

  if (needCheck.length === 0) return editableIds;

  const [{ data: userAccess }, { data: memberships }] = await Promise.all([
    client
      .from("recurso_acceso")
      .select("resource_id")
      .eq("tenant_id", tenantId)
      .eq("resource_type", resourceType)
      .eq("subject_type", "user")
      .eq("subject_id", userId)
      .eq("nivel", "edicion")
      .in("resource_id", needCheck),
    client
      .from("grupo_miembros")
      .select("grupo_id")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId),
  ]);

  (userAccess ?? []).forEach((r: { resource_id: string }) => editableIds.add(r.resource_id));

  const grupoIds = (memberships ?? []).map((m: { grupo_id: string }) => m.grupo_id);
  if (grupoIds.length > 0) {
    const { data: groupAccess } = await client
      .from("recurso_acceso")
      .select("resource_id")
      .eq("tenant_id", tenantId)
      .eq("resource_type", resourceType)
      .eq("subject_type", "group")
      .eq("nivel", "edicion")
      .in("subject_id", grupoIds)
      .in("resource_id", needCheck);
    (groupAccess ?? []).forEach((r: { resource_id: string }) => editableIds.add(r.resource_id));
  }

  return editableIds;
}

export function createAccesoRepository(client: SupabaseClient, tenantId: string) {
  return {
    /** Lista todos los accesos de un recurso específico */
    async listByResource(resourceType: ResourceType, resourceId: string): Promise<RecursoAcceso[]> {
      const { data, error } = await client
        .from("recurso_acceso")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },

    /** Otorga acceso a un usuario o grupo sobre un recurso */
    async grant(input: {
      resourceType: ResourceType;
      resourceId: string;
      subjectType: SubjectType;
      subjectId: string;
      nivel: NivelAcceso;
    }): Promise<void> {
      const { error } = await client
        .from("recurso_acceso")
        .upsert(
          {
            tenant_id:     tenantId,
            resource_type: input.resourceType,
            resource_id:   input.resourceId,
            subject_type:  input.subjectType,
            subject_id:    input.subjectId,
            nivel:         input.nivel,
          },
          { onConflict: "resource_type,resource_id,subject_type,subject_id" }
        );
      if (error) throw error;
    },

    /** Revoca el acceso de un usuario o grupo sobre un recurso */
    async revoke(input: {
      resourceType: ResourceType;
      resourceId: string;
      subjectType: SubjectType;
      subjectId: string;
    }): Promise<void> {
      const { error } = await client
        .from("recurso_acceso")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("resource_type", input.resourceType)
        .eq("resource_id", input.resourceId)
        .eq("subject_type", input.subjectType)
        .eq("subject_id", input.subjectId);
      if (error) throw error;
    },

    /** Cambia el nivel de acceso (lectura ↔ edicion) */
    async updateNivel(input: {
      resourceType: ResourceType;
      resourceId: string;
      subjectType: SubjectType;
      subjectId: string;
      nivel: NivelAcceso;
    }): Promise<void> {
      const { error } = await client
        .from("recurso_acceso")
        .update({ nivel: input.nivel })
        .eq("tenant_id", tenantId)
        .eq("resource_type", input.resourceType)
        .eq("resource_id", input.resourceId)
        .eq("subject_type", input.subjectType)
        .eq("subject_id", input.subjectId);
      if (error) throw error;
    },

    /** Cambia la visibilidad del recurso (publico ↔ restringido) */
    async setVisibilidad(
      resourceType: ResourceType,
      resourceId: string,
      visibilidad: "publico" | "restringido"
    ): Promise<void> {
      const table = resourceType === "permiso" ? "permisos" : "contratos";
      const { error } = await client
        .from(table)
        .update({ visibilidad, updated_at: new Date().toISOString() })
        .eq("id", resourceId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
  };
}
