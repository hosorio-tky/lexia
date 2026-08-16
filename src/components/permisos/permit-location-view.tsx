"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { PermitStatusBadge, VigenciaBadge } from "./permit-status-badge";
import { calcularVigencia } from "@/types/permits";
import { AccesoIndicador } from "@/components/shared/acceso-indicador";
import { cn } from "@/lib/utils";
import type { Permit } from "@/types/permits";

interface PermitLocationViewProps {
  permits: Permit[];
  userId?: string;
  userRol?: string;
}

function groupByLocation(permits: Permit[]): [string, Permit[]][] {
  const map = new Map<string, Permit[]>();
  for (const p of permits) {
    const key = p.ubicacion ?? "Sin ubicación";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  // "Sin ubicación" always last
  const entries = [...map.entries()].sort(([a], [b]) => {
    if (a === "Sin ubicación") return 1;
    if (b === "Sin ubicación") return -1;
    return a.localeCompare(b, "es");
  });
  return entries;
}

function LocationGroup({
  name,
  permits,
  userId,
  userRol,
  defaultOpen,
}: {
  name: string;
  permits: Permit[];
  userId?: string;
  userRol?: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-sm">{name}</span>
          <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full bg-primary/10 text-primary text-xs font-bold px-1.5">
            {permits.length}
          </span>
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
        }
      </button>

      {/* Rows */}
      {open && (
        <div className="divide-y border-t">
          {permits.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
            >
              {/* Type badge */}
              <div className="h-8 w-8 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                {p.tipo.substring(0, 2).toUpperCase()}
              </div>

              {/* Name + entity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/permisos/${p.id}?from=location`}
                    className="text-sm font-medium hover:text-primary hover:underline transition-colors truncate"
                  >
                    {p.nombre}
                  </Link>
                  <AccesoIndicador
                    resourceType="permiso"
                    resourceId={p.id}
                    resourceName={p.nombre}
                    visibilidad={p.visibilidad ?? "publico"}
                    canManage={userRol === "admin" || p.created_by === userId}
                  />
                </div>
                {p.entidad_reguladora && (
                  <p className="text-xs text-muted-foreground truncate">{p.entidad_reguladora}</p>
                )}
              </div>

              {/* Status + vigencia */}
              <div className="flex items-center gap-2 shrink-0">
                <PermitStatusBadge estadoId={p.estado_id} label={p.estado} />
                <span className="hidden sm:block">
                  <VigenciaBadge status={calcularVigencia(p.fecha_vencimiento)} />
                </span>
              </div>

              {/* Expiry */}
              {p.fecha_vencimiento && (
                <div className="hidden lg:block text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  {new Date(p.fecha_vencimiento).toLocaleDateString("es-SV", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PermitLocationView({ permits, userId, userRol }: PermitLocationViewProps) {
  const groups = groupByLocation(permits);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
        <MapPin className="h-8 w-8 opacity-30" />
        <p className="text-sm">No se encontraron permisos</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map(([name, groupPermits], i) => (
        <LocationGroup
          key={name}
          name={name}
          permits={groupPermits}
          userId={userId}
          userRol={userRol}
          defaultOpen={i === 0}
        />
      ))}
    </div>
  );
}
