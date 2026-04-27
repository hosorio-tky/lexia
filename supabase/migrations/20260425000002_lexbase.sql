-- Categories
CREATE TABLE lexbase_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lexbase_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_lexbase_categorias" ON lexbase_categorias USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Main documents table
CREATE TABLE lexbase_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  titulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'Ley', -- Ley, Código, Reglamento, Política, Resolución, Decreto, Circular, Otro
  categoria_id uuid REFERENCES lexbase_categorias(id) ON DELETE SET NULL,
  descripcion text,
  pais text DEFAULT 'El Salvador',
  numero_oficial text,
  organo_emisor text,
  fecha_publicacion date,
  fecha_vigencia date,
  storage_path text,
  tipo_mime text,
  tiene_reformas boolean DEFAULT false,
  reformas_descripcion text,
  tags text[] DEFAULT '{}',
  toc jsonb, -- parsed table of contents: [{num, titulo, nivel, offset}]
  estado text DEFAULT 'activo', -- activo, archivado
  indexed_at timestamptz,
  total_chunks int DEFAULT 0,
  created_by uuid,
  created_by_nombre text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_lexbase_docs_tenant ON lexbase_documentos(tenant_id);
CREATE INDEX idx_lexbase_docs_tipo ON lexbase_documentos(tenant_id, tipo);
CREATE INDEX idx_lexbase_docs_categoria ON lexbase_documentos(categoria_id);
CREATE INDEX idx_lexbase_docs_fts ON lexbase_documentos USING gin(to_tsvector('spanish', titulo || ' ' || coalesce(descripcion,'') || ' ' || coalesce(numero_oficial,'')));
ALTER TABLE lexbase_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_lexbase_docs" ON lexbase_documentos USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Embeddings chunks (separate from permit document_chunks)
CREATE TABLE lexbase_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  documento_id uuid NOT NULL REFERENCES lexbase_documentos(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  contenido text NOT NULL,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_lexbase_chunks_doc ON lexbase_chunks(documento_id);
ALTER TABLE lexbase_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_lexbase_chunks" ON lexbase_chunks USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Similarity search function for lexbase
CREATE OR REPLACE FUNCTION match_lexbase_chunks(
  p_tenant_id uuid,
  p_embedding vector(1536),
  p_match_count int DEFAULT 6,
  p_threshold float DEFAULT 0.25
)
RETURNS TABLE(contenido text, similarity float, documento_titulo text, documento_id uuid)
LANGUAGE sql STABLE AS $$
  SELECT
    lc.contenido,
    1 - (lc.embedding <=> p_embedding) AS similarity,
    ld.titulo AS documento_titulo,
    lc.documento_id
  FROM lexbase_chunks lc
  JOIN lexbase_documentos ld ON ld.id = lc.documento_id
  WHERE lc.tenant_id = p_tenant_id
    AND 1 - (lc.embedding <=> p_embedding) > p_threshold
  ORDER BY lc.embedding <=> p_embedding
  LIMIT p_match_count;
$$;
