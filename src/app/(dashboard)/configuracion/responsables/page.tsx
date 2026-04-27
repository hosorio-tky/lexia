import { createAdminClient } from "@/lib/supabase/admin";
import { createResponsablesRepository } from "@/lib/repositories/responsables";
import { getSession } from "@/lib/auth/session";
import { ResponsablesClient } from "@/components/configuracion/responsables-client";

export const dynamic = "force-dynamic";

export default async function ResponsablesPage() {
  const session = await getSession();
  const repo    = createResponsablesRepository(createAdminClient(), session.tenant_id);
  const items   = await repo.list(false); // incluir inactivos en config

  return <ResponsablesClient initialItems={items} />;
}
