/**
 * Extrae texto de un documento (PDF/DOCX) para el chat de IA, con fallback
 * a visión cuando el PDF resulta ser escaneado (imágenes) en vez de tener
 * una capa de texto real — que es el caso típico de resoluciones/permisos
 * oficiales escaneados (sellos, firmas manuscritas).
 *
 * El texto resultante se reutiliza tanto para que la IA proponga el permiso
 * (proponer_permiso/proponer_tareas) como para indexarlo en permiso_chunks
 * — un solo esfuerzo de extracción, dos usos.
 */
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getDocumentProxy, renderPageAsImage } from "unpdf";
import { extractTextFromPDF, extractTextFromDOCX } from "./document-processor";

// Límite de páginas procesadas con visión — cubre la portada/resolución de
// un documento típico (donde vive la metadata) sin disparar costo/latencia
// en anexos técnicos largos (estudios de impacto ambiental, etc. de 40+ págs).
const MAX_PAGINAS_VISION  = 12;
// Debajo de este promedio de caracteres por página, se asume que el PDF es
// escaneado (imagen) y no tiene una capa de texto real aprovechable.
const MIN_CHARS_POR_PAGINA = 80;

export interface ExtraccionResultado {
  texto:                    string;
  metodo:                   "texto" | "vision" | "mixto";
  paginasProcesadasVision:  number;
  paginasTotales?:          number;
}

/** Extrae texto de un DOCX/DOC — no necesita visión, ya es texto real. */
async function extraerDocx(buffer: ArrayBuffer): Promise<ExtraccionResultado> {
  const texto = await extractTextFromDOCX(buffer);
  return { texto, metodo: "texto", paginasProcesadasVision: 0 };
}

/**
 * Detecta respuestas tipo "no puedo ayudar con eso" — se observó en pruebas
 * reales que el modelo a veces rechaza páginas cuyo render quedó con
 * artefactos (ej. sellos comprimidos en JBIG2, que pdfjs-dist no decodifica
 * del todo). Sin este chequeo, ese texto de rechazo se colaría como si fuera
 * contenido real del documento.
 */
function pareceRechazo(texto: string): boolean {
  const t = texto.trim().toLowerCase();
  if (t.length < 30) return true;
  return /^(lo siento|disculpa|no puedo (ayudar|transcribir|procesar|asistir|ver)|no puedo ver|i'?m sorry|i can'?t help)/.test(t);
}

const PROMPT_TRANSCRIPCION =
  "Eres un asistente de digitalización de expedientes para un despacho legal. Transcribe TODO el " +
  "texto legible de esta página escaneada de un documento oficial (resolución, permiso, contrato). " +
  "Es un documento de la propia organización, archivado para su gestión de cumplimiento — no contiene " +
  "información sobre terceros ajena al expediente. Incluye números de resolución/expediente, fechas, " +
  "montos, nombres de personas y empresas mencionados en el cuerpo del documento, artículos de ley " +
  "citados, y cualquier tabla como texto plano (fila por fila). Es una transcripción literal, no un " +
  'resumen. Si la página está en blanco, escribe "[página en blanco]".';

const PROMPT_TRANSCRIPCION_ALT =
  "Esta es una imagen de una página escaneada de un archivo administrativo. Describe y transcribe " +
  "el texto impreso que puedas leer con claridad (títulos, párrafos, fechas, cifras, tablas). Ignora " +
  "sellos, firmas o anotaciones manuscritas poco legibles — solo transcribe el texto impreso legible.";

/** Transcribe una sola página con reintento (prompt alterno) si la primera respuesta parece un rechazo. */
async function transcribirPagina(dataUrl: string): Promise<string> {
  for (const prompt of [PROMPT_TRANSCRIPCION, PROMPT_TRANSCRIPCION_ALT]) {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", image: dataUrl },
          ],
        },
      ],
      maxOutputTokens: 1500,
    });
    if (!pareceRechazo(text)) return text;
  }
  return "[No se pudo leer esta página automáticamente — revísala manualmente]";
}

/** Transcribe con visión las páginas de un PDF que resultaron ser imágenes. */
async function transcribirConVision(
  pdf: Awaited<ReturnType<typeof getDocumentProxy>>,
  totalPaginas: number
): Promise<{ texto: string; paginasProcesadas: number }> {
  const paginasAProcesar = Math.min(totalPaginas, MAX_PAGINAS_VISION);
  const partes: string[] = [];

  for (let i = 1; i <= paginasAProcesar; i++) {
    const dataUrl = await renderPageAsImage(pdf, i, {
      canvasImport: () => import("@napi-rs/canvas"),
      scale: 1.5,
      toDataURL: true,
    });
    const texto = await transcribirPagina(dataUrl);
    partes.push(`[Página ${i}]\n${texto}`);
  }

  return { texto: partes.join("\n\n"), paginasProcesadas: paginasAProcesar };
}

/**
 * Punto de entrada: extrae el texto de un archivo (PDF o DOCX), usando
 * visión automáticamente si el PDF resulta ser escaneado.
 */
export async function extraerTextoDocumento(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<ExtraccionResultado> {
  const esDocx = mimeType.includes("wordprocessingml") || mimeType === "application/msword";
  if (esDocx) return extraerDocx(buffer);

  // extractTextFromPDF (unpdf → pdfjs-dist) puede dejar el ArrayBuffer
  // "detached" tras usarlo — se le pasa una copia para no inutilizar el
  // buffer original que getDocumentProxy necesita justo después.
  const textoPlano = await extractTextFromPDF(buffer.slice(0));
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const totalPaginas = pdf.numPages;

  const promedioCharsPorPagina = totalPaginas > 0 ? textoPlano.trim().length / totalPaginas : 0;

  if (promedioCharsPorPagina >= MIN_CHARS_POR_PAGINA) {
    return { texto: textoPlano, metodo: "texto", paginasProcesadasVision: 0, paginasTotales: totalPaginas };
  }

  const { texto: textoVision, paginasProcesadas } = await transcribirConVision(pdf, totalPaginas);

  const notaTruncado = totalPaginas > paginasProcesadas
    ? `\n\n[Nota para la IA: este documento tiene ${totalPaginas} páginas; solo se procesaron con visión las primeras ${paginasProcesadas} por costo/tiempo. Si el usuario necesita datos de páginas posteriores, dile explícitamente que no las revisaste y pídele que las describa o las adjunte por separado.]`
    : "";

  return {
    texto:                   textoVision + notaTruncado,
    metodo:                  textoPlano.trim().length > 200 ? "mixto" : "vision",
    paginasProcesadasVision: paginasProcesadas,
    paginasTotales:          totalPaginas,
  };
}
