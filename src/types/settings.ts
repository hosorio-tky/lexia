// ─── Tenant Settings (T06-F03) ────────────────────────────────────────────────
export interface TenantSettings {
  id: string;
  nombre: string;
  slug: string;
  logo_url?: string;
  descripcion?: string;
  sitio_web?: string;
  industria?: string;
  pais: string;
  color_marca: string;
}

// ─── Catálogos (T06-F01) ─────────────────────────────────────────────────────
export const MODULOS_CATALOGO = ["permisos", "contratos", "global"] as const;
export type ModuloCatalogo = (typeof MODULOS_CATALOGO)[number];

export const TIPOS_CATALOGO: Record<ModuloCatalogo, { tipo: string; label: string }[]> = {
  permisos: [
    { tipo: "tipo_permiso",        label: "Tipos de permiso" },
    { tipo: "entidad_reguladora",  label: "Entidades reguladoras" },
  ],
  contratos: [
    { tipo: "tipo_contrato",       label: "Tipos de contrato" },
  ],
  global: [
    { tipo: "industria",           label: "Industrias" },
    { tipo: "pais",                label: "Países" },
  ],
};

export interface CatalogoItem {
  id: string;
  tenant_id: string;
  modulo: ModuloCatalogo;
  tipo: string;
  valor: string;
  etiqueta: string;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

// ─── Plantillas de alerta (T06-F02) ──────────────────────────────────────────
export const EVENTOS_ALERTA = [
  "vencimiento_proximo",
  "cambio_estado",
  "creacion",
] as const;
export type EventoAlerta = (typeof EVENTOS_ALERTA)[number];

export const EVENTO_LABELS: Record<EventoAlerta, string> = {
  vencimiento_proximo: "Vencimiento próximo",
  cambio_estado:       "Cambio de estado",
  creacion:            "Creación de registro",
};

export const CANALES_ALERTA = ["in_app", "email"] as const;
export type CanalAlerta = (typeof CANALES_ALERTA)[number];

export const CANAL_LABELS: Record<CanalAlerta, string> = {
  in_app: "Notificación en app",
  email:  "Correo electrónico",
};

export interface PlantillaAlerta {
  id: string;
  tenant_id: string;
  nombre: string;
  modulo: string;
  evento: EventoAlerta;
  dias_antes?: number;
  canal: CanalAlerta;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Roles matrix (T06-F05) ──────────────────────────────────────────────────
export interface PermisoRol {
  accion: string;
  descripcion: string;
  admin: boolean;
  supervisor: boolean;
  usuario: boolean;
  solo_lectura: boolean;
}

export const PERMISOS_MATRIZ: { grupo: string; items: PermisoRol[] }[] = [
  {
    grupo: "Permisos y Licencias",
    items: [
      { accion: "Ver listado y detalle",  descripcion: "Consultar permisos del tenant",         admin: true,  supervisor: true,  usuario: true,  solo_lectura: true  },
      { accion: "Crear permiso",          descripcion: "Registrar un nuevo permiso",             admin: true,  supervisor: true,  usuario: true,  solo_lectura: false },
      { accion: "Editar permiso",         descripcion: "Modificar datos del permiso",            admin: true,  supervisor: true,  usuario: true,  solo_lectura: false },
      { accion: "Cambiar estado",         descripcion: "Avanzar el permiso en el workflow",      admin: true,  supervisor: true,  usuario: true,  solo_lectura: false },
      { accion: "Eliminar permiso",       descripcion: "Borrar permanentemente",                 admin: true,  supervisor: false, usuario: false, solo_lectura: false },
    ],
  },
  {
    grupo: "Usuarios",
    items: [
      { accion: "Ver lista de usuarios",  descripcion: "Consultar usuarios del tenant",          admin: true,  supervisor: true,  usuario: false, solo_lectura: false },
      { accion: "Invitar usuario",        descripcion: "Enviar invitación a nuevo miembro",      admin: true,  supervisor: true,  usuario: false, solo_lectura: false },
      { accion: "Editar rol de usuario",  descripcion: "Cambiar el rol de otro usuario",         admin: true,  supervisor: false, usuario: false, solo_lectura: false },
      { accion: "Activar / desactivar",   descripcion: "Bloquear o habilitar acceso",            admin: true,  supervisor: false, usuario: false, solo_lectura: false },
      { accion: "Editar propio perfil",   descripcion: "Cambiar nombre, cargo, contraseña",      admin: true,  supervisor: true,  usuario: true,  solo_lectura: true  },
    ],
  },
  {
    grupo: "Configuración",
    items: [
      { accion: "Personalización empresa", descripcion: "Editar nombre, logo, datos de empresa", admin: true,  supervisor: false, usuario: false, solo_lectura: false },
      { accion: "Gestionar catálogos",     descripcion: "Crear/editar tipos y entidades",        admin: true,  supervisor: false, usuario: false, solo_lectura: false },
      { accion: "Plantillas de alertas",   descripcion: "Configurar cuándo notificar",           admin: true,  supervisor: false, usuario: false, solo_lectura: false },
      { accion: "Ver log de auditoría",    descripcion: "Consultar historial de actividad",      admin: true,  supervisor: true,  usuario: false, solo_lectura: false },
    ],
  },
];
