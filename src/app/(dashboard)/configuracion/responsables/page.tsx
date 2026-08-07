import { createAdminClient } from "@/lib/supabase/admin";
import { createResponsablesRepository } from "@/lib/repositories/responsables";
import { getSession } from "@/lib/auth/session";
import { ResponsablesClient } from "@/components/configuracion/responsables-client";
import type { ProfileOption } from "@/types/users";

export const dynamic = "force-dynamic";
export type { ProfileOption };

export default async function ResponsablesPage() {
  const session = await getSession();
  const admin   = createAdminClient();
  const repo    = createResponsablesRepository(admin, session.tenant_id);

  const [items, profilesResult] = await Promise.all([
    repo.list(false),
    admin
      .from("profiles")
      .select("id, nombre, apellido, email, departamento, cargo")
      .eq("tenant_id", session.tenant_id)
      .eq("activo", true)
      .order("nombre"),
  ]);

  const profiles: ProfileOption[] = (profilesResult.data ?? []).map((p) => ({
    id:          p.id as string,
    nombre:      p.apellido ? `${p.nombre} ${p.apellido}` : (p.nombre as string),
    email:       p.email as string,
    departamento: (p.departamento as string | null) ?? null,
    cargo:        (p.cargo        as string | null) ?? null,
  }));

  return <ResponsablesClient initialItems={items} profiles={profiles} />;
}
