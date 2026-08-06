"use client";

import { useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { Textarea }  from "@/components/ui/textarea";
import { Badge }     from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText, ChevronRight, Loader2, AlertCircle, CheckCircle2, ArrowLeft,
} from "lucide-react";
import type { ContratoPlantilla } from "@/lib/repositories/contrato-plantillas";
import type { VariableDetectada } from "@/app/api/contratos/detect-variables/route";
import type { ContratoTipo } from "@/types/contratos";

interface UsarPlantillaModalProps {
  open:       boolean;
  onClose:    () => void;
  plantillas: ContratoPlantilla[];
  onGenerated: (result: {
    contenido_html: string;
    fields: {
      titulo?:             string;
      tipo?:               ContratoTipo;
      contraparte_nombre?: string;
      contraparte_email?:  string;
      valor?:              number;
      moneda?:             string;
      fecha_inicio?:       string;
      fecha_fin?:          string;
      fecha_firma?:        string;
    };
  }) => void;
}

type Step =
  | { name: "select" }
  | { name: "detecting"; plantilla: ContratoPlantilla }
  | { name: "fill"; plantilla: ContratoPlantilla; variables: VariableDetectada[] }
  | { name: "generating" }
  | { name: "error"; message: string };

export function UsarPlantillaModal({
  open, onClose, plantillas, onGenerated,
}: UsarPlantillaModalProps) {
  const [step, setStep]     = useState<Step>({ name: "select" });
  const [values, setValues] = useState<Record<string, string>>({});

  const reset = () => {
    setStep({ name: "select" });
    setValues({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const selectPlantilla = useCallback(async (plantilla: ContratoPlantilla) => {
    setStep({ name: "detecting", plantilla });
    try {
      const res  = await fetch("/api/contratos/detect-variables", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ contenido_html: plantilla.contenido_html }),
      });
      const data = await res.json() as { variables?: VariableDetectada[]; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Error al analizar la plantilla");

      const vars = data.variables ?? [];
      if (vars.length === 0) {
        // No variables — generate directly
        await generate(plantilla, {});
      } else {
        setValues(Object.fromEntries(vars.map((v) => [v.key, ""])));
        setStep({ name: "fill", plantilla, variables: vars });
      }
    } catch (err) {
      setStep({ name: "error", message: (err as Error).message });
    }
  }, []);

  const generate = useCallback(async (
    plantilla: ContratoPlantilla,
    vars: Record<string, string>
  ) => {
    setStep({ name: "generating" });
    try {
      const res  = await fetch("/api/contratos/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plantilla_id: plantilla.id, variables: vars }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Error al generar el contrato");

      onGenerated(data);
      handleClose();
    } catch (err) {
      setStep({ name: "error", message: (err as Error).message });
    }
  }, [onGenerated]);

  const handleGenerate = () => {
    if (step.name !== "fill") return;
    generate(step.plantilla, values);
  };

  const renderContent = () => {
    // ── Step: select ──────────────────────────────────────────
    if (step.name === "select") {
      return (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {plantillas.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Sin plantillas disponibles</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Crea plantillas en{" "}
                  <a href="/configuracion/plantillas" className="underline hover:text-foreground" target="_blank">
                    Configuración → Plantillas de Contratos
                  </a>
                </p>
              </div>
            </div>
          ) : (
            plantillas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPlantilla(p)}
                className="w-full flex items-center justify-between gap-3 rounded-lg border p-4 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.nombre}</p>
                    {p.descripcion && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.descripcion}</p>
                    )}
                    {p.tipo && (
                      <Badge variant="secondary" className="mt-1 text-xs">{p.tipo}</Badge>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      );
    }

    // ── Step: detecting ───────────────────────────────────────
    if (step.name === "detecting") {
      return (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Analizando plantilla…</p>
          <p className="text-xs text-muted-foreground">La IA está identificando los campos a completar</p>
        </div>
      );
    }

    // ── Step: generating ─────────────────────────────────────
    if (step.name === "generating") {
      return (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Generando contrato…</p>
          <p className="text-xs text-muted-foreground">La IA está redactando el documento</p>
        </div>
      );
    }

    // ── Step: error ───────────────────────────────────────────
    if (step.name === "error") {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {step.message}
          </div>
          <Button variant="outline" onClick={reset} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a seleccionar
          </Button>
        </div>
      );
    }

    // ── Step: fill ────────────────────────────────────────────
    if (step.name === "fill") {
      const { variables, plantilla } = step;
      const required   = variables.filter((v) => v.required);
      const pending    = required.filter((v) => !values[v.key]?.trim());
      const allFilled  = pending.length === 0;

      return (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep({ name: "select" })}
              className="text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-sm font-medium">{plantilla.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {allFilled
                  ? `${variables.length} campo${variables.length !== 1 ? "s" : ""} completado${variables.length !== 1 ? "s" : ""} ✓`
                  : `${pending.length} campo${pending.length !== 1 ? "s" : ""} requerido${pending.length !== 1 ? "s" : ""} sin completar`}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {variables.map((v) => {
              const isEmpty = v.required && !values[v.key]?.trim();
              return (
                <div key={v.key} className="space-y-1.5">
                  <Label className={isEmpty ? "text-destructive" : undefined}>
                    {v.label}
                    {v.required && <span className="ml-1 text-destructive">*</span>}
                    {v.unclear && (
                      <span className="ml-2 text-xs text-amber-600 font-normal">
                        {v.question}
                      </span>
                    )}
                  </Label>
                  {v.type === "textarea" ? (
                    <Textarea
                      value={values[v.key] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                      placeholder={`Ingresa ${v.label.toLowerCase()}…`}
                      rows={3}
                      className={isEmpty ? "border-destructive focus-visible:ring-destructive" : undefined}
                    />
                  ) : (
                    <Input
                      type={v.type === "date" ? "date" : v.type === "number" ? "number" : "text"}
                      value={values[v.key] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                      placeholder={
                        v.type === "date"   ? "YYYY-MM-DD" :
                        v.type === "number" ? "0.00" :
                        `Ingresa ${v.label.toLowerCase()}…`
                      }
                      className={isEmpty ? "border-destructive focus-visible:ring-destructive" : undefined}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-3">
            {!allFilled && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-destructive">{pending.length}</span> campo{pending.length !== 1 ? "s" : ""} requerido{pending.length !== 1 ? "s" : ""} sin completar
              </p>
            )}
            <div className="flex gap-3 ml-auto">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={!allFilled}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Generar contrato
              </Button>
            </div>
          </div>
        </div>
      );
    }
  };

  const titles: Record<string, string> = {
    select:     "Usar plantilla",
    detecting:  "Analizando plantilla",
    fill:       "Completar información",
    generating: "Generando contrato",
    error:      "Error",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titles[step.name]}</DialogTitle>
          {step.name === "select" && (
            <DialogDescription>
              Selecciona una plantilla. La IA identificará los campos a completar.
            </DialogDescription>
          )}
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
