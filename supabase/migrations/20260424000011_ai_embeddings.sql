-- ============================================================
-- LEXIA — MIGRACIÓN 011: AI / EMBEDDINGS (pgvector)
-- ============================================================

-- Activar extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Tabla de chunks de documentos ───────────────────────────
CREATE TABLE document_chunks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  documento_id uuid        NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  chunk_index  int         NOT NULL,
  contenido    text        NOT NULL,
  embedding    vector(1536),
  created_at   timestamptz DEFAULT now()
);

-- Índice HNSW para búsqueda por similitud coseno (rápido incluso con millones de filas)
CREATE INDEX ON document_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_chunks_tenant    ON document_chunks(tenant_id);
CREATE INDEX idx_chunks_documento ON document_chunks(documento_id);

-- RLS
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chunks: ver del tenant"
  ON document_chunks FOR SELECT
  USING (tenant_id = current_tenant_id());

-- ─── Función: buscar chunks similares ────────────────────────
CREATE OR REPLACE FUNCTION match_document_chunks(
  p_tenant_id    uuid,
  p_embedding    vector(1536),
  p_match_count  int  DEFAULT 8,
  p_threshold    float DEFAULT 0.3
)
RETURNS TABLE (
  id           uuid,
  documento_id uuid,
  chunk_index  int,
  contenido    text,
  similarity   float
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.documento_id,
    dc.chunk_index,
    dc.contenido,
    1 - (dc.embedding <=> p_embedding) AS similarity
  FROM document_chunks dc
  WHERE dc.tenant_id = p_tenant_id
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> p_embedding) > p_threshold
  ORDER BY dc.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$;
