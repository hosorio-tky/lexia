"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LexbaseStatCardsFromDocs } from "./lexbase-stat-cards";
import { LexbaseFiltersBar } from "./lexbase-filters";
import { LexbaseDocumentCard } from "./lexbase-document-card";
import type { LexbaseDocumento, LexbaseCategoria, LexbaseFilters } from "@/types/lexbase";

interface LexbaseListClientProps {
  initialDocs:       LexbaseDocumento[];
  initialCategorias: LexbaseCategoria[];
}

export function LexbaseListClient({
  initialDocs,
  initialCategorias,
}: LexbaseListClientProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filters, setFilters]   = useState<LexbaseFilters>({
    search:         "",
    tipo:           "",
    categoria_id:   "",
    pais:           "",
    tiene_reformas: null,
    tag:            "",
  });

  // Derived lists for filter dropdowns
  const paises = useMemo(() => {
    const set = new Set(initialDocs.map((d) => d.pais).filter(Boolean));
    return [...set].sort();
  }, [initialDocs]);

  const allTags = useMemo(() => {
    const set = new Set(initialDocs.flatMap((d) => d.tags));
    return [...set].sort();
  }, [initialDocs]);

  const filtered = useMemo(() => {
    return initialDocs.filter((doc) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !doc.titulo.toLowerCase().includes(q) &&
          !(doc.numero_oficial ?? "").toLowerCase().includes(q) &&
          !(doc.organo_emisor ?? "").toLowerCase().includes(q) &&
          !(doc.descripcion ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      if (filters.tipo && doc.tipo !== filters.tipo) return false;
      if (filters.categoria_id && doc.categoria_id !== filters.categoria_id) return false;
      if (filters.pais && doc.pais !== filters.pais) return false;
      if (filters.tiene_reformas !== null && doc.tiene_reformas !== filters.tiene_reformas)
        return false;
      if (filters.tag && !doc.tags.includes(filters.tag)) return false;
      return true;
    });
  }, [initialDocs, filters]);

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <LexbaseStatCardsFromDocs
        docs={initialDocs}
        categorias={initialCategorias.length}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LexbaseFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          categorias={initialCategorias}
          paises={paises}
          tags={allTags}
        />
        <Link href="/lexbase/nuevo">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Documento
          </Button>
        </Link>
      </div>

      {/* Results count */}
      {filters.search || filters.tipo || filters.categoria_id || filters.pais || filters.tiene_reformas !== null || filters.tag ? (
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "documento" : "documentos"} encontrados
        </p>
      ) : null}

      {/* Grid / List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground text-sm">No se encontraron documentos</p>
          <Link href="/lexbase/nuevo" className="mt-3">
            <Button size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Agregar primer documento
            </Button>
          </Link>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((doc) => (
            <LexbaseDocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((doc) => (
            <LexbaseDocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
