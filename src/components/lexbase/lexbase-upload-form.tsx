"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Plus, FileText, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { subirDocumento } from "@/app/actions/lexbase";
import { LEXBASE_TIPOS, type LexbaseCategoria } from "@/types/lexbase";
import { cn } from "@/lib/utils";
import type { LexbaseExtraido } from "@/lib/ai/lexbase-extractor";
import { DatePickerInput } from "@/components/ui/date-picker-input";

interface LexbaseUploadFormProps {
  categorias: LexbaseCategoria[];
}

const PAISES = [
  "El Salvador", "Guatemala", "Honduras", "Nicaragua", "Costa Rica",
  "Panamá", "México", "Colombia", "Argentina", "Chile", "Perú", "España", "Otro",
];

const ACCEPTED_TYPES = ".pdf,.docx,.doc,.txt";

type ExtractionState = "idle" | "extracting" | "done" | "error";

export function LexbaseUploadForm({ categorias }: LexbaseUploadFormProps) {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();

  // — Paso 1: archivo
  const [selectedFile, setSelectedFile]   = useState<File | null>(null);
  const [dragOver, setDragOver]           = useState(false);
  const [extractionState, setExtractionState] = useState<ExtractionState>("idle");
  const [extractionError, setExtractionError] = useState("");

  // — Paso 2: metadata (pre-llenada por IA, editable por el usuario)
  const [titulo,        setTitulo]        = useState("");
  const [tipo,          setTipo]          = useState("Ley");
  const [categoriaId,   setCategoriaId]   = useState("");
  const [pais,          setPais]          = useState("El Salvador");
  const [numeroOficial, setNumeroOficial] = useState("");
  const [organoEmisor,  setOrganoEmisor]  = useState("");
  const [fechaPub,      setFechaPub]      = useState("");
  const [fechaVig,      setFechaVig]      = useState("");
  const [descripcion,   setDescripcion]   = useState("");
  const [tags,          setTags]          = useState<string[]>([]);
  const [tagInput,      setTagInput]      = useState("");
  const [tieneReformas, setTieneReformas] = useState(false);

  const metadataVisible = extractionState === "done" || extractionState === "error";

  // ── Manejo de archivo ───────────────────────────────────────────────────────

  function handleFile(file: File) {
    setSelectedFile(file);
    setExtractionState("idle");
    setExtractionError("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function clearFile() {
    setSelectedFile(null);
    setExtractionState("idle");
    setExtractionError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Extracción IA ────────────────────────────────────────────────────────────

  async function handleAnalyze() {
    if (!selectedFile) return;
    setExtractionState("extracting");
    setExtractionError("");

    try {
      const fd = new FormData();
      fd.set("file", selectedFile);
      const res = await fetch("/api/lexbase/extract", { method: "POST", body: fd });
      const json = await res.json() as { fields?: LexbaseExtraido; error?: string };

      if (!res.ok || json.error) {
        setExtractionError(json.error ?? "Error al analizar el documento");
        setExtractionState("error");
        return;
      }

      const f = json.fields ?? {};
      if (f.titulo)           setTitulo(f.titulo);
      if (f.tipo && LEXBASE_TIPOS.includes(f.tipo as typeof LEXBASE_TIPOS[number])) setTipo(f.tipo);
      if (f.pais && PAISES.includes(f.pais))  setPais(f.pais);
      if (f.numero_oficial)   setNumeroOficial(f.numero_oficial);
      if (f.organo_emisor)    setOrganoEmisor(f.organo_emisor);
      if (f.fecha_publicacion) setFechaPub(f.fecha_publicacion);
      if (f.fecha_vigencia)   setFechaVig(f.fecha_vigencia);
      if (f.descripcion)      setDescripcion(f.descripcion);
      if (f.tags?.length)     setTags(f.tags);
      if (f.tiene_reformas)   setTieneReformas(f.tiene_reformas);

      setExtractionState("done");
    } catch {
      setExtractionError("Error de conexión al analizar el documento");
      setExtractionState("error");
    }
  }

  // ── Tags ────────────────────────────────────────────────────────────────────

  function addTag() {
    const val = tagInput.trim();
    if (val && !tags.includes(val)) setTags([...tags, val]);
    setTagInput("");
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFile) return;

    const fd = new FormData();
    fd.set("titulo",           titulo);
    fd.set("tipo",             tipo);
    fd.set("categoria_id",     categoriaId);
    fd.set("pais",             pais);
    fd.set("numero_oficial",   numeroOficial);
    fd.set("organo_emisor",    organoEmisor);
    fd.set("fecha_publicacion", fechaPub);
    fd.set("fecha_vigencia",   fechaVig);
    fd.set("descripcion",      descripcion);
    fd.set("tags",             tags.join(","));
    fd.set("tiene_reformas",   String(tieneReformas));
    fd.set("file",             selectedFile);

    startTransition(() => {
      subirDocumento(fd).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("NEXT_REDIRECT")) alert(`Error: ${msg}`);
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Paso 1: Subir archivo ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">
            Archivo del documento
            <span className="ml-1 text-destructive">*</span>
          </Label>
          {selectedFile && extractionState !== "extracting" && (
            <Button
              type="button"
              size="sm"
              variant={extractionState === "done" ? "outline" : "default"}
              onClick={handleAnalyze}
              className="gap-2"
            >
              {extractionState === "done" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Re-analizar con IA
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analizar con IA
                </>
              )}
            </Button>
          )}
        </div>

        {/* Dropzone */}
        <Card
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
            dragOver
              ? "border-primary bg-primary/5"
              : selectedFile
                ? "border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50/60"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
          )}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          {selectedFile ? (
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-emerald-600 shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-sm font-medium truncate max-w-xs">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                className="ml-2 rounded-full p-1 hover:bg-muted transition-colors shrink-0"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Arrastra el archivo aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOCX, DOC o TXT — hasta 20 MB
                </p>
              </div>
            </>
          )}
        </Card>

        {/* Estado de extracción */}
        {extractionState === "extracting" && (
          <div className="flex items-center gap-2.5 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            <span>Analizando el documento con IA, esto puede tardar unos segundos…</span>
          </div>
        )}
        {extractionState === "done" && (
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Metadatos extraídos automáticamente. Revisa y ajusta si es necesario.</span>
          </div>
        )}
        {extractionState === "error" && (
          <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{extractionError || "No se pudo extraer metadata. Completa los campos manualmente."}</span>
          </div>
        )}

        {/* Hint inicial */}
        {selectedFile && extractionState === "idle" && (
          <p className="text-xs text-muted-foreground">
            Haz clic en <strong>Analizar con IA</strong> para que el sistema complete la metadata automáticamente.
          </p>
        )}
      </div>

      {/* ── Paso 2: Metadata ─────────────────────────────────────────────────── */}
      {metadataVisible && (
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Información del documento
          </p>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Columna izquierda */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="titulo">
                  Título <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="titulo"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Código de Trabajo"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de documento</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEXBASE_TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {categorias.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <Select value={categoriaId} onValueChange={setCategoriaId}>
                    <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin categoría</SelectItem>
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="numero_oficial">Número oficial</Label>
                <Input
                  id="numero_oficial"
                  value={numeroOficial}
                  onChange={(e) => setNumeroOficial(e.target.value)}
                  placeholder="Ej. D.L. 15, D.O. 142"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="organo_emisor">Órgano emisor</Label>
                <Input
                  id="organo_emisor"
                  value={organoEmisor}
                  onChange={(e) => setOrganoEmisor(e.target.value)}
                  placeholder="Ej. Asamblea Legislativa"
                />
              </div>

              <div className="space-y-1.5">
                <Label>País</Label>
                <Select value={pais} onValueChange={setPais}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAISES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Columna derecha */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Fecha de publicación</Label>
                <DatePickerInput
                  name="fecha_publicacion"
                  value={fechaPub}
                  onChange={setFechaPub}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Fecha de vigencia</Label>
                <DatePickerInput
                  name="fecha_vigencia"
                  value={fechaVig}
                  onChange={setFechaVig}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Resumen del contenido…"
                  rows={4}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Agregar tag y presionar Enter"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => setTags(tags.filter((t) => t !== tag))}
                          className="ml-1 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Tiene reformas</Label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTieneReformas(!tieneReformas)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      tieneReformas ? "bg-red-500" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform",
                        tieneReformas ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                  <span className="text-sm text-muted-foreground">
                    {tieneReformas ? "Sí, tiene reformas" : "Sin reformas conocidas"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Acciones ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isPending || !selectedFile || !metadataVisible || !titulo.trim()}
        >
          {isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</>
          ) : (
            "Guardar documento"
          )}
        </Button>
      </div>
    </form>
  );
}
