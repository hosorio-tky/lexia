import { notFound } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { PermitFormClient } from "@/components/permisos/permit-form-client";
import { editarPermiso } from "@/app/actions/permisos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPermisosRepository } from "@/lib/repositories/permisos";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { createResponsablesRepository } from "@/lib/repositories/responsables";
import { createUbicacionesRepository } from "@/lib/repositories/ubicaciones";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function EditarPermisoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, getSession()]);
  const client = createAdminClient();

  const [permit, catalogos, responsables, ubicaciones] = await Promise.all([
    createPermisosRepository(client, session.tenant_id).getById(id),
    createConfiguracionRepository(client, session.tenant_id).getCatalogos("permisos"),
    createResponsablesRepository(client, session.tenant_id).list(),
    createUbicacionesRepository(client, session.tenant_id).list(),
  ]);

  if (!permit) notFound();

  const tiposPermiso = catalogos.filter((c) => c.tipo === "tipo_permiso" && c.activo).map((c) => c.valor);
  const entidades    = catalogos.filter((c) => c.tipo === "entidad_reguladora" && c.activo).map((c) => c.valor);
  const action       = editarPermiso.bind(null, id);

  return (
    <AppShell
      breadcrumb={`Inicio › Permisos › ${permit.numero_expediente ?? id} › Editar`}
      title="Editar Permiso"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <PermitFormClient
        action={action}
        defaultValues={permit}
        backHref={`/permisos/${id}`}
        tiposPermiso={tiposPermiso.length > 0 ? tiposPermiso : undefined}
        entidadesReguladoras={entidades.length > 0 ? entidades : undefined}
        responsables={responsables}
        ubicaciones={ubicaciones}
      />
    </AppShell>
  );
}
