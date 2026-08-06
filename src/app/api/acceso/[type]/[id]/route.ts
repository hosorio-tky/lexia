import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAccesoRepository } from "@/lib/repositories/acceso";
import { createGruposRepository } from "@/lib/repositories/grupos";
import { getSession } from "@/lib/auth/session";
import type { ResourceType } from "@/types/access-control";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const session = await getSession();
  const client  = createAdminClient();

  const [accesos, perfilesResult, grupos] = await Promise.all([
    createAccesoRepository(client, session.tenant_id).listByResource(type as ResourceType, id),
    client
      .from("profiles")
      .select("id, nombre, apellido, email, rol, activo, cargo, departamento, telefono, ultimo_acceso, avatar_url, created_at, updated_at")
      .eq("tenant_id", session.tenant_id)
      .eq("activo", true)
      .order("nombre"),
    createGruposRepository(client, session.tenant_id).list(),
  ]);

  const usuarios = (perfilesResult.data ?? []).map((u) => ({
    ...u,
    nombre_completo: [u.nombre, u.apellido].filter(Boolean).join(" "),
    iniciales:       [u.nombre, u.apellido]
      .filter(Boolean)
      .map((w) => w![0])
      .join("")
      .toUpperCase()
      .slice(0, 2),
  }));

  return NextResponse.json({ accesos, usuarios, grupos });
}
