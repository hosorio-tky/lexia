"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
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
import { PermitStatusBadge } from "./permit-status-badge";
import { STATUS_TRANSITIONS, type PermitStatus } from "@/types/permits";

interface WorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: PermitStatus;
  permitName: string;
  onConfirm: (newStatus: PermitStatus, comment: string) => void;
}

const STATUS_ICONS: Partial<Record<PermitStatus, React.ElementType>> = {
  "Aprobado":           CheckCircle2,
  "Rechazado":          XCircle,
  "Actualizar Permiso": RefreshCw,
};

export function PermitWorkflowModal({
  open,
  onOpenChange,
  currentStatus,
  permitName,
  onConfirm,
}: WorkflowModalProps) {
  const [selectedNext, setSelectedNext] = useState<PermitStatus | null>(null);
  const [comment, setComment] = useState("");

  const nextStatuses = STATUS_TRANSITIONS[currentStatus] ?? [];

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
          <DialogTitle>Cambiar estado del permiso</DialogTitle>
          <DialogDescription className="line-clamp-2">{permitName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Estado actual */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <div className="text-sm text-muted-foreground">Estado actual:</div>
            <PermitStatusBadge status={currentStatus} />
          </div>

          {/* Seleccionar próximo estado */}
          {nextStatuses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No hay transiciones disponibles desde este estado.
            </p>
          ) : (
            <div className="space-y-2">
              <Label>Nuevo estado</Label>
              <div className="grid gap-2">
                {nextStatuses.map((status) => {
                  const Icon = STATUS_ICONS[status];
                  const isSelected = selectedNext === status;
                  return (
                    <button
                      key={status}
                      onClick={() => setSelectedNext(status)}
                      className={`flex items-center justify-between rounded-lg border-2 px-4 py-3 text-sm transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                        <PermitStatusBadge status={status} />
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
          <Button
            onClick={handleConfirm}
            disabled={!selectedNext}
          >
            Confirmar cambio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
