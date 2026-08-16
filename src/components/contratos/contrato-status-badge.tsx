import { TriangleAlert } from "lucide-react";
import { ESTADO_COLORS } from "@/types/contratos";
import { ESTADOS_CONTRATO } from "@/lib/constants/estados";

export function ContratoStatusBadge({ estadoId, label }: { estadoId: string; label: string }) {
  const cls = ESTADO_COLORS[estadoId] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {estadoId === ESTADOS_CONTRATO.VENCIDO && <TriangleAlert className="h-3 w-3" />}
      {label}
    </span>
  );
}
