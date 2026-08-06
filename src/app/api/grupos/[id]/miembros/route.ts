import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createGruposRepository } from "@/lib/repositories/grupos";
import { getSession } from "@/lib/auth/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }  = await params;
  const session = await getSession();
  const repo    = createGruposRepository(createAdminClient(), session.tenant_id);
  const miembros = await repo.listMiembros(id);
  return NextResponse.json(miembros);
}
