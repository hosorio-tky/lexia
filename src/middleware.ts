import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES       = ["/login", "/registro", "/recuperar", "/actualizar-contrasena", "/mfa"];
const REDIRECT_IF_AUTHED = ["/login", "/registro", "/recuperar"];
const PUBLIC_PATHS      = ["/auth/callback", "/auth/confirm", "/_next", "/favicon.ico", "/api/"];

// Lexia es accesible desde varios dominios (histórico), pero las cookies de
// sesión de Supabase son por-host: iniciar sesión en uno no cuenta en los
// demás, lo que se siente como un logout aleatorio. Se redirige todo al
// dominio canónico — excepto /api/ (ya excluido arriba), para no romper
// invocaciones internas de Vercel (Cron Jobs) que pegan directo a ese host.
const CANONICAL_HOST     = "app.lex-ia.io";
const NON_CANONICAL_HOSTS = new Set([
  "www.lex-ia.io",
  "lexia-psi.vercel.app",
  "lexialegal.ai",
]);

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

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return response;

  const host = request.headers.get("host");
  if (host && NON_CANONICAL_HOSTS.has(host)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port  = "";
    return NextResponse.redirect(url, 308);
  }

  const { data: { session } } = await supabase.auth.getSession();

  // Supabase envuelve `session.user` en un Proxy que emite un console.warn
  // la PRIMERA vez que se lee cualquier propiedad string (no en getSession() en sí).
  // Se silencia solo durante esa lectura; try/finally garantiza restaurar
  // console.warn aunque el bloque retorne temprano (redirects).
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    const user = session?.user ?? null;

    const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

    if (!user && !isAuthRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (user && REDIRECT_IF_AUTHED.some((r) => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (user && !isAuthRoute) {
      const mustSetPassword =
        !!user?.app_metadata?.must_change_password ||
        request.cookies.get("lexia_force_pwd")?.value === "1";
      if (mustSetPassword) {
        return NextResponse.redirect(new URL("/actualizar-contrasena", request.url));
      }
    }

    return response;
  } finally {
    console.warn = origWarn;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
