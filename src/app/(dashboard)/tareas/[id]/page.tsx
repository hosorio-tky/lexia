import { notFound } from "next/navigation";
import { TaskDetailClient } from "@/components/tareas/task-detail-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTareasRepository } from "@/lib/repositories/tareas";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function TareaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, getSession()]);
  const client  = createAdminClient();
  const repo    = createTareasRepository(client, session.tenant_id);
  const uRepo   = createUsuariosRepository(client, session.tenant_id);

  const [tarea, comentarios, usuarios] = await Promise.all([
    repo.getById(id),
    repo.getComentarios(id),
    uRepo.list(),
  ]);

  if (!tarea) notFound();

  return (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{tarea.titulo}</h1>
      </div>
      <TaskDetailClient task={tarea} comentarios={comentarios} usuarios={usuarios} />
    </>
  );
}
