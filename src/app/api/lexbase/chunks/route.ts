import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

/**
 * GET /api/lexbase/chunks?docId=xxx
 * Returns the text chunks for a Lexbase document (no embeddings).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const docId   = req.nextUrl.searchParams.get("docId");

    if (!docId) {
      return NextResponse.json({ error: "Missing docId" }, { status: 400 });
    }

    const client = createAdminClient();

    // Verify document belongs to tenant
    const { data: doc } = await client
      .from("lexbase_documentos")
      .select("id")
      .eq("id", docId)
      .eq("tenant_id", session.tenant_id)
      .single();

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: chunks, error } = await client
      .from("lexbase_chunks")
      .select("chunk_index, contenido")
      .eq("documento_id", docId)
      .order("chunk_index", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ chunks: chunks ?? [] });
  } catch (err) {
    console.error("[lexbase/chunks]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
