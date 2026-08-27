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
  // pdfjs-dist legacy intenta polyfill de DOMMatrix vía @napi-rs/canvas, que no existe en Vercel.
  // Instalamos stubs mínimos antes de importar el módulo (solo extracción de texto, no rendering).
  const g = globalThis as Record<string, unknown>;
  if (typeof g.DOMMatrix === "undefined") {
    g.DOMMatrix = class DOMMatrix {
      a=1; b=0; c=0; d=1; e=0; f=0;
      m11=1; m12=0; m13=0; m14=0;
      m21=0; m22=1; m23=0; m24=0;
      m31=0; m32=0; m33=1; m34=0;
      m41=0; m42=0; m43=0; m44=1;
      is2D=true; isIdentity=true;
      constructor(_init?: string | number[]) {}
      multiply() { return this; }
      translate() { return this; }
      scale() { return this; }
      rotate() { return this; }
      rotateAxisAngle() { return this; }
      skewX() { return this; }
      skewY() { return this; }
      flipX() { return this; }
      flipY() { return this; }
      inverse() { return this; }
      transformPoint(p?: {x?:number;y?:number;z?:number;w?:number}) { return {x:p?.x??0,y:p?.y??0,z:p?.z??0,w:p?.w??1}; }
      toFloat32Array() { return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); }
      toFloat64Array() { return new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); }
      toString() { return "matrix(1, 0, 0, 1, 0, 0)"; }
    };
  }
  if (typeof g.Path2D === "undefined") {
    g.Path2D = class Path2D {
      constructor(_path?: string | Path2D) {}
      addPath() {}
      closePath() {}
      moveTo() {}
      lineTo() {}
      rect() {}
      arc() {}
    };
  }

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
