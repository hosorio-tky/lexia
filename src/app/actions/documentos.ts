"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDocumentosRepository } from "@/lib/repositories/documentos";
import { getSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";

export async function subirDocumento(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session   = await getSession();
  const modulo    = formData.get("modulo")     as string;
  const recursoId = formData.get("recurso_id") as string;
  const file      = formData.get("file")       as File | null;

  if (!file || file.size === 0) return { error: "Selecciona un archivo" };
  if (file.size > 20 * 1024 * 1024) return { error: "El archivo no puede superar 20 MB" };

  const ALLOWED = [
    "application/pdf",
    "image/jpeg", "image/png", "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword", "application/vnd.ms-excel",
  ];
  if (file.type && !ALLOWED.includes(file.type)) {
    return { error: "Tipo de archivo no permitido" };
  }

  const client = createAdminClient();
  const repo   = createDocumentosRepository(client, session.tenant_id);

  const doc = await repo.upload(
    modulo,
    recursoId,
    file,
    session.user_id,
    session.nombre_completo || session.nombre
  );

  await logActivity({
    tenant_id:   session.tenant_id,
    user_id:     session.user_id,
    user_nombre: session.nombre,
    accion:      "subir_documento",
    modulo,
    recurso_id:  recursoId,
    metadata:    {
      documento_id: doc.id,
      nombre:       file.name,
      tipo_mime:    file.type,
      tamano:       file.size,
    },
  });

  revalidatePath(`/${modulo}/${recursoId}`);
  return { success: true };
}

export async function eliminarDocumento(
  id: string,
  storagePath: string,
  modulo: string,
  recursoId: string
): Promise<void> {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createDocumentosRepository(client, session.tenant_id);
  await repo.delete(id, storagePath);

  await logActivity({
    tenant_id:   session.tenant_id,
    user_id:     session.user_id,
    user_nombre: session.nombre,
    accion:      "eliminar_documento",
    modulo,
    recurso_id:  recursoId,
    metadata:    { documento_id: id, storage_path: storagePath },
  });

  revalidatePath(`/${modulo}/${recursoId}`);
}

/** Genera una URL firmada válida 1h para descarga/preview */
export async function obtenerUrlFirmada(
  storagePath: string
): Promise<{ url?: string; error?: string }> {
  try {
    const session = await getSession();
    const client  = createAdminClient();
    const repo    = createDocumentosRepository(client, session.tenant_id);
    const url     = await repo.getSignedUrl(storagePath);
    return { url };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}
