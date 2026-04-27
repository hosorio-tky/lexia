"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { crearUbicacion, editarUbicacion, toggleUbicacion, eliminarUbicacion } from "@/app/actions/ubicaciones";
import type { Ubicacion } from "@/lib/repositories/ubicaciones";

function UbicacionForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
}: {
  defaultValues?: Partial<Ubicacion>;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label>Nombre de la ubicación <span className="text-destructive">*</span></Label>
        <Input name="nombre" defaultValue={defaultValues?.nombre} placeholder="Ej. Planta Norte" required />
      </div>
      <div className="space-y-1.5">
        <Label>Dirección</Label>
        <Input name="direccion" defaultValue={defaultValues?.direccion ?? ""} placeholder="Ej. Km 12 Carretera Panamericana" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Ciudad</Label>
          <Input name="ciudad" defaultValue={defaultValues?.ciudad ?? ""} placeholder="Ej. San Salvador" />
        </div>
        <div className="space-y-1.5">
          <Label>Departamento</Label>
          <Input name="departamento" defaultValue={defaultValues?.departamento ?? ""} placeholder="Ej. San Salvador" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : defaultValues?.id ? "Guardar cambios" : "Agregar ubicación"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function UbicacionesClient({ initialItems }: { initialItems: Ubicacion[] }) {
  const [items, setItems]   = useState<Ubicacion[]>(initialItems);
  const [dialog, setDialog] = useState<{ open: boolean; item?: Ubicacion }>({ open: false });
  const [error, setError]   = useState<string | null>(null);
  const [isPending, start]  = useTransition();

  function openCreate() { setDialog({ open: true, item: undefined }); setError(null); }
  function openEdit(item: Ubicacion) { setDialog({ open: true, item }); setError(null); }
  function closeDialog() { setDialog({ open: false }); }

  async function handleSubmit(fd: FormData) {
    setError(null);
    if (dialog.item) {
      start(async () => {
        const res = await editarUbicacion(dialog.item!.id, null, fd);
        if (res.error) { setError(res.error); return; }
        setItems((prev) => prev.map((i) => i.id === dialog.item!.id
          ? {
              ...i,
              nombre:      fd.get("nombre") as string,
              direccion:   (fd.get("direccion") as string) || null,
              ciudad:      (fd.get("ciudad") as string) || null,
              departamento:(fd.get("departamento") as string) || null,
            }
          : i
        ));
        closeDialog();
      });
    } else {
      start(async () => {
        const res = await crearUbicacion(null, fd);
        if (res.error) { setError(res.error); return; }
        if (res.ubicacion) setItems((prev) => [res.ubicacion!, ...prev]);
        closeDialog();
      });
    }
  }

  function handleToggle(item: Ubicacion) {
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, activo: !i.activo } : i));
    start(() => toggleUbicacion(item.id, !item.activo));
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    start(() => eliminarUbicacion(id));
  }

  const activas = items.filter((i) => i.activo);
  const inactivas = items.filter((i) => !i.activo);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ubicaciones</h2>
          <p className="text-sm text-muted-foreground">
            Plantas, sedes u oficinas que pueden asociarse a permisos.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Agregar
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="py-12 text-center text-sm text-muted-foreground">
          <p>No hay ubicaciones configuradas.</p>
          <Button variant="link" className="mt-1" onClick={openCreate}>Agregar la primera</Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {activas.length > 0 && (
            <div className="space-y-2">
              {activas.map((item) => <ItemRow key={item.id} item={item} onEdit={openEdit} onToggle={handleToggle} onDelete={handleDelete} />)}
            </div>
          )}
          {inactivas.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Inactivas</p>
              {inactivas.map((item) => <ItemRow key={item.id} item={item} onEdit={openEdit} onToggle={handleToggle} onDelete={handleDelete} />)}
            </div>
          )}
        </div>
      )}

      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.item ? "Editar ubicación" : "Nueva ubicación"}</DialogTitle>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <UbicacionForm
            key={dialog.item?.id ?? "new"}
            defaultValues={dialog.item}
            onSubmit={handleSubmit}
            onCancel={closeDialog}
            isPending={isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemRow({ item, onEdit, onToggle, onDelete }: {
  item: Ubicacion;
  onEdit: (item: Ubicacion) => void;
  onToggle: (item: Ubicacion) => void;
  onDelete: (id: string) => void;
}) {
  const partes = [item.ciudad, item.departamento].filter(Boolean).join(", ");

  return (
    <Card className={`flex items-center gap-3 px-4 py-3 ${!item.activo ? "opacity-50" : ""}`}>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <MapPin className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{item.nombre}</span>
          {!item.activo && <Badge variant="outline" className="text-[10px] py-0">Inactiva</Badge>}
        </div>
        <div className="flex flex-col gap-0 mt-0.5">
          {item.direccion && <span className="text-xs text-muted-foreground">{item.direccion}</span>}
          {partes && <span className="text-xs text-muted-foreground">{partes}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onToggle(item)}
          className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition"
          title={item.activo ? "Desactivar" : "Activar"}
        >
          {item.activo
            ? <ToggleRight className="h-4 w-4 text-primary" />
            : <ToggleLeft className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition"
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:text-destructive hover:bg-muted transition"
              title="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar ubicación?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará <strong>{item.nombre}</strong>. Los permisos que la tengan asignada quedarán sin ubicación.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(item.id)} className="bg-destructive hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}
