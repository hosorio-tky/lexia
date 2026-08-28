"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LexbaseStatCards } from "./lexbase-stat-cards";
import { LexbaseFiltersBar } from "./lexbase-filters";
import { LexbaseDocumentCard } from "./lexbase-document-card";
import type { LexbaseDocumento, LexbaseCategoria, LexbaseFilters, LexbaseStats, LexbaseTipo } from "@/types/lexbase";

export function LexbaseListClient({
  docs,
  categorias,
  stats,
  paises,
  allTags,
  total,
  page,
  pageSize,
  userRol = "usuario",
}: {
  docs:       LexbaseDocumento[];
  categorias: LexbaseCategoria[];
  stats:      LexbaseStats;
  paises:     string[];
  allTags:    string[];
  total:      number;
  page:       number;
  pageSize:   number;
  userRol?:   string;
}) {
  const canCreate = userRol !== "solo_lectura";
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  // View mode stays as local UI state (doesn't affect server fetch)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Debounced search
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");

  const navigate = useCallback((overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== undefined) params.set(k, v); else params.delete(k);
    }
    if (!("page" in overrides)) params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }, [router, searchParams, pathname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams.get("search") ?? "";
      if (searchInput !== current) navigate({ search: searchInput || undefined });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive filter state from URL
  const tieneReformasUrl = searchParams.get("reformas");
  const urlFilters: LexbaseFilters = {
    search:         searchInput,
    tipo:           (searchParams.get("tipo") || "") as LexbaseTipo | "",
    categoria_id:   searchParams.get("cat")  || "",
    pais:           searchParams.get("pais") || "",
    tiene_reformas: tieneReformasUrl === "true" ? true : tieneReformasUrl === "false" ? false : null,
    tag:            searchParams.get("tag")  || "",
  };

  function handleFiltersChange(newFilters: LexbaseFilters) {
    if (newFilters.search !== urlFilters.search) {
      setSearchInput(newFilters.search ?? "");
      return;
    }
    navigate({
      tipo:     newFilters.tipo         || undefined,
      cat:      newFilters.categoria_id || undefined,
      pais:     newFilters.pais         || undefined,
      tag:      newFilters.tag          || undefined,
      reformas: newFilters.tiene_reformas === null ? undefined : String(newFilters.tiene_reformas),
      search:   searchParams.get("search") || undefined,
    });
  }

  const hasFilters = !!(
    searchParams.get("search") || searchParams.get("tipo") || searchParams.get("cat") ||
    searchParams.get("pais")   || searchParams.get("reformas") || searchParams.get("tag")
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <LexbaseStatCards stats={stats} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LexbaseFiltersBar
          filters={urlFilters}
          onFiltersChange={handleFiltersChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          categorias={categorias}
          paises={paises}
          tags={allTags}
        />
        {canCreate && (
          <Link href="/lexbase/nuevo">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Documento
            </Button>
          </Link>
        )}
      </div>

      {/* Contador */}
      {total > 0 && (
        <p className="text-sm text-muted-foreground">
          {hasFilters
            ? `${total} ${total === 1 ? "documento" : "documentos"} encontrados`
            : pageSize < total
              ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} de ${total} documentos`
              : null}
        </p>
      )}

      {/* Grid / List */}
      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground text-sm">No se encontraron documentos</p>
          {canCreate && (
            <Link href="/lexbase/nuevo" className="mt-3">
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Agregar primer documento
              </Button>
            </Link>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {docs.map((doc) => (
            <LexbaseDocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {docs.map((doc) => (
            <LexbaseDocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => navigate({ page: String(page - 1) })}
          >
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => navigate({ page: String(page + 1) })}
          >
            Siguiente
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
