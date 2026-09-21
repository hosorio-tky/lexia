/**
 * Extrae texto de PDF y DOCX, luego lo divide en chunks con overlap.
 * Corre solo en el servidor (Node.js).
 */

/** Divide texto en chunks de ~targetSize caracteres con overlap */
export function chunkText(
  text: string,
  targetSize = 600,
  overlap = 100
): string[] {
  const chunks: string[] = [];
  // Dividir por párrafos primero para no cortar a mitad de frase
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  let current = "";

  // Red de seguridad: el fallback de división por oraciones (abajo) usa una
  // regex que exige puntuación (.!?). Texto sin ningún punto/exclamación/
  // interrogación (ej. índices de referencias de página tipo "103-104\n104-
  // 121\n..." en resoluciones del Diario Oficial) no matchea nada, y sin
  // esto el párrafo completo se colaba como un solo chunk sin límite de
  // tamaño — se vieron chunks de más de 900,000 caracteres en producción.
  // pushChunk garantiza que ningún chunk salga nunca más grande de lo
  // esperado, sin importar cómo se haya generado.
  const pushChunk = (piece: string) => {
    if (piece.length <= targetSize * 1.5) {
      chunks.push(piece.trim());
      return;
    }
    for (let i = 0; i < piece.length; i += targetSize - overlap) {
      const slice = piece.slice(i, i + targetSize).trim();
      if (slice.length > 0) chunks.push(slice);
    }
  };

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length <= targetSize) {
      current = current ? current + "\n\n" + para : para;
    } else {
      if (current.length > 0) {
        pushChunk(current);
        // Overlap: conservar los últimos `overlap` caracteres del chunk anterior
        const tail = current.slice(-overlap);
        current = tail + "\n\n" + para;
      } else {
        // Párrafo más largo que targetSize: dividir por oraciones
        const sentences = para.match(/[^.!?]+[.!?]+/g) ?? [para];
        for (const sent of sentences) {
          if ((current + " " + sent).length <= targetSize) {
            current = current ? current + " " + sent : sent;
          } else {
            if (current) pushChunk(current);
            current = sent;
          }
        }
      }
    }
  }

  if (current.trim().length > 0) pushChunk(current);

  return chunks.filter((c) => c.length > 30); // descartar fragmentos muy cortos
}

/** Extrae texto de un PDF (buffer) — usa unpdf, wrapper serverless de pdfjs-dist */
export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  const { extractText } = await import("unpdf");
  const { totalPages, text } = await extractText(new Uint8Array(buffer), { mergePages: true });
  void totalPages;
  return text ?? "";
}

/** Extrae texto de un DOCX (buffer) */
export async function extractTextFromDOCX(buffer: ArrayBuffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result.value ?? "";
}

/** Extrae texto de un archivo según su MIME type — propaga errores */
export async function extractText(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<string | null> {
  if (mimeType === "application/pdf") {
    return await extractTextFromPDF(buffer);
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return await extractTextFromDOCX(buffer);
  }
  if (mimeType === "text/plain") {
    return new TextDecoder().decode(buffer);
  }
  return null; // tipo no soportado
}
