import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProximoVencimiento } from "@/lib/repositories/dashboard";

const SEMAFORO = {
  vencido:    { dot: "bg-red-500",    text: "text-red-600",    label: "Vencido",     icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  critico:    { dot: "bg-red-500",    text: "text-red-600",    label: "Crítico",     icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  advertencia:{ dot: "bg-orange-400", text: "text-orange-600", label: "Advertencia", icon: <Clock className="h-3.5 w-3.5" /> },
  proximo:    { dot: "bg-amber-400",  text: "text-amber-600",  label: "Próximo",     icon: <Clock className="h-3.5 w-3.5" /> },
  ok:         { dot: "bg-emerald-400",text: "text-emerald-600",label: "Vigente",     icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
};

const MODULO_BADGE = {
  permiso:  "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
  contrato: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
};

interface ExpiryListProps {
  items: ProximoVencimiento[];
}

export function ExpiryList({ items }: ExpiryListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 opacity-25" />
        <p className="text-sm">Sin vencimientos en los próximos 90 días</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {items.map((item) => {
        const s = SEMAFORO[item.semaforo];
        const href = item.modulo === "contrato"
          ? `/contratos/${item.id}`
          : `/permisos/${item.id}`;
        const label =
          item.diasRestantes < 0
            ? `Venció hace ${Math.abs(item.diasRestantes)} días`
            : item.diasRestantes === 0
            ? "Vence hoy"
            : `${item.diasRestantes} días`;

        return (
          <Link
            key={item.id}
            href={href}
            className="flex items-center gap-3 px-1 py-3 hover:bg-muted/40 transition-colors rounded-lg group"
          >
            {/* Dot semáforo */}
            <span className={cn("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full", s.dot)} />

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
                  {item.nombre}
                </p>
                <span className={cn(
                  "shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                  MODULO_BADGE[item.modulo]
                )}>
                  {item.modulo === "contrato" ? "Contrato" : "Permiso"}
                </span>
              </div>
              {item.numero_expediente && (
                <p className="text-[11px] text-muted-foreground font-mono">
                  {item.numero_expediente}
                </p>
              )}
            </div>

            {/* Fecha + días */}
            <div className="shrink-0 text-right">
              <p className={cn("text-xs font-semibold", s.text)}>{label}</p>
              <p className="text-[11px] text-muted-foreground">
                {format(parseISO(item.fecha_vencimiento), "d MMM yyyy", { locale: es })}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
