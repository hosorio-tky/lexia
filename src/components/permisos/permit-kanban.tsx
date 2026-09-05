"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PermitStatusBadge } from "./permit-status-badge";
import { cambiarEstado } from "@/app/actions/permisos";
import type { Permit } from "@/types/permits";
import {
  ESTADOS_PERMISO,
  PERMISO_TRANSITIONS,
  ESTADOS_PERMISO_LABELS,
} from "@/lib/constants/estados";

const COLUMNAS: { estadoId: string; label: string; colorClass: string }[] = [
  { estadoId: ESTADOS_PERMISO.CREADO,                  label: "Creado",                  colorClass: "border-t-slate-400" },
  { estadoId: ESTADOS_PERMISO.EN_GESTION,              label: "En Gestión",              colorClass: "border-t-blue-400" },
  { estadoId: ESTADOS_PERMISO.PRESENTADO,              label: "Presentado",              colorClass: "border-t-indigo-400" },
  { estadoId: ESTADOS_PERMISO.CON_PERMISO_PROVISIONAL, label: "Con Permiso Provisional",  colorClass: "border-t-amber-400" },
  { estadoId: ESTADOS_PERMISO.APROBADO,                label: "Aprobado",                colorClass: "border-t-emerald-400" },
  { estadoId: ESTADOS_PERMISO.ACTUALIZAR_PERMISO,      label: "Actualizar Permiso",       colorClass: "border-t-orange-400" },
  { estadoId: ESTADOS_PERMISO.RECHAZADO,               label: "Rechazado",                colorClass: "border-t-red-400" },
];

// Todas las columnas arrancan visibles — a diferencia de Contratos/Tareas,
// hoy no hay un criterio previo de "estados secundarios" para Permisos, y
// la vista de cuadrícula que reemplaza este Kanban ya mostraba las 7 mezcladas.
const DEFAULT_COLUMNAS_VISIBLES: Record<string, boolean> = Object.fromEntries(
  COLUMNAS.map((c) => [c.estadoId, true])
);

const COLUMNAS_STORAGE_KEY = "lexia:permisos:kanban:columnasVisibles";

function leerColumnasVisibles(): Record<string, boolean> {
  if (typeof window === "undefined") return DEFAULT_COLUMNAS_VISIBLES;
  try {
    const raw = window.sessionStorage.getItem(COLUMNAS_STORAGE_KEY);
    if (!raw) return DEFAULT_COLUMNAS_VISIBLES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_COLUMNAS_VISIBLES, ...parsed };
  } catch {
    return DEFAULT_COLUMNAS_VISIBLES;
  }
}

function guardarColumnasVisibles(v: Record<string, boolean>) {
  try {
    window.sessionStorage.setItem(COLUMNAS_STORAGE_KEY, JSON.stringify(v));
  } catch {
    // sessionStorage no disponible (modo privado, etc.) — no es crítico
  }
}

function diasRestantes(fecha?: string): number | null {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
}

function formatValor(valor?: number, moneda?: string): string | null {
  if (valor == null) return null;
  return `${moneda ?? "USD"} ${valor.toLocaleString("es-SV", { minimumFractionDigits: 0 })}`;
}

function PermitCard({ permit, canEdit }: { permit: Permit; canEdit: boolean }) {
  const [isPending, startTransition] = useTransition();
  const transicionIds = PERMISO_TRANSITIONS[permit.estado_id] ?? [];
  const dias          = diasRestantes(permit.fecha_vencimiento);

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm space-y-2 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/permisos/${permit.id}?from=kanban`}
          className="text-sm font-medium leading-tight hover:underline line-clamp-2"
        >
          {permit.nombre}
        </Link>

        {canEdit && transicionIds.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={isPending}
                className="shrink-0 inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
                style={{ whiteSpace: "nowrap" }}
              >
                <span className="max-w-[80px] truncate">{permit.estado}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              {transicionIds.map((id) => {
                const label = ESTADOS_PERMISO_LABELS[id] ?? id;
                return (
                  <DropdownMenuItem
                    key={id}
                    onClick={() => startTransition(() => cambiarEstado(permit.id, id, label))}
                  >
                    → {label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {(!canEdit || transicionIds.length === 0) && (
          <PermitStatusBadge estadoId={permit.estado_id} label={permit.estado} />
        )}
      </div>

      {permit.numero_expediente && (
        <p className="font-mono text-xs text-muted-foreground">{permit.numero_expediente}</p>
      )}
      {permit.ubicacion && (
        <p className="text-xs text-muted-foreground truncate">{permit.ubicacion}</p>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {formatValor(permit.valor_tramite, permit.moneda) && (
          <span className="font-medium text-foreground">
            {formatValor(permit.valor_tramite, permit.moneda)}
          </span>
        )}
        {dias != null && (
          <span className={dias < 0 ? "text-red-500" : dias <= 30 ? "text-amber-500" : ""}>
            {dias < 0 ? `Vencido hace ${Math.abs(dias)}d` : `${dias}d restantes`}
          </span>
        )}
      </div>

      {permit.responsable_nombre && (
        <div className="flex items-center gap-2 pt-1 border-t">
          <div className="grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-primary text-[9px] font-bold">
            {permit.responsable_iniciales}
          </div>
          <span className="text-xs text-muted-foreground truncate">{permit.responsable_nombre}</span>
        </div>
      )}
    </div>
  );
}

// ─── Chip de columna oculta ─────────────────────────────────────
function HiddenColumnChip({
  label,
  count,
  onShow,
}: {
  label: string;
  count: number;
  onShow: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onShow}
      className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition"
      title={`Mostrar columna ${label}`}
    >
      <Eye className="h-3.5 w-3.5" />
      {label}
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
        {count}
      </span>
    </button>
  );
}

export function PermitKanban({ permits, editableIds = [] }: { permits: Permit[]; editableIds?: string[] }) {
  const editableSet = new Set(editableIds);

  // Visibilidad de columnas — persiste durante la sesión del navegador
  // (sessionStorage): si el usuario navega a otra pantalla y regresa a
  // Permisos, o hace refresh, encuentra el tablero como lo dejó.
  const [columnasVisibles, setColumnasVisibles] = useState<Record<string, boolean>>(
    leerColumnasVisibles
  );

  function toggleColumna(estadoId: string, visible: boolean) {
    const next = { ...columnasVisibles, [estadoId]: visible };
    setColumnasVisibles(next);
    guardarColumnasVisibles(next);
  }

  const visibleColumnas = COLUMNAS.filter((c) => columnasVisibles[c.estadoId]);
  const hiddenColumnas  = COLUMNAS.filter((c) => !columnasVisibles[c.estadoId]);

  return (
    <div className="flex flex-col gap-3">
      {hiddenColumnas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Columnas ocultas:</span>
          {hiddenColumnas.map((col) => (
            <HiddenColumnChip
              key={col.estadoId}
              label={col.label}
              count={permits.filter((p) => p.estado_id === col.estadoId).length}
              onShow={() => toggleColumna(col.estadoId, true)}
            />
          ))}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-2">
        {visibleColumnas.map(({ estadoId, label, colorClass }) => {
          const items = permits.filter((p) => p.estado_id === estadoId);
          return (
            <div
              key={estadoId}
              className={`flex w-[300px] shrink-0 flex-col max-h-[70vh] min-h-[240px] rounded-xl border border-t-4 bg-muted/20 ${colorClass}`}
            >
              {/* Header — fijo, no se desplaza con el scroll de la columna */}
              <div className="flex shrink-0 items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => toggleColumna(estadoId, false)}
                  title={`Ocultar columna ${label}`}
                >
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>

              {/* Área de cards — con scroll propio, para que el alto del tablero no dependa de cuántos permisos haya */}
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-4 min-h-[64px]">
                {items.length === 0 ? (
                  <p className="px-1 text-xs text-muted-foreground italic">Sin permisos</p>
                ) : (
                  items.map((p) => <PermitCard key={p.id} permit={p} canEdit={editableSet.has(p.id)} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
