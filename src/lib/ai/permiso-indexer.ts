/**
 * Indexa el documento fuente de un permiso (ej. la resolución PDF cargada
 * en el chat de IA) para búsqueda vectorial (RAG) — espejo de
 * contrato-indexer.ts. Se llama fire-and-forget desde las acciones de
 * servidor; nunca bloquea la respuesta al usuario.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { extractTextFromPDF, extractTextFromDOCX, chunkText } from "./document-processor";

const BUCKET      = "documentos";
const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Guarda chunks con embeddings en permiso_chunks */
async function saveChunks(
  permisoId:  string,
  tenantId:   string,
  fuente:     "pdf" | "docx",
  chunks:     string[],
  embeddings: number[][]
): Promise<void> {
  const client = createAdminClient();

  await client
    .from("permiso_chunks")
    .delete()
    .eq("permiso_id", permisoId)
    .eq("fuente", fuente);

  const rows = chunks.map((contenido, i) => ({
    tenant_id:   tenantId,
    permiso_id:  permisoId,
    chunk_index: i,
    contenido,
    fuente,
    embedding:   `[${embeddings[i].join(",")}]`,
  }));

  const { error } = await client.from("permiso_chunks").insert(rows);
  if (error) {
    throw new Error(`permiso_chunks INSERT falló: ${error.message}`);
  }
}

async function descargarStorage(storagePath: string): Promise<ArrayBuffer> {
  const fileUrl = `${STORAGE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;
  const res = await fetch(fileUrl, {
    headers: {
      apikey:        SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Descarga del archivo falló: HTTP ${res.status} — ${storagePath}`);
  }
  return res.arrayBuffer();
}

/**
 * Indexa el documento fuente de un permiso.
 *
 * Si `texto` viene incluido (ej. ya se extrajo con visión/OCR al momento de
 * procesar el archivo en el chat), se reutiliza tal cual — evita repetir la
 * extracción/OCR. Si no, se extrae desde `storagePath` con el extractor de
 * texto plano (sin OCR — solo sirve si el PDF tiene capa de texto real).
 */
export async function indexPermisoDocumento(input: {
  permisoId:   string;
  tenantId:    string;
  storagePath: string;
  mimeType?:   string | null;
  texto?:      string;
}): Promise<{ skipped?: string; chunks?: number }> {
  const esDocx = input.mimeType?.includes("wordprocessingml") || input.mimeType === "application/msword";
  const fuente: "pdf" | "docx" = esDocx ? "docx" : "pdf";

  let texto = input.texto;
  if (!texto) {
    const buffer = await descargarStorage(input.storagePath);
    texto = esDocx ? await extractTextFromDOCX(buffer) : await extractTextFromPDF(buffer);
  }

  if (!texto || texto.trim().length < 50) {
    return { skipped: `texto insuficiente (${texto?.trim().length ?? 0} chars)` };
  }

  const chunks = chunkText(texto, 600, 100);
  if (chunks.length === 0) {
    return { skipped: "sin chunks tras dividir el documento" };
  }

  const { generateEmbeddings } = await import("./embeddings");
  const embeddings = await generateEmbeddings(chunks);
  await saveChunks(input.permisoId, input.tenantId, fuente, chunks, embeddings);

  console.log(`[permiso-indexer] ${fuente} ${input.permisoId}: ${chunks.length} chunks`);
  return { chunks: chunks.length };
}
