/**
 * Indexa un documento: descarga, extrae texto, genera embeddings y guarda chunks.
 * Se llama async desde registrarDocumento — nunca bloquea el upload.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { extractText, chunkText } from "./document-processor";
import { generateEmbeddings } from "./embeddings";

const BUCKET      = "documentos";
const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Tipos MIME que soportamos para indexar */
const INDEXABLE_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
]);

export async function indexDocument(input: {
  documentoId: string;
  tenantId:    string;
  storagePath: string;
  mimeType:    string;
}): Promise<{ skipped?: string; chunks?: number }> {
  if (!INDEXABLE_TYPES.has(input.mimeType)) {
    return { skipped: `mime no soportado: ${input.mimeType}` };
  }

  const client = createAdminClient();

  // 1. Descargar el archivo de Storage
  const fileUrl = `${STORAGE_URL}/storage/v1/object/${BUCKET}/${input.storagePath}`;
  const res = await fetch(fileUrl, {
    headers: {
      apikey:        SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Descarga falló: HTTP ${res.status} para ${input.storagePath}`);
  }

  const buffer = await res.arrayBuffer();

  // 2. Extraer texto
  const text = await extractText(buffer, input.mimeType);
  if (!text || text.trim().length < 50) {
    return { skipped: `texto insuficiente (${text?.trim().length ?? 0} chars)` };
  }

  // 3. Dividir en chunks
  const chunks = chunkText(text, 600, 100);
  if (chunks.length === 0) {
    return { skipped: "sin chunks tras dividir el texto" };
  }

  // 4. Generar embeddings en batch
  const embeddings = await generateEmbeddings(chunks);

  // 5. Borrar chunks anteriores del mismo documento (re-indexación)
  await client
    .from("document_chunks")
    .delete()
    .eq("documento_id", input.documentoId);

  // 6. Insertar nuevos chunks con embeddings
  // pgvector acepta el formato "[n1,n2,...]" como string
  const rows = chunks.map((contenido, i) => ({
    tenant_id:    input.tenantId,
    documento_id: input.documentoId,
    chunk_index:  i,
    contenido,
    embedding:    `[${embeddings[i].join(",")}]`,
  }));

  const { error } = await client.from("document_chunks").insert(rows);
  if (error) {
    throw new Error(`INSERT falló: ${error.message} (code: ${error.code})`);
  }

  console.log(`[indexer] ${input.storagePath}: ${chunks.length} chunks insertados`);
  return { chunks: chunks.length };
}
