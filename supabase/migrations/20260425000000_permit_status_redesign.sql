-- Add provisional fields to permisos
ALTER TABLE permisos
  ADD COLUMN IF NOT EXISTS tiene_provisional boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_emision_provisional date,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento_provisional date;

-- Create date history table
CREATE TABLE IF NOT EXISTS permisos_fechas_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  permiso_id uuid NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  fecha_emision_anterior date,
  fecha_vencimiento_anterior date,
  changed_by_nombre text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  motivo text
);
CREATE INDEX IF NOT EXISTS idx_permisos_fechas_historial_permiso
  ON permisos_fechas_historial(permiso_id);
