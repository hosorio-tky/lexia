"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Download,
  Edit,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reindexarDocumento } from "@/app/actions/lexbase";
import { LEXBASE_TIPO_COLORS, type LexbaseDocumento } from "@/types/lexbase";
import { cn } from "@/lib/utils";

interface LexbaseViewerProps {
  documento: LexbaseDocumento;
  fileUrl?: string;
}

const PDF_MIMES = new Set([
  "application/pdf",
]);

export function LexbaseViewer({ documento, fileUrl }: LexbaseViewerProps) {
  const [isPending, startTransition]      = useTransition();
  const [reindexResult, setReindexResult] = useState<string | null>(null);

  const tipoColor =
    LEXBASE_TIPO_COLORS[documento.tipo] ?? "bg-gray-50 text-gray-700 border-gray-200";

  const isPdf = !documento.tipo_mime || PDF_MIMES.has(documento.tipo_mime);

  const downloadUrl = fileUrl
    ? (fileUrl.includes("?") ? `${fileUrl}&download=1` : `${fileUrl}?download=1`)
    : undefined;

  function handleReindex() {
    setReindexResult(null);
    startTransition(async () => {
      try {
        const result = await reindexarDocumento(documento.id);
        if (result?.chunks !== undefined) {
          setReindexResult(`Indexado: ${result.chunks} fragmentos`);
        } else if (result?.skipped) {
          setReindexResult(`Omitido: ${result.skipped}`);
        }
      } catch (err) {
        setReindexResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0",
              tipoColor
            )}
          >
            {documento.tipo}
          </span>

          <h1 className="text-lg font-bold leading-tight">{documento.titulo}</h1>

          {documento.numero_oficial && (
            <span className="font-mono text-xs text-muted-foreground shrink-0">
              {documento.numero_oficial}
            </span>
          )}

          {documento.tiene_reformas && (
            <div className="relative group shrink-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-700 cursor-help">
                <AlertTriangle className="h-3 w-3" />
                REFORMADO
              </span>
              {documento.reformas_descripcion && (
                <div className="absolute left-0 top-full z-10 mt-1 hidden w-64 rounded-lg border bg-popover p-3 text-xs shadow-lg group-hover:block">
                  {documento.reformas_descripcion}
                </div>
              )}
            </div>
          )}

          {documento.indexed_at ? (
            <Badge variant="outline" className="shrink-0 text-emerald-700 border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Indexado
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 text-muted-foreground">
              Sin indexar
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {downloadUrl && (
            <a href={downloadUrl} download>
              <Button variant="outline" size="sm">
                <Download className="mr-1.5 h-4 w-4" />
                Descargar
              </Button>
            </a>
          )}

          {documento.storage_path && (
            <Button variant="outline" size="sm" onClick={handleReindex} disabled={isPending}>
              <RefreshCw className={cn("mr-1.5 h-4 w-4", isPending && "animate-spin")} />
              {isPending ? "Indexando…" : "Re-indexar"}
            </Button>
          )}

          <Link href={`/lexbase/${documento.id}/editar`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-1.5 h-4 w-4" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      {reindexResult && (
        <div className="rounded-lg border bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
          {reindexResult}
        </div>
      )}

      {/* ── Document viewer ── */}
      {fileUrl ? (
        isPdf ? (
          /* PDF: render inline via proxy */
          <div className="rounded-xl border overflow-hidden" style={{ height: "82vh" }}>
            <iframe
              src={fileUrl}
              className="h-full w-full"
              title={documento.titulo}
            />
          </div>
        ) : (
          /* Word / other: can't render inline — offer download */
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-card" style={{ height: "40vh" }}>
            <FileDown className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Este tipo de archivo no se puede previsualizar en el navegador.
            </p>
            {downloadUrl && (
              <a href={downloadUrl} download>
                <Button>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar documento
                </Button>
              </a>
            )}
          </div>
        )
      ) : (
        /* No file attached */
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card" style={{ height: "40vh" }}>
          <p className="text-sm text-muted-foreground">Este documento no tiene archivo adjunto.</p>
          <Link href={`/lexbase/${documento.id}/editar`}>
            <Button variant="outline" size="sm">Agregar archivo</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
