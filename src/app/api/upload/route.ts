import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";
import { logError } from "@/lib/logger";

const BUCKET = "documentos";

async function resolveSession() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
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

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, nombre, apellido")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    user_id:         user.id,
    tenant_id:       profile.tenant_id,
    nombre:          profile.nombre as string,
    nombre_completo: [profile.nombre, profile.apellido].filter(Boolean).join(" "),
  };
}

export async function POST(request: Request) {
  try {
    const session = await resolveSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Leer multipart form data
    const formData  = await request.formData();
    const file      = formData.get("file")       as File | null;
    const notaId    = formData.get("nota_id")    as string | null;
    const modulo    = formData.get("modulo")     as string | null;
    const recursoId = formData.get("recurso_id") as string | null;

    if (!file || !notaId || !modulo || !recursoId) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    // Generar path único
    const ext         = file.name.split(".").pop() ?? "";
    const uuid        = crypto.randomUUID();
    const storagePath = `${session.tenant_id}/${modulo}/${recursoId}/${uuid}.${ext}`;

    // Subir a Supabase Storage (server-side → sin CORS)
    const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const fileBuffer  = await file.arrayBuffer();
    const uploadRes   = await fetch(
      `${storageUrl}/storage/v1/object/${BUCKET}/${storagePath}`,
      {
        method:  "POST",
        headers: {
          "apikey":        serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type":  file.type || "application/octet-stream",
          "x-upsert":      "false",
        },
        body: new Uint8Array(fileBuffer),
      }
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.json().catch(() => ({})) as { message?: string };
      return NextResponse.json(
        { error: errBody.message ?? `Storage error ${uploadRes.status}` },
        { status: 500 }
      );
    }

    // Registrar metadata en BD
    const client = createAdminClient();
    const { data: doc, error: dbError } = await client
      .from("documentos")
      .insert({
        tenant_id:         session.tenant_id,
        modulo,
        recurso_id:        recursoId,
        nota_id:           notaId,
        nombre:            file.name,
        tipo_mime:         file.type || null,
        tamano:            fileBuffer.byteLength,
        storage_path:      storagePath,
        subido_por:        session.user_id,
        subido_por_nombre: session.nombre_completo || session.nombre,
      })
      .select()
      .single();

    if (dbError) {
      // Limpiar el archivo subido si el insert falla
      await fetch(`${storageUrl}/storage/v1/object/${BUCKET}/${storagePath}`, {
        method: "DELETE",
        headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
      });
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    await logActivity({
      tenant_id:   session.tenant_id,
      user_id:     session.user_id,
      user_nombre: session.nombre,
      accion:      "subir_documento",
      modulo,
      recurso_id:  recursoId,
      metadata:    { nota_id: notaId, nombre: file.name, tamano: fileBuffer.byteLength },
    });

    return NextResponse.json({ success: true, documento: doc });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    await logError(msg, { path: "/api/upload", action: "POST" });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
