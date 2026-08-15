-- Registra el estado inicial en permiso_estados_historial al crear un permiso.
-- El trigger UPDATE ya captura cambios de estado; este cubre el INSERT.

CREATE OR REPLACE FUNCTION log_permiso_estado_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO permiso_estados_historial
    (tenant_id, permiso_id, estado_anterior, estado_nuevo, changed_by, changed_by_nombre)
  VALUES
    (new.tenant_id, new.id, NULL, new.estado,
     new.created_by,
     (SELECT nombre || ' ' || coalesce(apellido, '') FROM profiles WHERE id = new.created_by));
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS permiso_estado_insert ON permisos;
CREATE TRIGGER permiso_estado_insert
  AFTER INSERT ON permisos
  FOR EACH ROW EXECUTE FUNCTION log_permiso_estado_insert();
