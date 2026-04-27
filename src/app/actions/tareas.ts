"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTareasRepository } from "@/lib/repositories/tareas";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { getSession } from "@/lib/auth/session";
import type { TaskStatus } from "@/types/tasks";

// ─── Crear tarea ───────────────────────────────────────────────
export async function crearTarea(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; taskId?: string }> {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createTareasRepository(client, session.tenant_id);

  const titulo        = formData.get("titulo")        as string;
  const descripcion   = (formData.get("descripcion")  as string) || undefined;
  const prioridad     = (formData.get("prioridad")    as string) || "media";
  const asignado_a    = (formData.get("asignado_a")   as string) || undefined;
  const asignado_nombre = (formData.get("asignado_nombre") as string) || undefined;
  const fecha_limite  = (formData.get("fecha_limite") as string) || undefined;
  const modulo_origen = (formData.get("modulo_origen") as string) || undefined;
  const recurso_id    = (formData.get("recurso_id")   as string) || undefined;
  const recurso_desc  = (formData.get("recurso_desc") as string) || undefined;

  if (!titulo?.trim()) return { error: "El título es obligatorio" };

  const tarea = await repo.create({
    titulo,
    descripcion,
    prioridad,
    asignado_a,
    asignado_nombre,
    fecha_limite,
    modulo_origen,
    recurso_id,
    recurso_desc,
    created_by:        session.user_id,
    created_by_nombre: session.nombre,
  });

  // F11: Notificación al asignado (via activity log)
  if (asignado_a && asignado_a !== session.user_id) {
    const uRepo = createUsuariosRepository(client, session.tenant_id);
    await uRepo.logActivity({
      tenant_id:    session.tenant_id,
      user_id:      asignado_a,
      user_nombre:  asignado_nombre ?? "Usuario",
      accion:       "tarea_asignada",
      modulo:       "tareas",
      recurso_id:   tarea.id,
      recurso_desc: `"${titulo}" asignada por ${session.nombre}`,
    });
  }

  revalidatePath("/tareas");
  if (modulo_origen && recurso_id) {
    revalidatePath(`/${modulo_origen}/${recurso_id}`);
  }

  return { taskId: tarea.id };
}

// ─── Editar tarea ──────────────────────────────────────────────
export async function editarTarea(
  id: string,
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createTareasRepository(client, session.tenant_id);

  const titulo      = formData.get("titulo")      as string;
  const descripcion = (formData.get("descripcion") as string) || undefined;
  const prioridad   = (formData.get("prioridad")  as string) || "media";
  const asignado_a  = (formData.get("asignado_a") as string) || null;
  const asignado_nombre = (formData.get("asignado_nombre") as string) || null;
  const fecha_limite    = (formData.get("fecha_limite")    as string) || null;

  if (!titulo?.trim()) return { error: "El título es obligatorio" };

  await repo.update(id, {
    titulo,
    descripcion,
    prioridad,
    asignado_a,
    asignado_nombre,
    fecha_limite,
  });

  revalidatePath("/tareas");
  revalidatePath(`/tareas/${id}`);
  return { success: true };
}

// ─── Cambiar estado (desde Kanban DnD o desde detalle) ────────
export async function cambiarEstadoTarea(
  id: string,
  nuevoEstado: TaskStatus
): Promise<void> {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createTareasRepository(client, session.tenant_id);

  await repo.moverEstado(id, nuevoEstado);

  revalidatePath("/tareas");
  revalidatePath(`/tareas/${id}`);
}

// ─── Eliminar tarea ────────────────────────────────────────────
export async function eliminarTarea(id: string): Promise<void> {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createTareasRepository(client, session.tenant_id);

  await repo.delete(id);

  revalidatePath("/tareas");
  redirect("/tareas");
}

// ─── Agregar comentario ────────────────────────────────────────
export async function agregarComentario(
  tareaId: string,
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session  = await getSession();
  const contenido = (formData.get("contenido") as string)?.trim();

  if (!contenido) return { error: "El comentario no puede estar vacío" };

  const client = createAdminClient();
  const repo   = createTareasRepository(client, session.tenant_id);

  await repo.addComentario({
    tarea_id:    tareaId,
    contenido,
    user_id:     session.user_id,
    user_nombre: session.nombre,
  });

  revalidatePath(`/tareas/${tareaId}`);
  return { success: true };
}
