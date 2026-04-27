import { createAdminClient } from "@/lib/supabase/admin";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { getSession } from "@/lib/auth/session";
import { AuditLogClient } from "@/components/configuracion/audit-log-client";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage() {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createConfiguracionRepository(client, session.tenant_id);
  const uRepo   = createUsuariosRepository(client, session.tenant_id);

  const [logs, usuarios] = await Promise.all([
    repo.getAuditLog({ limit: 200 }),
    uRepo.list(),
  ]);

  return <AuditLogClient logs={logs} usuarios={usuarios} />;
}
