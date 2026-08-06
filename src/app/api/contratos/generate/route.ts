import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createContratoPlantillasRepository } from "@/lib/repositories/contrato-plantillas";
import type { ContratoTipo } from "@/types/contratos";

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GenerateRequest {
  plantilla_id: string;
  variables:    Record<string, string>;
}

interface GenerateResponse {
  contenido_html: string;
  fields: {
    titulo?:             string;
    tipo?:               ContratoTipo;
    contraparte_nombre?: string;
    contraparte_email?:  string;
    valor?:              number;
    moneda?:             string;
    fecha_inicio?:       string;
    fecha_fin?:          string;
    fecha_firma?:        string;
  };
}

const TIPOS_VALIDOS: ContratoTipo[] = [
  "Servicio", "Suministro", "Laboral", "Arrendamiento", "Confidencialidad", "Otro",
];

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body    = await req.json() as GenerateRequest;

    if (!body.plantilla_id) {
      return NextResponse.json({ error: "plantilla_id requerido" }, { status: 400 });
    }

    const repo      = createContratoPlantillasRepository(createAdminClient(), session.tenant_id);
    const plantilla = await repo.getById(body.plantilla_id);

    if (!plantilla) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }

    const variablesJson = JSON.stringify(body.variables ?? {}, null, 2);

    const response = await openai.chat.completions.create({
      model:           "gpt-4o",
      temperature:     0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role:    "system",
          content: `Eres un abogado experto en redacción de contratos bajo la legislación salvadoreña.
Tu tarea es completar plantillas de contratos en HTML reemplazando variables {{NOMBRE}} con los valores proporcionados.
Reglas:
- Mantén todo el HTML de la plantilla intacto, solo reemplaza las variables
- Formatea fechas en español: "1 de agosto de 2026" en lugar de "2026-08-01"
- Escribe montos también con letras cuando aplique: "VEINTICUATRO MIL QUINIENTOS (USD 24,500.00)"
- Ajusta la concordancia gramatical donde sea necesario
- Si falta algún valor para una variable, déjala como {{VARIABLE}} sin cambios
Responde con un JSON válido.`,
        },
        {
          role: "user",
          content: `Completa la siguiente plantilla de contrato con los valores proporcionados.

VALORES DE LAS VARIABLES:
${variablesJson}

PLANTILLA HTML:
---
${plantilla.contenido_html}
---

Devuelve un JSON con:
{
  "contenido_html": "...HTML completo con variables reemplazadas...",
  "fields": {
    "titulo": "título descriptivo del contrato generado",
    "tipo": "uno de: Servicio, Suministro, Laboral, Arrendamiento, Confidencialidad, Otro",
    "contraparte_nombre": "nombre de la contraparte si está en las variables",
    "contraparte_email": "email de la contraparte si está disponible",
    "valor": 0,
    "moneda": "USD",
    "fecha_inicio": "YYYY-MM-DD",
    "fecha_fin": "YYYY-MM-DD",
    "fecha_firma": "YYYY-MM-DD"
  }
}
Para campos que no puedas inferir, usa null.`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let parsed: Partial<GenerateResponse>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Error al procesar la respuesta de la IA" }, { status: 500 });
    }

    // Validate + clean fields
    const f = parsed.fields ?? {};
    const fields: GenerateResponse["fields"] = {};

    if (typeof f.titulo           === "string" && f.titulo)           fields.titulo           = f.titulo;
    if (typeof f.tipo             === "string" && TIPOS_VALIDOS.includes(f.tipo as ContratoTipo))
                                                                       fields.tipo             = f.tipo as ContratoTipo;
    if (typeof f.contraparte_nombre === "string" && f.contraparte_nombre) fields.contraparte_nombre = f.contraparte_nombre;
    if (typeof f.contraparte_email  === "string" && f.contraparte_email)  fields.contraparte_email  = f.contraparte_email;
    if (typeof f.valor            === "number"  && f.valor > 0)        fields.valor            = f.valor;
    if (typeof f.moneda           === "string"  && f.moneda)           fields.moneda           = f.moneda;

    const toDate = (v: unknown) =>
      typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;

    const fi = toDate(f.fecha_inicio); if (fi) fields.fecha_inicio = fi;
    const ff = toDate(f.fecha_fin);    if (ff) fields.fecha_fin    = ff;
    const fm = toDate(f.fecha_firma);  if (fm) fields.fecha_firma  = fm;

    // Fall back to plantilla tipo if AI didn't return one
    if (!fields.tipo && plantilla.tipo) fields.tipo = plantilla.tipo;

    return NextResponse.json({
      contenido_html: parsed.contenido_html ?? plantilla.contenido_html,
      fields,
    } satisfies GenerateResponse);
  } catch (err) {
    console.error("[contratos/generate]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
