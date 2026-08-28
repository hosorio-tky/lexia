"use client";

import { Search, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterMultiSelect } from "./task-filter-multiselect";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_PRIORITIES,
  PRIORITY_LABELS,
  type TaskFilters,
} from "@/types/tasks";
import type { UserProfile } from "@/types/users";

interface TaskFiltersProps {
  filters: TaskFilters;
  onFiltersChange: (f: TaskFilters) => void;
  usuarios: UserProfile[];
  onNewTask: () => void;
  /** En Kanban el filtro de Estado no aplica — ocultar/mostrar columnas cumple ese rol. */
  showEstadoFilter?: boolean;
}

export function TaskFilters({
  filters,
  onFiltersChange,
  usuarios,
  onNewTask,
  showEstadoFilter = true,
}: TaskFiltersProps) {
  function set<K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  const hasFilters =
    filters.search ||
    filters.estado.length > 0 ||
    filters.prioridad.length > 0 ||
    filters.asignado.length > 0 ||
    filters.modulo_origen;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Búsqueda */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar tareas…"
          className="pl-9"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
        />
      </div>

      {/* Estado — solo en la vista Lista; en Kanban el rol lo cumple ocultar/mostrar columnas */}
      {showEstadoFilter && (
        <FilterMultiSelect
          label="Estado"
          options={TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] }))}
          selected={filters.estado}
          onChange={(v) => set("estado", v as TaskFilters["estado"])}
        />
      )}

      {/* Prioridad */}
      <FilterMultiSelect
        label="Prioridad"
        options={TASK_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
        selected={filters.prioridad}
        onChange={(v) => set("prioridad", v as TaskFilters["prioridad"])}
      />

      {/* Asignado */}
      <FilterMultiSelect
        label="Asignado a"
        options={usuarios.map((u) => ({ value: u.id, label: u.nombre_completo }))}
        selected={filters.asignado}
        onChange={(v) => set("asignado", v)}
      />

      {/* Limpiar filtros */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onFiltersChange({
              search: "",
              estado: [],
              prioridad: [],
              asignado: [],
              modulo_origen: "",
            })
          }
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          Limpiar
        </Button>
      )}

      <div className="ml-auto">
        <Button onClick={onNewTask} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Nueva tarea
        </Button>
      </div>
    </div>
  );
}
