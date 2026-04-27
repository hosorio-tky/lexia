-- ============================================================
-- Responsables y Ubicaciones como catálogos configurables
-- + Nuevos campos en permisos
-- ============================================================

-- ─── Tabla responsables ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS responsables (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre       TEXT        NOT NULL,
  area         TEXT,
  email        TEXT,
  activo       BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_responsables_tenant
  ON responsables(tenant_id) WHERE activo = true;

ALTER TABLE responsables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_responsables" ON responsables
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "admin_insert_responsables" ON responsables
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "admin_update_responsables" ON responsables
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "admin_delete_responsables" ON responsables
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- ─── Tabla ubicaciones ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ubicaciones (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre       TEXT        NOT NULL,
  direccion    TEXT,
  ciudad       TEXT,
  departamento TEXT,
  activo       BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ubicaciones_tenant
  ON ubicaciones(tenant_id) WHERE activo = true;

ALTER TABLE ubicaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_ubicaciones" ON ubicaciones
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "admin_insert_ubicaciones" ON ubicaciones
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "admin_update_ubicaciones" ON ubicaciones
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "admin_delete_ubicaciones" ON ubicaciones
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- ─── Nuevos campos en permisos ────────────────────────────────
ALTER TABLE permisos
  ADD COLUMN IF NOT EXISTS responsable_id          UUID    REFERENCES responsables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ubicacion_id            UUID    REFERENCES ubicaciones(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valor_tramite           NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS moneda                  TEXT    DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS base_legal              TEXT,
  ADD COLUMN IF NOT EXISTS riesgo_incumplimiento   TEXT,
  ADD COLUMN IF NOT EXISTS base_legal_incumplimiento TEXT;
