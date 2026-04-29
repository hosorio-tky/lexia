-- ============================================================
-- LEXIA — MIGRACIÓN: CONTRATOS (M02)
-- Tabla principal, versiones, RLS
-- ============================================================

-- Tipos
DO $$ BEGIN
  CREATE TYPE contrato_tipo AS ENUM (
    'Servicio', 'Suministro', 'Laboral', 'Arrendamiento', 'Confidencialidad', 'Otro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabla principal
CREATE TABLE IF NOT EXISTS contratos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id),
  numero              text,
  titulo              text NOT NULL,
  descripcion         text,
  tipo                contrato_tipo NOT NULL,
  estado              text NOT NULL DEFAULT 'En Revisión',
  contraparte_nombre  text,
  contraparte_email   text,
  valor               numeric,
  moneda              text DEFAULT 'USD',
  fecha_inicio        date,
  fecha_fin           date,
  fecha_firma         date,
  storage_path        text,
  contenido_html      text,
  responsable_id      uuid REFERENCES responsables(id) ON DELETE SET NULL,
  responsable_nombre  text,
  created_by          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE TRIGGER contratos_updated_at
  BEFORE UPDATE ON contratos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_contratos_tenant ON contratos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estado ON contratos(tenant_id, estado);
CREATE INDEX IF NOT EXISTS idx_contratos_fin    ON contratos(tenant_id, fecha_fin);

-- Versiones del contenido
CREATE TABLE IF NOT EXISTS contrato_versiones (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id),
  contrato_id       uuid NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  version_num       integer NOT NULL,
  contenido_html    text,
  storage_path      text,
  creado_por        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  creado_por_nombre text,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contrato_versiones ON contrato_versiones(contrato_id);

-- RLS
ALTER TABLE contratos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_versiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contratos: select" ON contratos FOR SELECT
  USING (tenant_id = current_tenant_id());
CREATE POLICY "contratos: insert" ON contratos FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND current_user_role() IN ('admin','supervisor','usuario'));
CREATE POLICY "contratos: update" ON contratos FOR UPDATE
  USING (tenant_id = current_tenant_id() AND current_user_role() IN ('admin','supervisor','usuario'));
CREATE POLICY "contratos: delete" ON contratos FOR DELETE
  USING (tenant_id = current_tenant_id() AND current_user_role() = 'admin');

CREATE POLICY "contrato_versiones: select" ON contrato_versiones FOR SELECT
  USING (tenant_id = current_tenant_id());
CREATE POLICY "contrato_versiones: insert" ON contrato_versiones FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());
