/**
 * SC-03 — Helper centralizado para registrar actividad en user_activity_log.
 * Evita repetir createUsuariosRepository en cada server action.
 */
import { createAdminClient } from "@/lib/supabase/admin";

export interface ActivityInput {
  tenant_id:    string;
  user_id:      string;
  user_nombre:  string;
  accion:       string;
  modulo:       string;
  recurso_id?:  string;
  recurso_desc?: string;
  metadata?:    Record<string, unknown>;
}

export async function logActivity(input: ActivityInput): Promise<void> {
  const client = createAdminClient();
  await client.from("user_activity_log").insert(input);
}
