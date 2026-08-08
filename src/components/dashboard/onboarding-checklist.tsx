"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X, ChevronRight, Rocket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toggleOnboardingStep, dismissOnboarding } from "@/app/actions/onboarding";

interface OnboardingStep {
  id:       string;
  label:    string;
  desc:     string;
  href:     string;
  optional: boolean;
}

const STEPS: OnboardingStep[] = [
  { id: "empresa",         label: "Completa el perfil de tu empresa",   desc: "Nombre, industria, país y logo",                href: "/configuracion/empresa",      optional: false },
  { id: "catalogos",       label: "Configura los catálogos básicos",     desc: "Tipos de permiso, contrato y departamentos",    href: "/configuracion/catalogos",    optional: false },
  { id: "usuarios",        label: "Invita a tu equipo",                  desc: "Agrega los usuarios que usarán el sistema",     href: "/usuarios/invitar",           optional: false },
  { id: "responsables",    label: "Agrega responsables",                 desc: "Personas asignables a permisos y contratos",    href: "/configuracion/responsables", optional: false },
  { id: "ubicaciones",     label: "Crea tu primera ubicación",           desc: "Plantas, sedes u oficinas (opcional)",           href: "/configuracion/ubicaciones",  optional: true  },
  { id: "primer_registro", label: "Crea tu primer permiso o contrato",   desc: "Empieza a registrar tu cumplimiento legal",     href: "/permisos/nuevo",            optional: false },
];

const REQUIRED_STEPS = STEPS.filter((s) => !s.optional).map((s) => s.id);

interface Props {
  initialSteps: Record<string, boolean>;
}

export function OnboardingChecklist({ initialSteps }: Props) {
  const [steps, setSteps]         = useState<Record<string, boolean>>(initialSteps);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition]  = useTransition();

  const completed = STEPS.filter((s) => steps[s.id]).length;
  const total     = STEPS.length;
  const pct       = Math.round((completed / total) * 100);
  const allRequiredDone = REQUIRED_STEPS.every((id) => steps[id]);

  function handleToggle(stepId: string, current: boolean) {
    const next = { ...steps, [stepId]: !current };
    setSteps(next);
    startTransition(async () => {
      await toggleOnboardingStep(stepId, !current);
      // Auto-dismiss when all required steps are done
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
      <Card className="p-5 shadow-sm border-primary/20 bg-primary/[0.02]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10">
              <Rocket className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">Guía de inicio</h2>
              <p className="text-xs text-muted-foreground">
                {completed} de {total} pasos completados
              </p>
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

        {/* Progress bar */}
        <div className="mb-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Steps */}
        <ol className="space-y-1">
          {STEPS.map((step) => {
            const done = !!steps[step.id];
            return (
              <li key={step.id}>
                <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60 transition group">
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggle(step.id, done)}
                    disabled={isPending}
                    className="shrink-0 text-muted-foreground hover:text-primary transition"
                    title={done ? "Marcar como pendiente" : "Marcar como completado"}
                  >
                    {done
                      ? <CheckCircle2 className="h-5 w-5 text-primary" />
                      : <Circle className="h-5 w-5" />
                    }
                  </button>

                  {/* Text + link */}
                  <Link href={step.href} className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-tight truncate ${done ? "line-through text-muted-foreground" : ""}`}>
                      {step.label}
                      {step.optional && (
                        <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(opcional)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{step.desc}</p>
                  </Link>

                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                </div>
              </li>
            );
          })}
        </ol>

        {allRequiredDone && (
          <p className="mt-3 text-center text-xs text-emerald-600 font-medium">
            ¡Completaste todos los pasos requeridos!
          </p>
        )}
      </Card>

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
