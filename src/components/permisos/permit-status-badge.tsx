import { TriangleAlert } from "lucide-react";
import { STATUS_COLORS, VIGENCIA_COLORS, type VigenciaStatus } from "@/types/permits";
import { ESTADOS_PERMISO } from "@/lib/constants/estados";

export function PermitStatusBadge({ estadoId, label }: { estadoId: string; label: string }) {
  const cls = STATUS_COLORS[estadoId] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {estadoId === ESTADOS_PERMISO.RECHAZADO && <TriangleAlert className="h-3 w-3" />}
      {label}
    </span>
  );
}

export function VigenciaBadge({ status }: { status: VigenciaStatus }) {
  const cls = VIGENCIA_COLORS[status] ?? "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status === "Vencido" && <TriangleAlert className="h-3 w-3" />}
      {status}
    </span>
  );
}
