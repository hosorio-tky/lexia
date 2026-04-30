import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas de auth accesibles sin sesión
const AUTH_ROUTES  = ["/login", "/registro", "/recuperar", "/actualizar-contrasena"];
// Solo estas rutas redirigen al dashboard si el usuario YA está logueado
const REDIRECT_IF_AUTHED = ["/login", "/registro", "/recuperar"];
const PUBLIC_PATHS = ["/auth/callback", "/auth/confirm", "/_next", "/favicon.ico", "/api/"];

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

  // Refrescar la sesión (importante para el TTL del JWT)
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Rutas públicas — pasar siempre
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return response;
  }

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Usuario no autenticado intenta acceder al dashboard
  if (!user && !isAuthRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Usuario autenticado intenta acceder a login/registro (pero NO a /actualizar-contrasena)
  if (user && REDIRECT_IF_AUTHED.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/permisos", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
