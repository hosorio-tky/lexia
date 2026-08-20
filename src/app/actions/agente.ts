"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { createPermisosRepository } from "@/lib/repositories/permisos";
import { createTareasRepository } from "@/lib/repositories/tareas";
import { logActivity } from "@/lib/activity";

function serializeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string") return e.message;
    if (typeof e.details === "string") return e.details;
    return JSON.stringify(err);
  }
  return String(err);
}

// ─── Tipos compartidos con el sidebar ────────────────────────────────────────

export interface PropuestaPermiso {
  nombre: string;
  tipo_nombre?: string;
  entidad_reguladora?: string;
  descripcion?: string;
  fecha_vencimiento?: string;
  base_legal?: string;
  riesgo_incumplimiento?: string;
}

export interface PropuestaTarea {
  titulo: string;
  descripcion?: string;
  prioridad: "baja" | "media" | "alta" | "urgente";
  fecha_limite?: string;
}

export interface PropuestaTareas {
  permiso_id?: string;
  permiso_nombre: string;
  tareas: PropuestaTarea[];
}

// ─── Crear permiso desde el agente ───────────────────────────────────────────

export async function crearPermisoDesdeChat(
  data: PropuestaPermiso
): Promise<{ permisoId?: string; error?: string }> {
  try {
    const session = await getSession();
    const client  = createAdminClient();
    const repo    = createPermisosRepository(client, session.tenant_id);

    // Buscar tipo_id por nombre si se proporcionó
    let tipo_id: string | undefined;
    if (data.tipo_nombre) {
      const { data: cat } = await client
        .from("catalogos")
        .select("id")
        .eq("tenant_id", session.tenant_id)
        .ilike("valor", data.tipo_nombre)
        .limit(1)
        .maybeSingle();
      tipo_id = cat?.id ?? undefined;
    }

    // Buscar entidad_reguladora_id por nombre si se proporcionó
    let entidad_reguladora_id: string | undefined;
    if (data.entidad_reguladora) {
      const { data: ent } = await client
        .from("catalogos")
        .select("id")
        .eq("tenant_id", session.tenant_id)
        .ilike("valor", data.entidad_reguladora)
        .limit(1)
        .maybeSingle();
      entidad_reguladora_id = ent?.id ?? undefined;
    }

    const permiso = await repo.create({
      tenant_id:            session.tenant_id,
      nombre:               data.nombre,
      tipo_id,
      entidad_reguladora_id,
      descripcion:          data.descripcion,
      fecha_vencimiento:    data.fecha_vencimiento,
      base_legal:           data.base_legal,
      riesgo_incumplimiento: data.riesgo_incumplimiento,
      responsable_nombre:   session.nombre_completo ?? session.nombre,
    });

    await logActivity({
      tenant_id:    session.tenant_id,
      user_id:      session.user_id,
      user_nombre:  session.nombre,
      accion:       "crear_permiso",
      modulo:       "permisos",
      recurso_id:   permiso.id,
      recurso_desc: data.nombre,
      metadata:     { origen: "agente_ia" },
    });

    revalidatePath("/permisos");
    return { permisoId: permiso.id };
  } catch (err) {
    return { error: serializeError(err) };
  }
}

// ─── Crear tareas desde el agente ────────────────────────────────────────────

export async function crearTareasDesdeChat(
  propuesta: PropuestaTareas
): Promise<{ count: number; error?: string }> {
  try {
    const session = await getSession();
    const client  = createAdminClient();
    const repo    = createTareasRepository(client, session.tenant_id);

    let count = 0;
    for (const t of propuesta.tareas) {
      await repo.create({
        titulo:            t.titulo,
        descripcion:       t.descripcion,
        prioridad:         t.prioridad,
        estado:            "pendiente",
        modulo_origen:     propuesta.permiso_id ? "permisos" : undefined,
        recurso_id:        propuesta.permiso_id ?? undefined,
        recurso_desc:      propuesta.permiso_nombre,
        fecha_limite:      t.fecha_limite,
        asignado_a:        session.user_id,
        asignado_nombre:   session.nombre_completo ?? session.nombre,
        created_by:        session.user_id,
        created_by_nombre: session.nombre,
      });
      count++;
    }

    revalidatePath("/tareas");
    if (propuesta.permiso_id) revalidatePath(`/permisos/${propuesta.permiso_id}`);

    return { count };
  } catch (err) {
    return { count: 0, error: serializeError(err) };
  }
}
