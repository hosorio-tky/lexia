import AppShell from "@/components/layout/app-shell";
import { NotificacionesClient } from "@/components/notifications/notificaciones-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificacionesRepository } from "@/lib/repositories/notificaciones";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function NotificacionesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string; leida?: string; modulo?: string;
  }>;
}) {
  const params  = await searchParams;
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createNotificacionesRepository(client, session.tenant_id);

  const page = Math.max(0, parseInt(params.page ?? "0", 10) || 0);
  const leida =
    params.leida === "true"  ? true  :
    params.leida === "false" ? false :
    undefined;
  const modulo = params.modulo || undefined;

  const [{ items: notificaciones, total }, totalUnread] = await Promise.all([
    repo.getAll(session.user_id, { leida, modulo, page, limit: PAGE_SIZE }),
    repo.getUnreadCount(session.user_id),
  ]);

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
        tenant_nombre:   session.tenant_nombre,
      }}
    >
      <NotificacionesClient
        initialNotifs={notificaciones}
        totalUnread={totalUnread}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </AppShell>
  );
}
