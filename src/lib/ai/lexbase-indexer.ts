/**
 * Indexa documentos legales en lexbase_chunks.
 * Similar a indexer.ts pero con chunks más grandes (800 chars) y parseo de TOC.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { extractText, chunkText } from "./document-processor";
import { generateEmbeddings } from "./embeddings";
import type { TocEntry } from "@/types/lexbase";

const BUCKET      = "documentos";
const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const INDEXABLE_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
]);

/**
 * Parsea una tabla de contenidos básica del texto usando patrones
 * de documentos legales en español.
 */
export function parseToc(text: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const lines = text.split("\n");
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed) {
      // Chapter/Title patterns: "CAPÍTULO I", "TÍTULO I", "SECCIÓN I", "LIBRO I", "PARTE I"
      const chapterMatch = trimmed.match(
        /^(CAP[ÍI]TULO|T[ÍI]TULO|SECCI[ÓO]N|LIBRO|PARTE)\s+([IVXLCDM]+|\d+)[\.\s\-]*(.*)?$/i
      );
      if (chapterMatch) {
        entries.push({
          num:    `${chapterMatch[1].toUpperCase()} ${chapterMatch[2]}`,
          titulo: chapterMatch[3]?.trim() || `${chapterMatch[1]} ${chapterMatch[2]}`,
          nivel:  1,
          offset,
        });
        offset += line.length + 1;
        continue;
      }

      // Article patterns: "Art. 1.", "Artículo 1.", "ARTÍCULO 1."
      const artMatch = trimmed.match(
        /^Art(?:[íi]culo|\.)\s*(\d+[\w\-]*)[\.\s\-]+(.{0,80})/i
      );
      if (artMatch) {
        entries.push({
          num:    `Art. ${artMatch[1]}`,
          titulo: artMatch[2].trim(),
          nivel:  2,
          offset,
        });
        offset += line.length + 1;
        continue;
      }
    }

    offset += line.length + 1;
  }

  return entries.slice(0, 200);
}

/** Indexa un documento legal en lexbase_chunks y retorna chunks + TOC */
export async function indexLexbaseDocument(input: {
  documentoId: string;
  tenantId:    string;
  storagePath: string;
  mimeType:    string;
}): Promise<{ skipped?: string; chunks?: number; toc?: TocEntry[] }> {
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

  // 3. Parsear TOC
  const toc = parseToc(text);

  // 4. Dividir en chunks más grandes (800 chars) para texto legal
  const chunks = chunkText(text, 800, 150);
  if (chunks.length === 0) {
    return { skipped: "sin chunks tras dividir el texto" };
  }

  // 5. Generar embeddings en batch
  const embeddings = await generateEmbeddings(chunks);

  // 6. Borrar chunks anteriores del mismo documento (re-indexación)
  await client
    .from("lexbase_chunks")
    .delete()
    .eq("documento_id", input.documentoId);

  // 7. Insertar nuevos chunks con embeddings
  const rows = chunks.map((contenido, i) => ({
    tenant_id:    input.tenantId,
    documento_id: input.documentoId,
    chunk_index:  i,
    contenido,
    embedding: `[${embeddings[i].join(",")}]`,
  }));

  const { error } = await client.from("lexbase_chunks").insert(rows);
  if (error) {
    throw new Error(`INSERT lexbase_chunks falló: ${error.message} (code: ${error.code})`);
  }

  // 8. Actualizar documento con indexed_at, total_chunks y toc
  await client
    .from("lexbase_documentos")
    .update({
      indexed_at:   new Date().toISOString(),
      total_chunks: chunks.length,
      toc:          toc.length > 0 ? toc : null,
      updated_at:   new Date().toISOString(),
    })
    .eq("id", input.documentoId);

  console.log(`[lexbase-indexer] ${input.storagePath}: ${chunks.length} chunks, ${toc.length} TOC entries`);
  return { chunks: chunks.length, toc };
}
