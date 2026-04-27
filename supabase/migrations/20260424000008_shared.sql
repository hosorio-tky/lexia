-- ============================================================
-- SC-01  Comentarios polimórficos
-- SC-02  Documentos adjuntos (tabla + storage bucket)
-- ============================================================

-- ─── SC-01: comentarios ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS comentarios (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  modulo      TEXT        NOT NULL,          -- 'permisos', 'tareas', etc.
  recurso_id  UUID        NOT NULL,
  user_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  user_nombre TEXT        NOT NULL,
  contenido   TEXT        NOT NULL,
  editado     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comentarios_recurso
  ON comentarios(tenant_id, modulo, recurso_id);

ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado del tenant puede leer
CREATE POLICY "tenant_read_comentarios" ON comentarios
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Insertar: cualquier usuario del tenant
CREATE POLICY "tenant_insert_comentarios" ON comentarios
  FOR INSERT WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Actualizar: solo el autor
CREATE POLICY "owner_update_comentarios" ON comentarios
  FOR UPDATE USING (user_id = auth.uid());

-- Eliminar: autor o admin
CREATE POLICY "owner_delete_comentarios" ON comentarios
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- ─── SC-02: documentos ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  modulo          TEXT        NOT NULL,
  recurso_id      UUID        NOT NULL,
  nombre          TEXT        NOT NULL,
  tipo_mime       TEXT,
  tamano          BIGINT,                    -- bytes
  storage_path    TEXT        NOT NULL,      -- {tenant_id}/{modulo}/{recurso_id}/{uuid}_{nombre}
  subido_por      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  subido_por_nombre TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_recurso
  ON documentos(tenant_id, modulo, recurso_id);

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_documentos" ON documentos
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "tenant_insert_documentos" ON documentos
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "owner_delete_documentos" ON documentos
  FOR DELETE USING (
    subido_por = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- ─── SC-02: Supabase Storage bucket ───────────────────────────
-- Bucket privado; acceso vía signed URLs generadas server-side
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  20971520,   -- 20 MB
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.ms-excel'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage (service_role puede todo; usuarios autenticados con tenant correcto)
CREATE POLICY "storage_tenant_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "storage_tenant_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "storage_tenant_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documentos' AND
    auth.role() = 'authenticated'
  );
