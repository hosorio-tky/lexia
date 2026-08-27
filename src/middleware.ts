import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES        = ["/login", "/registro", "/recuperar", "/actualizar-contrasena", "/mfa"];
const REDIRECT_IF_AUTHED = ["/login", "/registro", "/recuperar"];
const PUBLIC_PATHS       = ["/auth/callback", "/auth/confirm", "/_next", "/favicon.ico", "/api/"];

interface JwtSession {
  userId: string;
  appMetadata: Record<string, unknown>;
  exp: number;
  hasRefreshToken: boolean;
}

// Lee el JWT de la cookie de Supabase sin invocar ningún método del SDK.
// Esto evita el warning "supabase.auth.getSession() could be insecure" en cada request.
// La verificación criptográfica real se hace en los server components con getUser().
function parseSessionCookie(request: NextRequest): JwtSession | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const projectRef  = supabaseUrl.split("//")[1]?.split(".")[0] ?? "";
  const prefix      = `sb-${projectRef}-auth-token`;

  const chunks = request.cookies
    .getAll()
    .filter((c) => c.name === prefix || c.name.startsWith(`${prefix}.`))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => c.value);

  if (!chunks.length) return null;

  try {
    const raw = chunks.join("");

    // @supabase/ssr >= 0.5 stores cookies as base64(JSON); older versions store raw JSON.
    let sessionData: Record<string, unknown>;
    try {
      sessionData = JSON.parse(atob(raw)) as Record<string, unknown>;
    } catch {
      sessionData = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    }

    const accessToken  = sessionData.access_token as string | undefined;
    const refreshToken = sessionData.refresh_token as string | undefined;

    if (!accessToken) return null;

    const b64 = accessToken.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!b64) return null;

    const payload = JSON.parse(
      Buffer.from(b64, "base64").toString("utf-8")
    ) as Record<string, unknown>;

    return {
      userId:          String(payload.sub ?? ""),
      appMetadata:     (payload.app_metadata as Record<string, unknown>) ?? {},
      exp:             Number(payload.exp ?? 0),
      hasRefreshToken: !!refreshToken,
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;

  // Rutas públicas — pasar siempre (antes de cualquier llamada de red)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return response;

  const now    = Math.floor(Date.now() / 1000);
  const parsed = parseSessionCookie(request);

  let userId:      string | null = null;
  let appMetadata: Record<string, unknown> = {};

  if (parsed && parsed.exp > now) {
    // Token válido — sin llamadas de red, sin SDK, sin warning
    userId      = parsed.userId;
    appMetadata = parsed.appMetadata;
  } else if (parsed?.hasRefreshToken) {
    // Token expirado pero hay refresh token — refrescar (ocurre ~1 vez/hora)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );
    const { data } = await supabase.auth.refreshSession();
    if (data.session) {
      userId      = data.session.user.id;
      appMetadata = data.session.user.app_metadata ?? {};
    }
  }

  const isAuthenticated = !!userId;
  const isAuthRoute     = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Usuario no autenticado intenta acceder al dashboard
  if (!isAuthenticated && !isAuthRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Usuario autenticado intenta acceder a login/registro/recuperar
  if (isAuthenticated && REDIRECT_IF_AUTHED.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Usuarios invitados que aún no establecieron contraseña
  if (isAuthenticated && !isAuthRoute) {
    const mustSetPassword =
      !!appMetadata.must_change_password ||
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
