"use client";

import { Filter, LayoutGrid, LayoutList, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "lucide-react";
import {
  PERMIT_STATUSES,
  PERMIT_TYPES,
  VIGENCIA_COLORS,
  type PermitFilters,
  type VigenciaStatus,
} from "@/types/permits";
import { cn } from "@/lib/utils";

type ViewMode = "table" | "grid";

const VIGENCIA_OPTIONS: VigenciaStatus[] = ["Vigente", "Por vencer", "Vencido"];

interface PermitFiltersBarProps {
  filters: PermitFilters;
  onFiltersChange: (filters: PermitFilters) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  responsables?: string[];   // SC-10: lista de responsables únicos
}

export function PermitFiltersBar({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  responsables = [],
}: PermitFiltersBarProps) {
  const hasActiveFilters =
    filters.search || filters.estado || filters.tipo || filters.entidad || filters.responsable || filters.vigencia;

  const clear = () =>
    onFiltersChange({ search: "", estado: "", tipo: "", entidad: "", responsable: "", vigencia: "" });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Left: search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar permiso, expediente…"
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="h-9 w-full pl-9"
          />
        </div>

        <Select
          value={filters.estado || "__all__"}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, estado: v === "__all__" ? "" : (v as PermitFilters["estado"]) })
          }
        >
          <SelectTrigger className="h-9 w-44 border-dashed">
            <Filter className="mr-2 h-3.5 w-3.5" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los estados</SelectItem>
            {PERMIT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.vigencia || "__all__"}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, vigencia: v === "__all__" ? "" : (v as VigenciaStatus) })
          }
        >
          <SelectTrigger className="h-9 w-36 border-dashed">
            <SelectValue placeholder="Vigencia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toda vigencia</SelectItem>
            {VIGENCIA_OPTIONS.map((v) => (
              <SelectItem key={v} value={v}>
                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${VIGENCIA_COLORS[v].split(" ")[0]}`} />
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.tipo || "__all__"}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, tipo: v === "__all__" ? "" : (v as PermitFilters["tipo"]) })
          }
        >
          <SelectTrigger className="h-9 w-36 border-dashed">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los tipos</SelectItem>
            {PERMIT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* SC-10: filtro por responsable */}
        {responsables.length > 0 && (
          <Select
            value={filters.responsable || "__all__"}
            onValueChange={(v) =>
              onFiltersChange({ ...filters, responsable: v === "__all__" ? "" : v })
            }
          >
            <SelectTrigger className="h-9 w-40 border-dashed">
              <User className="mr-2 h-3.5 w-3.5" />
              <SelectValue placeholder="Responsable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {responsables.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clear}>
            <X className="mr-1 h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Right: view toggle */}
      <div className="flex items-center rounded-lg border bg-background p-1 shadow-sm">
        <button
          onClick={() => onViewModeChange("table")}
          className={cn(
            "rounded-md p-1.5 transition",
            viewMode === "table"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="Vista tabla"
        >
          <LayoutList className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewModeChange("grid")}
          className={cn(
            "rounded-md p-1.5 transition",
            viewMode === "grid"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="Vista tarjetas"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
