import { createAdminClient } from "@/lib/supabase/admin";
import { createGruposRepository } from "@/lib/repositories/grupos";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { getSession } from "@/lib/auth/session";
import { GruposClient } from "@/components/configuracion/grupos-client";

export const dynamic = "force-dynamic";

export default async function GruposPage() {
  const session = await getSession();
  const client  = createAdminClient();

  const [grupos, usuarios] = await Promise.all([
    createGruposRepository(client, session.tenant_id).list(),
    createUsuariosRepository(client, session.tenant_id).list(),
  ]);

  return <GruposClient initialGrupos={grupos} usuarios={usuarios} />;
}
