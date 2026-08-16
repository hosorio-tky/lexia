import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAlertaVencimiento } from "@/lib/email/send";
import { createSuscripcionesRepository } from "@/lib/repositories/suscripciones";
import { logError } from "@/lib/logger";
import type { ResourceType } from "@/types/access-control";
import { ESTADOS_PERMISO, ESTADOS_CONTRATO } from "@/lib/constants/estados";

/**
 * SC-05 — Alertas de vencimiento
 *
 * Lee las plantillas_alerta activas de cada tenant para determinar:
 * - In-app: recursos que vencen dentro de los próximos `dias_antes` días
 * - Email:  recursos que vencen EXACTAMENTE en `dias_antes` días
 *
 * Corre vía Vercel Cron (vercel.json: 0 8 * * *) o manualmente.
 */

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = createAdminClient();
    const hoy    = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyStr = hoy.toISOString().split("T")[0];

    // ── 1. Leer todas las plantillas activas de vencimiento_proximo ──
    const { data: plantillaRows, error: pErr } = await client
      .from("plantillas_alerta")
      .select("id, tenant_id, modulo, canal, dias_antes, frecuencia_dias")
      .eq("evento", "vencimiento_proximo")
      .eq("activo", true);
    if (pErr) throw pErr;

    // Agrupar por tenant
    const byTenant = new Map<string, typeof plantillaRows>();
    for (const p of plantillaRows ?? []) {
      if (!byTenant.has(p.tenant_id)) byTenant.set(p.tenant_id, []);
      byTenant.get(p.tenant_id)!.push(p);
    }

    let inAppTotal   = 0;
    let emailsTotal  = 0;

    for (const [tenantId, plantillas] of byTenant) {
      const inAppPlantillas  = plantillas.filter((p) => p.canal === "in_app");
      const emailPlantillas  = plantillas.filter((p) => p.canal === "email");

      // ── IN-APP ────────────────────────────────────────────────────
      if (inAppPlantillas.length > 0) {
        // Usuarios elegibles del tenant
        const { data: usuarios } = await client
          .from("profiles")
          .select("id")
          .eq("tenant_id", tenantId)
          .in("rol", ["admin", "supervisor", "abogado"]);

        if (usuarios && usuarios.length > 0) {
          // Notificaciones de hoy (para dedup)
          const { data: hoyNotifs } = await client
            .from("notificaciones")
            .select("user_id, recurso_id")
            .eq("tenant_id", tenantId)
            .eq("tipo", "in_app")
            .gte("created_at", hoyStr);

          const yaEnviado = new Set(
            (hoyNotifs ?? []).map((n: { user_id: string; recurso_id: string }) =>
              `${n.user_id}:${n.recurso_id}`
            )
          );

          for (const plantilla of inAppPlantillas) {
            const dias        = plantilla.dias_antes ?? 30;
            const frecuencia  = plantilla.frecuencia_dias ?? 1;
            const limite  = addDays(hoy, dias).toISOString().split("T")[0];
            const { recursos: todosRecursos, nombreKey } = await fetchRecursos(
              client, tenantId, plantilla.modulo, hoyStr, limite
            );

            // Apply frequency filter: only notify when dias_restantes % frecuencia === 0
            const recursos = todosRecursos.filter((r) => {
              const restantes = diasRestantes(hoy, r.fecha!);
              return restantes % frecuencia === 0;
            });

            const toInsert: Record<string, unknown>[] = [];
            for (const recurso of recursos) {
              const diasRest = diasRestantes(hoy, recurso.fecha!);
              const nombre   = recurso[nombreKey] as string;
              for (const usuario of usuarios) {
                const key = `${usuario.id}:${recurso.id}`;
                if (yaEnviado.has(key)) continue;
                yaEnviado.add(key);
                toInsert.push({
                  tenant_id:   tenantId,
                  user_id:     usuario.id,
                  tipo:        "in_app",
                  modulo:      plantilla.modulo,
                  recurso_id:  recurso.id,
                  recurso_desc: nombre,
                  titulo:      diasRest <= 0
                    ? `${nombre} ha vencido`
                    : `${nombre} vence en ${diasRest} día${diasRest === 1 ? "" : "s"}`,
                  mensaje:     `Módulo: ${plantilla.modulo === "permisos" ? "Permisos" : "Contratos"}`,
                  leida:       false,
                });
              }
            }

            if (toInsert.length > 0) {
              const { error } = await client.from("notificaciones").insert(toInsert);
              if (error) console.error("[cron/alertas] in_app insert:", error.message);
              else inAppTotal += toInsert.length;
            }
          }
        }
      }

      // ── EMAIL ─────────────────────────────────────────────────────
      for (const plantilla of emailPlantillas) {
        const dias          = plantilla.dias_antes ?? 0;
        const frecuencia    = plantilla.frecuencia_dias ?? 1;
        // Fetch all resources within the window [tomorrow, hoy+dias]
        const desdeStr  = addDays(hoy, 1).toISOString().split("T")[0];
        const hastaStr  = addDays(hoy, dias).toISOString().split("T")[0];
        const { recursos: todosRecursos, nombreKey } = await fetchRecursos(
          client, tenantId, plantilla.modulo, desdeStr, hastaStr
        );

        // Only send today if dias_restantes is a multiple of frecuencia
        const recursos = todosRecursos.filter((r) => {
          const restantes = diasRestantes(hoy, r.fecha!);
          return restantes > 0 && restantes % frecuencia === 0;
        });

        const suscRepo = createSuscripcionesRepository(client, tenantId);
        const resourceType: ResourceType = plantilla.modulo === "permisos" ? "permiso" : "contrato";

        for (const recurso of recursos) {
          const nombre      = recurso[nombreKey] as string;
          const restantes   = diasRestantes(hoy, recurso.fecha!);
          const payload = {
            modulo:           plantilla.modulo,
            recursoNombre:    nombre,
            recursoId:        recurso.id,
            fechaVencimiento: recurso.fecha!,
            diasRestantes:    restantes,
          };

          // Emails ya enviados en este recurso (dedup)
          const emailsEnviados = new Set<string>();

          // Responsable
          if (recurso.responsable_id) {
            const { data: profile } = await client
              .from("profiles")
              .select("email, nombre, apellido")
              .eq("id", recurso.responsable_id)
              .single();
            if (profile?.email) {
              emailsEnviados.add(profile.email);
              await sendAlertaVencimiento(profile.email, {
                destinatarioNombre: profile.apellido
                  ? `${profile.nombre} ${profile.apellido}`
                  : profile.nombre,
                ...payload,
              }).catch((e) => console.error("[cron/alertas] email responsable:", e));
              emailsTotal++;
            }
          }

          // Suscriptores (sin duplicar al responsable)
          const suscEmails = await suscRepo.getSuscriptoresEmail(resourceType, recurso.id);
          for (const email of suscEmails) {
            if (emailsEnviados.has(email)) continue;
            emailsEnviados.add(email);
            await sendAlertaVencimiento(email, {
              destinatarioNombre: email,
              ...payload,
            }).catch((e) => console.error("[cron/alertas] email suscriptor:", e));
            emailsTotal++;
          }
        }
      }
    }

    return NextResponse.json({
      ok:                    true,
      notificaciones_in_app: inAppTotal,
      emails_enviados:       emailsTotal,
      tenants_procesados:    byTenant.size,
      timestamp:             new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/alertas] Error:", error);
    await logError(String(error), { path: "/api/cron/alertas", action: "GET" });
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function diasRestantes(hoy: Date, fechaStr: string): number {
  const fecha = new Date(fechaStr);
  fecha.setHours(0, 0, 0, 0);
  return Math.round((fecha.getTime() - hoy.getTime()) / 86_400_000);
}

async function fetchRecursos(
  client: ReturnType<typeof createAdminClient>,
  tenantId: string,
  modulo: string,
  desde: string,
  hasta: string,
): Promise<{
  recursos: Array<{ id: string; fecha: string | null; responsable_id?: string | null; [key: string]: unknown }>;
  nombreKey: string;
}> {
  if (modulo === "permisos") {
    const { data } = await client
      .from("permisos")
      .select("id, nombre, fecha_vencimiento, responsable_id")
      .eq("tenant_id", tenantId)
      .gte("fecha_vencimiento", desde)
      .lte("fecha_vencimiento", hasta)
      .in("estado_id", [
        ESTADOS_PERMISO.CREADO,
        ESTADOS_PERMISO.EN_GESTION,
        ESTADOS_PERMISO.PRESENTADO,
        ESTADOS_PERMISO.CON_PERMISO_PROVISIONAL,
        ESTADOS_PERMISO.APROBADO,
        ESTADOS_PERMISO.ACTUALIZAR_PERMISO,
      ]);
    return {
      recursos: (data ?? []).map((r) => ({ ...r, fecha: r.fecha_vencimiento })),
      nombreKey: "nombre",
    };
  } else {
    const { data } = await client
      .from("contratos")
      .select("id, titulo, fecha_fin, responsable_id")
      .eq("tenant_id", tenantId)
      .gte("fecha_fin", desde)
      .lte("fecha_fin", hasta)
      .in("estado_id", [
        ESTADOS_CONTRATO.EN_REVISION,
        ESTADOS_CONTRATO.PENDIENTE_FIRMA,
        ESTADOS_CONTRATO.VIGENTE,
      ]);
    return {
      recursos: (data ?? []).map((r) => ({ ...r, fecha: r.fecha_fin })),
      nombreKey: "titulo",
    };
  }
}
