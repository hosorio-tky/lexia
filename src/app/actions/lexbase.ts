"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLexbaseRepository } from "@/lib/repositories/lexbase";
import { getSession } from "@/lib/auth/session";
import { indexLexbaseDocument } from "@/lib/ai/lexbase-indexer";
import { logError } from "@/lib/logger";

const BUCKET = "documentos";

// ─── Subir documento ──────────────────────────────────────────
export async function subirDocumento(formData: FormData) {
  const session = await getSession();

  let docId: string | undefined;
  let indexStoragePath: string | undefined;
  let indexMimeType:    string | undefined;

  try {
    const client = createAdminClient();
    const repo   = createLexbaseRepository(client, session.tenant_id);

    const file = formData.get("file") as File | null;
    const titulo = (formData.get("titulo") as string)?.trim();

    if (!titulo) throw new Error("El título es obligatorio");

    // Parse tags from comma-separated string
    const tagsRaw = (formData.get("tags") as string) ?? "";
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const tieneReformas = formData.get("tiene_reformas") === "true";

    let storage_path: string | undefined;
    let tipo_mime: string | undefined;

    // 1. Subir archivo si fue proporcionado
    if (file && file.size > 0) {
      const ext = file.name.split(".").pop() ?? "pdf";
      const uuid = crypto.randomUUID();
      storage_path = `lexbase/${session.tenant_id}/${uuid}.${ext}`;
      tipo_mime = file.type;

      const fileBuffer = await file.arrayBuffer();
      const { error: uploadError } = await client.storage
        .from(BUCKET)
        .upload(storage_path, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw new Error(`Upload falló: ${uploadError.message}`);
    }

    // 2. Crear registro en BD
    const doc = await repo.create({
      tenant_id:            session.tenant_id,
      titulo,
      tipo:                 (formData.get("tipo") as string) || "Ley",
      categoria_id:         (formData.get("categoria_id") as string) || undefined,
      descripcion:          (formData.get("descripcion") as string) || undefined,
      pais:                 (formData.get("pais") as string) || "El Salvador",
      numero_oficial:       (formData.get("numero_oficial") as string) || undefined,
      organo_emisor:        (formData.get("organo_emisor") as string) || undefined,
      fecha_publicacion:    (formData.get("fecha_publicacion") as string) || undefined,
      fecha_vigencia:       (formData.get("fecha_vigencia") as string) || undefined,
      storage_path,
      tipo_mime,
      tiene_reformas:       tieneReformas,
      reformas_descripcion: (formData.get("reformas_descripcion") as string) || undefined,
      tags,
      created_by:           session.user_id,
      created_by_nombre:    session.nombre_completo || session.nombre,
    });

    docId            = doc.id;
    indexStoragePath = storage_path;
    indexMimeType    = tipo_mime;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       "/lexbase/nuevo",
      action:     "subirDocumento",
    });
    throw err;
  }

  // 3. Indexar — awaited after a successful DB insert so redirect() doesn't kill the Lambda
  if (indexStoragePath && indexMimeType && docId) {
    try {
      await indexLexbaseDocument({
        documentoId: docId,
        tenantId:    session.tenant_id,
        storagePath: indexStoragePath,
        mimeType:    indexMimeType,
      });
    } catch (err) {
      console.error(`[lexbase] Error indexando ${docId}:`, err instanceof Error ? err.message : err);
    }
  }

  revalidatePath("/lexbase");
  redirect(`/lexbase/${docId!}`);
}

// ─── Actualizar documento ──────────────────────────────────────
export async function actualizarDocumento(id: string, formData: FormData) {
  const session = await getSession();
  try {
    const client = createAdminClient();
    const repo   = createLexbaseRepository(client, session.tenant_id);

    const tagsRaw = (formData.get("tags") as string) ?? "";
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const tieneReformas = formData.get("tiene_reformas") === "true";

    await repo.update(id, {
      titulo:               (formData.get("titulo") as string)?.trim(),
      tipo:                 (formData.get("tipo") as string) || undefined,
      categoria_id:         (formData.get("categoria_id") as string) || null,
      descripcion:          (formData.get("descripcion") as string) || undefined,
      pais:                 (formData.get("pais") as string) || undefined,
      numero_oficial:       (formData.get("numero_oficial") as string) || undefined,
      organo_emisor:        (formData.get("organo_emisor") as string) || undefined,
      fecha_publicacion:    (formData.get("fecha_publicacion") as string) || undefined,
      fecha_vigencia:       (formData.get("fecha_vigencia") as string) || undefined,
      tiene_reformas:       tieneReformas,
      reformas_descripcion: (formData.get("reformas_descripcion") as string) || undefined,
      tags,
    });

    revalidatePath(`/lexbase/${id}`);
    revalidatePath("/lexbase");
    redirect(`/lexbase/${id}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       `/lexbase/${id}`,
      action:     "actualizarDocumento",
    });
    throw err;
  }
}

// ─── Eliminar documento ───────────────────────────────────────
export async function eliminarDocumento(id: string) {
  const session = await getSession();
  try {
    const client = createAdminClient();
    const repo   = createLexbaseRepository(client, session.tenant_id);

    // Soft delete — el archivo en storage se conserva hasta el hard delete
    await repo.delete(id, session.user_id, session.nombre_completo ?? session.nombre);

    revalidatePath("/lexbase");
    redirect("/lexbase");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       `/lexbase/${id}`,
      action:     "eliminarDocumento",
    });
    throw err;
  }
}

// ─── Crear categoría ──────────────────────────────────────────
export async function crearCategoria(formData: FormData) {
  const session = await getSession();
  try {
    const client = createAdminClient();
    const repo   = createLexbaseRepository(client, session.tenant_id);

    const nombre = (formData.get("nombre") as string)?.trim();
    if (!nombre) throw new Error("El nombre es obligatorio");

    await repo.createCategoria({
      tenant_id:   session.tenant_id,
      nombre,
      descripcion: (formData.get("descripcion") as string) || undefined,
      color:       (formData.get("color") as string) || "#6366f1",
    });

    revalidatePath("/lexbase");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       "/lexbase",
      action:     "crearCategoria",
    });
    throw err;
  }
}

// ─── Actualizar categoría ─────────────────────────────────────
export async function actualizarCategoria(id: string, formData: FormData) {
  const session = await getSession();
  try {
    const client = createAdminClient();
    const repo   = createLexbaseRepository(client, session.tenant_id);

    await repo.updateCategoria(id, {
      nombre:      (formData.get("nombre") as string)?.trim(),
      descripcion: (formData.get("descripcion") as string) || undefined,
      color:       (formData.get("color") as string) || undefined,
    });

    revalidatePath("/lexbase");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       "/lexbase",
      action:     "actualizarCategoria",
    });
    throw err;
  }
}

// ─── Eliminar categoría ───────────────────────────────────────
export async function eliminarCategoria(id: string) {
  const session = await getSession();
  try {
    const client = createAdminClient();
    const repo   = createLexbaseRepository(client, session.tenant_id);

    await repo.deleteCategoria(id);
    revalidatePath("/lexbase");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       "/lexbase",
      action:     "eliminarCategoria",
    });
    throw err;
  }
}

// ─── Re-indexar documento ─────────────────────────────────────
export async function reindexarDocumento(id: string) {
  const session = await getSession();
  try {
    const client = createAdminClient();
    const repo   = createLexbaseRepository(client, session.tenant_id);

    const doc = await repo.getById(id);
    if (!doc) throw new Error("Documento no encontrado");
    if (!doc.storage_path || !doc.tipo_mime) {
      throw new Error("El documento no tiene archivo para indexar");
    }

    const result = await indexLexbaseDocument({
      documentoId: doc.id,
      tenantId:    session.tenant_id,
      storagePath: doc.storage_path,
      mimeType:    doc.tipo_mime,
    });

    revalidatePath(`/lexbase/${id}`);
    revalidatePath("/lexbase");

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       `/lexbase/${id}`,
      action:     "reindexarDocumento",
    });
    throw err;
  }
}
