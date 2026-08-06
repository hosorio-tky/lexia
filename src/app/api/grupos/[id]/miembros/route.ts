import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createGruposRepository } from "@/lib/repositories/grupos";
import { getSession } from "@/lib/auth/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }  = await params;
    const session = await getSession();
    const repo    = createGruposRepository(createAdminClient(), session.tenant_id);
    const miembros = await repo.listMiembros(id);
    return NextResponse.json(miembros);
  } catch (err) {
    console.error("[api/grupos/miembros] GET error:", err);
    return NextResponse.json({ error: "Error al cargar miembros" }, { status: 500 });
  }
}
