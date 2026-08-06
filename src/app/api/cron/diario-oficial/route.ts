import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { indexLexbaseDocument } from "@/lib/ai/lexbase-indexer";
import { createLexbaseRepository } from "@/lib/repositories/lexbase";
import { logError } from "@/lib/logger";

const DO_API = "https://www.diariooficial.gob.sv/api/v1";
const DO_DOWNLOAD = "https://www.diariooficial.gob.sv/seleccion";
const BUCKET = "documentos";

interface EdicionDisponible {
  Id: string;
  FechaInicio: string;
  NombreArchivo: string;
  [key: string]: unknown;
}

async function fetchEdicionesDisponibles(year: number, month: number): Promise<EdicionDisponible[]> {
  const body = new URLSearchParams({ year: String(year), month: String(month) });
  const res = await fetch(`${DO_API}/diarios-disponibles`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Diario Oficial API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url    = new URL(request.url);
  const now    = new Date();
  const YEAR   = parseInt(url.searchParams.get("year")  ?? String(now.getFullYear()), 10);
  const MONTH  = parseInt(url.searchParams.get("month") ?? String(now.getMonth() + 1), 10);
  const DAY    = url.searchParams.get("day") ? parseInt(url.searchParams.get("day")!, 10) : null;

  try {
    const client = createAdminClient();
    const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // 1. Fetch available editions from Diario Oficial for the given year/month
    let ediciones = await fetchEdicionesDisponibles(YEAR, MONTH);
    if (!ediciones.length) {
      return NextResponse.json({ ok: true, mensaje: `Sin ediciones disponibles para ${YEAR}-${MONTH}` });
    }

    // Filter by day if provided (API only supports year+month; day filter is client-side)
    if (DAY !== null) {
      ediciones = ediciones.filter((e) => {
        const d = new Date(`${e.FechaInicio}T12:00:00Z`);
        return d.getUTCDate() === DAY;
      });
      if (!ediciones.length) {
        return NextResponse.json({ ok: true, mensaje: `Sin ediciones para ${YEAR}-${MONTH}-${DAY}` });
      }
    }

    // 2. Get all tenants
    const { data: tenants, error: tenantsError } = await client
      .from("tenants")
      .select("id");
    if (tenantsError) throw tenantsError;
    if (!tenants?.length) {
      return NextResponse.json({ ok: true, mensaje: "Sin tenants" });
    }

    const results: Array<{
      tenant_id: string;
      edicion_id: string;
      fecha: string;
      status: "ok" | "skipped" | "error";
      chunks?: number;
      error?: string;
    }> = [];

    for (const tenant of tenants) {
      const repo = createLexbaseRepository(client, tenant.id);

      // 3. Check which editions are already loaded for this tenant
      const { data: existing } = await client
        .from("lexbase_documentos")
        .select("numero_oficial")
        .eq("tenant_id", tenant.id)
        .like("numero_oficial", "DO-%");

      const existingIds = new Set((existing ?? []).map((e: { numero_oficial: string }) => e.numero_oficial));

      for (const edicion of ediciones) {
        const numeroOficial = `DO-${edicion.Id}`;

        if (existingIds.has(numeroOficial)) {
          results.push({ tenant_id: tenant.id, edicion_id: edicion.Id, fecha: edicion.FechaInicio, status: "skipped" });
          continue;
        }

        try {
          // 4. Download PDF
          const pdfRes = await fetch(`${DO_DOWNLOAD}/${edicion.Id}`);
          if (!pdfRes.ok) throw new Error(`Descarga fallida: HTTP ${pdfRes.status}`);
          const pdfBuffer = await pdfRes.arrayBuffer();

          // 5. Upload to Supabase Storage
          const filename = edicion.NombreArchivo || `DO-${edicion.Id}.pdf`;
          const storagePath = `lexbase/${tenant.id}/diario-oficial/${filename}`;

          const uploadRes = await fetch(
            `${storageUrl}/storage/v1/object/${BUCKET}/${storagePath}`,
            {
              method: "POST",
              headers: {
                "apikey":        serviceKey,
                "Authorization": `Bearer ${serviceKey}`,
                "Content-Type":  "application/pdf",
                "x-upsert":      "true",
              },
              body: new Uint8Array(pdfBuffer),
            }
          );
          if (!uploadRes.ok) {
            const errBody = await uploadRes.json().catch(() => ({})) as { message?: string };
            throw new Error(`Storage error ${uploadRes.status}: ${errBody.message ?? ""}`);
          }

          // 6. Create lexbase_documentos record
          const tituloFecha = new Date(`${edicion.FechaInicio}T12:00:00Z`).toLocaleDateString("es-SV", {
            day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
          });
          const doc = await repo.create({
            tenant_id:         tenant.id,
            titulo:            `Diario Oficial No. ${edicion.Id} — ${tituloFecha}`,
            tipo:              "Diario Oficial",
            pais:              "SV",
            numero_oficial:    numeroOficial,
            organo_emisor:     "Imprenta Nacional",
            fecha_publicacion: edicion.FechaInicio,
            storage_path:      storagePath,
            tipo_mime:         "application/pdf",
            tiene_reformas:    false,
            tags:              ["diario-oficial", "el-salvador"],
            created_by_nombre: "Sistema",
          });

          // 7. Vectorize
          const indexResult = await indexLexbaseDocument({
            documentoId: doc.id,
            tenantId:    tenant.id,
            storagePath,
            mimeType:    "application/pdf",
          });

          results.push({
            tenant_id:  tenant.id,
            edicion_id: edicion.Id,
            fecha:      edicion.FechaInicio,
            status:     "ok",
            chunks:     indexResult.chunks,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[cron/diario-oficial] tenant=${tenant.id} edicion=${edicion.Id}:`, msg);
          results.push({ tenant_id: tenant.id, edicion_id: edicion.Id, fecha: edicion.FechaInicio, status: "error", error: msg });
        }
      }
    }

    const summary = {
      ok:       results.filter(r => r.status === "ok").length,
      skipped:  results.filter(r => r.status === "skipped").length,
      errors:   results.filter(r => r.status === "error").length,
    };

    return NextResponse.json({ ok: true, resumen: summary, results, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[cron/diario-oficial] Error:", error);
    await logError(String(error), { path: "/api/cron/diario-oficial", action: "GET" });
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
