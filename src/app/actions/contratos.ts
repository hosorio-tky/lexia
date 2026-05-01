"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createContratosRepository } from "@/lib/repositories/contratos";
import { getSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { logError } from "@/lib/logger";
import { indexContrato } from "@/lib/ai/contrato-indexer";
import { sendCambioEstado } from "@/lib/email/send";
import type { ContratoEstado } from "@/types/contratos";

const BUCKET = "documentos";

// Campos legibles para el diff
const FIELD_LABELS: Record<string, string> = {
  titulo:             "Título",
  tipo:               "Tipo",
  numero:             "Número",
  descripcion:        "Descripción",
  contraparte_nombre: "Contraparte",
  contraparte_email:  "Email contraparte",
  valor:              "Valor",
  moneda:             "Moneda",
  fecha_inicio:       "Fecha inicio",
  fecha_fin:          "Fecha fin",
  fecha_firma:        "Fecha firma",
  responsable_nombre: "Responsable",
};

// ─── Crear contrato ────────────────────────────────────────────
export async function crearContrato(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string } | void> {
  const session = await getSession();
  try {
    const client = createAdminClient();
    const repo   = createContratosRepository(client, session.tenant_id);

    const valorRaw = (formData.get("valor") as string)?.trim();

    const input = {
      tenant_id:          session.tenant_id,
      titulo:             formData.get("titulo") as string,
      tipo:               formData.get("tipo") as string,
      numero:             (formData.get("numero") as string) || undefined,
      descripcion:        (formData.get("descripcion") as string) || undefined,
      contraparte_nombre: (formData.get("contraparte_nombre") as string) || undefined,
      contraparte_email:  (formData.get("contraparte_email") as string) || undefined,
      valor:              valorRaw ? parseFloat(valorRaw) : undefined,
      moneda:             (formData.get("moneda") as string) || undefined,
      fecha_inicio:       (formData.get("fecha_inicio") as string) || undefined,
      fecha_fin:          (formData.get("fecha_fin") as string) || undefined,
      fecha_firma:        (formData.get("fecha_firma") as string) || undefined,
      contenido_html:     (formData.get("contenido_html") as string) || undefined,
      responsable_nombre: (formData.get("responsable_nombre") as string) || undefined,
      storage_path:       (formData.get("storage_path") as string) || undefined,
      created_by:         session.user_id,
    };

    if (!input.titulo || !input.tipo) {
      return { error: "Título y tipo son obligatorios" };
    }

    const contrato = await repo.create(input);

    await logActivity({
      tenant_id:    session.tenant_id,
      user_id:      session.user_id,
      user_nombre:  session.nombre,
      accion:       "crear_contrato",
      modulo:       "contratos",
      recurso_id:   contrato.id,
      recurso_desc: input.titulo,
    });

    // Indexar contenido para RAG (fire-and-forget)
    indexContrato({
      contratoId:  contrato.id,
      tenantId:    session.tenant_id,
      html:        input.contenido_html,
      storagePath: input.storage_path,
    }).catch((err) => console.error("[crearContrato] indexación fallida:", err));

    revalidatePath("/contratos");
    redirect(`/contratos/${contrato.id}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // redirect throws — don't treat it as an error
    if (msg.includes("NEXT_REDIRECT")) throw err;
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       "/contratos",
      action:     "crearContrato",
    });
    return { error: msg };
  }
}

// ─── Editar contrato ───────────────────────────────────────────
export async function editarContrato(
  id: string,
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string } | void> {
  const session = await getSession();
  try {
    const client = createAdminClient();
    const repo   = createContratosRepository(client, session.tenant_id);

    const actual   = await repo.getById(id);
    const valorRaw = (formData.get("valor") as string)?.trim();

    const input: Record<string, string | number | null | undefined> = {
      titulo:             formData.get("titulo") as string,
      tipo:               formData.get("tipo") as string,
      numero:             (formData.get("numero") as string) || null,
      descripcion:        (formData.get("descripcion") as string) || null,
      contraparte_nombre: (formData.get("contraparte_nombre") as string) || null,
      contraparte_email:  (formData.get("contraparte_email") as string) || null,
      valor:              valorRaw ? parseFloat(valorRaw) : null,
      moneda:             (formData.get("moneda") as string) || undefined,
      fecha_inicio:       (formData.get("fecha_inicio") as string) || null,
      fecha_fin:          (formData.get("fecha_fin") as string) || null,
      fecha_firma:        (formData.get("fecha_firma") as string) || null,
      contenido_html:     (formData.get("contenido_html") as string) || null,
      responsable_nombre: (formData.get("responsable_nombre") as string) || null,
      storage_path:       (formData.get("storage_path") as string) || null,
      updated_by:         session.user_id,
    };

    // Calcular diff de campos para audit log
    const cambios: Array<{ campo: string; de: string | null; a: string | null }> = [];
    if (actual) {
      for (const key of Object.keys(FIELD_LABELS)) {
        const valorAntes   = (actual as unknown as Record<string, unknown>)[key];
        const valorDespues = input[key];
        const toStr = (v: unknown): string | null => {
          if (v === "" || v === null || v === undefined) return null;
          return String(v);
        };
        if (toStr(valorAntes) !== toStr(valorDespues)) {
          cambios.push({ campo: FIELD_LABELS[key], de: toStr(valorAntes), a: toStr(valorDespues) });
        }
      }
    }

    await repo.update(
      id,
      input,
      // Pasar autor para snapshot de versión
      { userId: session.user_id, nombre: session.nombre_completo || session.nombre }
    );

    await logActivity({
      tenant_id:    session.tenant_id,
      user_id:      session.user_id,
      user_nombre:  session.nombre,
      accion:       "editar_contrato",
      modulo:       "contratos",
      recurso_id:   id,
      recurso_desc: input.titulo as string | undefined,
      metadata:     cambios.length > 0 ? { cambios } : undefined,
    });

    // Re-indexar contenido para RAG (fire-and-forget)
    indexContrato({
      contratoId:  id,
      tenantId:    session.tenant_id,
      html:        input.contenido_html as string | null,
      storagePath: input.storage_path as string | null,
    }).catch((err) => console.error("[editarContrato] indexación fallida:", err));

    revalidatePath(`/contratos/${id}`);
    revalidatePath("/contratos");
    redirect(`/contratos/${id}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("NEXT_REDIRECT")) throw err;
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       `/contratos/${id}`,
      action:     "editarContrato",
    });
    return { error: msg };
  }
}

// ─── Cambiar estado (Kanban / workflow) ────────────────────────
export async function cambiarEstadoContrato(
  id: string,
  nuevoEstado: ContratoEstado
): Promise<void> {
  const session = await getSession();
  try {
    const client = createAdminClient();
    const repo   = createContratosRepository(client, session.tenant_id);

    const actual = await repo.getById(id);
    await repo.changeEstado(id, nuevoEstado);

    await logActivity({
      tenant_id:    session.tenant_id,
      user_id:      session.user_id,
      user_nombre:  session.nombre,
      accion:       "cambiar_estado_contrato",
      modulo:       "contratos",
      recurso_id:   id,
      recurso_desc: actual?.titulo,
      metadata: {
        estado_anterior: actual?.estado ?? null,
        estado_nuevo:    nuevoEstado,
      },
    });

    // Email al responsable
    if (actual?.responsable_id) {
      try {
        const client2 = createAdminClient();
        const { data: profile } = await client2
          .from("profiles")
          .select("email, nombre, apellido")
          .eq("id", actual.responsable_id)
          .single();
        if (profile?.email) {
          const destinatarioNombre = profile.apellido
            ? `${profile.nombre} ${profile.apellido}`
            : profile.nombre;
          await sendCambioEstado(profile.email, {
            destinatarioNombre,
            modulo:            "contratos",
            recursoNombre:     actual.titulo,
            estadoAnterior:    actual.estado ?? "—",
            estadoNuevo:       nuevoEstado,
            cambiadoPorNombre: session.nombre_completo || session.nombre,
            comentario:        null,
            recursoId:         id,
          });
        }
      } catch (e) {
        console.error("[cambiarEstadoContrato] email error:", e);
      }
    }

    revalidatePath(`/contratos/${id}`);
    revalidatePath("/contratos");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       `/contratos/${id}`,
      action:     "cambiarEstadoContrato",
    });
    throw err;
  }
}

// ─── Eliminar contrato ─────────────────────────────────────────
export async function eliminarContrato(id: string): Promise<void> {
  const session = await getSession();
  try {
    const client = createAdminClient();
    const repo   = createContratosRepository(client, session.tenant_id);

    const actual = await repo.getById(id);
    await repo.delete(id);

    await logActivity({
      tenant_id:    session.tenant_id,
      user_id:      session.user_id,
      user_nombre:  session.nombre,
      accion:       "eliminar_contrato",
      modulo:       "contratos",
      recurso_id:   id,
      recurso_desc: actual?.titulo,
    });

    revalidatePath("/contratos");
    redirect("/contratos");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("NEXT_REDIRECT")) throw err;
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       `/contratos/${id}`,
      action:     "eliminarContrato",
    });
    throw err;
  }
}

// ─── Generar URL pre-firmada para subida directa del PDF ───────
export async function obtenerUrlSubidaContrato(input: {
  contratoId: string;
  fileName:   string;
  fileExt:    string;
}): Promise<{ error?: string; signedUrl?: string; storagePath?: string }> {
  const session     = await getSession();
  const client      = createAdminClient();
  const uuid        = crypto.randomUUID();
  const storagePath = `${session.tenant_id}/contratos/${input.contratoId}/${uuid}.${input.fileExt}`;

  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "No se pudo generar la URL de subida" };
  }

  return { signedUrl: data.signedUrl, storagePath };
}
