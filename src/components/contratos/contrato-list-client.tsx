"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  Filter, KanbanSquare, LayoutList, Plus, Search, Trash2, X,
} from "lucide-react";
import { nextSort, sortItems, activityTs } from "@/lib/sort-utils";
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
import { diasRestantes, CONTRACT_ESTADOS, CONTRACT_TIPOS, type Contrato, type ContratoFilters } from "@/types/contratos";
import { ArrowRight, Edit, MoreHorizontal } from "lucide-react";

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

export function ContratoListClient({ initialContratos }: { initialContratos: Contrato[] }) {
  const [viewMode, setViewMode]     = useState<ViewMode>("tabla");
  const [selected, setSelected]     = useState<string[]>([]);
  const [filters, setFilters]       = useState<ContratoFilters>({ search: "", estado: "", tipo: "" });
  const [sort, setSort]             = useState<SortState<ContratoSortKey>>({ key: "actividad", dir: "desc" });
  const [isPending, startTransition] = useTransition();

  function handleSort(key: ContratoSortKey) {
    setSort((prev) => nextSort(prev, key));
  }

  const filtered = useMemo(() => {
    const list = initialContratos.filter((c) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !c.titulo.toLowerCase().includes(q) &&
          !(c.numero ?? "").toLowerCase().includes(q) &&
          !(c.contraparte_nombre ?? "").toLowerCase().includes(q)
        ) return false;
      }
      if (filters.estado && c.estado !== filters.estado) return false;
      if (filters.tipo   && c.tipo   !== filters.tipo)   return false;
      return true;
    });
    return sortItems(list, sort, (c, key) => {
      switch (key as ContratoSortKey) {
        case "titulo":      return c.titulo;
        case "tipo":        return c.tipo;
        case "estado":      return c.estado;
        case "contraparte": return c.contraparte_nombre ?? "";
        case "valor":       return c.valor ?? 0;
        case "fecha_fin":   return c.fecha_fin ?? "";
        case "actividad":   return activityTs(c.created_at, c.updated_at);
        default:            return "";
      }
    });
  }, [initialContratos, filters, sort]);

  const hasActiveFilters = filters.search || filters.estado || filters.tipo;
  const clearFilters = () => setFilters({ search: "", estado: "", tipo: "" });

  const toggleSelect  = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleAll = () =>
    setSelected(selected.length === filtered.length ? [] : filtered.map((c) => c.id));

  const handleDelete = (id: string) => {
    startTransition(() => eliminarContrato(id));
  };
  const handleDeleteSelected = () => {
    startTransition(async () => {
      for (const id of selected) await eliminarContrato(id);
      setSelected([]);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Tarjetas resumen */}
      <ContratoStatCards contratos={initialContratos} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar contrato, número…"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="h-9 w-full pl-9"
            />
          </div>

          <Select
            value={filters.estado || "__all__"}
            onValueChange={(v) => setFilters({ ...filters, estado: v === "__all__" ? "" : (v as ContratoFilters["estado"]) })}
          >
            <SelectTrigger className="h-9 w-44 border-dashed">
              <Filter className="mr-2 h-3.5 w-3.5" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los estados</SelectItem>
              {CONTRACT_ESTADOS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.tipo || "__all__"}
            onValueChange={(v) => setFilters({ ...filters, tipo: v === "__all__" ? "" : (v as ContratoFilters["tipo"]) })}
          >
            <SelectTrigger className="h-9 w-36 border-dashed">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los tipos</SelectItem>
              {CONTRACT_TIPOS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
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

        {/* Right: toggle vista + nuevo */}
        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex items-center rounded-lg border bg-background p-1 shadow-sm">
            <button
              onClick={() => setViewMode("tabla")}
              className={cn("rounded-md p-1.5 transition", viewMode === "tabla" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Vista tabla"
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

          {/* Nuevo Contrato */}
          <Link href="/contratos/nuevo">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Contrato
            </Button>
          </Link>
        </div>
      </div>

      {/* Vista */}
      {viewMode === "tabla" ? (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      checked={selected.length === filtered.length && filtered.length > 0}
                      onCheckedChange={toggleAll}
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                      No hay contratos que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className={cn("border-b transition-colors hover:bg-muted/30", selected.includes(c.id) && "bg-muted/20")}>
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selected.includes(c.id)}
                          onCheckedChange={() => toggleSelect(c.id)}
                        />
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <Link href={`/contratos/${c.id}`} className="font-medium hover:underline line-clamp-2">
                          {c.titulo}
                        </Link>
                        {c.responsable_nombre && (
                          <p className="text-xs text-muted-foreground mt-0.5">{c.responsable_nombre}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {c.numero ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{c.tipo}</td>
                      <td className="px-4 py-3">
                        <ContratoStatusBadge estado={c.estado} />
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
                              <Link href={`/contratos/${c.id}`}>
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Ver detalle
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/contratos/${c.id}/editar`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(c.id)}
                              disabled={isPending}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
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
        <ContratoKanban contratos={filtered} />
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
