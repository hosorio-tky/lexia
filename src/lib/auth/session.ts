import { cache } from "react";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SessionInfo } from "@/types/users";

// tenant_id/rol/nombre casi no cambian — se cachean 30s (admin client, no depende
// de cookies de request) para evitar un segundo round-trip de red en cada
// navegación del dashboard. getUser() (la verificación real de auth) sigue
// yendo a red siempre, sin caché.
const getCachedProfile = unstable_cache(
  async (userId: string) => {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("tenant_id, rol, nombre, apellido, tenants(nombre)")
      .eq("id", userId)
      .single();
    return profile;
  },
  ["session-profile"],
  { revalidate: 30 }
);

/**
 * Obtiene la sesión autenticada desde Server Components o Server Actions.
 * Redirige a /login si el usuario no está autenticado.
 * Usa React cache() para deduplicar la llamada dentro del mismo request.
 */
export const getSession = cache(async (): Promise<SessionInfo> => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCachedProfile(user.id);

  if (!profile) redirect("/login");

  const nombre_completo = [profile.nombre, profile.apellido]
    .filter(Boolean)
    .join(" ");

  const tenant = profile.tenants as unknown as { nombre: string } | null;

  return {
    user_id:        user.id,
    email:          user.email!,
    tenant_id:      profile.tenant_id,
    tenant_nombre:  tenant?.nombre ?? "",
    rol:            profile.rol as SessionInfo["rol"],
    nombre:         profile.nombre,
    nombre_completo,
  };
});

/**
 * Verifica que el usuario tenga uno de los roles permitidos.
 * Lanza error (no redirige) para usar en Server Actions.
 */
export function requireRole(
  session: SessionInfo,
  roles: SessionInfo["rol"][]
): void {
  if (!roles.includes(session.rol)) {
    throw new Error("No tienes permisos para realizar esta acción");
  }
}
