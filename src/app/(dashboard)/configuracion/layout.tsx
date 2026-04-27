import AppShell from "@/components/layout/app-shell";
import { ConfigSidebar } from "@/components/configuracion/config-sidebar";
import { getSession } from "@/lib/auth/session";
import { notFound } from "next/navigation";

export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Configuración solo visible para admin (supervisor puede ver auditoría)
  if (!["admin", "supervisor"].includes(session.rol)) notFound();

  return (
    <AppShell
      breadcrumb="Inicio › Configuración"
      title="Configuración"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        <ConfigSidebar rol={session.rol} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AppShell>
  );
}
