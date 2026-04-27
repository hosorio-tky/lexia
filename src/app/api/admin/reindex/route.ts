/**
 * POST /api/admin/reindex
 * Re-indexa todos los documentos del tenant que no tienen chunks aún.
 * Solo accesible para admins autenticados.
 */
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { indexDocument } from "@/lib/ai/indexer";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST() {
  // Autenticar
  const cookieStore = await cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cs) {
        try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* ignore */ }
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol")
    .eq("id", user.id)
    .single();

  if (!profile) return new Response(JSON.stringify({ error: "Perfil no encontrado" }), { status: 403 });

  const client = createAdminClient();

  // Obtener documentos sin chunks
  const { data: docs, error } = await client
    .from("documentos")
    .select("id, storage_path, tipo_mime")
    .eq("tenant_id", profile.tenant_id)
    .not("storage_path", "is", null)
    .not("storage_path", "eq", "");

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Filtrar solo los que no tienen chunks todavía
  const { data: existing } = await client
    .from("document_chunks")
    .select("documento_id")
    .eq("tenant_id", profile.tenant_id);

  const indexedIds = new Set((existing ?? []).map((r: { documento_id: string }) => r.documento_id));
  const toIndex = (docs ?? []).filter((d: { id: string }) => !indexedIds.has(d.id));

  // Indexar en secuencia para no sobrecargar OpenAI
  let indexed = 0;
  const errors: string[] = [];

  for (const doc of toIndex as Array<{ id: string; storage_path: string; tipo_mime: string }>) {
    try {
      await indexDocument({
        documentoId: doc.id,
        tenantId:    profile.tenant_id,
        storagePath: doc.storage_path,
        mimeType:    doc.tipo_mime ?? "",
      });
      indexed++;
    } catch (e) {
      errors.push(`${doc.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return new Response(
    JSON.stringify({ total: toIndex.length, indexed, errors }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
