"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCheck, X, ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toggleOnboardingStep, dismissOnboarding } from "@/app/actions/onboarding";

interface OnboardingStep {
  id:       string;
  label:    string;
  href:     string;
  optional: boolean;
}

const STEPS: OnboardingStep[] = [
  { id: "empresa",         label: "Perfil de empresa",      href: "/configuracion/empresa",      optional: false },
  { id: "catalogos",       label: "Catálogos básicos",       href: "/configuracion/catalogos",    optional: false },
  { id: "usuarios",        label: "Invita tu equipo",        href: "/usuarios/invitar",           optional: false },
  { id: "responsables",    label: "Responsables",            href: "/configuracion/responsables", optional: false },
  { id: "ubicaciones",     label: "Ubicaciones",             href: "/configuracion/ubicaciones",  optional: true  },
  { id: "primer_registro", label: "Primer permiso",          href: "/permisos/nuevo",            optional: false },
];

const REQUIRED_STEPS = STEPS.filter((s) => !s.optional).map((s) => s.id);

interface Props {
  initialSteps: Record<string, boolean>;
}

export function OnboardingChecklist({ initialSteps }: Props) {
  const [steps, setSteps]             = useState<Record<string, boolean>>(initialSteps);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition]  = useTransition();

  const completed       = STEPS.filter((s) => steps[s.id]).length;
  const total           = STEPS.length;
  const pct             = Math.round((completed / total) * 100);
  const nextIncomplete  = STEPS.find((s) => !steps[s.id]);
  const allRequiredDone = REQUIRED_STEPS.every((id) => steps[id]);

  function handleToggle(stepId: string, current: boolean) {
    const next = { ...steps, [stepId]: !current };
    setSteps(next);
    startTransition(async () => {
      await toggleOnboardingStep(stepId, !current);
      if (REQUIRED_STEPS.every((id) => next[id])) {
        await dismissOnboarding();
      }
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      setConfirmOpen(false);
      await dismissOnboarding();
    });
  }

  return (
    <>
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-primary/20" style={{ width: `${pct}%`, transition: "width 0.5s ease" }} />
        <div className="h-1 w-full bg-muted -mt-1" />

        <div className="px-5 py-4">
          {/* Header row */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10">
                <Rocket className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Guía de inicio</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {completed} de {total} pasos completados
                </span>
                {allRequiredDone && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCheck className="h-3 w-3" />¡Listo!
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
              title="Cerrar guía"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chips row */}
          <div className="flex flex-wrap gap-2">
            {STEPS.map((step) => {
              const done    = !!steps[step.id];
              const isCurrent = !done && step.id === nextIncomplete?.id;

              return (
                <div key={step.id} className="flex items-center gap-1">
                  {/* Toggle button */}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggle(step.id, done)}
                    title={done ? "Marcar como pendiente" : "Marcar como hecho"}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-l-full border pl-3 pr-2 py-1.5 text-xs font-medium transition",
                      done
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                        : isCurrent
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/50 border-border text-muted-foreground",
                    ].join(" ")}
                  >
                    {done
                      ? <CheckCheck className="h-3.5 w-3.5 shrink-0" />
                      : <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 flex items-center justify-center ${isCurrent ? "border-primary" : "border-muted-foreground/40"}`} />
                    }
                    <span className={done ? "line-through opacity-60" : ""}>
                      {step.label}
                    </span>
                    {step.optional && (
                      <span className="opacity-50 font-normal">*</span>
                    )}
                  </button>

                  {/* Link arrow */}
                  <Link
                    href={step.href}
                    title={`Ir a ${step.label}`}
                    className={[
                      "inline-flex h-[30px] w-6 items-center justify-center rounded-r-full border-y border-r transition",
                      done
                        ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                        : isCurrent
                        ? "border-primary/30 text-primary hover:bg-primary/10"
                        : "border-border text-muted-foreground hover:bg-muted/60",
                    ].join(" ")}
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirm dismiss dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Cerrar la guía de inicio?</DialogTitle>
            <DialogDescription>
              La guía desaparecerá permanentemente. Puedes acceder a cada sección desde el menú de navegación en cualquier momento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDismiss} disabled={isPending}>
              Sí, cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
