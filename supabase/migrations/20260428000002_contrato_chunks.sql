-- ============================================================
-- LEXIA — MIGRACIÓN: contrato_chunks (AI embeddings)
-- Almacena chunks vectorizados del contenido de contratos
-- (HTML del editor WYSIWYG + texto extraído de PDFs adjuntos)
-- ============================================================

-- ─── Tabla de chunks ─────────────────────────────────────────
CREATE TABLE contrato_chunks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contrato_id  uuid        NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  chunk_index  int         NOT NULL,
  contenido    text        NOT NULL,
  fuente       text        NOT NULL DEFAULT 'html',  -- 'html' | 'pdf'
  embedding    vector(1536),
  created_at   timestamptz DEFAULT now()
);

-- Índice HNSW para búsqueda por similitud coseno
CREATE INDEX ON contrato_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_contrato_chunks_tenant   ON contrato_chunks(tenant_id);
CREATE INDEX idx_contrato_chunks_contrato ON contrato_chunks(contrato_id);

-- RLS
ALTER TABLE contrato_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contrato_chunks: ver del tenant"
  ON contrato_chunks FOR SELECT
  USING (tenant_id = current_tenant_id());

-- ─── Función: buscar chunks similares de contratos ────────────
CREATE OR REPLACE FUNCTION match_contrato_chunks(
  p_tenant_id    uuid,
  p_embedding    vector(1536),
  p_match_count  int   DEFAULT 6,
  p_threshold    float DEFAULT 0.10
)
RETURNS TABLE (
  id          uuid,
  contrato_id uuid,
  chunk_index int,
  contenido   text,
  fuente      text,
  similarity  float
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.contrato_id,
    cc.chunk_index,
    cc.contenido,
    cc.fuente,
    1 - (cc.embedding <=> p_embedding) AS similarity
  FROM contrato_chunks cc
  WHERE cc.tenant_id = p_tenant_id
    AND cc.embedding IS NOT NULL
    AND (p_threshold = 0.0 OR 1 - (cc.embedding <=> p_embedding) > p_threshold)
  ORDER BY cc.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$;
