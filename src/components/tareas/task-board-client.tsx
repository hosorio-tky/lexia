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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LayoutGrid, List, Plus, EyeOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "./task-card";
import { TaskFilters } from "./task-filters";
import { TaskFormModal } from "./task-form-modal";
import { TaskListView } from "./task-list-view";
import { cambiarEstadoTarea, listarTareasPaginado } from "@/app/actions/tareas";
import {
  TASK_STATUSES,
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

// Columnas visibles por defecto — "cancelada" arranca oculta, igual que
// el antiguo switch "Ver canceladas".
const DEFAULT_COLUMNAS_VISIBLES: Record<TaskStatus, boolean> = {
  pendiente:   true,
  en_progreso: true,
  completada:  true,
  cancelada:   false,
};

const COLUMNAS_STORAGE_KEY = "lexia:tareas:kanban:columnasVisibles";

function leerColumnasVisibles(): Record<TaskStatus, boolean> {
  if (typeof window === "undefined") return DEFAULT_COLUMNAS_VISIBLES;
  try {
    const raw = window.sessionStorage.getItem(COLUMNAS_STORAGE_KEY);
    if (!raw) return DEFAULT_COLUMNAS_VISIBLES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_COLUMNAS_VISIBLES, ...parsed };
  } catch {
    return DEFAULT_COLUMNAS_VISIBLES;
  }
}

function guardarColumnasVisibles(v: Record<TaskStatus, boolean>) {
  try {
    window.sessionStorage.setItem(COLUMNAS_STORAGE_KEY, JSON.stringify(v));
  } catch {
    // sessionStorage no disponible (modo privado, etc.) — no es crítico
  }
}

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
  onHide,
}: {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onHide: () => void;
}) {
  // El id de la columna coincide con el nombre del estado — handleDragEnd lo usa para detectar columna destino
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={`flex flex-col rounded-2xl border border-t-4 bg-muted/30 max-h-[70vh] min-h-[240px] ${COLUMN_STYLES[status]}`}
    >
      {/* Header — fijo, no se desplaza con el scroll de la columna */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
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
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onHide}
            title={`Ocultar columna ${TASK_STATUS_LABELS[status]}`}
          >
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
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
      </div>

      {/* Área de cards — registrada como droppable */}
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-4 min-h-[64px] rounded-b-2xl transition-colors",
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

// ─── Chip de columna oculta ─────────────────────────────────────
function HiddenColumnChip({
  status,
  count,
  onShow,
}: {
  status: TaskStatus;
  count: number;
  onShow: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onShow}
      className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition"
      title={`Mostrar columna ${TASK_STATUS_LABELS[status]}`}
    >
      <Eye className="h-3.5 w-3.5" />
      {TASK_STATUS_LABELS[status]}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${COLUMN_COUNTS_COLOR[status]}`}>
        {count}
      </span>
    </button>
  );
}

// ─── Board principal ──────────────────────────────────────────
export function TaskBoardClient({
  initialTasks,
  initialHasMore = false,
  usuarios,
  userRol = "usuario",
}: {
  initialTasks: Task[];
  initialHasMore?: boolean;
  usuarios: UserProfile[];
  userRol?: string;
}) {
  const [tasks, setTasks]           = useState<Task[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [view, setView]             = useState<"kanban" | "list">("kanban");
  const [filters, setFilters]       = useState<Filters>({
    search:        "",
    estado:        [],
    prioridad:     [],
    asignado:      [],
    modulo_origen: "",
  });

  // Visibilidad de columnas del Kanban — persiste durante la sesión del
  // navegador (sessionStorage): si el usuario navega a otra pantalla y
  // regresa a Tareas, encuentra el tablero como lo dejó.
  const [columnasVisibles, setColumnasVisibles] = useState<Record<TaskStatus, boolean>>(
    leerColumnasVisibles
  );

  // ── Paginación ──────────────────────────────────────────────
  // La carga inicial trae un conjunto acotado (ver page.tsx); "Cargar
  // más" trae más páginas de tareas no-canceladas. Las canceladas se
  // cargan aparte, bajo demanda, la primera vez que se muestra esa
  // columna (no vienen incluidas en la carga inicial).
  const [page, setPage]               = useState(0);
  const [hasMore, setHasMore]         = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [canceladasCargadas, setCanceladasCargadas] = useState(false);

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
  // Prioridad/asignado/búsqueda aplican a ambas vistas. Estado solo se
  // usa en la vista Lista — en Kanban, ocultar/mostrar columnas cumple
  // ese rol, por lo que no se descuenta nada aquí (evita que un filtro
  // de Estado dejado activo en Lista "desaparezca" columnas en Kanban
  // sin ningún control visible que lo explique).
  const baseFilteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filters.prioridad.length > 0 && !filters.prioridad.includes(t.prioridad)) return false;
      if (filters.asignado.length  > 0 && !filters.asignado.includes(t.asignado_a ?? "")) return false;
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
  }, [tasks, filters.prioridad, filters.asignado, filters.modulo_origen, filters.search]);

  const listVisibleTasks = useMemo(() => {
    if (filters.estado.length === 0) return baseFilteredTasks;
    return baseFilteredTasks.filter((t) => filters.estado.includes(t.estado));
  }, [baseFilteredTasks, filters.estado]);

  const columnTasks = useMemo(() => {
    const columns: Partial<Record<TaskStatus, Task[]>> = {};
    for (const status of TASK_STATUSES) {
      columns[status] = baseFilteredTasks.filter((t) => t.estado === status);
    }
    return columns;
  }, [baseFilteredTasks]);

  const visibleStatuses = TASK_STATUSES.filter((s) => columnasVisibles[s]);
  const hiddenStatuses  = TASK_STATUSES.filter((s) => !columnasVisibles[s]);

  // ── Cargar canceladas bajo demanda ─────────────────────────────
  function ensureCanceladasCargadas() {
    if (canceladasCargadas) return;
    setCanceladasCargadas(true);
    listarTareasPaginado({ estado: "cancelada" }, 0)
      .then(({ items }) => {
        setTasks((prev) => [...prev, ...items]);
      })
      .catch((err) => {
        console.error("[TaskBoard] error al cargar canceladas:", err);
        toast.error("No se pudieron cargar las tareas canceladas.");
      });
  }

  function toggleColumna(status: TaskStatus, visible: boolean) {
    if (visible && status === "cancelada") ensureCanceladasCargadas();
    const next = { ...columnasVisibles, [status]: visible };
    setColumnasVisibles(next);
    guardarColumnasVisibles(next);
  }

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

    const estadoAnterior = activeItem.estado;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeId ? { ...t, estado: targetStatus as TaskStatus } : t
      )
    );

    startTransition(async () => {
      try {
        await cambiarEstadoTarea(activeId, targetStatus as TaskStatus);
      } catch (err) {
        // Revertir el movimiento optimista si el guardado falla — antes esto
        // fallaba en silencio: la tarjeta se veía movida hasta el próximo
        // refresco de página, sin ningún aviso de que no se guardó.
        setTasks((prev) =>
          prev.map((t) => (t.id === activeId ? { ...t, estado: estadoAnterior } : t))
        );
        console.error("[TaskBoard] error al cambiar estado:", err);
        toast.error("No se pudo mover la tarea. Intenta de nuevo.");
      }
    });
  }

  // ── Cargar más tareas (pendiente/en_progreso/completada) ───────
  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { items, hasMore: more } = await listarTareasPaginado(
        { estado: ["pendiente", "en_progreso", "completada"] },
        nextPage
      );
      setTasks((prev) => [...prev, ...items]);
      setPage(nextPage);
      setHasMore(more);
    } catch (err) {
      console.error("[TaskBoard] error al cargar más tareas:", err);
      toast.error("No se pudieron cargar más tareas.");
    } finally {
      setLoadingMore(false);
    }
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

  const gridColsClass =
    visibleStatuses.length >= 4 ? "lg:grid-cols-4" :
    visibleStatuses.length === 3 ? "lg:grid-cols-3" :
    visibleStatuses.length === 2 ? "lg:grid-cols-2" :
    "lg:grid-cols-1";

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
            showEstadoFilter={view === "list"}
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
        <>
          {hiddenStatuses.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Columnas ocultas:</span>
              {hiddenStatuses.map((status) => (
                <HiddenColumnChip
                  key={status}
                  status={status}
                  count={(columnTasks[status] ?? []).length}
                  onShow={() => toggleColumna(status, true)}
                />
              ))}
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className={`grid gap-4 ${gridColsClass} grid-cols-1 md:grid-cols-2`}>
              {visibleStatuses.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  tasks={columnTasks[status] ?? []}
                  onAddTask={openCreate}
                  onEditTask={openEdit}
                  onHide={() => toggleColumna(status, false)}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeTask ? (
                <TaskCard task={activeTask} isDragging />
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      )}

      {/* ── Vista Lista ── */}
      {view === "list" && (
        <TaskListView
          tasks={listVisibleTasks}
          onEdit={openEdit}
          onTaskUpdated={(updated) =>
            setTasks((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            )
          }
          onTaskDeleted={handleTaskDeleted}
          userRol={userRol}
        />
      )}

      {/* Cargar más — la carga inicial trae un conjunto acotado, no el histórico completo */}
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Cargando…" : "Cargar más tareas"}
          </Button>
        </div>
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
