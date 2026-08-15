-- ─── Migración: referencias de catálogo como FK (UUID) ────────────────────────
-- Reemplaza las columnas de texto que referencian catalogos por FK uuid.
-- profiles.departamento     → profiles.departamento_id
-- permisos.tipo             → permisos.tipo_id
-- permisos.entidad_reguladora → permisos.entidad_reguladora_id
-- contratos.tipo            → contratos.tipo_id

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. profiles.departamento → departamento_id
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS departamento_id uuid
    REFERENCES catalogos(id) ON DELETE SET NULL;

-- Backfill solo si la columna de texto aún existe (idempotente)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'departamento'
  ) THEN
    UPDATE profiles p
    SET    departamento_id = (
      SELECT c.id FROM catalogos c
      WHERE  c.valor = p.departamento AND c.tipo = 'departamento' AND c.tenant_id = p.tenant_id
      LIMIT  1
    )
    WHERE p.departamento IS NOT NULL;
  END IF;
END $$;

ALTER TABLE profiles DROP COLUMN IF EXISTS departamento;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. permisos.tipo → tipo_id
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE permisos
  ADD COLUMN IF NOT EXISTS tipo_id uuid
    REFERENCES catalogos(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'permisos' AND column_name = 'tipo'
  ) THEN
    UPDATE permisos p
    SET    tipo_id = (
      SELECT c.id FROM catalogos c
      WHERE c.valor = p.tipo::text AND c.tipo = 'tipo_permiso' AND c.tenant_id = p.tenant_id
      LIMIT 1
    )
    WHERE p.tipo IS NOT NULL;
  END IF;
END $$;

-- Drop dependent view before dropping columns
DROP VIEW IF EXISTS v_permisos;

ALTER TABLE permisos DROP COLUMN IF EXISTS tipo;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. permisos.entidad_reguladora → entidad_reguladora_id
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE permisos
  ADD COLUMN IF NOT EXISTS entidad_reguladora_id uuid
    REFERENCES catalogos(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'permisos' AND column_name = 'entidad_reguladora'
  ) THEN
    UPDATE permisos p
    SET    entidad_reguladora_id = (
      SELECT c.id FROM catalogos c
      WHERE c.valor = p.entidad_reguladora AND c.tipo = 'entidad_reguladora' AND c.tenant_id = p.tenant_id
      LIMIT 1
    )
    WHERE p.entidad_reguladora IS NOT NULL;
  END IF;
END $$;

ALTER TABLE permisos DROP COLUMN IF EXISTS entidad_reguladora;

-- Recreate v_permisos using FK columns with JOINs for text display
CREATE OR REPLACE VIEW v_permisos AS
SELECT
  p.id,
  p.tenant_id,
  p.numero_expediente,
  p.nombre,
  p.descripcion,
  tipo_cat.valor                  AS tipo,
  entidad_cat.valor               AS entidad_reguladora,
  p.tipo_id,
  p.entidad_reguladora_id,
  p.ubicacion,
  p.estado,
  p.fecha_solicitud,
  p.fecha_emision,
  p.fecha_vencimiento,
  p.responsable_id,
  p.responsable_nombre,
  p.created_by,
  p.updated_by,
  p.created_at,
  p.updated_at,
  p.ubicacion_id,
  p.valor_tramite,
  p.moneda,
  p.base_legal,
  p.riesgo_incumplimiento,
  p.base_legal_incumplimiento,
  p.tiene_provisional,
  p.fecha_emision_provisional,
  p.fecha_vencimiento_provisional,
  p.fecha_vencimiento - CURRENT_DATE AS dias_restantes,
  CASE
    WHEN p.fecha_vencimiento < CURRENT_DATE          THEN 'vencido'
    WHEN p.fecha_vencimiento <= (CURRENT_DATE + 15)  THEN 'critico'
    WHEN p.fecha_vencimiento <= (CURRENT_DATE + 30)  THEN 'advertencia'
    WHEN p.fecha_vencimiento <= (CURRENT_DATE + 90)  THEN 'proximo'
    ELSE 'vigente'
  END AS semaforo
FROM permisos p
LEFT JOIN catalogos tipo_cat    ON tipo_cat.id    = p.tipo_id
LEFT JOIN catalogos entidad_cat ON entidad_cat.id = p.entidad_reguladora_id;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. contratos.tipo → tipo_id
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS tipo_id uuid
    REFERENCES catalogos(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contratos' AND column_name = 'tipo'
  ) THEN
    UPDATE contratos ct
    SET    tipo_id = (
      SELECT c.id FROM catalogos c
      WHERE c.valor = ct.tipo::text AND c.tipo = 'tipo_contrato' AND c.tenant_id = ct.tenant_id
      LIMIT 1
    )
    WHERE ct.tipo IS NOT NULL;
  END IF;
END $$;

ALTER TABLE contratos DROP COLUMN IF EXISTS tipo;
