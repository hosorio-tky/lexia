/**
 * Extrae metadatos de un documento legal usando GPT-4o-mini.
 * El texto ya viene parseado del PDF/DOCX.
 */

import OpenAI from "openai";
import type { LexbaseTipo } from "@/types/lexbase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface LexbaseExtraido {
  titulo?: string;
  tipo?: LexbaseTipo;
  numero_oficial?: string;
  organo_emisor?: string;
  pais?: string;
  fecha_publicacion?: string;  // YYYY-MM-DD
  fecha_vigencia?: string;     // YYYY-MM-DD
  descripcion?: string;
  tags?: string[];
  tiene_reformas?: boolean;
}

const PAISES_VALIDOS = [
  "El Salvador", "Guatemala", "Honduras", "Nicaragua", "Costa Rica",
  "Panamá", "México", "Colombia", "Argentina", "Chile", "Perú", "España", "Otro",
];

export async function extraerMetadatosLexbase(texto: string): Promise<LexbaseExtraido> {
  // Los primeros 8000 caracteres son suficientes para encabezados y artículos iniciales
  const fragmento = texto.slice(0, 8000);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Eres un asistente jurídico experto en legislación latinoamericana.
Extraes metadatos estructurados de documentos legales (leyes, reglamentos, decretos, resoluciones).
Responde ÚNICAMENTE con un objeto JSON válido siguiendo el esquema indicado.
Si un campo no puede extraerse con certeza, devuelve null para ese campo.`,
      },
      {
        role: "user",
        content: `Analiza el siguiente texto de un documento legal y extrae sus metadatos.

TEXTO DEL DOCUMENTO:
---
${fragmento}
---

Devuelve un JSON con esta estructura exacta (null para campos que no puedas identificar con certeza):
{
  "titulo": "Título completo y oficial del documento tal como aparece en el texto",
  "tipo": "Uno de: Ley, Reglamento, Decreto, Resolución, Norma técnica, Tratado, Otro",
  "numero_oficial": "Número oficial del decreto/ley/resolución. Ej: D.L. 233, D.O. 128",
  "organo_emisor": "Entidad que emite o aprueba el documento. Ej: Asamblea Legislativa, Ministerio de Salud",
  "pais": "País al que pertenece la normativa. Uno de: ${PAISES_VALIDOS.join(", ")}",
  "fecha_publicacion": "Fecha de publicación en formato YYYY-MM-DD o null",
  "fecha_vigencia": "Fecha de entrada en vigencia en formato YYYY-MM-DD o null",
  "descripcion": "Resumen del objeto y alcance del documento en 2-3 oraciones claras",
  "tags": ["array", "de", "3-5", "términos", "jurídicos", "relevantes", "en", "español"],
  "tiene_reformas": false
}`,
      },
    ],
  });

  try {
    const raw = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    return {
      titulo:           raw.titulo           ?? undefined,
      tipo:             raw.tipo             ?? undefined,
      numero_oficial:   raw.numero_oficial   ?? undefined,
      organo_emisor:    raw.organo_emisor    ?? undefined,
      pais:             raw.pais             ?? undefined,
      fecha_publicacion: raw.fecha_publicacion ?? undefined,
      fecha_vigencia:   raw.fecha_vigencia   ?? undefined,
      descripcion:      raw.descripcion      ?? undefined,
      tags:             Array.isArray(raw.tags) ? raw.tags.slice(0, 8) : undefined,
      tiene_reformas:   raw.tiene_reformas   ?? false,
    };
  } catch {
    return {};
  }
}
