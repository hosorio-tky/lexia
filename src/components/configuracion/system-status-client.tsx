"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Activity, CheckCircle2, XCircle, AlertTriangle, ServerCrash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SystemLog, HourBucket, ServiceCheck } from "@/app/(dashboard)/configuracion/estado/page";

// ── helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return format(parseISO(iso), "d MMM yyyy · HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: es });
  } catch {
    return iso;
  }
}

const LEVEL_BADGE: Record<string, string> = {
  error: "bg-red-100 text-red-700",
  warn:  "bg-amber-100 text-amber-700",
  info:  "bg-blue-100 text-blue-700",
};

const LEVEL_LABEL: Record<string, string> = {
  error: "Error",
  warn:  "Warning",
  info:  "Info",
};

type FilterLevel = "all" | "error" | "warn" | "info";

// ── component ──────────────────────────────────────────────────────────────

interface Props {
  recentLogs:   SystemLog[];
  hourlyData:   HourBucket[];
  totalErrors:  number;
  totalWarns:   number;
  lastErrorAt:  string | null;
  checks:       ServiceCheck[];
}

export function SystemStatusClient({
  recentLogs,
  hourlyData,
  totalErrors,
  totalWarns,
  lastErrorAt,
  checks,
}: Props) {
  const [filter, setFilter] = useState<FilterLevel>("all");

  const filteredLogs = useMemo(() => {
    if (filter === "all") return recentLogs;
    return recentLogs.filter((l) => l.level === filter);
  }, [recentLogs, filter]);

  const allOk = checks.every((c) => c.ok);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h2 className="text-base font-semibold">Estado del Sistema</h2>
        <p className="text-sm text-muted-foreground">
          Monitoreo de salud y logs técnicos en tiempo real.
        </p>
      </div>

      {/* ── Section 1: KPI cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Errores (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{totalErrors}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Warnings (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{totalWarns}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Tiempo activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold">99.9%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Último error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ServerCrash className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium truncate">{timeAgo(lastErrorAt)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section 2: Chart + Service checks ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Tendencia de Errores (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10 }}
                  interval={3}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(label) => `Hora: ${label}`}
                  formatter={(value, name) => [
                    value,
                    name === "errors" ? "Errores" : "Warnings",
                  ]}
                />
                <Legend
                  formatter={(value) => (value === "errors" ? "Errores" : "Warnings")}
                />
                <Bar dataKey="errors"   fill="#ef4444" radius={[2, 2, 0, 0]} />
                <Bar dataKey="warnings" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service checks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Checks de Servicio</CardTitle>
              <Badge
                className={
                  allOk
                    ? "bg-emerald-100 text-emerald-700 border-0"
                    : "bg-red-100 text-red-700 border-0"
                }
              >
                {allOk ? "Todos estables" : "Problemas detectados"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {checks.map((check) => (
                <li key={check.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {check.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium">{check.name}</span>
                  </div>
                  <Badge
                    className={
                      check.ok
                        ? "bg-emerald-100 text-emerald-700 border-0 text-xs"
                        : "bg-red-100 text-red-700 border-0 text-xs"
                    }
                  >
                    {check.ok ? "ESTABLE" : "ERROR"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* ── Section 3: Error log table ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold">Logs de Errores Técnicos</h3>
            <p className="text-xs text-muted-foreground">
              Últimos {recentLogs.length} registros
            </p>
          </div>
          {/* Level filter */}
          <div className="flex gap-2 flex-wrap">
            {(["all", "error", "warn", "info"] as FilterLevel[]).map((lvl) => (
              <Button
                key={lvl}
                variant={filter === lvl ? "default" : "outline"}
                size="sm"
                className="text-xs h-7 px-3"
                onClick={() => setFilter(lvl)}
              >
                {lvl === "all" ? "Todos" : LEVEL_LABEL[lvl]}
              </Button>
            ))}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-16 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400/60" />
            <p className="text-sm text-muted-foreground">
              No hay logs que coincidan con el filtro seleccionado.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                      FECHA/HORA
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      NIVEL
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      ERROR / MENSAJE
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      CONTEXTO
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-md border-0 ${LEVEL_BADGE[log.level] ?? "bg-slate-100 text-slate-700"}`}
                        >
                          {LEVEL_LABEL[log.level] ?? log.level}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm font-medium truncate" title={log.message}>
                          {log.message}
                        </p>
                        {(log.path || log.action) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {[log.path, log.action].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ContextTags log={log} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── ContextTags sub-component ──────────────────────────────────────────────

function ContextTags({ log }: { log: SystemLog }) {
  const tags: { key: string; value: string }[] = [];

  if (log.path)        tags.push({ key: "path",    value: log.path });
  if (log.action)      tags.push({ key: "action",  value: log.action });
  if (log.user_nombre) tags.push({ key: "user",    value: log.user_nombre });

  if (log.context && typeof log.context === "object") {
    for (const [k, v] of Object.entries(log.context)) {
      if (v !== null && v !== undefined && String(v).length < 60) {
        tags.push({ key: k, value: String(v) });
      }
    }
  }

  if (tags.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="flex flex-wrap gap-1 max-w-xs">
      {tags.slice(0, 4).map((tag) => (
        <span
          key={tag.key}
          className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono"
        >
          <span className="text-foreground/60">{tag.key}:</span>
          <span className="truncate max-w-[80px]">{tag.value}</span>
        </span>
      ))}
    </div>
  );
}
