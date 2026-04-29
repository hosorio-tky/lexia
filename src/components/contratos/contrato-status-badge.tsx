import { TriangleAlert } from "lucide-react";
import { ESTADO_COLORS, type ContratoEstado } from "@/types/contratos";

export function ContratoStatusBadge({ estado }: { estado: ContratoEstado }) {
  const cls = ESTADO_COLORS[estado] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {estado === "Vencido" && <TriangleAlert className="h-3 w-3" />}
      {estado}
    </span>
  );
}
