"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { crearCatalogo } from "@/app/actions/configuracion";
import type { CatalogoItem } from "@/types/settings";

interface CatalogAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  modulo: string;
  tipo: string;
  onItemAdded: (item: CatalogoItem) => void;
}

export function CatalogAddDialog({
  open,
  onOpenChange,
  title,
  modulo,
  tipo,
  onItemAdded,
}: CatalogAddDialogProps) {
  const [valor, setValor]  = useState("");
  const [error, setError]  = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function reset() { setValor(""); setError(null); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!valor.trim()) return;
    setError(null);
    const fd = new FormData();
    fd.set("modulo", modulo);
    fd.set("tipo", tipo);
    fd.set("valor", valor.trim());
    fd.set("etiqueta", valor.trim());
    start(async () => {
      const res = await crearCatalogo(null, fd);
      if (res.error) { setError(res.error); return; }
      if (res.item) onItemAdded(res.item);
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Agregar — {title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Valor <span className="text-destructive">*</span></Label>
            <Input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ej. Ambiental"
              className="text-sm"
              autoFocus
            />
          </div>
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
