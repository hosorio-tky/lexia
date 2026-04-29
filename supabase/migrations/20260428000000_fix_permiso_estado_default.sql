-- ============================================================
-- Fix: Estado inicial de permisos
-- El diseño TypeScript usa "Creado" como primer estado del workflow.
-- La migración original tenía el enum permiso_estado con default
-- 'Identificado', que ya no corresponde al workflow actual.
-- ============================================================

-- 1. Eliminar la vista que depende de la columna tipada
DROP VIEW IF EXISTS v_permisos;

-- 2. Convertir la columna estado de enum a text
ALTER TABLE permisos
  ALTER COLUMN estado TYPE text
  USING estado::text;

-- 3. Eliminar el enum (con CASCADE para limpiar dependencias)
DROP TYPE IF EXISTS permiso_estado CASCADE;

-- 4. Restaurar columnas de historial (el CASCADE las eliminó)
ALTER TABLE permiso_estados_historial
  ADD COLUMN IF NOT EXISTS estado_anterior text,
  ADD COLUMN IF NOT EXISTS estado_nuevo    text NOT NULL DEFAULT '';

ALTER TABLE permiso_estados_historial
  ALTER COLUMN estado_nuevo DROP DEFAULT;

-- 5. Establecer el nuevo default
ALTER TABLE permisos
  ALTER COLUMN estado SET DEFAULT 'Creado';

-- 6. Migrar registros con el valor anterior 'Identificado' → 'Creado'
UPDATE permisos
SET estado = 'Creado'
WHERE estado = 'Identificado';

-- 7. Recrear el trigger function (usaba el enum, ahora usa text)
CREATE OR REPLACE FUNCTION log_permiso_estado_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF old.estado IS DISTINCT FROM new.estado THEN
    INSERT INTO permiso_estados_historial
      (tenant_id, permiso_id, estado_anterior, estado_nuevo, changed_by, changed_by_nombre)
    VALUES
      (new.tenant_id, new.id, old.estado, new.estado,
       new.updated_by,
       (SELECT nombre || ' ' || coalesce(apellido, '') FROM profiles WHERE id = new.updated_by));
  END IF;
  RETURN new;
END;
$$;

-- 8. Recrear el trigger
DROP TRIGGER IF EXISTS permiso_estado_change ON permisos;
CREATE TRIGGER permiso_estado_change
  AFTER UPDATE ON permisos
  FOR EACH ROW EXECUTE FUNCTION log_permiso_estado_change();

-- 9. Recrear la vista v_permisos
CREATE OR REPLACE VIEW v_permisos AS
SELECT p.*,
  (p.fecha_vencimiento - current_date) AS dias_restantes,
  CASE
    WHEN p.fecha_vencimiento < current_date           THEN 'vencido'
    WHEN p.fecha_vencimiento <= current_date + 15     THEN 'critico'
    WHEN p.fecha_vencimiento <= current_date + 30     THEN 'advertencia'
    WHEN p.fecha_vencimiento <= current_date + 90     THEN 'proximo'
    ELSE 'vigente'
  END AS semaforo
FROM permisos p;
