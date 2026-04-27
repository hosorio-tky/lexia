import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LexbaseDocumento,
  LexbaseCategoria,
  LexbaseFilters,
  LexbaseTipo,
  LexbaseStats,
  TocEntry,
} from "@/types/lexbase";

// ─── Tipos de filas DB ────────────────────────────────────────
interface LexbaseCategoriaRow {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  color: string;
  created_at: string;
}

interface LexbaseDocumentoRow {
  id: string;
  tenant_id: string;
  titulo: string;
  tipo: string;
  categoria_id: string | null;
  descripcion: string | null;
  pais: string;
  numero_oficial: string | null;
  organo_emisor: string | null;
  fecha_publicacion: string | null;
  fecha_vigencia: string | null;
  storage_path: string | null;
  tipo_mime: string | null;
  tiene_reformas: boolean;
  reformas_descripcion: string | null;
  tags: string[];
  toc: TocEntry[] | null;
  estado: string;
  indexed_at: string | null;
  total_chunks: number;
  created_by: string | null;
  created_by_nombre: string | null;
  created_at: string;
  updated_at: string;
  lexbase_categorias?: LexbaseCategoriaRow | null;
}

// ─── Mappers ──────────────────────────────────────────────────
function mapCategoriaRow(row: LexbaseCategoriaRow): LexbaseCategoria {
  return {
    id:          row.id,
    tenant_id:   row.tenant_id,
    nombre:      row.nombre,
    descripcion: row.descripcion ?? undefined,
    color:       row.color,
    created_at:  row.created_at,
  };
}

function mapDocRow(row: LexbaseDocumentoRow): LexbaseDocumento {
  return {
    id:                   row.id,
    tenant_id:            row.tenant_id,
    titulo:               row.titulo,
    tipo:                 row.tipo as LexbaseTipo,
    categoria_id:         row.categoria_id ?? undefined,
    categoria:            row.lexbase_categorias
                            ? mapCategoriaRow(row.lexbase_categorias)
                            : undefined,
    descripcion:          row.descripcion ?? undefined,
    pais:                 row.pais,
    numero_oficial:       row.numero_oficial ?? undefined,
    organo_emisor:        row.organo_emisor ?? undefined,
    fecha_publicacion:    row.fecha_publicacion ?? undefined,
    fecha_vigencia:       row.fecha_vigencia ?? undefined,
    storage_path:         row.storage_path ?? undefined,
    tipo_mime:            row.tipo_mime ?? undefined,
    tiene_reformas:       row.tiene_reformas,
    reformas_descripcion: row.reformas_descripcion ?? undefined,
    tags:                 row.tags ?? [],
    toc:                  row.toc ?? undefined,
    estado:               row.estado as "activo" | "archivado",
    indexed_at:           row.indexed_at ?? undefined,
    total_chunks:         row.total_chunks ?? 0,
    created_by_nombre:    row.created_by_nombre ?? undefined,
    created_at:           row.created_at,
    updated_at:           row.updated_at,
  };
}

// ─── Repositorio ──────────────────────────────────────────────
export function createLexbaseRepository(client: SupabaseClient, tenantId: string) {
  return {
    /** Lista documentos con filtros opcionales */
    async list(filters?: Partial<LexbaseFilters>): Promise<LexbaseDocumento[]> {
      let query = client
        .from("lexbase_documentos")
        .select("*, lexbase_categorias(*)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (filters?.tipo) {
        query = query.eq("tipo", filters.tipo);
      }
      if (filters?.categoria_id) {
        query = query.eq("categoria_id", filters.categoria_id);
      }
      if (filters?.pais) {
        query = query.eq("pais", filters.pais);
      }
      if (filters?.tiene_reformas !== null && filters?.tiene_reformas !== undefined) {
        query = query.eq("tiene_reformas", filters.tiene_reformas);
      }
      if (filters?.tag) {
        query = query.contains("tags", [filters.tag]);
      }
      if (filters?.search) {
        const q = filters.search;
        query = query.or(
          `titulo.ilike.%${q}%,numero_oficial.ilike.%${q}%,organo_emisor.ilike.%${q}%,descripcion.ilike.%${q}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => mapDocRow(row as LexbaseDocumentoRow));
    },

    /** Obtiene un documento por ID */
    async getById(id: string): Promise<LexbaseDocumento | null> {
      const { data, error } = await client
        .from("lexbase_documentos")
        .select("*, lexbase_categorias(*)")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return mapDocRow(data as LexbaseDocumentoRow);
    },

    /** Crea un nuevo documento */
    async create(input: {
      tenant_id: string;
      titulo: string;
      tipo: string;
      categoria_id?: string;
      descripcion?: string;
      pais?: string;
      numero_oficial?: string;
      organo_emisor?: string;
      fecha_publicacion?: string;
      fecha_vigencia?: string;
      storage_path?: string;
      tipo_mime?: string;
      tiene_reformas?: boolean;
      reformas_descripcion?: string;
      tags?: string[];
      created_by?: string;
      created_by_nombre?: string;
    }): Promise<LexbaseDocumento> {
      const { data, error } = await client
        .from("lexbase_documentos")
        .insert(input)
        .select("*, lexbase_categorias(*)")
        .single();

      if (error) throw error;
      return mapDocRow(data as LexbaseDocumentoRow);
    },

    /** Actualiza un documento */
    async update(
      id: string,
      input: Partial<{
        titulo: string;
        tipo: string;
        categoria_id: string | null;
        descripcion: string;
        pais: string;
        numero_oficial: string;
        organo_emisor: string;
        fecha_publicacion: string;
        fecha_vigencia: string;
        tiene_reformas: boolean;
        reformas_descripcion: string;
        tags: string[];
        estado: string;
      }>
    ): Promise<LexbaseDocumento> {
      const { data, error } = await client
        .from("lexbase_documentos")
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select("*, lexbase_categorias(*)")
        .single();

      if (error) throw error;
      return mapDocRow(data as LexbaseDocumentoRow);
    },

    /** Elimina un documento (chunks se eliminan en cascada) */
    async delete(id: string): Promise<void> {
      const { error } = await client
        .from("lexbase_documentos")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    /** Lista categorías del tenant */
    async listCategorias(): Promise<LexbaseCategoria[]> {
      const { data, error } = await client
        .from("lexbase_categorias")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("nombre", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row) => mapCategoriaRow(row as LexbaseCategoriaRow));
    },

    /** Crea una categoría */
    async createCategoria(input: {
      tenant_id: string;
      nombre: string;
      descripcion?: string;
      color?: string;
    }): Promise<LexbaseCategoria> {
      const { data, error } = await client
        .from("lexbase_categorias")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return mapCategoriaRow(data as LexbaseCategoriaRow);
    },

    /** Actualiza una categoría */
    async updateCategoria(
      id: string,
      input: Partial<{ nombre: string; descripcion: string; color: string }>
    ): Promise<LexbaseCategoria> {
      const { data, error } = await client
        .from("lexbase_categorias")
        .update(input)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) throw error;
      return mapCategoriaRow(data as LexbaseCategoriaRow);
    },

    /** Elimina una categoría */
    async deleteCategoria(id: string): Promise<void> {
      const { error } = await client
        .from("lexbase_categorias")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    /** Actualiza indexed_at y total_chunks + toc después de indexar */
    async updateIndexed(
      id: string,
      data: { total_chunks: number; toc?: TocEntry[] }
    ): Promise<void> {
      const { error } = await client
        .from("lexbase_documentos")
        .update({
          indexed_at:   new Date().toISOString(),
          total_chunks: data.total_chunks,
          toc:          data.toc ?? null,
          updated_at:   new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    /** Estadísticas del módulo */
    async getStats(): Promise<LexbaseStats> {
      const [docsResult, catResult] = await Promise.all([
        client
          .from("lexbase_documentos")
          .select("tipo, indexed_at")
          .eq("tenant_id", tenantId),
        client
          .from("lexbase_categorias")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId),
      ]);

      const docs = docsResult.data ?? [];
      const total = docs.length;
      const indexados = docs.filter((d) => d.indexed_at).length;
      const por_tipo: Record<string, number> = {};
      for (const d of docs) {
        por_tipo[d.tipo] = (por_tipo[d.tipo] ?? 0) + 1;
      }

      return {
        total,
        por_tipo,
        indexados,
        categorias: catResult.count ?? 0,
      };
    },
  };
}
