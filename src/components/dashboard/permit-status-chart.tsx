"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { EstadoCount } from "@/lib/repositories/dashboard";

// Color por estado
const STATUS_COLORS: Record<string, string> = {
  "Vigente":          "#10b981",
  "Pre-Renovación":   "#f97316",
  "En Trámite":       "#6366f1",
  "En Revisión":      "#f59e0b",
  "Identificado":     "#94a3b8",
  "Requisitos":       "#3b82f6",
  "Suspendido":       "#eab308",
  "Vencido":          "#ef4444",
};

function getColor(estado: string) {
  return STATUS_COLORS[estado] ?? "#94a3b8";
}

interface PermitStatusChartProps {
  data: EstadoCount[];
}

export function PermitStatusChart({ data }: PermitStatusChartProps) {
  // Solo mostrar estados con count > 0
  const filtered = data.filter((d) => d.count > 0);

  if (filtered.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Sin datos
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={filtered}
        layout="vertical"
        margin={{ top: 0, right: 16, bottom: 0, left: 4 }}
        barCategoryGap="28%"
      >
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="estado"
          width={110}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const { estado, count } = payload[0].payload as EstadoCount;
            return (
              <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
                <span className="font-medium">{estado}</span>
                <span className="ml-2 text-muted-foreground">{count} permiso{count !== 1 ? "s" : ""}</span>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {filtered.map((entry) => (
            <Cell key={entry.estado} fill={getColor(entry.estado)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
