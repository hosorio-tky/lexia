"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format, parseISO, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle, Calendar, Link2, Pencil, Trash2,
  CheckCircle2, Circle, Clock, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { eliminarTarea, cambiarEstadoTarea } from "@/app/actions/tareas";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_DOT,
  type Task,
  type TaskStatus,
} from "@/types/tasks";

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  pendiente:   <Circle     className="h-3.5 w-3.5" />,
  en_progreso: <Clock      className="h-3.5 w-3.5" />,
  completada:  <CheckCircle2 className="h-3.5 w-3.5" />,
  cancelada:   <XCircle    className="h-3.5 w-3.5" />,
};

const MODULO_LABELS: Record<string, string> = {
  permisos:  "Permiso",
  contratos: "Contrato",
  litigios:  "Litigio",
};

interface TaskListViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (id: string) => void;
}

export function TaskListView({
  tasks,
  onEdit,
  onTaskUpdated,
  onTaskDeleted,
}: TaskListViewProps) {
  const [, startTransition] = useTransition();

  function handleStatusToggle(task: Task) {
    const next: TaskStatus =
      task.estado === "completada" ? "pendiente" : "completada";
    onTaskUpdated({ ...task, estado: next });
    startTransition(async () => {
      await cambiarEstadoTarea(task.id, next);
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 opacity-20" />
        <p className="text-sm">No hay tareas con los filtros actuales.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Cabecera */}
      <div className="hidden sm:grid grid-cols-[1fr_140px_120px_130px_120px_88px] items-center gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
        <span>Tarea</span>
        <span>Estado</span>
        <span>Prioridad</span>
        <span>Asignado a</span>
        <span>Fecha límite</span>
        <span />
      </div>

      {/* Filas */}
      <div className="divide-y">
        {tasks.map((task) => (
          <TaskListRow
            key={task.id}
            task={task}
            onEdit={onEdit}
            onStatusToggle={handleStatusToggle}
            onDeleted={onTaskDeleted}
          />
        ))}
      </div>
    </div>
  );
}

function TaskListRow({
  task,
  onEdit,
  onStatusToggle,
  onDeleted,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onStatusToggle: (task: Task) => void;
  onDeleted: (id: string) => void;
}) {
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
    <div className="group grid grid-cols-1 sm:grid-cols-[1fr_140px_120px_130px_120px_88px] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/20">
      {/* Título + módulo */}
      <div className="flex items-start gap-2.5 min-w-0">
        {/* Checkbox / estado toggle */}
        <button
          type="button"
          onClick={() => onStatusToggle(task)}
          className={cn(
            "mt-0.5 shrink-0 transition-colors",
            task.estado === "completada"
              ? "text-emerald-500"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={task.estado === "completada" ? "Marcar pendiente" : "Marcar completada"}
        >
          {STATUS_ICONS[task.estado]}
        </button>

        <div className="min-w-0">
          <Link
            href={`/tareas/${task.id}`}
            className={cn(
              "block text-sm font-medium leading-snug hover:text-primary transition-colors line-clamp-1",
              task.estado === "completada" && "line-through text-muted-foreground"
            )}
          >
            {task.titulo}
          </Link>
          {task.modulo_origen && task.recurso_desc && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Link2 className="h-2.5 w-2.5" />
              {MODULO_LABELS[task.modulo_origen] ?? task.modulo_origen}:&nbsp;
              <span className="truncate max-w-[180px]">{task.recurso_desc}</span>
            </span>
          )}
        </div>
      </div>

      {/* Estado */}
      <div className="hidden sm:block">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            TASK_STATUS_COLORS[task.estado]
          )}
        >
          {STATUS_ICONS[task.estado]}
          {TASK_STATUS_LABELS[task.estado]}
        </span>
      </div>

      {/* Prioridad */}
      <div className="hidden sm:block">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            PRIORITY_COLORS[task.prioridad]
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[task.prioridad])} />
          {PRIORITY_LABELS[task.prioridad]}
        </span>
      </div>

      {/* Asignado */}
      <div className="hidden sm:flex items-center gap-1.5">
        {iniciales ? (
          <>
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-bold ring-1 ring-primary/20">
              {iniciales}
            </div>
            <span className="text-sm truncate">{task.asignado_nombre}</span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Sin asignar</span>
        )}
      </div>

      {/* Fecha límite */}
      <div className="hidden sm:flex items-center gap-1 text-xs">
        {task.fecha_limite ? (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              isOverdue  && "text-red-600 font-semibold",
              isDueToday && "text-amber-600 font-medium",
              !isOverdue && !isDueToday && "text-muted-foreground"
            )}
          >
            {isOverdue
              ? <AlertCircle className="h-3 w-3" />
              : <Calendar className="h-3 w-3" />}
            {format(parseISO(task.fecha_limite), "d MMM yyyy", { locale: es })}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(task)}
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              title="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar esta tarea?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  onDeleted(task.id);
                  eliminarTarea(task.id);
                }}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
