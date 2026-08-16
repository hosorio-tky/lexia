-- Refactor: replace text `estado` columns in permisos/contratos with a UUID FK
-- to a new `workflow_estados` table. The `id` is used internally for joins/logic;
-- `valor` is the mutable display label the user sees.

-- ── 1. Create workflow_estados table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_estados (
  id     uuid PRIMARY KEY,
  modulo text NOT NULL,
  codigo text NOT NULL,
  valor  text NOT NULL,
  orden  int  NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  UNIQUE(modulo, codigo)
);

ALTER TABLE workflow_estados ENABLE ROW LEVEL SECURITY;

-- Readable by authenticated users of any tenant (system table, not tenant-scoped)
CREATE POLICY "workflow_estados: select"
  ON workflow_estados FOR SELECT
  TO authenticated
  USING (true);

-- ── 2. Seed fixed UUIDs ───────────────────────────────────────────────────────
-- Permisos
INSERT INTO workflow_estados (id, modulo, codigo, valor, orden) VALUES
  ('e1000001-0000-0000-0000-000000000001', 'permisos', 'creado',                  'Creado',                  1),
  ('e1000001-0000-0000-0000-000000000002', 'permisos', 'en_gestion',              'En Gestión',              2),
  ('e1000001-0000-0000-0000-000000000003', 'permisos', 'presentado',              'Presentado',              3),
  ('e1000001-0000-0000-0000-000000000004', 'permisos', 'con_permiso_provisional', 'Con Permiso Provisional',  4),
  ('e1000001-0000-0000-0000-000000000005', 'permisos', 'aprobado',                'Aprobado',                5),
  ('e1000001-0000-0000-0000-000000000006', 'permisos', 'actualizar_permiso',      'Actualizar Permiso',      6),
  ('e1000001-0000-0000-0000-000000000007', 'permisos', 'rechazado',               'Rechazado',               7)
ON CONFLICT (id) DO NOTHING;

-- Contratos
INSERT INTO workflow_estados (id, modulo, codigo, valor, orden) VALUES
  ('e2000001-0000-0000-0000-000000000001', 'contratos', 'en_revision',    'En Revisión',     1),
  ('e2000001-0000-0000-0000-000000000002', 'contratos', 'pendiente_firma', 'Pendiente Firma', 2),
  ('e2000001-0000-0000-0000-000000000003', 'contratos', 'vigente',        'Vigente',          3),
  ('e2000001-0000-0000-0000-000000000004', 'contratos', 'vencido',        'Vencido',          4),
  ('e2000001-0000-0000-0000-000000000005', 'contratos', 'terminado',      'Terminado',        5),
  ('e2000001-0000-0000-0000-000000000006', 'contratos', 'cancelado',      'Cancelado',        6)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Add estado_id columns (nullable FK first, before backfill) ─────────────
ALTER TABLE permisos
  ADD COLUMN IF NOT EXISTS estado_id uuid REFERENCES workflow_estados(id);

ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS estado_id uuid REFERENCES workflow_estados(id);

-- ── 4. Backfill permisos.estado_id ────────────────────────────────────────────
-- Maps both current canonical values AND legacy values from before redesign.
UPDATE permisos
SET estado_id = CASE estado
  -- Canonical post-redesign values
  WHEN 'Creado'                  THEN 'e1000001-0000-0000-0000-000000000001'::uuid
  WHEN 'En Gestión'              THEN 'e1000001-0000-0000-0000-000000000002'::uuid
  WHEN 'Presentado'              THEN 'e1000001-0000-0000-0000-000000000003'::uuid
  WHEN 'Con Permiso Provisional' THEN 'e1000001-0000-0000-0000-000000000004'::uuid
  WHEN 'Aprobado'                THEN 'e1000001-0000-0000-0000-000000000005'::uuid
  WHEN 'Actualizar Permiso'      THEN 'e1000001-0000-0000-0000-000000000006'::uuid
  WHEN 'Rechazado'               THEN 'e1000001-0000-0000-0000-000000000007'::uuid
  -- Legacy pre-redesign values
  WHEN 'Activo'                  THEN 'e1000001-0000-0000-0000-000000000005'::uuid  -- → Aprobado
  WHEN 'Vigente'                 THEN 'e1000001-0000-0000-0000-000000000005'::uuid  -- → Aprobado
  WHEN 'Pre-Renovación'          THEN 'e1000001-0000-0000-0000-000000000006'::uuid  -- → Actualizar Permiso
  WHEN 'En Trámite'              THEN 'e1000001-0000-0000-0000-000000000002'::uuid  -- → En Gestión
  WHEN 'En Revisión'             THEN 'e1000001-0000-0000-0000-000000000001'::uuid  -- → Creado
  WHEN 'Requisitos'              THEN 'e1000001-0000-0000-0000-000000000001'::uuid  -- → Creado
  ELSE 'e1000001-0000-0000-0000-000000000001'::uuid  -- default: Creado
END
WHERE estado_id IS NULL;

-- ── 5. Backfill contratos.estado_id ──────────────────────────────────────────
UPDATE contratos
SET estado_id = CASE estado
  WHEN 'En Revisión'     THEN 'e2000001-0000-0000-0000-000000000001'::uuid
  WHEN 'Pendiente Firma' THEN 'e2000001-0000-0000-0000-000000000002'::uuid
  WHEN 'Vigente'         THEN 'e2000001-0000-0000-0000-000000000003'::uuid
  WHEN 'Vencido'         THEN 'e2000001-0000-0000-0000-000000000004'::uuid
  WHEN 'Terminado'       THEN 'e2000001-0000-0000-0000-000000000005'::uuid
  WHEN 'Cancelado'       THEN 'e2000001-0000-0000-0000-000000000006'::uuid
  ELSE 'e2000001-0000-0000-0000-000000000001'::uuid  -- default: En Revisión
END
WHERE estado_id IS NULL;

-- ── 6. Make NOT NULL, set defaults ───────────────────────────────────────────
ALTER TABLE permisos
  ALTER COLUMN estado_id SET NOT NULL,
  ALTER COLUMN estado_id SET DEFAULT 'e1000001-0000-0000-0000-000000000001';

ALTER TABLE contratos
  ALTER COLUMN estado_id SET NOT NULL,
  ALTER COLUMN estado_id SET DEFAULT 'e2000001-0000-0000-0000-000000000001';

-- ── 7. Drop dependent views, then old text columns ───────────────────────────
-- Views must be dropped before their source columns are removed.
DROP VIEW IF EXISTS v_permisos;

ALTER TABLE permisos  DROP COLUMN IF EXISTS estado;
ALTER TABLE contratos DROP COLUMN IF EXISTS estado;

-- ── 8. Add _id FK columns to historial (keep text snapshots for immutability) ─
ALTER TABLE permiso_estados_historial
  ADD COLUMN IF NOT EXISTS estado_anterior_id uuid REFERENCES workflow_estados(id),
  ADD COLUMN IF NOT EXISTS estado_nuevo_id     uuid REFERENCES workflow_estados(id);

-- Backfill historial _id columns from existing text values
UPDATE permiso_estados_historial h
SET
  estado_anterior_id = CASE h.estado_anterior
    WHEN 'Creado'                  THEN 'e1000001-0000-0000-0000-000000000001'::uuid
    WHEN 'En Gestión'              THEN 'e1000001-0000-0000-0000-000000000002'::uuid
    WHEN 'Presentado'              THEN 'e1000001-0000-0000-0000-000000000003'::uuid
    WHEN 'Con Permiso Provisional' THEN 'e1000001-0000-0000-0000-000000000004'::uuid
    WHEN 'Aprobado'                THEN 'e1000001-0000-0000-0000-000000000005'::uuid
    WHEN 'Actualizar Permiso'      THEN 'e1000001-0000-0000-0000-000000000006'::uuid
    WHEN 'Rechazado'               THEN 'e1000001-0000-0000-0000-000000000007'::uuid
    ELSE NULL
  END,
  estado_nuevo_id = CASE h.estado_nuevo
    WHEN 'Creado'                  THEN 'e1000001-0000-0000-0000-000000000001'::uuid
    WHEN 'En Gestión'              THEN 'e1000001-0000-0000-0000-000000000002'::uuid
    WHEN 'Presentado'              THEN 'e1000001-0000-0000-0000-000000000003'::uuid
    WHEN 'Con Permiso Provisional' THEN 'e1000001-0000-0000-0000-000000000004'::uuid
    WHEN 'Aprobado'                THEN 'e1000001-0000-0000-0000-000000000005'::uuid
    WHEN 'Actualizar Permiso'      THEN 'e1000001-0000-0000-0000-000000000006'::uuid
    WHEN 'Rechazado'               THEN 'e1000001-0000-0000-0000-000000000007'::uuid
    ELSE NULL
  END;

-- ── 9. Update INSERT trigger to use estado_id ─────────────────────────────────
CREATE OR REPLACE FUNCTION log_permiso_estado_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_label text;
BEGIN
  SELECT valor INTO v_label FROM workflow_estados WHERE id = new.estado_id;
  INSERT INTO permiso_estados_historial
    (tenant_id, permiso_id, estado_anterior_id, estado_nuevo_id,
     estado_anterior, estado_nuevo, changed_by, changed_by_nombre)
  VALUES
    (new.tenant_id, new.id, NULL, new.estado_id, NULL, v_label,
     new.created_by,
     (SELECT nombre || ' ' || coalesce(apellido, '') FROM profiles WHERE id = new.created_by));
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS permiso_estado_insert ON permisos;
CREATE TRIGGER permiso_estado_insert
  AFTER INSERT ON permisos
  FOR EACH ROW EXECUTE FUNCTION log_permiso_estado_insert();

-- ── 10. Update UPDATE trigger to use estado_id ───────────────────────────────
CREATE OR REPLACE FUNCTION log_permiso_estado_change()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_ant_label text;
  v_new_label text;
BEGIN
  IF old.estado_id IS DISTINCT FROM new.estado_id THEN
    SELECT valor INTO v_ant_label FROM workflow_estados WHERE id = old.estado_id;
    SELECT valor INTO v_new_label FROM workflow_estados WHERE id = new.estado_id;
    INSERT INTO permiso_estados_historial
      (tenant_id, permiso_id, estado_anterior_id, estado_nuevo_id,
       estado_anterior, estado_nuevo, changed_by, changed_by_nombre)
    VALUES
      (new.tenant_id, new.id, old.estado_id, new.estado_id,
       v_ant_label, v_new_label,
       new.updated_by,
       (SELECT nombre || ' ' || coalesce(apellido, '') FROM profiles WHERE id = new.updated_by));
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS permiso_estado_change ON permisos;
CREATE TRIGGER permiso_estado_change
  AFTER UPDATE ON permisos
  FOR EACH ROW EXECUTE FUNCTION log_permiso_estado_change();

-- ── 11. Recreate v_permisos view to expose both estado_id and estado label ────
CREATE VIEW v_permisos AS
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
  p.estado_id,
  we.valor                        AS estado,
  we.codigo                       AS estado_codigo,
  we.orden                        AS estado_orden,
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
  p.visibilidad,
  p.fecha_vencimiento - CURRENT_DATE AS dias_restantes,
  CASE
    WHEN p.fecha_vencimiento < CURRENT_DATE          THEN 'vencido'
    WHEN p.fecha_vencimiento <= (CURRENT_DATE + 15)  THEN 'critico'
    WHEN p.fecha_vencimiento <= (CURRENT_DATE + 30)  THEN 'advertencia'
    WHEN p.fecha_vencimiento <= (CURRENT_DATE + 90)  THEN 'proximo'
    ELSE 'vigente'
  END AS semaforo
FROM permisos p
LEFT JOIN workflow_estados we       ON we.id             = p.estado_id
LEFT JOIN catalogos tipo_cat        ON tipo_cat.id        = p.tipo_id
LEFT JOIN catalogos entidad_cat     ON entidad_cat.id     = p.entidad_reguladora_id;

NOTIFY pgrst, 'reload schema';
