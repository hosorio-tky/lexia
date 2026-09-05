"use client";

import { useState } from "react";
import { ChevronDown, Filter, MapPin, Search, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  VIGENCIA_COLORS,
  type PermitFilters,
  type VigenciaStatus,
} from "@/types/permits";
import { ESTADOS_PERMISO_OPTIONS } from "@/lib/constants/estados";

export type ViewMode = "table" | "kanban" | "location";

const VIGENCIA_OPTIONS: VigenciaStatus[] = ["Vigente", "Por vencer", "Vencido"];

interface PermitFiltersBarProps {
  filters: PermitFilters;
  onFiltersChange: (filters: PermitFilters) => void;
  tiposPermiso?: { id: string; valor: string }[];
  responsables?: string[];
  ubicaciones?: string[];
}

export function PermitFiltersBar({
  filters,
  onFiltersChange,
  tiposPermiso = [],
  responsables = [],
  ubicaciones = [],
}: PermitFiltersBarProps) {
  const activeCount = [
    filters.estado,
    filters.vigencia,
    filters.tipo,
    filters.responsable,
    filters.ubicacion,
  ].filter(Boolean).length;

  const [panelOpen, setPanelOpen] = useState(() => activeCount > 0);

  const clear = () =>
    onFiltersChange({ ...filters, estado: "", tipo: "", entidad: "", responsable: "", vigencia: "", ubicacion: "" });

  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      {/* Search + toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar permiso, expediente…"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="h-9 w-full pl-9"
          />
        </div>

        <Button
          variant={panelOpen || activeCount > 0 ? "default" : "outline"}
          size="sm"
          className="h-9 gap-1.5 shrink-0"
          onClick={() => setPanelOpen((o) => !o)}
        >
          <Filter className="h-3.5 w-3.5" />
          Filtros
          {activeCount > 0 && (
            <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white/25 px-1 text-[10px] font-bold leading-none">
              {activeCount}
            </span>
          )}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", panelOpen && "rotate-180")} />
        </Button>
      </div>

      {/* Expandable filter panel */}
      {panelOpen && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <Select
              value={filters.estado || "__all__"}
              onValueChange={(v) =>
                onFiltersChange({ ...filters, estado: v === "__all__" ? "" : (v as PermitFilters["estado"]) })
              }
            >
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los estados</SelectItem>
                {ESTADOS_PERMISO_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.valor}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.vigencia || "__all__"}
              onValueChange={(v) =>
                onFiltersChange({ ...filters, vigencia: v === "__all__" ? "" : (v as VigenciaStatus) })
              }
            >
              <SelectTrigger className="h-9 bg-background">
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
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los tipos</SelectItem>
                {tiposPermiso.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.valor}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {responsables.length > 0 && (
              <Select
                value={filters.responsable || "__all__"}
                onValueChange={(v) =>
                  onFiltersChange({ ...filters, responsable: v === "__all__" ? "" : v })
                }
              >
                <SelectTrigger className="h-9 bg-background">
                  <User className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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

            {ubicaciones.length > 0 && (
              <Select
                value={filters.ubicacion || "__all__"}
                onValueChange={(v) =>
                  onFiltersChange({ ...filters, ubicacion: v === "__all__" ? "" : v })
                }
              >
                <SelectTrigger className="h-9 bg-background">
                  <MapPin className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="Ubicación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {ubicaciones.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {activeCount > 0 && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={clear}>
                <X className="mr-1.5 h-3.5 w-3.5" />
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
