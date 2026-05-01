"use client";

import { useState, useTransition, useActionState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft, Calendar, Link2, Send, Trash2, CheckCircle2,
  Circle, Clock, XCircle, User, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  cambiarEstadoTarea,
  eliminarTarea,
  agregarComentario,
} from "@/app/actions/tareas";
import { TaskFormModal } from "./task-form-modal";
import type { UserProfile } from "@/types/users";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUSES,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_DOT,
  type Task,
  type TaskComment,
  type TaskStatus,
} from "@/types/tasks";

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  pendiente:   <Circle className="h-4 w-4" />,
  en_progreso: <Clock className="h-4 w-4" />,
  completada:  <CheckCircle2 className="h-4 w-4" />,
  cancelada:   <XCircle className="h-4 w-4" />,
};

const MODULO_HREFS: Record<string, string> = {
  permisos:  "/permisos",
  contratos: "/contratos",
};

export function TaskDetailClient({
  task: initialTask,
  comentarios: initialComentarios,
  usuarios = [],
}: {
  task: Task;
  comentarios: TaskComment[];
  usuarios?: UserProfile[];
}) {
  const [task, setTask]             = useState(initialTask);
  const [comentarios, setComentarios] = useState(initialComentarios);
  const [editOpen, setEditOpen]     = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(nuevoEstado: string) {
    const status = nuevoEstado as TaskStatus;
    setTask((prev) => ({ ...prev, estado: status }));
    startTransition(async () => {
      await cambiarEstadoTarea(task.id, status);
    });
  }

  // Comentarios form
  const boundAgregarComentario = agregarComentario.bind(null, task.id);
  const [commentState, commentAction, commentPending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      const result = await boundAgregarComentario(prevState, formData);
      if (result?.success) {
        const contenido = formData.get("contenido") as string;
        setComentarios((prev) => [
          ...prev,
          {
            id:          crypto.randomUUID(),
            tarea_id:    task.id,
            contenido,
            created_at:  new Date().toISOString(),
          },
        ]);
      }
      return result;
    },
    null
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/tareas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al tablero
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Contenido principal ── */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-6 space-y-4">
            {/* Estado + título */}
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 rounded-md p-1",
                  task.estado === "completada"
                    ? "text-emerald-600"
                    : task.estado === "en_progreso"
                    ? "text-blue-600"
                    : "text-muted-foreground"
                )}
              >
                {STATUS_ICONS[task.estado]}
              </span>
              <h1
                className={cn(
                  "text-xl font-semibold leading-tight",
                  task.estado === "completada" && "line-through text-muted-foreground"
                )}
              >
                {task.titulo}
              </h1>
            </div>

            {/* Descripción */}
            {task.descripcion && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {task.descripcion}
              </p>
            )}

            {/* Recurso vinculado */}
            {task.recurso_desc && task.modulo_origen && (
              <Link
                href={`${MODULO_HREFS[task.modulo_origen] ?? ""}/${task.recurso_id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm hover:bg-muted transition"
              >
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium capitalize">{task.modulo_origen}:</span>
                <span className="text-muted-foreground truncate max-w-[200px]">
                  {task.recurso_desc}
                </span>
              </Link>
            )}
          </Card>

          {/* ── Comentarios ── */}
          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-semibold">Comentarios</h2>

            {comentarios.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin comentarios todavía.
              </p>
            ) : (
              <div className="space-y-3">
                {comentarios.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
                      {c.user_nombre
                        ? c.user_nombre.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase()
                        : "?"}
                    </div>
                    <div className="flex-1 rounded-lg border bg-muted/30 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-medium">{c.user_nombre ?? "Usuario"}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(c.created_at), "d MMM · HH:mm", { locale: es })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.contenido}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <form action={commentAction} className="flex gap-2">
              <Textarea
                name="contenido"
                placeholder="Escribe un comentario…"
                rows={2}
                className="flex-1 resize-none"
                required
              />
              <Button type="submit" size="icon" disabled={commentPending} className="self-end">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {commentState?.error && (
              <p className="text-sm text-destructive">{commentState.error}</p>
            )}
          </Card>
        </div>

        {/* ── Panel lateral ── */}
        <div className="space-y-4">
          {/* Estado */}
          <Card className="p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Estado
            </h3>
            <Select value={task.estado} onValueChange={handleStatusChange} disabled={isPending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-2">
                      {STATUS_ICONS[s]}
                      {TASK_STATUS_LABELS[s]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          {/* Detalles */}
          <Card className="p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Detalles
            </h3>

            {/* Prioridad */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Prioridad</span>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                PRIORITY_COLORS[task.prioridad]
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[task.prioridad])} />
                {PRIORITY_LABELS[task.prioridad]}
              </span>
            </div>

            {/* Asignado */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Asignado a</span>
              {task.asignado_nombre ? (
                <div className="flex items-center gap-1.5">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-bold ring-1 ring-primary/20">
                    {task.asignado_nombre.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm">{task.asignado_nombre}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Sin asignar</span>
              )}
            </div>

            {/* Fecha límite */}
            {task.fecha_limite && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Fecha límite</span>
                <span className="flex items-center gap-1 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {format(parseISO(task.fecha_limite), "d MMM yyyy", { locale: es })}
                </span>
              </div>
            )}

            {/* Creado por */}
            {task.created_by_nombre && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Creada por</span>
                <span className="flex items-center gap-1.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {task.created_by_nombre}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Creada</span>
              <span className="text-sm">
                {format(parseISO(task.created_at), "d MMM yyyy", { locale: es })}
              </span>
            </div>
          </Card>

          {/* Editar */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar tarea
          </Button>

          {/* Eliminar */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar tarea
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar esta tarea?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminarán también todos
                  los comentarios asociados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => eliminarTarea(task.id)}
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Modal edición — key fuerza remonte para reinicializar useState */}
      <TaskFormModal
        key={task.id}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editTask={task}
        onUpdated={(updated) => {
          setTask(updated);
          setEditOpen(false);
        }}
        usuarios={usuarios}
      />
    </div>
  );
}
