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

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length <= targetSize) {
      current = current ? current + "\n\n" + para : para;
    } else {
      if (current.length > 0) {
        chunks.push(current.trim());
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
            if (current) chunks.push(current.trim());
            current = sent;
          }
        }
      }
    }
  }

  if (current.trim().length > 0) chunks.push(current.trim());

  return chunks.filter((c) => c.length > 30); // descartar fragmentos muy cortos
}

/** Extrae texto de un PDF (buffer) — usa pdfjs-dist (maneja formatos modernos que pdf-parse no soporta) */
export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // En Node.js/Vercel serverless no hay Web Workers — ejecutar en el hilo principal
  pdfjs.GlobalWorkerOptions.workerSrc = "";

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
  });

  const pdf = await loadingTask.promise;
  const parts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = (content.items as Array<{ str?: string }>)
      .filter((item) => typeof item.str === "string")
      .map((item) => item.str as string)
      .join(" ");
    if (text.trim()) parts.push(text.trim());
  }

  return parts.join("\n\n");
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
