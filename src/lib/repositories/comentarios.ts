import type { SupabaseClient } from "@supabase/supabase-js";

export interface Comentario {
  id: string;
  tenant_id: string;
  modulo: string;
  recurso_id: string;
  user_id: string | null;
  user_nombre: string;
  contenido: string;
  editado: boolean;
  created_at: string;
  updated_at: string;
}

export function createComentariosRepository(
  client: SupabaseClient,
  tenantId: string
) {
  return {
    async list(modulo: string, recursoId: string): Promise<Comentario[]> {
      const { data, error } = await client
        .from("comentarios")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("modulo", modulo)
        .eq("recurso_id", recursoId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Comentario[];
    },

    async create(input: {
      modulo: string;
      recurso_id: string;
      user_id: string;
      user_nombre: string;
      contenido: string;
    }): Promise<Comentario> {
      const { data, error } = await client
        .from("comentarios")
        .insert({ ...input, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data as Comentario;
    },

    async update(id: string, contenido: string): Promise<void> {
      const { error } = await client
        .from("comentarios")
        .update({ contenido, editado: true, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },

    async delete(id: string): Promise<void> {
      const { error } = await client
        .from("comentarios")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },
  };
}
