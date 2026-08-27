import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES       = ["/login", "/registro", "/recuperar", "/actualizar-contrasena", "/mfa"];
const REDIRECT_IF_AUTHED = ["/login", "/registro", "/recuperar"];
const PUBLIC_PATHS      = ["/auth/callback", "/auth/confirm", "/_next", "/favicon.ico", "/api/"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // Rutas públicas — pasar siempre (antes de cualquier llamada de red)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return response;

  // Una sola llamada de red en Edge middleware.
  // El check de MFA se hace en el layout del dashboard (Node.js, sin timeout de Edge).
  const { data: { user } } = await supabase.auth.getUser();

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Usuario no autenticado intenta acceder al dashboard
  if (!user && !isAuthRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Usuario autenticado intenta acceder a login/registro/recuperar
  if (user && REDIRECT_IF_AUTHED.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Usuarios invitados que aún no establecieron contraseña.
  // app_metadata viene en los JWT claims — no hay round-trip extra.
  if (user && !isAuthRoute) {
    const mustSetPassword =
      !!user?.app_metadata?.must_change_password ||
      request.cookies.get("lexia_force_pwd")?.value === "1";
    if (mustSetPassword) {
      return NextResponse.redirect(new URL("/actualizar-contrasena", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
