export const CONTRACT_TIPOS = [
  'Servicio', 'Suministro', 'Laboral', 'Arrendamiento', 'Confidencialidad', 'Otro'
] as const;
export type ContratoTipo = (typeof CONTRACT_TIPOS)[number];

export const CONTRACT_ESTADOS = [
  'En Revisión', 'Pendiente Firma', 'Vigente', 'Vencido', 'Terminado', 'Cancelado'
] as const;
export type ContratoEstado = (typeof CONTRACT_ESTADOS)[number];

// Colores por estado
export const ESTADO_COLORS: Record<ContratoEstado, string> = {
  'En Revisión':     'bg-slate-100 text-slate-700 border-slate-200',
  'Pendiente Firma': 'bg-amber-50 text-amber-700 border-amber-200',
  'Vigente':         'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Vencido':         'bg-red-100 text-red-700 border-red-300',
  'Terminado':       'bg-blue-50 text-blue-700 border-blue-200',
  'Cancelado':       'bg-gray-100 text-gray-500 border-gray-200',
};

// Transiciones permitidas
export const ESTADO_TRANSITIONS: Record<ContratoEstado, ContratoEstado[]> = {
  'En Revisión':     ['Pendiente Firma', 'Cancelado'],
  'Pendiente Firma': ['Vigente', 'En Revisión', 'Cancelado'],
  'Vigente':         ['Terminado', 'Vencido'],
  'Vencido':         ['Terminado'],
  'Terminado':       [],
  'Cancelado':       [],
};

export const MONEDAS_CONTRATO = ['USD', 'EUR', 'GTQ', 'HNL', 'NIO', 'CRC', 'COP', 'MXN'] as const;

export interface Contrato {
  id: string;
  tenant_id: string;
  numero?: string;
  titulo: string;
  descripcion?: string;
  tipo: ContratoTipo;
  estado: ContratoEstado;
  contraparte_nombre?: string;
  contraparte_email?: string;
  valor?: number;
  moneda?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  fecha_firma?: string;
  storage_path?: string;
  contenido_html?: string;
  responsable_id?: string;
  responsable_nombre?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ContratoVersion {
  id: string;
  tenant_id: string;
  contrato_id: string;
  version_num: number;
  contenido_html?: string;
  storage_path?: string;
  creado_por?: string;
  creado_por_nombre?: string;
  created_at: string;
}

export interface ContratoFilters {
  search: string;
  estado: ContratoEstado | '';
  tipo: ContratoTipo | '';
}

// Calcula el % de tiempo transcurrido entre fecha_inicio y fecha_fin
export function calcularProgresoTemporal(fecha_inicio?: string, fecha_fin?: string): number {
  if (!fecha_inicio || !fecha_fin) return 0;
  const inicio = new Date(fecha_inicio).getTime();
  const fin    = new Date(fecha_fin).getTime();
  const hoy    = Date.now();
  if (hoy <= inicio) return 0;
  if (hoy >= fin)    return 100;
  return Math.round(((hoy - inicio) / (fin - inicio)) * 100);
}

// Calcula días restantes
export function diasRestantes(fecha_fin?: string): number | null {
  if (!fecha_fin) return null;
  return Math.ceil((new Date(fecha_fin).getTime() - Date.now()) / 86400000);
}
