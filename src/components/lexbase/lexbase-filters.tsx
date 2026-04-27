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
import { LEXBASE_TIPOS, type LexbaseFilters, type LexbaseCategoria } from "@/types/lexbase";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";

interface LexbaseFiltersBarProps {
  filters: LexbaseFilters;
  onFiltersChange: (filters: LexbaseFilters) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  categorias: LexbaseCategoria[];
  paises?: string[];
  tags?: string[];
}

export function LexbaseFiltersBar({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  categorias,
  paises = [],
  tags = [],
}: LexbaseFiltersBarProps) {
  const hasActiveFilters =
    filters.search ||
    filters.tipo ||
    filters.categoria_id ||
    filters.pais ||
    filters.tiene_reformas !== null ||
    filters.tag;

  const clear = () =>
    onFiltersChange({
      search:        "",
      tipo:          "",
      categoria_id:  "",
      pais:          "",
      tiene_reformas: null,
      tag:           "",
    });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Left: search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar documento, número…"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="h-9 w-full pl-9"
          />
        </div>

        <Select
          value={filters.tipo || "__all__"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              tipo: v === "__all__" ? "" : (v as LexbaseFilters["tipo"]),
            })
          }
        >
          <SelectTrigger className="h-9 w-40 border-dashed">
            <Filter className="mr-2 h-3.5 w-3.5" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los tipos</SelectItem>
            {LEXBASE_TIPOS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {categorias.length > 0 && (
          <Select
            value={filters.categoria_id || "__all__"}
            onValueChange={(v) =>
              onFiltersChange({ ...filters, categoria_id: v === "__all__" ? "" : v })
            }
          >
            <SelectTrigger className="h-9 w-44 border-dashed">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las categorías</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {paises.length > 0 && (
          <Select
            value={filters.pais || "__all__"}
            onValueChange={(v) =>
              onFiltersChange({ ...filters, pais: v === "__all__" ? "" : v })
            }
          >
            <SelectTrigger className="h-9 w-36 border-dashed">
              <SelectValue placeholder="País" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los países</SelectItem>
              {paises.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={
            filters.tiene_reformas === null
              ? "__all__"
              : filters.tiene_reformas
              ? "true"
              : "false"
          }
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              tiene_reformas: v === "__all__" ? null : v === "true",
            })
          }
        >
          <SelectTrigger className="h-9 w-44 border-dashed">
            <SelectValue placeholder="Reformas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Con y sin reformas</SelectItem>
            <SelectItem value="true">Con reformas</SelectItem>
            <SelectItem value="false">Sin reformas</SelectItem>
          </SelectContent>
        </Select>

        {tags.length > 0 && (
          <Select
            value={filters.tag || "__all__"}
            onValueChange={(v) =>
              onFiltersChange({ ...filters, tag: v === "__all__" ? "" : v })
            }
          >
            <SelectTrigger className="h-9 w-36 border-dashed">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los tags</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
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
        <button
          onClick={() => onViewModeChange("list")}
          className={cn(
            "rounded-md p-1.5 transition",
            viewMode === "list"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="Vista lista"
        >
          <LayoutList className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
