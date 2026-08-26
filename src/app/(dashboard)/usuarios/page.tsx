import { notFound } from "next/navigation";
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
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
      </div>
      <UserListClient users={users} session={session} />
    </>
  );
}
