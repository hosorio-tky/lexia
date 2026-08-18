"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardCheck, Clock, FileText, Library, Loader2, Search, X,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  buscarGlobal, obtenerRecientes,
  type SearchResultItem, type RecentItem, type ModuloSearch,
} from "@/app/actions/busqueda";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// ─── Config ──────────────────────────────────────────────────────
const MODULO_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  badgeClass: string;
}> = {
  permisos:  { label: "Permisos",   icon: FileText,      color: "text-blue-600",   badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  contratos: { label: "Contratos",  icon: FileText,      color: "text-violet-600", badgeClass: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  tareas:    { label: "Tareas",     icon: ClipboardCheck, color: "text-amber-600",  badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  lexbase:   { label: "Lexbase",    icon: Library,        color: "text-teal-600",   badgeClass: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300" },
};

const FILTROS: { key: ModuloSearch | "todo"; label: string }[] = [
  { key: "todo",      label: "Todo" },
  { key: "permisos",  label: "Permisos" },
  { key: "contratos", label: "Contratos" },
  { key: "tareas",    label: "Tareas" },
  { key: "lexbase",   label: "Lexbase" },
];

function formatFechaRel(iso?: string) {
  if (!iso) return null;
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
  } catch { return null; }
}

function formatFecha(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("es-SV", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return null; }
}

// ─── Preview Panel ────────────────────────────────────────────────
function PreviewPanel({ item }: { item: SearchResultItem }) {
  const cfg = MODULO_CONFIG[item.modulo];
  const Icon = cfg.icon;
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", cfg.badgeClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {cfg.label}
        </span>
      </div>

      <div>
        <p className="text-sm font-semibold leading-snug">{item.titulo}</p>
        {item.meta && (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.meta}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {item.estado && (
          <div className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 text-muted-foreground">Estado</span>
            <span className="font-medium">{item.estado}</span>
          </div>
        )}
        {item.tipo && (
          <div className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 text-muted-foreground">Tipo</span>
            <span className="font-medium">{item.tipo}</span>
          </div>
        )}
        {item.responsable && (
          <div className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 text-muted-foreground">Responsable</span>
            <span className="font-medium">{item.responsable}</span>
          </div>
        )}
        {item.contraparte && (
          <div className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 text-muted-foreground">Contraparte</span>
            <span className="font-medium">{item.contraparte}</span>
          </div>
        )}
        {item.fecha && (
          <div className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 text-muted-foreground">
              {item.modulo === "contratos" ? "Fecha fin" : "Vencimiento"}
            </span>
            <span className="font-medium">{formatFecha(item.fecha)}</span>
          </div>
        )}
      </div>

      {item.descripcion && (
        <p className="line-clamp-4 text-xs text-muted-foreground border-t pt-3">
          {item.descripcion}
        </p>
      )}

      <Link
        href={item.href}
        className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        Ver detalles →
      </Link>
    </div>
  );
}

// ─── Result Row ───────────────────────────────────────────────────
function ResultRow({
  item, isActive, onHover, onClick,
}: {
  item: SearchResultItem;
  isActive: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  const cfg = MODULO_CONFIG[item.modulo];
  const Icon = cfg.icon;
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition",
        isActive ? "bg-muted" : "hover:bg-muted/60"
      )}
      onMouseEnter={onHover}
      onClick={onClick}
    >
      <div className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md", cfg.badgeClass)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.titulo}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className={cn("text-[10px] font-semibold uppercase tracking-wide", cfg.color)}>
            {cfg.label}
          </span>
          {item.meta && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-[11px] text-muted-foreground">{item.meta}</span>
            </>
          )}
          {item.estado && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-[11px] text-muted-foreground">{item.estado}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Recent Row ───────────────────────────────────────────────────
function RecentRow({
  item, isActive, onHover, onClick,
}: {
  item: RecentItem;
  isActive: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  const cfg = MODULO_CONFIG[item.modulo] ?? MODULO_CONFIG.permisos;
  const Icon = cfg.icon;
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
        isActive ? "bg-muted" : "hover:bg-muted/60"
      )}
      onMouseEnter={onHover}
      onClick={onClick}
    >
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{item.recurso_desc}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className={cn("text-[10px] font-semibold uppercase tracking-wide", cfg.color)}>
            {cfg.label}
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span className="text-[11px] text-muted-foreground">
            {formatFechaRel(item.created_at)}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Dialog Content ───────────────────────────────────────────────
function SearchDialogContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query,      setQuery]      = useState("");
  const [modulo,     setModulo]     = useState<ModuloSearch | "todo">("todo");
  const [results,    setResults]    = useState<SearchResultItem[]>([]);
  const [recientes,  setRecientes]  = useState<RecentItem[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [activeIdx,  setActiveIdx]  = useState(-1);
  const [preview,    setPreview]    = useState<SearchResultItem | null>(null);

  // Load recent on mount
  useEffect(() => {
    obtenerRecientes().then(setRecientes).catch(() => {});
  }, []);

  // Focus input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      buscarGlobal(query, modulo)
        .then((r) => { setResults(r); setActiveIdx(-1); setPreview(null); })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, modulo]);

  // All navigable rows: when searching = results; when blank = recientes (as SearchResultItem)
  const isSearching = query.trim().length >= 2;

  const navigate = useCallback((href: string) => {
    onClose();
    router.push(href);
  }, [router, onClose]);

  // Keyboard nav
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const total = isSearching ? results.length : recientes.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      const href = isSearching
        ? results[activeIdx]?.href
        : recientes[activeIdx]?.href;
      if (href) navigate(href);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl" onKeyDown={handleKeyDown}>
      {/* Search input */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en Lexia…"
          className="h-9 flex-1 border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
          ESC
        </kbd>
      </div>

      {/* Module filter chips */}
      <div className="flex items-center gap-1.5 border-b px-4 py-2">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setModulo(f.key)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              modulo === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Body: list + preview */}
      <div className="flex min-h-0 flex-1">
        {/* Results list */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {!isSearching ? (
            /* Recientes */
            recientes.length > 0 ? (
              <div className="p-2">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recientes
                </p>
                {recientes.map((item, i) => (
                  <RecentRow
                    key={item.recurso_id}
                    item={item}
                    isActive={activeIdx === i}
                    onHover={() => { setActiveIdx(i); setPreview(null); }}
                    onClick={() => navigate(item.href)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
                <Search className="h-8 w-8 opacity-30" />
                <p>Empieza a escribir para buscar</p>
              </div>
            )
          ) : results.length === 0 && !loading ? (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
              <Search className="h-8 w-8 opacity-30" />
              <p>Sin resultados para &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            /* Search results grouped by modulo */
            (() => {
              const grouped = results.reduce((acc, item) => {
                if (!acc[item.modulo]) acc[item.modulo] = [];
                acc[item.modulo].push(item);
                return acc;
              }, {} as Record<string, SearchResultItem[]>);

              let globalIdx = 0;
              return (
                <div className="p-2">
                  {Object.entries(grouped).map(([mod, items]) => {
                    const cfg = MODULO_CONFIG[mod];
                    return (
                      <div key={mod} className="mb-1">
                        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {cfg?.label ?? mod}
                        </p>
                        {items.map((item) => {
                          const idx = globalIdx++;
                          return (
                            <ResultRow
                              key={item.id}
                              item={item}
                              isActive={activeIdx === idx}
                              onHover={() => { setActiveIdx(idx); setPreview(item); }}
                              onClick={() => navigate(item.href)}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>

        {/* Preview panel — only when hovering a search result */}
        {preview && (
          <div className="hidden w-64 shrink-0 flex-col border-l bg-muted/20 md:flex">
            <PreviewPanel item={preview} />
          </div>
        )}
      </div>

      {/* Footer hints */}
      <div className="flex items-center gap-4 border-t px-4 py-2">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[9px]">↑↓</kbd>
          navegar
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[9px]">↵</kbd>
          abrir
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[9px]">ESC</kbd>
          cerrar
        </span>
      </div>
    </div>
  );
}

// ─── Public trigger ───────────────────────────────────────────────
export function SearchDialog() {
  const [open, setOpen] = useState(false);

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      {/* Trigger — mimics a search input */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-full items-center rounded-lg border bg-muted/50 px-3 text-sm text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Search className="mr-2 h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Buscar en Lexia…</span>
        <kbd className="hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[80vh] gap-0 overflow-hidden p-0 sm:max-w-2xl"
          aria-describedby={undefined}
        >
          {open && <SearchDialogContent onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
