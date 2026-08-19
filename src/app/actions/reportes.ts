"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

export interface FilaReporte {
  [key: string]: string | number | null | undefined;
}

// ─── 1. Permisos por vencer ───────────────────────────────────────────────────
export async function reportePermisosPorVencer(dias: number): Promise<FilaReporte[]> {
  const session = await getSession();
  const client  = createAdminClient();

  const hoy    = new Date();
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + dias);

  const { data, error } = await client
    .from("permisos")
    .select(`
      nombre, numero_expediente, responsable_nombre,
      fecha_vencimiento, tipo_cat:catalogos!tipo_id(valor),
      estado_ref:workflow_estados!estado_id(valor)
    `)
    .eq("tenant_id", session.tenant_id)
    .is("deleted_at", null)
    .gte("fecha_vencimiento", hoy.toISOString().split("T")[0])
    .lte("fecha_vencimiento", limite.toISOString().split("T")[0])
    .order("fecha_vencimiento", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return {
      "Nombre":             row.nombre as string,
      "Expediente":         row.numero_expediente as string ?? "",
      "Tipo":               (row.tipo_cat as { valor?: string } | null)?.valor ?? "",
      "Estado":             (row.estado_ref as { valor?: string } | null)?.valor ?? "",
      "Responsable":        row.responsable_nombre as string ?? "",
      "Fecha vencimiento":  row.fecha_vencimiento as string ?? "",
    };
  });
}

// ─── 2. Permisos por estado ───────────────────────────────────────────────────
export async function reportePermisosPorEstado(): Promise<FilaReporte[]> {
  const session = await getSession();
  const client  = createAdminClient();

  const { data, error } = await client
    .from("permisos")
    .select(`
      nombre, numero_expediente, responsable_nombre, fecha_vencimiento,
      tipo_cat:catalogos!tipo_id(valor),
      estado_ref:workflow_estados!estado_id(valor)
    `)
    .eq("tenant_id", session.tenant_id)
    .is("deleted_at", null)
    .order("estado_id")
    .order("nombre");

  if (error) throw error;

  return (data ?? []).map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return {
      "Estado":             (row.estado_ref as { valor?: string } | null)?.valor ?? "",
      "Nombre":             row.nombre as string,
      "Expediente":         row.numero_expediente as string ?? "",
      "Tipo":               (row.tipo_cat as { valor?: string } | null)?.valor ?? "",
      "Responsable":        row.responsable_nombre as string ?? "",
      "Fecha vencimiento":  row.fecha_vencimiento as string ?? "",
    };
  });
}

// ─── 3. Contratos por vencer ──────────────────────────────────────────────────
export async function reporteContratosPorVencer(dias: number): Promise<FilaReporte[]> {
  const session = await getSession();
  const client  = createAdminClient();

  const hoy    = new Date();
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + dias);

  const { data, error } = await client
    .from("contratos")
    .select(`
      titulo, numero, contraparte_nombre, responsable_nombre,
      fecha_fin, valor, moneda,
      tipo_cat:catalogos!tipo_id(valor),
      estado_ref:workflow_estados!estado_id(valor)
    `)
    .eq("tenant_id", session.tenant_id)
    .is("deleted_at", null)
    .gte("fecha_fin", hoy.toISOString().split("T")[0])
    .lte("fecha_fin", limite.toISOString().split("T")[0])
    .order("fecha_fin", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return {
      "Título":        row.titulo as string,
      "Número":        row.numero as string ?? "",
      "Contraparte":   row.contraparte_nombre as string ?? "",
      "Tipo":          (row.tipo_cat as { valor?: string } | null)?.valor ?? "",
      "Estado":        (row.estado_ref as { valor?: string } | null)?.valor ?? "",
      "Responsable":   row.responsable_nombre as string ?? "",
      "Fecha fin":     row.fecha_fin as string ?? "",
      "Valor":         row.valor as number ?? "",
      "Moneda":        row.moneda as string ?? "",
    };
  });
}

// ─── 4. Contratos por contraparte ─────────────────────────────────────────────
export async function reporteContratosPorContraparte(): Promise<FilaReporte[]> {
  const session = await getSession();
  const client  = createAdminClient();

  const { data, error } = await client
    .from("contratos")
    .select(`
      titulo, numero, contraparte_nombre, responsable_nombre,
      fecha_inicio, fecha_fin, valor, moneda,
      tipo_cat:catalogos!tipo_id(valor),
      estado_ref:workflow_estados!estado_id(valor)
    `)
    .eq("tenant_id", session.tenant_id)
    .is("deleted_at", null)
    .order("contraparte_nombre", { ascending: true })
    .order("fecha_fin",          { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return {
      "Contraparte":   row.contraparte_nombre as string ?? "(Sin contraparte)",
      "Título":        row.titulo as string,
      "Número":        row.numero as string ?? "",
      "Tipo":          (row.tipo_cat as { valor?: string } | null)?.valor ?? "",
      "Estado":        (row.estado_ref as { valor?: string } | null)?.valor ?? "",
      "Responsable":   row.responsable_nombre as string ?? "",
      "Fecha inicio":  row.fecha_inicio as string ?? "",
      "Fecha fin":     row.fecha_fin as string ?? "",
      "Valor":         row.valor as number ?? "",
      "Moneda":        row.moneda as string ?? "",
    };
  });
}

// ─── 5. Tareas vencidas o sin asignar ────────────────────────────────────────
export async function reporteTareasProblematicas(): Promise<FilaReporte[]> {
  const session = await getSession();
  const client  = createAdminClient();

  const hoy = new Date().toISOString().split("T")[0];

  const { data, error } = await client
    .from("tareas")
    .select("titulo, estado, prioridad, asignado_nombre, fecha_limite, modulo_origen, recurso_desc")
    .eq("tenant_id", session.tenant_id)
    .not("estado", "in", '("completada","cancelada")')
    .or(`fecha_limite.lt.${hoy},asignado_a.is.null`)
    .order("fecha_limite", { ascending: true, nullsFirst: false });

  if (error) throw error;

  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const vencida    = row.fecha_limite ? (row.fecha_limite as string) < hoy : false;
    const sinAsignar = !row.asignado_nombre;
    const motivo     = [vencida && "Vencida", sinAsignar && "Sin asignar"].filter(Boolean).join(", ");
    return {
      "Título":       row.titulo as string,
      "Estado":       row.estado as string ?? "",
      "Prioridad":    row.prioridad as string ?? "",
      "Asignado a":   row.asignado_nombre as string ?? "(Sin asignar)",
      "Fecha límite": row.fecha_limite as string ?? "",
      "Módulo":       row.modulo_origen as string ?? "",
      "Recurso":      row.recurso_desc as string ?? "",
      "Motivo":       motivo,
    };
  });
}

// ─── 6. Actividad por responsable ────────────────────────────────────────────
export async function reporteActividadPorResponsable(): Promise<FilaReporte[]> {
  const session = await getSession();
  const client  = createAdminClient();

  const [{ data: permisosData }, { data: contratosData }] = await Promise.all([
    client
      .from("permisos")
      .select("responsable_nombre, estado_ref:workflow_estados!estado_id(valor)")
      .eq("tenant_id", session.tenant_id),
    client
      .from("contratos")
      .select("responsable_nombre, estado_ref:workflow_estados!estado_id(valor)")
      .eq("tenant_id", session.tenant_id),
  ]);

  type Agg = {
    permisos_total: number;
    contratos_total: number;
  };

  const mapa = new Map<string, Agg>();

  const touch = (nombre: string) => {
    if (!mapa.has(nombre)) mapa.set(nombre, { permisos_total: 0, contratos_total: 0 });
    return mapa.get(nombre)!;
  };

  for (const r of permisosData ?? []) {
    const nombre = (r.responsable_nombre as string | null) ?? "(Sin asignar)";
    touch(nombre).permisos_total++;
  }

  for (const r of contratosData ?? []) {
    const nombre = (r.responsable_nombre as string | null) ?? "(Sin asignar)";
    touch(nombre).contratos_total++;
  }

  return [...mapa.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([nombre, agg]) => ({
      "Responsable":       nombre,
      "Permisos":          agg.permisos_total,
      "Contratos":         agg.contratos_total,
      "Total elementos":   agg.permisos_total + agg.contratos_total,
    }));
}
