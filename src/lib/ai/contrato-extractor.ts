/**
 * Extrae campos estructurados de un contrato usando GPT-4o-mini.
 * El texto ya viene parseado del PDF/DOCX — este módulo solo hace la inferencia.
 */

import OpenAI from "openai";
import type { ContratoTipo } from "@/types/contratos";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TIPOS_VALIDOS: ContratoTipo[] = [
  "Servicio", "Suministro", "Laboral", "Arrendamiento", "Confidencialidad", "Otro",
];

export interface ContratoExtraido {
  titulo?: string;
  numero?: string;
  tipo?: ContratoTipo;
  descripcion?: string;
  contraparte_nombre?: string;
  contraparte_email?: string;
  valor?: number;
  moneda?: string;
  fecha_inicio?: string;   // YYYY-MM-DD
  fecha_fin?: string;
  fecha_firma?: string;
}

/**
 * Convierte texto plano extraído de un contrato en HTML simple
 * (párrafos separados por doble salto de línea).
 */
export function textoAHtml(texto: string): string {
  return texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

/**
 * Usa GPT-4o-mini para extraer campos del contrato desde el texto plano.
 * Recibe los primeros ~12 000 caracteres (suficiente para la cabecera + cláusulas clave).
 * Devuelve solo los campos que pudo identificar con confianza.
 */
export async function extraerCamposContrato(
  texto: string
): Promise<ContratoExtraido> {
  const fragmento = texto.slice(0, 12000);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Eres un asistente jurídico experto en análisis de contratos.
Extraes información estructurada de documentos contractuales con alta precisión.
Responde ÚNICAMENTE con un objeto JSON válido siguiendo exactamente el esquema indicado.
Si un campo no puede extraerse con certeza del texto, devuelve null para ese campo.`,
      },
      {
        role: "user",
        content: `Analiza el siguiente texto de un contrato y extrae los campos indicados.

TEXTO DEL CONTRATO:
---
${fragmento}
---

Devuelve un JSON con esta estructura exacta (usa null para campos que no puedas identificar):
{
  "titulo": "Título completo del contrato tal como aparece en el documento",
  "numero": "Número o referencia del contrato (ej: CONT-2026-001)",
  "tipo": "Uno de: Servicio, Suministro, Laboral, Arrendamiento, Confidencialidad, Otro",
  "descripcion": "Resumen del objeto o alcance del contrato en 1-3 oraciones",
  "contraparte_nombre": "Nombre completo de la otra parte contratante (no la empresa emisora)",
  "contraparte_email": "Email de contacto de la contraparte si aparece",
  "valor": 0.00,
  "moneda": "Código ISO de moneda (USD, EUR, GTQ, HNL, NIO, CRC, COP, MXN)",
  "fecha_inicio": "YYYY-MM-DD",
  "fecha_fin": "YYYY-MM-DD",
  "fecha_firma": "YYYY-MM-DD"
}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  const result: ContratoExtraido = {};

  if (typeof parsed.titulo === "string" && parsed.titulo)
    result.titulo = parsed.titulo;

  if (typeof parsed.numero === "string" && parsed.numero)
    result.numero = parsed.numero;

  if (typeof parsed.tipo === "string" && TIPOS_VALIDOS.includes(parsed.tipo as ContratoTipo))
    result.tipo = parsed.tipo as ContratoTipo;

  if (typeof parsed.descripcion === "string" && parsed.descripcion)
    result.descripcion = parsed.descripcion;

  if (typeof parsed.contraparte_nombre === "string" && parsed.contraparte_nombre)
    result.contraparte_nombre = parsed.contraparte_nombre;

  if (typeof parsed.contraparte_email === "string" && parsed.contraparte_email)
    result.contraparte_email = parsed.contraparte_email;

  if (typeof parsed.valor === "number" && parsed.valor > 0)
    result.valor = parsed.valor;

  if (typeof parsed.moneda === "string" && parsed.moneda)
    result.moneda = parsed.moneda;

  const toDate = (v: unknown): string | undefined => {
    if (typeof v !== "string" || !v) return undefined;
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
  };

  result.fecha_inicio = toDate(parsed.fecha_inicio);
  result.fecha_fin    = toDate(parsed.fecha_fin);
  result.fecha_firma  = toDate(parsed.fecha_firma);

  // Limpiar undefined
  return Object.fromEntries(
    Object.entries(result).filter(([, v]) => v !== undefined)
  ) as ContratoExtraido;
}
