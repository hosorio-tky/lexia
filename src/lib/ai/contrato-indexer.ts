/**
 * Indexa el contenido de un contrato para búsqueda vectorial (RAG).
 * Soporta dos fuentes:
 *   - 'html'  → contenido del editor WYSIWYG (contenido_html)
 *   - 'pdf'   → archivo PDF adjunto (storage_path)
 *
 * Se llama de forma fire-and-forget desde las acciones de servidor;
 * nunca bloquea la respuesta al usuario.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { extractTextFromPDF, chunkText } from "./document-processor";
import { generateEmbeddings } from "./embeddings";

const BUCKET      = "documentos";
const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Elimina etiquetas HTML y normaliza espacios */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Guarda chunks con embeddings en contrato_chunks */
async function saveChunks(
  contratoId: string,
  tenantId:   string,
  fuente:     "html" | "pdf",
  chunks:     string[],
  embeddings: number[][]
): Promise<void> {
  const client = createAdminClient();

  // Borrar chunks anteriores de esta fuente para re-indexación limpia
  await client
    .from("contrato_chunks")
    .delete()
    .eq("contrato_id", contratoId)
    .eq("fuente", fuente);

  const rows = chunks.map((contenido, i) => ({
    tenant_id:   tenantId,
    contrato_id: contratoId,
    chunk_index: i,
    contenido,
    fuente,
    embedding:   `[${embeddings[i].join(",")}]`,
  }));

  const { error } = await client.from("contrato_chunks").insert(rows);
  if (error) {
    throw new Error(`contrato_chunks INSERT falló: ${error.message}`);
  }
}

/** Indexa el contenido HTML del editor WYSIWYG */
export async function indexContratoHtml(input: {
  contratoId: string;
  tenantId:   string;
  html:       string;
}): Promise<{ skipped?: string; chunks?: number }> {
  const texto = stripHtml(input.html);

  if (texto.length < 50) {
    return { skipped: `texto HTML insuficiente (${texto.length} chars)` };
  }

  const chunks = chunkText(texto, 600, 100);
  if (chunks.length === 0) {
    return { skipped: "sin chunks tras dividir el HTML" };
  }

  const embeddings = await generateEmbeddings(chunks);
  await saveChunks(input.contratoId, input.tenantId, "html", chunks, embeddings);

  console.log(`[contrato-indexer] html ${input.contratoId}: ${chunks.length} chunks`);
  return { chunks: chunks.length };
}

/** Indexa el PDF adjunto de un contrato desde Supabase Storage */
export async function indexContratoPdf(input: {
  contratoId:  string;
  tenantId:    string;
  storagePath: string;
}): Promise<{ skipped?: string; chunks?: number }> {
  const fileUrl = `${STORAGE_URL}/storage/v1/object/${BUCKET}/${input.storagePath}`;
  const res = await fetch(fileUrl, {
    headers: {
      apikey:        SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Descarga del PDF falló: HTTP ${res.status} — ${input.storagePath}`);
  }

  const buffer = await res.arrayBuffer();
  const texto  = await extractTextFromPDF(buffer);

  if (!texto || texto.trim().length < 50) {
    return { skipped: `texto PDF insuficiente (${texto?.trim().length ?? 0} chars)` };
  }

  const chunks = chunkText(texto, 600, 100);
  if (chunks.length === 0) {
    return { skipped: "sin chunks tras dividir el PDF" };
  }

  const embeddings = await generateEmbeddings(chunks);
  await saveChunks(input.contratoId, input.tenantId, "pdf", chunks, embeddings);

  console.log(`[contrato-indexer] pdf ${input.contratoId}: ${chunks.length} chunks`);
  return { chunks: chunks.length };
}

/**
 * Punto de entrada principal: indexa HTML y/o PDF según lo que tenga el contrato.
 * Se llama desde las acciones de servidor de forma asíncrona (sin await en el caller).
 */
export async function indexContrato(input: {
  contratoId:  string;
  tenantId:    string;
  html?:       string | null;
  storagePath?: string | null;
}): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  if (input.html && input.html.trim().length > 0) {
    tasks.push(
      indexContratoHtml({
        contratoId: input.contratoId,
        tenantId:   input.tenantId,
        html:       input.html,
      }).catch((err) =>
        console.error(`[contrato-indexer] error html ${input.contratoId}:`, err)
      )
    );
  }

  if (input.storagePath) {
    tasks.push(
      indexContratoPdf({
        contratoId:  input.contratoId,
        tenantId:    input.tenantId,
        storagePath: input.storagePath,
      }).catch((err) =>
        console.error(`[contrato-indexer] error pdf ${input.contratoId}:`, err)
      )
    );
  }

  await Promise.all(tasks);
}
