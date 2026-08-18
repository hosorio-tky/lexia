import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResourceType } from "@/types/access-control";

export interface Suscripcion {
  id:            string;
  tenant_id:     string;
  resource_type: ResourceType;
  resource_id:   string;
  user_id:       string;
  suscrito_por:  string | null;
  created_at:    string;
  // joined
  nombre?:       string;
  apellido?:     string;
  email?:        string;
}

export function createSuscripcionesRepository(client: SupabaseClient, tenantId: string) {
  return {
    async listByResource(resourceType: ResourceType, resourceId: string): Promise<Suscripcion[]> {
      const { data: rows, error } = await client
        .from("recurso_suscripciones")
        .select("id, tenant_id, resource_type, resource_id, user_id, suscrito_por, created_at")
        .eq("tenant_id", tenantId)
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId)
        .order("created_at");
      if (error) throw error;
      if (!rows || rows.length === 0) return [];

      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: profiles } = await client
        .from("profiles")
        .select("id, nombre, apellido, email")
        .in("id", userIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      return rows.map((r) => {
        const p = profileMap.get(r.user_id);
        return { ...r, nombre: p?.nombre, apellido: p?.apellido, email: p?.email };
      });
    },

    async isSuscrito(resourceType: ResourceType, resourceId: string, userId: string): Promise<boolean> {
      const { data } = await client
        .from("recurso_suscripciones")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId)
        .eq("user_id", userId)
        .maybeSingle();
      return !!data;
    },

    async subscribe(
      resourceType: ResourceType,
      resourceId: string,
      userId: string,
      suscritoPor: string,
    ): Promise<void> {
      const { error } = await client
        .from("recurso_suscripciones")
        .upsert(
          { tenant_id: tenantId, resource_type: resourceType, resource_id: resourceId, user_id: userId, suscrito_por: suscritoPor },
          { onConflict: "resource_type,resource_id,user_id" }
        );
      if (error) throw error;
    },

    async unsubscribe(resourceType: ResourceType, resourceId: string, userId: string): Promise<void> {
      const { error } = await client
        .from("recurso_suscripciones")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId)
        .eq("user_id", userId);
      if (error) throw error;
    },

    /** Lista suscripciones activas para el cron — devuelve emails de suscriptores por recurso */
    async getSuscriptoresEmail(
      resourceType: ResourceType,
      resourceId: string,
    ): Promise<string[]> {
      const { data: rows } = await client
        .from("recurso_suscripciones")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId);
      if (!rows || rows.length === 0) return [];

      const { data: profiles } = await client
        .from("profiles")
        .select("email")
        .in("id", rows.map((r) => r.user_id));
      return (profiles ?? []).map((p) => p.email).filter(Boolean);
    },

    async getSuscriptoresUserId(
      resourceType: ResourceType,
      resourceId: string,
    ): Promise<string[]> {
      const { data: rows } = await client
        .from("recurso_suscripciones")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId);
      return (rows ?? []).map((r) => r.user_id).filter(Boolean);
    },
  };
}
