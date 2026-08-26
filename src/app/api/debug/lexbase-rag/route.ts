// TEMP DEBUG — remove after diagnosis
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { assembleContext } from "@/lib/ai/rag";

export async function GET(req: Request) {
  const session = await getSession();
  const url = new URL(req.url);
  const query = url.searchParams.get("q") ?? "Dame un resumen del Diario Oficial del 1 de julio de 2026";

  const { documentContext, structuredContext } = await assembleContext(session.tenant_id, query);

  return NextResponse.json({
    tenant_id:           session.tenant_id,
    query,
    documentContext_len: documentContext.length,
    lexbase_fragments:   (documentContext.match(/Lexbase legal/g) ?? []).length,
    documentContext_preview: documentContext.slice(0, 1500),
    structuredContext_len: structuredContext.length,
  });
}
