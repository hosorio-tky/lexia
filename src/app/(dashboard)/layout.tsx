import AppShell from "@/components/layout/app-shell";
import { InactivityGuard } from "@/components/shared/inactivity-guard";
import { getSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <AppShell
      user={{
        id:              session.user_id,
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
        tenant_nombre:   session.tenant_nombre,
      }}
    >
      {children}
      <InactivityGuard />
    </AppShell>
  );
}
