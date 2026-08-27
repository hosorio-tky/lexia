"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { MONEDAS, type Permit } from "@/types/permits";
import { ESTADOS_PERMISO, ESTADOS_PERMISO_OPTIONS } from "@/lib/constants/estados";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { DateChangeConfirmDialog } from "@/components/shared/date-change-confirm-dialog";
import { CatalogAddDialog } from "@/components/shared/catalog-add-dialog";
import { ResponsableMultiSelect } from "@/components/shared/responsable-multi-select";
import { UbicacionAddDialog } from "@/components/shared/ubicacion-add-dialog";
import type { CatalogoItem } from "@/types/settings";
import type { ProfileOption } from "@/types/users";
import type { Responsable } from "@/lib/repositories/responsables";
import type { Ubicacion } from "@/lib/repositories/ubicaciones";

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

interface PermitFormClientProps {
  action: (formData: FormData) => Promise<void>;
  mode?: "create" | "edit";
  defaultValues?: Partial<Permit>;
  backHref?: string;
  tiposPermiso?: CatalogoItem[];
  entidadesReguladoras?: CatalogoItem[];
  responsables?: Responsable[];
  ubicaciones?: Ubicacion[];
  profiles?: ProfileOption[];
}

export function PermitFormClient({
  action,
  mode = "create",
  defaultValues,
  backHref = "/permisos",
  tiposPermiso: tiposPermisoProp = [],
  entidadesReguladoras: entidadesProp = [],
  responsables: responsablesProp = [],
  ubicaciones: ubicacionesProp = [],
  profiles = [],
}: PermitFormClientProps) {
  const [tipoItems,      setTipoItems]      = useState<CatalogoItem[]>(tiposPermisoProp);
  const [entidadItems,   setEntidadItems]   = useState<CatalogoItem[]>(entidadesProp);
  const [responsables,   setResponsables]   = useState<Responsable[]>(responsablesProp);
  const [ubicaciones,    setUbicaciones]    = useState<Ubicacion[]>(ubicacionesProp);

  const [addTipoOpen,      setAddTipoOpen]      = useState(false);
  const [addEntidadOpen,   setAddEntidadOpen]   = useState(false);
  const [addUbicacionOpen, setAddUbicacionOpen] = useState(false);

  // Confirmación de cambio de fecha_vencimiento
  const originalFechaVenc                                   = defaultValues?.fecha_vencimiento ?? "";
  const [fechaVenc,            setFechaVenc]                = useState(originalFechaVenc);
  const [fechaVencConfirmOpen, setFechaVencConfirmOpen]     = useState(false);
  const [pendingFechaVenc,     setPendingFechaVenc]         = useState("");
  const [fechaVencJustif,      setFechaVencJustif]          = useState("");

  const [isPending, startTransition] = useTransition();
  const [tipo, setTipo]             = useState(defaultValues?.tipo_id ?? "");
  const [estado, setEstado]         = useState(defaultValues?.estado_id ?? ESTADOS_PERMISO.CREADO);
  const [entidad, setEntidad]       = useState(defaultValues?.entidad_reguladora_id ?? "");
  const [responsableIds, setResponsableIds] = useState<string[]>(() => {
    if (defaultValues?.responsable_ids?.length) return defaultValues.responsable_ids;
    if (defaultValues?.responsable_id) return [defaultValues.responsable_id];
    return [];
  });
  const [ubicacionId, setUbicacionId]   = useState(() => {
    if (defaultValues?.ubicacion_id) return defaultValues.ubicacion_id;
    if (defaultValues?.ubicacion) {
      const match = ubicaciones.find((u) => u.nombre === defaultValues.ubicacion);
      if (match) return match.id;
    }
    return "__none__";
  });
  const [moneda, setMoneda]         = useState(defaultValues?.moneda ?? "USD");
  const [tieneProvisional, setTieneProvisional] = useState(
    defaultValues?.tiene_provisional ?? false
  );
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tipo_id", tipo);
    fd.set("tipo_nombre", tipoItems.find((t) => t.id === tipo)?.valor ?? "");
    const entidadId = entidad === "__none__" ? "" : entidad;
    fd.set("entidad_reguladora_id", entidadId);
    fd.set("entidad_reguladora_nombre", entidadItems.find((e) => e.id === entidadId)?.valor ?? "");
    fd.set("moneda", moneda);
    fd.set("tiene_provisional", String(tieneProvisional));

    // Responsables: array + primer ID/nombre desnormalizado para compatibilidad
    fd.delete("responsable_ids[]");
    responsableIds.forEach((id) => fd.append("responsable_ids[]", id));
    const primaryId = responsableIds[0] ?? "";
    fd.set("responsable_id", primaryId);
    if (primaryId) {
      const r = responsables.find((r) => r.id === primaryId);
      if (r) fd.set("responsable_nombre", r.nombre);
    }
    // Pass previous responsable array so the action can detect newly added responsables
    // without a DB read (avoids caching/race-condition issues)
    const prevIds = defaultValues?.responsable_ids?.length
      ? defaultValues.responsable_ids
      : defaultValues?.responsable_id ? [defaultValues.responsable_id] : [];
    fd.delete("prev_responsable_ids[]");
    prevIds.forEach((pid) => fd.append("prev_responsable_ids[]", pid));

    // Ubicación: id + nombre desnormalizado
    if (ubicacionId && ubicacionId !== "__none__") {
      fd.set("ubicacion_id", ubicacionId);
      const u = ubicaciones.find((u) => u.id === ubicacionId);
      if (u) fd.set("ubicacion", u.nombre);
    } else {
      fd.set("ubicacion_id", "");
    }

    startTransition(() => action(fd));
  };

  const isEditing         = !!defaultValues?.id;
  const selectedUbicacion = ubicaciones.find((u) => u.id === ubicacionId);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        {isEditing ? "Volver al detalle" : "Volver a Permisos"}
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Columna principal ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Información general */}
          <Card className="p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-semibold">Información General</h2>
              <Separator className="mt-3" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Nombre del permiso" required>
                  <Input
                    name="nombre"
                    placeholder="Ej. Registro Sanitario — Bebida carbonatada"
                    defaultValue={defaultValues?.nombre}
                    required
                  />
                </Field>
              </div>
              <Field label="Número de expediente">
                <Input
                  name="numero_expediente"
                  placeholder="Ej. MINSAL-RS-2026-0142"
                  defaultValue={defaultValues?.numero_expediente}
                />
              </Field>
              <Field label="Tipo de permiso" required>
                <Select value={tipo} onValueChange={(v) => { if (v === "__add__") { setAddTipoOpen(true); return; } setTipo(v); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoItems.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.valor}</SelectItem>
                    ))}
                    <SelectItem value="__add__" className="text-primary font-medium">
                      <Plus className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />Agregar tipo…
                    </SelectItem>
                  </SelectContent>
                </Select>
                <CatalogAddDialog
                  open={addTipoOpen}
                  onOpenChange={setAddTipoOpen}
                  title="Tipos de permiso"
                  modulo="permisos"
                  tipo="tipo_permiso"
                  onItemAdded={(item) => {
                    setTipoItems((prev) => [...prev, item]);
                    setTipo(item.id);
                  }}
                />
              </Field>
              <Field label="Entidad reguladora">
                <Select value={entidad || "__none__"} onValueChange={(v) => { if (v === "__add__") { setAddEntidadOpen(true); return; } setEntidad(v); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin especificar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin especificar</SelectItem>
                    {entidadItems.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.valor}</SelectItem>
                    ))}
                    <SelectItem value="__add__" className="text-primary font-medium">
                      <Plus className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />Agregar entidad…
                    </SelectItem>
                  </SelectContent>
                </Select>
                <CatalogAddDialog
                  open={addEntidadOpen}
                  onOpenChange={setAddEntidadOpen}
                  title="Entidades reguladoras"
                  modulo="permisos"
                  tipo="entidad_reguladora"
                  onItemAdded={(item) => {
                    setEntidadItems((prev) => [...prev, item]);
                    setEntidad(item.id);
                  }}
                />
              </Field>

              {/* Estado del trámite (only shown when editing) */}
              {isEditing && (
                <Field label="Estado del trámite">
                  <Select value={estado} onValueChange={(v) => {
                    setEstado(v);
                    if (v === ESTADOS_PERMISO.CON_PERMISO_PROVISIONAL) setTieneProvisional(true);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_PERMISO_OPTIONS.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.valor}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="estado" value={estado} />
                </Field>
              )}

              <div className="sm:col-span-2">
                <Field label="Descripción">
                  <Textarea
                    name="descripcion"
                    placeholder="Descripción del permiso y su alcance…"
                    defaultValue={defaultValues?.descripcion}
                    rows={3}
                  />
                </Field>
              </div>
            </div>
          </Card>

          {/* Valor económico */}
          <Card className="p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-semibold">Valor Económico</h2>
              <Separator className="mt-3" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valor del trámite">
                <Input
                  name="valor_tramite"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={defaultValues?.valor_tramite ?? ""}
                />
              </Field>
              <Field label="Moneda">
                <Select value={moneda} onValueChange={setMoneda}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONEDAS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Card>

          {/* Fechas */}
          <Card className="p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-semibold">Fechas Clave</h2>
              <Separator className="mt-3" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Fecha de solicitud">
                <DatePickerInput name="fecha_solicitud" defaultValue={defaultValues?.fecha_solicitud} placeholder="Seleccionar" />
              </Field>
              <Field label="Fecha de emisión">
                <DatePickerInput name="fecha_emision" defaultValue={defaultValues?.fecha_emision} placeholder="Seleccionar" />
              </Field>
              <Field label="Fecha de vencimiento">
                <DatePickerInput
                  name="fecha_vencimiento"
                  value={fechaVenc}
                  onChange={(iso) => {
                    if (mode === "edit" && originalFechaVenc && iso && iso !== originalFechaVenc) {
                      setPendingFechaVenc(iso);
                      setFechaVencConfirmOpen(true);
                    } else {
                      setFechaVenc(iso);
                    }
                  }}
                  placeholder="Seleccionar"
                />
              </Field>
            </div>

            {fechaVencJustif && (
              <input type="hidden" name="fecha_vencimiento_justificacion" value={fechaVencJustif} />
            )}

            <DateChangeConfirmDialog
              open={fechaVencConfirmOpen}
              onOpenChange={setFechaVencConfirmOpen}
              fieldLabel="Fecha de vencimiento"
              previousDate={originalFechaVenc}
              newDate={pendingFechaVenc}
              onConfirm={(justif) => {
                setFechaVenc(pendingFechaVenc);
                setFechaVencJustif(justif);
                setPendingFechaVenc("");
                setFechaVencConfirmOpen(false);
              }}
              onCancel={() => {
                setPendingFechaVenc("");
                setFechaVencConfirmOpen(false);
              }}
            />
          </Card>

          {/* Permiso Provisional — siempre visible, independiente del estado del workflow.
              También se puede activar automáticamente al cambiar el estado a
              "Con Permiso Provisional" desde el modal de cambio de estado. */}
          <Card className="p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Permiso Provisional</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Indica si existe un permiso provisional mientras se gestiona el definitivo.
                </p>
              </div>
              <Switch
                checked={tieneProvisional}
                onCheckedChange={setTieneProvisional}
                aria-label="Tiene permiso provisional"
              />
            </div>
            {tieneProvisional && (
              <>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Fecha de emisión provisional">
                    <DatePickerInput
                      name="fecha_emision_provisional"
                      defaultValue={defaultValues?.fecha_emision_provisional}
                      placeholder="Seleccionar"
                    />
                  </Field>
                  <Field label="Fecha de vencimiento provisional">
                    <DatePickerInput
                      name="fecha_vencimiento_provisional"
                      defaultValue={defaultValues?.fecha_vencimiento_provisional}
                      placeholder="Seleccionar"
                    />
                  </Field>
                </div>
              </>
            )}
          </Card>

          {/* Marco legal y riesgo */}
          <Card className="p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-semibold">Marco Legal y Riesgo</h2>
              <Separator className="mt-3" />
            </div>
            <Field
              label="Base Legal del Permiso"
              hint="Ley, reglamento o decreto que sustenta la obligación de este permiso."
            >
              <Textarea
                name="base_legal"
                placeholder="Ej. Art. 47 del Código de Salud; Reglamento MARN-2018-04…"
                defaultValue={defaultValues?.base_legal}
                rows={3}
              />
            </Field>
            <Field
              label="Riesgo por Incumplimiento"
              hint="Consecuencias operativas, legales o reputacionales si el permiso vence o no se renueva."
            >
              <Textarea
                name="riesgo_incumplimiento"
                placeholder="Ej. Suspensión de operaciones, multa de hasta $50,000, cierre temporal…"
                defaultValue={defaultValues?.riesgo_incumplimiento}
                rows={3}
              />
            </Field>
            <Field
              label="Base Legal del Incumplimiento"
              hint="Artículos o normas que tipifican la sanción por no contar con este permiso."
            >
              <Textarea
                name="base_legal_incumplimiento"
                placeholder="Ej. Art. 200 del Código de Salud establece multa de 10 a 100 salarios…"
                defaultValue={defaultValues?.base_legal_incumplimiento}
                rows={3}
              />
            </Field>
          </Card>
        </div>

        {/* ── Columna lateral ── */}
        <div className="space-y-5">

          {/* Responsable */}
          <Card className="p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold">Responsable</h2>
            <Separator />
            <ResponsableMultiSelect
              responsables={responsables}
              profiles={profiles}
              selectedIds={responsableIds}
              onChange={setResponsableIds}
              onResponsableAdded={(r) => setResponsables((prev) => [r, ...prev])}
            />
          </Card>

          {/* Ubicación */}
          <Card className="p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold">Ubicación</h2>
            <Separator />
            <Field label="Seleccionar ubicación">
              <Select value={ubicacionId} onValueChange={(v) => { if (v === "__add__") { setAddUbicacionOpen(true); return; } setUbicacionId(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin especificar</SelectItem>
                  {ubicaciones.filter((u) => u.activo).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre}
                      {u.ciudad && <span className="ml-1 text-xs text-muted-foreground">· {u.ciudad}</span>}
                    </SelectItem>
                  ))}
                  <SelectItem value="__add__" className="text-primary font-medium">
                    <Plus className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />Agregar ubicación…
                  </SelectItem>
                </SelectContent>
              </Select>
              <UbicacionAddDialog
                open={addUbicacionOpen}
                onOpenChange={setAddUbicacionOpen}
                onItemAdded={(u) => { setUbicaciones((prev) => [u, ...prev]); setUbicacionId(u.id); }}
              />
              {selectedUbicacion && (selectedUbicacion.direccion || selectedUbicacion.ciudad) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {[selectedUbicacion.direccion, selectedUbicacion.ciudad, selectedUbicacion.departamento].filter(Boolean).join(", ")}
                </p>
              )}
            </Field>
          </Card>

          {/* Botones */}
          <Card className="p-5 shadow-sm space-y-3">
            <Button type="submit" className="w-full" disabled={isPending || !tipo}>
              <Save className="mr-2 h-4 w-4" />
              {isPending ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear Permiso"}
            </Button>
            <Link href={backHref}>
              <Button type="button" variant="outline" className="w-full">Cancelar</Button>
            </Link>
          </Card>

          {!isEditing && (
            <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
              <strong className="text-foreground block mb-1">Estado inicial</strong>
              El permiso se creará en estado{" "}
              <span className="font-medium text-foreground">Creado</span>.
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
