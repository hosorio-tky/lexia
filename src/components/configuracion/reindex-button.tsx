"use client";

import { useState } from "react";
import { Database, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reindexarDocumentos } from "@/app/actions/configuracion";

export function ReindexButton() {
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "done"; total: number; indexed: number; errors: string[] }
    | { status: "error"; message: string }
  >({ status: "idle" });

  async function handleClick() {
    setState({ status: "loading" });
    try {
      const result = await reindexarDocumentos();
      setState({ status: "done", ...result });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Database className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">Índice de documentos (RAG)</p>
          <p className="text-xs text-muted-foreground">
            Procesa los PDFs y DOCXs adjuntos para que Lexia AI pueda consultarlos.
          </p>
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={state.status === "loading"}
      >
        {state.status === "loading" ? (
          <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Indexando…</>
        ) : (
          <><Database className="mr-2 h-3.5 w-3.5" />Re-indexar documentos</>
        )}
      </Button>

      {state.status === "done" && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {state.total === 0
                ? "Todos los documentos ya estaban indexados."
                : `${state.indexed} de ${state.total} documento${state.total !== 1 ? "s" : ""} indexado${state.indexed !== 1 ? "s" : ""} correctamente.`}
            </span>
          </div>
          {state.errors.length > 0 && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 space-y-1">
              <p className="font-semibold">Detalles de errores:</p>
              {state.errors.map((err, i) => (
                <p key={i} className="font-mono break-all">{err}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {state.status === "error" && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}
    </div>
  );
}
