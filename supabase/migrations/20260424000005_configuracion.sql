-- ============================================================
-- LEXIA — MIGRACIÓN 005: CONFIGURACIÓN Y ADMINISTRACIÓN (T06)
--
-- F01 — Catálogos del sistema (reemplaza arrays hardcodeados)
-- F02 — Plantillas de alertas
-- F03 — Personalización empresa (extiende tenants)
-- ============================================================

-- ─── T06-F03: Ampliar tabla tenants ──────────────────────────
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS descripcion  TEXT,
  ADD COLUMN IF NOT EXISTS sitio_web    TEXT,
  ADD COLUMN IF NOT EXISTS industria    TEXT,
  ADD COLUMN IF NOT EXISTS pais         TEXT DEFAULT 'El Salvador',
  ADD COLUMN IF NOT EXISTS color_marca  TEXT DEFAULT '#6366f1';

-- ─── T06-F01: Catálogos del sistema ──────────────────────────
-- Reemplaza arrays hardcodeados (PERMIT_TYPES, REGULATORY_ENTITIES…)
-- con valores por-tenant editables.
--
-- modulo: 'permisos' | 'contratos' | 'global'
-- tipo:   'tipo_permiso' | 'entidad_reguladora' | 'industria' | …
CREATE TABLE IF NOT EXISTS catalogos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  modulo     TEXT        NOT NULL,
  tipo       TEXT        NOT NULL,
  valor      TEXT        NOT NULL,
  etiqueta   TEXT        NOT NULL,
  activo     BOOLEAN     NOT NULL DEFAULT true,
  orden      INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, modulo, tipo, valor)
);

ALTER TABLE catalogos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalogos_select_tenant" ON catalogos
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY "catalogos_insert_tenant" ON catalogos
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY "catalogos_update_tenant" ON catalogos
  FOR UPDATE USING (tenant_id = current_tenant_id());
CREATE POLICY "catalogos_delete_tenant" ON catalogos
  FOR DELETE USING (tenant_id = current_tenant_id());

-- Admin-client (service role) necesita acceso también
CREATE POLICY "catalogos_admin_all" ON catalogos
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_catalogos_tenant_modulo_tipo
  ON catalogos (tenant_id, modulo, tipo)
  WHERE activo = true;

CREATE TRIGGER set_catalogos_updated_at
  BEFORE UPDATE ON catalogos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── T06-F02: Plantillas de alertas ──────────────────────────
-- Define cuándo y cómo se notifica un evento de un módulo.
--
-- evento: 'vencimiento_proximo' | 'cambio_estado' | 'creacion'
-- canal:  'in_app' | 'email'
CREATE TABLE IF NOT EXISTS plantillas_alerta (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre      TEXT        NOT NULL,
  modulo      TEXT        NOT NULL DEFAULT 'permisos',
  evento      TEXT        NOT NULL DEFAULT 'vencimiento_proximo',
  dias_antes  INT,                  -- solo para evento = 'vencimiento_proximo'
  canal       TEXT        NOT NULL DEFAULT 'in_app',
  activo      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plantillas_alerta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plantillas_select_tenant" ON plantillas_alerta
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY "plantillas_insert_tenant" ON plantillas_alerta
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY "plantillas_update_tenant" ON plantillas_alerta
  FOR UPDATE USING (tenant_id = current_tenant_id());
CREATE POLICY "plantillas_delete_tenant" ON plantillas_alerta
  FOR DELETE USING (tenant_id = current_tenant_id());

CREATE POLICY "plantillas_admin_all" ON plantillas_alerta
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_plantillas_tenant_modulo
  ON plantillas_alerta (tenant_id, modulo)
  WHERE activo = true;

CREATE TRIGGER set_plantillas_updated_at
  BEFORE UPDATE ON plantillas_alerta
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Los datos de seed para el tenant demo se insertan en supabase/seeds/seed.sql
-- (que corre después de las migraciones, cuando el tenant demo ya existe)
