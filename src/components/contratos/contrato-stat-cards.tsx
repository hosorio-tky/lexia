import { CheckCircle2, DollarSign, FileText, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Contrato } from "@/types/contratos";

function StatCard({
  label,
  value,
  colorClass,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  colorClass: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="flex items-center justify-between p-4 shadow-sm transition hover:shadow-md">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      </div>
      <div className={`grid h-10 w-10 place-items-center rounded-lg ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
    </Card>
  );
}

export function ContratoStatCards({ contratos }: { contratos: Contrato[] }) {
  const total    = contratos.length;
  const vigentes = contratos.filter((c) => c.estado === "Vigente").length;

  // Por vencer: vigentes con fecha_fin en los próximos 30 días
  const hoy      = Date.now();
  const en30dias = hoy + 30 * 86400000;
  const porVencer = contratos.filter((c) => {
    if (c.estado !== "Vigente" || !c.fecha_fin) return false;
    const fin = new Date(c.fecha_fin).getTime();
    return fin >= hoy && fin <= en30dias;
  }).length;

  // Valor total (suma de contratos con valor definido)
  const valorTotal = contratos.reduce((sum, c) => sum + (c.valor ?? 0), 0);
  const valorFmt = valorTotal > 0
    ? `$${valorTotal.toLocaleString("es-SV", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : "$0";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Contratos" value={total}    colorClass="bg-slate-100 text-slate-600"    icon={FileText} />
      <StatCard label="Valor Total"      value={valorFmt} colorClass="bg-blue-100 text-blue-600"      icon={DollarSign} />
      <StatCard label="Vigentes"         value={vigentes} colorClass="bg-emerald-100 text-emerald-600" icon={CheckCircle2} />
      <StatCard label="Por Vencer"       value={porVencer} colorClass="bg-amber-100 text-amber-600"   icon={TriangleAlert} />
    </div>
  );
}
