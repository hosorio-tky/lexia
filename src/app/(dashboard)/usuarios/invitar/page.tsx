import { notFound } from "next/navigation";
import { UserInviteForm } from "@/components/usuarios/user-invite-form";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";

export default async function InvitarUsuarioPage() {
  const session = await getSession();

  if (!["admin", "supervisor"].includes(session.rol)) notFound();

  const departamentos = await createConfiguracionRepository(createAdminClient(), session.tenant_id)
    .getCatalogos("global", "departamento")
    .then((items) => items.filter((i) => i.activo))
    .catch(() => []);

  return (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Invitar Usuario</h1>
      </div>
      <div className="max-w-2xl">
        <UserInviteForm rolInvitador={session.rol} departamentos={departamentos} />
      </div>
    </>
  );
}
