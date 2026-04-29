import AppShell from "@/components/layout/app-shell";
import { ContratoListClient } from "@/components/contratos/contrato-list-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createContratosRepository } from "@/lib/repositories/contratos";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ContratosPage() {
  const session   = await getSession();
  const client    = createAdminClient();
  const repo      = createContratosRepository(client, session.tenant_id);
  const contratos = await repo.list();

  return (
    <AppShell
      breadcrumb="Inicio › Contratos"
      title="Contratos"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <ContratoListClient initialContratos={contratos} />
    </AppShell>
  );
}
