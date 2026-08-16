import { ESTADOS_CONTRATO, CONTRATO_TRANSITIONS } from "@/lib/constants/estados";

export type ContratoTipo = string;

// Estado colors keyed by estado_id
export const ESTADO_COLORS: Record<string, string> = {
  [ESTADOS_CONTRATO.EN_REVISION]:    'bg-slate-100 text-slate-700 border-slate-200',
  [ESTADOS_CONTRATO.PENDIENTE_FIRMA]:'bg-amber-50 text-amber-700 border-amber-200',
  [ESTADOS_CONTRATO.VIGENTE]:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  [ESTADOS_CONTRATO.VENCIDO]:        'bg-red-100 text-red-700 border-red-300',
  [ESTADOS_CONTRATO.TERMINADO]:      'bg-blue-50 text-blue-700 border-blue-200',
  [ESTADOS_CONTRATO.CANCELADO]:      'bg-gray-100 text-gray-500 border-gray-200',
};

// Alias for callers that import ESTADO_TRANSITIONS from this module
export const ESTADO_TRANSITIONS = CONTRATO_TRANSITIONS;

export const MONEDAS_CONTRATO = ['USD', 'EUR', 'GTQ', 'HNL', 'NIO', 'CRC', 'COP', 'MXN'] as const;

export interface Contrato {
  id: string;
  tenant_id: string;
  numero?: string;
  titulo: string;
  descripcion?: string;
  tipo_id: string;
  tipo: string;
  // Workflow state — UUID for logic/joins, string label for display (from JOIN)
  estado_id: string;
  estado: string;
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
  responsable_area?: string;
  responsable_ids?: string[];
  visibilidad?: 'publico' | 'restringido';
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
  estado: string;       // estado_id UUID or empty string
  tipo: string;
}

export function calcularProgresoTemporal(fecha_inicio?: string, fecha_fin?: string): number {
  if (!fecha_inicio || !fecha_fin) return 0;
  const inicio = new Date(fecha_inicio).getTime();
  const fin    = new Date(fecha_fin).getTime();
  const hoy    = Date.now();
  if (hoy <= inicio) return 0;
  if (hoy >= fin)    return 100;
  return Math.round(((hoy - inicio) / (fin - inicio)) * 100);
}

export function diasRestantes(fecha_fin?: string): number | null {
  if (!fecha_fin) return null;
  return Math.ceil((new Date(fecha_fin).getTime() - Date.now()) / 86400000);
}
