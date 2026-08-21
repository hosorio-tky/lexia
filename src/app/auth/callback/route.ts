import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Callback de Supabase Auth — intercambia el código PKCE por una sesión.
 * Usado por recuperación de contraseña y confirmación de email.
 *
 * Las cookies de sesión deben escribirse sobre el objeto response del redirect,
 * no sobre cookieStore — de lo contrario el navegador no las recibe.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/permisos";

  const redirectTo = new URL(next, requestUrl.origin);
  const response   = NextResponse.redirect(redirectTo);

  if (!code) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Escribir sobre la response del redirect para que el navegador las reciba
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.exchangeCodeForSession(code);

  // Stamp ultimo_acceso solo para usuarios con sesión establecida y sin registro pendiente.
  // Los usuarios invitados (must_change_password=true) lo reciben en actualizarContrasena.
  if (data.user && !data.user.app_metadata?.must_change_password) {
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ ultimo_acceso: new Date().toISOString() })
      .eq("id", data.user.id);
  }

  return response;
}
