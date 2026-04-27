import { createAdminClient } from "@/lib/supabase/admin";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { getSession } from "@/lib/auth/session";
import { EmpresaFormClient } from "@/components/configuracion/empresa-form-client";

export const dynamic = "force-dynamic";

export default async function EmpresaPage() {
  const session  = await getSession();
  const client   = createAdminClient();
  const repo     = createConfiguracionRepository(client, session.tenant_id);
  const settings = await repo.getTenantSettings();

  return <EmpresaFormClient settings={settings} />;
}
