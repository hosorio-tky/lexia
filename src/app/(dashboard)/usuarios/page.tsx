import { notFound } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { UserListClient } from "@/components/usuarios/user-list-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const session = await getSession();

  if (!["admin", "supervisor"].includes(session.rol)) notFound();

  const admin = createAdminClient();
  const repo  = createUsuariosRepository(admin, session.tenant_id);
  const users = await repo.list();

  return (
    <AppShell
      breadcrumb="Inicio › Usuarios"
      title="Gestión de Usuarios"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <UserListClient users={users} session={session} />
    </AppShell>
  );
}
