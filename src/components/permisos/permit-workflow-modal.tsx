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
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { PermitStatusBadge } from "./permit-status-badge";
import { ESTADOS_PERMISO } from "@/lib/constants/estados";

interface WorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEstadoId: string;
  currentLabel: string;
  permitName: string;
  nextEstados: Array<{ id: string; valor: string }>;
  onConfirm: (
    newEstadoId: string,
    newLabel: string,
    comment: string,
    fechaEmisionProvisional?: string,
    fechaVencimientoProvisional?: string
  ) => void;
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  [ESTADOS_PERMISO.APROBADO]:           CheckCircle2,
  [ESTADOS_PERMISO.RECHAZADO]:          XCircle,
  [ESTADOS_PERMISO.ACTUALIZAR_PERMISO]: RefreshCw,
};

export function PermitWorkflowModal({
  open,
  onOpenChange,
  currentEstadoId,
  currentLabel,
  permitName,
  nextEstados,
  onConfirm,
}: WorkflowModalProps) {
  const [selectedNext, setSelectedNext] = useState<{ id: string; valor: string } | null>(null);
  const [comment, setComment] = useState("");
  const [fechaEmisionProvisional, setFechaEmisionProvisional]         = useState("");
  const [fechaVencimientoProvisional, setFechaVencimientoProvisional] = useState("");

  const vaAProvisional = selectedNext?.id === ESTADOS_PERMISO.CON_PERMISO_PROVISIONAL;

  const handleConfirm = () => {
    if (!selectedNext) return;
    onConfirm(
      selectedNext.id,
      selectedNext.valor,
      comment,
      vaAProvisional ? fechaEmisionProvisional || undefined : undefined,
      vaAProvisional ? fechaVencimientoProvisional || undefined : undefined
    );
    setSelectedNext(null);
    setComment("");
    setFechaEmisionProvisional("");
    setFechaVencimientoProvisional("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedNext(null);
    setComment("");
    setFechaEmisionProvisional("");
    setFechaVencimientoProvisional("");
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
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <div className="text-sm text-muted-foreground">Estado actual:</div>
            <PermitStatusBadge estadoId={currentEstadoId} label={currentLabel} />
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
                  const Icon = STATUS_ICONS[e.id];
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
                        <PermitStatusBadge estadoId={e.id} label={e.valor} />
                      </div>
                      {isSelected && <ArrowRight className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {vaAProvisional && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <Label className="text-amber-900">
                Fechas del permiso provisional <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-normal text-muted-foreground">Fecha de emisión</Label>
                  <DatePickerInput
                    value={fechaEmisionProvisional}
                    onChange={setFechaEmisionProvisional}
                    placeholder="Seleccionar"
                    name="fecha_emision_provisional_workflow"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-normal text-muted-foreground">Fecha de vencimiento</Label>
                  <DatePickerInput
                    value={fechaVencimientoProvisional}
                    onChange={setFechaVencimientoProvisional}
                    placeholder="Seleccionar"
                    name="fecha_vencimiento_provisional_workflow"
                  />
                </div>
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
