"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardCheck, Clock, FileText, Library, Loader2, Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
  permisos:  { label: "Permisos",  icon: FileText,       color: "text-blue-600",   badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  contratos: { label: "Contratos", icon: FileText,       color: "text-violet-600", badgeClass: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  tareas:    { label: "Tareas",    icon: ClipboardCheck, color: "text-amber-600",  badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  lexbase:   { label: "Lexbase",   icon: Library,        color: "text-teal-600",   badgeClass: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300" },
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
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es }); }
  catch { return null; }
}

function formatFecha(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("es-SV", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return null; }
}

// ─── Preview Panel ────────────────────────────────────────────────
function PreviewPanel({ item }: { item: SearchResultItem }) {
  const cfg = MODULO_CONFIG[item.modulo];
  const Icon = cfg.icon;
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md", cfg.badgeClass)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
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
        <p className="line-clamp-4 border-t pt-3 text-xs text-muted-foreground">
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
        isActive ? "bg-muted" : "hover:bg-muted/60",
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
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
        isActive ? "bg-muted" : "hover:bg-muted/60",
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

// ─── Main export ─────────────────────────────────────────────────
export function SearchDialog() {
  const router      = useRouter();
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  const [open,      setOpen]      = useState(false);
  const [query,     setQuery]     = useState("");
  const [modulo,    setModulo]    = useState<ModuloSearch | "todo">("todo");
  const [results,   setResults]   = useState<SearchResultItem[]>([]);
  const [recientes, setRecientes] = useState<RecentItem[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [preview,   setPreview]   = useState<SearchResultItem | null>(null);

  // Load recientes once
  useEffect(() => {
    obtenerRecientes().then(setRecientes).catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Cmd+K global shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 10);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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

  const isSearching = query.trim().length >= 2;

  const navigate = useCallback((href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  }, [router]);

  function handleKeyDown(e: React.KeyboardEvent) {
    const total = isSearching ? results.length : recientes.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      const href = isSearching ? results[activeIdx]?.href : recientes[activeIdx]?.href;
      if (href) navigate(href);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && (recientes.length > 0 || isSearching);

  return (
    <div ref={wrapperRef} className="relative w-full" onKeyDown={handleKeyDown}>
      {/* Input trigger */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar en Lexia…"
          className="h-10 w-full pl-9 pr-16"
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            : <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
          }
        </div>
      </div>

      {/* Dropdown panel */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 flex overflow-hidden rounded-xl border bg-popover shadow-xl">
          {/* Left: filter + list */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Module filter chips */}
            <div className="flex items-center gap-1.5 border-b px-3 py-2">
              {FILTROS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // prevent input blur
                  onClick={() => setModulo(f.key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    modulo === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Results */}
            <div className="max-h-[420px] overflow-y-auto p-2">
              {!isSearching ? (
                recientes.length > 0 ? (
                  <>
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
                  </>
                ) : null
              ) : results.length === 0 && !loading ? (
                <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Search className="h-7 w-7 opacity-30" />
                  <p>Sin resultados para &ldquo;{query}&rdquo;</p>
                </div>
              ) : (
                (() => {
                  const grouped = results.reduce((acc, item) => {
                    if (!acc[item.modulo]) acc[item.modulo] = [];
                    acc[item.modulo].push(item);
                    return acc;
                  }, {} as Record<string, SearchResultItem[]>);

                  let globalIdx = 0;
                  return Object.entries(grouped).map(([mod, items]) => {
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
                  });
                })()
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

          {/* Right: preview panel */}
          {preview && (
            <div className="hidden w-60 shrink-0 flex-col border-l bg-muted/20 md:flex">
              <PreviewPanel item={preview} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
