import AppShell from "@/components/layout/app-shell";
import { NotificacionesClient } from "@/components/notifications/notificaciones-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificacionesRepository } from "@/lib/repositories/notificaciones";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function NotificacionesPage() {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createNotificacionesRepository(client, session.tenant_id);

  const notificaciones = await repo.getAll(session.user_id);

  return (
    <AppShell
      breadcrumb="Inicio › Notificaciones"
      title="Notificaciones"
      user={{
        id:              session.user_id,
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <NotificacionesClient initialNotifs={notificaciones} />
    </AppShell>
  );
}
