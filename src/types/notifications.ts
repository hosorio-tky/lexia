export interface Notificacion {
  id: string;
  tenant_id: string;
  user_id: string;
  titulo: string;
  mensaje?: string;
  tipo: "in_app" | "email";
  modulo?: string;
  recurso_id?: string;
  recurso_desc?: string;
  leida: boolean;
  created_at: string;
}

export interface NotificacionFilters {
  leida?: boolean | null; // null = todas
  modulo?: string;
}
