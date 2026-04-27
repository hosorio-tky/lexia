import AppShell from "@/components/layout/app-shell";
import { PermitListClient } from "@/components/permisos/permit-list-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPermisosRepository } from "@/lib/repositories/permisos";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PermisosPage() {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createPermisosRepository(client, session.tenant_id);
  const permits = await repo.list();

  return (
    <AppShell
      breadcrumb="Inicio › Permisos"
      title="Permisos y Licencias"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <PermitListClient initialPermits={permits} />
    </AppShell>
  );
}
