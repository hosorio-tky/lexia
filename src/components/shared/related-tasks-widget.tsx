"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRIORITY_DOT,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  type Task,
  type TaskStatus,
} from "@/types/tasks";
import { TaskQuickCreate } from "@/components/tareas/task-quick-create";
import type { UserProfile } from "@/types/users";

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  pendiente:   <Circle       className="h-3.5 w-3.5" />,
  en_progreso: <Clock        className="h-3.5 w-3.5" />,
  completada:  <CheckCircle2 className="h-3.5 w-3.5" />,
  cancelada:   <CheckCircle2 className="h-3.5 w-3.5 opacity-50" />,
};

interface RelatedTasksWidgetProps {
  modulo: string;
  recursoId: string;
  recursoDesc: string;
  initialTasks: Task[];
  usuarios: UserProfile[];
}

export function RelatedTasksWidget({
  modulo,
  recursoId,
  recursoDesc,
  initialTasks,
  usuarios,
}: RelatedTasksWidgetProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const activas    = tasks.filter((t) => !["completada", "cancelada"].includes(t.estado));
  const completadas = tasks.filter((t) => t.estado === "completada");

  return (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-1">Sin tareas vinculadas.</p>
      ) : (
        <div className="space-y-1.5">
          {/* Activas primero */}
          {activas.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}

          {/* Completadas colapsables */}
          {completadas.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none text-xs text-muted-foreground hover:text-foreground py-1 flex items-center gap-1">
                <span className="group-open:hidden">▶</span>
                <span className="hidden group-open:inline">▼</span>
                {completadas.length} completada{completadas.length > 1 ? "s" : ""}
              </summary>
              <div className="mt-1 space-y-1.5 opacity-60">
                {completadas.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Botón crear tarea vinculada */}
      <TaskQuickCreate
        modulo={modulo}
        recursoId={recursoId}
        recursoDesc={recursoDesc}
        usuarios={usuarios}
        variant="outline"
        size="sm"
        onCreated={(newTask) => setTasks((prev) => [newTask, ...prev])}
      />
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const isOverdue =
    task.fecha_limite &&
    isPast(parseISO(task.fecha_limite)) &&
    !isToday(parseISO(task.fecha_limite)) &&
    task.estado !== "completada";

  const isDueToday =
    task.fecha_limite && isToday(parseISO(task.fecha_limite));

  return (
    <Link
      href={`/tareas/${task.id}`}
      className="group flex items-start gap-2.5 rounded-lg border bg-card px-3 py-2 hover:bg-muted/40 transition-colors"
    >
      {/* Dot prioridad */}
      <span
        className={cn(
          "mt-1 h-2 w-2 shrink-0 rounded-full",
          PRIORITY_DOT[task.prioridad]
        )}
      />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium leading-snug group-hover:text-primary transition-colors truncate",
            task.estado === "completada" && "line-through text-muted-foreground"
          )}
        >
          {task.titulo}
        </p>
        <div className="mt-0.5 flex items-center gap-2 flex-wrap">
          {/* Estado badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border",
              TASK_STATUS_COLORS[task.estado]
            )}
          >
            {STATUS_ICONS[task.estado]}
            {TASK_STATUS_LABELS[task.estado]}
          </span>

          {/* Fecha */}
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
                : <Calendar    className="h-3 w-3" />}
              {format(parseISO(task.fecha_limite), "d MMM", { locale: es })}
            </span>
          )}

          {/* Asignado */}
          {task.asignado_nombre && (
            <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">
              {task.asignado_nombre}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
