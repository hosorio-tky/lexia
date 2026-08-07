"use client";

import { useState, useTransition } from "react";
import { Settings2, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { crearUbicacion, eliminarUbicacion } from "@/app/actions/ubicaciones";
import type { Ubicacion } from "@/lib/repositories/ubicaciones";

interface UbicacionManageModalProps {
  items: Ubicacion[];
  onItemAdded: (u: Ubicacion) => void;
  onItemRemoved: (id: string) => void;
}

export function UbicacionManageModal({
  items,
  onItemAdded,
  onItemRemoved,
}: UbicacionManageModalProps) {
  const [open, setOpen]               = useState(false);
  const [nombre, setNombre]           = useState("");
  const [direccion, setDireccion]     = useState("");
  const [ciudad, setCiudad]           = useState("");
  const [departamento, setDepto]      = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [isPending, start]            = useTransition();

  function reset() { setNombre(""); setDireccion(""); setCiudad(""); setDepto(""); setError(null); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setError(null);
    const fd = new FormData();
    fd.set("nombre", nombre.trim());
    if (direccion.trim())   fd.set("direccion", direccion.trim());
    if (ciudad.trim())      fd.set("ciudad", ciudad.trim());
    if (departamento.trim()) fd.set("departamento", departamento.trim());
    start(async () => {
      const res = await crearUbicacion(null, fd);
      if (res.error) { setError(res.error); return; }
      if (res.ubicacion) { onItemAdded(res.ubicacion); reset(); }
    });
  }

  function handleRemove(id: string) {
    start(async () => {
      await eliminarUbicacion(id);
      onItemRemoved(id);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Administrar ubicaciones"
          className="ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ubicaciones</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin ubicaciones configuradas.</p>
          ) : (
            items.filter((u) => u.activo).map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.nombre}</p>
                  {(u.ciudad || u.departamento) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[u.ciudad, u.departamento].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {u.direccion && <p className="text-xs text-muted-foreground truncate">{u.direccion}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(u.id)}
                  disabled={isPending}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded text-muted-foreground hover:text-destructive hover:bg-muted transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAdd} className="space-y-3 pt-2 border-t">
          <div className="space-y-1">
            <Label className="text-xs">Nombre <span className="text-destructive">*</span></Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Planta Norte" className="text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Dirección (opcional)</Label>
            <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ej. Calle Principal #123" className="text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Ciudad (opcional)</Label>
              <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Ej. San Salvador" className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Departamento (opcional)</Label>
              <Input value={departamento} onChange={(e) => setDepto(e.target.value)} placeholder="Ej. San Salvador" className="text-sm" />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
            Agregar ubicación
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
