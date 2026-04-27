"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Send, Bot, User, Loader2, Sparkles, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  open: boolean;
  onClose: () => void;
}

interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
}

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ChatSidebar({ open, onClose }: ChatSidebarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const abortRef       = useRef<AbortController | null>(null);

  const [expanded,  setExpanded]  = useState(false);
  const [input,     setInput]     = useState("");
  const [messages,  setMessages]  = useState<Msg[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("lexia_chat_history");
      if (!saved) return [];
      const parsed = JSON.parse(saved) as Msg[];
      // Re-asignar IDs únicos para evitar colisiones con mensajes viejos
      const seen = new Set<string>();
      return parsed.map((m) => {
        if (!m.id || seen.has(m.id)) {
          return { ...m, id: uid() };
        }
        seen.add(m.id);
        return m;
      });
    } catch { return []; }
  });
  const [streaming, setStreaming] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // Persistir historial en localStorage
  useEffect(() => {
    if (messages.length === 0) {
      localStorage.removeItem("lexia_chat_history");
    } else {
      try { localStorage.setItem("lexia_chat_history", JSON.stringify(messages)); }
      catch { /* quota exceeded */ }
    }
  }, [messages]);

  // Focus when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
    window.addEventListener("keyup", handler);
    return () => window.removeEventListener("keyup", handler);
  }, [open, onClose]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    setError(null);

    const userMsg: Msg = { id: uid(), role: "user", text: text.trim() };
    const asstId = uid();
    const asstMsg: Msg = { id: asstId, role: "assistant", text: "" };

    setMessages(prev => [...prev, userMsg, asstMsg]);
    setStreaming(true);

    const payload = [
      ...messages.map(m => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: text.trim() },
    ];

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload }),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
      if (!res.body) throw new Error("Sin respuesta del servidor");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buf     = "";

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
            const parsed = JSON.parse(raw);
            const chunk: string =
              parsed.textDelta ??
              parsed.choices?.[0]?.delta?.content ??
              "";
            if (chunk) {
              setMessages(prev =>
                prev.map(m => m.id === asstId ? { ...m, text: m.text + chunk } : m)
              );
            }
          } catch { /* non-JSON line */ }
        }
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

  return (
    <>
      {/* Overlay */}
      <div
        style={open ? {} : { display: "none" }}
        className="fixed inset-0 z-[60] bg-black/30"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          ...(open ? {} : { display: "none" }),
          width: expanded
            ? "calc(100vw - 240px)"
            : undefined,
        }}
        className={cn(
          "fixed right-0 top-16 z-[70] flex h-[calc(100vh-4rem)] flex-col border-l bg-background shadow-2xl transition-[width] duration-200",
          expanded ? "w-full" : "w-full md:w-[420px]"
        )}
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
              className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded
                ? <Minimize2 className="h-3.5 w-3.5" />
                : <Maximize2 className="h-3.5 w-3.5" />}
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
                <p className="mt-1 text-xs text-muted-foreground max-w-[280px]">
                  Pregúntame sobre permisos, vencimientos, documentos o cualquier tema de cumplimiento legal.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full mt-2">
                {[
                  "¿Qué permisos vencen este mes?",
                  "¿Cuáles son las tareas pendientes?",
                  "Resume los documentos más recientes",
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

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex gap-2.5", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              <div className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                msg.role === "user"
                  ? "rounded-tr-sm bg-primary text-primary-foreground"
                  : "rounded-tl-sm bg-muted"
              )}>
                {msg.role === "assistant" && !msg.text
                  ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  : msg.text}
              </div>
            </div>
          ))}

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
