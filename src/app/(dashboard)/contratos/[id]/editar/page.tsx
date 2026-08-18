import { notFound } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { ContratoFormClient } from "@/components/contratos/contrato-form-client";
import { editarContrato } from "@/app/actions/contratos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createContratosRepository } from "@/lib/repositories/contratos";
import { createResponsablesRepository } from "@/lib/repositories/responsables";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function EditarContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, getSession()]);
  const client = createAdminClient();

  const [contrato, responsables, catalogos, profilesResult] = await Promise.all([
    createContratosRepository(client, session.tenant_id).getById(id),
    createResponsablesRepository(client, session.tenant_id).list(),
    createConfiguracionRepository(client, session.tenant_id).getCatalogos("contratos"),
    client.from("profiles").select("id, nombre, apellido, email, cargo, depto_cat:catalogos!departamento_id(valor)")
      .eq("tenant_id", session.tenant_id).order("nombre"),
  ]);

  if (!contrato) notFound();

  const tiposContrato = catalogos.filter((c) => c.tipo === "tipo" && c.activo);
  const profiles      = (profilesResult.data ?? []).map((p) => ({
    id:           p.id as string,
    nombre:       p.apellido ? `${p.nombre} ${p.apellido}` : (p.nombre as string),
    email:        p.email as string,
    departamento: ((p.depto_cat as unknown) as { valor: string } | null)?.valor ?? null,
    cargo:        (p.cargo        as string | null) ?? null,
  }));
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
        tiposContrato={tiposContrato}
        profiles={profiles}
      />
    </AppShell>
  );
}
