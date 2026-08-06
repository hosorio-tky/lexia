-- ============================================================
-- LEXIA — MIGRACIÓN: PLANTILLAS DE CONTRATOS
-- Tabla para plantillas HTML reutilizables por tenant
-- ============================================================

CREATE TABLE IF NOT EXISTS contrato_plantillas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre         text NOT NULL,
  tipo           contrato_tipo,
  descripcion    text,
  contenido_html text NOT NULL DEFAULT '',
  created_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE TRIGGER contrato_plantillas_updated_at
  BEFORE UPDATE ON contrato_plantillas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_contrato_plantillas_tenant ON contrato_plantillas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contrato_plantillas_tipo   ON contrato_plantillas(tenant_id, tipo);

-- RLS
ALTER TABLE contrato_plantillas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_plantillas" ON contrato_plantillas
  USING (tenant_id = (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));
