"use client";

import { useState } from "react";
import { Database, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reindexarDocumentos, reindexarContratos } from "@/app/actions/configuracion";

type ReindexState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; total: number; indexed: number; errors: string[] }
  | { status: "error"; message: string };

function ReindexResult({ state }: { state: ReindexState }) {
  if (state.status === "done") {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {state.total === 0
              ? "Todo ya estaba indexado."
              : `${state.indexed} de ${state.total} indexado${state.total !== 1 ? "s" : ""} correctamente.`}
          </span>
        </div>
        {state.errors.length > 0 && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 space-y-1">
            <p className="font-semibold">Errores:</p>
            {state.errors.map((err, i) => (
              <p key={i} className="font-mono break-all">{err}</p>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{state.message}</span>
      </div>
    );
  }
  return null;
}

export function ReindexButton() {
  const [docState,      setDocState]      = useState<ReindexState>({ status: "idle" });
  const [contratoState, setContratoState] = useState<ReindexState>({ status: "idle" });

  async function handleDocumentos() {
    setDocState({ status: "loading" });
    try {
      const result = await reindexarDocumentos();
      setDocState({ status: "done", ...result });
    } catch (e) {
      setDocState({ status: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  async function handleContratos() {
    setContratoState({ status: "loading" });
    try {
      const result = await reindexarContratos();
      setContratoState({ status: "done", ...result });
    } catch (e) {
      setContratoState({ status: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Documentos generales ── */}
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
          onClick={handleDocumentos}
          disabled={docState.status === "loading"}
        >
          {docState.status === "loading" ? (
            <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Indexando…</>
          ) : (
            <><Database className="mr-2 h-3.5 w-3.5" />Re-indexar documentos</>
          )}
        </Button>
        <ReindexResult state={docState} />
      </div>

      {/* ── Contratos ── */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-500/10 text-indigo-600">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Índice de contratos (RAG)</p>
            <p className="text-xs text-muted-foreground">
              Vectoriza el contenido HTML y PDFs de contratos para búsqueda semántica.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleContratos}
          disabled={contratoState.status === "loading"}
        >
          {contratoState.status === "loading" ? (
            <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Indexando…</>
          ) : (
            <><FileText className="mr-2 h-3.5 w-3.5" />Re-indexar contratos</>
          )}
        </Button>
        <ReindexResult state={contratoState} />
      </div>
    </div>
  );
}
