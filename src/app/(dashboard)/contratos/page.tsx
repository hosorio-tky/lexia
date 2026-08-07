import { Suspense } from "react";
import AppShell from "@/components/layout/app-shell";
import { ContratoListClient } from "@/components/contratos/contrato-list-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createContratosRepository } from "@/lib/repositories/contratos";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { getEditableIds } from "@/lib/repositories/acceso";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ContratosPage() {
  const session   = await getSession();
  const client    = createAdminClient();
  const repo      = createContratosRepository(client, session.tenant_id);
  const [contratos, tiposContrato] = await Promise.all([
    repo.list(undefined, { userId: session.user_id, userRol: session.rol }),
    createConfiguracionRepository(client, session.tenant_id)
      .getCatalogos("contratos", "tipo_contrato")
      .then((items) => items.filter((i) => i.activo))
      .catch(() => []),
  ]);

  const editableSet = await getEditableIds(
    client, session.tenant_id, "contrato", contratos, session.user_id, session.rol,
  );
  const editableIds = Array.from(editableSet);

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
      <Suspense>
        <ContratoListClient
          initialContratos={contratos}
          userId={session.user_id}
          userRol={session.rol}
          editableIds={editableIds}
          tiposContrato={tiposContrato}
        />
      </Suspense>
    </AppShell>
  );
}
