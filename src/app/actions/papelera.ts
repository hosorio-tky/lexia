"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession, requireRole } from "@/lib/auth/session";
import { createPermisosRepository } from "@/lib/repositories/permisos";
import { createContratosRepository } from "@/lib/repositories/contratos";
import { createLexbaseRepository } from "@/lib/repositories/lexbase";
import { logActivity } from "@/lib/activity";
import { logError } from "@/lib/logger";

const LEXBASE_BUCKET = "lexbase-documentos";

export type ModuloPapelera = "permisos" | "contratos" | "lexbase";

// ─── Listar eliminados ────────────────────────────────────────────────────────

export async function listarPapeleraPermisos() {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createPermisosRepository(client, session.tenant_id);
  return repo.listDeleted();
}

export async function listarPapeleraContratos() {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createContratosRepository(client, session.tenant_id);
  return repo.listDeleted();
}

export async function listarPapeleraLexbase() {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createLexbaseRepository(client, session.tenant_id);
  return repo.listDeleted();
}

// ─── Restaurar ───────────────────────────────────────────────────────────────

export async function restaurar(id: string, modulo: ModuloPapelera): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin", "supervisor", "usuario"]);
  const client  = createAdminClient();

  try {
    if (modulo === "permisos") {
      const repo = createPermisosRepository(client, session.tenant_id);
      await repo.restore(id);
      revalidatePath("/papelera");
      revalidatePath("/permisos");
    } else if (modulo === "contratos") {
      const repo = createContratosRepository(client, session.tenant_id);
      await repo.restore(id);
      revalidatePath("/papelera");
      revalidatePath("/contratos");
    } else {
      const repo = createLexbaseRepository(client, session.tenant_id);
      await repo.restore(id);
      revalidatePath("/papelera");
      revalidatePath("/lexbase");
    }

    await logActivity({
      tenant_id:   session.tenant_id,
      user_id:     session.user_id,
      user_nombre: session.nombre,
      accion:      `restaurar_${modulo}`,
      modulo,
      recurso_id:  id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       "/papelera",
      action:     "restaurar",
    });
    throw err;
  }
}

// ─── Eliminar definitivamente ────────────────────────────────────────────────

export async function eliminarDefinitivamente(id: string, modulo: ModuloPapelera): Promise<void> {
  const session = await getSession();
  requireRole(session, ["admin"]);
  const client  = createAdminClient();

  try {
    if (modulo === "permisos") {
      const repo = createPermisosRepository(client, session.tenant_id);
      await repo.hardDelete(id);
      revalidatePath("/papelera");
    } else if (modulo === "contratos") {
      const repo = createContratosRepository(client, session.tenant_id);
      await repo.hardDelete(id);
      revalidatePath("/papelera");
    } else {
      const repo = createLexbaseRepository(client, session.tenant_id);
      // Obtener storage_path antes de borrar (getById usa deleted_at=null, query directo)
      const { data } = await client
        .from("lexbase_documentos")
        .select("storage_path")
        .eq("id", id)
        .eq("tenant_id", session.tenant_id)
        .single();
      await repo.hardDelete(id);
      if (data?.storage_path) {
        await client.storage.from(LEXBASE_BUCKET).remove([data.storage_path]);
      }
      revalidatePath("/papelera");
    }

    await logActivity({
      tenant_id:   session.tenant_id,
      user_id:     session.user_id,
      user_nombre: session.nombre,
      accion:      `eliminar_definitivo_${modulo}`,
      modulo,
      recurso_id:  id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError(msg, {
      tenantId:   session.tenant_id,
      userId:     session.user_id,
      userNombre: session.nombre,
      path:       "/papelera",
      action:     "eliminarDefinitivamente",
    });
    throw err;
  }
}
