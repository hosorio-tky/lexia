import { createAdminClient } from "@/lib/supabase/admin";
import { createUbicacionesRepository } from "@/lib/repositories/ubicaciones";
import { getSession } from "@/lib/auth/session";
import { UbicacionesClient } from "@/components/configuracion/ubicaciones-client";

export const dynamic = "force-dynamic";

export default async function UbicacionesPage() {
  const session = await getSession();
  const repo    = createUbicacionesRepository(createAdminClient(), session.tenant_id);
  const items   = await repo.list(false); // incluir inactivas en config

  return <UbicacionesClient initialItems={items} />;
}
