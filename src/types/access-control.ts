export type Visibilidad = 'publico' | 'restringido';
export type NivelAcceso = 'lectura' | 'edicion';
export type SubjectType = 'user' | 'group';
export type ResourceType = 'permiso' | 'contrato';

export interface Grupo {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed fields (joined)
  miembros_count?: number;
}

export interface GrupoMiembro {
  id: string;
  tenant_id: string;
  grupo_id: string;
  user_id: string;
  added_by?: string;
  created_at: string;
  // Joined fields
  nombre?: string;
  apellido?: string;
  email?: string;
  rol?: string;
}

export interface RecursoAcceso {
  id: string;
  tenant_id: string;
  resource_type: ResourceType;
  resource_id: string;
  subject_type: SubjectType;
  subject_id: string;
  nivel: NivelAcceso;
  granted_by?: string;
  created_at: string;
  // Joined display fields
  subject_nombre?: string;
}

export interface GrupoConMiembros extends Grupo {
  miembros: GrupoMiembro[];
}
