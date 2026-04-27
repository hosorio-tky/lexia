import AppShell from "@/components/layout/app-shell";
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
    <AppShell
      breadcrumb="Inicio › Tareas"
      title="Tablero de Tareas"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <TaskBoardClient initialTasks={tasks} usuarios={usuarios} />
    </AppShell>
  );
}
