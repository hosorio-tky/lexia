// ─── Estados del trámite (workflow) ───────────────────────────────────────────
export const PERMIT_STATUSES = [
  "Creado",
  "En Gestión",
  "Presentado",
  "Con Permiso Provisional",
  "Aprobado",
  "Actualizar Permiso",
  "Rechazado",
] as const;

export type PermitStatus = (typeof PERMIT_STATUSES)[number];

// Transiciones permitidas por estado
export const STATUS_TRANSITIONS: Record<PermitStatus, PermitStatus[]> = {
  "Creado":                  ["En Gestión"],
  "En Gestión":              ["Presentado", "Rechazado"],
  "Presentado":              ["Con Permiso Provisional", "Aprobado", "Rechazado"],
  "Con Permiso Provisional": ["Aprobado", "Rechazado"],
  "Aprobado":                ["Actualizar Permiso"],
  "Actualizar Permiso":      ["Aprobado", "Rechazado"],
  "Rechazado":               [],
};

// ─── Colores semáforo ──────────────────────────────────────────────────────
export const STATUS_COLORS: Record<PermitStatus, string> = {
  "Creado":                  "bg-slate-100 text-slate-700 border-slate-200",
  "En Gestión":              "bg-blue-50 text-blue-700 border-blue-200",
  "Presentado":              "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Con Permiso Provisional": "bg-amber-50 text-amber-700 border-amber-200",
  "Aprobado":                "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Actualizar Permiso":      "bg-orange-50 text-orange-700 border-orange-200",
  "Rechazado":               "bg-red-100 text-red-700 border-red-300",
};

// ─── Vigencia (calculada, nunca almacenada) ────────────────────────────────
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

// ─── Tipos de permiso ──────────────────────────────────────────────────────
export const PERMIT_TYPES = [
  "Ambiental",
  "Sanitario",
  "Operativo",
  "Construcción",
  "Importación",
  "Laboral",
  "Tributario",
] as const;

export type PermitType = (typeof PERMIT_TYPES)[number];

// ─── Entidades reguladoras (seed El Salvador) ─────────────────────────────
export const REGULATORY_ENTITIES = [
  "MARN",
  "MINSAL",
  "Alcaldía Municipal",
  "MTPS",
  "MINEC",
  "CNR",
  "SSF",
] as const;

// ─── Interfaces principales ───────────────────────────────────────────────
export const MONEDAS = ["USD", "EUR", "GTQ", "HNL", "NIO", "CRC", "COP", "MXN"] as const;
export type Moneda = (typeof MONEDAS)[number];

export interface Permit {
  id: string;
  tenant_id: string;
  numero_expediente?: string;
  nombre: string;
  descripcion?: string;
  tipo: PermitType;
  entidad_reguladora?: string;
  // Ubicación: FK + texto desnormalizado
  ubicacion_id?: string;
  ubicacion?: string;
  // Estado del workflow (trámite)
  estado: PermitStatus;
  // Fechas
  fecha_solicitud?: string;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  // Permiso provisional
  tiene_provisional?: boolean;
  fecha_emision_provisional?: string;
  fecha_vencimiento_provisional?: string;
  // Responsable: FK + texto desnormalizado
  responsable_id?: string;
  responsable_nombre?: string;
  responsable_iniciales?: string;
  // Valor económico
  valor_tramite?: number;
  moneda?: string;
  // Campos legales y riesgo
  base_legal?: string;
  riesgo_incumplimiento?: string;
  base_legal_incumplimiento?: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  permit_id: string;
  estado_anterior?: PermitStatus;
  estado_nuevo: PermitStatus;
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
  estado: PermitStatus | "";
  tipo: PermitType | "";
  entidad: string;
  responsable: string;   // SC-10: filtro por responsable_nombre
  vigencia: VigenciaStatus | "";
}
