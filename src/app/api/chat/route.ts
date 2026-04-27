import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
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
- Usa la información del contexto para dar respuestas precisas.
- Si la información no está en el contexto, dilo claramente en lugar de inventar.
- Para fechas y plazos, sé específico y menciona los días restantes.
- Puedes usar Markdown para estructurar tus respuestas (listas, negritas, tablas).

${structuredContext ? `## Datos actuales del sistema\n${structuredContext}` : ""}

${documentContext ? `## Fragmentos relevantes de documentos adjuntos\n${documentContext}` : ""}
`.trim();

    const coreMessages: CoreMessage[] = incoming
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: coreMessages,
      maxOutputTokens: 1024,
      temperature: 0.3,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "text-delta", textDelta: chunk })}\n\n`)
            );
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: msg })}\n\n`)
          );
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
