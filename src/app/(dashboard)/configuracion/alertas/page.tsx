import { createAdminClient } from "@/lib/supabase/admin";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { getSession } from "@/lib/auth/session";
import { PlantillaManagerClient } from "@/components/configuracion/plantilla-manager-client";
import { ReindexButton } from "@/components/configuracion/reindex-button";

export const dynamic = "force-dynamic";

export default async function AlertasPage() {
  const session    = await getSession();
  const client     = createAdminClient();
  const repo       = createConfiguracionRepository(client, session.tenant_id);
  const plantillas = await repo.getPlantillas();

  return (
    <div className="space-y-8">
      <PlantillaManagerClient initialPlantillas={plantillas} />
      <ReindexButton />
    </div>
  );
}
