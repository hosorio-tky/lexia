import AppShell from "@/components/layout/app-shell";
import { ReportesClient } from "@/components/reportes/reportes-client";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const session = await getSession();

  return (
    <AppShell
      breadcrumb="Inicio › Reportes"
      title="Reportes"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
        tenant_nombre:   session.tenant_nombre,
      }}
    >
      <ReportesClient />
    </AppShell>
  );
}
