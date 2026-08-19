"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

export type ModuloSearch = "permisos" | "contratos" | "tareas" | "lexbase";

export interface SearchResultItem {
  id: string;
  titulo: string;
  modulo: ModuloSearch;
  href: string;
  estado?: string;
  tipo?: string;
  meta?: string;
  descripcion?: string;
  responsable?: string;
  fecha?: string;
  contraparte?: string;
}

export interface RecentItem {
  recurso_id: string;
  recurso_desc: string;
  modulo: string;
  href: string;
  created_at: string;
}

const SELECT_PERMISO_SEARCH = [
  "id, nombre, numero_expediente, responsable_nombre, fecha_vencimiento, descripcion",
  "tipo_cat:catalogos!tipo_id(valor)",
  "estado_ref:workflow_estados!estado_id(valor)",
].join(", ");

const SELECT_CONTRATO_SEARCH = [
  "id, titulo, numero, responsable_nombre, fecha_fin, descripcion, contraparte_nombre",
  "tipo_cat:catalogos!tipo_id(valor)",
  "estado_ref:workflow_estados!estado_id(valor)",
].join(", ");

export async function buscarGlobal(
  query: string,
  moduloFiltro?: ModuloSearch | "todo"
): Promise<SearchResultItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const session = await getSession();
  const client  = createAdminClient();

  const modulos: ModuloSearch[] =
    moduloFiltro && moduloFiltro !== "todo"
      ? [moduloFiltro]
      : ["permisos", "contratos", "tareas", "lexbase"];

  const buckets = await Promise.all(
    modulos.map(async (mod): Promise<SearchResultItem[]> => {
      if (mod === "permisos") {
        const { data } = await client
          .from("permisos")
          .select(SELECT_PERMISO_SEARCH)
          .eq("tenant_id", session.tenant_id)
          .is("deleted_at", null)
          .or(`nombre.ilike.%${q}%,numero_expediente.ilike.%${q}%`)
          .limit(8);

        return (data ?? []).map((r) => {
          const row = r as unknown as Record<string, unknown>;
          return {
            id:          row.id as string,
            titulo:      row.nombre as string,
            modulo:      "permisos" as const,
            href:        `/permisos/${row.id}`,
            estado:      (row.estado_ref as { valor?: string } | null)?.valor,
            tipo:        (row.tipo_cat   as { valor?: string } | null)?.valor,
            meta:        row.numero_expediente as string | undefined,
            descripcion: row.descripcion       as string | undefined,
            responsable: row.responsable_nombre as string | undefined,
            fecha:       row.fecha_vencimiento  as string | undefined,
          };
        });
      }

      if (mod === "contratos") {
        const { data } = await client
          .from("contratos")
          .select(SELECT_CONTRATO_SEARCH)
          .eq("tenant_id", session.tenant_id)
          .is("deleted_at", null)
          .or(`titulo.ilike.%${q}%,numero.ilike.%${q}%,contraparte_nombre.ilike.%${q}%`)
          .limit(8);

        return (data ?? []).map((r) => {
          const row = r as unknown as Record<string, unknown>;
          return {
            id:          row.id as string,
            titulo:      row.titulo as string,
            modulo:      "contratos" as const,
            href:        `/contratos/${row.id}`,
            estado:      (row.estado_ref as { valor?: string } | null)?.valor,
            tipo:        (row.tipo_cat   as { valor?: string } | null)?.valor,
            meta:        row.numero           as string | undefined,
            descripcion: row.descripcion      as string | undefined,
            responsable: row.responsable_nombre as string | undefined,
            fecha:       row.fecha_fin         as string | undefined,
            contraparte: row.contraparte_nombre as string | undefined,
          };
        });
      }

      if (mod === "tareas") {
        const { data } = await client
          .from("tareas")
          .select("id, titulo, estado, asignado_nombre, descripcion")
          .eq("tenant_id", session.tenant_id)
          .ilike("titulo", `%${q}%`)
          .limit(8);

        return (data ?? []).map((r) => {
          const row = r as Record<string, unknown>;
          return {
            id:          row.id as string,
            titulo:      row.titulo as string,
            modulo:      "tareas",
            href:        `/tareas/${row.id}`,
            estado:      row.estado      as string | undefined,
            descripcion: row.descripcion as string | undefined,
            responsable: row.asignado_nombre as string | undefined,
          };
        });
      }

      if (mod === "lexbase") {
        const { data } = await client
          .from("lexbase_documentos")
          .select("id, titulo, descripcion, numero_oficial, organo_emisor")
          .eq("tenant_id", session.tenant_id)
          .is("deleted_at", null)
          .or(`titulo.ilike.%${q}%,numero_oficial.ilike.%${q}%`)
          .limit(8);

        return (data ?? []).map((r) => {
          const row = r as Record<string, unknown>;
          return {
            id:          row.id as string,
            titulo:      row.titulo as string,
            modulo:      "lexbase",
            href:        `/lexbase/${row.id}`,
            meta:        row.numero_oficial as string | undefined,
            descripcion: row.descripcion    as string | undefined,
            responsable: row.organo_emisor  as string | undefined,
          };
        });
      }

      return [];
    })
  );

  return buckets.flat();
}

export async function obtenerItemPreview(id: string, modulo: ModuloSearch): Promise<SearchResultItem | null> {
  const session = await getSession();
  const client  = createAdminClient();

  if (modulo === "permisos") {
    const { data } = await client
      .from("permisos")
      .select(SELECT_PERMISO_SEARCH)
      .eq("tenant_id", session.tenant_id)
      .eq("id", id)
      .single();
    if (!data) return null;
    const row = data as unknown as Record<string, unknown>;
    return {
      id:          row.id as string,
      titulo:      row.nombre as string,
      modulo:      "permisos",
      href:        `/permisos/${row.id}`,
      estado:      (row.estado_ref as { valor?: string } | null)?.valor,
      tipo:        (row.tipo_cat   as { valor?: string } | null)?.valor,
      meta:        row.numero_expediente as string | undefined,
      descripcion: row.descripcion       as string | undefined,
      responsable: row.responsable_nombre as string | undefined,
      fecha:       row.fecha_vencimiento  as string | undefined,
    };
  }

  if (modulo === "contratos") {
    const { data } = await client
      .from("contratos")
      .select(SELECT_CONTRATO_SEARCH)
      .eq("tenant_id", session.tenant_id)
      .eq("id", id)
      .single();
    if (!data) return null;
    const row = data as unknown as Record<string, unknown>;
    return {
      id:          row.id as string,
      titulo:      row.titulo as string,
      modulo:      "contratos",
      href:        `/contratos/${row.id}`,
      estado:      (row.estado_ref as { valor?: string } | null)?.valor,
      tipo:        (row.tipo_cat   as { valor?: string } | null)?.valor,
      meta:        row.numero           as string | undefined,
      descripcion: row.descripcion      as string | undefined,
      responsable: row.responsable_nombre as string | undefined,
      fecha:       row.fecha_fin         as string | undefined,
      contraparte: row.contraparte_nombre as string | undefined,
    };
  }

  if (modulo === "tareas") {
    const { data } = await client
      .from("tareas")
      .select("id, titulo, estado, asignado_nombre, descripcion")
      .eq("tenant_id", session.tenant_id)
      .eq("id", id)
      .single();
    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      id:          row.id as string,
      titulo:      row.titulo as string,
      modulo:      "tareas",
      href:        `/tareas/${row.id}`,
      estado:      row.estado      as string | undefined,
      descripcion: row.descripcion as string | undefined,
      responsable: row.asignado_nombre as string | undefined,
    };
  }

  if (modulo === "lexbase") {
    const { data } = await client
      .from("lexbase_documentos")
      .select("id, titulo, descripcion, numero_oficial, organo_emisor")
      .eq("tenant_id", session.tenant_id)
      .eq("id", id)
      .single();
    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      id:          row.id as string,
      titulo:      row.titulo as string,
      modulo:      "lexbase",
      href:        `/lexbase/${row.id}`,
      meta:        row.numero_oficial as string | undefined,
      descripcion: row.descripcion    as string | undefined,
      responsable: row.organo_emisor  as string | undefined,
    };
  }

  return null;
}

export async function obtenerRecientes(): Promise<RecentItem[]> {
  const session = await getSession();
  const client  = createAdminClient();

  const { data } = await client
    .from("user_activity_log")
    .select("recurso_id, recurso_desc, modulo, created_at")
    .eq("tenant_id", session.tenant_id)
    .eq("user_id",   session.user_id)
    .not("recurso_id", "is", null)
    .in("modulo", ["permisos", "contratos", "tareas", "lexbase"])
    .order("created_at", { ascending: false })
    .limit(50);

  const seen    = new Set<string>();
  const recents: RecentItem[] = [];

  for (const row of (data ?? [])) {
    if (!row.recurso_id || seen.has(row.recurso_id)) continue;
    seen.add(row.recurso_id);

    recents.push({
      recurso_id:  row.recurso_id,
      recurso_desc: row.recurso_desc ?? "Sin nombre",
      modulo:       row.modulo,
      href:         `/${row.modulo}/${row.recurso_id}`,
      created_at:   row.created_at,
    });

    if (recents.length >= 6) break;
  }

  return recents;
}
