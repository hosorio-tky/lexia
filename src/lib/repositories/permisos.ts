import type { SupabaseClient } from "@supabase/supabase-js";
import type { Permit, PermitType, TimelineEvent, PermitFilters, PermitFechaHistorial } from "@/types/permits";
import { ESTADOS_PERMISO } from "@/lib/constants/estados";
import { getAccessibleIds } from "./acceso";

// ─── Tipos de filas DB ────────────────────────────────────────
interface CatalogoRef { id: string; valor: string; }
interface UbicacionRef { id: string; nombre: string; }
interface EstadoRef { id: string; valor: string; }

interface PermisoRow {
  id: string;
  tenant_id: string;
  numero_expediente: string | null;
  nombre: string;
  descripcion: string | null;
  tipo_id: string | null;
  tipo_cat: CatalogoRef | null;
  entidad_reguladora_id: string | null;
  entidad_cat: CatalogoRef | null;
  ubicacion_id: string | null;
  ubicacion_ref: UbicacionRef | null;
  ubicacion: string | null;
  estado_id: string;
  estado_ref: EstadoRef | null;
  fecha_solicitud: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  tiene_provisional: boolean | null;
  fecha_emision_provisional: string | null;
  fecha_vencimiento_provisional: string | null;
  responsable_id: string | null;
  responsable_nombre: string | null;
  responsable_det: { area: string | null; user_id: string | null } | null;
  valor_tramite: number | null;
  moneda: string | null;
  base_legal: string | null;
  riesgo_incumplimiento: string | null;
  base_legal_incumplimiento: string | null;
  visibilidad: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface PermisoHistorialRow {
  id: string;
  permiso_id: string;
  estado_anterior_id: string | null;
  estado_nuevo_id: string | null;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  comentario: string | null;
  changed_by_nombre: string | null;
  changed_at: string;
}

interface PermisoFechaHistorialRow {
  id: string;
  tenant_id: string;
  permiso_id: string;
  fecha_emision_anterior: string | null;
  fecha_vencimiento_anterior: string | null;
  changed_by_nombre: string | null;
  changed_at: string;
  motivo: string | null;
}

const SELECT_PERMISO = [
  "*",
  "tipo_cat:catalogos!tipo_id(id, valor)",
  "entidad_cat:catalogos!entidad_reguladora_id(id, valor)",
  "ubicacion_ref:ubicaciones!ubicacion_id(id, nombre)",
  "estado_ref:workflow_estados!estado_id(id, valor)",
].join(", ");

const SELECT_PERMISO_DETAIL = [
  "*",
  "tipo_cat:catalogos!tipo_id(id, valor)",
  "entidad_cat:catalogos!entidad_reguladora_id(id, valor)",
  "ubicacion_ref:ubicaciones!ubicacion_id(id, nombre)",
  "estado_ref:workflow_estados!estado_id(id, valor)",
  "responsable_det:responsables!responsable_id(area, user_id)",
].join(", ");

// ─── Mapeo DB → Permit ────────────────────────────────────────
function mapRow(row: PermisoRow): Permit {
  return {
    id:                         row.id,
    tenant_id:                  row.tenant_id,
    numero_expediente:          row.numero_expediente ?? undefined,
    nombre:                     row.nombre,
    descripcion:                row.descripcion ?? undefined,
    tipo_id:                    row.tipo_id ?? "",
    tipo:                       row.tipo_cat?.valor ?? "",
    entidad_reguladora_id:      row.entidad_reguladora_id ?? undefined,
    entidad_reguladora:         row.entidad_cat?.valor ?? undefined,
    ubicacion_id:               row.ubicacion_id ?? undefined,
    ubicacion:                  row.ubicacion ?? row.ubicacion_ref?.nombre ?? undefined,
    estado_id:                  row.estado_id,
    estado:                     row.estado_ref?.valor ?? row.estado_id,
    fecha_solicitud:            row.fecha_solicitud ?? undefined,
    fecha_emision:              row.fecha_emision ?? undefined,
    fecha_vencimiento:          row.fecha_vencimiento ?? undefined,
    tiene_provisional:          row.tiene_provisional ?? undefined,
    fecha_emision_provisional:  row.fecha_emision_provisional ?? undefined,
    fecha_vencimiento_provisional: row.fecha_vencimiento_provisional ?? undefined,
    responsable_id:             row.responsable_id ?? undefined,
    responsable_nombre:         row.responsable_nombre ?? undefined,
    responsable_iniciales:      row.responsable_nombre
      ? row.responsable_nombre.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase()
      : undefined,
    responsable_area:           row.responsable_det?.area ?? undefined,
    valor_tramite:              row.valor_tramite ?? undefined,
    moneda:                     row.moneda ?? undefined,
    base_legal:                 row.base_legal ?? undefined,
    riesgo_incumplimiento:      row.riesgo_incumplimiento ?? undefined,
    base_legal_incumplimiento:  row.base_legal_incumplimiento ?? undefined,
    visibilidad:                (row.visibilidad as "publico" | "restringido") ?? "publico",
    created_by:                 row.created_by ?? undefined,
    updated_by:                 row.updated_by ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapTimelineRow(row: PermisoHistorialRow): TimelineEvent {
  return {
    id:                   row.id,
    permit_id:            row.permiso_id,
    estado_anterior_id:   row.estado_anterior_id ?? undefined,
    estado_nuevo_id:      row.estado_nuevo_id ?? undefined,
    estado_anterior:      row.estado_anterior ?? undefined,
    estado_nuevo:         row.estado_nuevo ?? "",
    comentario:           row.comentario ?? undefined,
    changed_by_nombre:    row.changed_by_nombre ?? undefined,
    created_at:           row.changed_at,
  };
}

function mapFechaHistorialRow(row: PermisoFechaHistorialRow): PermitFechaHistorial {
  return {
    id:                       row.id,
    tenant_id:                row.tenant_id,
    permiso_id:               row.permiso_id,
    fecha_emision_anterior:   row.fecha_emision_anterior ?? undefined,
    fecha_vencimiento_anterior: row.fecha_vencimiento_anterior ?? undefined,
    changed_by_nombre:        row.changed_by_nombre ?? undefined,
    changed_at:               row.changed_at,
    motivo:                   row.motivo ?? undefined,
  };
}

// ─── Repositorio ──────────────────────────────────────────────
export function createPermisosRepository(client: SupabaseClient, tenantId: string) {
  return {
    async list(
      filters?: Partial<PermitFilters> & { page?: number; limit?: number; sortKey?: string; sortDir?: "asc" | "desc" },
      caller?: { userId: string; userRol: string },
    ): Promise<{ items: Permit[]; total: number }> {
      const limit = filters?.limit ?? 9999;
      const page  = filters?.page  ?? 0;
      const from  = page * limit;
      const to    = from + limit - 1;

      const SORT_MAP: Record<string, string> = {
        nombre:      "nombre",
        vencimiento: "fecha_vencimiento",
        actividad:   "updated_at",
      };
      const dbCol = SORT_MAP[filters?.sortKey ?? "actividad"] ?? "updated_at";
      const asc   = filters?.sortDir === "asc";

      let query = client
        .from("permisos")
        .select(SELECT_PERMISO, { count: "exact" })
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order(dbCol, { ascending: asc })
        .range(from, to);

      if (filters?.estado)     query = query.eq("estado_id",        filters.estado);
      if (filters?.tipo)       query = query.eq("tipo_id",          filters.tipo);
      if (filters?.responsable) query = query.eq("responsable_nombre", filters.responsable);
      if (filters?.ubicacion)  query = query.eq("ubicacion",        filters.ubicacion);
      if (filters?.search) {
        query = query.or(
          `nombre.ilike.%${filters.search}%,numero_expediente.ilike.%${filters.search}%`
        );
      }
      if (filters?.vigencia) {
        const today = new Date().toISOString().split("T")[0];
        const in90d = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
        if (filters.vigencia === "Vencido") {
          query = query.lt("fecha_vencimiento", today);
        } else if (filters.vigencia === "Por vencer") {
          query = query.gte("fecha_vencimiento", today).lte("fecha_vencimiento", in90d);
        } else if (filters.vigencia === "Vigente") {
          query = query.gt("fecha_vencimiento", in90d);
        }
      }

      if (caller && caller.userRol !== "admin") {
        const accessibleIds = await getAccessibleIds(client, tenantId, "permiso", caller.userId);
        const idsClause = [...accessibleIds].map((id) => `id.eq.${id}`).join(",");
        const orClause  = idsClause
          ? `visibilidad.neq.restringido,created_by.eq.${caller.userId},${idsClause}`
          : `visibilidad.neq.restringido,created_by.eq.${caller.userId}`;
        query = query.or(orClause);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        items: (data ?? []).map((row) => mapRow(row as unknown as PermisoRow)),
        total: count ?? 0,
      };
    },

    async listStats(
      caller?: { userId: string; userRol: string },
    ): Promise<{ id: string; estado_id: string; fecha_vencimiento: string | null }[]> {
      let query = client
        .from("permisos")
        .select("id, estado_id, fecha_vencimiento")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      if (caller && caller.userRol !== "admin") {
        const accessibleIds = await getAccessibleIds(client, tenantId, "permiso", caller.userId);
        const idsClause = [...accessibleIds].map((id) => `id.eq.${id}`).join(",");
        const orClause  = idsClause
          ? `visibilidad.neq.restringido,created_by.eq.${caller.userId},${idsClause}`
          : `visibilidad.neq.restringido,created_by.eq.${caller.userId}`;
        query = query.or(orClause);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as { id: string; estado_id: string; fecha_vencimiento: string | null }[];
    },

    async getById(id: string, caller?: { userId: string; userRol: string }): Promise<Permit | null> {
      const { data, error } = await client
        .from("permisos")
        .select(SELECT_PERMISO_DETAIL)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      const permit = mapRow(data as unknown as PermisoRow);

      if (caller && caller.userRol !== "admin" && permit.visibilidad === "restringido") {
        if (permit.created_by !== caller.userId) {
          const accessibleIds = await getAccessibleIds(client, tenantId, "permiso", caller.userId);
          if (!accessibleIds.has(id)) return null;
        }
      }

      return permit;
    },

    async getTimeline(permisoId: string): Promise<TimelineEvent[]> {
      const { data, error } = await client
        .from("permiso_estados_historial")
        .select("*")
        .eq("permiso_id", permisoId)
        .eq("tenant_id", tenantId)
        .order("changed_at", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row) => mapTimelineRow(row as PermisoHistorialRow));
    },

    async getFechasHistorial(permisoId: string): Promise<PermitFechaHistorial[]> {
      const { data, error } = await client
        .from("permisos_fechas_historial")
        .select("*")
        .eq("permiso_id", permisoId)
        .eq("tenant_id", tenantId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((row) => mapFechaHistorialRow(row as PermisoFechaHistorialRow));
    },

    async registrarCambioFechas(
      permisoId: string,
      data: {
        fecha_emision_anterior?: string | null;
        fecha_vencimiento_anterior?: string | null;
        changed_by_nombre?: string;
        motivo?: string;
      }
    ): Promise<void> {
      const { error } = await client
        .from("permisos_fechas_historial")
        .insert({
          tenant_id:                 tenantId,
          permiso_id:                permisoId,
          fecha_emision_anterior:    data.fecha_emision_anterior ?? null,
          fecha_vencimiento_anterior: data.fecha_vencimiento_anterior ?? null,
          changed_by_nombre:         data.changed_by_nombre ?? null,
          motivo:                    data.motivo ?? null,
        });

      if (error) throw error;
    },

    async create(input: {
      tenant_id: string;
      nombre: string;
      tipo_id?: string;
      estado_id?: string;
      numero_expediente?: string;
      entidad_reguladora_id?: string;
      ubicacion_id?: string;
      ubicacion?: string;
      descripcion?: string;
      fecha_solicitud?: string;
      fecha_emision?: string;
      fecha_vencimiento?: string;
      tiene_provisional?: boolean;
      fecha_emision_provisional?: string;
      fecha_vencimiento_provisional?: string;
      responsable_id?: string;
      responsable_nombre?: string;
      valor_tramite?: number;
      moneda?: string;
      base_legal?: string;
      riesgo_incumplimiento?: string;
      base_legal_incumplimiento?: string;
    }): Promise<Permit> {
      const { data: inserted, error: insertError } = await client
        .from("permisos")
        .insert({ estado_id: ESTADOS_PERMISO.CREADO, ...input })
        .select("id")
        .single();
      if (insertError) throw insertError;

      const { data, error } = await client
        .from("permisos")
        .select(SELECT_PERMISO)
        .eq("id", (inserted as { id: string }).id)
        .single();
      if (error) throw error;
      return mapRow(data as unknown as PermisoRow);
    },

    async update(
      id: string,
      input: Partial<{
        nombre: string;
        tipo_id: string | null;
        numero_expediente: string;
        entidad_reguladora_id: string | null;
        ubicacion_id: string | null;
        ubicacion: string;
        descripcion: string;
        fecha_solicitud: string;
        fecha_emision: string;
        fecha_vencimiento: string;
        tiene_provisional: boolean;
        fecha_emision_provisional: string | null;
        fecha_vencimiento_provisional: string | null;
        responsable_ids: string[];
        responsable_id: string | null;
        responsable_nombre: string;
        valor_tramite: number | null;
        moneda: string;
        base_legal: string;
        riesgo_incumplimiento: string;
        base_legal_incumplimiento: string;
      }>
    ): Promise<Permit> {
      const { error: updateError } = await client
        .from("permisos")
        .update(input)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (updateError) throw updateError;

      const { data, error } = await client
        .from("permisos")
        .select(SELECT_PERMISO)
        .eq("id", id)
        .single();
      if (error) throw error;
      return mapRow(data as unknown as PermisoRow);
    },

    async changeStatus(
      id: string,
      newEstadoId: string,
      comment?: string
    ): Promise<Permit> {
      const { error: updateError } = await client
        .from("permisos")
        .update({ estado_id: newEstadoId })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (updateError) throw updateError;

      const { data, error } = await client
        .from("permisos")
        .select(SELECT_PERMISO)
        .eq("id", id)
        .single();
      if (error) throw error;

      if (comment) {
        const { data: latest } = await client
          .from("permiso_estados_historial")
          .select("id")
          .eq("permiso_id", id)
          .eq("tenant_id", tenantId)
          .order("changed_at", { ascending: false })
          .limit(1)
          .single();

        if (latest) {
          await client
            .from("permiso_estados_historial")
            .update({ comentario: comment })
            .eq("id", latest.id);
        }
      }

      return mapRow(data as unknown as PermisoRow);
    },

    async delete(id: string, deletedBy?: string, deletedByNombre?: string): Promise<void> {
      const { error } = await client
        .from("permisos")
        .update({
          deleted_at:        new Date().toISOString(),
          deleted_by:        deletedBy        ?? null,
          deleted_by_nombre: deletedByNombre  ?? null,
        })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async restore(id: string): Promise<void> {
      const { error } = await client
        .from("permisos")
        .update({ deleted_at: null, deleted_by: null, deleted_by_nombre: null })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async hardDelete(id: string): Promise<void> {
      const { error } = await client
        .from("permisos")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async listDeleted(): Promise<{
      id: string; nombre: string; tipo: string; estado: string;
      responsable_nombre: string | null; deleted_at: string; deleted_by_nombre: string | null;
      numero_expediente: string | null; descripcion: string | null;
      fecha_solicitud: string | null; fecha_emision: string | null;
      fecha_vencimiento: string | null; ubicacion: string | null;
      entidad_reguladora: string | null; base_legal: string | null;
      riesgo_incumplimiento: string | null; valor_tramite: number | null; moneda: string | null;
    }[]> {
      const { data, error } = await client
        .from("permisos")
        .select([
          "id, nombre, numero_expediente, descripcion, responsable_nombre",
          "fecha_solicitud, fecha_emision, fecha_vencimiento, ubicacion",
          "base_legal, riesgo_incumplimiento, valor_tramite, moneda",
          "deleted_at, deleted_by_nombre",
          "tipo_cat:catalogos!tipo_id(valor)",
          "entidad_cat:catalogos!entidad_reguladora_id(valor)",
          "estado_ref:workflow_estados!estado_id(valor)",
        ].join(", "))
        .eq("tenant_id", tenantId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((r) => {
        const row = r as unknown as Record<string, unknown>;
        return {
          id:                   row.id as string,
          nombre:               row.nombre as string,
          numero_expediente:    row.numero_expediente as string | null,
          descripcion:          row.descripcion as string | null,
          tipo:                 (row.tipo_cat as { valor?: string } | null)?.valor ?? "",
          estado:               (row.estado_ref as { valor?: string } | null)?.valor ?? "",
          entidad_reguladora:   (row.entidad_cat as { valor?: string } | null)?.valor ?? null,
          responsable_nombre:   row.responsable_nombre as string | null,
          fecha_solicitud:      row.fecha_solicitud as string | null,
          fecha_emision:        row.fecha_emision as string | null,
          fecha_vencimiento:    row.fecha_vencimiento as string | null,
          ubicacion:            row.ubicacion as string | null,
          base_legal:           row.base_legal as string | null,
          riesgo_incumplimiento: row.riesgo_incumplimiento as string | null,
          valor_tramite:        row.valor_tramite as number | null,
          moneda:               row.moneda as string | null,
          deleted_at:           row.deleted_at as string,
          deleted_by_nombre:    row.deleted_by_nombre as string | null,
        };
      });
    },
  };
}
