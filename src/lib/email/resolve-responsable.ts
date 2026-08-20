import { createAdminClient } from "@/lib/supabase/admin";

interface ResponsableEmailResult {
  email: string;
  nombre: string;
}

/**
 * Resolves the email for a responsable.
 * If the responsable is linked to a user profile, the profile email is used
 * as the canonical source. Falls back to responsables.email for external responsables.
 */
export async function resolveResponsableEmail(
  responsableId: string
): Promise<ResponsableEmailResult | null> {
  const client = createAdminClient();

  const { data: resp, error: respErr } = await client
    .from("responsables")
    .select("email, nombre, user_id")
    .eq("id", responsableId)
    .single();

  if (!resp) {
    console.error("[resolveResponsableEmail] responsable not found:", { responsableId, error: respErr?.message });
    return null;
  }

  if (resp.user_id) {
    const { data: profile, error: profileErr } = await client
      .from("profiles")
      .select("email")
      .eq("id", resp.user_id)
      .single();
    const email = profile?.email ?? resp.email;
    console.log("[resolveResponsableEmail] via profile:", { responsableId, user_id: resp.user_id, profileEmail: profile?.email ?? null, fallbackEmail: resp.email, resolved: email ?? null, profileErr: profileErr?.message ?? null });
    if (!email) return null;
    return { email, nombre: resp.nombre };
  }

  console.log("[resolveResponsableEmail] external responsable:", { responsableId, email: resp.email ?? null });
  if (!resp.email) return null;
  return { email: resp.email, nombre: resp.nombre };
}
