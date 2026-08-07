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

  const [catalogos, responsables, ubicaciones, profilesResult] = await Promise.all([
    createConfiguracionRepository(client, session.tenant_id).getCatalogos("permisos"),
    createResponsablesRepository(client, session.tenant_id).list(),
    createUbicacionesRepository(client, session.tenant_id).list(),
    client.from("profiles").select("id, nombre, apellido, email, departamento, cargo")
      .eq("tenant_id", session.tenant_id).eq("activo", true).order("nombre"),
  ]);

  const tiposPermiso = catalogos.filter((c) => c.tipo === "tipo_permiso" && c.activo);
  const entidades    = catalogos.filter((c) => c.tipo === "entidad_reguladora" && c.activo);
  const profiles     = (profilesResult.data ?? []).map((p) => ({
    id:           p.id as string,
    nombre:       p.apellido ? `${p.nombre} ${p.apellido}` : (p.nombre as string),
    email:        p.email as string,
    departamento: (p.departamento as string | null) ?? null,
    cargo:        (p.cargo        as string | null) ?? null,
  }));

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
        tiposPermiso={tiposPermiso}
        entidadesReguladoras={entidades}
        responsables={responsables}
        ubicaciones={ubicaciones}
        profiles={profiles}
      />
    </AppShell>
  );
}
