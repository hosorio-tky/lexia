import { Suspense } from "react";
import { PermitListClient } from "@/components/permisos/permit-list-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPermisosRepository } from "@/lib/repositories/permisos";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { getEditableIds } from "@/lib/repositories/acceso";
import { getSession } from "@/lib/auth/session";
import type { VigenciaStatus } from "@/types/permits";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function PermisosPage({
  searchParams,
}: {
  searchParams: Promise<{
    v?: string; page?: string; search?: string;
    estado?: string; tipo?: string; responsable?: string;
    vigencia?: string; ubicacion?: string; sort?: string; dir?: string;
    group?: string;
  }>;
}) {
  const params  = await searchParams;
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createPermisosRepository(client, session.tenant_id);
  const caller  = { userId: session.user_id, userRol: session.rol };

  const viewMode    = params.v ?? "table";
  const isPaginated = viewMode !== "location" && viewMode !== "kanban" && !params.group;
  const page  = isPaginated ? Math.max(0, parseInt(params.page ?? "0", 10) || 0) : 0;
  const limit = isPaginated ? PAGE_SIZE : 9999;

  const filters = {
    search:      params.search      || undefined,
    estado:      params.estado      || undefined,
    tipo:        params.tipo        || undefined,
    responsable: params.responsable || undefined,
    vigencia:    (params.vigencia as VigenciaStatus) || undefined,
    ubicacion:   params.ubicacion   || undefined,
    page,
    limit,
    sortKey: params.sort ?? "actividad",
    sortDir: (params.dir === "asc" ? "asc" : "desc") as "asc" | "desc",
  };

  const [{ items: permits, total }, statsData, catalogos] = await Promise.all([
    repo.list(filters, caller),
    repo.listStats(caller),
    createConfiguracionRepository(client, session.tenant_id).getCatalogos("permisos").catch(() => []),
  ]);

  const tiposPermiso = catalogos
    .filter((c) => c.tipo === "tipo_permiso" && c.activo)
    .map((c) => ({ id: c.id, valor: c.valor }));

  // Unique filter options for dropdowns — lightweight query independent of current filters
  const { data: fv } = await client
    .from("permisos")
    .select("responsable_nombre, ubicacion")
    .eq("tenant_id", session.tenant_id);
  const responsables = [...new Set((fv ?? []).map((r) => r.responsable_nombre).filter(Boolean))].sort() as string[];
  const ubicaciones  = [...new Set((fv ?? []).map((r) => r.ubicacion).filter(Boolean))].sort() as string[];

  const editableSet = await getEditableIds(client, session.tenant_id, "permiso", permits, session.user_id, session.rol);
  const editableIds = Array.from(editableSet);

  return (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Permisos y Licencias</h1>
      </div>
      <Suspense>
        <PermitListClient
          permits={permits}
          statsData={statsData}
          userId={session.user_id}
          userRol={session.rol}
          editableIds={editableIds}
          tiposPermiso={tiposPermiso}
          responsables={responsables}
          ubicaciones={ubicaciones}
          total={total}
          page={page}
          pageSize={isPaginated ? PAGE_SIZE : total}
        />
      </Suspense>
    </>
  );
}
