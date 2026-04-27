"use client";

import { useState, useTransition, useActionState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearCatalogo, eliminarCatalogo } from "@/app/actions/configuracion";
import { TIPOS_CATALOGO, type CatalogoItem } from "@/types/settings";

// Agrupa los catálogos por modulo → tipo
function agrupar(items: CatalogoItem[]) {
  const grupos: Record<string, Record<string, CatalogoItem[]>> = {};
  for (const item of items) {
    if (!grupos[item.modulo]) grupos[item.modulo] = {};
    if (!grupos[item.modulo][item.tipo]) grupos[item.modulo][item.tipo] = [];
    grupos[item.modulo][item.tipo].push(item);
  }
  return grupos;
}

const MODULO_LABELS: Record<string, string> = {
  permisos:  "Permisos y Licencias",
  contratos: "Contratos",
  global:    "General",
};

export function CatalogoManagerClient({
  initialCatalogos,
}: {
  initialCatalogos: CatalogoItem[];
}) {
  const [catalogos, setCatalogos] = useState(initialCatalogos);
  const [open, setOpen]           = useState(false);
  const [expandido, setExpandido] = useState<string>(
    // Expandir el primer grupo por defecto
    Object.keys(agrupar(initialCatalogos))[0] ?? ""
  );
  const [isPending, startTransition] = useTransition();
  const [modulo, setModulo] = useState("permisos");
  const [tipo, setTipo]     = useState("");
  const [state, formAction, pending] = useActionState(crearCatalogo, null);

  const grupos = agrupar(catalogos);

  function handleDelete(id: string) {
    startTransition(async () => {
      await eliminarCatalogo(id);
      setCatalogos((prev) => prev.filter((c) => c.id !== id));
    });
  }

  // Al éxito del form, recargar la lista (el server revalida el path)
  // El componente se re-renderiza porque Next revalidó el path
  const tiposDisponibles = TIPOS_CATALOGO[modulo as keyof typeof TIPOS_CATALOGO] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Catálogos del sistema</h2>
          <p className="text-sm text-muted-foreground">
            Administra los tipos, entidades y listas de valores de cada módulo.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Agregar valor
        </Button>
      </div>

      {Object.entries(grupos).length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No hay catálogos configurados.
          </p>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar primer valor
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {Object.entries(grupos).map(([mod, tipos]) => (
            <Card key={mod} className="overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold hover:bg-muted/50 transition"
                onClick={() => setExpandido(expandido === mod ? "" : mod)}
              >
                <span>{MODULO_LABELS[mod] ?? mod}</span>
                {expandido === mod
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>

              {expandido === mod && (
                <div className="border-t">
                  {Object.entries(tipos).map(([tipoKey, items], idx) => {
                    const tipoLabel =
                      TIPOS_CATALOGO[mod as keyof typeof TIPOS_CATALOGO]
                        ?.find((t) => t.tipo === tipoKey)?.label ?? tipoKey;
                    return (
                      <div key={tipoKey}>
                        {idx > 0 && <Separator />}
                        <div className="px-5 py-3">
                          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {tipoLabel}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className="group flex items-center gap-1.5 rounded-full border bg-muted/40 pl-3 pr-1.5 py-1 text-sm"
                              >
                                <span>{item.etiqueta}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item.id)}
                                  disabled={isPending}
                                  className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: agregar valor */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar valor al catálogo</DialogTitle>
          </DialogHeader>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Módulo</Label>
              <Select
                name="modulo"
                value={modulo}
                onValueChange={(v) => { setModulo(v); setTipo(""); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MODULO_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="modulo" value={modulo} />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de catálogo</Label>
              <Select name="tipo" value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposDisponibles.map((t) => (
                    <SelectItem key={t.tipo} value={t.tipo}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="tipo" value={tipo} />
            </div>

            <div className="space-y-1.5">
              <Label>Valor</Label>
              <Input
                name="valor"
                placeholder="Ej. Ambiental"
                required
              />
              <p className="text-xs text-muted-foreground">
                El valor interno que se guardará en los registros.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Etiqueta (opcional)</Label>
              <Input
                name="etiqueta"
                placeholder="Ej. Ambiental (igual al valor si no se indica)"
              />
            </div>

            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending || !tipo}>
                {pending ? "Guardando…" : "Agregar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
