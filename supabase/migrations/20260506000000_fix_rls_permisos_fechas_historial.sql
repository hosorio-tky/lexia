-- ============================================================
-- FIX: Habilitar RLS en permisos_fechas_historial
-- Tabla creada en 20260425000000 sin RLS
-- ============================================================

ALTER TABLE permisos_fechas_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permisos_fechas_historial: select"
  ON permisos_fechas_historial FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "permisos_fechas_historial: insert"
  ON permisos_fechas_historial FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "permisos_fechas_historial: delete admin"
  ON permisos_fechas_historial FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('admin', 'supervisor')
  );
