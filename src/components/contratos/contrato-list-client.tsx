"use client";

import { useState, useMemo, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Filter, KanbanSquare, LayoutList, Plus, Search, Trash2, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { SortableTh } from "@/components/ui/sortable-th";
import { ActivityCell } from "@/components/ui/activity-cell";
import type { SortState } from "@/lib/sort-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ContratoStatCards } from "./contrato-stat-cards";
import { ContratoStatusBadge } from "./contrato-status-badge";
import { ContratoKanban } from "./contrato-kanban";
import { eliminarContrato } from "@/app/actions/contratos";
import { diasRestantes, type Contrato } from "@/types/contratos";
import { ESTADOS_CONTRATO_OPTIONS } from "@/lib/constants/estados";

import { ArrowRight, Edit, MoreHorizontal } from "lucide-react";
import { AccesoIndicador } from "@/components/shared/acceso-indicador";
import type { CatalogoItem } from "@/types/settings";

type ViewMode = "tabla" | "kanban";
type ContratoSortKey = "titulo" | "tipo" | "estado" | "contraparte" | "valor" | "fecha_fin" | "actividad";

function formatFecha(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-SV", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatValor(valor?: number, moneda?: string): string {
  if (valor == null) return "—";
  return `${moneda ?? "USD"} ${valor.toLocaleString("es-SV", { minimumFractionDigits: 0 })}`;
}

function VencimientoCell({ iso }: { iso?: string }) {
  if (!iso) return <span className="text-muted-foreground">—</span>;
  const dias = diasRestantes(iso);
  const formatted = formatFecha(iso);
  if (dias == null) return <span>{formatted}</span>;

  let labelCls = "";
  let label = "";
  if (dias < 0) { label = "Vencido"; labelCls = "text-red-500"; }
  else if (dias <= 30) { label = `${dias}d restantes`; labelCls = "text-red-500 font-medium"; }
  else if (dias <= 90) { label = `${dias}d restantes`; labelCls = "text-amber-600 font-medium"; }

  return (
    <div className="flex flex-col gap-0.5">
      <span>{formatted}</span>
      {label && <span className={`text-[10px] ${labelCls}`}>{label}</span>}
    </div>
  );
}

export function ContratoListClient({
  contratos,
  statsData,
  userId,
  userRol,
  editableIds = [],
  tiposContrato = [],
  total,
  page,
  pageSize,
}: {
  contratos:    Contrato[];
  statsData:    { estado_id: string; fecha_fin?: string | null; valor?: number | null }[];
  userId?:      string;
  userRol?:     string;
  editableIds?: string[];
  tiposContrato?: CatalogoItem[];
  total:    number;
  page:     number;
  pageSize: number;
}) {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  const viewMode = (searchParams.get("v") as ViewMode | null) ?? "tabla";

  // Sort derived from URL
  const sort: SortState<ContratoSortKey> = {
    key: (searchParams.get("sort") as ContratoSortKey) ?? "actividad",
    dir: (searchParams.get("dir") as "asc" | "desc") ?? "desc",
  };

  const [selected, setSelected]      = useState<string[]>([]);
  const [isPending, startTransition]  = useTransition();

  // Debounced search
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

  function setViewMode(mode: ViewMode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("v", mode);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleSort(key: ContratoSortKey) {
    const currentKey = (searchParams.get("sort") as ContratoSortKey) ?? "actividad";
    const currentDir = (searchParams.get("dir") as "asc" | "desc") ?? "desc";
    const newDir: "asc" | "desc" = currentKey === key
      ? (currentDir === "desc" ? "asc" : "desc")
      : "desc";
    navigate({ sort: key, dir: newDir });
  }

  const hasActiveFilters = !!(searchParams.get("search") || searchParams.get("estado") || searchParams.get("tipo"));

  function clearFilters() {
    setSearchInput("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("estado");
    params.delete("tipo");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const editableSet = useMemo(() => new Set(editableIds), [editableIds]);
  const editableVisible = useMemo(() => contratos.filter((c) => editableSet.has(c.id)), [contratos, editableSet]);

  const toggleSelect  = (id: string) => {
    if (!editableSet.has(id)) return;
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleAll = () =>
    setSelected(selected.length === editableVisible.length && editableVisible.length > 0
      ? []
      : editableVisible.map((c) => c.id));

  const handleDelete = (id: string) => {
    startTransition(() => eliminarContrato(id));
  };
  const handleDeleteSelected = () => {
    const toDelete = selected.filter((id) => editableSet.has(id));
    startTransition(async () => {
      for (const id of toDelete) await eliminarContrato(id);
      setSelected([]);
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <ContratoStatCards contratos={statsData} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar contrato, número…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 w-full pl-9"
            />
          </div>

          <Select
            value={searchParams.get("estado") || "__all__"}
            onValueChange={(v) => navigate({ estado: v === "__all__" ? undefined : v })}
          >
            <SelectTrigger className="h-9 w-44 border-dashed">
              <Filter className="mr-2 h-3.5 w-3.5" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los estados</SelectItem>
              {ESTADOS_CONTRATO_OPTIONS.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.valor}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={searchParams.get("tipo") || "__all__"}
            onValueChange={(v) => navigate({ tipo: v === "__all__" ? undefined : v })}
          >
            <SelectTrigger className="h-9 w-36 border-dashed">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los tipos</SelectItem>
              {tiposContrato.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.valor}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearFilters}>
              <X className="mr-1 h-3.5 w-3.5" />
              Limpiar
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-background p-1 shadow-sm">
            <button
              onClick={() => setViewMode("tabla")}
              className={cn("rounded-md p-1.5 transition", viewMode === "tabla" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Vista lista"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={cn("rounded-md p-1.5 transition", viewMode === "kanban" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Vista Kanban"
            >
              <KanbanSquare className="h-4 w-4" />
            </button>
          </div>

          <Link href="/contratos/nuevo">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Contrato
            </Button>
          </Link>
        </div>
      </div>

      {/* Contador */}
      {total > 0 && pageSize < total && viewMode === "tabla" && (
        <p className="text-xs text-muted-foreground">
          {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} de {total} contratos
          {hasActiveFilters ? " (filtrado)" : ""}
        </p>
      )}

      {/* Vista */}
      {viewMode === "tabla" ? (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      checked={editableVisible.length > 0 && selected.length === editableVisible.length}
                      onCheckedChange={toggleAll}
                      disabled={editableVisible.length === 0}
                    />
                  </th>
                  <SortableTh label="Título"      sortKey="titulo"      sort={sort} onSort={handleSort} />
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">N°</th>
                  <SortableTh label="Tipo"        sortKey="tipo"        sort={sort} onSort={handleSort} />
                  <SortableTh label="Estado"      sortKey="estado"      sort={sort} onSort={handleSort} />
                  <SortableTh label="Contraparte" sortKey="contraparte" sort={sort} onSort={handleSort} />
                  <SortableTh label="Valor"       sortKey="valor"       sort={sort} onSort={handleSort} align="right" />
                  <SortableTh label="Fecha Fin"   sortKey="fecha_fin"   sort={sort} onSort={handleSort} />
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Vencimiento</th>
                  <SortableTh label="Actividad"   sortKey="actividad"   sort={sort} onSort={handleSort} className="hidden lg:table-cell" />
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {contratos.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                      No hay contratos que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  contratos.map((c) => (
                    <tr key={c.id} className={cn("border-b transition-colors hover:bg-muted/30", selected.includes(c.id) && "bg-muted/20")}>
                      <td className="px-4 py-3">
                        {editableSet.has(c.id) && (
                          <Checkbox
                            checked={selected.includes(c.id)}
                            onCheckedChange={() => toggleSelect(c.id)}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/contratos/${c.id}?from=tabla`} className="font-medium hover:underline line-clamp-2">
                            {c.titulo}
                          </Link>
                          <AccesoIndicador
                            resourceType="contrato"
                            resourceId={c.id}
                            resourceName={c.titulo}
                            visibilidad={c.visibilidad ?? "publico"}
                            canManage={userRol === "admin" || c.created_by === userId}
                          />
                        </div>
                        {c.responsable_nombre && (
                          <p className="text-xs text-muted-foreground mt-0.5">{c.responsable_nombre}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {c.numero ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{c.tipo}</td>
                      <td className="px-4 py-3">
                        <ContratoStatusBadge estadoId={c.estado_id} label={c.estado} />
                      </td>
                      <td className="px-4 py-3 max-w-[160px] truncate text-sm text-muted-foreground">
                        {c.contraparte_nombre ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
                        {formatValor(c.valor, c.moneda)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{formatFecha(c.fecha_fin)}</td>
                      <td className="px-4 py-3">
                        <VencimientoCell iso={c.fecha_fin} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <ActivityCell createdAt={c.created_at} updatedAt={c.updated_at} />
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs">Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/contratos/${c.id}?from=tabla`}>
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Ver detalle
                              </Link>
                            </DropdownMenuItem>
                            {editableSet.has(c.id) && (
                              <DropdownMenuItem asChild>
                                <Link href={`/contratos/${c.id}/editar`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {editableSet.has(c.id) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(c.id)}
                                  disabled={isPending}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <ContratoKanban contratos={contratos} editableIds={editableIds} />
      )}

      {/* Paginación — solo en vista tabla */}
      {totalPages > 1 && viewMode === "tabla" && (
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
          <span className="font-medium">{selected.length} contratos seleccionados</span>
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
