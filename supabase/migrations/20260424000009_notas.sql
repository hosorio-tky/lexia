-- ============================================================
-- SC-02 v2  Notas con documentos adjuntos
-- Reemplaza el upload suelto de documentos por notas con contexto
-- ============================================================

-- ─── Tabla notas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notas (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  modulo       TEXT        NOT NULL,   -- 'permisos', 'tareas', etc.
  recurso_id   UUID        NOT NULL,
  contenido    TEXT        NOT NULL,   -- HTML de Tiptap
  user_id      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  user_nombre  TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notas_recurso
  ON notas(tenant_id, modulo, recurso_id);

ALTER TABLE notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_notas" ON notas
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "tenant_insert_notas" ON notas
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "owner_update_notas" ON notas
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "owner_delete_notas" ON notas
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- ─── FK nota_id en documentos ─────────────────────────────────
-- Los documentos pueden pertenecer a una nota (opcional)
ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS nota_id UUID REFERENCES notas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_nota
  ON documentos(nota_id) WHERE nota_id IS NOT NULL;
