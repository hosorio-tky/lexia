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

export default function AuthConfirmPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const hash   = window.location.hash.substring(1); // quita el "#"
    const params = new URLSearchParams(hash);

    const accessToken  = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type         = params.get("type");

    if (!accessToken || !refreshToken) {
      // No hay token — ir al login
      window.location.href = "/login";
      return;
    }

    const supabase = createClient();

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          console.error("[auth/confirm] setSession error:", error.message);
          setErrorMsg(error.message);
          return;
        }
        // Hard navigation para que el servidor reciba las cookies recién escritas
        if (type === "recovery" || type === "invite") {
          window.location.href = "/actualizar-contrasena";
        } else {
          window.location.href = "/permisos";
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
