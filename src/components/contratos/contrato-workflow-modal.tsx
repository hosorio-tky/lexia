"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, XCircle, Clock, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContratoStatusBadge } from "./contrato-status-badge";
import { ESTADO_TRANSITIONS, type ContratoEstado } from "@/types/contratos";

interface Props {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  currentEstado: ContratoEstado;
  titulo:        string;
  onConfirm:     (newEstado: ContratoEstado, comment: string) => void;
}

const ESTADO_ICONS: Partial<Record<ContratoEstado, React.ElementType>> = {
  "Vigente":         CheckCircle2,
  "Cancelado":       XCircle,
  "Terminado":       CheckCircle2,
  "Pendiente Firma": FileSignature,
  "En Revisión":     Clock,
};

export function ContratoWorkflowModal({
  open,
  onOpenChange,
  currentEstado,
  titulo,
  onConfirm,
}: Props) {
  const [selectedNext, setSelectedNext] = useState<ContratoEstado | null>(null);
  const [comment, setComment] = useState("");

  const nextEstados = ESTADO_TRANSITIONS[currentEstado] ?? [];

  const handleConfirm = () => {
    if (!selectedNext) return;
    onConfirm(selectedNext, comment);
    setSelectedNext(null);
    setComment("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedNext(null);
    setComment("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar estado del contrato</DialogTitle>
          <DialogDescription className="line-clamp-2">{titulo}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Estado actual */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <div className="text-sm text-muted-foreground">Estado actual:</div>
            <ContratoStatusBadge estado={currentEstado} />
          </div>

          {/* Seleccionar próximo estado */}
          {nextEstados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No hay transiciones disponibles desde este estado.
            </p>
          ) : (
            <div className="space-y-2">
              <Label>Nuevo estado</Label>
              <div className="grid gap-2">
                {nextEstados.map((estado) => {
                  const Icon = ESTADO_ICONS[estado];
                  const isSelected = selectedNext === estado;
                  return (
                    <button
                      key={estado}
                      onClick={() => setSelectedNext(estado)}
                      className={`flex items-center justify-between rounded-lg border-2 px-4 py-3 text-sm transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                        <ContratoStatusBadge estado={estado} />
                      </div>
                      {isSelected && <ArrowRight className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comentario */}
          {selectedNext && (
            <div className="space-y-2">
              <Label htmlFor="workflow-comment">
                Comentario <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="workflow-comment"
                placeholder="Describe el motivo del cambio de estado…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedNext}>
            Confirmar cambio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
