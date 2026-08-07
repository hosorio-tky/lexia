"use client";

import { useState, useTransition } from "react";
import { Settings2, Plus, Trash2, Loader2, UserCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { crearResponsable, eliminarResponsable } from "@/app/actions/responsables";
import type { Responsable } from "@/lib/repositories/responsables";
import type { ProfileOption } from "@/app/(dashboard)/configuracion/responsables/page";

type Mode = "sistema" | "externo";

interface ResponsableManageModalProps {
  items: Responsable[];
  profiles: ProfileOption[];
  onItemAdded: (r: Responsable) => void;
  onItemRemoved: (id: string) => void;
}

export function ResponsableManageModal({
  items,
  profiles,
  onItemAdded,
  onItemRemoved,
}: ResponsableManageModalProps) {
  const [open, setOpen]       = useState(false);
  const [mode, setMode]       = useState<Mode>("sistema");
  const [userId, setUserId]   = useState("");
  const [nombre, setNombre]   = useState("");
  const [email, setEmail]     = useState("");
  const [area, setArea]       = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [isPending, start]    = useTransition();

  function reset() {
    setUserId(""); setNombre(""); setEmail(""); setArea(""); setError(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    if (mode === "sistema") {
      if (!userId) { setError("Selecciona un usuario"); return; }
      fd.set("user_id", userId);
      fd.set("area", area);
    } else {
      if (!nombre.trim()) { setError("El nombre es obligatorio"); return; }
      fd.set("nombre", nombre.trim());
      if (email.trim()) fd.set("email", email.trim());
      fd.set("area", area);
    }
    start(async () => {
      const res = await crearResponsable(null, fd);
      if (res.error) { setError(res.error); return; }
      if (res.responsable) { onItemAdded(res.responsable); reset(); }
    });
  }

  function handleRemove(id: string) {
    start(async () => {
      await eliminarResponsable(id);
      onItemRemoved(id);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Administrar responsables"
          className="ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Responsables</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin responsables configurados.</p>
          ) : (
            items.filter((r) => r.activo).map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.nombre}</p>
                  {r.area && <p className="text-xs text-muted-foreground truncate">{r.area}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(r.id)}
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
          {/* Toggle sistema / externo */}
          <div className="flex rounded-lg border overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setMode("sistema")}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 transition ${mode === "sistema" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <UserCheck className="h-3 w-3" />Usuario del sistema
            </button>
            <button
              type="button"
              onClick={() => setMode("externo")}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 transition ${mode === "externo" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <User className="h-3 w-3" />Contacto externo
            </button>
          </div>

          {mode === "sistema" ? (
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Selecciona usuario…" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span>{p.nombre}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{p.email}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-2">
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del responsable" className="text-sm" />
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (opcional)" type="email" className="text-sm" />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Área (opcional)</Label>
            <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ej. Legal, Operaciones" className="text-sm" />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" size="sm" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
            Agregar responsable
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
