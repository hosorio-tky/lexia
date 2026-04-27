import { BookOpen, CheckCircle2, FolderOpen, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { LexbaseStats } from "@/types/lexbase";

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

export function LexbaseStatCards({ stats }: { stats: LexbaseStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Documentos"
        value={stats.total}
        colorClass="bg-slate-100 text-slate-600"
        icon={BookOpen}
      />
      <StatCard
        label="Indexados"
        value={stats.indexados}
        colorClass="bg-emerald-100 text-emerald-600"
        icon={CheckCircle2}
      />
      <StatCard
        label="Categorías"
        value={stats.categorias}
        colorClass="bg-blue-100 text-blue-600"
        icon={FolderOpen}
      />
      <StatCard
        label="Con Reformas"
        value={stats.por_tipo ? 0 : 0}
        colorClass="bg-red-100 text-red-600"
        icon={AlertTriangle}
      />
    </div>
  );
}

export function LexbaseStatCardsFromDocs({
  docs,
  categorias,
}: {
  docs: { indexed_at?: string; tiene_reformas: boolean }[];
  categorias: number;
}) {
  const total    = docs.length;
  const indexados = docs.filter((d) => d.indexed_at).length;
  const conReformas = docs.filter((d) => d.tiene_reformas).length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Documentos"
        value={total}
        colorClass="bg-slate-100 text-slate-600"
        icon={BookOpen}
      />
      <StatCard
        label="Indexados"
        value={indexados}
        colorClass="bg-emerald-100 text-emerald-600"
        icon={CheckCircle2}
      />
      <StatCard
        label="Categorías"
        value={categorias}
        colorClass="bg-blue-100 text-blue-600"
        icon={FolderOpen}
      />
      <StatCard
        label="Con Reformas"
        value={conReformas}
        colorClass="bg-red-100 text-red-600"
        icon={AlertTriangle}
      />
    </div>
  );
}
