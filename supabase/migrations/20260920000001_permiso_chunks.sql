-- ============================================================
-- permiso_chunks — embeddings del documento fuente de un permiso
-- (ej. la resolución/PDF que el usuario carga en el chat de IA),
-- espejo de contrato_chunks, para que el chat pueda responder
-- preguntas futuras sobre ese documento.
-- ============================================================

CREATE TABLE permiso_chunks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  permiso_id   uuid        NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  chunk_index  int         NOT NULL,
  contenido    text        NOT NULL,
  fuente       text        NOT NULL DEFAULT 'pdf',  -- 'pdf' | 'docx'
  embedding    vector(1536),
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX ON permiso_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_permiso_chunks_tenant  ON permiso_chunks(tenant_id);
CREATE INDEX idx_permiso_chunks_permiso ON permiso_chunks(permiso_id);

ALTER TABLE permiso_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permiso_chunks: ver del tenant"
  ON permiso_chunks FOR SELECT
  USING (tenant_id = current_tenant_id());

-- ─── Función: buscar chunks similares de permisos ─────────────
CREATE OR REPLACE FUNCTION match_permiso_chunks(
  p_tenant_id    uuid,
  p_embedding    vector(1536),
  p_match_count  int   DEFAULT 6,
  p_threshold    float DEFAULT 0.10
)
RETURNS TABLE (
  id          uuid,
  permiso_id  uuid,
  chunk_index int,
  contenido   text,
  fuente      text,
  similarity  float
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.permiso_id,
    pc.chunk_index,
    pc.contenido,
    pc.fuente,
    1 - (pc.embedding <=> p_embedding) AS similarity
  FROM permiso_chunks pc
  WHERE pc.tenant_id = p_tenant_id
    AND pc.embedding IS NOT NULL
    AND (p_threshold = 0.0 OR 1 - (pc.embedding <=> p_embedding) > p_threshold)
  ORDER BY pc.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$;
