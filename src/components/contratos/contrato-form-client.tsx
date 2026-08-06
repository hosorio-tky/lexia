"use client";

import { useRef, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Save, Upload, FileText, X, Loader2, CheckCircle2, AlertCircle, Wand2,
} from "lucide-react";
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
  type ContratoTipo,
} from "@/types/contratos";
import type { Responsable } from "@/lib/repositories/responsables";
import type { ContratoPlantilla } from "@/lib/repositories/contrato-plantillas";
import { UsarPlantillaModal } from "./usar-plantilla-modal";

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

type ExtractState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; fileName: string; fieldCount: number }
  | { status: "error"; message: string };

interface ContratoFormClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (_prevState: any, formData: FormData) => Promise<any>;
  mode: "create" | "edit";
  defaultValues?: Partial<Contrato>;
  responsables?: Responsable[];
  plantillas?: ContratoPlantilla[];
  backHref?: string;
}

export function ContratoFormClient({
  action,
  mode,
  defaultValues,
  responsables = [],
  plantillas = [],
  backHref,
}: ContratoFormClientProps) {
  const resolvedBackHref = backHref ?? (
    mode === "edit" && defaultValues?.id ? `/contratos/${defaultValues.id}` : "/contratos"
  );

  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Controlled fields (pre-fillable via extraction) ─────────
  const [titulo,            setTitulo]           = useState(defaultValues?.titulo ?? "");
  const [numero,            setNumero]           = useState(defaultValues?.numero ?? "");
  const [descripcion,       setDescripcion]      = useState(defaultValues?.descripcion ?? "");
  const [contraparteNombre, setContraparteNombre] = useState(defaultValues?.contraparte_nombre ?? "");
  const [contraparteEmail,  setContraparteEmail]  = useState(defaultValues?.contraparte_email ?? "");
  const [valor,             setValor]            = useState(String(defaultValues?.valor ?? ""));
  const [fechaInicio,       setFechaInicio]      = useState(defaultValues?.fecha_inicio ?? "");
  const [fechaFin,          setFechaFin]         = useState(defaultValues?.fecha_fin ?? "");
  const [fechaFirma,        setFechaFirma]       = useState(defaultValues?.fecha_firma ?? "");

  // ── Controlled fields (Select / RichText) ────────────────────
  const [tipo,         setTipo]         = useState(defaultValues?.tipo ?? "");
  const [moneda,       setMoneda]       = useState(defaultValues?.moneda ?? "USD");
  const [contenidoHtml, setContenidoHtml] = useState(defaultValues?.contenido_html ?? "");
  const [storagePath,  setStoragePath]  = useState(defaultValues?.storage_path ?? "");
  const [responsableId, setResponsableId] = useState(defaultValues?.responsable_id ?? "__none__");

  // ── PDF extraction state ─────────────────────────────────────
  const [extractState, setExtractState] = useState<ExtractState>({ status: "idle" });
  const [isDragOver,   setIsDragOver]   = useState(false);

  // ── Plantilla modal state ─────────────────────────────────────
  const [plantillaModalOpen, setPlantillaModalOpen] = useState(false);

  const selectedResponsable = responsables.find((r) => r.id === responsableId);
  const isEditing           = mode === "edit";

  // ── Form submit ───────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tipo",           tipo);
    fd.set("moneda",         moneda);
    fd.set("contenido_html", contenidoHtml);
    fd.set("storage_path",   storagePath);

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

  // ── PDF upload + extraction ───────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) {
      setExtractState({ status: "error", message: "Solo se aceptan archivos PDF o DOCX." });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setExtractState({ status: "error", message: "El archivo excede el límite de 20 MB." });
      return;
    }

    setExtractState({ status: "uploading" });

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/contratos/extract", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setExtractState({ status: "error", message: data.error ?? "Error al procesar el archivo." });
        return;
      }

      // Pre-fill storage path and content
      if (data.storage_path) setStoragePath(data.storage_path);
      if (data.contenido_html) setContenidoHtml(data.contenido_html);

      // Pre-fill extracted fields
      const f = data.fields ?? {};
      let fieldCount = 0;

      if (f.titulo)             { setTitulo(f.titulo);                     fieldCount++; }
      if (f.numero)             { setNumero(f.numero);                     fieldCount++; }
      if (f.tipo)               { setTipo(f.tipo as ContratoTipo);         fieldCount++; }
      if (f.descripcion)        { setDescripcion(f.descripcion);           fieldCount++; }
      if (f.contraparte_nombre) { setContraparteNombre(f.contraparte_nombre); fieldCount++; }
      if (f.contraparte_email)  { setContraparteEmail(f.contraparte_email);  fieldCount++; }
      if (f.valor)              { setValor(String(f.valor));               fieldCount++; }
      if (f.moneda)             { setMoneda(f.moneda);                     fieldCount++; }
      if (f.fecha_inicio)       { setFechaInicio(f.fecha_inicio);          fieldCount++; }
      if (f.fecha_fin)          { setFechaFin(f.fecha_fin);                fieldCount++; }
      if (f.fecha_firma)        { setFechaFirma(f.fecha_firma);            fieldCount++; }

      setExtractState({ status: "done", fileName: file.name, fieldCount });
    } catch {
      setExtractState({ status: "error", message: "No se pudo conectar con el servidor." });
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const resetExtraction = () => {
    setExtractState({ status: "idle" });
    setStoragePath("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerated = useCallback((result: {
    contenido_html: string;
    fields: {
      titulo?:             string;
      tipo?:               ContratoTipo;
      contraparte_nombre?: string;
      contraparte_email?:  string;
      valor?:              number;
      moneda?:             string;
      fecha_inicio?:       string;
      fecha_fin?:          string;
      fecha_firma?:        string;
    };
  }) => {
    if (result.contenido_html) setContenidoHtml(result.contenido_html);
    const f = result.fields ?? {};
    if (f.titulo)             setTitulo(f.titulo);
    if (f.tipo)               setTipo(f.tipo);
    if (f.contraparte_nombre) setContraparteNombre(f.contraparte_nombre);
    if (f.contraparte_email)  setContraparteEmail(f.contraparte_email);
    if (f.valor)              setValor(String(f.valor));
    if (f.moneda)             setMoneda(f.moneda);
    if (f.fecha_inicio)       setFechaInicio(f.fecha_inicio);
    if (f.fecha_fin)          setFechaFin(f.fecha_fin);
    if (f.fecha_firma)        setFechaFirma(f.fecha_firma);
  }, []);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Link
        href={resolvedBackHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        {isEditing ? "Volver al detalle" : "Volver a Contratos"}
      </Link>

      {/* ── Sección de carga de PDF (solo en creación) ─────────── */}
      {!isEditing && (
        <Card className="p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              Cargar documento para autocompletar
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Sube el PDF o DOCX del contrato y la IA extraerá los datos automáticamente.
              Podrás revisar y corregir todo antes de guardar.
            </p>
          </div>
          <Separator />

          {extractState.status === "idle" || extractState.status === "error" ? (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed
                  cursor-pointer py-10 transition-colors
                  ${isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"}
                `}
              >
                <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Arrastra el archivo aquí o <span className="text-primary">haz clic para seleccionar</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF o DOCX · máx. 20 MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  onChange={handleInputChange}
                />
              </div>

              {extractState.status === "error" && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {extractState.message}
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground">
                O bien, completa el formulario manualmente a continuación.
              </p>
            </>
          ) : extractState.status === "uploading" ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Analizando documento…</p>
              <p className="text-xs text-muted-foreground">La IA está extrayendo los datos del contrato</p>
            </div>
          ) : (
            /* status === "done" */
            <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    Documento analizado
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    <span className="font-medium">{extractState.fileName}</span>
                    {" · "}
                    {extractState.fieldCount} campo{extractState.fieldCount !== 1 ? "s" : ""} completado{extractState.fieldCount !== 1 ? "s" : ""} automáticamente.
                    Revisa y ajusta los datos antes de guardar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetExtraction}
                className="shrink-0 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400"
                title="Cambiar archivo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </Card>
      )}

      {/* ── Usar plantilla (solo en creación) ──────────────────── */}
      {!isEditing && (
        <Card className="p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-muted-foreground" />
                Generar con plantilla + IA
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Selecciona una plantilla de tu biblioteca, completa los datos clave y la IA redactará el contrato.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPlantillaModalOpen(true)}
              className="shrink-0"
            >
              <Wand2 className="mr-1.5 h-4 w-4" />
              Usar plantilla
            </Button>
          </div>
        </Card>
      )}

      <UsarPlantillaModal
        open={plantillaModalOpen}
        onClose={() => setPlantillaModalOpen(false)}
        plantillas={plantillas}
        onGenerated={handleGenerated}
      />

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
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <Field label="Número / Referencia">
                <Input
                  name="numero"
                  placeholder="Ej. CONT-2026-0042"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
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
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
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
                  value={contraparteNombre}
                  onChange={(e) => setContraparteNombre(e.target.value)}
                />
              </Field>
              <Field label="Email contraparte">
                <Input
                  name="contraparte_email"
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={contraparteEmail}
                  onChange={(e) => setContraparteEmail(e.target.value)}
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
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
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
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </Field>
              <Field label="Fecha de fin">
                <Input
                  name="fecha_fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </Field>
              <Field label="Fecha de firma">
                <Input
                  name="fecha_firma"
                  type="date"
                  value={fechaFirma}
                  onChange={(e) => setFechaFirma(e.target.value)}
                />
              </Field>
            </div>
          </Card>

          {/* Contenido HTML */}
          <Card className="p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-semibold">Contenido del Contrato</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? "Edita el texto del contrato. Cada edición guarda una versión automáticamente."
                  : "El texto se extrae automáticamente del PDF. Puedes editarlo antes de guardar."}
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
                {isEditing
                  ? "Sube el contrato en formato PDF para visualizarlo desde el detalle."
                  : "Se completa automáticamente al cargar el documento arriba."}
              </p>
              <Separator className="mt-3" />
            </div>
            {defaultValues?.storage_path && (
              <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                Documento actual: <span className="font-mono break-all">{defaultValues.storage_path}</span>
              </div>
            )}
            <Field
              label="Ruta de almacenamiento (storage_path)"
              hint="Se genera automáticamente al cargar el PDF. También puedes editarla manualmente."
            >
              <Input
                name="storage_path"
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
