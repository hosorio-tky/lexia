import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActividadEntry {
  id:           string;
  user_id:      string | null;
  user_nombre:  string | null;
  accion:       string;
  modulo:       string | null;
  recurso_id:   string | null;
  recurso_desc: string | null;
  metadata:     Record<string, unknown> | null;
  created_at:   string;
}

export function createActividadRepository(
  client: SupabaseClient,
  tenantId: string
) {
  return {
    /** Devuelve todas las entradas de actividad para un recurso concreto */
    async listByRecurso(
      recursoId: string,
      limit = 50
    ): Promise<ActividadEntry[]> {
      const { data, error } = await client
        .from("user_activity_log")
        .select("id, user_id, user_nombre, accion, modulo, recurso_id, recurso_desc, metadata, created_at")
        .eq("tenant_id", tenantId)
        .eq("recurso_id", recursoId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as ActividadEntry[];
    },
  };
}
