"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Mail, Briefcase, UserCheck, User } from "lucide-react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { crearResponsable, editarResponsable, toggleResponsable, eliminarResponsable } from "@/app/actions/responsables";
import type { Responsable } from "@/lib/repositories/responsables";
import type { ProfileOption } from "@/app/(dashboard)/configuracion/responsables/page";

type Mode = "sistema" | "externo";

function ResponsableForm({
  defaultValues,
  profiles,
  onSubmit,
  onCancel,
  isPending,
}: {
  defaultValues?: Partial<Responsable>;
  profiles: ProfileOption[];
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const initialMode: Mode = defaultValues?.user_id ? "sistema" : "externo";
  const [mode, setMode] = useState<Mode>(initialMode);
  const initialProfile = defaultValues?.user_id ? profiles.find((p) => p.id === defaultValues.user_id) : null;
  const [selectedProfile, setSelectedProfile] = useState<ProfileOption | null>(initialProfile ?? null);
  const [areaValue, setAreaValue] = useState<string>(defaultValues?.area ?? "");

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }}
      className="space-y-4"
    >
      {/* Toggle */}
      <div className="flex rounded-lg border overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => setMode("sistema")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition ${
            mode === "sistema"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          Usuario del sistema
        </button>
        <button
          type="button"
          onClick={() => setMode("externo")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition ${
            mode === "externo"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          Contacto externo
        </button>
      </div>

      {mode === "sistema" ? (
        <>
          <input type="hidden" name="tipo" value="sistema" />
          <div className="space-y-1.5">
            <Label>Usuario <span className="text-destructive">*</span></Label>
            <Select
              name="user_id"
              defaultValue={defaultValues?.user_id ?? undefined}
              required
              onValueChange={(val) => {
                const p = profiles.find((p) => p.id === val) ?? null;
                setSelectedProfile(p);
                setAreaValue(p?.departamento ?? "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un usuario…" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span>{p.nombre}</span>
                    <span className="ml-2 text-muted-foreground text-xs">{p.email}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              El nombre y correo se sincronizan automáticamente desde el perfil.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Área de la empresa</Label>
            <Input
              name="area"
              value={areaValue}
              onChange={(e) => setAreaValue(e.target.value)}
              placeholder={selectedProfile?.departamento ? "" : "Ej. Legal, Operaciones, HSE"}
            />
            {selectedProfile?.departamento && (
              <p className="text-xs text-muted-foreground">
                Pre-completado desde el perfil. Puedes modificarlo.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="tipo" value="externo" />
          <div className="space-y-1.5">
            <Label>Nombre <span className="text-destructive">*</span></Label>
            <Input name="nombre" defaultValue={defaultValues?.nombre} placeholder="Ej. Ana López" required />
          </div>
          <div className="space-y-1.5">
            <Label>Área de la empresa</Label>
            <Input name="area" defaultValue={defaultValues?.area ?? ""} placeholder="Ej. Legal, Operaciones, HSE" />
          </div>
          <div className="space-y-1.5">
            <Label>Correo electrónico</Label>
            <Input name="email" type="email" defaultValue={defaultValues?.email ?? ""} placeholder="ana@empresa.com" />
          </div>
        </>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : defaultValues?.id ? "Guardar cambios" : "Agregar responsable"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ResponsablesClient({
  initialItems,
  profiles,
}: {
  initialItems: Responsable[];
  profiles: ProfileOption[];
}) {
  const [items, setItems]   = useState<Responsable[]>(initialItems);
  const [dialog, setDialog] = useState<{ open: boolean; item?: Responsable }>({ open: false });
  const [error, setError]   = useState<string | null>(null);
  const [isPending, start]  = useTransition();

  function openCreate() { setDialog({ open: true, item: undefined }); setError(null); }
  function openEdit(item: Responsable) { setDialog({ open: true, item }); setError(null); }
  function closeDialog() { setDialog({ open: false }); }

  async function handleSubmit(fd: FormData) {
    setError(null);
    if (dialog.item) {
      start(async () => {
        const res = await editarResponsable(dialog.item!.id, null, fd);
        if (res.error) { setError(res.error); return; }
        const userId = (fd.get("user_id") as string) || null;
        const profile = userId ? profiles.find((p) => p.id === userId) : null;
        setItems((prev) => prev.map((i) => {
          if (i.id !== dialog.item!.id) return i;
          if (profile) {
            return { ...i, user_id: profile.id, nombre: profile.nombre, email: profile.email, area: (fd.get("area") as string) || null };
          }
          return { ...i, user_id: null, nombre: fd.get("nombre") as string, area: (fd.get("area") as string) || null, email: (fd.get("email") as string) || null };
        }));
        closeDialog();
      });
    } else {
      start(async () => {
        const res = await crearResponsable(null, fd);
        if (res.error) { setError(res.error); return; }
        if (res.responsable) setItems((prev) => [res.responsable!, ...prev]);
        closeDialog();
      });
    }
  }

  function handleToggle(item: Responsable) {
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, activo: !i.activo } : i));
    start(() => toggleResponsable(item.id, !item.activo));
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    start(() => eliminarResponsable(id));
  }

  const activos = items.filter((i) => i.activo);
  const inactivos = items.filter((i) => !i.activo);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Responsables</h2>
          <p className="text-sm text-muted-foreground">
            Personas que pueden ser asignadas como responsables de permisos.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Agregar
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="py-12 text-center text-sm text-muted-foreground">
          <p>No hay responsables configurados.</p>
          <Button variant="link" className="mt-1" onClick={openCreate}>Agregar el primero</Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {activos.length > 0 && (
            <div className="space-y-2">
              {activos.map((item) => (
                <ItemRow key={item.id} item={item} onEdit={openEdit} onToggle={handleToggle} onDelete={handleDelete} />
              ))}
            </div>
          )}
          {inactivos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Inactivos</p>
              {inactivos.map((item) => (
                <ItemRow key={item.id} item={item} onEdit={openEdit} onToggle={handleToggle} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.item ? "Editar responsable" : "Nuevo responsable"}</DialogTitle>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <ResponsableForm
            key={dialog.item?.id ?? "new"}
            defaultValues={dialog.item}
            profiles={profiles}
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
  item: Responsable;
  onEdit: (item: Responsable) => void;
  onToggle: (item: Responsable) => void;
  onDelete: (id: string) => void;
}) {
  const initials = item.nombre.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <Card className={`flex items-center gap-3 px-4 py-3 ${!item.activo ? "opacity-50" : ""}`}>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-sm font-bold">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{item.nombre}</span>
          {item.user_id && (
            <Badge variant="secondary" className="text-[10px] py-0 gap-1">
              <UserCheck className="h-2.5 w-2.5" />
              Sistema
            </Badge>
          )}
          {!item.activo && <Badge variant="outline" className="text-[10px] py-0">Inactivo</Badge>}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          {item.area && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Briefcase className="h-3 w-3" />{item.area}
            </span>
          )}
          {item.email && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />{item.email}
            </span>
          )}
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
              <AlertDialogTitle>¿Eliminar responsable?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará <strong>{item.nombre}</strong>. Los permisos que lo tengan asignado quedarán sin responsable.
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
