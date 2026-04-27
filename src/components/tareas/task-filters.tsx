"use client";

import { Search, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
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
}

export function TaskFilters({
  filters,
  onFiltersChange,
  usuarios,
  onNewTask,
}: TaskFiltersProps) {
  function set<K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  const hasFilters =
    filters.search ||
    filters.prioridad ||
    filters.asignado ||
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

      {/* Prioridad */}
      <Select
        value={filters.prioridad || "_todas"}
        onValueChange={(v) => set("prioridad", v === "_todas" ? "" : v as TaskFilters["prioridad"])}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_todas">Todas</SelectItem>
          {TASK_PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Asignado */}
      <Select
        value={filters.asignado || "_todos"}
        onValueChange={(v) => set("asignado", v === "_todos" ? "" : v)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Asignado a" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_todos">Todos</SelectItem>
          {usuarios.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.nombre_completo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Canceladas */}
      <div className="flex items-center gap-2">
        <Switch
          id="canceladas"
          checked={filters.mostrar_canceladas}
          onCheckedChange={(v) => set("mostrar_canceladas", v)}
        />
        <Label htmlFor="canceladas" className="text-sm cursor-pointer whitespace-nowrap">
          Ver canceladas
        </Label>
      </div>

      {/* Limpiar filtros */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onFiltersChange({
              search: "",
              prioridad: "",
              asignado: "",
              modulo_origen: "",
              mostrar_canceladas: filters.mostrar_canceladas,
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
