// Fixed UUIDs for workflow estados — stable across environments.
// Use these constants for all DB queries, comparisons, and transitions.
// The `valor` (display label) lives in the DB and can be renamed without code changes.

export const ESTADOS_PERMISO = {
  CREADO:                  'e1000001-0000-0000-0000-000000000001',
  EN_GESTION:              'e1000001-0000-0000-0000-000000000002',
  PRESENTADO:              'e1000001-0000-0000-0000-000000000003',
  CON_PERMISO_PROVISIONAL: 'e1000001-0000-0000-0000-000000000004',
  APROBADO:                'e1000001-0000-0000-0000-000000000005',
  ACTUALIZAR_PERMISO:      'e1000001-0000-0000-0000-000000000006',
  RECHAZADO:               'e1000001-0000-0000-0000-000000000007',
} as const;

export const ESTADOS_CONTRATO = {
  EN_REVISION:    'e2000001-0000-0000-0000-000000000001',
  PENDIENTE_FIRMA:'e2000001-0000-0000-0000-000000000002',
  VIGENTE:        'e2000001-0000-0000-0000-000000000003',
  VENCIDO:        'e2000001-0000-0000-0000-000000000004',
  TERMINADO:      'e2000001-0000-0000-0000-000000000005',
  CANCELADO:      'e2000001-0000-0000-0000-000000000006',
} as const;

// Default labels (hardcoded fallback; real labels come from the DB JOIN)
export const ESTADOS_PERMISO_LABELS: Record<string, string> = {
  [ESTADOS_PERMISO.CREADO]:                  'Creado',
  [ESTADOS_PERMISO.EN_GESTION]:              'En Gestión',
  [ESTADOS_PERMISO.PRESENTADO]:              'Presentado',
  [ESTADOS_PERMISO.CON_PERMISO_PROVISIONAL]: 'Con Permiso Provisional',
  [ESTADOS_PERMISO.APROBADO]:                'Aprobado',
  [ESTADOS_PERMISO.ACTUALIZAR_PERMISO]:      'Actualizar Permiso',
  [ESTADOS_PERMISO.RECHAZADO]:               'Rechazado',
};

export const ESTADOS_CONTRATO_LABELS: Record<string, string> = {
  [ESTADOS_CONTRATO.EN_REVISION]:    'En Revisión',
  [ESTADOS_CONTRATO.PENDIENTE_FIRMA]:'Pendiente Firma',
  [ESTADOS_CONTRATO.VIGENTE]:        'Vigente',
  [ESTADOS_CONTRATO.VENCIDO]:        'Vencido',
  [ESTADOS_CONTRATO.TERMINADO]:      'Terminado',
  [ESTADOS_CONTRATO.CANCELADO]:      'Cancelado',
};

// Options for filter dropdowns
export const ESTADOS_PERMISO_OPTIONS = [
  { id: ESTADOS_PERMISO.CREADO,                  valor: 'Creado' },
  { id: ESTADOS_PERMISO.EN_GESTION,              valor: 'En Gestión' },
  { id: ESTADOS_PERMISO.PRESENTADO,              valor: 'Presentado' },
  { id: ESTADOS_PERMISO.CON_PERMISO_PROVISIONAL, valor: 'Con Permiso Provisional' },
  { id: ESTADOS_PERMISO.APROBADO,                valor: 'Aprobado' },
  { id: ESTADOS_PERMISO.ACTUALIZAR_PERMISO,      valor: 'Actualizar Permiso' },
  { id: ESTADOS_PERMISO.RECHAZADO,               valor: 'Rechazado' },
] as const;

export const ESTADOS_CONTRATO_OPTIONS = [
  { id: ESTADOS_CONTRATO.EN_REVISION,    valor: 'En Revisión' },
  { id: ESTADOS_CONTRATO.PENDIENTE_FIRMA,valor: 'Pendiente Firma' },
  { id: ESTADOS_CONTRATO.VIGENTE,        valor: 'Vigente' },
  { id: ESTADOS_CONTRATO.VENCIDO,        valor: 'Vencido' },
  { id: ESTADOS_CONTRATO.TERMINADO,      valor: 'Terminado' },
  { id: ESTADOS_CONTRATO.CANCELADO,      valor: 'Cancelado' },
] as const;

// Workflow transitions keyed by estado_id
export const PERMISO_TRANSITIONS: Record<string, string[]> = {
  [ESTADOS_PERMISO.CREADO]:                  [ESTADOS_PERMISO.EN_GESTION],
  [ESTADOS_PERMISO.EN_GESTION]:              [ESTADOS_PERMISO.PRESENTADO, ESTADOS_PERMISO.RECHAZADO],
  [ESTADOS_PERMISO.PRESENTADO]:              [ESTADOS_PERMISO.CON_PERMISO_PROVISIONAL, ESTADOS_PERMISO.APROBADO, ESTADOS_PERMISO.RECHAZADO],
  [ESTADOS_PERMISO.CON_PERMISO_PROVISIONAL]: [ESTADOS_PERMISO.APROBADO, ESTADOS_PERMISO.RECHAZADO],
  [ESTADOS_PERMISO.APROBADO]:                [ESTADOS_PERMISO.ACTUALIZAR_PERMISO],
  [ESTADOS_PERMISO.ACTUALIZAR_PERMISO]:      [ESTADOS_PERMISO.APROBADO, ESTADOS_PERMISO.RECHAZADO],
  // "Rechazado" no es un callejón sin salida: se puede reabrir el trámite
  // hacia "En Gestión" (botón "Reabrir" en el detalle del permiso).
  [ESTADOS_PERMISO.RECHAZADO]:               [ESTADOS_PERMISO.EN_GESTION],
};

export const CONTRATO_TRANSITIONS: Record<string, string[]> = {
  [ESTADOS_CONTRATO.EN_REVISION]:    [ESTADOS_CONTRATO.PENDIENTE_FIRMA, ESTADOS_CONTRATO.CANCELADO],
  [ESTADOS_CONTRATO.PENDIENTE_FIRMA]:[ESTADOS_CONTRATO.VIGENTE, ESTADOS_CONTRATO.EN_REVISION, ESTADOS_CONTRATO.CANCELADO],
  [ESTADOS_CONTRATO.VIGENTE]:        [ESTADOS_CONTRATO.TERMINADO, ESTADOS_CONTRATO.VENCIDO],
  [ESTADOS_CONTRATO.VENCIDO]:        [ESTADOS_CONTRATO.TERMINADO],
  [ESTADOS_CONTRATO.TERMINADO]:      [],
  [ESTADOS_CONTRATO.CANCELADO]:      [],
};

// Orden para cálculo de progreso en barra de workflow
export const ESTADOS_PERMISO_ORDEN: Record<string, number> = {
  [ESTADOS_PERMISO.CREADO]:                  1,
  [ESTADOS_PERMISO.EN_GESTION]:              2,
  [ESTADOS_PERMISO.PRESENTADO]:              3,
  [ESTADOS_PERMISO.CON_PERMISO_PROVISIONAL]: 4,
  [ESTADOS_PERMISO.APROBADO]:                5,
  [ESTADOS_PERMISO.ACTUALIZAR_PERMISO]:      6,
  [ESTADOS_PERMISO.RECHAZADO]:               7,
};

export const ESTADOS_CONTRATO_ORDEN: Record<string, number> = {
  [ESTADOS_CONTRATO.EN_REVISION]:    1,
  [ESTADOS_CONTRATO.PENDIENTE_FIRMA]:2,
  [ESTADOS_CONTRATO.VIGENTE]:        3,
  [ESTADOS_CONTRATO.VENCIDO]:        4,
  [ESTADOS_CONTRATO.TERMINADO]:      5,
  [ESTADOS_CONTRATO.CANCELADO]:      6,
};
