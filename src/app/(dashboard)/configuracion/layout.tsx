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
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <ConfigSidebar rol={session.rol} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
