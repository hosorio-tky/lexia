import AppShell from "@/components/layout/app-shell";
import { ContratoFormClient } from "@/components/contratos/contrato-form-client";
import { crearContrato } from "@/app/actions/contratos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createResponsablesRepository } from "@/lib/repositories/responsables";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function NuevoContratoPage() {
  const session      = await getSession();
  const client       = createAdminClient();
  const responsables = await createResponsablesRepository(client, session.tenant_id).list();

  return (
    <AppShell
      breadcrumb="Inicio › Contratos › Nuevo"
      title="Crear Contrato"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <ContratoFormClient
        action={crearContrato}
        mode="create"
        responsables={responsables}
      />
    </AppShell>
  );
}
