"use client";

import { useState, useMemo, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Plus, Trash2, Upload, ChevronDown, ChevronLeft, ChevronRight, LayoutList, LayoutGrid, MapPin, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { obtenerPermisosParaExportar } from "@/app/actions/permisos";
import { descargarExcel } from "@/lib/export-excel";
import type { SortState } from "@/lib/sort-utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PermitStatCards } from "./permit-stat-cards";
import { PermitFiltersBar, type ViewMode } from "./permit-filters";
import { PermitTable } from "./permit-table";
import { PermitCardsGrid } from "./permit-cards-grid";
import { PermitLocationView } from "./permit-location-view";
import { PermitImportDialog } from "./permit-import-dialog";
import { eliminarPermiso } from "@/app/actions/permisos";
import type { Permit, PermitFilters, VigenciaStatus } from "@/types/permits";

type PermitSortKey = "nombre" | "tipo" | "estado" | "vencimiento" | "actividad";

export function PermitListClient({
  permits,
  statsData,
  userId,
  userRol,
  editableIds = [],
  tiposPermiso = [],
  responsables = [],
  ubicaciones = [],
  total,
  page,
  pageSize,
}: {
  permits:      Permit[];
  statsData:    { estado_id: string }[];
  userId?:      string;
  userRol?:     string;
  editableIds?: string[];
  tiposPermiso?: { id: string; valor: string }[];
  responsables?: string[];
  ubicaciones?:  string[];
  total:    number;
  page:     number;
  pageSize: number;
}) {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  // Derive view mode + sort from URL (no useState needed)
  const viewMode = (searchParams.get("v") as ViewMode | null) ?? "table";
  const sort: SortState<PermitSortKey> = {
    key: (searchParams.get("sort") as PermitSortKey) ?? "actividad",
    dir: (searchParams.get("dir") as "asc" | "desc") ?? "desc",
  };

  // Local state only for things not affecting server fetch
  const [selected, setSelected]     = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Debounced search: local input state → URL after 400ms
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");

  const navigate = useCallback((overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v); else params.delete(k);
    }
    if (!("page" in overrides)) params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }, [router, searchParams, pathname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams.get("search") ?? "";
      if (searchInput !== current) navigate({ search: searchInput || undefined });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build filters object from URL (search overridden by local state for immediate display)
  const urlFilters: PermitFilters = {
    search:      searchInput,
    estado:      searchParams.get("estado")      ?? "",
    tipo:        searchParams.get("tipo")        ?? "",
    entidad:     "",
    responsable: searchParams.get("responsable") ?? "",
    vigencia:    (searchParams.get("vigencia") as VigenciaStatus | "") ?? "",
    ubicacion:   searchParams.get("ubicacion")   ?? "",
  };

  function handleFiltersChange(newFilters: PermitFilters) {
    if (newFilters.search !== urlFilters.search) {
      setSearchInput(newFilters.search ?? "");
      return;
    }
    // Non-search filter → navigate immediately, reset page
    navigate({
      estado:      newFilters.estado      || undefined,
      tipo:        newFilters.tipo        || undefined,
      responsable: newFilters.responsable || undefined,
      vigencia:    newFilters.vigencia    || undefined,
      ubicacion:   newFilters.ubicacion   || undefined,
      search:      searchParams.get("search") || undefined,
    });
  }

  function setViewMode(mode: ViewMode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("v", mode);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleSort(key: PermitSortKey) {
    const currentKey = (searchParams.get("sort") as PermitSortKey) ?? "actividad";
    const currentDir = (searchParams.get("dir") as "asc" | "desc") ?? "desc";
    const newDir: "asc" | "desc" = currentKey === key
      ? (currentDir === "desc" ? "asc" : "desc")
      : "desc";
    navigate({ sort: key, dir: newDir });
  }

  const editableSet = useMemo(() => new Set(editableIds), [editableIds]);
  const editableVisible = useMemo(() => permits.filter((p) => editableSet.has(p.id)), [permits, editableSet]);

  const toggleSelect = (id: string) => {
    if (!editableSet.has(id)) return;
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleAll = () =>
    setSelected(selected.length === editableVisible.length && editableVisible.length > 0
      ? []
      : editableVisible.map((p) => p.id));

  const [confirmId, setConfirmId]           = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk]       = useState(false);

  const handleDelete = (id: string) => setConfirmId(id);

  const confirmDelete = () => {
    if (!confirmId) return;
    startTransition(() => eliminarPermiso(confirmId));
    setConfirmId(null);
  };

  const handleDeleteSelected = () => setConfirmBulk(true);

  const confirmDeleteSelected = () => {
    const toDelete = selected.filter((id) => editableSet.has(id));
    startTransition(async () => {
      for (const id of toDelete) await eliminarPermiso(id);
      setSelected([]);
    });
    setConfirmBulk(false);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = !!(searchParams.get("search") || searchParams.get("estado") || searchParams.get("tipo") ||
    searchParams.get("responsable") || searchParams.get("vigencia") || searchParams.get("ubicacion"));

  const [exporting, setExporting] = useState(false);
  async function handleExportExcel() {
    setExporting(true);
    try {
      const data = await obtenerPermisosParaExportar(urlFilters);
      const rows = data.map((p) => ({
        "Expediente":        p.numero_expediente ?? "",
        "Nombre":            p.nombre,
        "Tipo":              p.tipo,
        "Estado":            p.estado,
        "Entidad reguladora": p.entidad_reguladora ?? "",
        "Ubicación":         p.ubicacion ?? "",
        "Responsable":       p.responsable_nombre ?? "",
        "Fecha solicitud":   p.fecha_solicitud ?? "",
        "Fecha emisión":     p.fecha_emision ?? "",
        "Fecha vencimiento": p.fecha_vencimiento ?? "",
        "Valor trámite":     p.valor_tramite ?? "",
        "Moneda":            p.moneda ?? "",
        "Riesgo":            p.riesgo_incumplimiento ?? "",
      }));
      descargarExcel(rows, "permisos.xlsx");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PermitStatCards permits={statsData} />

      {/* Toolbar */}
      <div className="flex items-start justify-between gap-3">
        <PermitFiltersBar
          filters={urlFilters}
          onFiltersChange={handleFiltersChange}
          tiposPermiso={tiposPermiso}
          responsables={responsables}
          ubicaciones={ubicaciones}
        />
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center rounded-lg border bg-background p-1 shadow-sm">
            {(["table", "grid", "location"] as const).map((mode) => {
              const icons = {
                table:    <LayoutList className="h-4 w-4" />,
                grid:     <LayoutGrid className="h-4 w-4" />,
                location: <MapPin className="h-4 w-4" />,
              };
              const titles = { table: "Vista lista", grid: "Vista tarjetas", location: "Por ubicación" };
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "rounded-md p-1.5 transition",
                    viewMode === mode
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title={titles[mode]}
                >
                  {icons[mode]}
                </button>
              );
            })}
          </div>
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
              <DropdownMenuItem onClick={handleExportExcel} disabled={exporting}>
                <FileDown className="mr-2 h-4 w-4" />
                {exporting ? "Exportando…" : "Exportar a Excel"}
              </DropdownMenuItem>
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
        onSuccess={() => {}}
      />

      {/* Contador */}
      {total > 0 && pageSize < total && (
        <p className="text-xs text-muted-foreground">
          {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} de {total} permisos
          {hasFilters ? " (filtrado)" : ""}
        </p>
      )}

      {/* Lista */}
      <div className="md:hidden">
        <PermitCardsGrid permits={permits} />
      </div>
      <div className="hidden md:block">
        {viewMode === "table" && (
          <PermitTable
            permits={permits}
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
          <PermitCardsGrid permits={permits} />
        )}
        {viewMode === "location" && (
          <PermitLocationView permits={permits} userId={userId} userRol={userRol} />
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && viewMode !== "location" && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => navigate({ page: String(page - 1) })}
          >
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => navigate({ page: String(page + 1) })}
          >
            Siguiente
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Barra bulk */}
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

      {/* Confirmación eliminar individual */}
      <AlertDialog open={!!confirmId} onOpenChange={(open) => { if (!open) setConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar permiso?</AlertDialogTitle>
            <AlertDialogDescription>
              El permiso se moverá a la papelera. Podrás restaurarlo desde Papelera si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación eliminar masivo */}
      <AlertDialog open={confirmBulk} onOpenChange={(open) => { if (!open) setConfirmBulk(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selected.length} permisos?</AlertDialogTitle>
            <AlertDialogDescription>
              Los permisos seleccionados se moverán a la papelera. Podrás restaurarlos desde Papelera.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteSelected}
            >
              Eliminar {selected.length} permisos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
