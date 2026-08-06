import { createAdminClient } from "@/lib/supabase/admin";
import { getSession }        from "@/lib/auth/session";
import { createContratoPlantillasRepository } from "@/lib/repositories/contrato-plantillas";
import { PlantillasClient } from "@/components/configuracion/plantillas-client";

export const dynamic = "force-dynamic";

export default async function PlantillasPage() {
  const session = await getSession();
  const repo    = createContratoPlantillasRepository(createAdminClient(), session.tenant_id);
  const items   = await repo.list();

  return <PlantillasClient initialItems={items} />;
}
