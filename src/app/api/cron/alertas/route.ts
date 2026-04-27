import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificacionesRepository } from "@/lib/repositories/notificaciones";
import { logError } from "@/lib/logger";

/**
 * SC-05 — Alertas de vencimiento básico
 *
 * Invocado por Vercel Cron (vercel.json) o manualmente.
 * Genera notificaciones para permisos próximos a vencer.
 *
 * Protegido por CRON_SECRET env var (Vercel la inyecta automáticamente).
 */
export async function GET(request: Request) {
  // Verificar secreto de cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = createAdminClient();
    const repo = createNotificacionesRepository(client, "");

    // Genera alertas para todos los tenants (p_tenant_id = NULL)
    const generadas = await repo.generarAlertasVencimiento();

    return NextResponse.json({
      ok: true,
      generadas,
      timestamp: new Date().toISOString(),
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
