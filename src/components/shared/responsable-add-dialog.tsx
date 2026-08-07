"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2, UserCheck, User, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { crearResponsable } from "@/app/actions/responsables";
import type { Responsable } from "@/lib/repositories/responsables";
import type { ProfileOption } from "@/types/users";

type Mode = "sistema" | "externo";

interface ResponsableAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: ProfileOption[];
  onItemAdded: (r: Responsable) => void;
}

export function ResponsableAddDialog({
  open,
  onOpenChange,
  profiles,
  onItemAdded,
}: ResponsableAddDialogProps) {
  const [mode, setMode]     = useState<Mode>("sistema");
  const [userId, setUserId] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail]   = useState("");
  const [area, setArea]     = useState("");
  const [error, setError]   = useState<string | null>(null);
  const [isPending, start]  = useTransition();

  function reset() { setUserId(""); setNombre(""); setEmail(""); setArea(""); setError(null); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
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
      if (res.responsable) {
        onItemAdded(res.responsable);
        reset();
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Agregar responsable</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAdd} className="space-y-3">
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
            <>
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
              {(() => {
                const p = profiles.find((x) => x.id === userId);
                if (!p) return null;
                return (
                  <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-0.5">
                    <p className="text-xs font-medium">{p.nombre}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                    {p.cargo && <p className="text-xs text-muted-foreground">Cargo: {p.cargo}</p>}
                    {p.departamento && <p className="text-xs text-muted-foreground">Área: {p.departamento}</p>}
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="space-y-2">
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del responsable" className="text-sm" autoFocus />
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
          {mode === "sistema" && (
            <p className="text-xs text-muted-foreground text-center">
              ¿No encuentras al usuario?{" "}
              <a href="/usuarios" className="inline-flex items-center gap-0.5 text-primary underline-offset-2 hover:underline">
                Ir a Usuarios
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
