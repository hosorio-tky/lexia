"use client";

import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PermitStatusBadge } from "./permit-status-badge";
import type { Permit } from "@/types/permits";

const TYPE_COLORS: Record<string, string> = {
  Ambiental:    "bg-emerald-600",
  Sanitario:    "bg-blue-600",
  Operativo:    "bg-indigo-600",
  Construcción: "bg-amber-600",
  Importación:  "bg-pink-600",
  Laboral:      "bg-cyan-600",
  Tributario:   "bg-orange-600",
};

export function PermitCardsGrid({ permits }: { permits: Permit[] }) {
  if (permits.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        No se encontraron permisos
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {permits.map((permit) => (
        <Link key={permit.id} href={`/permisos/${permit.id}`}>
          <Card className="overflow-hidden transition-all hover:shadow-md cursor-pointer h-full">
            <div className={`h-1.5 w-full ${TYPE_COLORS[permit.tipo] ?? "bg-slate-400"}`} />
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1 min-w-0">
                  {permit.numero_expediente && (
                    <div className="font-mono text-[10px] text-muted-foreground truncate">
                      {permit.numero_expediente}
                    </div>
                  )}
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2">
                    {permit.nombre}
                  </h3>
                </div>
                <PermitStatusBadge status={permit.estado} />
              </div>

              <div className="text-xs text-muted-foreground space-y-1.5">
                {permit.ubicacion && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {permit.ubicacion}
                  </div>
                )}
                {permit.fecha_vencimiento && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    Vence:{" "}
                    {new Date(permit.fecha_vencimiento).toLocaleDateString("es-SV", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                )}
              </div>

              {permit.responsable_nombre && (
                <div className="flex items-center gap-2 pt-1 border-t">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-primary text-[9px] font-bold">
                    {permit.responsable_iniciales}
                  </div>
                  <span className="text-xs text-muted-foreground">{permit.responsable_nombre}</span>
                </div>
              )}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
