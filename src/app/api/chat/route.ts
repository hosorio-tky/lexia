import { openai } from "@ai-sdk/openai";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { assembleContext } from "@/lib/ai/rag";
import { logError } from "@/lib/logger";

type CoreMessage = { role: "user" | "assistant" | "system"; content: string };

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function resolveSession() {
  const cookieStore = await cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cs) {
        try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Route Handler */ }
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, nombre, apellido, rol")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    user_id:   user.id,
    tenant_id: profile.tenant_id as string,
    nombre:    [profile.nombre, profile.apellido].filter(Boolean).join(" "),
    rol:       profile.rol as string,
  };
}

// ─── Definición de herramientas del agente ───────────────────────────────────

const agentTools = {
  proponer_permiso: tool({
    description:
      "Propone crear un nuevo permiso con los datos extraídos de la conversación. " +
      "SIEMPRE usa esta herramienta cuando el usuario pida crear, registrar o agregar un permiso o trámite. " +
      "El usuario deberá confirmar antes de que el registro se cree en el sistema.",
    inputSchema: z.object({
      nombre: z.string().describe("Nombre descriptivo del permiso o trámite. Ej: Permiso Ambiental Centro Distribución Bebidas San Salvador"),
      tipo_nombre: z.string().optional().describe("Tipo de permiso según catálogo. Ej: Ambiental, Sanitario, Operativo, Municipal"),
      entidad_reguladora: z.string().optional().describe("Entidad que otorga el permiso. Ej: MARN, MINSAL, Alcaldía Municipal"),
      descripcion: z.string().optional().describe("Descripción breve del permiso y su propósito"),
      fecha_vencimiento: z.string().optional().describe("Fecha estimada de vencimiento en formato YYYY-MM-DD"),
      base_legal: z.string().optional().describe("Normativa o ley aplicable. Ej: Ley del Medio Ambiente Art. 21"),
      riesgo_incumplimiento: z.enum(["bajo", "medio", "alto", "crítico"]).optional().describe("Nivel de riesgo si no se obtiene el permiso"),
    }),
    execute: async (input) => ({ status: "proposed", ...input }),
  }),

  proponer_tareas: tool({
    description:
      "Propone crear un conjunto de tareas para un permiso, basadas en los requerimientos legales identificados. " +
      "SIEMPRE usa esta herramienta cuando el usuario pida crear tareas, pasos o requerimientos para un permiso. " +
      "El usuario deberá confirmar antes de que se creen en el sistema.",
    inputSchema: z.object({
      permiso_id: z.string().optional().describe("ID del permiso al que se vincularán las tareas (si ya fue creado)"),
      permiso_nombre: z.string().describe("Nombre del permiso o trámite al que pertenecen estas tareas"),
      tareas: z.array(z.object({
        titulo: z.string().describe("Título corto y accionable de la tarea"),
        descripcion: z.string().optional().describe("Detalle de qué implica esta tarea"),
        prioridad: z.enum(["baja", "media", "alta", "urgente"]).describe("Prioridad de la tarea"),
        fecha_limite: z.string().optional().describe("Fecha límite sugerida YYYY-MM-DD"),
      })).describe("Lista de tareas a crear"),
    }),
    execute: async (input) => ({ status: "proposed", ...input }),
  }),
};

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await resolveSession();
    if (!session) {
      return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
    }

    const body = await req.json() as { messages: { role: string; content: string }[] };
    const incoming = body.messages ?? [];

    const lastUser = [...incoming].reverse().find((m) => m.role === "user");
    const query = lastUser?.content ?? "";

    const { documentContext, structuredContext } = await assembleContext(
      session.tenant_id,
      query
    );

    const systemPrompt = `Eres Lexia AI, el asistente de cumplimiento legal de la plataforma Lexia.
Ayudas a los equipos legales y de cumplimiento a gestionar permisos, contratos y obligaciones regulatorias.

Usuario actual: ${session.nombre} (rol: ${session.rol})
Fecha de hoy: ${new Date().toLocaleDateString("es-SV", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

## Instrucciones
- Responde siempre en español, de forma clara y concisa.
- Los datos bajo "Datos actuales del sistema" SON la base de datos real y completa del tenant. Úsalos como fuente de verdad.
- NUNCA digas que "solo tienes acceso a lo mencionado en la conversación" — tienes acceso COMPLETO al sistema a través del contexto estructurado.
- NUNCA digas que "no tienes acceso" a un documento si sus fragmentos aparecen en el contexto.
- Si el usuario pide un listado o resumen, incluye TODOS los registros que aparecen en el contexto estructurado, no solo los que se mencionaron antes en la conversación.
- Si la información no está en el contexto, dilo claramente en lugar de inventar.
- Para fechas y plazos, sé específico y menciona los días restantes.
- Puedes usar Markdown para estructurar tus respuestas (listas, negritas, tablas).

## Capacidades de acción
Puedes proponer crear registros en el sistema. Cuando el usuario lo solicite:
- Para crear un permiso: usa la herramienta \`proponer_permiso\` con los datos que puedas inferir.
- Para crear tareas de un permiso: usa la herramienta \`proponer_tareas\` con los pasos requeridos.
Después de llamar la herramienta, confirma al usuario que has propuesto la acción y que puede revisar y confirmar en la tarjeta que aparece.

${structuredContext ? `## Datos actuales del sistema\n${structuredContext}` : ""}

${documentContext ? `## Fragmentos de documentos indexados (usa esta información para responder)\n${documentContext}` : ""}
`.trim();

    const coreMessages: CoreMessage[] = incoming
      .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim() !== "")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: coreMessages,
      tools: agentTools,
      stopWhen: stepCountIs(3),
      maxOutputTokens: 1024,
      temperature: 0.3,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const emit = (obj: Record<string, unknown>) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

        try {
          for await (const chunk of result.fullStream) {
            if (chunk.type === "text-delta") {
              emit({ type: "text-delta", textDelta: chunk.text });
            } else if (chunk.type === "tool-call") {
              emit({
                type:     "tool-call",
                toolName: chunk.toolName,
                toolArgs: chunk.input,
              });
            }
          }
          emit({ type: "done" });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          emit({ type: "error", error: msg });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
      },
    });
  } catch (err) {
    console.error("[/api/chat] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, { path: "/api/chat", action: "POST" });
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
