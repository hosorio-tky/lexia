"use client";

/**
 * Maneja el flujo de tokens por hash (#access_token=...) que genera Supabase
 * en emails de recuperación/invitación cuando no se usa PKCE.
 *
 * Flujo:
 * 1. Usuario hace clic en el link del email
 * 2. Supabase redirige a esta página con #access_token=...&type=recovery
 * 3. Esta página lee el hash, establece la sesión y redirige a /actualizar-contrasena
 */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { stampUltimoAcceso } from "@/app/actions/auth";

export default function AuthConfirmPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const hash   = window.location.hash.substring(1); // quita el "#"
    const params = new URLSearchParams(hash);

    const accessToken  = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type         = params.get("type");

    const supabase = createClient();

    if (!accessToken || !refreshToken) {
      // Sin token en el hash — puede ser un segundo click sobre un link ya usado.
      // Verificar si hay sesión activa con registro pendiente y redirigir directamente.
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.app_metadata?.must_change_password) {
          window.location.href = "/actualizar-contrasena";
        } else {
          window.location.href = "/login";
        }
      });
      return;
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(async ({ error }) => {
        if (error) {
          console.error("[auth/confirm] setSession error:", error.message);
          // Token inválido/expirado — verificar si aún hay sesión pendiente de registro.
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.app_metadata?.must_change_password) {
            window.location.href = "/actualizar-contrasena";
            return;
          }
          setErrorMsg(error.message);
          return;
        }
        // Hard navigation para que el servidor reciba las cookies recién escritas.
        // Para flujos de invitación/recuperación NO marcamos ultimo_acceso aquí —
        // el usuario aún no completó el registro. Se marca en actualizarContrasena.
        if (type === "recovery" || type === "invite") {
          window.location.href = "/actualizar-contrasena";
        } else {
          await stampUltimoAcceso();
          window.location.href = "/dashboard";
        }
      });
  }, []);

  if (errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-sm font-medium text-destructive">No se pudo verificar el enlace</p>
          <p className="text-xs text-muted-foreground">{errorMsg}</p>
          <a href="/login" className="text-sm text-primary underline underline-offset-2">
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground animate-pulse">Verificando…</p>
    </div>
  );
}
