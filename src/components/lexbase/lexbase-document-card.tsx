"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle2, AlertTriangle, Building2 } from "lucide-react";
import { LEXBASE_TIPO_COLORS, type LexbaseDocumento } from "@/types/lexbase";
import { cn } from "@/lib/utils";

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-SV", {
    year:  "numeric",
    month: "short",
    day:   "numeric",
  });
}

export function LexbaseDocumentCard({ doc }: { doc: LexbaseDocumento }) {
  const tipoColor = LEXBASE_TIPO_COLORS[doc.tipo] ?? "bg-gray-50 text-gray-700 border-gray-200";
  const visibleTags = doc.tags.slice(0, 3);

  return (
    <Link href={`/lexbase/${doc.id}`}>
      <Card className="group flex flex-col gap-3 p-4 transition hover:shadow-md hover:border-primary/40 cursor-pointer h-full">
        {/* Header row: tipo badge + reforma + indexed */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              tipoColor
            )}
          >
            {doc.tipo}
          </span>

          {doc.tiene_reformas && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-700">
              <AlertTriangle className="h-3 w-3" />
              REFORMADO
            </span>
          )}

          {doc.indexed_at && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Indexado
            </span>
          )}
        </div>

        {/* Title */}
        <div className="flex-1">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {doc.titulo}
          </h3>

          {doc.numero_oficial && (
            <p className="mt-1 text-xs text-muted-foreground font-mono">
              {doc.numero_oficial}
            </p>
          )}

          {doc.descripcion && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
              {doc.descripcion}
            </p>
          )}
        </div>

        {/* Meta: organo + fecha */}
        <div className="flex flex-col gap-1">
          {doc.organo_emisor && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{doc.organo_emisor}</span>
            </div>
          )}

          {doc.fecha_publicacion && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{formatDate(doc.fecha_publicacion)}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {doc.tags.length > 3 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                +{doc.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Category */}
        {doc.categoria && (
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: doc.categoria.color }}
            />
            <span className="text-xs text-muted-foreground truncate">
              {doc.categoria.nombre}
            </span>
          </div>
        )}
      </Card>
    </Link>
  );
}
