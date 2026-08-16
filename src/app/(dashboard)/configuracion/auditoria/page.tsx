import { createAdminClient } from "@/lib/supabase/admin";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { getSession } from "@/lib/auth/session";
import { AuditLogClient } from "@/components/configuracion/audit-log-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; modulo?: string; usuario?: string; search?: string }>;
}) {
  const params  = await searchParams;
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createConfiguracionRepository(client, session.tenant_id);
  const uRepo   = createUsuariosRepository(client, session.tenant_id);

  const page    = Math.max(0, parseInt(params.page ?? "0", 10) || 0);
  const modulo  = params.modulo  || undefined;
  const userId  = params.usuario || undefined;
  const search  = params.search  || undefined;

  const [{ logs, total }, usuarios] = await Promise.all([
    repo.getAuditLog({ page, limit: PAGE_SIZE, modulo, userId, search }),
    uRepo.list(),
  ]);

  return (
    <AuditLogClient
      logs={logs}
      usuarios={usuarios}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}
