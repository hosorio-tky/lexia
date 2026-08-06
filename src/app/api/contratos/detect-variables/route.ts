import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface VariableDetectada {
  key:       string;   // nombre de la variable, ej: "CONTRAPARTE"
  label:     string;   // etiqueta legible, ej: "Nombre de la contraparte"
  type:      "text" | "number" | "date" | "textarea";
  required:  boolean;
  unclear:   boolean;  // true si la IA no pudo inferir el propósito
  question?: string;   // pregunta sugerida si unclear=true
}

export async function POST(req: NextRequest) {
  try {
    const { contenido_html } = await req.json() as { contenido_html?: string };

    if (!contenido_html?.trim()) {
      return NextResponse.json({ variables: [] });
    }

    // Strip HTML tags to get plain text for analysis
    const textoPlano = contenido_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    // Extract all {{VARIABLE}} occurrences from raw HTML
    const matches = [...new Set(
      [...contenido_html.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((m) => m[1])
    )];

    if (matches.length === 0) {
      return NextResponse.json({ variables: [] });
    }

    const response = await openai.chat.completions.create({
      model:           "gpt-4o-mini",
      temperature:     0,
      response_format: { type: "json_object" },
      messages: [
        {
          role:    "system",
          content: `Eres un asistente jurídico experto en análisis de contratos en español (El Salvador).
Analiza plantillas de contratos e identifica el propósito de cada variable.
Responde ÚNICAMENTE con un JSON válido.`,
        },
        {
          role: "user",
          content: `Analiza esta plantilla de contrato e identifica el propósito de cada variable marcada con {{NOMBRE}}.

VARIABLES DETECTADAS: ${matches.join(", ")}

FRAGMENTO DE LA PLANTILLA:
---
${textoPlano.slice(0, 6000)}
---

Para cada variable devuelve un objeto con:
- key: nombre exacto de la variable (tal como aparece)
- label: etiqueta legible en español para mostrar al usuario (ej: "Nombre de la contraparte")
- type: tipo de campo - "text" para texto corto, "textarea" para texto largo, "number" para montos/números, "date" para fechas
- required: true si es información esencial para el contrato, false si es opcional
- unclear: true si no puedes inferir el propósito de la variable con certeza
- question: solo si unclear=true, una pregunta corta para hacerle al usuario (ej: "¿Qué representa la variable PLAZO_GARANTIA?")

Devuelve: { "variables": [ ...array de objetos... ] }`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let parsed: { variables?: VariableDetectada[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ variables: [] });
    }

    // Ensure all detected keys are present (AI might miss some)
    const returned = new Set((parsed.variables ?? []).map((v) => v.key));
    for (const key of matches) {
      if (!returned.has(key)) {
        (parsed.variables ?? (parsed.variables = [])).push({
          key,
          label:    key.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
          type:     "text",
          required: true,
          unclear:  true,
          question: `¿Qué información representa la variable ${key}?`,
        });
      }
    }

    return NextResponse.json({ variables: parsed.variables ?? [] });
  } catch (err) {
    console.error("[detect-variables]", err);
    return NextResponse.json({ error: "Error al analizar la plantilla" }, { status: 500 });
  }
}
