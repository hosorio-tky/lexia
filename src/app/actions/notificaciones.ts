"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificacionesRepository } from "@/lib/repositories/notificaciones";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/session";
import type { Notificacion } from "@/types/notifications";

// ─── Obtener recientes (para el Bell) ─────────────────────────
export async function obtenerNotificacionesRecientes(): Promise<Notificacion[]> {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createNotificacionesRepository(client, session.tenant_id);
  return repo.getRecientes(session.user_id);
}

// ─── Obtener todas con filtros (para /notificaciones) ─────────
export async function obtenerTodasLasNotificaciones(filters?: {
  leida?: boolean | null;
  modulo?: string;
}): Promise<Notificacion[]> {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createNotificacionesRepository(client, session.tenant_id);
  return repo.getAll(session.user_id, filters ?? {});
}

// ─── Marcar una como leída ────────────────────────────────────
export async function marcarComoLeida(id: string): Promise<void> {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createNotificacionesRepository(client, session.tenant_id);
  await repo.markAsRead(id);
  revalidatePath("/notificaciones");
}

// ─── Marcar todas como leídas ────────────────────────────────
export async function marcarTodosComoLeidos(): Promise<void> {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createNotificacionesRepository(client, session.tenant_id);
  await repo.markAllAsRead(session.user_id);
  revalidatePath("/notificaciones");
}

// ─── Eliminar una ─────────────────────────────────────────────
export async function eliminarNotificacion(id: string): Promise<void> {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createNotificacionesRepository(client, session.tenant_id);
  await repo.delete(id);
  revalidatePath("/notificaciones");
}

// ─── Generar alertas de vencimiento (solo admin) ──────────────
export async function generarAlertasVencimiento(): Promise<{
  count: number;
  error?: string;
}> {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "supervisor"]);
    const client = createAdminClient();
    const repo   = createNotificacionesRepository(client, session.tenant_id);
    const count  = await repo.generarAlertasVencimiento();
    revalidatePath("/notificaciones");
    return { count };
  } catch (e: unknown) {
    return { count: 0, error: (e as Error).message };
  }
}
