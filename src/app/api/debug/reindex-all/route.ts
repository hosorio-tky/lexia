// TEMP DEBUG — remove after re-indexing
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { indexLexbaseDocument } from "@/lib/ai/lexbase-indexer";
import { getSession } from "@/lib/auth/session";

export const maxDuration = 300; // 5 min — indexing is slow

export async function POST() {
  const session = await getSession();

  const client = createAdminClient();
  const { data: docs, error } = await client
    .from("lexbase_documentos")
    .select("id, titulo, storage_path, tipo_mime")
    .eq("tenant_id", session.tenant_id)
    .not("storage_path", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Record<string, unknown>[] = [];

  for (const doc of (docs ?? [])) {
    try {
      const r = await indexLexbaseDocument({
        documentoId: doc.id,
        tenantId:    session.tenant_id,
        storagePath: doc.storage_path!,
        mimeType:    doc.tipo_mime ?? "application/pdf",
      });
      results.push({ id: doc.id, titulo: doc.titulo, ...r });
    } catch (e) {
      results.push({ id: doc.id, titulo: doc.titulo, error: (e as Error).message });
    }
  }

  return NextResponse.json({ results });
}
