import { notFound } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { UserInviteForm } from "@/components/usuarios/user-invite-form";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";

export default async function InvitarUsuarioPage() {
  const session = await getSession();

  if (!["admin", "supervisor"].includes(session.rol)) notFound();

  const departamentos = await createConfiguracionRepository(createAdminClient(), session.tenant_id)
    .getCatalogos("global", "departamento")
    .then((items) => items.filter((i) => i.activo).map((i) => i.etiqueta))
    .catch(() => [] as string[]);

  return (
    <AppShell
      breadcrumb="Inicio › Usuarios › Invitar"
      title="Invitar Usuario"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <div className="max-w-2xl">
        <UserInviteForm rolInvitador={session.rol} departamentos={departamentos} />
      </div>
    </AppShell>
  );
}
