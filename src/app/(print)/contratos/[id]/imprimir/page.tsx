import { notFound }        from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createContratosRepository } from "@/lib/repositories/contratos";
import { getSession }        from "@/lib/auth/session";
import { ContratoPrintView } from "@/components/contratos/contrato-print-view";

export const dynamic = "force-dynamic";

export default async function ContratoPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, getSession()]);
  const repo     = createContratosRepository(createAdminClient(), session.tenant_id);
  const contrato = await repo.getById(id);

  if (!contrato) notFound();

  return <ContratoPrintView contrato={contrato} />;
}
