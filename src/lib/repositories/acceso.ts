import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecursoAcceso, NivelAcceso, ResourceType, SubjectType } from "@/types/access-control";

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
