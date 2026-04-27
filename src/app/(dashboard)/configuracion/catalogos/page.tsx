import { createAdminClient } from "@/lib/supabase/admin";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { getSession } from "@/lib/auth/session";
import { CatalogoManagerClient } from "@/components/configuracion/catalogo-manager-client";

export const dynamic = "force-dynamic";

export default async function CatalogosPage() {
  const session   = await getSession();
  const client    = createAdminClient();
  const repo      = createConfiguracionRepository(client, session.tenant_id);
  const catalogos = await repo.getCatalogos();

  return <CatalogoManagerClient initialCatalogos={catalogos} />;
}
