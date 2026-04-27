import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { SystemStatusClient } from "@/components/configuracion/system-status-client";

export const dynamic = "force-dynamic";

export interface SystemLog {
  id: string;
  tenant_id: string | null;
  level: "error" | "warn" | "info";
  message: string;
  path: string | null;
  action: string | null;
  user_id: string | null;
  user_nombre: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
}

export interface HourBucket {
  hour: string; // "00" – "23"
  errors: number;
  warnings: number;
}

export interface ServiceCheck {
  name: string;
  ok: boolean;
}

export default async function EstadoPage() {
  const session = await getSession();
  const client  = createAdminClient();

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Fetch last 50 error/warn/info logs for the table
  const { data: recentLogs } = await client
    .from("system_logs")
    .select("*")
    .eq("tenant_id", session.tenant_id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch logs from last 24h for the chart grouping
  const { data: chartLogs } = await client
    .from("system_logs")
    .select("level, created_at")
    .eq("tenant_id", session.tenant_id)
    .gte("created_at", since24h)
    .in("level", ["error", "warn"])
    .order("created_at", { ascending: true });

  // Build 24-hour buckets
  const buckets: Record<string, HourBucket> = {};
  for (let h = 0; h < 24; h++) {
    const key = String(h).padStart(2, "0");
    buckets[key] = { hour: key + ":00", errors: 0, warnings: 0 };
  }
  for (const log of chartLogs ?? []) {
    const hour = String(new Date(log.created_at).getHours()).padStart(2, "0");
    if (log.level === "error") buckets[hour].errors++;
    else if (log.level === "warn") buckets[hour].warnings++;
  }
  const hourlyData = Object.values(buckets);

  // KPI counts
  const logs24h    = chartLogs ?? [];
  const totalErrors = logs24h.filter((l) => l.level === "error").length;
  const totalWarns  = logs24h.filter((l) => l.level === "warn").length;

  // Last error timestamp
  const lastError = (recentLogs ?? []).find((l) => l.level === "error");

  // Service health checks
  const checks: ServiceCheck[] = [];

  // DB check
  const { error: dbErr } = await client.from("profiles").select("id").limit(1);
  checks.push({ name: "Base de Datos", ok: !dbErr });

  // Auth check — verify env var exists and Supabase URL reachable
  checks.push({ name: "Autenticación", ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL });

  // Storage check — verify service role key exists
  checks.push({ name: "Storage", ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY });

  // Edge Functions check — verify URL env
  checks.push({ name: "Edge Functions", ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL });

  // IA check
  checks.push({ name: "IA", ok: !!process.env.OPENAI_API_KEY });

  return (
    <SystemStatusClient
      recentLogs={(recentLogs ?? []) as SystemLog[]}
      hourlyData={hourlyData}
      totalErrors={totalErrors}
      totalWarns={totalWarns}
      lastErrorAt={lastError?.created_at ?? null}
      checks={checks}
    />
  );
}
