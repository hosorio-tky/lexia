import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContratoTipo } from "@/types/contratos";

export interface ContratoPlantilla {
  id:             string;
  tenant_id:      string;
  nombre:         string;
  tipo:           ContratoTipo | null;
  descripcion:    string | null;
  contenido_html: string;
  created_by:     string | null;
  updated_by:     string | null;
  created_at:     string;
  updated_at:     string;
}

type Row = Record<string, unknown>;

function mapRow(row: Row): ContratoPlantilla {
  return {
    id:             row.id             as string,
    tenant_id:      row.tenant_id      as string,
    nombre:         row.nombre         as string,
    tipo:           (row.tipo          as ContratoTipo) ?? null,
    descripcion:    (row.descripcion   as string) ?? null,
    contenido_html: (row.contenido_html as string) ?? "",
    created_by:     (row.created_by    as string) ?? null,
    updated_by:     (row.updated_by    as string) ?? null,
    created_at:     row.created_at     as string,
    updated_at:     row.updated_at     as string,
  };
}

export function createContratoPlantillasRepository(
  client: SupabaseClient,
  tenantId: string
) {
  return {
    async list(): Promise<ContratoPlantilla[]> {
      const { data, error } = await client
        .from("contrato_plantillas")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("nombre");
      if (error) throw error;
      return (data as Row[]).map(mapRow);
    },

    async getById(id: string): Promise<ContratoPlantilla | null> {
      const { data, error } = await client
        .from("contrato_plantillas")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();
      if (error) return null;
      return mapRow(data as Row);
    },

    async create(input: {
      nombre:         string;
      tipo?:          ContratoTipo | null;
      descripcion?:   string | null;
      contenido_html: string;
      created_by:     string;
    }): Promise<ContratoPlantilla> {
      const { data, error } = await client
        .from("contrato_plantillas")
        .insert({ tenant_id: tenantId, ...input })
        .select()
        .single();
      if (error) throw error;
      return mapRow(data as Row);
    },

    async update(
      id: string,
      input: {
        nombre?:         string;
        tipo?:           ContratoTipo | null;
        descripcion?:    string | null;
        contenido_html?: string;
        updated_by:      string;
      }
    ): Promise<ContratoPlantilla> {
      const { data, error } = await client
        .from("contrato_plantillas")
        .update(input)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();
      if (error) throw error;
      return mapRow(data as Row);
    },

    async delete(id: string): Promise<void> {
      const { error } = await client
        .from("contrato_plantillas")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
  };
}
