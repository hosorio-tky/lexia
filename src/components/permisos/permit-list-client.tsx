"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Plus, Trash2, Upload, ChevronDown } from "lucide-react";
import { nextSort, sortItems, activityTs } from "@/lib/sort-utils";
import type { SortState } from "@/lib/sort-utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PermitStatCards } from "./permit-stat-cards";
import { PermitFiltersBar, type ViewMode } from "./permit-filters";
import { PermitTable } from "./permit-table";
import { PermitCardsGrid } from "./permit-cards-grid";
import { PermitLocationView } from "./permit-location-view";
import { PermitImportDialog } from "./permit-import-dialog";
import { eliminarPermiso } from "@/app/actions/permisos";
import { calcularVigencia } from "@/types/permits";
import type { Permit, PermitFilters } from "@/types/permits";

type PermitSortKey = "nombre" | "tipo" | "estado" | "vencimiento" | "actividad";

export function PermitListClient({
  initialPermits,
  userId,
  userRol,
  editableIds = [],
  tiposPermiso = [],
}: {
  initialPermits: Permit[];
  userId?: string;
  userRol?: string;
  editableIds?: string[];
  tiposPermiso?: string[];
}) {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  const viewMode = (searchParams.get("v") as ViewMode | null) ?? "table";

  function setViewMode(mode: ViewMode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("v", mode);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const [selected, setSelected]     = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [filters, setFilters]       = useState<PermitFilters>({
    search: "", estado: "", tipo: "", entidad: "", responsable: "", vigencia: "", ubicacion: "",
  });
  const [sort, setSort] = useState<SortState<PermitSortKey>>({ key: "actividad", dir: "desc" });
  const [isPending, startTransition] = useTransition();

  const editableSet = useMemo(() => new Set(editableIds), [editableIds]);

  function handleSort(key: PermitSortKey) {
    setSort((prev) => nextSort(prev, key));
  }

  const responsables = useMemo(() => {
    const names = initialPermits
      .map((p) => p.responsable_nombre)
      .filter((n): n is string => Boolean(n));
    return [...new Set(names)].sort();
  }, [initialPermits]);

  const ubicaciones = useMemo(() => {
    const locs = initialPermits
      .map((p) => p.ubicacion)
      .filter((u): u is string => Boolean(u));
    return [...new Set(locs)].sort((a, b) => a.localeCompare(b, "es"));
  }, [initialPermits]);

  const filtered = useMemo(() => {
    const list = initialPermits.filter((p) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !p.nombre.toLowerCase().includes(q) &&
          !(p.numero_expediente ?? "").toLowerCase().includes(q) &&
          !(p.entidad_reguladora ?? "").toLowerCase().includes(q)
        ) return false;
      }
      if (filters.estado    && p.estado_id            !== filters.estado)    return false;
      if (filters.tipo      && p.tipo                !== filters.tipo)      return false;
      if (filters.entidad   && p.entidad_reguladora  !== filters.entidad)   return false;
      if (filters.responsable && p.responsable_nombre !== filters.responsable) return false;
      if (filters.vigencia  && calcularVigencia(p.fecha_vencimiento) !== filters.vigencia) return false;
      if (filters.ubicacion && (p.ubicacion ?? "") !== filters.ubicacion)   return false;
      return true;
    });
    return sortItems(list, sort, (p, key) => {
      switch (key as PermitSortKey) {
        case "nombre":      return p.nombre;
        case "tipo":        return p.tipo;
        case "estado":      return p.estado;
        case "vencimiento": return p.fecha_vencimiento ?? "";
        case "actividad":   return activityTs(p.created_at, p.updated_at);
        default:            return "";
      }
    });
  }, [initialPermits, filters, sort]);

  const editableFiltered = useMemo(
    () => filtered.filter((p) => editableSet.has(p.id)),
    [filtered, editableSet],
  );

  const toggleSelect = (id: string) => {
    if (!editableSet.has(id)) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleAll = () =>
    setSelected(selected.length === editableFiltered.length && editableFiltered.length > 0
      ? []
      : editableFiltered.map((p) => p.id));

  const handleDelete = (id: string) => {
    startTransition(() => eliminarPermiso(id));
  };

  const handleDeleteSelected = () => {
    const toDelete = selected.filter((id) => editableSet.has(id));
    startTransition(async () => {
      for (const id of toDelete) await eliminarPermiso(id);
      setSelected([]);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Tarjetas resumen */}
      <PermitStatCards permits={initialPermits} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PermitFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          tiposPermiso={tiposPermiso}
          responsables={responsables}
          ubicaciones={ubicaciones}
        />
        <div className="flex items-center">
          <Link href="/permisos/nuevo">
            <Button size="sm" className="rounded-r-none border-r-0">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Permiso
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="rounded-l-none px-2">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Importar desde Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <PermitImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => { /* revalidatePath ya actualiza el server — el dialog se queda abierto */ }}
      />

      {/* Lista — móvil siempre cards, desktop respeta el toggle */}
      <div className="md:hidden">
        <PermitCardsGrid permits={filtered} />
      </div>
      <div className="hidden md:block">
        {viewMode === "table" && (
          <PermitTable
            permits={filtered}
            selected={selected}
            onToggle={toggleSelect}
            onToggleAll={toggleAll}
            onDelete={handleDelete}
            sort={sort}
            onSort={handleSort}
            userId={userId}
            userRol={userRol}
            editableIds={editableIds}
          />
        )}
        {viewMode === "grid" && (
          <PermitCardsGrid permits={filtered} />
        )}
        {viewMode === "location" && (
          <PermitLocationView permits={filtered} userId={userId} userRol={userRol} />
        )}
      </div>

      {/* Barra de acciones en bulk */}
      {selected.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-800 bg-slate-900 py-2 pl-5 pr-3 text-sm text-white shadow-xl">
          <span className="font-medium">{selected.length} permisos seleccionados</span>
          <div className="h-4 w-px bg-white/20" />
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-white hover:bg-white/20 hover:text-white"
            onClick={handleDeleteSelected}
            disabled={isPending}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {isPending ? "Eliminando…" : "Eliminar"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-white hover:bg-white/20 hover:text-white"
            onClick={() => setSelected([])}
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
