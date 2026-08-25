import AppShell from "@/components/layout/app-shell";
import { UserProfileClient } from "@/components/usuarios/user-profile-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await getSession();
  const admin   = createAdminClient();
  const [user, departamentos] = await Promise.all([
    createUsuariosRepository(admin, session.tenant_id).getById(session.user_id),
    createConfiguracionRepository(admin, session.tenant_id)
      .getCatalogos("global", "departamento")
      .then((items) => items.filter((i) => i.activo))
      .catch(() => []),
  ]);

  if (!user) return null;

  return (
    <AppShell
      breadcrumb="Inicio › Mi Perfil"
      title="Mi Perfil"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
        tenant_nombre:   session.tenant_nombre,
      }}
    >
      <UserProfileClient user={user} departamentos={departamentos} />
    </AppShell>
  );
}
