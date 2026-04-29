/**
 * Pipeline RAG: búsqueda vectorial + contexto estructurado de la BD.
 * Retorna el contexto listo para incluir en el prompt.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { generateEmbedding } from "./embeddings";

interface ChunkResult {
  contenido: string;
  similarity: number;
}

/** Elimina etiquetas HTML y normaliza espacios */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Busca chunks de documentos legales (Lexbase) */
export async function searchLexbaseChunks(
  tenantId: string,
  query: string,
  matchCount = 4
): Promise<ChunkResult[]> {
  const client = createAdminClient();
  const embedding = await generateEmbedding(query);

  const { data, error } = await client.rpc("match_lexbase_chunks", {
    p_tenant_id:   tenantId,
    p_embedding:   JSON.stringify(embedding),
    p_match_count: matchCount,
    p_threshold:   0.10,
  });

  if (error || !data) return [];

  return (data as (ChunkResult & { titulo?: string })[]).map((row) => ({
    contenido:  row.titulo ? `[${row.titulo}]\n${row.contenido}` : row.contenido,
    similarity: row.similarity,
  }));
}

/** Busca los chunks más relevantes de documentos generales.
 *  Si la búsqueda vectorial no supera el threshold mínimo (ej. queries
 *  meta como "resumir" o "listar cláusulas"), devuelve los top-K chunks
 *  sin filtro de similitud para garantizar contexto siempre. */
export async function searchDocumentChunks(
  tenantId: string,
  query: string,
  matchCount = 8
): Promise<ChunkResult[]> {
  const client = createAdminClient();
  const embedding = await generateEmbedding(query);
  const embStr = JSON.stringify(embedding);

  // Intento 1: búsqueda con threshold bajo
  const { data, error } = await client.rpc("match_document_chunks", {
    p_tenant_id:   tenantId,
    p_embedding:   embStr,
    p_match_count: matchCount,
    p_threshold:   0.10,
  });

  if (!error && data && (data as ChunkResult[]).length > 0) {
    return (data as ChunkResult[]).map((row) => ({
      contenido:  row.contenido,
      similarity: row.similarity,
    }));
  }

  // Fallback: fuerza los top-K chunks más cercanos sin threshold
  const { data: fallback } = await client.rpc("match_document_chunks", {
    p_tenant_id:   tenantId,
    p_embedding:   embStr,
    p_match_count: matchCount,
    p_threshold:   0.0,
  });

  if (!fallback) return [];
  return (fallback as ChunkResult[]).map((row) => ({
    contenido:  row.contenido,
    similarity: row.similarity,
  }));
}

/** Busca chunks vectorizados de contratos (HTML + PDF).
 *  Mismo patrón de fallback sin threshold que documentos generales. */
export async function searchContratoChunks(
  tenantId: string,
  query: string,
  matchCount = 6
): Promise<ChunkResult[]> {
  const client = createAdminClient();
  const embedding = await generateEmbedding(query);
  const embStr = JSON.stringify(embedding);

  // Intento 1: búsqueda con threshold bajo
  const { data, error } = await client.rpc("match_contrato_chunks", {
    p_tenant_id:   tenantId,
    p_embedding:   embStr,
    p_match_count: matchCount,
    p_threshold:   0.10,
  });

  if (!error && data && (data as ChunkResult[]).length > 0) {
    return (data as (ChunkResult & { fuente?: string })[]).map((row) => ({
      contenido:  row.contenido,
      similarity: row.similarity,
    }));
  }

  // Fallback: fuerza los top-K chunks más cercanos sin threshold
  const { data: fallback } = await client.rpc("match_contrato_chunks", {
    p_tenant_id:   tenantId,
    p_embedding:   embStr,
    p_match_count: matchCount,
    p_threshold:   0.0,
  });

  if (!fallback) return [];
  return (fallback as (ChunkResult & { fuente?: string })[]).map((row) => ({
    contenido:  row.contenido,
    similarity: row.similarity,
  }));
}

/** Obtiene contexto estructurado completo de la BD */
export async function getStructuredContext(tenantId: string): Promise<string> {
  const client = createAdminClient();
  const sections: string[] = [];

  // ── Permisos ───────────────────────────────────────────────
  const { data: permisos } = await client
    .from("permisos")
    .select("id, nombre, numero_expediente, estado, fecha_solicitud, fecha_emision, fecha_vencimiento, tipo, entidad_reguladora, base_legal, riesgo_incumplimiento, descripcion, responsable_nombre")
    .eq("tenant_id", tenantId)
    .order("fecha_vencimiento", { ascending: true, nullsFirst: false })
    .limit(50);

  if (permisos && permisos.length > 0) {
    const lines: string[] = ["## Permisos registrados"];
    for (const p of permisos) {
      const vence = p.fecha_vencimiento
        ? (() => {
            const dias = Math.ceil((new Date(p.fecha_vencimiento).getTime() - Date.now()) / 864e5);
            return `${p.fecha_vencimiento} (${dias > 0 ? `vence en ${dias} días` : `venció hace ${Math.abs(dias)} días`})`;
          })()
        : "sin fecha";
      lines.push(
        `- [ID:${p.id}] ${p.nombre}` +
        ` | Expediente: ${p.numero_expediente ?? "–"}` +
        ` | Estado: ${p.estado}` +
        ` | Tipo: ${p.tipo ?? "–"}` +
        ` | Entidad: ${p.entidad_reguladora ?? "–"}` +
        ` | Responsable: ${p.responsable_nombre ?? "–"}` +
        ` | Solicitud: ${p.fecha_solicitud ?? "–"}` +
        ` | Emisión: ${p.fecha_emision ?? "–"}` +
        ` | Vencimiento: ${vence}` +
        ` | Base legal: ${p.base_legal ?? "–"}` +
        ` | Riesgo: ${p.riesgo_incumplimiento ?? "–"}` +
        ` | Descripción: ${p.descripcion ?? "–"}`
      );
    }
    sections.push(lines.join("\n"));
  }

  // ── Historial de cambios de estado de permisos ─────────────
  const { data: historial } = await client
    .from("permisos_historial")
    .select("permiso_id, estado_anterior, estado_nuevo, comentario, changed_by_nombre, changed_at")
    .eq("tenant_id", tenantId)
    .order("changed_at", { ascending: false })
    .limit(30);

  if (historial && historial.length > 0) {
    const byPermiso: Record<string, typeof historial> = {};
    for (const h of historial) {
      if (!byPermiso[h.permiso_id]) byPermiso[h.permiso_id] = [];
      byPermiso[h.permiso_id].push(h);
    }
    const permisoNombres: Record<string, string> = {};
    for (const p of (permisos ?? [])) permisoNombres[p.id] = p.nombre;

    const lines: string[] = ["\n## Historial de cambios de estado (permisos)"];
    for (const [permisoId, cambios] of Object.entries(byPermiso)) {
      const nombre = permisoNombres[permisoId] ?? permisoId.slice(0, 8) + "…";
      for (const c of cambios) {
        const fecha = new Date(c.changed_at).toLocaleDateString("es-SV");
        const comentario = c.comentario ? ` — "${c.comentario}"` : "";
        lines.push(
          `- ${nombre}: ${c.estado_anterior ?? "inicio"} → ${c.estado_nuevo}` +
          ` (${fecha}, por ${c.changed_by_nombre ?? "sistema"}${comentario})`
        );
      }
    }
    sections.push(lines.join("\n"));
  }

  // ── Notas de permisos ──────────────────────────────────────
  const { data: notasPermisos } = await client
    .from("notas")
    .select("recurso_id, contenido, user_nombre, created_at")
    .eq("tenant_id", tenantId)
    .eq("modulo", "permisos")
    .order("created_at", { ascending: false })
    .limit(40);

  if (notasPermisos && notasPermisos.length > 0) {
    const permisoNombres: Record<string, string> = {};
    for (const p of (permisos ?? [])) permisoNombres[p.id] = p.nombre;

    const lines: string[] = ["\n## Notas en permisos"];
    for (const n of notasPermisos) {
      const nombre = permisoNombres[n.recurso_id] ?? n.recurso_id.slice(0, 8) + "…";
      const texto  = stripHtml(n.contenido).slice(0, 400);
      const fecha  = new Date(n.created_at).toLocaleDateString("es-SV");
      lines.push(`- [${nombre}] ${n.user_nombre} (${fecha}): ${texto}`);
    }
    sections.push(lines.join("\n"));
  }

  // ── Comentarios de permisos ────────────────────────────────
  const { data: comentariosPermisos } = await client
    .from("comentarios")
    .select("recurso_id, contenido, user_nombre, created_at")
    .eq("tenant_id", tenantId)
    .eq("modulo", "permisos")
    .order("created_at", { ascending: false })
    .limit(40);

  if (comentariosPermisos && comentariosPermisos.length > 0) {
    const permisoNombres: Record<string, string> = {};
    for (const p of (permisos ?? [])) permisoNombres[p.id] = p.nombre;

    const lines: string[] = ["\n## Comentarios en permisos"];
    for (const c of comentariosPermisos) {
      const nombre = permisoNombres[c.recurso_id] ?? c.recurso_id.slice(0, 8) + "…";
      const texto  = stripHtml(c.contenido).slice(0, 300);
      const fecha  = new Date(c.created_at).toLocaleDateString("es-SV");
      lines.push(`- [${nombre}] ${c.user_nombre} (${fecha}): ${texto}`);
    }
    sections.push(lines.join("\n"));
  }

  // ── Contratos ──────────────────────────────────────────────
  const { data: contratos } = await client
    .from("contratos")
    .select("id, titulo, numero, tipo, estado, responsable_nombre, contraparte_nombre, contraparte_email, valor, moneda, fecha_inicio, fecha_fin, fecha_firma, descripcion")
    .eq("tenant_id", tenantId)
    .order("fecha_fin", { ascending: true, nullsFirst: false })
    .limit(50);

  if (contratos && contratos.length > 0) {
    const lines: string[] = ["\n## Contratos registrados"];
    for (const c of contratos) {
      const vence = c.fecha_fin
        ? (() => {
            const dias = Math.ceil((new Date(c.fecha_fin).getTime() - Date.now()) / 864e5);
            return `${c.fecha_fin} (${dias > 0 ? `vence en ${dias} días` : `venció hace ${Math.abs(dias)} días`})`;
          })()
        : "sin fecha fin";
      const valor = c.valor != null
        ? `${c.moneda ?? "USD"} ${Number(c.valor).toLocaleString("es-SV", { minimumFractionDigits: 2 })}`
        : "–";
      lines.push(
        `- [ID:${c.id}] ${c.titulo}` +
        ` | Número: ${c.numero ?? "–"}` +
        ` | Tipo: ${c.tipo ?? "–"}` +
        ` | Estado: ${c.estado}` +
        ` | Responsable: ${c.responsable_nombre ?? "–"}` +
        ` | Contraparte: ${c.contraparte_nombre ?? "–"}` +
        (c.contraparte_email ? ` (${c.contraparte_email})` : "") +
        ` | Valor: ${valor}` +
        ` | Inicio: ${c.fecha_inicio ?? "–"}` +
        ` | Firma: ${c.fecha_firma ?? "–"}` +
        ` | Vencimiento: ${vence}` +
        (c.descripcion ? ` | Descripción: ${c.descripcion}` : "")
      );
    }
    sections.push(lines.join("\n"));
  }

  // ── Notas de contratos ─────────────────────────────────────
  const { data: notasContratos } = await client
    .from("notas")
    .select("recurso_id, contenido, user_nombre, created_at")
    .eq("tenant_id", tenantId)
    .eq("modulo", "contratos")
    .order("created_at", { ascending: false })
    .limit(40);

  if (notasContratos && notasContratos.length > 0) {
    const contratoTitulos: Record<string, string> = {};
    for (const c of (contratos ?? [])) contratoTitulos[c.id] = c.titulo;

    const lines: string[] = ["\n## Notas en contratos"];
    for (const n of notasContratos) {
      const titulo = contratoTitulos[n.recurso_id] ?? n.recurso_id.slice(0, 8) + "…";
      const texto  = stripHtml(n.contenido).slice(0, 400);
      const fecha  = new Date(n.created_at).toLocaleDateString("es-SV");
      lines.push(`- [${titulo}] ${n.user_nombre} (${fecha}): ${texto}`);
    }
    sections.push(lines.join("\n"));
  }

  // ── Comentarios de contratos ───────────────────────────────
  const { data: comentariosContratos } = await client
    .from("comentarios")
    .select("recurso_id, contenido, user_nombre, created_at")
    .eq("tenant_id", tenantId)
    .eq("modulo", "contratos")
    .order("created_at", { ascending: false })
    .limit(40);

  if (comentariosContratos && comentariosContratos.length > 0) {
    const contratoTitulos: Record<string, string> = {};
    for (const c of (contratos ?? [])) contratoTitulos[c.id] = c.titulo;

    const lines: string[] = ["\n## Comentarios en contratos"];
    for (const c of comentariosContratos) {
      const titulo = contratoTitulos[c.recurso_id] ?? c.recurso_id.slice(0, 8) + "…";
      const texto  = stripHtml(c.contenido).slice(0, 300);
      const fecha  = new Date(c.created_at).toLocaleDateString("es-SV");
      lines.push(`- [${titulo}] ${c.user_nombre} (${fecha}): ${texto}`);
    }
    sections.push(lines.join("\n"));
  }

  // ── Tareas (pendientes y en progreso) ──────────────────────
  const { data: tareas } = await client
    .from("tareas")
    .select("titulo, descripcion, estado, prioridad, fecha_limite, asignado_nombre, recurso_desc, modulo_origen, created_by_nombre")
    .eq("tenant_id", tenantId)
    .in("estado", ["pendiente", "en_progreso"])
    .order("fecha_limite", { ascending: true, nullsFirst: false })
    .limit(20);

  if (tareas && tareas.length > 0) {
    const lines: string[] = ["\n## Tareas activas"];
    for (const t of tareas) {
      const limite = t.fecha_limite
        ? new Date(t.fecha_limite).toLocaleDateString("es-SV")
        : "sin fecha";
      lines.push(
        `- ${t.titulo}` +
        ` | Estado: ${t.estado}` +
        ` | Prioridad: ${t.prioridad}` +
        ` | Asignada a: ${t.asignado_nombre ?? "–"}` +
        ` | Límite: ${limite}` +
        ` | Módulo: ${t.modulo_origen ?? "–"}` +
        ` | Recurso: ${t.recurso_desc ?? "–"}` +
        (t.descripcion ? ` | Descripción: ${t.descripcion}` : "")
      );
    }
    sections.push(lines.join("\n"));
  }

  return sections.join("\n");
}

/** Ensambla el contexto completo para el prompt */
export async function assembleContext(
  tenantId: string,
  query: string
): Promise<{ documentContext: string; structuredContext: string }> {
  const [chunks, lexbaseChunks, contratoChunks, structured] = await Promise.all([
    searchDocumentChunks(tenantId, query),
    searchLexbaseChunks(tenantId, query),
    searchContratoChunks(tenantId, query),
    getStructuredContext(tenantId),
  ]);

  const allChunks = [
    ...chunks.map((c, i) =>
      `[Documento interno — fragmento ${i + 1}, relevancia ${(c.similarity * 100).toFixed(0)}%]\n${c.contenido}`
    ),
    ...lexbaseChunks.map((c, i) =>
      `[Lexbase legal — fragmento ${i + 1}, relevancia ${(c.similarity * 100).toFixed(0)}%]\n${c.contenido}`
    ),
    ...contratoChunks.map((c, i) =>
      `[Contrato — fragmento ${i + 1}, relevancia ${(c.similarity * 100).toFixed(0)}%]\n${c.contenido}`
    ),
  ];

  const documentContext = allChunks.length > 0
    ? allChunks.join("\n\n---\n\n")
    : "";

  return { documentContext, structuredContext: structured };
}
