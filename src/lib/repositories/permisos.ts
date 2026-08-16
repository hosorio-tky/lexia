import type { SupabaseClient } from "@supabase/supabase-js";
import type { Permit, PermitType, TimelineEvent, PermitFilters, PermitStatus, PermitFechaHistorial } from "@/types/permits";
import { getAccessibleIds } from "./acceso";

// ─── Tipos de filas DB (evita `any`) ─────────────────────────
interface CatalogoRef { id: string; valor: string; }

interface UbicacionRef { id: string; nombre: string; }

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
  estado: string;
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
  estado_anterior: string | null;
  estado_nuevo: string;
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
    estado:                     row.estado as PermitStatus,
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
    estado_anterior:      (row.estado_anterior ?? undefined) as PermitStatus | undefined,
    estado_nuevo:         row.estado_nuevo as PermitStatus,
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
// tenantId es obligatorio cuando se usa admin client (sin RLS).
// Garantiza aislamiento multi-tenant en todas las queries.
export function createPermisosRepository(client: SupabaseClient, tenantId: string) {
  return {
    // M01-F01: Listado con filtros
    async list(
      filters?: Partial<PermitFilters>,
      caller?: { userId: string; userRol: string },
    ): Promise<Permit[]> {
      let query = client
        .from("permisos")
        .select("*, tipo_cat:catalogos!tipo_id(id, valor), entidad_cat:catalogos!entidad_reguladora_id(id, valor), ubicacion_ref:ubicaciones!ubicacion_id(id, nombre)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (filters?.estado) {
        query = query.eq("estado", filters.estado);
      }
      if (filters?.tipo) {
        query = query.eq("tipo_id", filters.tipo);
      }
      if (filters?.entidad) {
        query = query.eq("entidad_reguladora_id", filters.entidad);
      }
      if (filters?.search) {
        query = query.or(
          `nombre.ilike.%${filters.search}%,numero_expediente.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      let result = (data ?? []).map((row) => mapRow(row as PermisoRow));

      // Enforce visibility for non-admin users
      if (caller && caller.userRol !== "admin") {
        const accessibleIds = await getAccessibleIds(client, tenantId, "permiso", caller.userId);
        result = result.filter(
          (p) =>
            p.visibilidad !== "restringido" ||
            p.created_by === caller.userId ||
            accessibleIds.has(p.id),
        );
      }

      return result;
    },

    // M01-F02: Detalle del permiso
    async getById(id: string, caller?: { userId: string; userRol: string }): Promise<Permit | null> {
      const { data, error } = await client
        .from("permisos")
        .select("*, tipo_cat:catalogos!tipo_id(id, valor), entidad_cat:catalogos!entidad_reguladora_id(id, valor), ubicacion_ref:ubicaciones!ubicacion_id(id, nombre), responsable_det:responsables!responsable_id(area, user_id)")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // not found
        throw error;
      }
      const permit = mapRow(data as unknown as PermisoRow);

      // Enforce visibility for non-admin users
      if (caller && caller.userRol !== "admin" && permit.visibilidad === "restringido") {
        if (permit.created_by !== caller.userId) {
          const accessibleIds = await getAccessibleIds(client, tenantId, "permiso", caller.userId);
          if (!accessibleIds.has(id)) return null;
        }
      }

      return permit;
    },

    // M01-F04: Cronología del trámite
    async getTimeline(permisoId: string): Promise<TimelineEvent[]> {
      const { data, error } = await client
        .from("permiso_estados_historial")
        .select("*")
        .eq("permiso_id", permisoId)
        .eq("tenant_id", tenantId)          // ← aislamiento tenant
        .order("changed_at", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row) => mapTimelineRow(row as PermisoHistorialRow));
    },

    // Historial de cambios de fechas
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

    // Registrar cambio de fechas
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

    // M01-F09: Crear permiso
    async create(input: {
      tenant_id: string;
      nombre: string;
      tipo_id?: string;
      estado?: string;
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
        .insert({ estado: "Creado", ...input })
        .select("id")
        .single();
      if (insertError) throw insertError;

      const { data, error } = await client
        .from("permisos")
        .select("*, tipo_cat:catalogos!tipo_id(id, valor), entidad_cat:catalogos!entidad_reguladora_id(id, valor)")
        .eq("id", (inserted as { id: string }).id)
        .single();
      if (error) throw error;
      return mapRow(data as PermisoRow);
    },

    // M01-F09: Editar permiso
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
        .select("*, tipo_cat:catalogos!tipo_id(id, valor), entidad_cat:catalogos!entidad_reguladora_id(id, valor)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return mapRow(data as PermisoRow);
    },

    // M01-F03: Cambiar estado (workflow)
    async changeStatus(
      id: string,
      newStatus: PermitStatus,
      comment?: string
    ): Promise<Permit> {
      const { error: updateError } = await client
        .from("permisos")
        .update({ estado: newStatus })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (updateError) throw updateError;

      const { data, error } = await client
        .from("permisos")
        .select("*, tipo_cat:catalogos!tipo_id(id, valor), entidad_cat:catalogos!entidad_reguladora_id(id, valor)")
        .eq("id", id)
        .single();
      if (error) throw error;

      // Si hay comentario, actualizamos el último registro de historial (insertado por el trigger)
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

      return mapRow(data as PermisoRow);
    },

    // Eliminar permiso (solo admin)
    async delete(id: string): Promise<void> {
      const { error } = await client
        .from("permisos")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);         // ← evita borrado cross-tenant
      if (error) throw error;
    },
  };
}
