import AppShell from "@/components/layout/app-shell";
import { UserProfileClient } from "@/components/usuarios/user-profile-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await getSession();
  const admin   = createAdminClient();
  const repo    = createUsuariosRepository(admin, session.tenant_id);
  const user    = await repo.getById(session.user_id);

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
      }}
    >
      <UserProfileClient user={user} />
    </AppShell>
  );
}
