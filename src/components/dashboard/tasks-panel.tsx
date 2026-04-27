import Link from "next/link";
import { format, parseISO, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_DOT,
} from "@/types/tasks";
import type { EstadoCount, TareaUrgente } from "@/lib/repositories/dashboard";

// ─── Mini barra de prioridades ────────────────────────────────

const PRIORITY_BAR_COLORS: Record<string, string> = {
  urgente: "bg-red-500",
  alta:    "bg-orange-400",
  media:   "bg-blue-400",
  baja:    "bg-slate-300",
};

interface TasksPriorityBarsProps {
  data: EstadoCount[];
  total: number;
}

export function TasksPriorityBars({ data, total }: TasksPriorityBarsProps) {
  if (total === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Sin tareas activas
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map(({ estado: prioridad, count }) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={prioridad} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-muted-foreground capitalize">
              {PRIORITY_LABELS[prioridad as keyof typeof PRIORITY_LABELS] ?? prioridad}
            </span>
            <div className="flex-1 rounded-full bg-muted h-2 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", PRIORITY_BAR_COLORS[prioridad] ?? "bg-muted-foreground")}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-5 shrink-0 text-right text-xs font-medium text-muted-foreground">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Lista de tareas urgentes / altas ─────────────────────────

interface UrgentTasksListProps {
  tasks: TareaUrgente[];
}

export function UrgentTasksList({ tasks }: UrgentTasksListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 opacity-25" />
        <p className="text-sm">Sin tareas urgentes pendientes</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {tasks.map((task) => {
        const isOverdue =
          task.fecha_limite &&
          isPast(parseISO(task.fecha_limite)) &&
          !isToday(parseISO(task.fecha_limite));
        const isDueToday =
          task.fecha_limite && isToday(parseISO(task.fecha_limite));

        return (
          <Link
            key={task.id}
            href={`/tareas/${task.id}`}
            className="flex items-start gap-3 px-1 py-3 hover:bg-muted/40 transition-colors rounded-lg group"
          >
            {/* Dot prioridad */}
            <span
              className={cn(
                "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                PRIORITY_DOT[task.prioridad as keyof typeof PRIORITY_DOT] ?? "bg-muted-foreground"
              )}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
                {task.titulo}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                {task.asignado_nombre && (
                  <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                    {task.asignado_nombre}
                  </span>
                )}
                {task.fecha_limite && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-[11px]",
                      isOverdue  && "text-red-600 font-semibold",
                      isDueToday && "text-amber-600 font-medium",
                      !isOverdue && !isDueToday && "text-muted-foreground"
                    )}
                  >
                    {isOverdue
                      ? <AlertCircle className="h-3 w-3" />
                      : <Calendar className="h-3 w-3" />}
                    {format(parseISO(task.fecha_limite), "d MMM", { locale: es })}
                  </span>
                )}
              </div>
            </div>

            {/* Badge prioridad */}
            <span
              className={cn(
                "mt-0.5 shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                PRIORITY_COLORS[task.prioridad as keyof typeof PRIORITY_COLORS]
              )}
            >
              {PRIORITY_LABELS[task.prioridad as keyof typeof PRIORITY_LABELS] ?? task.prioridad}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
