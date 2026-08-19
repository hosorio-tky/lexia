import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Contrato,
  ContratoVersion,
  ContratoFilters,
} from "@/types/contratos";
import { ESTADOS_CONTRATO } from "@/lib/constants/estados";
import { getAccessibleIds } from "./acceso";

// ─── Tipos de filas DB ─────────────────────────────────────────
interface CatalogoRef { id: string; valor: string; }
interface EstadoRef  { id: string; valor: string; }

interface ContratoRow {
  id: string;
  tenant_id: string;
  numero: string | null;
  titulo: string;
  descripcion: string | null;
  tipo_id: string | null;
  tipo_cat: CatalogoRef | null;
  estado_id: string;
  estado_ref: EstadoRef | null;
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
  responsable_det: { area: string | null; user_id: string | null } | null;
  visibilidad: string | null;
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

const SELECT_CONTRATO = [
  "*",
  "tipo_cat:catalogos!tipo_id(id, valor)",
  "estado_ref:workflow_estados!estado_id(id, valor)",
].join(", ");

const SELECT_CONTRATO_DETAIL = [
  "*",
  "tipo_cat:catalogos!tipo_id(id, valor)",
  "estado_ref:workflow_estados!estado_id(id, valor)",
  "responsable_det:responsables!responsable_id(area, user_id)",
].join(", ");

// ─── Mapeo DB → Contrato ──────────────────────────────────────
function mapRow(row: ContratoRow): Contrato {
  return {
    id:                  row.id,
    tenant_id:           row.tenant_id,
    numero:              row.numero ?? undefined,
    titulo:              row.titulo,
    descripcion:         row.descripcion ?? undefined,
    tipo_id:             row.tipo_id ?? "",
    tipo:                row.tipo_cat?.valor ?? "",
    estado_id:           row.estado_id,
    estado:              row.estado_ref?.valor ?? row.estado_id,
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
    responsable_area:    row.responsable_det?.area ?? undefined,
    visibilidad:         (row.visibilidad as "publico" | "restringido") ?? "publico",
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
    async list(
      filters?: Partial<ContratoFilters> & { page?: number; limit?: number; sortKey?: string; sortDir?: "asc" | "desc" },
      caller?: { userId: string; userRol: string },
    ): Promise<{ items: Contrato[]; total: number }> {
      const limit = filters?.limit ?? 9999;
      const page  = filters?.page  ?? 0;
      const from  = page * limit;
      const to    = from + limit - 1;

      const SORT_MAP: Record<string, string> = {
        titulo:      "titulo",
        contraparte: "contraparte_nombre",
        valor:       "valor",
        fecha_fin:   "fecha_fin",
        actividad:   "updated_at",
      };
      const dbCol = SORT_MAP[filters?.sortKey ?? "actividad"] ?? "updated_at";
      const asc   = filters?.sortDir === "asc";

      let query = client
        .from("contratos")
        .select(SELECT_CONTRATO, { count: "exact" })
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order(dbCol, { ascending: asc })
        .range(from, to);

      if (filters?.estado) query = query.eq("estado_id", filters.estado);
      if (filters?.tipo)   query = query.eq("tipo_id",   filters.tipo);
      if (filters?.search) {
        query = query.or(
          `titulo.ilike.%${filters.search}%,numero.ilike.%${filters.search}%,contraparte_nombre.ilike.%${filters.search}%`
        );
      }

      if (caller && caller.userRol !== "admin") {
        const accessibleIds = await getAccessibleIds(client, tenantId, "contrato", caller.userId);
        const idsClause = [...accessibleIds].map((id) => `id.eq.${id}`).join(",");
        const orClause  = idsClause
          ? `visibilidad.neq.restringido,created_by.eq.${caller.userId},${idsClause}`
          : `visibilidad.neq.restringido,created_by.eq.${caller.userId}`;
        query = query.or(orClause);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        items: (data ?? []).map((row) => mapRow(row as unknown as ContratoRow)),
        total: count ?? 0,
      };
    },

    async listStats(
      caller?: { userId: string; userRol: string },
    ): Promise<{ id: string; estado_id: string; fecha_fin: string | null; valor: number | null }[]> {
      let query = client
        .from("contratos")
        .select("id, estado_id, fecha_fin, valor")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      if (caller && caller.userRol !== "admin") {
        const accessibleIds = await getAccessibleIds(client, tenantId, "contrato", caller.userId);
        const idsClause = [...accessibleIds].map((id) => `id.eq.${id}`).join(",");
        const orClause  = idsClause
          ? `visibilidad.neq.restringido,created_by.eq.${caller.userId},${idsClause}`
          : `visibilidad.neq.restringido,created_by.eq.${caller.userId}`;
        query = query.or(orClause);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as { id: string; estado_id: string; fecha_fin: string | null; valor: number | null }[];
    },

    async getById(id: string, caller?: { userId: string; userRol: string }): Promise<Contrato | null> {
      const { data, error } = await client
        .from("contratos")
        .select(SELECT_CONTRATO_DETAIL)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      const contrato = mapRow(data as unknown as ContratoRow);

      if (caller && caller.userRol !== "admin" && contrato.visibilidad === "restringido") {
        if (contrato.created_by !== caller.userId) {
          const accessibleIds = await getAccessibleIds(client, tenantId, "contrato", caller.userId);
          if (!accessibleIds.has(id)) return null;
        }
      }

      return contrato;
    },

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

    async create(input: {
      tenant_id: string;
      titulo: string;
      tipo_id?: string;
      estado_id?: string;
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
      const { data: inserted, error: insertError } = await client
        .from("contratos")
        .insert({ estado_id: ESTADOS_CONTRATO.EN_REVISION, ...input })
        .select("id")
        .single();

      if (insertError) throw insertError;

      const { data, error } = await client
        .from("contratos")
        .select(SELECT_CONTRATO)
        .eq("id", (inserted as { id: string }).id)
        .single();

      if (error) throw error;
      return mapRow(data as unknown as ContratoRow);
    },

    async update(
      id: string,
      input: Partial<{
        titulo: string;
        tipo_id: string | null;
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
        responsable_ids: string[];
        responsable_id: string | null;
        responsable_nombre: string | null;
        updated_by: string;
      }>,
      snapshotAuthor?: { userId: string; nombre: string }
    ): Promise<Contrato> {
      if (input.contenido_html !== undefined && snapshotAuthor) {
        const actual = await this.getById(id);
        if (actual && actual.contenido_html !== input.contenido_html) {
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

      const { error: updateError } = await client
        .from("contratos")
        .update(input)
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (updateError) throw updateError;

      const { data, error } = await client
        .from("contratos")
        .select(SELECT_CONTRATO)
        .eq("id", id)
        .single();

      if (error) throw error;
      return mapRow(data as unknown as ContratoRow);
    },

    async changeEstado(
      id: string,
      newEstadoId: string
    ): Promise<Contrato> {
      const { error: updateError } = await client
        .from("contratos")
        .update({ estado_id: newEstadoId })
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (updateError) throw updateError;

      const { data, error } = await client
        .from("contratos")
        .select(SELECT_CONTRATO)
        .eq("id", id)
        .single();

      if (error) throw error;
      return mapRow(data as unknown as ContratoRow);
    },

    async delete(id: string, deletedBy?: string, deletedByNombre?: string): Promise<void> {
      const { error } = await client
        .from("contratos")
        .update({
          deleted_at:        new Date().toISOString(),
          deleted_by:        deletedBy       ?? null,
          deleted_by_nombre: deletedByNombre ?? null,
        })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async restore(id: string): Promise<void> {
      const { error } = await client
        .from("contratos")
        .update({ deleted_at: null, deleted_by: null, deleted_by_nombre: null })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async hardDelete(id: string): Promise<void> {
      const { error } = await client
        .from("contratos")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async listDeleted(): Promise<{
      id: string; titulo: string; numero: string | null; tipo: string; estado: string;
      contraparte_nombre: string | null; responsable_nombre: string | null;
      fecha_inicio: string | null; fecha_fin: string | null; fecha_firma: string | null;
      valor: number | null; moneda: string | null; descripcion: string | null;
      deleted_at: string; deleted_by_nombre: string | null;
    }[]> {
      const { data, error } = await client
        .from("contratos")
        .select([
          "id, titulo, numero, descripcion, contraparte_nombre, contraparte_email",
          "responsable_nombre, fecha_inicio, fecha_fin, fecha_firma, valor, moneda",
          "deleted_at, deleted_by_nombre",
          "tipo_cat:catalogos!tipo_id(valor)",
          "estado_ref:workflow_estados!estado_id(valor)",
        ].join(", "))
        .eq("tenant_id", tenantId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((r) => {
        const row = r as unknown as Record<string, unknown>;
        return {
          id:                 row.id as string,
          titulo:             row.titulo as string,
          numero:             row.numero as string | null,
          descripcion:        row.descripcion as string | null,
          tipo:               (row.tipo_cat as { valor?: string } | null)?.valor ?? "",
          estado:             (row.estado_ref as { valor?: string } | null)?.valor ?? "",
          contraparte_nombre: row.contraparte_nombre as string | null,
          contraparte_email:  row.contraparte_email as string | null,
          responsable_nombre: row.responsable_nombre as string | null,
          fecha_inicio:       row.fecha_inicio as string | null,
          fecha_fin:          row.fecha_fin as string | null,
          fecha_firma:        row.fecha_firma as string | null,
          valor:              row.valor as number | null,
          moneda:             row.moneda as string | null,
          deleted_at:         row.deleted_at as string,
          deleted_by_nombre:  row.deleted_by_nombre as string | null,
        };
      });
    },
  };
}
