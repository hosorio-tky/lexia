"use client";

import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";

interface DateChangeConfirmDialogProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  fieldLabel:    string;
  previousDate:  string;
  newDate:       string;
  onConfirm:     (justificacion: string) => void;
  onCancel:      () => void;
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "d 'de' MMMM yyyy", { locale: es }) : iso;
}

export function DateChangeConfirmDialog({
  open, onOpenChange, fieldLabel, previousDate, newDate, onConfirm, onCancel,
}: DateChangeConfirmDialogProps) {
  const [justificacion, setJustificacion] = useState("");
  const [error, setError]                 = useState(false);

  function handleConfirm() {
    if (!justificacion.trim()) { setError(true); return; }
    onConfirm(justificacion.trim());
    setJustificacion("");
    setError(false);
  }

  function handleCancel() {
    setJustificacion("");
    setError(false);
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>Confirmar cambio de fecha</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm space-y-1">
            <p className="font-medium">{fieldLabel}</p>
            <p className="text-muted-foreground">
              <span className="line-through">{fmtDate(previousDate)}</span>
              <span className="mx-2">→</span>
              <span className="font-semibold text-foreground">{fmtDate(newDate)}</span>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>
              Motivo del cambio <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Describe el motivo por el que se cambia esta fecha…"
              value={justificacion}
              onChange={(e) => { setJustificacion(e.target.value); setError(false); }}
              rows={3}
              className={error ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {error && (
              <p className="text-xs text-destructive">El motivo es obligatorio.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
          <Button onClick={handleConfirm}>Confirmar cambio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
