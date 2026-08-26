import { notFound } from "next/navigation";
import { UserEditClient } from "@/components/usuarios/user-edit-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function UsuarioEditarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, getSession()]);

  if (!["admin", "supervisor"].includes(session.rol)) notFound();

  const admin = createAdminClient();
  const [user, departamentos] = await Promise.all([
    createUsuariosRepository(admin, session.tenant_id).getById(id),
    createConfiguracionRepository(admin, session.tenant_id)
      .getCatalogos("global", "departamento")
      .then((items) => items.filter((i) => i.activo))
      .catch(() => []),
  ]);

  if (!user) notFound();
  if (user.tenant_id !== session.tenant_id) notFound();

  return (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{`Editar usuario`}</h1>
      </div>
      <div className="max-w-2xl">
        <UserEditClient user={user} rolInvitador={session.rol} departamentos={departamentos} />
      </div>
    </>
  );
}
