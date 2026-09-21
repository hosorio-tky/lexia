"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession, requireRole } from "@/lib/auth/session";
import { createPermisosRepository } from "@/lib/repositories/permisos";
import { createTareasRepository } from "@/lib/repositories/tareas";
import { logActivity } from "@/lib/activity";
import { extraerTextoDocumento } from "@/lib/ai/vision-extractor";
import { indexPermisoDocumento } from "@/lib/ai/permiso-indexer";

const BUCKET = "documentos";
const ARCHIVOS_PERMITIDOS = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

function serializeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string") return e.message;
    if (typeof e.details === "string") return e.details;
    return JSON.stringify(err);
  }
  return String(err);
}

// ─── Tipos compartidos con el sidebar ────────────────────────────────────────

export interface PropuestaPermiso {
  nombre: string;
  tipo_nombre?: string;
  entidad_reguladora?: string;
  descripcion?: string;
  fecha_vencimiento?: string;
  base_legal?: string;
  riesgo_incumplimiento?: string;
}

export interface PropuestaTarea {
  titulo: string;
  descripcion?: string;
  prioridad: "baja" | "media" | "alta" | "urgente";
  fecha_limite?: string;
}

export interface PropuestaTareas {
  permiso_id?: string;
  permiso_nombre: string;
  tareas: PropuestaTarea[];
}

/** Referencia al archivo ya subido (vía subirArchivoChat) que originó la propuesta. */
export interface ArchivoOrigen {
  storagePath: string;
  nombre:      string;
  mimeType:    string;
  tamano?:     number;
  texto?:      string;
}

// ─── Subir archivo para que la IA lo analice ─────────────────────────────────

export interface ArchivoExtraccion {
  texto: string;
  metodo: "texto" | "vision" | "mixto";
  paginasProcesadasVision: number;
  paginasTotales?: number;
}

export async function subirArchivoChat(formData: FormData): Promise<{
  archivo?: ArchivoOrigen;
  extraccion?: ArchivoExtraccion;
  error?: string;
}> {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "supervisor", "usuario"]);

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) return { error: "Selecciona un archivo" };
    if (file.size > 20 * 1024 * 1024) return { error: "El archivo no puede superar 20 MB" };
    if (file.type && !ARCHIVOS_PERMITIDOS.includes(file.type)) {
      return { error: "Solo se aceptan archivos PDF o Word (.docx/.doc)" };
    }

    const client = createAdminClient();
    const ext = file.name.split(".").pop() ?? "pdf";
    const storagePath = `${session.tenant_id}/chat-uploads/${crypto.randomUUID()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(storagePath, bytes, { contentType: file.type, upsert: false });
    if (uploadError) return { error: `No se pudo subir el archivo: ${uploadError.message}` };

    const archivo: ArchivoOrigen = {
      storagePath, nombre: file.name, mimeType: file.type, tamano: file.size,
    };

    try {
      const resultado = await extraerTextoDocumento(bytes, file.type);
      return { archivo, extraccion: resultado };
    } catch (err) {
      // No bloquear la subida si falla la extracción — el usuario puede
      // seguir describiendo el documento manualmente en el chat.
      console.error("[subirArchivoChat] error de extracción:", err);
      return {
        archivo,
        extraccion: {
          texto: "",
          metodo: "texto",
          paginasProcesadasVision: 0,
        },
        error: "El archivo se subió, pero no se pudo extraer su contenido automáticamente. Puedes describirlo manualmente.",
      };
    }
  } catch (err) {
    return { error: serializeError(err) };
  }
}

// ─── Crear permiso desde el agente ───────────────────────────────────────────

export async function crearPermisoDesdeChat(
  data: PropuestaPermiso,
  archivoOrigen?: ArchivoOrigen
): Promise<{ permisoId?: string; advertencias?: string[]; error?: string }> {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "supervisor", "usuario"]);

    const client = createAdminClient();
    const repo   = createPermisosRepository(client, session.tenant_id);
    const advertencias: string[] = [];

    // Buscar tipo_id por nombre si se proporcionó
    let tipo_id: string | undefined;
    if (data.tipo_nombre) {
      const { data: cat } = await client
        .from("catalogos")
        .select("id")
        .eq("tenant_id", session.tenant_id)
        .ilike("valor", data.tipo_nombre)
        .limit(1)
        .maybeSingle();
      tipo_id = cat?.id ?? undefined;
      if (!tipo_id) {
        advertencias.push(
          `El tipo "${data.tipo_nombre}" no existe en el catálogo de este tenant — el permiso se creó sin tipo asignado. Puedes agregarlo en Configuración → Catálogos.`
        );
      }
    }

    // Buscar entidad_reguladora_id por nombre si se proporcionó
    let entidad_reguladora_id: string | undefined;
    if (data.entidad_reguladora) {
      const { data: ent } = await client
        .from("catalogos")
        .select("id")
        .eq("tenant_id", session.tenant_id)
        .ilike("valor", data.entidad_reguladora)
        .limit(1)
        .maybeSingle();
      entidad_reguladora_id = ent?.id ?? undefined;
      if (!entidad_reguladora_id) {
        advertencias.push(
          `La entidad "${data.entidad_reguladora}" no existe en el catálogo de este tenant — el permiso se creó sin entidad reguladora asignada. Puedes agregarla en Configuración → Catálogos.`
        );
      }
    }

    const permiso = await repo.create({
      tenant_id:            session.tenant_id,
      nombre:               data.nombre,
      tipo_id,
      entidad_reguladora_id,
      descripcion:          data.descripcion,
      fecha_vencimiento:    data.fecha_vencimiento,
      base_legal:           data.base_legal,
      riesgo_incumplimiento: data.riesgo_incumplimiento,
      responsable_nombre:   session.nombre_completo ?? session.nombre,
    });

    await logActivity({
      tenant_id:    session.tenant_id,
      user_id:      session.user_id,
      user_nombre:  session.nombre,
      accion:       "crear_permiso",
      modulo:       "permisos",
      recurso_id:   permiso.id,
      recurso_desc: data.nombre,
      metadata:     { origen: "agente_ia" },
    });

    // Adjuntar el archivo original (si vino de un upload en el chat) e
    // indexarlo para futuras preguntas — fire-and-forget, no bloquea la
    // respuesta al usuario.
    if (archivoOrigen) {
      adjuntarEIndexarArchivo({
        permisoId:  permiso.id,
        tenantId:   session.tenant_id,
        userId:     session.user_id,
        userNombre: session.nombre_completo ?? session.nombre,
        archivo:    archivoOrigen,
      }).catch((err) => console.error("[crearPermisoDesdeChat] error al adjuntar archivo:", err));
    }

    revalidatePath("/permisos");
    return { permisoId: permiso.id, advertencias: advertencias.length ? advertencias : undefined };
  } catch (err) {
    return { error: serializeError(err) };
  }
}

/**
 * Mueve el archivo del staging temporal (chat-uploads/) al path definitivo
 * del permiso, crea el registro en `documentos`, e indexa su contenido en
 * permiso_chunks reutilizando el texto ya extraído (sin repetir OCR/visión).
 */
async function adjuntarEIndexarArchivo(input: {
  permisoId:  string;
  tenantId:   string;
  userId:     string;
  userNombre: string;
  archivo:    ArchivoOrigen;
}): Promise<void> {
  const client = createAdminClient();
  const ext = input.archivo.nombre.split(".").pop() ?? "pdf";
  const destino = `${input.tenantId}/permisos/${input.permisoId}/${crypto.randomUUID()}.${ext}`;

  const { error: copyError } = await client.storage
    .from(BUCKET)
    .copy(input.archivo.storagePath, destino);
  if (copyError) throw new Error(`No se pudo mover el archivo: ${copyError.message}`);

  await client.storage.from(BUCKET).remove([input.archivo.storagePath]);

  const { data: doc, error: dbError } = await client
    .from("documentos")
    .insert({
      tenant_id:         input.tenantId,
      modulo:            "permisos",
      recurso_id:        input.permisoId,
      nombre:            input.archivo.nombre,
      tipo_mime:         input.archivo.mimeType || null,
      tamano:            input.archivo.tamano ?? null,
      storage_path:      destino,
      subido_por:        input.userId,
      subido_por_nombre: input.userNombre,
    })
    .select("id")
    .single();
  if (dbError) throw new Error(`No se pudo registrar el documento: ${dbError.message}`);

  await logActivity({
    tenant_id:    input.tenantId,
    user_id:      input.userId,
    user_nombre:  input.userNombre,
    accion:       "subir_documento",
    modulo:       "permisos",
    recurso_id:   input.permisoId,
    metadata:     { origen: "agente_ia", documento_id: doc?.id, nombre: input.archivo.nombre },
  });

  await indexPermisoDocumento({
    permisoId:   input.permisoId,
    tenantId:    input.tenantId,
    storagePath: destino,
    mimeType:    input.archivo.mimeType,
    texto:       input.archivo.texto,
  });

  revalidatePath(`/permisos/${input.permisoId}`);
}

// ─── Crear tareas desde el agente ────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resuelve un permiso_id "confiable" a partir de lo que propuso la IA.
 * El modelo a veces inventa un placeholder (ej. "permiso_id_placeholder")
 * en vez de dejar el campo vacío cuando no conoce el ID real — sin esto,
 * ese texto se colaba directo a una columna uuid y tronaba con un error
 * crudo de Postgres. Si no es un UUID válido, se intenta resolver por
 * nombre exacto antes de descartarlo.
 */
async function resolverPermisoId(
  client: ReturnType<typeof createAdminClient>,
  tenantId: string,
  permisoId: string | undefined,
  permisoNombre: string
): Promise<string | undefined> {
  if (permisoId && UUID_RE.test(permisoId)) return permisoId;

  const { data } = await client
    .from("permisos")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("nombre", permisoNombre)
    .is("deleted_at", null)
    .maybeSingle();

  return data?.id;
}

export async function crearTareasDesdeChat(
  propuesta: PropuestaTareas
): Promise<{ count: number; error?: string }> {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "supervisor", "usuario"]);

    const client = createAdminClient();
    const repo   = createTareasRepository(client, session.tenant_id);

    const permisoId = await resolverPermisoId(
      client, session.tenant_id, propuesta.permiso_id, propuesta.permiso_nombre
    );

    let count = 0;
    for (const t of propuesta.tareas) {
      await repo.create({
        titulo:            t.titulo,
        descripcion:       t.descripcion,
        prioridad:         t.prioridad,
        estado:            "pendiente",
        modulo_origen:     permisoId ? "permisos" : undefined,
        recurso_id:        permisoId,
        recurso_desc:      propuesta.permiso_nombre,
        fecha_limite:      t.fecha_limite,
        asignado_a:        session.user_id,
        asignado_nombre:   session.nombre_completo ?? session.nombre,
        created_by:        session.user_id,
        created_by_nombre: session.nombre,
      });
      count++;
    }

    await logActivity({
      tenant_id:    session.tenant_id,
      user_id:      session.user_id,
      user_nombre:  session.nombre,
      accion:       "crear_tareas",
      modulo:       "tareas",
      recurso_id:   permisoId,
      recurso_desc: propuesta.permiso_nombre,
      metadata:     { origen: "agente_ia", cantidad: count },
    });

    revalidatePath("/tareas");
    if (permisoId) revalidatePath(`/permisos/${permisoId}`);

    return { count };
  } catch (err) {
    return { count: 0, error: serializeError(err) };
  }
}
