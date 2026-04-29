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
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import {
  CONTRACT_TIPOS,
  MONEDAS_CONTRATO,
  type Contrato,
} from "@/types/contratos";
import type { Responsable } from "@/lib/repositories/responsables";

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

interface ContratoFormClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (_prevState: any, formData: FormData) => Promise<any>;
  mode: "create" | "edit";
  defaultValues?: Partial<Contrato>;
  responsables?: Responsable[];
  backHref?: string;
}

export function ContratoFormClient({
  action,
  mode,
  defaultValues,
  responsables = [],
  backHref,
}: ContratoFormClientProps) {
  const resolvedBackHref = backHref ?? (
    mode === "edit" && defaultValues?.id ? `/contratos/${defaultValues.id}` : "/contratos"
  );

  const [isPending, startTransition] = useTransition();
  const [tipo, setTipo]       = useState(defaultValues?.tipo ?? "");
  const [moneda, setMoneda]   = useState(defaultValues?.moneda ?? "USD");
  const [contenidoHtml, setContenidoHtml] = useState(defaultValues?.contenido_html ?? "");
  const [storagePath, setStoragePath]     = useState(defaultValues?.storage_path ?? "");
  const [responsableId, setResponsableId] = useState(
    defaultValues?.responsable_id ?? "__none__"
  );
  const formRef = useRef<HTMLFormElement>(null);

  const selectedResponsable = responsables.find((r) => r.id === responsableId);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tipo",          tipo);
    fd.set("moneda",        moneda);
    fd.set("contenido_html", contenidoHtml);
    fd.set("storage_path",  storagePath);
    // Responsable: id + nombre desnormalizado
    if (responsableId && responsableId !== "__none__") {
      fd.set("responsable_id", responsableId);
      const r = responsables.find((r) => r.id === responsableId);
      if (r) fd.set("responsable_nombre", r.nombre);
    } else {
      fd.set("responsable_id", "");
      const manual = fd.get("responsable_nombre_manual") as string;
      if (manual) fd.set("responsable_nombre", manual);
    }
    startTransition(() => action(null, fd));
  };

  const isEditing = mode === "edit";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Link
        href={resolvedBackHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        {isEditing ? "Volver al detalle" : "Volver a Contratos"}
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
                <Field label="Título del contrato" required>
                  <Input
                    name="titulo"
                    placeholder="Ej. Contrato de servicios de consultoría TI"
                    defaultValue={defaultValues?.titulo}
                    required
                  />
                </Field>
              </div>
              <Field label="Número / Referencia">
                <Input
                  name="numero"
                  placeholder="Ej. CONT-2026-0042"
                  defaultValue={defaultValues?.numero}
                />
              </Field>
              <Field label="Tipo de contrato" required>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Descripción">
                  <Textarea
                    name="descripcion"
                    placeholder="Resumen del alcance y objeto del contrato…"
                    defaultValue={defaultValues?.descripcion}
                    rows={3}
                  />
                </Field>
              </div>
            </div>
          </Card>

          {/* Contraparte */}
          <Card className="p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-semibold">Datos de la Contraparte</h2>
              <Separator className="mt-3" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre contraparte">
                <Input
                  name="contraparte_nombre"
                  placeholder="Ej. Empresa ABC S.A."
                  defaultValue={defaultValues?.contraparte_nombre}
                />
              </Field>
              <Field label="Email contraparte">
                <Input
                  name="contraparte_email"
                  type="email"
                  placeholder="contacto@empresa.com"
                  defaultValue={defaultValues?.contraparte_email}
                />
              </Field>
            </div>
          </Card>

          {/* Valor económico */}
          <Card className="p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-semibold">Valor Económico</h2>
              <Separator className="mt-3" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valor del contrato">
                <Input
                  name="valor"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={defaultValues?.valor ?? ""}
                />
              </Field>
              <Field label="Moneda">
                <Select value={moneda} onValueChange={setMoneda}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONEDAS_CONTRATO.map((m) => (
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
              <Field label="Fecha de inicio">
                <Input
                  name="fecha_inicio"
                  type="date"
                  defaultValue={defaultValues?.fecha_inicio ?? ""}
                />
              </Field>
              <Field label="Fecha de fin">
                <Input
                  name="fecha_fin"
                  type="date"
                  defaultValue={defaultValues?.fecha_fin ?? ""}
                />
              </Field>
              <Field label="Fecha de firma">
                <Input
                  name="fecha_firma"
                  type="date"
                  defaultValue={defaultValues?.fecha_firma ?? ""}
                />
              </Field>
            </div>
          </Card>

          {/* Contenido HTML */}
          <Card className="p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-semibold">Contenido del Contrato</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Redacta o pega el texto del contrato. Cada edición guarda una versión automáticamente.
              </p>
              <Separator className="mt-3" />
            </div>
            <RichTextEditor
              content={contenidoHtml}
              onChange={setContenidoHtml}
              placeholder="Escribe el contenido del contrato aquí…"
              minHeight="200px"
            />
          </Card>

          {/* PDF adjunto */}
          <Card className="p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-semibold">Documento PDF (opcional)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sube el contrato en formato PDF para visualizarlo desde el detalle.
              </p>
              <Separator className="mt-3" />
            </div>
            {defaultValues?.storage_path && (
              <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                Documento actual: <span className="font-mono break-all">{defaultValues.storage_path}</span>
              </div>
            )}
            <Field label="Ruta de almacenamiento (storage_path)" hint="Se genera automáticamente al subir el PDF desde el detalle del contrato.">
              <Input
                name="storage_path_manual"
                placeholder="Se completa automáticamente al subir el PDF"
                value={storagePath}
                onChange={(e) => setStoragePath(e.target.value)}
                className="font-mono text-xs"
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
                        {r.area && (
                          <span className="ml-1.5 text-xs text-muted-foreground">· {r.area}</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedResponsable && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {selectedResponsable.nombre.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase()}
                    </div>
                    <div className="text-xs">
                      <p className="font-medium">{selectedResponsable.nombre}</p>
                      {selectedResponsable.email && (
                        <p className="text-muted-foreground">{selectedResponsable.email}</p>
                      )}
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

          {/* Botones */}
          <Card className="p-5 shadow-sm space-y-3">
            <Button type="submit" className="w-full" disabled={isPending || !tipo}>
              <Save className="mr-2 h-4 w-4" />
              {isPending ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear Contrato"}
            </Button>
            <Link href={resolvedBackHref}>
              <Button type="button" variant="outline" className="w-full">Cancelar</Button>
            </Link>
          </Card>

          {!isEditing && (
            <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
              <strong className="text-foreground block mb-1">Estado inicial</strong>
              El contrato se creará en estado{" "}
              <span className="font-medium text-foreground">En Revisión</span>.
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
