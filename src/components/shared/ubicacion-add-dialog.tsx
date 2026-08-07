"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { crearUbicacion } from "@/app/actions/ubicaciones";
import type { Ubicacion } from "@/lib/repositories/ubicaciones";

interface UbicacionAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemAdded: (u: Ubicacion) => void;
}

export function UbicacionAddDialog({
  open,
  onOpenChange,
  onItemAdded,
}: UbicacionAddDialogProps) {
  const [nombre, setNombre]       = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad]       = useState("");
  const [departamento, setDepto]  = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [isPending, start]        = useTransition();

  function reset() { setNombre(""); setDireccion(""); setCiudad(""); setDepto(""); setError(null); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setError(null);
    const fd = new FormData();
    fd.set("nombre", nombre.trim());
    if (direccion.trim())    fd.set("direccion", direccion.trim());
    if (ciudad.trim())       fd.set("ciudad", ciudad.trim());
    if (departamento.trim()) fd.set("departamento", departamento.trim());
    start(async () => {
      const res = await crearUbicacion(null, fd);
      if (res.error) { setError(res.error); return; }
      if (res.ubicacion) {
        onItemAdded(res.ubicacion);
        reset();
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Agregar ubicación</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nombre <span className="text-destructive">*</span></Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Planta Norte" className="text-sm" autoFocus />
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
