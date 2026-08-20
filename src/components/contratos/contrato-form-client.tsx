"use client";

import { useRef, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Save, Upload, FileText, X, Loader2, CheckCircle2, AlertCircle, Wand2, Plus,
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
  MONEDAS_CONTRATO,
  type Contrato,
  type ContratoTipo,
} from "@/types/contratos";
import type { Responsable } from "@/lib/repositories/responsables";
import type { ContratoPlantilla } from "@/lib/repositories/contrato-plantillas";
import type { CatalogoItem } from "@/types/settings";
import type { ProfileOption } from "@/types/users";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { CatalogAddDialog } from "@/components/shared/catalog-add-dialog";
import { DateChangeConfirmDialog } from "@/components/shared/date-change-confirm-dialog";
import { ResponsableMultiSelect } from "@/components/shared/responsable-multi-select";
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
  tiposContrato?: CatalogoItem[];
  profiles?: ProfileOption[];
  backHref?: string;
}

export function ContratoFormClient({
  action,
  mode,
  defaultValues,
  responsables: responsablesProp = [],
  plantillas = [],
  tiposContrato: tiposContratoProp = [],
  profiles = [],
  backHref,
}: ContratoFormClientProps) {
  const [tipoItems,    setTipoItems]    = useState<CatalogoItem[]>(tiposContratoProp);
  const [responsables, setResponsables] = useState<Responsable[]>(responsablesProp);

  const [addTipoOpen, setAddTipoOpen] = useState(false);

  // Confirmación de cambio de fecha_fin
  const originalFechaFin                         = defaultValues?.fecha_fin ?? "";
  const [fechaFinConfirmOpen, setFechaFinConfirmOpen] = useState(false);
  const [pendingFechaFin,     setPendingFechaFin]     = useState("");
  const [fechaFinJustif,      setFechaFinJustif]      = useState("");
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
  const [tipo,         setTipo]         = useState(defaultValues?.tipo_id ?? "");
  const [moneda,       setMoneda]       = useState(defaultValues?.moneda ?? "USD");
  const [contenidoHtml, setContenidoHtml] = useState(defaultValues?.contenido_html ?? "");
  const [storagePath,  setStoragePath]  = useState(defaultValues?.storage_path ?? "");
  const [responsableIds, setResponsableIds] = useState<string[]>(() => {
    if (defaultValues?.responsable_ids?.length) return defaultValues.responsable_ids;
    if (defaultValues?.responsable_id) return [defaultValues.responsable_id];
    return [];
  });

  // ── PDF extraction state ─────────────────────────────────────
  const [extractState, setExtractState] = useState<ExtractState>({ status: "idle" });
  const [isDragOver,   setIsDragOver]   = useState(false);

  // ── Plantilla modal state ─────────────────────────────────────
  const [plantillaModalOpen, setPlantillaModalOpen] = useState(false);

  const tiposList = tipoItems.map((i) => i.valor);
  const isEditing           = mode === "edit";

  // ── Form submit ───────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tipo_id",        tipo);
    fd.set("tipo_nombre",    tipoItems.find((t) => t.id === tipo)?.valor ?? "");
    fd.set("moneda",         moneda);
    fd.set("contenido_html", contenidoHtml);
    fd.set("storage_path",   storagePath);

    fd.delete("responsable_ids[]");
    responsableIds.forEach((id) => fd.append("responsable_ids[]", id));
    const primaryId = responsableIds[0] ?? "";
    fd.set("responsable_id", primaryId);
    if (primaryId) {
      const r = responsables.find((r) => r.id === primaryId);
      if (r) fd.set("responsable_nombre", r.nombre);
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
                  title="Tipos de contrato"
                  modulo="contratos"
                  tipo="tipo"
                  onItemAdded={(item) => {
                    setTipoItems((prev) => [...prev, item]);
                    setTipo(item.id);
                  }}
                />
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
                <DatePickerInput
                  name="fecha_inicio"
                  value={fechaInicio}
                  onChange={setFechaInicio}
                  placeholder="Seleccionar"
                />
              </Field>
              <Field label="Fecha de firma">
                <DatePickerInput
                  name="fecha_firma"
                  value={fechaFirma}
                  onChange={setFechaFirma}
                  placeholder="Seleccionar"
                />
              </Field>
              <Field label="Fecha de fin">
                <DatePickerInput
                  name="fecha_fin"
                  value={fechaFin}
                  onChange={(iso) => {
                    if (mode === "edit" && originalFechaFin && iso && iso !== originalFechaFin) {
                      setPendingFechaFin(iso);
                      setFechaFinConfirmOpen(true);
                    } else {
                      setFechaFin(iso);
                    }
                  }}
                  placeholder="Seleccionar"
                />
              </Field>
            </div>

            {fechaFinJustif && (
              <input type="hidden" name="fecha_fin_justificacion" value={fechaFinJustif} />
            )}

            <DateChangeConfirmDialog
              open={fechaFinConfirmOpen}
              onOpenChange={setFechaFinConfirmOpen}
              fieldLabel="Fecha de fin"
              previousDate={originalFechaFin}
              newDate={pendingFechaFin}
              onConfirm={(justif) => {
                setFechaFin(pendingFechaFin);
                setFechaFinJustif(justif);
                setPendingFechaFin("");
                setFechaFinConfirmOpen(false);
              }}
              onCancel={() => {
                setPendingFechaFin("");
                setFechaFinConfirmOpen(false);
              }}
            />
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
            <ResponsableMultiSelect
              responsables={responsables}
              profiles={profiles}
              selectedIds={responsableIds}
              onChange={setResponsableIds}
              onResponsableAdded={(r) => setResponsables((prev) => [...prev, r])}
            />
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
