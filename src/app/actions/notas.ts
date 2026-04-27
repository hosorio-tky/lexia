"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotasRepository } from "@/lib/repositories/notas";
import { createDocumentosRepository } from "@/lib/repositories/documentos";
import { getSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { logError } from "@/lib/logger";
import { indexDocument } from "@/lib/ai/indexer";
import type { Nota } from "@/lib/repositories/notas";

const BUCKET = "documentos";

/** Crea notificaciones para los usuarios mencionados en un contenido HTML */
async function notificarMenciones({
  html, tenantId, autorId, autorNombre, modulo, recursoId, recursoDesc,
}: {
  html: string; tenantId: string; autorId: string; autorNombre: string;
  modulo: string; recursoId: string; recursoDesc: string;
}) {
  const mentionIds = [...html.matchAll(/data-id="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((id) => id !== autorId);
  if (mentionIds.length === 0) return;
  const client = createAdminClient();
  await client.from("notificaciones").insert(
    mentionIds.map((userId) => ({
      tenant_id: tenantId, user_id: userId,
      titulo:    `${autorNombre} te mencionó en una nota`,
      mensaje:   `En ${modulo}: ${recursoDesc}`,
      tipo:      "in_app" as const,
      modulo, recurso_id: recursoId, recurso_desc: recursoDesc,
    }))
  );
}

// ─── Generar URL pre-firmada para subida directa desde el browser ─
export async function obtenerUrlSubida(input: {
  modulo:    string;
  recursoId: string;
  fileName:  string;
  fileExt:   string;
}): Promise<{ error?: string; signedUrl?: string; storagePath?: string }> {
  const session     = await getSession();
  const client      = createAdminClient();
  const uuid        = crypto.randomUUID();
  const storagePath = `${session.tenant_id}/${input.modulo}/${input.recursoId}/${uuid}.${input.fileExt}`;

  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "No se pudo generar la URL de subida" };
  }

  return { signedUrl: data.signedUrl, storagePath };
}

// ─── Crear nota (SIN archivos — el upload es directo al storage) ──
export async function crearNota(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; nota?: Nota }> {
  const session     = await getSession();
  try {
    const modulo      = formData.get("modulo")      as string;
    const recursoId   = formData.get("recurso_id")  as string;
    const contenido   = (formData.get("contenido")  as string)?.trim();
    const recursoDesc = (formData.get("recurso_desc") as string) || recursoId;

    if (!contenido || contenido === "<p></p>") {
      return { error: "La nota no puede estar vacía" };
    }

    const client    = createAdminClient();
    const notasRepo = createNotasRepository(client, session.tenant_id);

    const nota = await notasRepo.create({
      modulo,
      recurso_id:  recursoId,
      contenido,
      user_id:     session.user_id,
      user_nombre: session.nombre_completo || session.nombre,
    });

    await Promise.all([
      logActivity({
        tenant_id:   session.tenant_id,
        user_id:     session.user_id,
        user_nombre: session.nombre,
        accion:      "agregar_nota",
        modulo,
        recurso_id:  recursoId,
      }),
      notificarMenciones({
        html:        contenido,
        tenantId:    session.tenant_id,
        autorId:     session.user_id,
        autorNombre: session.nombre_completo || session.nombre,
        modulo,
        recursoId,
        recursoDesc,
      }),
    ]);

    revalidatePath(`/${modulo}/${recursoId}`);
    return { nota: { ...nota, documentos: [] } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      action:     "crearNota",
    });
    return { error: msg };
  }
}

// ─── Subir archivo vía Server Action (usa bodySizeLimit: 20mb configurado) ───
export async function subirArchivo(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session   = await getSession();
  try {
    const file      = formData.get("file")       as File | null;
    const notaId    = formData.get("nota_id")    as string | null;
    const modulo    = formData.get("modulo")     as string | null;
    const recursoId = formData.get("recurso_id") as string | null;

    if (!file || !notaId || !modulo || !recursoId) {
      return { error: "Faltan parámetros" };
    }

    const client = createAdminClient();

    // Generar path único en el storage
    const ext         = file.name.split(".").pop() ?? "";
    const uuid        = crypto.randomUUID();
    const storagePath = `${session.tenant_id}/${modulo}/${recursoId}/${uuid}.${ext}`;

    // Subir a Supabase Storage
    const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const fileBuffer = await file.arrayBuffer();

    const uploadRes = await fetch(
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
      const errMsg = errBody.message ?? `Storage error ${uploadRes.status}`;
      await logError(errMsg, {
        tenantId:   session.tenant_id,
        userId:     session.user_id,
        userNombre: session.nombre,
        action:     "subirArchivo",
        context:    { modulo: modulo ?? undefined, recursoId: recursoId ?? undefined },
      });
      return { error: errMsg };
    }

    // Registrar en BD
    const { error: dbError } = await client.from("documentos").insert({
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
    });

    if (dbError) {
      await fetch(`${storageUrl}/storage/v1/object/${BUCKET}/${storagePath}`, {
        method: "DELETE",
        headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
      });
      await logError(dbError.message, {
        tenantId:   session.tenant_id,
        userId:     session.user_id,
        userNombre: session.nombre,
        action:     "subirArchivo",
      });
      return { error: dbError.message };
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

    revalidatePath(`/${modulo}/${recursoId}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      action:     "subirArchivo",
    });
    return { error: msg };
  }
}

// ─── Registrar documento después del upload directo ───────────────
// Guarda el registro en la tabla documentos una vez el archivo ya está en Storage.
export async function registrarDocumento(input: {
  notaId:      string;
  modulo:      string;
  recursoId:   string;
  storagePath: string;
  nombre:      string;
  tipoMime:    string;
  tamano:      number;
}): Promise<{ error?: string; docId?: string; createdAt?: string }> {
  const session = await getSession();
  const client  = createAdminClient();

  const { data: docData, error } = await client.from("documentos").insert({
    tenant_id:         session.tenant_id,
    modulo:            input.modulo,
    recurso_id:        input.recursoId,
    nota_id:           input.notaId,
    nombre:            input.nombre,
    tipo_mime:         input.tipoMime || null,
    tamano:            input.tamano,
    storage_path:      input.storagePath,
    subido_por:        session.user_id,
    subido_por_nombre: session.nombre_completo || session.nombre,
  }).select("id, created_at").single();

  if (error) return { error: error.message };

  await logActivity({
    tenant_id:   session.tenant_id,
    user_id:     session.user_id,
    user_nombre: session.nombre,
    accion:      "subir_documento",
    modulo:      input.modulo,
    recurso_id:  input.recursoId,
    metadata:    { nota_id: input.notaId, nombre: input.nombre, tamano: input.tamano },
  });

  // Indexar el documento en background (no bloquea la respuesta)
  if (docData?.id) {
    indexDocument({
      documentoId: docData.id,
      tenantId:    session.tenant_id,
      storagePath: input.storagePath,
      mimeType:    input.tipoMime,
    }).then((r) => {
      if (r.skipped) console.log(`[registrarDocumento] indexing skipped: ${r.skipped}`);
      else console.log(`[registrarDocumento] indexed ${r.chunks} chunks`);
    }).catch((e) => console.error("[registrarDocumento] indexing error:", e));
  }

  revalidatePath(`/${input.modulo}/${input.recursoId}`);
  return { docId: docData?.id, createdAt: docData?.created_at };
}

// ─── Editar nota ──────────────────────────────────────────────────
export async function editarNota(
  id: string,
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session     = await getSession();
  try {
    const contenido   = (formData.get("contenido")   as string)?.trim();
    const modulo      = formData.get("modulo")        as string;
    const recursoId   = formData.get("recurso_id")    as string;
    const recursoDesc = (formData.get("recurso_desc") as string) || recursoId;

    if (!contenido || contenido === "<p></p>") {
      return { error: "La nota no puede estar vacía" };
    }

    const client = createAdminClient();
    await createNotasRepository(client, session.tenant_id).update(id, contenido);

    await Promise.all([
      notificarMenciones({
        html:        contenido,
        tenantId:    session.tenant_id,
        autorId:     session.user_id,
        autorNombre: session.nombre_completo || session.nombre,
        modulo,
        recursoId,
        recursoDesc,
      }),
    ]);

    await logActivity({
      tenant_id:   session.tenant_id,
      user_id:     session.user_id,
      user_nombre: session.nombre,
      accion:      "editar_nota",
      modulo,
      recurso_id:  recursoId,
      metadata:    { nota_id: id },
    });

    revalidatePath(`/${modulo}/${recursoId}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      action:     "editarNota",
    });
    return { error: msg };
  }
}

// ─── Eliminar nota ────────────────────────────────────────────────
export async function eliminarNota(
  id: string,
  modulo: string,
  recursoId: string
): Promise<void> {
  const session = await getSession();
  try {
    const client  = createAdminClient();
    await createNotasRepository(client, session.tenant_id).delete(id);

    await logActivity({
      tenant_id:   session.tenant_id,
      user_id:     session.user_id,
      user_nombre: session.nombre,
      accion:      "eliminar_nota",
      modulo,
      recurso_id:  recursoId,
      metadata:    { nota_id: id },
    });

    revalidatePath(`/${modulo}/${recursoId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      action:     "eliminarNota",
    });
    throw err;
  }
}

// ─── Eliminar documento de una nota ──────────────────────────────
export async function eliminarDocumentoDeNota(
  docId: string,
  storagePath: string,
  modulo: string,
  recursoId: string
): Promise<void> {
  const session = await getSession();
  try {
    const client  = createAdminClient();
    await createDocumentosRepository(client, session.tenant_id).delete(docId, storagePath);

    await logActivity({
      tenant_id:   session.tenant_id,
      user_id:     session.user_id,
      user_nombre: session.nombre,
      accion:      "eliminar_documento",
      modulo,
      recurso_id:  recursoId,
      metadata:    { documento_id: docId },
    });

    revalidatePath(`/${modulo}/${recursoId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      action:     "eliminarDocumentoDeNota",
    });
    throw err;
  }
}
