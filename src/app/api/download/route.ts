import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const BUCKET      = "documentos";
const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    STORAGE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs) {
          try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* Route Handler */ }
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: NextRequest) {
  try {
    // Autenticar
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const storagePath = searchParams.get("path");
    const forceDownload = searchParams.get("dl") === "1";

    if (!storagePath) {
      return NextResponse.json({ error: "Falta el parámetro path" }, { status: 400 });
    }

    // Obtener el archivo de Supabase Storage con el service role key
    const fileUrl = `${STORAGE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;
    const res = await fetch(fileUrl, {
      headers: {
        "apikey":        SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      return NextResponse.json(
        { error: body.message ?? `Storage error ${res.status}` },
        { status: res.status }
      );
    }

    // Determinar el nombre del archivo a partir del path
    const fileName = decodeURIComponent(storagePath.split("/").pop() ?? "archivo");
    const contentType = res.headers.get("Content-Type") ?? "application/octet-stream";

    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "private, no-cache",
    });

    if (forceDownload) {
      // Intentar recuperar el nombre original de la BD no es posible aquí,
      // así que usamos el nombre del path (UUID.ext). El componente pasa el nombre real.
      const displayName = searchParams.get("name") ?? fileName;
      headers.set(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(displayName)}`
      );
    } else {
      headers.set("Content-Disposition", `inline`);
    }

    return new NextResponse(res.body, { status: 200, headers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
