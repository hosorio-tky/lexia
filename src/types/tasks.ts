// ─── Estados ──────────────────────────────────────────────────────────────────
export const TASK_STATUSES = ["pendiente", "en_progreso", "completada", "cancelada"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente:    "Pendiente",
  en_progreso:  "En progreso",
  completada:   "Completada",
  cancelada:    "Cancelada",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pendiente:   "bg-slate-100 text-slate-700 border-slate-200",
  en_progreso: "bg-blue-50 text-blue-700 border-blue-200",
  completada:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelada:   "bg-red-50 text-red-600 border-red-200",
};

// Columnas Kanban (excluye cancelada — va en filtro)
export const KANBAN_COLUMNS: TaskStatus[] = ["pendiente", "en_progreso", "completada"];

// ─── Prioridades ──────────────────────────────────────────────────────────────
export const TASK_PRIORITIES = ["baja", "media", "alta", "urgente"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  baja:    "Baja",
  media:   "Media",
  alta:    "Alta",
  urgente: "Urgente",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  baja:    "bg-slate-100 text-slate-600 border-slate-200",
  media:   "bg-blue-50 text-blue-700 border-blue-200",
  alta:    "bg-orange-50 text-orange-700 border-orange-200",
  urgente: "bg-red-50 text-red-700 border-red-200",
};

export const PRIORITY_DOT: Record<TaskPriority, string> = {
  baja:    "bg-slate-400",
  media:   "bg-blue-500",
  alta:    "bg-orange-500",
  urgente: "bg-red-500",
};

// ─── Entidades principales ────────────────────────────────────────────────────
export interface Task {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion?: string;
  estado: TaskStatus;
  prioridad: TaskPriority;
  asignado_a?: string;
  asignado_nombre?: string;
  modulo_origen?: string;
  recurso_id?: string;
  recurso_desc?: string;
  fecha_limite?: string;
  orden: number;
  created_by?: string;
  created_by_nombre?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  tarea_id: string;
  user_id?: string;
  user_nombre?: string;
  contenido: string;
  created_at: string;
}

// ─── Filtros ──────────────────────────────────────────────────────────────────
export interface TaskFilters {
  search: string;
  prioridad: TaskPriority | "";
  asignado: string;           // user_id o ""
  modulo_origen: string;
  mostrar_canceladas: boolean;
}
