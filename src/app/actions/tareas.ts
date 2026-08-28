"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTareasRepository } from "@/lib/repositories/tareas";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { getSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { sendTareaAsignada } from "@/lib/email/send";
import {
  TASK_STATUS_LABELS,
  TAREAS_PAGE_SIZE,
  type TaskStatus,
  type Task,
  type TareasFiltrosServidor,
} from "@/types/tasks";

// ─── Listado paginado (carga inicial acotada + "Cargar más") ──
export async function listarTareasPaginado(
  filtros: TareasFiltrosServidor | undefined,
  page: number
): Promise<{ items: Task[]; hasMore: boolean }> {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createTareasRepository(client, session.tenant_id);
  return repo.listPaginado(filtros, page, TAREAS_PAGE_SIZE);
}

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
  const estado        = (formData.get("estado")       as string) || "pendiente";
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
    estado,
    asignado_a,
    asignado_nombre,
    fecha_limite,
    modulo_origen,
    recurso_id,
    recurso_desc,
    created_by:        session.user_id,
    created_by_nombre: session.nombre,
  });

  // F11: Notificación al asignado (via activity log + email)
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

    // Email al asignado
    try {
      const { data: profile } = await client
        .from("profiles")
        .select("email, nombre, apellido")
        .eq("id", asignado_a)
        .single();
      if (profile?.email) {
        const destinatarioNombre = profile.apellido
          ? `${profile.nombre} ${profile.apellido}`
          : profile.nombre;
        await sendTareaAsignada(profile.email, {
          destinatarioNombre,
          asignadoPorNombre: session.nombre_completo || session.nombre,
          tituloTarea:       titulo,
          descripcion:       descripcion ?? null,
          prioridad,
          fechaLimite:       fecha_limite ?? null,
          moduloOrigen:      modulo_origen ?? null,
          recursoDesc:       recurso_desc ?? null,
          tareaId:           tarea.id,
        });
      }
    } catch (e) {
      console.error("[crearTarea] email error:", e);
    }
  }

  revalidatePath("/tareas");
  if (modulo_origen && recurso_id) {
    revalidatePath(`/${modulo_origen}/${recurso_id}`);
  }

  return { taskId: tarea.id };
}

const TAREA_FIELD_LABELS: Record<string, string> = {
  titulo:          "Título",
  descripcion:     "Descripción",
  prioridad:       "Prioridad",
  estado:          "Estado",
  asignado_nombre: "Asignado a",
  fecha_limite:    "Fecha límite",
};

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
  const estado      = (formData.get("estado")     as TaskStatus) || undefined;
  const asignado_a  = (formData.get("asignado_a") as string) || null;
  const asignado_nombre = (formData.get("asignado_nombre") as string) || null;
  const fecha_limite    = (formData.get("fecha_limite")    as string) || null;

  if (!titulo?.trim()) return { error: "El título es obligatorio" };

  const actual = await repo.getById(id);

  await repo.update(id, {
    titulo,
    descripcion,
    prioridad,
    estado,
    asignado_a,
    asignado_nombre,
    fecha_limite,
  });

  const input: Record<string, unknown> = { titulo, descripcion, prioridad, estado, asignado_nombre, fecha_limite };
  const cambios: Array<{ campo: string; de: string | null; a: string | null }> = [];
  if (actual) {
    const toStr = (key: string, v: unknown): string | null => {
      if (v === "" || v === null || v === undefined) return null;
      if (key === "estado") return TASK_STATUS_LABELS[v as TaskStatus] ?? String(v);
      return String(v);
    };
    for (const key of Object.keys(TAREA_FIELD_LABELS)) {
      const de = toStr(key, (actual as unknown as Record<string, unknown>)[key]);
      const a  = toStr(key, input[key]);
      if (de !== a) cambios.push({ campo: TAREA_FIELD_LABELS[key], de, a });
    }
  }

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "editar_tarea",
    modulo:       "tareas",
    recurso_id:   id,
    recurso_desc: titulo,
    metadata:     cambios.length > 0 ? { cambios } : undefined,
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

  const actual = await repo.getById(id);
  await repo.moverEstado(id, nuevoEstado);

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "cambiar_estado_tarea",
    modulo:       "tareas",
    recurso_id:   id,
    recurso_desc: actual?.titulo,
    metadata: {
      estado_anterior: actual?.estado ?? null,
      estado_nuevo:    nuevoEstado,
    },
  });

  revalidatePath("/tareas");
  revalidatePath(`/tareas/${id}`);
}

// ─── Eliminar tarea ────────────────────────────────────────────
export async function eliminarTarea(id: string): Promise<void> {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createTareasRepository(client, session.tenant_id);

  const actual = await repo.getById(id);
  await repo.delete(id);

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "eliminar_tarea",
    modulo:       "tareas",
    recurso_id:   id,
    recurso_desc: actual?.titulo,
  });

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

  await logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "agregar_comentario_tarea",
    modulo:       "tareas",
    recurso_id:   tareaId,
    metadata:     { contenido },
  });

  revalidatePath(`/tareas/${tareaId}`);
  return { success: true };
}
