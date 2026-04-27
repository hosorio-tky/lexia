import { notFound } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { UserInviteForm } from "@/components/usuarios/user-invite-form";
import { getSession } from "@/lib/auth/session";

export default async function InvitarUsuarioPage() {
  const session = await getSession();

  if (!["admin", "supervisor"].includes(session.rol)) notFound();

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
        <UserInviteForm />
      </div>
    </AppShell>
  );
}
