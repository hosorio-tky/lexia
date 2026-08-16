import { CheckCircle2, Clock, Library, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Permit } from "@/types/permits";
import { ESTADOS_PERMISO } from "@/lib/constants/estados";

function StatCard({
  label,
  value,
  colorClass,
  icon: Icon,
}: {
  label: string;
  value: number;
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

export function PermitStatCards({ permits }: { permits: Permit[] }) {
  const total   = permits.length;
  const aprobados = permits.filter((p) => p.estado_id === ESTADOS_PERMISO.APROBADO).length;
  const EN_PROCESO = new Set<string>([
    ESTADOS_PERMISO.CREADO,
    ESTADOS_PERMISO.EN_GESTION,
    ESTADOS_PERMISO.PRESENTADO,
    ESTADOS_PERMISO.CON_PERMISO_PROVISIONAL,
    ESTADOS_PERMISO.ACTUALIZAR_PERMISO,
  ]);
  const enProceso = permits.filter((p) => EN_PROCESO.has(p.estado_id)).length;
  const rechazados = permits.filter((p) => p.estado_id === ESTADOS_PERMISO.RECHAZADO).length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Permisos" value={total}      colorClass="bg-slate-100 text-slate-600"    icon={Library} />
      <StatCard label="Aprobados"       value={aprobados}  colorClass="bg-emerald-100 text-emerald-600" icon={CheckCircle2} />
      <StatCard label="En Proceso"      value={enProceso}  colorClass="bg-blue-100 text-blue-600"      icon={Clock} />
      <StatCard label="Rechazados"      value={rechazados} colorClass="bg-red-100 text-red-600"         icon={TriangleAlert} />
    </div>
  );
}
