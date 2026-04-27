import type { SupabaseClient } from "@supabase/supabase-js";
import type { Documento } from "./documentos";

export interface Nota {
  id:          string;
  tenant_id:   string;
  modulo:      string;
  recurso_id:  string;
  contenido:   string;   // HTML de Tiptap
  user_id:     string | null;
  user_nombre: string;
  created_at:  string;
  updated_at:  string;
  documentos?: Documento[];
}

export function createNotasRepository(client: SupabaseClient, tenantId: string) {
  return {
    async list(modulo: string, recursoId: string): Promise<Nota[]> {
      // 1. Obtener notas
      const { data: notas, error: notasErr } = await client
        .from("notas")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("modulo", modulo)
        .eq("recurso_id", recursoId)
        .order("created_at", { ascending: false });

      if (notasErr) throw notasErr;
      if (!notas?.length) return [];

      // 2. Obtener documentos vinculados
      const notaIds = notas.map((n) => n.id);
      const { data: docs } = await client
        .from("documentos")
        .select("*")
        .in("nota_id", notaIds)
        .order("created_at", { ascending: true });

      // 3. Agrupar documentos por nota
      const docsByNota: Record<string, Documento[]> = {};
      for (const doc of docs ?? []) {
        if (!docsByNota[doc.nota_id]) docsByNota[doc.nota_id] = [];
        docsByNota[doc.nota_id].push(doc as Documento);
      }

      return notas.map((n) => ({
        ...n,
        documentos: docsByNota[n.id] ?? [],
      })) as Nota[];
    },

    async create(input: {
      modulo:      string;
      recurso_id:  string;
      contenido:   string;
      user_id:     string;
      user_nombre: string;
    }): Promise<Nota> {
      const { data, error } = await client
        .from("notas")
        .insert({ tenant_id: tenantId, ...input })
        .select()
        .single();

      if (error) throw error;
      return { ...(data as Nota), documentos: [] };
    },

    async update(id: string, contenido: string): Promise<void> {
      const { error } = await client
        .from("notas")
        .update({ contenido, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },

    async delete(id: string): Promise<void> {
      const { error } = await client
        .from("notas")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },
  };
}
