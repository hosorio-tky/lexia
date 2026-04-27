"use client";

import { useState, useTransition, useActionState, useEffect } from "react";
import { Plus, Trash2, Bell, BellOff, Mail, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  crearPlantilla,
  eliminarPlantilla,
  togglePlantilla,
} from "@/app/actions/configuracion";
import {
  EVENTOS_ALERTA,
  EVENTO_LABELS,
  CANAL_LABELS,
  type PlantillaAlerta,
} from "@/types/settings";

export function PlantillaManagerClient({
  initialPlantillas,
}: {
  initialPlantillas: PlantillaAlerta[];
}) {
  const [plantillas, setPlantillas] = useState(initialPlantillas);
  const [open, setOpen]              = useState(false);
  const [evento, setEvento]          = useState("vencimiento_proximo");
  const [canales, setCanales]        = useState<string[]>(["in_app"]);
  const [isPending, startTransition] = useTransition();

  function toggleCanal(value: string) {
    setCanales((prev) =>
      prev.includes(value)
        ? prev.filter((c) => c !== value)
        : [...prev, value]
    );
  }
  const [state, formAction, pending] = useActionState(crearPlantilla, null);

  // Cerrar dialog y agregar plantillas al listado al crear con éxito
  useEffect(() => {
    if (state?.nuevas && state.nuevas.length > 0) {
      setPlantillas((prev) => [...prev, ...state.nuevas!]);
      setOpen(false);
      setEvento("vencimiento_proximo");
      setCanales(["in_app"]);
    }
  }, [state]);

  function handleDelete(id: string) {
    startTransition(async () => {
      await eliminarPlantilla(id);
      setPlantillas((prev) => prev.filter((p) => p.id !== id));
    });
  }

  function handleToggle(id: string, activo: boolean) {
    startTransition(async () => {
      await togglePlantilla(id, !activo);
      setPlantillas((prev) =>
        prev.map((p) => (p.id === id ? { ...p, activo: !activo } : p))
      );
    });
  }

  const necesitaDias = evento === "vencimiento_proximo";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Plantillas de alertas</h2>
          <p className="text-sm text-muted-foreground">
            Define cuándo y cómo se notifican los eventos de cada módulo.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Nueva plantilla
        </Button>
      </div>

      {plantillas.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No hay plantillas de alerta configuradas.
          </p>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear primera plantilla
          </Button>
        </Card>
      ) : (
        <Card className="divide-y">
          {plantillas.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 px-5 py-4"
            >
              <div
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ${
                  p.activo
                    ? "bg-amber-50 text-amber-600 ring-amber-200"
                    : "bg-muted text-muted-foreground ring-border"
                }`}
              >
                {p.canal === "email"
                  ? <Mail className="h-4 w-4" />
                  : <MonitorSmartphone className="h-4 w-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{p.nombre}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {EVENTO_LABELS[p.evento] ?? p.evento}
                    {p.dias_antes != null && ` · ${p.dias_antes} días antes`}
                  </span>
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                    {CANAL_LABELS[p.canal] ?? p.canal}
                  </Badge>
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px] capitalize">
                    {p.modulo}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={p.activo}
                  onCheckedChange={() => handleToggle(p.id, p.activo)}
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={isPending}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Dialog: nueva plantilla */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEvento("vencimiento_proximo"); setCanales(["in_app"]); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva plantilla de alerta</DialogTitle>
          </DialogHeader>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                name="nombre"
                placeholder="Ej. Aviso 30 días antes de vencimiento"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Módulo</Label>
                <Select name="modulo" defaultValue="permisos">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permisos">Permisos</SelectItem>
                    <SelectItem value="contratos">Contratos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Evento</Label>
                <Select
                  name="evento"
                  value={evento}
                  onValueChange={setEvento}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENTOS_ALERTA.map((e) => (
                      <SelectItem key={e} value={e}>{EVENTO_LABELS[e]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="evento" value={evento} />
              </div>
            </div>

            {necesitaDias && (
              <div className="space-y-1.5">
                <Label>Días de anticipación</Label>
                <Input
                  name="dias_antes"
                  type="number"
                  min={1}
                  max={365}
                  placeholder="Ej. 30"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Canal de notificación</Label>
              <div className="flex gap-3">
                {(["in_app", "email"] as const).map((c) => {
                  const selected = canales.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCanal(c)}
                      className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-input bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {c === "in_app"
                        ? <MonitorSmartphone className="h-4 w-4 shrink-0" />
                        : <Mail className="h-4 w-4 shrink-0" />}
                      <span>{c === "in_app" ? "En app" : "Correo"}</span>
                    </button>
                  );
                })}
              </div>
              {/* Un input hidden por cada canal seleccionado */}
              {canales.map((c) => (
                <input key={c} type="hidden" name="canal" value={c} />
              ))}
              {canales.length === 0 && (
                <p className="text-xs text-destructive">Selecciona al menos un canal</p>
              )}
            </div>

            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending || canales.length === 0}>
                {pending ? "Guardando…" : "Crear plantilla"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
