-- Soft delete columns for permisos, contratos, lexbase_documentos

ALTER TABLE permisos
  ADD COLUMN IF NOT EXISTS deleted_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by        UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deleted_by_nombre TEXT;

ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS deleted_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by        UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deleted_by_nombre TEXT;

ALTER TABLE lexbase_documentos
  ADD COLUMN IF NOT EXISTS deleted_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by        UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deleted_by_nombre TEXT;

-- Partial indexes for papelera queries (only deleted rows)
CREATE INDEX IF NOT EXISTS idx_permisos_deleted
  ON permisos (tenant_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contratos_deleted
  ON contratos (tenant_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lexbase_documentos_deleted
  ON lexbase_documentos (tenant_id, deleted_at)
  WHERE deleted_at IS NOT NULL;
