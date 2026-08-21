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

type PageState = "loading" | "link_used" | "error";

export default function AuthConfirmPage() {
  const [pageState, setPageState] = useState<PageState>("loading");

  useEffect(() => {
    const hash   = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken  = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type         = params.get("type");

    const supabase = createClient();

    if (!accessToken || !refreshToken) {
      // Sin token — segundo click sobre link ya usado o token expirado.
      // Intentar recuperar sesión activa antes de mostrar error.
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.app_metadata?.must_change_password) {
          window.location.href = "/actualizar-contrasena";
        } else {
          setPageState("link_used");
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
          setPageState("link_used");
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

  if (pageState === "link_used") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-sm font-medium">Este enlace ya fue utilizado</p>
          <p className="text-sm text-muted-foreground">
            Los enlaces de invitación son de un solo uso. Si aún no configuraste
            tu contraseña, usa la opción{" "}
            <strong>&ldquo;¿Olvidaste tu contraseña?&rdquo;</strong> en el inicio
            de sesión para recibir un nuevo enlace, o solicita a tu administrador
            que reenvíe la invitación.
          </p>
          <a
            href="/recuperar"
            className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Recibir nuevo enlace
          </a>
          <div>
            <a href="/login" className="text-sm text-muted-foreground underline underline-offset-2">
              Ir al inicio de sesión
            </a>
          </div>
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
