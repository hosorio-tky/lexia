"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContratoStatusBadge } from "./contrato-status-badge";
import { cambiarEstadoContrato } from "@/app/actions/contratos";
import { ESTADO_TRANSITIONS, diasRestantes, type Contrato, type ContratoEstado } from "@/types/contratos";

const COLUMNAS: { estado: ContratoEstado; label: string; colorClass: string }[] = [
  { estado: "En Revisión",     label: "En Revisión",     colorClass: "border-t-slate-400" },
  { estado: "Pendiente Firma", label: "Pendiente Firma", colorClass: "border-t-amber-400" },
  { estado: "Vigente",         label: "Vigente",          colorClass: "border-t-emerald-400" },
  { estado: "Vencido",         label: "Vencido",          colorClass: "border-t-red-400" },
];

function formatValor(valor?: number, moneda?: string): string | null {
  if (valor == null) return null;
  return `${moneda ?? "USD"} ${valor.toLocaleString("es-SV", { minimumFractionDigits: 0 })}`;
}

function ContratoCard({ contrato }: { contrato: Contrato }) {
  const [isPending, startTransition] = useTransition();
  const transiciones = ESTADO_TRANSITIONS[contrato.estado];
  const dias         = diasRestantes(contrato.fecha_fin);

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm space-y-2 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/contratos/${contrato.id}`}
          className="text-sm font-medium leading-tight hover:underline line-clamp-2"
        >
          {contrato.titulo}
        </Link>

        {/* Dropdown cambio de estado */}
        {transiciones.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={isPending}
                className="shrink-0 inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
                style={{ whiteSpace: "nowrap" }}
              >
                <span className="max-w-[80px] truncate">{contrato.estado}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              {transiciones.map((t) => (
                <DropdownMenuItem
                  key={t}
                  onClick={() => startTransition(() => cambiarEstadoContrato(contrato.id, t))}
                >
                  → {t}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {transiciones.length === 0 && (
          <ContratoStatusBadge estado={contrato.estado} />
        )}
      </div>

      {contrato.numero && (
        <p className="font-mono text-xs text-muted-foreground">{contrato.numero}</p>
      )}
      {contrato.contraparte_nombre && (
        <p className="text-xs text-muted-foreground truncate">{contrato.contraparte_nombre}</p>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {formatValor(contrato.valor, contrato.moneda) && (
          <span className="font-medium text-foreground">
            {formatValor(contrato.valor, contrato.moneda)}
          </span>
        )}
        {dias != null && (
          <span className={dias < 0 ? "text-red-500" : dias <= 30 ? "text-amber-500" : ""}>
            {dias < 0 ? `Vencido hace ${Math.abs(dias)}d` : `${dias}d restantes`}
          </span>
        )}
      </div>
    </div>
  );
}

export function ContratoKanban({ contratos }: { contratos: Contrato[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {COLUMNAS.map(({ estado, label, colorClass }) => {
        const items = contratos.filter((c) => c.estado === estado);
        return (
          <div
            key={estado}
            className={`flex flex-col gap-2 rounded-xl border border-t-4 bg-muted/20 p-3 ${colorClass}`}
          >
            {/* Cabecera columna */}
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-sm font-semibold">{label}</span>
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                {items.length}
              </span>
            </div>
            {/* Cards */}
            {items.length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground italic">Sin contratos</p>
            ) : (
              items.map((c) => <ContratoCard key={c.id} contrato={c} />)
            )}
          </div>
        );
      })}
    </div>
  );
}
