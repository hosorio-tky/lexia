import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { verifyTrustedDeviceToken, TRUSTED_DEVICE_COOKIE } from "@/lib/trusted-device";

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

  // getSession() decodifica el JWT de la cookie localmente — sin llamada de red a Supabase.
  // getAuthenticatorAssuranceLevel() también es local (lee los claims AMR del JWT).
  // Ambas operaciones son <1ms → elimina el MIDDLEWARE_INVOCATION_TIMEOUT.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const { data: aal } = user
    ? await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    : { data: null };

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isMfaRoute  = pathname.startsWith("/mfa");

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

  // MFA y contraseña obligatoria — el orden importa:
  // si hay MFA enrollado pero sesión en AAL1, el challenge va PRIMERO porque
  // Supabase exige AAL2 para poder cambiar contraseña.
  if (user && !isAuthRoute) {
    // Usuarios invitados que aún no establecieron contraseña — redirigir ANTES de MFA.
    // must_change_password viene en los JWT claims (app_metadata) sin round-trip extra.
    const mustSetPassword =
      !!user?.app_metadata?.must_change_password ||
      request.cookies.get("lexia_force_pwd")?.value === "1";
    if (mustSetPassword) {
      return NextResponse.redirect(new URL("/actualizar-contrasena", request.url));
    }

    if (aal) {
      const hasMfaEnrolled = aal.nextLevel === "aal2";
      const mfaVerified    = aal.currentLevel === "aal2";

      if (hasMfaEnrolled && !mfaVerified) {
        // Verificar si el dispositivo ya fue marcado como confiado
        const trustedToken = request.cookies.get(TRUSTED_DEVICE_COOKIE)?.value;
        if (trustedToken && user?.id) {
          try {
            const deviceConfiado = await verifyTrustedDeviceToken(trustedToken, user.id);
            if (deviceConfiado) return response; // Saltear challenge
          } catch (e) {
            console.error("[middleware] trusted-device verify error:", e);
          }
        }
        // Factor enrollado + sesión AAL1 → challenge primero (sin excepción)
        if (!isMfaRoute) return NextResponse.redirect(new URL("/mfa/challenge", request.url));
      } else {
        // Sin factor enrollado → forzar setup
        if (!hasMfaEnrolled && !isMfaRoute) {
          return NextResponse.redirect(new URL("/mfa/setup", request.url));
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
