import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Contrato,
  ContratoVersion,
  ContratoFilters,
  ContratoTipo,
  ContratoEstado,
} from "@/types/contratos";

// ─── Tipos de filas DB (evita `any`) ─────────────────────────
interface ContratoRow {
  id: string;
  tenant_id: string;
  numero: string | null;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  estado: string;
  contraparte_nombre: string | null;
  contraparte_email: string | null;
  valor: number | null;
  moneda: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fecha_firma: string | null;
  storage_path: string | null;
  contenido_html: string | null;
  responsable_id: string | null;
  responsable_nombre: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ContratoVersionRow {
  id: string;
  tenant_id: string;
  contrato_id: string;
  version_num: number;
  contenido_html: string | null;
  storage_path: string | null;
  creado_por: string | null;
  creado_por_nombre: string | null;
  created_at: string;
}

// ─── Mapeo DB → Contrato ────────────────────────────────────
function mapRow(row: ContratoRow): Contrato {
  return {
    id:                  row.id,
    tenant_id:           row.tenant_id,
    numero:              row.numero ?? undefined,
    titulo:              row.titulo,
    descripcion:         row.descripcion ?? undefined,
    tipo:                row.tipo as ContratoTipo,
    estado:              row.estado as ContratoEstado,
    contraparte_nombre:  row.contraparte_nombre ?? undefined,
    contraparte_email:   row.contraparte_email ?? undefined,
    valor:               row.valor ?? undefined,
    moneda:              row.moneda ?? undefined,
    fecha_inicio:        row.fecha_inicio ?? undefined,
    fecha_fin:           row.fecha_fin ?? undefined,
    fecha_firma:         row.fecha_firma ?? undefined,
    storage_path:        row.storage_path ?? undefined,
    contenido_html:      row.contenido_html ?? undefined,
    responsable_id:      row.responsable_id ?? undefined,
    responsable_nombre:  row.responsable_nombre ?? undefined,
    created_by:          row.created_by ?? undefined,
    updated_by:          row.updated_by ?? undefined,
    created_at:          row.created_at,
    updated_at:          row.updated_at,
  };
}

function mapVersionRow(row: ContratoVersionRow): ContratoVersion {
  return {
    id:              row.id,
    tenant_id:       row.tenant_id,
    contrato_id:     row.contrato_id,
    version_num:     row.version_num,
    contenido_html:  row.contenido_html ?? undefined,
    storage_path:    row.storage_path ?? undefined,
    creado_por:      row.creado_por ?? undefined,
    creado_por_nombre: row.creado_por_nombre ?? undefined,
    created_at:      row.created_at,
  };
}

// ─── Repositorio ──────────────────────────────────────────────
export function createContratosRepository(client: SupabaseClient, tenantId: string) {
  return {
    // M02-F01: Listado con filtros
    async list(filters?: Partial<ContratoFilters>): Promise<Contrato[]> {
      let query = client
        .from("contratos")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (filters?.estado) {
        query = query.eq("estado", filters.estado);
      }
      if (filters?.tipo) {
        query = query.eq("tipo", filters.tipo);
      }
      if (filters?.search) {
        query = query.or(
          `titulo.ilike.%${filters.search}%,numero.ilike.%${filters.search}%,contraparte_nombre.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => mapRow(row as ContratoRow));
    },

    // M02-F06: Detalle del contrato
    async getById(id: string): Promise<Contrato | null> {
      const { data, error } = await client
        .from("contratos")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // not found
        throw error;
      }
      return mapRow(data as ContratoRow);
    },

    // M02-F14: Historial de versiones
    async getVersiones(contratoId: string): Promise<ContratoVersion[]> {
      const { data, error } = await client
        .from("contrato_versiones")
        .select("*")
        .eq("contrato_id", contratoId)
        .eq("tenant_id", tenantId)
        .order("version_num", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((row) => mapVersionRow(row as ContratoVersionRow));
    },

    // Crear contrato
    async create(input: {
      tenant_id: string;
      titulo: string;
      tipo: string;
      estado?: string;
      numero?: string;
      descripcion?: string;
      contraparte_nombre?: string;
      contraparte_email?: string;
      valor?: number;
      moneda?: string;
      fecha_inicio?: string;
      fecha_fin?: string;
      fecha_firma?: string;
      storage_path?: string;
      contenido_html?: string;
      responsable_id?: string;
      responsable_nombre?: string;
      created_by?: string;
    }): Promise<Contrato> {
      const { data, error } = await client
        .from("contratos")
        .insert({ estado: "En Revisión", ...input })
        .select()
        .single();

      if (error) throw error;
      return mapRow(data as ContratoRow);
    },

    // M02-F11: Editar contrato con snapshot de versión si contenido_html cambia
    async update(
      id: string,
      input: Partial<{
        titulo: string;
        tipo: string;
        numero: string | null;
        descripcion: string | null;
        contraparte_nombre: string | null;
        contraparte_email: string | null;
        valor: number | null;
        moneda: string;
        fecha_inicio: string | null;
        fecha_fin: string | null;
        fecha_firma: string | null;
        storage_path: string | null;
        contenido_html: string | null;
        responsable_id: string | null;
        responsable_nombre: string | null;
        updated_by: string;
      }>,
      snapshotAuthor?: { userId: string; nombre: string }
    ): Promise<Contrato> {
      // Si el contenido_html cambia, snapshot el contenido ANTERIOR
      if (input.contenido_html !== undefined && snapshotAuthor) {
        const actual = await this.getById(id);
        if (actual && actual.contenido_html !== input.contenido_html) {
          // Contar versiones existentes para número de versión
          const { count } = await client
            .from("contrato_versiones")
            .select("*", { count: "exact", head: true })
            .eq("contrato_id", id)
            .eq("tenant_id", tenantId);

          await client.from("contrato_versiones").insert({
            tenant_id:        tenantId,
            contrato_id:      id,
            version_num:      (count ?? 0) + 1,
            contenido_html:   actual.contenido_html ?? null,
            storage_path:     actual.storage_path ?? null,
            creado_por:       snapshotAuthor.userId,
            creado_por_nombre: snapshotAuthor.nombre,
          });
        }
      }

      const { data, error } = await client
        .from("contratos")
        .update(input)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) throw error;
      return mapRow(data as ContratoRow);
    },

    // M02-F04: Cambiar estado (Kanban)
    async changeEstado(
      id: string,
      newEstado: ContratoEstado
    ): Promise<Contrato> {
      const { data, error } = await client
        .from("contratos")
        .update({ estado: newEstado })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) throw error;
      return mapRow(data as ContratoRow);
    },

    // Eliminar contrato (solo admin)
    async delete(id: string): Promise<void> {
      const { error } = await client
        .from("contratos")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
  };
}
