import { openai } from "@ai-sdk/openai";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { assembleContext } from "@/lib/ai/rag";
import { logError } from "@/lib/logger";

// Igual que las demás rutas de IA pesadas del sistema (contratos/extract,
// lexbase/extract, etc.) — sin esto, el default de Vercel puede cortar la
// respuesta antes de que el modelo termine (ej. bajo rate limit, cuando los
// reintentos internos del SDK toman más tiempo de lo normal).
export const maxDuration = 60;

type CoreMessage = { role: "user" | "assistant" | "system"; content: string };

interface ArchivoAdjunto {
  nombre: string;
  texto:  string;
}

// El texto extraído de un documento adjunto se inyecta completo en el
// system prompt de cada turno de la conversación (no solo una vez). Con el
// fix de renderizado de PDFs escaneados, un documento típico pasó de ~4,000
// a ~30,000+ caracteres extraídos — sin límite, eso infla mucho el prompt en
// cada mensaje (costo, latencia, y riesgo de exceder límites del modelo).
const MAX_CHARS_ARCHIVO_EN_PROMPT = 12000;

function truncarTextoArchivo(texto: string): string {
  if (!texto) return "(no se pudo extraer texto de este archivo)";
  if (texto.length <= MAX_CHARS_ARCHIVO_EN_PROMPT) return texto;
  return (
    texto.slice(0, MAX_CHARS_ARCHIVO_EN_PROMPT) +
    `\n\n[Nota para la IA: el documento tiene más contenido del que se muestra aquí (se truncó a ${MAX_CHARS_ARCHIVO_EN_PROMPT} caracteres). Si necesitas datos que no aparecen arriba, dile al usuario que no los revisaste y pídele que los describa.]`
  );
}

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

    const body = await req.json() as {
      messages: { role: string; content: string }[];
      archivo?: ArchivoAdjunto;
    };
    const incoming = body.messages ?? [];
    const archivo  = body.archivo;

    const lastUser = [...incoming].reverse().find((m) => m.role === "user");
    const query = [lastUser?.content, archivo?.texto].filter(Boolean).join("\n").slice(0, 4000) || "";

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

## Crear un permiso a partir de un documento cargado (PDF/Word)
Cuando el usuario adjunte un documento y pida crear un permiso con su información:
- Extrae todos los campos que puedas de "Documento cargado por el usuario" abajo y llama \`proponer_permiso\`.
- **Nunca inventes un dato que el documento no tenga.** Si un campo requerido (ej. fecha de vencimiento) no aparece explícitamente pero hay un dato relacionado y ambiguo (ej. vencimiento de una fianza, garantía o auditoría en vez del permiso mismo), NO lo asumas como si fuera el campo pedido — explícaselo al usuario en tu respuesta de texto ("El documento no indica una fecha de vencimiento del permiso; sí encontré que la Fianza de Cumplimiento vence el [fecha] — ¿la uso como fecha de vencimiento del permiso, o prefieres dejarlo sin fecha?") y aun así propone el permiso, dejando ese campo vacío hasta que el usuario confirme qué hacer.
- Si el "tipo" o la "entidad reguladora" que menciona el documento no aparecen en "Catálogos válidos de Permisos", dilo explícitamente en tu respuesta (ej. "El documento menciona la entidad 'X', que no está en el catálogo — puedes crearla desde Configuración → Catálogos antes de confirmar, o decirme cuál de las existentes usar") — no elijas un valor del catálogo por tu cuenta como si fuera correcto.
- **Revisa el documento buscando obligaciones de seguimiento** (auditorías, renovaciones, notificaciones previas al vencimiento, entrega de informes, etc.) y, si encuentras alguna con fecha o plazo calculable, propón también \`proponer_tareas\` en la misma respuesta — son requisitos reales de cumplimiento que el usuario necesita rastrear, no opcionales.
- El usuario puede iterar: puede pedirte que ajustes cualquier campo antes de confirmar la tarjeta.

${structuredContext ? `## Datos actuales del sistema\n${structuredContext}` : ""}

${documentContext ? `## Fragmentos de documentos indexados (usa esta información para responder)\n${documentContext}` : ""}

${archivo ? `## Documento cargado por el usuario ahora ("${archivo.nombre}")\n${truncarTextoArchivo(archivo.texto)}` : ""}
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
      maxOutputTokens: 2048,
      temperature: 0.3,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const emit = (obj: Record<string, unknown>) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

        let huboContenido = false;
        try {
          for await (const chunk of result.fullStream) {
            if (chunk.type === "text-delta") {
              huboContenido = true;
              emit({ type: "text-delta", textDelta: chunk.text });
            } else if (chunk.type === "tool-call") {
              huboContenido = true;
              emit({
                type:     "tool-call",
                toolName: chunk.toolName,
                toolArgs: chunk.input,
              });
            } else if (chunk.type === "error") {
              // El SDK puede entregar un error como parte normal del stream
              // (sin lanzar excepción) — sin este caso, se ignoraba en
              // silencio y el cliente se quedaba sin nada, sin saber que algo
              // falló. El error de OpenAI llega como objeto plano con
              // `.message` (ej. {type, code, message, param}), no como
              // instancia de Error — String(objeto) da "[object Object]".
              const errObj = chunk.error as { message?: string; error?: { message?: string } } | undefined;
              const msg = chunk.error instanceof Error
                ? chunk.error.message
                : errObj?.message ?? errObj?.error?.message ?? JSON.stringify(chunk.error);
              console.error("[/api/chat] error chunk en fullStream:", msg);
              emit({ type: "error", error: msg });
              huboContenido = true;
            } else {
              // Diagnóstico temporal: registrar cualquier tipo de chunk no
              // manejado para poder identificar por qué una respuesta puede
              // terminar sin texto ni tool-call visibles para el usuario.
              console.error("[/api/chat] chunk no manejado:", chunk.type, JSON.stringify(chunk).slice(0, 500));
            }
          }
          if (!huboContenido) {
            const finishReason = await Promise.resolve(result.finishReason).catch(() => "desconocido");
            console.error("[/api/chat] stream terminó sin texto, tool-call ni error — finishReason:", finishReason);
          }
          emit({ type: "done" });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/chat] excepción en fullStream:", msg);
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
