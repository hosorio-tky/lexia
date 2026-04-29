"use client";

import { useRef, useState } from "react";
import { Upload, Download, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { importarPermisos } from "@/app/actions/importar-permisos";
import type { ImportResult } from "@/app/actions/importar-permisos";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void; // solo refresca la lista, no cierra el dialog
}

type Stage = "idle" | "selected" | "loading" | "result";

export function PermitImportDialog({ open, onClose, onSuccess }: Props) {
  const inputRef           = useRef<HTMLInputElement>(null);
  const [stage, setStage]  = useState<Stage>("idle");
  const [file, setFile]    = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);

  function reset() {
    setStage("idle");
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFile(f: File) {
    const valid = f.name.endsWith(".xlsx") || f.name.endsWith(".xls");
    if (!valid) return;
    setFile(f);
    setStage("selected");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleImport() {
    if (!file) return;
    setStage("loading");

    const fd = new FormData();
    fd.append("archivo", file);

    try {
      const res = await importarPermisos(fd);
      setResult(res);
      setStage("result");
      if (res.exitosos > 0) onSuccess(); // refresca la lista en background, el dialog sigue abierto
    } catch {
      setResult({ total: 0, exitosos: 0, errores: [{ fila: 0, nombre: "", errores: ["Error inesperado al procesar el archivo."] }] });
      setStage("result");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Permisos desde Excel
          </DialogTitle>
          <DialogDescription>
            Descarga la plantilla, complétala y sube el archivo para importar permisos en lote.
          </DialogDescription>
        </DialogHeader>

        {/* ── Paso 0: Descargar plantilla ── */}
        <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Plantilla de importación</p>
            <p className="text-xs text-muted-foreground">Incluye columnas, instrucciones y valores válidos</p>
          </div>
          <a href="/api/permisos/plantilla" download>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" />
              Descargar
            </Button>
          </a>
        </div>

        {/* ── Zona de carga ── */}
        {stage !== "result" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => stage !== "loading" && inputRef.current?.click()}
            className={`
              relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition
              ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}
              ${stage === "loading" ? "cursor-default opacity-60" : ""}
            `}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />

            {stage === "loading" ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Procesando archivo…</p>
              </>
            ) : stage === "selected" ? (
              <>
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <p className="text-sm font-medium">{file?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : ""}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="absolute right-3 top-3 rounded-md p-1 hover:bg-muted"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Arrastra tu archivo aquí</p>
                <p className="text-xs text-muted-foreground">o haz clic para seleccionar · .xlsx</p>
              </>
            )}
          </div>
        )}

        {/* ── Resultado ── */}
        {stage === "result" && result && (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border bg-muted/30 p-3 text-center">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-xs text-muted-foreground">Total filas</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{result.exitosos}</p>
                <p className="text-xs text-emerald-600">Importados</p>
              </div>
              <div className={`rounded-xl border p-3 text-center ${result.errores.length > 0 ? "border-red-200 bg-red-50" : "border-border bg-muted/30"}`}>
                <p className={`text-2xl font-bold ${result.errores.length > 0 ? "text-red-700" : ""}`}>
                  {result.errores.length}
                </p>
                <p className={`text-xs ${result.errores.length > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  Con error
                </p>
              </div>
            </div>

            {/* Mensaje principal */}
            {result.total === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No se encontraron datos en el archivo. Asegúrate de agregar filas debajo de la fila de ejemplo.
              </div>
            ) : result.errores.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Todos los registros fueron importados correctamente.
              </div>
            ) : result.exitosos === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No se importó ningún registro. Revisa los errores abajo.
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Se importaron {result.exitosos} de {result.total} registros. Corrige los errores y vuelve a importar solo las filas con problema.
              </div>
            )}

            {/* Detalle de errores */}
            {result.errores.length > 0 && (
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Detalle de errores
                </p>
                {result.errores.map((e) => (
                  <div key={e.fila} className="rounded-lg border border-red-100 bg-red-50/50 p-3">
                    <p className="text-xs font-medium text-red-800">
                      Fila {e.fila}{e.nombre ? ` — ${e.nombre}` : ""}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {e.errores.map((msg, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-red-700">
                          <span className="mt-0.5 shrink-0">•</span>
                          {msg}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Acciones ── */}
        <div className="flex justify-end gap-2 pt-1">
          {stage === "result" ? (
            <>
              {result && result.errores.length > 0 && (
                <Button variant="outline" onClick={reset}>
                  Importar otro archivo
                </Button>
              )}
              <Button onClick={handleClose}>
                {result?.exitosos ? "Cerrar" : "Cancelar"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={stage === "loading"}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={stage !== "selected" || !file}
              >
                {stage === "loading" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando…</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" />Importar</>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
