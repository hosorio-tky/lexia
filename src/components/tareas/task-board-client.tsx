"use client";

import { useState, useTransition, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "./task-card";
import { TaskFilters } from "./task-filters";
import { TaskFormModal } from "./task-form-modal";
import { TaskListView } from "./task-list-view";
import { cambiarEstadoTarea } from "@/app/actions/tareas";
import {
  KANBAN_COLUMNS,
  TASK_STATUS_LABELS,
  type Task,
  type TaskStatus,
  type TaskFilters as Filters,
} from "@/types/tasks";
import type { UserProfile } from "@/types/users";

// ─── Columna Kanban ───────────────────────────────────────────
const COLUMN_STYLES: Record<TaskStatus, string> = {
  pendiente:   "border-t-slate-300",
  en_progreso: "border-t-blue-400",
  completada:  "border-t-emerald-400",
  cancelada:   "border-t-red-400",
};

const COLUMN_COUNTS_COLOR: Record<TaskStatus, string> = {
  pendiente:   "bg-slate-100 text-slate-600",
  en_progreso: "bg-blue-100 text-blue-700",
  completada:  "bg-emerald-100 text-emerald-700",
  cancelada:   "bg-red-100 text-red-600",
};

// ─── Sortable card wrapper ─────────────────────────────────────
function SortableCard({
  task,
  onEdit,
}: {
  task: Task;
  onEdit: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity:   isDragging ? 0.3 : 1,
  };

  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      style={style}
      onEdit={onEdit}
      {...attributes}
      {...listeners}
    />
  );
}

// ─── Droppable column ─────────────────────────────────────────
function KanbanColumn({
  status,
  tasks,
  onAddTask,
  onEditTask,
}: {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
}) {
  // El id de la columna coincide con el nombre del estado — handleDragEnd lo usa para detectar columna destino
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={`flex flex-col rounded-2xl border border-t-4 bg-muted/30 min-h-[480px] ${COLUMN_STYLES[status]}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {TASK_STATUS_LABELS[status]}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLUMN_COUNTS_COLOR[status]}`}
          >
            {tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onAddTask(status)}
          title="Nueva tarea"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Área de cards — registrada como droppable */}
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "flex flex-1 flex-col gap-2 px-3 pb-4 min-h-[64px] rounded-b-2xl transition-colors",
            isOver && "bg-primary/5 ring-1 ring-inset ring-primary/20"
          )}
        >
          {tasks.map((task) => (
            <SortableCard key={task.id} task={task} onEdit={onEditTask} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Board principal ──────────────────────────────────────────
export function TaskBoardClient({
  initialTasks,
  usuarios,
}: {
  initialTasks: Task[];
  usuarios: UserProfile[];
}) {
  const [tasks, setTasks]           = useState<Task[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [view, setView]             = useState<"kanban" | "list">("kanban");
  const [filters, setFilters]       = useState<Filters>({
    search:             "",
    prioridad:          "",
    asignado:           "",
    modulo_origen:      "",
    mostrar_canceladas: false,
  });

  // Estado del modal: null = cerrado, objeto sin id = crear, objeto con id = editar
  const [modalState, setModalState] = useState<{
    open: boolean;
    editTask?: Task;
    defaultStatus?: TaskStatus;
    defaultModulo?: string;
    defaultRecursoId?: string;
    defaultRecursoDesc?: string;
  }>({ open: false });

  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // ── Filtrado client-side ──────────────────────────────────────
  const visibleTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!filters.mostrar_canceladas && t.estado === "cancelada") return false;
      if (filters.prioridad     && t.prioridad     !== filters.prioridad)     return false;
      if (filters.asignado      && t.asignado_a    !== filters.asignado)      return false;
      if (filters.modulo_origen && t.modulo_origen !== filters.modulo_origen) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !t.titulo.toLowerCase().includes(q) &&
          !t.recurso_desc?.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [tasks, filters]);

  const columnTasks = useMemo(() => {
    const columns: Partial<Record<TaskStatus, Task[]>> = {};
    for (const status of KANBAN_COLUMNS) {
      columns[status] = visibleTasks.filter((t) => t.estado === status);
    }
    if (filters.mostrar_canceladas) {
      columns["cancelada"] = visibleTasks.filter((t) => t.estado === "cancelada");
    }
    return columns;
  }, [visibleTasks, filters.mostrar_canceladas]);

  const displayColumns = filters.mostrar_canceladas
    ? [...KANBAN_COLUMNS, "cancelada" as TaskStatus]
    : KANBAN_COLUMNS;

  // ── DnD handlers ──────────────────────────────────────────────
  function handleDragStart({ active }: DragStartEvent) {
    const task = tasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null);
    if (!over) return;

    const overId    = over.id as string;
    const overTask  = tasks.find((t) => t.id === overId);
    const targetStatus = overTask ? overTask.estado : (overId as TaskStatus);

    const activeId   = active.id as string;
    const activeItem = tasks.find((t) => t.id === activeId);
    if (!activeItem || activeItem.estado === targetStatus) return;
    if (!TASK_STATUSES_VALID.includes(targetStatus as TaskStatus)) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeId ? { ...t, estado: targetStatus as TaskStatus } : t
      )
    );

    startTransition(async () => {
      await cambiarEstadoTarea(activeId, targetStatus as TaskStatus);
    });
  }

  // ── Modal helpers ─────────────────────────────────────────────
  function openCreate(status?: TaskStatus) {
    setModalState({ open: true, defaultStatus: status });
  }

  function openEdit(task: Task) {
    setModalState({ open: true, editTask: task });
  }

  function handleTaskCreated(newTask: Task) {
    setTasks((prev) => [newTask, ...prev]);
    setModalState({ open: false });
  }

  function handleTaskUpdated(updatedTask: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    setModalState({ open: false });
  }

  function handleTaskDeleted(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Filtros + toggle de vista */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <TaskFilters
            filters={filters}
            onFiltersChange={setFilters}
            usuarios={usuarios}
            onNewTask={() => openCreate()}
          />
        </div>

        {/* Toggle Kanban / Lista */}
        <div className="flex items-center rounded-xl border bg-muted/40 p-1 gap-0.5 shrink-0 mt-0">
          <Button
            variant={view === "kanban" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView("kanban")}
            title="Vista Kanban"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView("list")}
            title="Vista lista"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Vista Kanban ── */}
      {view === "kanban" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            className={`grid gap-4 ${
              displayColumns.length === 4
                ? "lg:grid-cols-4"
                : "lg:grid-cols-3"
            } grid-cols-1 md:grid-cols-2`}
          >
            {displayColumns.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={columnTasks[status] ?? []}
                onAddTask={openCreate}
                onEditTask={openEdit}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <TaskCard task={activeTask} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── Vista Lista ── */}
      {view === "list" && (
        <TaskListView
          tasks={visibleTasks}
          onEdit={openEdit}
          onTaskUpdated={(updated) =>
            setTasks((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            )
          }
          onTaskDeleted={handleTaskDeleted}
        />
      )}

      {/* Modal crear / editar — key fuerza remonte para reinicializar useState */}
      <TaskFormModal
        key={modalState.editTask?.id ?? `new-${modalState.defaultStatus ?? "pendiente"}`}
        open={modalState.open}
        onClose={() => setModalState({ open: false })}
        onCreated={handleTaskCreated}
        onUpdated={handleTaskUpdated}
        editTask={modalState.editTask}
        defaultStatus={modalState.defaultStatus}
        defaultModulo={modalState.defaultModulo}
        defaultRecursoId={modalState.defaultRecursoId}
        defaultRecursoDesc={modalState.defaultRecursoDesc}
        usuarios={usuarios}
      />
    </div>
  );
}

const TASK_STATUSES_VALID: TaskStatus[] = [
  "pendiente", "en_progreso", "completada", "cancelada",
];
