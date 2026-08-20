"use client";

import { useEffect, useRef, useState, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  X, Send, Bot, User, Loader2, Sparkles, RotateCcw,
  Maximize2, Minimize2, CheckCircle2, XCircle,
  FileText, ListTodo, ExternalLink, AlertCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  crearPermisoDesdeChat,
  crearTareasDesdeChat,
  type PropuestaPermiso,
  type PropuestaTareas,
} from "@/app/actions/agente";

interface ChatSidebarProps {
  open: boolean;
  onClose: () => void;
}

// ─── Tipos de mensaje ─────────────────────────────────────────────────────────

type ToolCallStatus = "pending" | "confirmed" | "cancelled" | "error";

interface ToolCallPermiso {
  tool: "proponer_permiso";
  args: PropuestaPermiso;
  status: ToolCallStatus;
  result?: { permisoId?: string; error?: string };
}
interface ToolCallTareas {
  tool: "proponer_tareas";
  args: PropuestaTareas;
  status: ToolCallStatus;
  result?: { count?: number; permisoId?: string; error?: string };
}
type ToolCall = ToolCallPermiso | ToolCallTareas;

interface Msg {
  id: string;
  role: "user" | "assistant" | "tool-call";
  text: string;
  toolCall?: ToolCall;
}

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ─── Tarjeta: propuesta de permiso ───────────────────────────────────────────

function CardPermiso({
  tc,
  onConfirm,
  onCancel,
}: {
  tc: ToolCallPermiso;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { args, status, result } = tc;
  const isPending = status === "pending";

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden text-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b bg-primary/5 px-4 py-3">
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <span className="font-semibold text-primary">Propuesta de permiso</span>
      </div>

      {/* Campos */}
      <div className="divide-y px-4">
        <Campo label="Nombre"             value={args.nombre} />
        {args.tipo_nombre        && <Campo label="Tipo"                value={args.tipo_nombre} />}
        {args.entidad_reguladora && <Campo label="Entidad reguladora"  value={args.entidad_reguladora} />}
        {args.descripcion        && <Campo label="Descripción"         value={args.descripcion} />}
        {args.fecha_vencimiento  && <Campo label="Fecha vencimiento"   value={args.fecha_vencimiento} />}
        {args.base_legal         && <Campo label="Base legal"          value={args.base_legal} />}
        {args.riesgo_incumplimiento && <Campo label="Riesgo"           value={args.riesgo_incumplimiento} />}
      </div>

      {/* Acciones / resultado */}
      <div className="px-4 py-3 bg-muted/30">
        {isPending && (
          <div className="flex gap-2">
            <Button size="sm" onClick={onConfirm} className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirmar y crear
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} className="gap-1.5 text-muted-foreground">
              <XCircle className="h-3.5 w-3.5" />
              Cancelar
            </Button>
          </div>
        )}
        {status === "confirmed" && result?.permisoId && (
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium">Permiso creado.</span>
            <Link
              href={`/permisos/${result.permisoId}`}
              className="flex items-center gap-1 text-xs font-semibold underline hover:no-underline"
            >
              Ver permiso <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
        {status === "cancelled" && (
          <span className="text-xs text-muted-foreground">Cancelado.</span>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-xs">{result?.error ?? "Error al crear el permiso."}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tarjeta: propuesta de tareas ────────────────────────────────────────────

function CardTareas({
  tc,
  onConfirm,
  onCancel,
}: {
  tc: ToolCallTareas;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { args, status, result } = tc;
  const isPending = status === "pending";

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden text-sm">
      <div className="flex items-center gap-2.5 border-b bg-primary/5 px-4 py-3">
        <ListTodo className="h-4 w-4 text-primary shrink-0" />
        <span className="font-semibold text-primary">
          {args.tareas.length} tarea{args.tareas.length !== 1 ? "s" : ""} propuesta{args.tareas.length !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-muted-foreground ml-auto truncate">
          {args.permiso_nombre}
        </span>
      </div>

      <ul className="divide-y">
        {args.tareas.map((t, i) => (
          <li key={i} className="px-4 py-2.5">
            <div className="flex items-start gap-2">
              <span className={cn(
                "mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase",
                t.prioridad === "urgente" ? "bg-red-100 text-red-700" :
                t.prioridad === "alta"    ? "bg-orange-100 text-orange-700" :
                t.prioridad === "media"   ? "bg-amber-100 text-amber-700" :
                                            "bg-slate-100 text-slate-600"
              )}>
                {t.prioridad}
              </span>
              <div className="min-w-0">
                <p className="font-medium leading-snug">{t.titulo}</p>
                {t.descripcion && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.descripcion}</p>}
                {t.fecha_limite && <p className="text-[11px] text-muted-foreground mt-0.5">Límite: {t.fecha_limite}</p>}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="px-4 py-3 bg-muted/30">
        {isPending && (
          <div className="flex gap-2">
            <Button size="sm" onClick={onConfirm} className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Crear tareas
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} className="gap-1.5 text-muted-foreground">
              <XCircle className="h-3.5 w-3.5" />
              Cancelar
            </Button>
          </div>
        )}
        {status === "confirmed" && (
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium">
              {result?.count ?? args.tareas.length} tarea{(result?.count ?? 1) !== 1 ? "s" : ""} creada{(result?.count ?? 1) !== 1 ? "s" : ""}.
            </span>
            {result?.permisoId && (
              <Link
                href={`/permisos/${result.permisoId}`}
                className="flex items-center gap-1 text-xs font-semibold underline hover:no-underline"
              >
                Ver permiso <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
        {status === "cancelled" && (
          <span className="text-xs text-muted-foreground">Cancelado.</span>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-xs">{result?.error ?? "Error al crear las tareas."}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helper: campo de detalle ─────────────────────────────────────────────────

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-2">
      <span className="w-36 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pt-0.5">
        {label}
      </span>
      <span className="text-sm leading-snug">{value}</span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ChatSidebar({ open, onClose }: ChatSidebarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const abortRef       = useRef<AbortController | null>(null);

  const [expanded,  setExpanded]  = useState(false);
  const [input,     setInput]     = useState("");
  const [messages,  setMessages]  = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Cargar historial desde localStorage (evita hydration mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lexia_chat_history");
      if (!saved) return;
      const parsed = JSON.parse(saved) as Msg[];
      const seen = new Set<string>();
      setMessages(parsed.map((m) => {
        if (!m.id || seen.has(m.id)) return { ...m, id: uid() };
        seen.add(m.id);
        return m;
      }));
    } catch { /* historial corrupto */ }
  }, []);

  // Persistir historial (sin guardar tool-calls pendientes — se resolverán si se recarga)
  useEffect(() => {
    if (messages.length === 0) {
      localStorage.removeItem("lexia_chat_history");
    } else {
      try {
        localStorage.setItem("lexia_chat_history", JSON.stringify(messages));
      } catch { /* quota exceeded */ }
    }
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
    window.addEventListener("keyup", handler);
    return () => window.removeEventListener("keyup", handler);
  }, [open, onClose]);

  // ── Confirmar / cancelar tool-calls ────────────────────────────────────────

  function updateToolCall(id: string, patch: Partial<ToolCall>) {
    setMessages(prev => prev.map(m =>
      m.id === id && m.toolCall ? { ...m, toolCall: { ...m.toolCall, ...patch } as ToolCall } : m
    ));
  }

  function handleConfirmPermiso(id: string, tc: ToolCallPermiso) {
    updateToolCall(id, { status: "confirmed" });
    startTransition(async () => {
      const res = await crearPermisoDesdeChat(tc.args);
      if (res.error) {
        updateToolCall(id, { status: "error", result: { error: res.error } });
      } else {
        updateToolCall(id, { status: "confirmed", result: { permisoId: res.permisoId } });
      }
    });
  }

  function handleConfirmTareas(id: string, tc: ToolCallTareas) {
    updateToolCall(id, { status: "confirmed" });
    startTransition(async () => {
      const res = await crearTareasDesdeChat(tc.args);
      if (res.error) {
        updateToolCall(id, { status: "error", result: { error: res.error } });
      } else {
        updateToolCall(id, { status: "confirmed", result: { count: res.count, permisoId: tc.args.permiso_id } });
      }
    });
  }

  // ── Enviar mensaje ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    setError(null);

    const userMsg: Msg = { id: uid(), role: "user", text: text.trim() };
    const asstId = uid();
    const asstMsg: Msg = { id: asstId, role: "assistant", text: "" };

    setMessages(prev => [...prev, userMsg, asstMsg]);
    setStreaming(true);

    const payload = [
      ...messages
        .filter(m => m.role !== "tool-call")   // las tarjetas de confirmación no son parte del hilo
        .map(m => ({ role: m.role as "user" | "assistant", content: m.text })),
      { role: "user" as const, content: text.trim() },
    ];

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Acumulamos tool-call IDs para insertarlos después del mensaje del asistente
    const pendingToolCalls: Msg[] = [];

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: payload }),
        signal:  ctrl.signal,
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
      if (!res.body) throw new Error("Sin respuesta del servidor");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (raw === "[DONE]") continue;

          try {
            const parsed = JSON.parse(raw) as {
              type: string;
              textDelta?: string;
              toolName?: string;
              toolArgs?: Record<string, unknown>;
            };

            if (parsed.type === "text-delta" && parsed.textDelta) {
              setMessages(prev =>
                prev.map(m => m.id === asstId ? { ...m, text: m.text + parsed.textDelta } : m)
              );
            } else if (parsed.type === "tool-call" && parsed.toolName && parsed.toolArgs) {
              const tcMsg: Msg = {
                id:   uid(),
                role: "tool-call",
                text: "",
                toolCall: {
                  tool:   parsed.toolName as "proponer_permiso" | "proponer_tareas",
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  args:   parsed.toolArgs as any,
                  status: "pending",
                } as ToolCall,
              };
              pendingToolCalls.push(tcMsg);
            }
          } catch { /* non-JSON line */ }
        }
      }

      // Insertar tarjetas de confirmación después del mensaje del asistente
      if (pendingToolCalls.length > 0) {
        setMessages(prev => {
          const idx = prev.findIndex(m => m.id === asstId);
          if (idx === -1) return [...prev, ...pendingToolCalls];
          return [
            ...prev.slice(0, idx + 1),
            ...pendingToolCalls,
            ...prev.slice(idx + 1),
          ];
        });
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : String(err));
      setMessages(prev => prev.filter(m => m.id !== asstId));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, streaming]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || streaming) return;
    const text = input.trim();
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    await sendMessage(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        style={open ? {} : { display: "none" }}
        className="fixed inset-0 z-[60] bg-black/30"
        onClick={onClose}
      />

      <div
        style={{
          ...(open ? {} : { display: "none" }),
          width: expanded ? "min(calc(100vw - 240px), calc(100vw - 16px))" : "480px",
          maxWidth: expanded ? undefined : "calc(100vw - 16px)",
        }}
        className="fixed right-0 top-16 z-[70] flex h-[calc(100vh-4rem)] flex-col border-l bg-background shadow-2xl transition-[width] duration-200"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Lexia AI</p>
            <p className="text-xs text-muted-foreground">Asistente de cumplimiento legal</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                title="Nueva conversación"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                onClick={() => { setMessages([]); setError(null); localStorage.removeItem("lexia_chat_history"); }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              title={expanded ? "Reducir panel" : "Ampliar panel"}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Cerrar (Esc)"
              className="flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span>Cerrar</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && open && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <p className="font-semibold text-sm">¿En qué te puedo ayudar?</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-[320px]">
                  Pregúntame sobre permisos, vencimientos o documentos. También puedo crear permisos y tareas por ti.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full mt-2">
                {[
                  "¿Qué permisos vencen este mes?",
                  "Crea un permiso ambiental para la bodega de Soyapango",
                  "¿Cuáles son los requerimientos de la Ley del Medio Ambiente?",
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}
                    className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            // ── Tarjeta de herramienta ──
            if (msg.role === "tool-call" && msg.toolCall) {
              const tc = msg.toolCall;
              return (
                <div key={msg.id} className="px-1">
                  {tc.tool === "proponer_permiso" && (
                    <CardPermiso
                      tc={tc as ToolCallPermiso}
                      onConfirm={() => handleConfirmPermiso(msg.id, tc as ToolCallPermiso)}
                      onCancel={() => updateToolCall(msg.id, { status: "cancelled" })}
                    />
                  )}
                  {tc.tool === "proponer_tareas" && (
                    <CardTareas
                      tc={tc as ToolCallTareas}
                      onConfirm={() => handleConfirmTareas(msg.id, tc as ToolCallTareas)}
                      onCancel={() => updateToolCall(msg.id, { status: "cancelled" })}
                    />
                  )}
                </div>
              );
            }

            // ── Mensaje normal ──
            return (
              <div
                key={msg.id}
                className={cn("flex gap-2.5", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                <div className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                  msg.role === "user"
                    ? "rounded-tr-sm bg-primary text-primary-foreground whitespace-pre-wrap"
                    : "rounded-tl-sm bg-muted"
                )}>
                  {msg.role === "assistant" && !msg.text ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : msg.role === "assistant" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <p className="font-semibold text-sm mt-3 mb-1 first:mt-0">{children}</p>,
                        h2: ({ children }) => <p className="font-semibold text-sm mt-3 mb-1 first:mt-0">{children}</p>,
                        h3: ({ children }) => <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-3 mb-1 first:mt-0">{children}</p>,
                        p:  ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="my-1 space-y-0.5 pl-4 list-disc">{children}</ul>,
                        ol: ({ children }) => <ol className="my-1 space-y-0.5 pl-4 list-decimal">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        code: ({ children }) => <code className="text-xs bg-background/60 px-1 py-0.5 rounded font-mono">{children}</code>,
                        hr: () => <hr className="my-2 border-border" />,
                        table: ({ children }) => (
                          <div className="my-2 w-full overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-xs border-collapse">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
                        tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
                        tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
                        th: ({ children }) => (
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap border-b border-border">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            );
          })}

          {error && (
            <p className="text-xs text-destructive text-center px-4 py-2 bg-destructive/10 rounded-lg">
              {error}
            </p>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-3 shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta… (Enter para enviar)"
              rows={1}
              className="flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring max-h-32 overflow-y-auto"
              style={{ height: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 128) + "px";
              }}
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="shrink-0 grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Shift+Enter para nueva línea · Esc para cerrar
          </p>
        </div>
      </div>
    </>
  );
}
