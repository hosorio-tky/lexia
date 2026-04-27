"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
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
import { PERMIT_TYPES, PERMIT_STATUSES, REGULATORY_ENTITIES, MONEDAS, type Permit } from "@/types/permits";
import { DatePickerInput } from "@/components/ui/date-picker-input";
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
  defaultValues?: Partial<Permit>;
  backHref?: string;
  tiposPermiso?: string[];
  entidadesReguladoras?: string[];
  responsables?: Responsable[];
  ubicaciones?: Ubicacion[];
}

export function PermitFormClient({
  action,
  defaultValues,
  backHref = "/permisos",
  tiposPermiso: tiposPermisoProp,
  entidadesReguladoras: entidadesProp,
  responsables = [],
  ubicaciones = [],
}: PermitFormClientProps) {
  const tiposList     = tiposPermisoProp ?? ([...PERMIT_TYPES] as string[]);
  const entidadesList = entidadesProp    ?? ([...REGULATORY_ENTITIES] as string[]);

  const [isPending, startTransition] = useTransition();
  const [tipo, setTipo]             = useState(defaultValues?.tipo ?? "");
  const [estado, setEstado]         = useState(defaultValues?.estado ?? "Creado");
  const [entidad, setEntidad]       = useState(defaultValues?.entidad_reguladora ?? "");
  const [responsableId, setResponsableId] = useState(defaultValues?.responsable_id ?? "__none__");
  const [ubicacionId, setUbicacionId]     = useState(defaultValues?.ubicacion_id ?? "__none__");
  const [moneda, setMoneda]         = useState(defaultValues?.moneda ?? "USD");
  const [tieneProvisional, setTieneProvisional] = useState(
    defaultValues?.tiene_provisional ?? false
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Show provisional section when estado is "Con Permiso Provisional"
  const showProvisional = estado === "Con Permiso Provisional" || tieneProvisional;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tipo", tipo);
    fd.set("entidad_reguladora", entidad === "__none__" ? "" : entidad);
    fd.set("moneda", moneda);
    fd.set("tiene_provisional", String(tieneProvisional));

    // Responsable: id + nombre desnormalizado
    if (responsableId && responsableId !== "__none__") {
      fd.set("responsable_id", responsableId);
      const r = responsables.find((r) => r.id === responsableId);
      if (r) fd.set("responsable_nombre", r.nombre);
    } else {
      fd.set("responsable_id", "");
      // Fallback a campo manual si no hay lista
      const manual = fd.get("responsable_nombre_manual") as string;
      if (manual) fd.set("responsable_nombre", manual);
    }

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

  const isEditing           = !!defaultValues?.id;
  const selectedResponsable = responsables.find((r) => r.id === responsableId);
  const selectedUbicacion   = ubicaciones.find((u) => u.id === ubicacionId);

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
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposList.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Entidad reguladora">
                <Select value={entidad || "__none__"} onValueChange={setEntidad}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin especificar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin especificar</SelectItem>
                    {entidadesList.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Estado del trámite (only shown when editing) */}
              {isEditing && (
                <Field label="Estado del trámite">
                  <Select value={estado} onValueChange={(v) => {
                    setEstado(v as typeof estado);
                    // Auto-enable provisional when selecting that state
                    if (v === "Con Permiso Provisional") setTieneProvisional(true);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERMIT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
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
                <DatePickerInput name="fecha_vencimiento" defaultValue={defaultValues?.fecha_vencimiento} placeholder="Seleccionar" />
              </Field>
            </div>
          </Card>

          {/* Permiso Provisional */}
          {showProvisional && (
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
          )}

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
            {responsables.length > 0 ? (
              <Field label="Asignar responsable">
                <Select value={responsableId} onValueChange={setResponsableId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin asignar</SelectItem>
                    {responsables.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nombre}
                        {r.area && <span className="ml-1.5 text-xs text-muted-foreground">· {r.area}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedResponsable && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {selectedResponsable.nombre.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}
                    </div>
                    <div className="text-xs">
                      <p className="font-medium">{selectedResponsable.nombre}</p>
                      {selectedResponsable.email && <p className="text-muted-foreground">{selectedResponsable.email}</p>}
                    </div>
                  </div>
                )}
              </Field>
            ) : (
              <Field label="Nombre del responsable">
                <Input
                  name="responsable_nombre_manual"
                  placeholder="Ej. Ana López"
                  defaultValue={defaultValues?.responsable_nombre}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Configura responsables en{" "}
                  <a href="/configuracion/responsables" className="underline hover:text-foreground transition-colors">
                    Configuración → Responsables
                  </a>
                </p>
              </Field>
            )}
          </Card>

          {/* Ubicación */}
          <Card className="p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold">Ubicación</h2>
            <Separator />
            {ubicaciones.length > 0 ? (
              <Field label="Seleccionar ubicación">
                <Select value={ubicacionId} onValueChange={setUbicacionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin especificar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin especificar</SelectItem>
                    {ubicaciones.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nombre}
                        {u.ciudad && <span className="ml-1 text-xs text-muted-foreground">· {u.ciudad}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedUbicacion && (selectedUbicacion.direccion || selectedUbicacion.ciudad) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {[selectedUbicacion.direccion, selectedUbicacion.ciudad, selectedUbicacion.departamento].filter(Boolean).join(", ")}
                  </p>
                )}
              </Field>
            ) : (
              <Field label="Ubicación / Planta">
                <Input
                  name="ubicacion"
                  placeholder="Ej. Planta Norte — San Salvador"
                  defaultValue={defaultValues?.ubicacion}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Configura ubicaciones en{" "}
                  <a href="/configuracion/ubicaciones" className="underline hover:text-foreground transition-colors">
                    Configuración → Ubicaciones
                  </a>
                </p>
              </Field>
            )}
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
