import { Suspense } from "react";
import AppShell from "@/components/layout/app-shell";
import { PermitListClient } from "@/components/permisos/permit-list-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPermisosRepository } from "@/lib/repositories/permisos";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { getEditableIds } from "@/lib/repositories/acceso";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PermisosPage() {
  const session = await getSession();
  const client  = createAdminClient();

  const [permits, catalogos] = await Promise.all([
    createPermisosRepository(client, session.tenant_id).list(undefined, { userId: session.user_id, userRol: session.rol }),
    createConfiguracionRepository(client, session.tenant_id).getCatalogos("permisos").catch(() => []),
  ]);

  const tiposPermiso = catalogos.filter((c) => c.tipo === "tipo_permiso" && c.activo).map((c) => c.valor);

  const editableSet = await getEditableIds(
    client, session.tenant_id, "permiso", permits, session.user_id, session.rol,
  );
  const editableIds = Array.from(editableSet);

  return (
    <AppShell
      breadcrumb="Inicio › Permisos"
      title="Permisos y Licencias"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <Suspense>
        <PermitListClient
          initialPermits={permits}
          userId={session.user_id}
          userRol={session.rol}
          editableIds={editableIds}
          tiposPermiso={tiposPermiso}
        />
      </Suspense>
    </AppShell>
  );
}
