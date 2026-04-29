"use client";

import Link from "next/link";
import { ArrowRight, Edit, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PermitStatusBadge, VigenciaBadge } from "./permit-status-badge";
import { calcularVigencia } from "@/types/permits";
import type { Permit } from "@/types/permits";

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function ExpiryCell({ iso }: { iso?: string }) {
  if (!iso) return <span className="text-muted-foreground">—</span>;
  const days = daysUntil(iso)!;
  const formatted = new Date(iso).toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  let labelCls = "";
  let label = "";
  if (days < 0) { label = "Vencido"; labelCls = "text-red-500"; }
  else if (days <= 30) { label = `${days}d restantes`; labelCls = "text-red-500 font-medium"; }
  else if (days <= 90) { label = `${days}d restantes`; labelCls = "text-amber-600 font-medium"; }

  return (
    <div className="flex flex-col gap-0.5">
      <span>{formatted}</span>
      {label && <span className={`text-[10px] ${labelCls}`}>{label}</span>}
    </div>
  );
}

function ProvisionalIndicator({ permit }: { permit: Permit }) {
  if (!permit.tiene_provisional) return null;
  // Check if provisional hasn't expired
  if (permit.fecha_vencimiento_provisional) {
    const diff = new Date(permit.fecha_vencimiento_provisional).getTime() - Date.now();
    if (diff <= 0) return null; // expired
  }
  return (
    <span
      title="Tiene permiso provisional vigente"
      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold border border-amber-300"
    >
      P
    </span>
  );
}

export function PermitTable({
  permits,
  selected,
  onToggle,
  onToggleAll,
  onDelete,
}: {
  permits: Permit[];
  selected: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="h-10 w-[40px] px-4 align-middle">
                <Checkbox
                  checked={permits.length > 0 && selected.length === permits.length}
                  onCheckedChange={onToggleAll}
                />
              </th>
              <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Permiso</th>
              <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground hidden sm:table-cell">Expediente</th>
              <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Tipo</th>
              <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
              <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell">Vigencia</th>
              <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground hidden lg:table-cell">Ubicación</th>
              <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground hidden xl:table-cell">Vencimiento</th>
              <th className="h-10 w-[80px] px-4 align-middle" />
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {permits.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-muted-foreground">
                  No se encontraron permisos
                </td>
              </tr>
            )}
            {permits.map((permit) => (
              <tr
                key={permit.id}
                className="border-b transition-colors hover:bg-muted/40 group"
              >
                <td className="p-4 align-middle">
                  <Checkbox
                    checked={selected.includes(permit.id)}
                    onCheckedChange={() => onToggle(permit.id)}
                  />
                </td>
                <td className="p-4 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                      {permit.tipo.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <Link href={`/permisos/${permit.id}`} className="font-medium text-foreground leading-snug hover:text-primary hover:underline transition-colors">
                        {permit.nombre}
                      </Link>
                      {permit.entidad_reguladora && (
                        <div className="text-[11px] text-muted-foreground">{permit.entidad_reguladora}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4 align-middle hidden sm:table-cell">
                  <span className="font-mono text-xs text-muted-foreground">
                    {permit.numero_expediente ?? "—"}
                  </span>
                </td>
                <td className="p-4 align-middle">
                  <span className="inline-flex items-center rounded-md border bg-muted/50 px-2 py-0.5 text-xs font-medium">
                    {permit.tipo}
                  </span>
                </td>
                <td className="p-4 align-middle">
                  <div className="flex items-center gap-1">
                    <PermitStatusBadge status={permit.estado} />
                    <ProvisionalIndicator permit={permit} />
                  </div>
                </td>
                <td className="p-4 align-middle hidden md:table-cell">
                  <VigenciaBadge status={calcularVigencia(permit.fecha_vencimiento)} />
                </td>
                <td className="p-4 align-middle hidden lg:table-cell text-sm text-muted-foreground">
                  {permit.ubicacion ?? "—"}
                </td>
                <td className="p-4 align-middle hidden xl:table-cell text-sm">
                  <ExpiryCell iso={permit.fecha_vencimiento} />
                </td>
                <td className="p-4 align-middle text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/permisos/${permit.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/permisos/${permit.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> Ver detalle
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/permisos/${permit.id}/editar`}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </Link>
                        </DropdownMenuItem>
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => onDelete(permit.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
