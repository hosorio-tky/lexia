"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Users, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  crearGrupo, editarGrupo, eliminarGrupo, agregarMiembro, eliminarMiembro,
} from "@/app/actions/grupos";
import type { Grupo, GrupoMiembro } from "@/types/access-control";
import type { UserProfile } from "@/types/users";

// ─── Paleta de colores ────────────────────────────────────────
const COLORS = [
  "#64748B", "#3B82F6", "#8B5CF6", "#EC4899",
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#14B8A6", "#06B6D4",
];

// ─── Form de grupo ────────────────────────────────────────────
function GrupoForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
}: {
  defaultValues?: Partial<Grupo>;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [color, setColor] = useState(defaultValues?.color ?? "#64748B");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("color", color);
        onSubmit(fd);
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label>Nombre <span className="text-destructive">*</span></Label>
        <Input name="nombre" defaultValue={defaultValues?.nombre} placeholder="Ej. Equipo Legal" required />
      </div>
      <div className="space-y-1.5">
        <Label>Descripción</Label>
        <Input name="descripcion" defaultValue={defaultValues?.descripcion ?? ""} placeholder="Uso o propósito del grupo" />
      </div>
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="h-7 w-7 rounded-full ring-offset-2 transition focus:outline-none"
              style={{
                backgroundColor: c,
                boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined,
              }}
              title={c}
            />
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : defaultValues?.id ? "Guardar cambios" : "Crear grupo"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Diálogo de miembros ──────────────────────────────────────
function MiembrosDialog({
  grupo,
  miembros: initialMiembros,
  usuarios,
  open,
  onOpenChange,
}: {
  grupo: Grupo;
  miembros: GrupoMiembro[];
  usuarios: UserProfile[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [miembros, setMiembros]   = useState<GrupoMiembro[]>(initialMiembros);
  const [addUserId, setAddUserId] = useState("");
  const [isPending, start]        = useTransition();

  const memberIds = new Set(miembros.map((m) => m.user_id));
  const disponibles = usuarios.filter((u) => u.activo && !memberIds.has(u.id));

  function handleAdd() {
    if (!addUserId) return;
    const user = usuarios.find((u) => u.id === addUserId);
    if (!user) return;

    const temp: GrupoMiembro = {
      id:         `temp-${Date.now()}`,
      tenant_id:  grupo.tenant_id,
      grupo_id:   grupo.id,
      user_id:    addUserId,
      created_at: new Date().toISOString(),
      nombre:     user.nombre,
      apellido:   user.apellido,
      email:      user.email,
      rol:        user.rol,
    };
    setMiembros((prev) => [...prev, temp]);
    setAddUserId("");
    start(() => agregarMiembro(grupo.id, addUserId));
  }

  function handleRemove(userId: string) {
    setMiembros((prev) => prev.filter((m) => m.user_id !== userId));
    start(() => eliminarMiembro(grupo.id, userId));
  }

  function resolveName(m: GrupoMiembro) {
    if (m.nombre) return [m.nombre, m.apellido].filter(Boolean).join(" ");
    const u = usuarios.find((u) => u.id === m.user_id);
    return u?.nombre_completo ?? u?.nombre ?? "Usuario";
  }

  function resolveInitials(m: GrupoMiembro) {
    const name = resolveName(m);
    return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: grupo.color }}
            />
            {grupo.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Agregar miembro */}
          <div className="space-y-1.5">
            <Label>Agregar miembro</Label>
            <div className="flex gap-2">
              <Select value={addUserId} onValueChange={setAddUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={disponibles.length === 0 ? "Todos los usuarios ya son miembros" : "Seleccionar usuario…"} />
                </SelectTrigger>
                <SelectContent>
                  {disponibles.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre_completo || u.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!addUserId || isPending}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Lista de miembros */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Miembros ({miembros.length})
            </Label>
            {miembros.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2">Sin miembros todavía.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {miembros.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"
                  >
                    <div
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: grupo.color }}
                    >
                      {resolveInitials(m)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{resolveName(m)}</p>
                      {m.email && <p className="text-xs text-muted-foreground truncate">{m.email}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(m.user_id)}
                      disabled={isPending}
                      className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition disabled:opacity-50 shrink-0"
                      title="Quitar del grupo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Fila de grupo ────────────────────────────────────────────
function GrupoRow({
  grupo,
  usuarios,
  onEdit,
  onDelete,
}: {
  grupo: Grupo;
  usuarios: UserProfile[];
  onEdit: (g: Grupo) => void;
  onDelete: (id: string) => void;
}) {
  const [membersOpen, setMembersOpen] = useState(false);
  const [miembros, setMiembros]       = useState<GrupoMiembro[]>([]);
  const [loadingMembers, setLoading]  = useState(false);

  async function openMembers() {
    setLoading(true);
    try {
      // Fetch group members inline via client-side fetch
      const res = await fetch(`/api/grupos/${grupo.id}/miembros`);
      if (res.ok) setMiembros(await res.json());
    } catch {
      // If API route doesn't exist yet, show empty list — members can still be added
    } finally {
      setLoading(false);
      setMembersOpen(true);
    }
  }

  const count = grupo.miembros_count ?? 0;

  return (
    <>
      <Card className="flex items-center gap-3 px-4 py-3">
        {/* Color dot avatar */}
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white text-sm font-bold"
          style={{ backgroundColor: grupo.color }}
        >
          {grupo.nombre.slice(0, 1).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{grupo.nombre}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {grupo.descripcion && (
              <p className="text-xs text-muted-foreground truncate">{grupo.descripcion}</p>
            )}
            <span className="text-xs text-muted-foreground shrink-0">
              {count} {count === 1 ? "miembro" : "miembros"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={openMembers}
            disabled={loadingMembers}
            className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="Gestionar miembros"
          >
            <Users className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(grupo)}
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
                <AlertDialogTitle>¿Eliminar grupo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminará <strong>{grupo.nombre}</strong> y todos sus miembros. Los accesos otorgados a este grupo también se eliminarán.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(grupo.id)}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      <MiembrosDialog
        grupo={grupo}
        miembros={miembros}
        usuarios={usuarios}
        open={membersOpen}
        onOpenChange={setMembersOpen}
      />
    </>
  );
}

// ─── Cliente principal ────────────────────────────────────────
export function GruposClient({
  initialGrupos,
  usuarios,
}: {
  initialGrupos: Grupo[];
  usuarios: UserProfile[];
}) {
  const [grupos, setGrupos] = useState<Grupo[]>(initialGrupos);
  const [dialog, setDialog] = useState<{ open: boolean; grupo?: Grupo }>({ open: false });
  const [error, setError]   = useState<string | null>(null);
  const [isPending, start]  = useTransition();

  function openCreate() { setDialog({ open: true, grupo: undefined }); setError(null); }
  function openEdit(g: Grupo) { setDialog({ open: true, grupo: g }); setError(null); }
  function closeDialog() { setDialog({ open: false }); }

  function handleSubmit(fd: FormData) {
    setError(null);
    if (dialog.grupo) {
      start(async () => {
        const res = await editarGrupo(dialog.grupo!.id, null, fd);
        if (res.error) { setError(res.error); return; }
        setGrupos((prev) => prev.map((g) =>
          g.id === dialog.grupo!.id
            ? { ...g, nombre: fd.get("nombre") as string, descripcion: (fd.get("descripcion") as string) || undefined, color: fd.get("color") as string }
            : g
        ));
        closeDialog();
      });
    } else {
      start(async () => {
        const res = await crearGrupo(null, fd);
        if (res.error) { setError(res.error); return; }
        const nuevo: Grupo = {
          id:            res.id!,
          tenant_id:     "",
          nombre:        fd.get("nombre") as string,
          descripcion:   (fd.get("descripcion") as string) || undefined,
          color:         fd.get("color") as string,
          created_at:    new Date().toISOString(),
          updated_at:    new Date().toISOString(),
          miembros_count: 0,
        };
        setGrupos((prev) => [nuevo, ...prev]);
        closeDialog();
      });
    }
  }

  function handleDelete(id: string) {
    setGrupos((prev) => prev.filter((g) => g.id !== id));
    start(() => eliminarGrupo(id));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Grupos</h2>
          <p className="text-sm text-muted-foreground">
            Agrupa usuarios para asignarles acceso a permisos y contratos de forma conjunta.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nuevo grupo
        </Button>
      </div>

      {/* Lista */}
      {grupos.length === 0 ? (
        <Card className="py-12 text-center text-sm text-muted-foreground">
          <p>No hay grupos configurados.</p>
          <Button variant="link" className="mt-1" onClick={openCreate}>
            Crear el primero
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {grupos.map((g) => (
            <GrupoRow
              key={g.id}
              grupo={g}
              usuarios={usuarios}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Dialog crear / editar */}
      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.grupo ? "Editar grupo" : "Nuevo grupo"}</DialogTitle>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <GrupoForm
            key={dialog.grupo?.id ?? "new"}
            defaultValues={dialog.grupo}
            onSubmit={handleSubmit}
            onCancel={closeDialog}
            isPending={isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
