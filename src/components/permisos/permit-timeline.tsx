import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { PermitStatusBadge } from "./permit-status-badge";
import type { TimelineEvent } from "@/types/permits";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PermitTimeline({
  events,
  className,
}: {
  events: TimelineEvent[];
  className?: string;
}) {
  if (events.length === 0) {
    return (
      <div className={`py-8 text-center text-sm text-muted-foreground ${className}`}>
        No hay eventos registrados aún.
      </div>
    );
  }

  return (
    <ol className={`relative space-y-0 ${className}`}>
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-4 pb-6">
            {/* línea vertical */}
            {!isLast && (
              <div className="absolute left-3.5 top-7 bottom-0 w-px bg-border" />
            )}

            {/* icono */}
            <div className="z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-background">
              {isLast ? (
                <Clock className="h-3.5 w-3.5 text-primary" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </div>

            {/* contenido */}
            <div className="flex-1 pt-0.5">
              {/* transición de estados */}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {event.estado_anterior ? (
                  <>
                    <PermitStatusBadge status={event.estado_anterior} />
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <PermitStatusBadge status={event.estado_nuevo} />
                  </>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground">Inicio:</span>
                    <PermitStatusBadge status={event.estado_nuevo} />
                  </>
                )}
              </div>

              {/* comentario */}
              {event.comentario && (
                <p className="mt-1.5 text-sm text-foreground/80">{event.comentario}</p>
              )}

              {/* meta */}
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                {event.changed_by_nombre && <span>{event.changed_by_nombre}</span>}
                <span>·</span>
                <span>{formatDate(event.created_at)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
