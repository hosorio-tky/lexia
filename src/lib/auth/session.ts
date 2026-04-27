import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SessionInfo } from "@/types/users";

/**
 * Obtiene la sesión autenticada desde Server Components o Server Actions.
 * Redirige a /login si el usuario no está autenticado.
 * Usa React cache() para deduplicar la llamada dentro del mismo request.
 */
export const getSession = cache(async (): Promise<SessionInfo> => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, rol, nombre, apellido")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const nombre_completo = [profile.nombre, profile.apellido]
    .filter(Boolean)
    .join(" ");

  return {
    user_id:        user.id,
    email:          user.email!,
    tenant_id:      profile.tenant_id,
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
