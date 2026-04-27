// ─── Roles ────────────────────────────────────────────────────────────────
export const USER_ROLES = ["admin", "supervisor", "usuario", "solo_lectura"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:        "Administrador",
  supervisor:   "Supervisor",
  usuario:      "Usuario",
  solo_lectura: "Solo lectura",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin:        "bg-blue-50 text-blue-700 border-blue-200",
  supervisor:   "bg-purple-50 text-purple-700 border-purple-200",
  usuario:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  solo_lectura: "bg-slate-100 text-slate-600 border-slate-200",
};

// ─── Entidad de dominio ───────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  tenant_id: string;
  nombre: string;
  apellido?: string;
  email: string;
  rol: UserRole;
  avatar_url?: string;
  activo: boolean;
  cargo?: string;
  departamento?: string;
  telefono?: string;
  ultimo_acceso?: string;
  created_at: string;
  updated_at: string;
  // Calculados
  nombre_completo: string;
  iniciales: string;
}

// ─── Activity log ─────────────────────────────────────────────────────────
export interface ActivityEvent {
  id: string;
  user_nombre?: string;
  accion: string;
  modulo?: string;
  recurso_id?: string;
  recurso_desc?: string;
  created_at: string;
}

// ─── Sesión autenticada (disponible en Server Components / Actions) ───────
export interface SessionInfo {
  user_id: string;
  email: string;
  tenant_id: string;
  rol: UserRole;
  nombre: string;
  nombre_completo: string;
}
