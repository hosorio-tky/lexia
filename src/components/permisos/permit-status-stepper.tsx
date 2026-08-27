import { Check, ArrowRight, TriangleAlert } from "lucide-react";
import { ESTADOS_PERMISO } from "@/lib/constants/estados";
import { cn } from "@/lib/utils";

// Ruta feliz del trámite. "Con Permiso Provisional" y "Actualizar Permiso"
// son ramas/variantes, no pasos adicionales — se señalan aparte para no
// forzar un flujo no lineal dentro de una secuencia lineal.
const HAPPY_PATH = [
  { id: ESTADOS_PERMISO.CREADO,     label: "Creado" },
  { id: ESTADOS_PERMISO.EN_GESTION, label: "En Gestión" },
  { id: ESTADOS_PERMISO.PRESENTADO, label: "Presentado" },
  { id: ESTADOS_PERMISO.APROBADO,   label: "Aprobado" },
];

export function PermitStatusStepper({ estadoId }: { estadoId: string }) {
  if (estadoId === ESTADOS_PERMISO.RECHAZADO) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <TriangleAlert className="h-4 w-4 shrink-0" />
        Este trámite fue rechazado. Usa &ldquo;Reabrir&rdquo; para reiniciarlo desde &ldquo;En Gestión&rdquo;.
      </div>
    );
  }

  const isProvisional = estadoId === ESTADOS_PERMISO.CON_PERMISO_PROVISIONAL;
  const isActualizar  = estadoId === ESTADOS_PERMISO.ACTUALIZAR_PERMISO;

  const effectiveId = isProvisional
    ? ESTADOS_PERMISO.PRESENTADO
    : isActualizar
      ? ESTADOS_PERMISO.APROBADO
      : estadoId;
  const currentIndex = HAPPY_PATH.findIndex((s) => s.id === effectiveId);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start">
        {HAPPY_PATH.map((step, i) => {
          const isPast    = i < currentIndex;
          const isCurrent = i === currentIndex && !isProvisional;
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1 min-w-[64px]">
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

      {isProvisional && (
        <div className="flex w-fit items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Con Permiso Provisional — trámite definitivo en gestión
        </div>
      )}

      {isActualizar && (
        <div className="flex w-fit items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          En actualización — se está gestionando una renovación o modificación
        </div>
      )}
    </div>
  );
}
