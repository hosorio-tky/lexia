"use client";

import { useState, useTransition } from "react";
import { Settings2, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { crearCatalogo, eliminarCatalogo } from "@/app/actions/configuracion";
import type { CatalogoItem } from "@/types/settings";

interface CatalogManageModalProps {
  title: string;
  modulo: string;
  tipo: string;
  items: CatalogoItem[];
  onItemAdded: (valor: string, etiqueta: string) => void;
  onItemRemoved: (valor: string) => void;
}

export function CatalogManageModal({
  title,
  modulo,
  tipo,
  items,
  onItemAdded,
  onItemRemoved,
}: CatalogManageModalProps) {
  const [open, setOpen]         = useState(false);
  const [valor, setValor]       = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [isPending, start]      = useTransition();

  function reset() { setValor(""); setEtiqueta(""); setError(null); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!valor.trim()) return;
    setError(null);
    const resolvedEtiqueta = etiqueta.trim() || valor.trim();
    const fd = new FormData();
    fd.set("modulo", modulo);
    fd.set("tipo", tipo);
    fd.set("valor", valor.trim());
    fd.set("etiqueta", resolvedEtiqueta);
    start(async () => {
      const res = await crearCatalogo(null, fd);
      if (res.error) { setError(res.error); return; }
      onItemAdded(valor.trim(), resolvedEtiqueta);
      reset();
    });
  }

  function handleRemove(item: CatalogoItem) {
    start(async () => {
      await eliminarCatalogo(item.id);
      onItemRemoved(item.valor);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title={`Administrar ${title}`}
          className="ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin valores configurados.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <span className="text-sm">{item.etiqueta}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  disabled={isPending}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded text-muted-foreground hover:text-destructive hover:bg-muted transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAdd} className="space-y-2 pt-2 border-t">
          <Input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Valor (clave interna) *"
            className="text-sm"
          />
          <Input
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            placeholder="Etiqueta (opcional, texto visible)"
            className="text-sm"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" className="w-full" disabled={isPending || !valor.trim()}>
            {isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
            Agregar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
