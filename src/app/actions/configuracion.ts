"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { getSession, requireRole } from "@/lib/auth/session";
import { indexDocument } from "@/lib/ai/indexer";
import { indexContrato } from "@/lib/ai/contrato-indexer";
import type { PlantillaAlerta } from "@/types/settings";

// ─── T06-F03: Personalización empresa ─────────────────────────
export async function actualizarEmpresa(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();
  requireRole(session, ["admin"]);

  const client = createAdminClient();
  const repo   = createConfiguracionRepository(client, session.tenant_id);

  const input = {
    nombre:      (formData.get("nombre")      as string) || undefined,
    descripcion: (formData.get("descripcion") as string) || undefined,
    sitio_web:   (formData.get("sitio_web")   as string) || undefined,
    industria:   (formData.get("industria")   as string) || undefined,
    pais:        (formData.get("pais")        as string) || undefined,
    color_marca: (formData.get("color_marca") as string) || undefined,
    logo_url:    (formData.get("logo_url")    as string) || undefined,
  };

  // Eliminar keys undefined para no sobreescribir con null
  const clean = Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined)
  );

  await repo.updateTenantSettings(clean);

  const uRepo = createUsuariosRepository(client, session.tenant_id);
  await uRepo.logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "actualizar_empresa",
    modulo:       "configuracion",
    recurso_desc: "Actualizó datos de la empresa",
  });

  revalidatePath("/configuracion/empresa");
  return { success: true };
}

// ─── T06-F01: Catálogos ────────────────────────────────────────
export async function crearCatalogo(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();
  requireRole(session, ["admin"]);

  const modulo   = formData.get("modulo")   as string;
  const tipo     = formData.get("tipo")     as string;
  const valor    = formData.get("valor")    as string;
  const etiqueta = formData.get("etiqueta") as string || valor;

  if (!modulo || !tipo || !valor) {
    return { error: "Módulo, tipo y valor son obligatorios" };
  }

  const client = createAdminClient();
  const repo   = createConfiguracionRepository(client, session.tenant_id);

  await repo.createCatalogo({ modulo, tipo, valor, etiqueta });

  const uRepo = createUsuariosRepository(client, session.tenant_id);
  await uRepo.logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "crear_catalogo",
    modulo:       "configuracion",
    recurso_desc: `${tipo}: ${etiqueta}`,
  });

  revalidatePath("/configuracion/catalogos");
  return { success: true };
}

export async function editarCatalogo(
  id: string,
  formData: FormData
): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);

  const client = createAdminClient();
  const repo   = createConfiguracionRepository(client, session.tenant_id);

  await repo.updateCatalogo(id, {
    etiqueta: formData.get("etiqueta") as string,
  });

  revalidatePath("/configuracion/catalogos");
}

export async function eliminarCatalogo(id: string): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);

  const client = createAdminClient();
  const repo   = createConfiguracionRepository(client, session.tenant_id);

  await repo.deleteCatalogo(id);

  revalidatePath("/configuracion/catalogos");
}

// ─── T06-F02: Plantillas de alerta ────────────────────────────
export async function crearPlantilla(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; nuevas?: PlantillaAlerta[] }> {
  const session = await getSession();
  requireRole(session, ["admin"]);

  const nombre   = formData.get("nombre")     as string;
  const modulo   = formData.get("modulo")     as string;
  const evento   = formData.get("evento")     as string;
  const diasStr  = formData.get("dias_antes") as string;
  const canales  = formData.getAll("canal")   as string[];

  if (!nombre || !modulo || !evento || canales.length === 0) {
    return { error: "Todos los campos son obligatorios" };
  }

  const dias_antes = diasStr ? parseInt(diasStr, 10) : undefined;

  const client = createAdminClient();
  const repo   = createConfiguracionRepository(client, session.tenant_id);

  // Crear un registro por cada canal seleccionado
  const nuevas: PlantillaAlerta[] = [];
  for (const canal of canales) {
    const p = await repo.createPlantilla({ nombre, modulo, evento, dias_antes, canal });
    nuevas.push(p);
  }

  const uRepo = createUsuariosRepository(client, session.tenant_id);
  await uRepo.logActivity({
    tenant_id:    session.tenant_id,
    user_id:      session.user_id,
    user_nombre:  session.nombre,
    accion:       "crear_plantilla_alerta",
    modulo:       "configuracion",
    recurso_desc: nombre,
  });

  revalidatePath("/configuracion/alertas");
  return { nuevas };
}

export async function eliminarPlantilla(id: string): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);

  const client = createAdminClient();
  const repo   = createConfiguracionRepository(client, session.tenant_id);

  await repo.deletePlantilla(id);
  revalidatePath("/configuracion/alertas");
}

export async function togglePlantilla(id: string, activo: boolean): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);

  const client = createAdminClient();
  const repo   = createConfiguracionRepository(client, session.tenant_id);

  await repo.updatePlantilla(id, { activo });
  revalidatePath("/configuracion/alertas");
}

// ─── Re-indexar documentos para RAG ──────────────────────────
export async function reindexarDocumentos(): Promise<{
  total: number;
  indexed: number;
  errors: string[];
}> {
  const session = await getSession();
  const client  = createAdminClient();

  // Documentos del tenant con storage_path válido
  const { data: docs } = await client
    .from("documentos")
    .select("id, storage_path, tipo_mime")
    .eq("tenant_id", session.tenant_id)
    .not("storage_path", "is", null)
    .not("storage_path", "eq", "");

  // Sólo los que todavía no tienen chunks
  const { data: existing } = await client
    .from("document_chunks")
    .select("documento_id")
    .eq("tenant_id", session.tenant_id);

  const indexedIds = new Set((existing ?? []).map((r: { documento_id: string }) => r.documento_id));
  const toIndex = (docs ?? []).filter((d: { id: string }) => !indexedIds.has(d.id)) as Array<{
    id: string; storage_path: string; tipo_mime: string;
  }>;

  let indexed = 0;
  const errors: string[] = [];
  // Excluir documentos sin mime type (test.pdf, imágenes sin tipo, etc.)
  const indexable = toIndex.filter((d) => d.tipo_mime && d.tipo_mime.trim() !== "");

  for (const doc of indexable) {
    try {
      const result = await indexDocument({
        documentoId: doc.id,
        tenantId:    session.tenant_id,
        storagePath: doc.storage_path,
        mimeType:    doc.tipo_mime,
      });
      if (result.skipped) {
        errors.push(`[${doc.tipo_mime}] ${result.skipped}`);
      } else {
        indexed++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${doc.id.slice(0, 8)}… (${doc.tipo_mime}): ${msg}`);
    }
  }

  return { total: indexable.length, indexed, errors };
}

// ─── Re-indexar contratos para RAG ───────────────────────────
export async function reindexarContratos(): Promise<{
  total: number;
  indexed: number;
  errors: string[];
}> {
  const session = await getSession();
  const client  = createAdminClient();

  // Contratos del tenant con contenido HTML o PDF
  const { data: contratos } = await client
    .from("contratos")
    .select("id, contenido_html, storage_path")
    .eq("tenant_id", session.tenant_id);

  // Contratos que ya tienen chunks (de cualquier fuente)
  const { data: existing } = await client
    .from("contrato_chunks")
    .select("contrato_id")
    .eq("tenant_id", session.tenant_id);

  const indexedIds = new Set((existing ?? []).map((r: { contrato_id: string }) => r.contrato_id));
  const toIndex = (contratos ?? []).filter(
    (c: { id: string; contenido_html: string | null; storage_path: string | null }) =>
      !indexedIds.has(c.id) && (c.contenido_html || c.storage_path)
  ) as Array<{ id: string; contenido_html: string | null; storage_path: string | null }>;

  let indexed = 0;
  const errors: string[] = [];

  for (const contrato of toIndex) {
    try {
      await indexContrato({
        contratoId:  contrato.id,
        tenantId:    session.tenant_id,
        html:        contrato.contenido_html,
        storagePath: contrato.storage_path,
      });
      indexed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${contrato.id.slice(0, 8)}…: ${msg}`);
    }
  }

  return { total: toIndex.length, indexed, errors };
}
