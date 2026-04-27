import { notFound } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { UserDetailClient } from "@/components/usuarios/user-detail-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function UsuarioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, getSession()]);

  // Solo admin/supervisor pueden ver otros perfiles (todos pueden ver el propio)
  const isSelf = session.user_id === id;
  if (!isSelf && !["admin", "supervisor"].includes(session.rol)) notFound();

  const admin = createAdminClient();
  const repo  = createUsuariosRepository(admin, session.tenant_id);

  const [user, activity] = await Promise.all([
    repo.getById(id),
    repo.getActivity(id),
  ]);

  if (!user) notFound();

  // Verificar que el usuario pertenece al mismo tenant
  if (user.tenant_id !== session.tenant_id) notFound();

  return (
    <AppShell
      breadcrumb={`Inicio › Usuarios › ${user.nombre_completo}`}
      title={user.nombre_completo}
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <UserDetailClient user={user} activity={activity} session={session} />
    </AppShell>
  );
}
