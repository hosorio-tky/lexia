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
    client.from("profiles").select("id, nombre, apellido, email, cargo, depto_cat:catalogos!departamento_id(valor)")
      .eq("tenant_id", session.tenant_id).order("nombre"),
  ]);

  const tiposPermiso = catalogos.filter((c) => c.tipo === "tipo_permiso" && c.activo);
  const entidades    = catalogos.filter((c) => c.tipo === "entidad_reguladora" && c.activo);
  const profiles     = (profilesResult.data ?? []).map((p) => ({
    id:           p.id as string,
    nombre:       p.apellido ? `${p.nombre} ${p.apellido}` : (p.nombre as string),
    email:        p.email as string,
    departamento: ((p.depto_cat as unknown) as { valor: string } | null)?.valor ?? null,
    cargo:        (p.cargo        as string | null) ?? null,
  }));

  return (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Crear Permiso</h1>
      </div>
      <PermitFormClient
        action={crearPermiso}
        tiposPermiso={tiposPermiso}
        entidadesReguladoras={entidades}
        responsables={responsables}
        ubicaciones={ubicaciones}
        profiles={profiles}
      />
    </>
  );
}
