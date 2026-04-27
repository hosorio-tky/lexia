import type { SupabaseClient } from "@supabase/supabase-js";

export interface Responsable {
  id:         string;
  tenant_id:  string;
  nombre:     string;
  area:       string | null;
  email:      string | null;
  activo:     boolean;
  created_at: string;
}

export function createResponsablesRepository(client: SupabaseClient, tenantId: string) {
  return {
    async list(soloActivos = true): Promise<Responsable[]> {
      let q = client.from("responsables").select("*").eq("tenant_id", tenantId);
      if (soloActivos) q = q.eq("activo", true);
      const { data, error } = await q.order("nombre");
      if (error) throw error;
      return (data ?? []) as Responsable[];
    },

    async create(input: { nombre: string; area?: string; email?: string }): Promise<Responsable> {
      const { data, error } = await client
        .from("responsables")
        .insert({ tenant_id: tenantId, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as Responsable;
    },

    async update(id: string, input: { nombre?: string; area?: string | null; email?: string | null; activo?: boolean }): Promise<void> {
      const { error } = await client
        .from("responsables")
        .update(input)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async delete(id: string): Promise<void> {
      const { error } = await client
        .from("responsables")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
  };
}
