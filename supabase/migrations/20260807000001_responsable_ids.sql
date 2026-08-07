-- Agrega soporte para múltiples responsables en permisos y contratos.
-- responsable_id / responsable_nombre se mantienen para compatibilidad (primer responsable).

ALTER TABLE permisos
  ADD COLUMN IF NOT EXISTS responsable_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS responsable_ids uuid[] NOT NULL DEFAULT '{}';

-- Inicializa el array con el responsable_id existente donde aplique
UPDATE permisos SET responsable_ids = ARRAY[responsable_id]
  WHERE responsable_id IS NOT NULL AND responsable_ids = '{}';

UPDATE contratos SET responsable_ids = ARRAY[responsable_id]
  WHERE responsable_id IS NOT NULL AND responsable_ids = '{}';
