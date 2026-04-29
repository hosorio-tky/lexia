import { notFound } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { ContratoFormClient } from "@/components/contratos/contrato-form-client";
import { editarContrato } from "@/app/actions/contratos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createContratosRepository } from "@/lib/repositories/contratos";
import { createResponsablesRepository } from "@/lib/repositories/responsables";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function EditarContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, getSession()]);
  const client = createAdminClient();

  const [contrato, responsables] = await Promise.all([
    createContratosRepository(client, session.tenant_id).getById(id),
    createResponsablesRepository(client, session.tenant_id).list(),
  ]);

  if (!contrato) notFound();

  const boundAction = editarContrato.bind(null, id);

  return (
    <AppShell
      breadcrumb={`Inicio › Contratos › ${contrato.numero ?? id} › Editar`}
      title="Editar Contrato"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <ContratoFormClient
        action={boundAction}
        mode="edit"
        defaultValues={contrato}
        responsables={responsables}
      />
    </AppShell>
  );
}
