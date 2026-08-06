-- Add HNSW vector index for performant cosine similarity search
CREATE INDEX IF NOT EXISTS idx_lexbase_chunks_embedding
  ON lexbase_chunks USING hnsw (embedding vector_cosine_ops);

-- Recreate with SECURITY DEFINER so RLS is bypassed (server-side RAG calls
-- use service role but RPC functions run as the invoking role by default)
-- and guard against NULL embeddings that would otherwise produce NaN similarity.
CREATE OR REPLACE FUNCTION match_lexbase_chunks(
  p_tenant_id uuid,
  p_embedding vector(1536),
  p_match_count int DEFAULT 6,
  p_threshold float DEFAULT 0.25
)
RETURNS TABLE(contenido text, similarity float, documento_titulo text, documento_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    lc.contenido,
    1 - (lc.embedding <=> p_embedding) AS similarity,
    ld.titulo AS documento_titulo,
    lc.documento_id
  FROM lexbase_chunks lc
  JOIN lexbase_documentos ld ON ld.id = lc.documento_id
  WHERE lc.tenant_id = p_tenant_id
    AND lc.embedding IS NOT NULL
    AND 1 - (lc.embedding <=> p_embedding) > p_threshold
  ORDER BY lc.embedding <=> p_embedding
  LIMIT p_match_count;
$$;
