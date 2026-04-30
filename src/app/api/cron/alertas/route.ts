import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificacionesRepository } from "@/lib/repositories/notificaciones";
import { sendAlertaVencimiento } from "@/lib/email/send";
import { logError } from "@/lib/logger";

/**
 * SC-05 — Alertas de vencimiento
 *
 * Invocado por Vercel Cron (vercel.json) o manualmente.
 * 1. Genera notificaciones in-app (RPC existente).
 * 2. Envía emails a responsables con vencimientos en 0 / 7 / 15 / 30 días.
 *
 * Protegido por CRON_SECRET env var (Vercel la inyecta automáticamente).
 */

// Días exactos en que se envía el email de alerta (0 = ya venció hoy)
const DIAS_ALERTA = new Set([0, 7, 15, 30]);

export async function GET(request: Request) {
  // Verificar secreto de cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = createAdminClient();

    // ── 1. Notificaciones in-app (comportamiento original) ─────────
    const repo = createNotificacionesRepository(client, "");
    const generadas = await repo.generarAlertasVencimiento();

    // ── 2. Emails de alerta ────────────────────────────────────────
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 30);
    const limiteStr = limite.toISOString().split("T")[0];

    let emailsEnviados = 0;

    // Permisos próximos a vencer con responsable asignado
    const { data: permisos } = await client
      .from("permisos")
      .select("id, nombre, fecha_vencimiento, responsable_id")
      .not("fecha_vencimiento", "is", null)
      .not("responsable_id", "is", null)
      .lte("fecha_vencimiento", limiteStr)
      .in("estado", ["activo", "en_tramite", "provisional"]);

    for (const permiso of permisos ?? []) {
      const dias = diasRestantes(hoy, permiso.fecha_vencimiento!);
      if (!DIAS_ALERTA.has(dias)) continue;

      const { data: p } = await client
        .from("profiles").select("email, nombre, apellido")
        .eq("id", permiso.responsable_id).single();
      if (!p?.email) continue;

      await sendAlertaVencimiento(p.email, {
        destinatarioNombre: p.apellido ? `${p.nombre} ${p.apellido}` : p.nombre,
        modulo:             "permisos",
        recursoNombre:      permiso.nombre,
        recursoId:          permiso.id,
        fechaVencimiento:   permiso.fecha_vencimiento!,
        diasRestantes:      dias,
      }).catch((e) => console.error("[cron/alertas] email permiso:", e));
      emailsEnviados++;
    }

    // Contratos próximos a vencer con responsable asignado
    const { data: contratos } = await client
      .from("contratos")
      .select("id, titulo, fecha_fin, responsable_id")
      .not("fecha_fin", "is", null)
      .not("responsable_id", "is", null)
      .lte("fecha_fin", limiteStr)
      .in("estado", ["activo", "en_revision", "borrador"]);

    for (const contrato of contratos ?? []) {
      const dias = diasRestantes(hoy, contrato.fecha_fin!);
      if (!DIAS_ALERTA.has(dias)) continue;

      const { data: p } = await client
        .from("profiles").select("email, nombre, apellido")
        .eq("id", contrato.responsable_id).single();
      if (!p?.email) continue;

      await sendAlertaVencimiento(p.email, {
        destinatarioNombre: p.apellido ? `${p.nombre} ${p.apellido}` : p.nombre,
        modulo:             "contratos",
        recursoNombre:      contrato.titulo,
        recursoId:          contrato.id,
        fechaVencimiento:   contrato.fecha_fin!,
        diasRestantes:      dias,
      }).catch((e) => console.error("[cron/alertas] email contrato:", e));
      emailsEnviados++;
    }

    return NextResponse.json({
      ok: true,
      notificaciones_generadas: generadas,
      emails_enviados:          emailsEnviados,
      timestamp:                new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/alertas] Error:", error);
    await logError(String(error), { path: "/api/cron/alertas", action: "GET" });
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}

/** Días que faltan para `fechaStr` desde `hoy` (negativo = ya venció) */
function diasRestantes(hoy: Date, fechaStr: string): number {
  const fecha = new Date(fechaStr);
  fecha.setHours(0, 0, 0, 0);
  return Math.round((fecha.getTime() - hoy.getTime()) / 86_400_000);
}
