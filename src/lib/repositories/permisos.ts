import type { SupabaseClient } from "@supabase/supabase-js";
import type { Permit, PermitType, TimelineEvent, PermitFilters, PermitStatus, PermitFechaHistorial } from "@/types/permits";

// ─── Tipos de filas DB (evita `any`) ─────────────────────────
interface PermisoRow {
  id: string;
  tenant_id: string;
  numero_expediente: string | null;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  entidad_reguladora: string | null;
  ubicacion_id: string | null;
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
  valor_tramite: number | null;
  moneda: string | null;
  base_legal: string | null;
  riesgo_incumplimiento: string | null;
  base_legal_incumplimiento: string | null;
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
    tipo:                       row.tipo as PermitType,
    entidad_reguladora:         row.entidad_reguladora ?? undefined,
    ubicacion_id:               row.ubicacion_id ?? undefined,
    ubicacion:                  row.ubicacion ?? undefined,
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
    valor_tramite:              row.valor_tramite ?? undefined,
    moneda:                     row.moneda ?? undefined,
    base_legal:                 row.base_legal ?? undefined,
    riesgo_incumplimiento:      row.riesgo_incumplimiento ?? undefined,
    base_legal_incumplimiento:  row.base_legal_incumplimiento ?? undefined,
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
    async list(filters?: Partial<PermitFilters>): Promise<Permit[]> {
      let query = client
        .from("permisos")
        .select("*")
        .eq("tenant_id", tenantId)          // ← aislamiento tenant
        .order("created_at", { ascending: false });

      if (filters?.estado) {
        query = query.eq("estado", filters.estado);
      }
      if (filters?.tipo) {
        query = query.eq("tipo", filters.tipo);
      }
      if (filters?.entidad) {
        query = query.eq("entidad_reguladora", filters.entidad);
      }
      if (filters?.search) {
        query = query.or(
          `nombre.ilike.%${filters.search}%,numero_expediente.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => mapRow(row as PermisoRow));
    },

    // M01-F02: Detalle del permiso
    async getById(id: string): Promise<Permit | null> {
      const { data, error } = await client
        .from("permisos")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)          // ← evita acceso cross-tenant
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // not found
        throw error;
      }
      return mapRow(data as PermisoRow);
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
      tipo: string;
      estado?: string;           // opcional — defecto "Creado"
      numero_expediente?: string;
      entidad_reguladora?: string;
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
      const { data, error } = await client
        .from("permisos")
        .insert({ estado: "Creado", ...input }) // input.estado sobrescribe el default si se provee
        .select()
        .single();

      if (error) throw error;
      return mapRow(data as PermisoRow);
    },

    // M01-F09: Editar permiso
    async update(
      id: string,
      input: Partial<{
        nombre: string;
        tipo: string;
        numero_expediente: string;
        entidad_reguladora: string;
        ubicacion_id: string | null;
        ubicacion: string;
        descripcion: string;
        fecha_solicitud: string;
        fecha_emision: string;
        fecha_vencimiento: string;
        tiene_provisional: boolean;
        fecha_emision_provisional: string | null;
        fecha_vencimiento_provisional: string | null;
        responsable_id: string | null;
        responsable_nombre: string;
        valor_tramite: number | null;
        moneda: string;
        base_legal: string;
        riesgo_incumplimiento: string;
        base_legal_incumplimiento: string;
      }>
    ): Promise<Permit> {
      const { data, error } = await client
        .from("permisos")
        .update(input)
        .eq("id", id)
        .eq("tenant_id", tenantId)          // ← evita edición cross-tenant
        .select()
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
      // El trigger log_permiso_estado_change registra el historial automáticamente
      const { data, error } = await client
        .from("permisos")
        .update({ estado: newStatus })
        .eq("id", id)
        .eq("tenant_id", tenantId)          // ← evita cambio de estado cross-tenant
        .select()
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
