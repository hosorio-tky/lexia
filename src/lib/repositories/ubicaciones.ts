import type { SupabaseClient } from "@supabase/supabase-js";

export interface Ubicacion {
  id:           string;
  tenant_id:    string;
  nombre:       string;
  direccion:    string | null;
  ciudad:       string | null;
  departamento: string | null;
  activo:       boolean;
  created_at:   string;
}

export function createUbicacionesRepository(client: SupabaseClient, tenantId: string) {
  return {
    async list(soloActivas = true): Promise<Ubicacion[]> {
      let q = client.from("ubicaciones").select("*").eq("tenant_id", tenantId);
      if (soloActivas) q = q.eq("activo", true);
      const { data, error } = await q.order("nombre");
      if (error) throw error;
      return (data ?? []) as Ubicacion[];
    },

    async create(input: { nombre: string; direccion?: string; ciudad?: string; departamento?: string }): Promise<Ubicacion> {
      const { data, error } = await client
        .from("ubicaciones")
        .insert({ tenant_id: tenantId, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as Ubicacion;
    },

    async update(id: string, input: { nombre?: string; direccion?: string | null; ciudad?: string | null; departamento?: string | null; activo?: boolean }): Promise<void> {
      const { error } = await client
        .from("ubicaciones")
        .update(input)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async delete(id: string): Promise<void> {
      const { error } = await client
        .from("ubicaciones")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
  };
}
