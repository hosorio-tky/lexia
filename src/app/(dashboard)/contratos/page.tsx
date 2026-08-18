import { Suspense } from "react";
import AppShell from "@/components/layout/app-shell";
import { ContratoListClient } from "@/components/contratos/contrato-list-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createContratosRepository } from "@/lib/repositories/contratos";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { getEditableIds } from "@/lib/repositories/acceso";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{
    v?: string; page?: string; search?: string;
    estado?: string; tipo?: string; sort?: string; dir?: string;
  }>;
}) {
  const params  = await searchParams;
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createContratosRepository(client, session.tenant_id);
  const caller  = { userId: session.user_id, userRol: session.rol };

  const viewMode    = params.v ?? "tabla";
  const isPaginated = viewMode !== "kanban";
  const page  = isPaginated ? Math.max(0, parseInt(params.page ?? "0", 10) || 0) : 0;
  const limit = isPaginated ? PAGE_SIZE : 9999;

  const filters = {
    search: params.search || undefined,
    estado: params.estado || undefined,
    tipo:   params.tipo   || undefined,
    page,
    limit,
    sortKey: params.sort ?? "actividad",
    sortDir: (params.dir === "asc" ? "asc" : "desc") as "asc" | "desc",
  };

  const [{ items: contratos, total }, statsData, tiposContrato] = await Promise.all([
    repo.list(filters, caller),
    repo.listStats(caller),
    createConfiguracionRepository(client, session.tenant_id)
      .getCatalogos("contratos", "tipo_contrato")
      .then((items) => items.filter((i) => i.activo))
      .catch(() => []),
  ]);

  const editableSet = await getEditableIds(client, session.tenant_id, "contrato", contratos, session.user_id, session.rol);
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
          contratos={contratos}
          statsData={statsData}
          userId={session.user_id}
          userRol={session.rol}
          editableIds={editableIds}
          tiposContrato={tiposContrato}
          total={total}
          page={page}
          pageSize={isPaginated ? PAGE_SIZE : total}
        />
      </Suspense>
    </AppShell>
  );
}
