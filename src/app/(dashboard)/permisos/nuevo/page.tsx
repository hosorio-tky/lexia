import AppShell from "@/components/layout/app-shell";
import { PermitFormClient } from "@/components/permisos/permit-form-client";
import { crearPermiso } from "@/app/actions/permisos";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { createResponsablesRepository } from "@/lib/repositories/responsables";
import { createUbicacionesRepository } from "@/lib/repositories/ubicaciones";

export const dynamic = "force-dynamic";

export default async function NuevoPermisoPage() {
  const session = await getSession();
  const client  = createAdminClient();

  const [catalogos, responsables, ubicaciones] = await Promise.all([
    createConfiguracionRepository(client, session.tenant_id).getCatalogos("permisos"),
    createResponsablesRepository(client, session.tenant_id).list(),
    createUbicacionesRepository(client, session.tenant_id).list(),
  ]);

  const tiposPermiso = catalogos.filter((c) => c.tipo === "tipo_permiso" && c.activo).map((c) => c.valor);
  const entidades    = catalogos.filter((c) => c.tipo === "entidad_reguladora" && c.activo).map((c) => c.valor);

  return (
    <AppShell
      breadcrumb="Inicio › Permisos › Nuevo"
      title="Crear Permiso"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <PermitFormClient
        action={crearPermiso}
        tiposPermiso={tiposPermiso.length > 0 ? tiposPermiso : undefined}
        entidadesReguladoras={entidades.length > 0 ? entidades : undefined}
        responsables={responsables}
        ubicaciones={ubicaciones}
      />
    </AppShell>
  );
}
