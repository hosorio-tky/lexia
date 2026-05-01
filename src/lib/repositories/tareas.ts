import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task, TaskComment, TaskStatus, TaskPriority } from "@/types/tasks";

// ─── Tipos de filas DB ────────────────────────────────────────
interface TareaRow {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  prioridad: string;
  asignado_a: string | null;
  asignado_nombre: string | null;
  modulo_origen: string | null;
  recurso_id: string | null;
  recurso_desc: string | null;
  fecha_limite: string | null;
  orden: number;
  created_by: string | null;
  created_by_nombre: string | null;
  created_at: string;
  updated_at: string;
}

interface ComentarioRow {
  id: string;
  tarea_id: string;
  user_id: string | null;
  user_nombre: string | null;
  contenido: string;
  created_at: string;
}

// ─── Mappers ──────────────────────────────────────────────────
function mapTarea(row: TareaRow): Task {
  return {
    id:                row.id,
    tenant_id:         row.tenant_id,
    titulo:            row.titulo,
    descripcion:       row.descripcion       ?? undefined,
    estado:            row.estado            as TaskStatus,
    prioridad:         row.prioridad         as TaskPriority,
    asignado_a:        row.asignado_a        ?? undefined,
    asignado_nombre:   row.asignado_nombre   ?? undefined,
    modulo_origen:     row.modulo_origen     ?? undefined,
    recurso_id:        row.recurso_id        ?? undefined,
    recurso_desc:      row.recurso_desc      ?? undefined,
    fecha_limite:      row.fecha_limite      ?? undefined,
    orden:             row.orden,
    created_by:        row.created_by        ?? undefined,
    created_by_nombre: row.created_by_nombre ?? undefined,
    created_at:        row.created_at,
    updated_at:        row.updated_at,
  };
}

function mapComentario(row: ComentarioRow): TaskComment {
  return {
    id:          row.id,
    tarea_id:    row.tarea_id,
    user_id:     row.user_id    ?? undefined,
    user_nombre: row.user_nombre ?? undefined,
    contenido:   row.contenido,
    created_at:  row.created_at,
  };
}

// ─── Repositorio ──────────────────────────────────────────────
export function createTareasRepository(client: SupabaseClient, tenantId: string) {
  return {
    // ── Listado con filtros opcionales ────────────────────────
    async list(filters?: {
      estado?: TaskStatus | TaskStatus[];
      prioridad?: TaskPriority;
      asignado_a?: string;
      modulo_origen?: string;
      recurso_id?: string;
      search?: string;
    }): Promise<Task[]> {
      let query = client
        .from("tareas")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("orden",      { ascending: true })
        .order("created_at", { ascending: false });

      if (filters?.estado) {
        if (Array.isArray(filters.estado)) {
          query = query.in("estado", filters.estado);
        } else {
          query = query.eq("estado", filters.estado);
        }
      }
      if (filters?.prioridad)     query = query.eq("prioridad",     filters.prioridad);
      if (filters?.asignado_a)    query = query.eq("asignado_a",    filters.asignado_a);
      if (filters?.modulo_origen) query = query.eq("modulo_origen", filters.modulo_origen);
      if (filters?.recurso_id)    query = query.eq("recurso_id",    filters.recurso_id);
      if (filters?.search) {
        query = query.ilike("titulo", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((r) => mapTarea(r as TareaRow));
    },

    // ── Detalle de una tarea ───────────────────────────────────
    async getById(id: string): Promise<Task | null> {
      const { data, error } = await client
        .from("tareas")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();
      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return mapTarea(data as TareaRow);
    },

    // ── Crear tarea ────────────────────────────────────────────
    async create(input: {
      titulo: string;
      descripcion?: string;
      prioridad?: string;
      estado?: string;
      asignado_a?: string;
      asignado_nombre?: string;
      modulo_origen?: string;
      recurso_id?: string;
      recurso_desc?: string;
      fecha_limite?: string;
      created_by?: string;
      created_by_nombre?: string;
    }): Promise<Task> {
      const { data, error } = await client
        .from("tareas")
        .insert({ ...input, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return mapTarea(data as TareaRow);
    },

    // ── Actualizar tarea ───────────────────────────────────────
    async update(
      id: string,
      input: Partial<{
        titulo: string;
        descripcion: string;
        prioridad: string;
        asignado_a: string | null;
        asignado_nombre: string | null;
        fecha_limite: string | null;
        estado: string;
        orden: number;
      }>
    ): Promise<Task> {
      const { data, error } = await client
        .from("tareas")
        .update(input)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();
      if (error) throw error;
      return mapTarea(data as TareaRow);
    },

    // ── Mover tarea (cambio de estado por DnD) ─────────────────
    async moverEstado(id: string, nuevoEstado: TaskStatus): Promise<void> {
      const { error } = await client
        .from("tareas")
        .update({ estado: nuevoEstado })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    // ── Eliminar tarea ─────────────────────────────────────────
    async delete(id: string): Promise<void> {
      const { error } = await client
        .from("tareas")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    // ── Comentarios ────────────────────────────────────────────
    async getComentarios(tareaId: string): Promise<TaskComment[]> {
      const { data, error } = await client
        .from("tarea_comentarios")
        .select("*")
        .eq("tarea_id", tareaId)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => mapComentario(r as ComentarioRow));
    },

    async addComentario(input: {
      tarea_id: string;
      contenido: string;
      user_id?: string;
      user_nombre?: string;
    }): Promise<TaskComment> {
      const { data, error } = await client
        .from("tarea_comentarios")
        .insert({ ...input, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return mapComentario(data as ComentarioRow);
    },

    async deleteComentario(id: string): Promise<void> {
      const { error } = await client
        .from("tarea_comentarios")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
  };
}
