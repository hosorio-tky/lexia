"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, FileText, AlertCircle } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Card }     from "@/components/ui/card";
import { Badge }    from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deletePlantilla } from "@/app/actions/contrato-plantillas";
import type { ContratoPlantilla } from "@/lib/repositories/contrato-plantillas";

export function PlantillasClient({
  initialItems,
}: {
  initialItems: ContratoPlantilla[];
}) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deletePlantilla(id);
      if (result?.error) {
        setError(result.error);
      } else {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Plantillas de Contratos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Textos base con variables <code className="text-xs bg-muted px-1 py-0.5 rounded">{`{{VARIABLE}}`}</code> que la IA completa al crear un contrato.
          </p>
        </div>
        <Link href="/configuracion/plantillas/nueva">
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva plantilla
          </Button>
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Sin plantillas</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Crea la primera plantilla para usar la generación de contratos con IA.
            </p>
          </div>
          <Link href="/configuracion/plantillas/nueva">
            <Button size="sm" variant="outline">
              <Plus className="mr-1.5 h-4 w-4" />
              Crear plantilla
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="flex items-start justify-between gap-4 p-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.nombre}</p>
                  {item.descripcion && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {item.descripcion}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    {item.tipo && (
                      <Badge variant="secondary" className="text-xs">
                        {item.tipo}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {item.contenido_html
                        ? `${Math.round(item.contenido_html.replace(/<[^>]+>/g, "").length / 5)} palabras aprox.`
                        : "Sin contenido"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Link href={`/configuracion/plantillas/${item.id}/editar`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Eliminar"
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se eliminará <strong>{item.nombre}</strong> permanentemente.
                        Los contratos ya creados con esta plantilla no se verán afectados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDelete(item.id)}
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
