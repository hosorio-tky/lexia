import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Callback de Supabase Auth — intercambia el código por una sesión.
 * Usado por invitaciones, recuperación de contraseña y confirmación de email.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/permisos";

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Actualizar ultimo_acceso para que el estado deje de aparecer como "Pendiente"
    if (data.user) {
      const admin = createAdminClient();
      await admin
        .from("profiles")
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq("id", data.user.id);
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
