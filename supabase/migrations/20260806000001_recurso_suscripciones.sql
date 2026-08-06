-- ============================================================
-- Suscripciones a alertas por recurso
-- Permite que usuarios se suscriban a alertas de vencimiento
-- de permisos y contratos específicos, independientemente
-- de su nivel de acceso.
-- ============================================================

CREATE TABLE recurso_suscripciones (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_type text        NOT NULL CHECK (resource_type IN ('permiso', 'contrato')),
  resource_id   uuid        NOT NULL,
  user_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  suscrito_por  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource_type, resource_id, user_id)
);

CREATE INDEX idx_suscripciones_resource
  ON recurso_suscripciones (tenant_id, resource_type, resource_id);

CREATE INDEX idx_suscripciones_user
  ON recurso_suscripciones (user_id);

-- RLS: cada usuario solo ve las suscripciones del recurso al que tiene acceso
ALTER TABLE recurso_suscripciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON recurso_suscripciones
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
