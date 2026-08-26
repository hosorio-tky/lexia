"use client";

import { useState, useTransition, useActionState, useEffect } from "react";
import { Plus, Trash2, Bell, Mail, MonitorSmartphone, Pencil, AlertTriangle } from "lucide-react";
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
  editarPlantilla,
  eliminarPlantilla,
  togglePlantilla,
} from "@/app/actions/configuracion";
import {
  EVENTOS_ALERTA,
  EVENTO_LABELS,
  CANAL_LABELS,
  FRECUENCIA_OPTIONS,
  type PlantillaAlerta,
} from "@/types/settings";

export function PlantillaManagerClient({
  initialPlantillas,
}: {
  initialPlantillas: PlantillaAlerta[];
}) {
  const [plantillas, setPlantillas] = useState(initialPlantillas);
  const [open, setOpen]             = useState(false);

  // Shared form state (create + edit)
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaAlerta | null>(null);
  const [dialogNombre, setDialogNombre]         = useState("");
  const [dialogModulo, setDialogModulo]         = useState("permisos");
  const [evento, setEvento]                     = useState("vencimiento_proximo");
  const [canales, setCanales]                   = useState<string[]>(["in_app"]);
  const [frecuencia, setFrecuencia]             = useState(1);
  const [diasAntes, setDiasAntes]               = useState("");
  const [editError, setEditError]               = useState("");

  const [isPending, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(crearPlantilla, null);

  const isEditing    = editingPlantilla !== null;
  const necesitaDias = evento === "vencimiento_proximo";

  // Advertencia de solapamiento: misma combinación módulo+evento+canal en otra plantilla
  const overlapWarning = (() => {
    const diasNum = diasAntes ? parseInt(diasAntes, 10) : undefined;
    return canales.flatMap((canal) => {
      const solapadas = plantillas.filter(
        (p) =>
          p.id     !== editingPlantilla?.id &&
          p.modulo === dialogModulo &&
          p.evento === evento &&
          p.canal  === canal
      );
      if (solapadas.length === 0) return [];
      // Duplicado exacto (el server lo bloqueará, pero avisamos antes)
      const exacto = solapadas.find(
        (p) => p.dias_antes === diasNum && p.frecuencia_dias === frecuencia
      );
      if (exacto) {
        return [`Ya existe una plantilla idéntica: "${exacto.nombre}". No se puede guardar.`];
      }
      // Solapamiento de rango
      if (evento === "vencimiento_proximo" && diasNum != null) {
        const minDias = Math.min(diasNum, ...solapadas.map((p) => p.dias_antes ?? 0));
        const nombres = solapadas.map((p) => `"${p.nombre}"`).join(" y ");
        return [
          `Cuando queden ${minDias} días o menos, el responsable recibirá ${solapadas.length + 1} notificaciones simultáneas por ${nombres}.`,
        ];
      }
      if (evento === "vencimiento_ocurrido") {
        const nombres = solapadas.map((p) => `"${p.nombre}"`).join(" y ");
        return [`Ya existe ${nombres} con el mismo evento y canal. Se generarán notificaciones duplicadas.`];
      }
      return [];
    });
  })();

  function resetForm() {
    setEditingPlantilla(null);
    setDialogNombre("");
    setDialogModulo("permisos");
    setEvento("vencimiento_proximo");
    setCanales(["in_app"]);
    setFrecuencia(1);
    setDiasAntes("");
    setEditError("");
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(p: PlantillaAlerta) {
    setEditingPlantilla(p);
    setDialogNombre(p.nombre);
    setDialogModulo(p.modulo);
    setEvento(p.evento);
    setCanales([p.canal]);
    setFrecuencia(p.frecuencia_dias);
    setDiasAntes(p.dias_antes != null ? String(p.dias_antes) : "");
    setEditError("");
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    resetForm();
  }

  function toggleCanal(value: string) {
    if (isEditing) {
      // Single-select in edit mode (each record = one canal)
      setCanales([value]);
    } else {
      setCanales((prev) =>
        prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
      );
    }
  }

  // Create success: add new plantillas to list and close
  useEffect(() => {
    if (state?.nuevas && state.nuevas.length > 0) {
      setPlantillas((prev) => [...prev, ...state.nuevas!]);
      closeDialog();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function handleEditSubmit(e: React.FormEvent) {
    if (!isEditing) return; // let form action handle create
    e.preventDefault();

    if (!dialogNombre.trim() || canales.length === 0) {
      setEditError("Todos los campos son obligatorios");
      return;
    }

    setEditError("");
    startTransition(async () => {
      const result = await editarPlantilla(editingPlantilla!.id, {
        nombre:          dialogNombre.trim(),
        modulo:          dialogModulo,
        evento,
        dias_antes:      necesitaDias && diasAntes ? parseInt(diasAntes, 10) : undefined,
        frecuencia_dias: necesitaDias ? frecuencia : 1,
        canal:           canales[0],
      });

      if (result.updated) {
        setPlantillas((prev) =>
          prev.map((p) => (p.id === editingPlantilla!.id ? result.updated! : p))
        );
        closeDialog();
      } else if (result.error) {
        setEditError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Plantillas de alertas</h2>
          <p className="text-sm text-muted-foreground">
            Define cuándo y cómo se notifican los eventos de cada módulo.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
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
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Crear primera plantilla
          </Button>
        </Card>
      ) : (
        <Card className="divide-y">
          {plantillas.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4">
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
                    {p.evento === "vencimiento_proximo" && p.dias_antes != null && ` · ${p.dias_antes} días antes`}
                    {p.evento === "vencimiento_proximo" && p.frecuencia_dias > 1 && ` · cada ${p.frecuencia_dias} días`}
                    {p.evento === "vencimiento_proximo" && p.frecuencia_dias === 1 && ` · diariamente`}
                  </span>
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                    {CANAL_LABELS[p.canal] ?? p.canal}
                  </Badge>
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px] capitalize">
                    {p.modulo}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={p.activo}
                  onCheckedChange={() => handleToggle(p.id, p.activo)}
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  disabled={isPending}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={isPending}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Dialog: crear / editar plantilla */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar plantilla" : "Nueva plantilla de alerta"}
            </DialogTitle>
          </DialogHeader>

          <form
            action={isEditing ? undefined : formAction}
            onSubmit={isEditing ? handleEditSubmit : undefined}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                name="nombre"
                placeholder="Ej. Aviso 30 días antes de vencimiento"
                required
                value={dialogNombre}
                onChange={(e) => setDialogNombre(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Módulo</Label>
                <Select
                  name="modulo"
                  value={dialogModulo}
                  onValueChange={setDialogModulo}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permisos">Permisos</SelectItem>
                    <SelectItem value="contratos">Contratos</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="modulo" value={dialogModulo} />
              </div>

              <div className="space-y-1.5">
                <Label>Evento</Label>
                <Select name="evento" value={evento} onValueChange={setEvento}>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Días de anticipación</Label>
                  <Input
                    name="dias_antes"
                    type="number"
                    min={1}
                    max={365}
                    placeholder="Ej. 30"
                    value={diasAntes}
                    onChange={(e) => setDiasAntes(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Repetir cada</Label>
                  <Select
                    value={String(frecuencia)}
                    onValueChange={(v) => setFrecuencia(Number(v))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FRECUENCIA_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="frecuencia_dias" value={frecuencia} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>
                Canal de notificación
                {isEditing && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">(selecciona uno)</span>
                )}
              </Label>
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
              {canales.map((c) => (
                <input key={c} type="hidden" name="canal" value={c} />
              ))}
              {canales.length === 0 && (
                <p className="text-xs text-destructive">Selecciona al menos un canal</p>
              )}
            </div>

            {overlapWarning.length > 0 && (
              <div className="space-y-1.5">
                {overlapWarning.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{msg}</span>
                  </div>
                ))}
              </div>
            )}

            {(state?.error || editError) && (
              <p className="text-sm text-destructive">{state?.error ?? editError}</p>
            )}

            <Separator />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  (isEditing ? isPending : pending) ||
                  canales.length === 0 ||
                  overlapWarning.some((m) => m.startsWith("Ya existe una plantilla idéntica"))
                }
              >
                {isEditing
                  ? (isPending ? "Guardando…" : "Guardar cambios")
                  : (pending  ? "Creando…"   : "Crear plantilla")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
