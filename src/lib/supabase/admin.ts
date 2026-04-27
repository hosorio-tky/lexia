import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service role key — bypasa RLS.
 * Usar SOLO en Server Components / Server Actions / Route Handlers.
 * NUNCA exponer al cliente.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
