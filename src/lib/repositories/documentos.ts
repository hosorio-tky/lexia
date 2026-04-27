import type { SupabaseClient } from "@supabase/supabase-js";

export interface Documento {
  id: string;
  tenant_id: string;
  modulo: string;
  recurso_id: string;
  nota_id?: string | null;
  nombre: string;
  tipo_mime: string | null;
  tamano: number | null;
  storage_path: string;
  subido_por: string | null;
  subido_por_nombre: string | null;
  created_at: string;
}

const BUCKET = "documentos";

export function createDocumentosRepository(
  client: SupabaseClient,
  tenantId: string
) {
  return {
    async list(modulo: string, recursoId: string): Promise<Documento[]> {
      const { data, error } = await client
        .from("documentos")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("modulo", modulo)
        .eq("recurso_id", recursoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Documento[];
    },

    async upload(
      modulo: string,
      recursoId: string,
      file: File,
      userId: string,
      userNombre: string,
      notaId?: string
    ): Promise<Documento> {
      const ext  = file.name.split(".").pop() ?? "";
      const uuid = crypto.randomUUID();
      const path = `${tenantId}/${modulo}/${recursoId}/${uuid}.${ext}`;

      const bytes = await file.arrayBuffer();

      const { error: storageErr } = await client.storage
        .from(BUCKET)
        .upload(path, bytes, {
          contentType: file.type,
          upsert: false,
        });

      if (storageErr) throw storageErr;

      const { data, error: dbErr } = await client
        .from("documentos")
        .insert({
          tenant_id:         tenantId,
          modulo,
          recurso_id:        recursoId,
          nota_id:           notaId ?? null,
          nombre:            file.name,
          tipo_mime:         file.type || null,
          tamano:            file.size,
          storage_path:      path,
          subido_por:        userId,
          subido_por_nombre: userNombre,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;
      return data as Documento;
    },

    /** Genera una URL firmada válida por 1 hora */
    async getSignedUrl(storagePath: string): Promise<string> {
      const { data, error } = await client.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 3600);

      if (error) throw error;
      return data.signedUrl;
    },

    async delete(id: string, storagePath: string): Promise<void> {
      // 1. Borrar de storage
      await client.storage.from(BUCKET).remove([storagePath]);

      // 2. Borrar registro
      const { error } = await client
        .from("documentos")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },
  };
}
