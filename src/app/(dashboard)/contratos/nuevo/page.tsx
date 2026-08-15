import AppShell from "@/components/layout/app-shell";
import { ContratoFormClient } from "@/components/contratos/contrato-form-client";
import { crearContrato } from "@/app/actions/contratos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createResponsablesRepository } from "@/lib/repositories/responsables";
import { createContratoPlantillasRepository } from "@/lib/repositories/contrato-plantillas";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function NuevoContratoPage() {
  const session = await getSession();
  const client  = createAdminClient();

  const [responsables, plantillas, catalogos, profilesResult] = await Promise.all([
    createResponsablesRepository(client, session.tenant_id).list(),
    createContratoPlantillasRepository(client, session.tenant_id).list(),
    createConfiguracionRepository(client, session.tenant_id).getCatalogos("contratos"),
    client.from("profiles").select("id, nombre, apellido, email, cargo, depto_cat:catalogos!departamento_id(valor)")
      .eq("tenant_id", session.tenant_id).order("nombre"),
  ]);

  const tiposContrato = catalogos.filter((c) => c.tipo === "tipo_contrato" && c.activo);
  const profiles      = (profilesResult.data ?? []).map((p) => ({
    id:           p.id as string,
    nombre:       p.apellido ? `${p.nombre} ${p.apellido}` : (p.nombre as string),
    email:        p.email as string,
    departamento: ((p.depto_cat as unknown) as { valor: string } | null)?.valor ?? null,
    cargo:        (p.cargo        as string | null) ?? null,
  }));

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
        plantillas={plantillas}
        tiposContrato={tiposContrato}
        profiles={profiles}
      />
    </AppShell>
  );
}
