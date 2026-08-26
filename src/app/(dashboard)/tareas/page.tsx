import { TaskBoardClient } from "@/components/tareas/task-board-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTareasRepository } from "@/lib/repositories/tareas";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const session = await getSession();
  const client  = createAdminClient();

  const [tasks, usuarios] = await Promise.all([
    createTareasRepository(client, session.tenant_id).list(),
    createUsuariosRepository(client, session.tenant_id).list(),
  ]);

  return (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tablero de Tareas</h1>
      </div>
      <TaskBoardClient initialTasks={tasks} usuarios={usuarios} />
    </>
  );
}
