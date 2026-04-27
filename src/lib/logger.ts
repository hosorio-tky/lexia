// Server-only logger that writes to system_logs table
import { createAdminClient } from "@/lib/supabase/admin";

interface LogPayload {
  tenantId?: string;
  userId?: string;
  userNombre?: string;
  path?: string;
  action?: string;
  context?: Record<string, unknown>;
}

export async function logError(message: string, payload?: LogPayload): Promise<void> {
  try {
    const client = createAdminClient();
    await client.from("system_logs").insert({
      tenant_id:   payload?.tenantId,
      level:       "error",
      message,
      path:        payload?.path,
      action:      payload?.action,
      user_id:     payload?.userId,
      user_nombre: payload?.userNombre,
      context:     payload?.context ?? null,
    });
  } catch { /* never throw from logger */ }
}

export async function logWarn(message: string, payload?: LogPayload): Promise<void> {
  try {
    const client = createAdminClient();
    await client.from("system_logs").insert({
      tenant_id:   payload?.tenantId,
      level:       "warn",
      message,
      path:        payload?.path,
      action:      payload?.action,
      user_id:     payload?.userId,
      user_nombre: payload?.userNombre,
      context:     payload?.context ?? null,
    });
  } catch { /* never throw from logger */ }
}

export async function logInfo(message: string, payload?: LogPayload): Promise<void> {
  try {
    const client = createAdminClient();
    await client.from("system_logs").insert({
      tenant_id:   payload?.tenantId,
      level:       "info",
      message,
      path:        payload?.path,
      action:      payload?.action,
      user_id:     payload?.userId,
      user_nombre: payload?.userNombre,
      context:     payload?.context ?? null,
    });
  } catch { /* never throw from logger */ }
}
