"use client";

import { useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { RichTextView } from "@/components/shared/rich-text-editor";
import type { ContratoVersion } from "@/types/contratos";

export function ContratoVersionHistory({ versiones }: { versiones: ContratoVersion[] }) {
  const [viewing, setViewing] = useState<ContratoVersion | null>(null);

  if (versiones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2 italic">
        Aún no hay versiones guardadas. Las versiones se crean automáticamente al editar el contenido del contrato.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {versiones.map((v) => (
        <div
          key={v.id}
          className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              Versión {v.version_num}
              {v.creado_por_nombre && (
                <span className="font-normal text-muted-foreground"> — {v.creado_por_nombre}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(parseISO(v.created_at), { addSuffix: true, locale: es })}
            </p>
          </div>
          {v.contenido_html && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1"
              onClick={() => setViewing(v)}
            >
              <Eye className="h-3.5 w-3.5" />
              Ver
            </Button>
          )}
        </div>
      ))}

      {/* Dialog visor de versión */}
      <Dialog open={!!viewing} onOpenChange={(open) => { if (!open) setViewing(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Versión {viewing?.version_num}
              {viewing?.creado_por_nombre && ` — ${viewing.creado_por_nombre}`}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 rounded-lg border bg-muted/10 p-4">
            {viewing?.contenido_html ? (
              <RichTextView html={viewing.contenido_html} />
            ) : (
              <p className="text-sm text-muted-foreground italic">Sin contenido HTML en esta versión.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
