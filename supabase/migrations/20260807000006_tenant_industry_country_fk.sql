-- Add industria_id and pais_id FK columns to tenants
-- Replaces plain text columns with proper FK references to catalogos

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS industria_id uuid REFERENCES catalogos(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS pais_id      uuid REFERENCES catalogos(id) ON DELETE RESTRICT;

-- Migrate existing text values to FK references where a matching catalog entry exists
UPDATE tenants t
SET industria_id = (
  SELECT c.id FROM catalogos c
  WHERE c.tenant_id = t.id
    AND c.tipo = 'industria'
    AND c.valor = t.industria
  LIMIT 1
)
WHERE t.industria IS NOT NULL AND t.industria != '';

UPDATE tenants t
SET pais_id = (
  SELECT c.id FROM catalogos c
  WHERE c.tenant_id = t.id
    AND c.tipo = 'pais'
    AND c.valor = t.pais
  LIMIT 1
)
WHERE t.pais IS NOT NULL AND t.pais != '';

NOTIFY pgrst, 'reload schema';
