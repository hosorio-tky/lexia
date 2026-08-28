import { TaskBoardClient } from "@/components/tareas/task-board-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTareasRepository } from "@/lib/repositories/tareas";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { getSession } from "@/lib/auth/session";
import { TAREAS_PAGE_SIZE } from "@/types/tasks";

export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const session = await getSession();
  const client  = createAdminClient();

  // Carga inicial acotada — no se trae el histórico completo del tenant.
  // Por defecto se excluyen las canceladas (igual que el filtro "Ver
  // canceladas", que arranca apagado); "Cargar más" trae el resto.
  const [{ items: tasks, hasMore }, usuarios] = await Promise.all([
    createTareasRepository(client, session.tenant_id).listPaginado(
      { estado: ["pendiente", "en_progreso", "completada"] },
      0,
      TAREAS_PAGE_SIZE
    ),
    createUsuariosRepository(client, session.tenant_id).list(),
  ]);

  return (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tablero de Tareas</h1>
      </div>
      <TaskBoardClient initialTasks={tasks} initialHasMore={hasMore} usuarios={usuarios} userRol={session.rol} />
    </>
  );
}
