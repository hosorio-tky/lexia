import { Check, ArrowRight, TriangleAlert } from "lucide-react";
import { ESTADOS_CONTRATO } from "@/lib/constants/estados";
import { cn } from "@/lib/utils";

// Ruta feliz del contrato. "Vencido" es una variante de "Vigente" (se
// mantiene vigente el círculo actual, con un indicador aparte) y
// "Cancelado" es un estado terminal negativo — no se fuerza dentro de
// la secuencia lineal.
const HAPPY_PATH = [
  { id: ESTADOS_CONTRATO.EN_REVISION,     label: "En Revisión" },
  { id: ESTADOS_CONTRATO.PENDIENTE_FIRMA, label: "Pendiente Firma" },
  { id: ESTADOS_CONTRATO.VIGENTE,         label: "Vigente" },
  { id: ESTADOS_CONTRATO.TERMINADO,       label: "Terminado" },
];

export function ContratoStatusStepper({ estadoId }: { estadoId: string }) {
  if (estadoId === ESTADOS_CONTRATO.CANCELADO) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <TriangleAlert className="h-4 w-4 shrink-0" />
        Este contrato fue cancelado.
      </div>
    );
  }

  const isVencido = estadoId === ESTADOS_CONTRATO.VENCIDO;

  const effectiveId  = isVencido ? ESTADOS_CONTRATO.VIGENTE : estadoId;
  const currentIndex = HAPPY_PATH.findIndex((s) => s.id === effectiveId);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start">
        {HAPPY_PATH.map((step, i) => {
          const isPast    = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1 min-w-[72px]">
                <div
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : isPast
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                  )}
                >
                  {isPast ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-center text-[10px] leading-tight",
                    isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < HAPPY_PATH.length - 1 && (
                <ArrowRight
                  className={cn("mx-1 h-4 w-4 shrink-0", isPast ? "text-primary/50" : "text-border")}
                />
              )}
            </div>
          );
        })}
      </div>

      {isVencido && (
        <div className="flex w-fit items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          Vencido — pasó su fecha de vencimiento sin cerrarse o renovarse
        </div>
      )}
    </div>
  );
}
