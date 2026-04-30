"use server";

import { revalidatePath } from "next/cache";
import DOMPurify from "isomorphic-dompurify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createComentariosRepository } from "@/lib/repositories/comentarios";
import { getSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { sendMencion } from "@/lib/email/send";
import type { Comentario } from "@/lib/repositories/comentarios";

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "ul", "ol", "li",
      "blockquote", "code", "pre", "h1", "h2", "h3",
      "span", "a", "mark",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "data-type", "data-id", "data-label"],
    ALLOW_DATA_ATTR: false,
  });
}

/** Crea notificaciones (in-app + email) para los usuarios mencionados en HTML */
async function notificarMenciones({
  html,
  tenantId,
  autorId,
  autorNombre,
  modulo,
  recursoId,
  recursoDesc,
  contexto,
}: {
  html:        string;
  tenantId:    string;
  autorId:     string;
  autorNombre: string;
  modulo:      string;
  recursoId:   string;
  recursoDesc: string;
  contexto:    "comentario" | "nota";
}) {
  const mentionIds = [...html.matchAll(/data-id="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((id) => id !== autorId); // no notificar al propio autor

  if (mentionIds.length === 0) return;

  const client = createAdminClient();
  const rows = mentionIds.map((userId) => ({
    tenant_id:    tenantId,
    user_id:      userId,
    titulo:       `${autorNombre} te mencionó en un ${contexto}`,
    mensaje:      `En ${modulo}: ${recursoDesc}`,
    tipo:         "in_app" as const,
    modulo,
    recurso_id:   recursoId,
    recurso_desc: recursoDesc,
  }));

  await client.from("notificaciones").insert(rows);

  // Emails fire-and-forget
  client
    .from("profiles")
    .select("id, email, nombre, apellido")
    .in("id", mentionIds)
    .then(({ data }) => {
      if (!data) return;
      // Strip HTML tags to get plain-text fragment for email
      const fragmento = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      for (const profile of data) {
        if (!profile.email) continue;
        const destinatarioNombre = profile.apellido
          ? `${profile.nombre} ${profile.apellido}`
          : profile.nombre;
        sendMencion(profile.email, {
          destinatarioNombre,
          autorNombre,
          modulo,
          recursoNombre: recursoDesc,
          recursoId,
          fragmento,
          tipo: contexto,
        }).then(undefined, (e) => console.error("[notificarMenciones] email error:", e));
      }
    })
    .then(undefined, (e) => console.error("[notificarMenciones] profile lookup error:", e));
}

export async function crearComentario(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; comentario?: Comentario }> {
  const session    = await getSession();
  const modulo     = formData.get("modulo")      as string;
  const recursoId  = formData.get("recurso_id")  as string;
  const contenidoRaw = (formData.get("contenido")  as string)?.trim();
  const recursoDesc  = (formData.get("recurso_desc") as string) || recursoId;

  if (!contenidoRaw || contenidoRaw === "<p></p>") {
    return { error: "El comentario no puede estar vacío" };
  }

  const contenido = sanitizeHtml(contenidoRaw);

  const client = createAdminClient();
  const repo   = createComentariosRepository(client, session.tenant_id);

  const comentario = await repo.create({
    modulo,
    recurso_id:  recursoId,
    user_id:     session.user_id,
    user_nombre: session.nombre_completo || session.nombre,
    contenido,
  });

  await Promise.all([
    logActivity({
      tenant_id:   session.tenant_id,
      user_id:     session.user_id,
      user_nombre: session.nombre,
      accion:      "agregar_comentario",
      modulo,
      recurso_id:  recursoId,
      metadata:    { comentario_id: comentario.id },
    }),
    notificarMenciones({
      html:        contenido,
      tenantId:    session.tenant_id,
      autorId:     session.user_id,
      autorNombre: session.nombre_completo || session.nombre,
      modulo,
      recursoId,
      recursoDesc,
      contexto:    "comentario",
    }),
  ]);

  revalidatePath(`/${modulo}/${recursoId}`);
  return { comentario };
}

export async function editarComentario(
  id: string,
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session     = await getSession();
  const contenidoRaw = (formData.get("contenido")   as string)?.trim();
  const modulo       = formData.get("modulo")        as string;
  const recursoId    = formData.get("recurso_id")    as string;
  const recursoDesc  = (formData.get("recurso_desc") as string) || recursoId;

  if (!contenidoRaw || contenidoRaw === "<p></p>") {
    return { error: "El contenido no puede estar vacío" };
  }

  const contenido = sanitizeHtml(contenidoRaw);

  const client = createAdminClient();
  const repo   = createComentariosRepository(client, session.tenant_id);
  await repo.update(id, contenido);

  await Promise.all([
    logActivity({
      tenant_id:   session.tenant_id,
      user_id:     session.user_id,
      user_nombre: session.nombre,
      accion:      "editar_comentario",
      modulo,
      recurso_id:  recursoId,
      metadata:    { comentario_id: id },
    }),
    notificarMenciones({
      html:        contenido,
      tenantId:    session.tenant_id,
      autorId:     session.user_id,
      autorNombre: session.nombre_completo || session.nombre,
      modulo,
      recursoId,
      recursoDesc,
      contexto:    "comentario",
    }),
  ]);

  revalidatePath(`/${modulo}/${recursoId}`);
  return { success: true };
}

export async function eliminarComentario(
  id: string,
  modulo: string,
  recursoId: string
): Promise<void> {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createComentariosRepository(client, session.tenant_id);
  await repo.delete(id);

  await logActivity({
    tenant_id:   session.tenant_id,
    user_id:     session.user_id,
    user_nombre: session.nombre,
    accion:      "eliminar_comentario",
    modulo,
    recurso_id:  recursoId,
    metadata:    { comentario_id: id },
  });

  revalidatePath(`/${modulo}/${recursoId}`);
}
