"use client";

import { Filter, MapPin, Search, X } from "lucide-react";
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
  VIGENCIA_COLORS,
  type PermitFilters,
  type VigenciaStatus,
} from "@/types/permits";
import { ESTADOS_PERMISO_OPTIONS } from "@/lib/constants/estados";
export type ViewMode = "table" | "grid" | "location";

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
  const hasActiveFilters =
    filters.search || filters.estado || filters.tipo || filters.entidad ||
    filters.responsable || filters.vigencia || filters.ubicacion;

  const clear = () =>
    onFiltersChange({ search: "", estado: "", tipo: "", entidad: "", responsable: "", vigencia: "", ubicacion: "" });

  return (
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
            {tiposPermiso.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.valor}</SelectItem>
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

        {ubicaciones.length > 0 && (
          <Select
            value={filters.ubicacion || "__all__"}
            onValueChange={(v) =>
              onFiltersChange({ ...filters, ubicacion: v === "__all__" ? "" : v })
            }
          >
            <SelectTrigger className="h-9 w-40 border-dashed">
              <MapPin className="mr-2 h-3.5 w-3.5" />
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

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clear}>
            <X className="mr-1 h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
    </div>
  );
}
