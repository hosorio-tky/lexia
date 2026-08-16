import { ESTADOS_PERMISO, PERMISO_TRANSITIONS } from "@/lib/constants/estados";

// ─── Estado colors keyed by estado_id ────────────────────────────────────────
export const STATUS_COLORS: Record<string, string> = {
  [ESTADOS_PERMISO.CREADO]:                  "bg-slate-100 text-slate-700 border-slate-200",
  [ESTADOS_PERMISO.EN_GESTION]:              "bg-blue-50 text-blue-700 border-blue-200",
  [ESTADOS_PERMISO.PRESENTADO]:              "bg-indigo-50 text-indigo-700 border-indigo-200",
  [ESTADOS_PERMISO.CON_PERMISO_PROVISIONAL]: "bg-amber-50 text-amber-700 border-amber-200",
  [ESTADOS_PERMISO.APROBADO]:                "bg-emerald-50 text-emerald-700 border-emerald-200",
  [ESTADOS_PERMISO.ACTUALIZAR_PERMISO]:      "bg-orange-50 text-orange-700 border-orange-200",
  [ESTADOS_PERMISO.RECHAZADO]:               "bg-red-100 text-red-700 border-red-300",
};

// Alias for callers that import STATUS_TRANSITIONS from this module
export const STATUS_TRANSITIONS = PERMISO_TRANSITIONS;

// ─── Vigencia (calculated, never stored) ─────────────────────────────────────
export type VigenciaStatus = "Vigente" | "Por vencer" | "Vencido" | "Sin fecha";

export function calcularVigencia(fecha?: string): VigenciaStatus {
  if (!fecha) return "Sin fecha";
  const diff = new Date(fecha).getTime() - Date.now();
  const days = diff / 86400000;
  if (days < 0)   return "Vencido";
  if (days <= 90) return "Por vencer";
  return "Vigente";
}

export const VIGENCIA_COLORS: Record<VigenciaStatus, string> = {
  "Vigente":    "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Por vencer": "bg-amber-50 text-amber-700 border-amber-200",
  "Vencido":    "bg-red-100 text-red-700 border-red-300",
  "Sin fecha":  "bg-slate-100 text-slate-500 border-slate-200",
};

// ─── Tipos de permiso (en catálogos BD) ──────────────────────────────────────
export type PermitType = string;

// ─── Interfaces principales ───────────────────────────────────────────────
export const MONEDAS = ["USD", "EUR", "GTQ", "HNL", "NIO", "CRC", "COP", "MXN"] as const;
export type Moneda = (typeof MONEDAS)[number];

export interface Permit {
  id: string;
  tenant_id: string;
  numero_expediente?: string;
  nombre: string;
  descripcion?: string;
  tipo_id: string;
  tipo: string;
  entidad_reguladora_id?: string;
  entidad_reguladora?: string;
  ubicacion_id?: string;
  ubicacion?: string;
  // Workflow state — UUID for logic/joins, string label for display (from JOIN)
  estado_id: string;
  estado: string;
  // Fechas
  fecha_solicitud?: string;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  tiene_provisional?: boolean;
  fecha_emision_provisional?: string;
  fecha_vencimiento_provisional?: string;
  responsable_id?: string;
  responsable_nombre?: string;
  responsable_iniciales?: string;
  responsable_area?: string;
  responsable_ids?: string[];
  valor_tramite?: number;
  moneda?: string;
  base_legal?: string;
  riesgo_incumplimiento?: string;
  base_legal_incumplimiento?: string;
  visibilidad?: 'publico' | 'restringido';
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  permit_id: string;
  estado_anterior_id?: string;
  estado_nuevo_id?: string;
  estado_anterior?: string;
  estado_nuevo: string;
  comentario?: string;
  changed_by_nombre?: string;
  created_at: string;
}

export interface PermitFechaHistorial {
  id: string;
  tenant_id: string;
  permiso_id: string;
  fecha_emision_anterior?: string;
  fecha_vencimiento_anterior?: string;
  changed_by_nombre?: string;
  changed_at: string;
  motivo?: string;
}

export interface PermitFilters {
  search: string;
  estado: string;       // estado_id UUID or empty string
  tipo: string;
  entidad: string;
  responsable: string;
  vigencia: VigenciaStatus | "";
  ubicacion: string;
}
