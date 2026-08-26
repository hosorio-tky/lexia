import { notFound } from "next/navigation";
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
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{user.nombre_completo}</h1>
      </div>
      <UserDetailClient user={user} activity={activity} session={session} />
    </>
  );
}
