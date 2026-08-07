"use client";

import { useState, useTransition, useActionState, useEffect } from "react";
import { Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
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
import { crearCatalogo, editarCatalogo, eliminarCatalogo } from "@/app/actions/configuracion";
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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editingVal, setEditingVal]   = useState("");
  const [modulo, setModulo] = useState("permisos");
  const [tipo, setTipo]     = useState("");
  const [state, formAction, pending] = useActionState(crearCatalogo, null);

  useEffect(() => {
    if (state?.item) {
      setCatalogos((prev) => [...prev, state.item!]);
      setOpen(false);
    }
  }, [state]);

  const grupos = agrupar(catalogos);

  function handleEdit(item: CatalogoItem) {
    setEditingId(item.id);
    setEditingVal(item.valor);
  }

  function handleSaveEdit(id: string) {
    if (!editingVal.trim()) return;
    startTransition(async () => {
      const result = await editarCatalogo(id, editingVal);
      if (result?.error) { setDeleteError(result.error); return; }
      if (result?.item) {
        setCatalogos((prev) => prev.map((c) => c.id === id ? result.item! : c));
      }
      setEditingId(null);
    });
  }

  function handleDelete(id: string) {
    setDeleteError(null);
    startTransition(async () => {
      const result = await eliminarCatalogo(id);
      if (result?.error) {
        setDeleteError(result.error);
        return;
      }
      setCatalogos((prev) => prev.filter((c) => c.id !== id));
    });
  }
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

      {deleteError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span>{deleteError}</span>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            className="mt-0.5 shrink-0 text-destructive/60 hover:text-destructive"
          >
            ✕
          </button>
        </div>
      )}

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
                                className="group flex items-center gap-1 rounded-full border bg-muted/40 pl-3 pr-1.5 py-1 text-sm"
                              >
                                {editingId === item.id ? (
                                  <>
                                    <input
                                      className="w-32 bg-transparent text-sm outline-none"
                                      value={editingVal}
                                      onChange={(e) => setEditingVal(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveEdit(item.id);
                                        if (e.key === "Escape") setEditingId(null);
                                      }}
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEdit(item.id)}
                                      disabled={isPending}
                                      className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                      title="Guardar"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingId(null)}
                                      className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                                      title="Cancelar"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span>{item.valor}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(item)}
                                      disabled={isPending}
                                      className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
                                      title="Editar"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(item.id)}
                                      disabled={isPending}
                                      className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </>
                                )}
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
              <Label>Valor <span className="text-destructive">*</span></Label>
              <Input
                name="valor"
                placeholder="Ej. Ambiental"
                required
              />
            </div>
            <input type="hidden" name="etiqueta" value="" />

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
