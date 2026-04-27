"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { crearTarea, editarTarea } from "@/app/actions/tareas";
import {
  TASK_PRIORITIES,
  PRIORITY_LABELS,
  KANBAN_COLUMNS,
  TASK_STATUS_LABELS,
  type Task,
  type TaskStatus,
} from "@/types/tasks";
import type { UserProfile } from "@/types/users";

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (task: Task) => void;
  onUpdated?: (task: Task) => void;
  /** Si se pasa, el modal actúa en modo edición */
  editTask?: Task;
  defaultStatus?: TaskStatus;
  defaultModulo?: string;
  defaultRecursoId?: string;
  defaultRecursoDesc?: string;
  usuarios: UserProfile[];
}

export function TaskFormModal({
  open,
  onClose,
  onCreated,
  onUpdated,
  editTask,
  defaultStatus = "pendiente",
  defaultModulo,
  defaultRecursoId,
  defaultRecursoDesc,
  usuarios,
}: TaskFormModalProps) {
  const isEdit = Boolean(editTask);

  // Los estados se inicializan con los valores del editTask si existe
  const [prioridad, setPrioridad] = useState<Task["prioridad"]>(editTask?.prioridad ?? "media");
  const [estado,    setEstado]    = useState<TaskStatus>(
    editTask?.estado ?? defaultStatus
  );
  const [asignado,  setAsignado]  = useState(editTask?.asignado_a ?? "");

  async function handleAction(prevState: unknown, formData: FormData) {
    // Inyectar valores controlados
    formData.set("prioridad", prioridad);
    formData.set("estado",    estado);

    if (asignado) {
      const user = usuarios.find((u) => u.id === asignado);
      formData.set("asignado_a",      asignado);
      formData.set("asignado_nombre", user?.nombre_completo ?? "");
    } else {
      // Limpiar asignación
      formData.set("asignado_a",      "");
      formData.set("asignado_nombre", "");
    }

    if (isEdit && editTask) {
      // ── MODO EDICIÓN ──
      const result = await editarTarea(editTask.id, prevState, formData);
      if (!result?.error && result?.success) {
        const titulo      = formData.get("titulo") as string;
        const descripcion = (formData.get("descripcion") as string) || undefined;
        const fecha_limite = (formData.get("fecha_limite") as string) || undefined;
        const user        = usuarios.find((u) => u.id === asignado);
        onUpdated?.({
          ...editTask,
          titulo,
          descripcion,
          prioridad:       prioridad as Task["prioridad"],
          estado,
          asignado_a:      asignado || undefined,
          asignado_nombre: user?.nombre_completo ?? editTask.asignado_nombre,
          fecha_limite,
          updated_at:      new Date().toISOString(),
        });
        onClose();
      }
      return result;
    } else {
      // ── MODO CREACIÓN ──
      if (defaultModulo)     formData.set("modulo_origen", defaultModulo);
      if (defaultRecursoId)  formData.set("recurso_id",    defaultRecursoId);
      if (defaultRecursoDesc) formData.set("recurso_desc", defaultRecursoDesc);

      const result = await crearTarea(prevState, formData);
      if (!result?.error && result?.taskId) {
        const titulo = formData.get("titulo") as string;
        const user   = usuarios.find((u) => u.id === asignado);
        onCreated?.({
          id:                result.taskId,
          tenant_id:         "",
          titulo,
          descripcion:       (formData.get("descripcion") as string) || undefined,
          estado,
          prioridad:         prioridad as Task["prioridad"],
          asignado_a:        asignado || undefined,
          asignado_nombre:   user?.nombre_completo,
          modulo_origen:     defaultModulo,
          recurso_id:        defaultRecursoId,
          recurso_desc:      defaultRecursoDesc,
          fecha_limite:      (formData.get("fecha_limite") as string) || undefined,
          orden:             0,
          created_at:        new Date().toISOString(),
          updated_at:        new Date().toISOString(),
        });
      }
      return result;
    }
  }

  const [state, formAction, isPending] = useActionState(handleAction, null);

  const recursoDesc = isEdit
    ? editTask?.recurso_desc
    : defaultRecursoDesc;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/*
        La `key` fuerza el re-montaje completo cuando cambia entre
        crear y editar, garantizando que los useState se reinicien.
      */}
      <DialogContent key={editTask?.id ?? "new"} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {/* Título */}
          <div className="space-y-1.5">
            <Label>Título <span className="text-destructive">*</span></Label>
            <Input
              name="titulo"
              placeholder="¿Qué hay que hacer?"
              defaultValue={editTask?.titulo ?? ""}
              required
              autoFocus
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea
              name="descripcion"
              placeholder="Detalles opcionales…"
              defaultValue={editTask?.descripcion ?? ""}
              rows={2}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Estado */}
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KANBAN_COLUMNS.map((s) => (
                    <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prioridad */}
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select value={prioridad} onValueChange={(v) => setPrioridad(v as Task["prioridad"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Asignado */}
            <div className="space-y-1.5">
              <Label>Asignar a</Label>
              <Select
                value={asignado || "_nadie"}
                onValueChange={(v) => setAsignado(v === "_nadie" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_nadie">Sin asignar</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nombre_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha límite */}
            <div className="space-y-1.5">
              <Label>Fecha límite</Label>
              <DatePickerInput
                name="fecha_limite"
                placeholder="Sin fecha"
                defaultValue={editTask?.fecha_limite}
              />
            </div>
          </div>

          {/* Recurso vinculado (readonly) */}
          {recursoDesc && (
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Vinculada a: <strong className="text-foreground">{recursoDesc}</strong>
            </div>
          )}

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit ? "Guardando…" : "Creando…"
                : isEdit ? "Guardar cambios" : "Crear tarea"
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
