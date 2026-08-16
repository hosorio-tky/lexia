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
import { ESTADOS_CONTRATO } from "@/lib/constants/estados";

interface Props {
  open:             boolean;
  onOpenChange:     (open: boolean) => void;
  currentEstadoId:  string;
  currentLabel:     string;
  titulo:           string;
  nextEstados:      Array<{ id: string; valor: string }>;
  onConfirm:        (newEstadoId: string, newLabel: string, comment: string) => void;
}

const ESTADO_ICONS: Record<string, React.ElementType> = {
  [ESTADOS_CONTRATO.VIGENTE]:        CheckCircle2,
  [ESTADOS_CONTRATO.CANCELADO]:      XCircle,
  [ESTADOS_CONTRATO.TERMINADO]:      CheckCircle2,
  [ESTADOS_CONTRATO.PENDIENTE_FIRMA]:FileSignature,
  [ESTADOS_CONTRATO.EN_REVISION]:    Clock,
};

export function ContratoWorkflowModal({
  open,
  onOpenChange,
  currentEstadoId,
  currentLabel,
  titulo,
  nextEstados,
  onConfirm,
}: Props) {
  const [selectedNext, setSelectedNext] = useState<{ id: string; valor: string } | null>(null);
  const [comment, setComment] = useState("");

  const handleConfirm = () => {
    if (!selectedNext) return;
    onConfirm(selectedNext.id, selectedNext.valor, comment);
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
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <div className="text-sm text-muted-foreground">Estado actual:</div>
            <ContratoStatusBadge estadoId={currentEstadoId} label={currentLabel} />
          </div>

          {nextEstados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No hay transiciones disponibles desde este estado.
            </p>
          ) : (
            <div className="space-y-2">
              <Label>Nuevo estado</Label>
              <div className="grid gap-2">
                {nextEstados.map((e) => {
                  const Icon = ESTADO_ICONS[e.id];
                  const isSelected = selectedNext?.id === e.id;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedNext(e)}
                      className={`flex items-center justify-between rounded-lg border-2 px-4 py-3 text-sm transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                        <ContratoStatusBadge estadoId={e.id} label={e.valor} />
                      </div>
                      {isSelected && <ArrowRight className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
