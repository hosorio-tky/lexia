import { forwardRef } from "react";
import Link from "next/link";
import { format, parseISO, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Link2, AlertCircle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_DOT,
  type Task,
} from "@/types/tasks";

const MODULO_LABELS: Record<string, string> = {
  permisos:  "Permiso",
  contratos: "Contrato",
  litigios:  "Litigio",
};

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onEdit?: (task: Task) => void;
}

// forwardRef necesario para que @dnd-kit pueda pasarle ref al nodo DOM
export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(
  ({ task, isDragging, className, style, onEdit, ...props }, ref) => {
    const isOverdue =
      task.fecha_limite &&
      isPast(parseISO(task.fecha_limite)) &&
      !isToday(parseISO(task.fecha_limite)) &&
      task.estado !== "completada" &&
      task.estado !== "cancelada";

    const isDueToday =
      task.fecha_limite && isToday(parseISO(task.fecha_limite));

    const iniciales = task.asignado_nombre
      ? task.asignado_nombre
          .split(" ")
          .map((w) => w[0])
          .join("")
          .substring(0, 2)
          .toUpperCase()
      : null;

    return (
      <div
        ref={ref}
        style={style}
        className={cn(
          "group rounded-xl border bg-card p-4 shadow-sm transition-shadow",
          isDragging
            ? "shadow-lg ring-2 ring-primary/30 rotate-1 cursor-grabbing"
            : "hover:shadow-md cursor-grab",
          task.estado === "completada" && "opacity-60",
          className
        )}
        {...props}
      >
        {/* Prioridad + módulo origen */}
        <div className="mb-2 flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
              PRIORITY_COLORS[task.prioridad]
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[task.prioridad])} />
            {PRIORITY_LABELS[task.prioridad]}
          </span>

          {task.modulo_origen && (
            <span className="inline-flex items-center gap-1 rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
              <Link2 className="h-2.5 w-2.5" />
              {MODULO_LABELS[task.modulo_origen] ?? task.modulo_origen}
            </span>
          )}
        </div>

        {/* Título */}
        <Link
          href={`/tareas/${task.id}`}
          className="block text-sm font-medium leading-snug hover:text-primary transition-colors line-clamp-2"
          onClick={(e) => e.stopPropagation()}
        >
          {task.titulo}
        </Link>

        {/* Descripción corta */}
        {task.descripcion && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {task.descripcion}
          </p>
        )}

        {/* Indicador recurso vinculado */}
        {task.recurso_desc && (
          <p className="mt-1.5 truncate text-[10px] text-muted-foreground/70">
            {task.recurso_desc}
          </p>
        )}

        {/* Footer: fecha · editar · avatar */}
        <div className="mt-3 flex items-center justify-between gap-2">
          {/* Fecha límite */}
          <div className="flex items-center gap-1.5">
            {task.fecha_limite && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px]",
                  isOverdue  && "text-red-600 font-semibold",
                  isDueToday && "text-amber-600 font-medium",
                  !isOverdue && !isDueToday && "text-muted-foreground"
                )}
              >
                {isOverdue
                  ? <AlertCircle className="h-3 w-3" />
                  : <Calendar    className="h-3 w-3" />
                }
                {format(parseISO(task.fecha_limite), "d MMM", { locale: es })}
              </span>
            )}
          </div>

          {/* Derecha: botón editar + avatar */}
          <div className="flex items-center gap-1.5">
            {onEdit && (
              <button
                type="button"
                /* stopPropagation en pointer para que DnD no intercepte el click */
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground
                           opacity-0 transition-opacity group-hover:opacity-100
                           hover:bg-muted hover:text-foreground"
                title="Editar tarea"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}

            {iniciales && (
              <div
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 text-[10px] font-bold"
                title={task.asignado_nombre}
              >
                {iniciales}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
TaskCard.displayName = "TaskCard";
