"use client";

import { useActionState } from "react";
import { useTransition } from "react";
import { Save, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { UserRoleBadge } from "./user-role-badge";
import { editarUsuario, cambiarContrasena } from "@/app/actions/usuarios";
import type { UserProfile } from "@/types/users";

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="ml-1 text-destructive">*</span>}</Label>
      {children}
    </div>
  );
}

export function UserProfileClient({ user }: { user: UserProfile }) {
  // ── Formulario de perfil ──────────────────────────────────
  const [isPendingProfile, startProfile] = useTransition();
  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startProfile(() => editarUsuario(user.id, fd));
  };

  // ── Formulario de contraseña ──────────────────────────────
  const [passState, passAction, isPendingPass] = useActionState(cambiarContrasena, {});

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Columna principal */}
      <div className="lg:col-span-2 space-y-6">

        {/* Información personal */}
        <Card className="p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-sm font-semibold">Información personal</h2>
            <Separator className="mt-3" />
          </div>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" required>
                <Input name="nombre" defaultValue={user.nombre} required />
              </Field>
              <Field label="Apellido">
                <Input name="apellido" defaultValue={user.apellido} />
              </Field>
              <Field label="Cargo">
                <Input name="cargo" placeholder="Ej. Gerente Legal" defaultValue={user.cargo} />
              </Field>
              <Field label="Departamento">
                <Input name="departamento" placeholder="Ej. Legal" defaultValue={user.departamento} />
              </Field>
              <Field label="Teléfono">
                <Input name="telefono" placeholder="Ej. +503 7000-0000" defaultValue={user.telefono} />
              </Field>
            </div>
            <Button type="submit" disabled={isPendingProfile}>
              <Save className="mr-2 h-4 w-4" />
              {isPendingProfile ? "Guardando…" : "Guardar cambios"}
            </Button>
          </form>
        </Card>

        {/* Cambiar contraseña */}
        <Card className="p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-sm font-semibold">Cambiar contraseña</h2>
            <Separator className="mt-3" />
          </div>
          <form action={passAction} className="space-y-4">
            <Field label="Nueva contraseña">
              <Input name="nueva" type="password" placeholder="Mínimo 8 caracteres" required />
            </Field>
            <Field label="Confirmar contraseña">
              <Input name="confirma" type="password" placeholder="Repite la contraseña" required />
            </Field>
            {passState?.error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {passState.error}
              </div>
            )}
            {passState?.success && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                Contraseña actualizada correctamente.
              </div>
            )}
            <Button type="submit" variant="outline" disabled={isPendingPass}>
              <KeyRound className="mr-2 h-4 w-4" />
              {isPendingPass ? "Actualizando…" : "Actualizar contraseña"}
            </Button>
          </form>
        </Card>
      </div>

      {/* Columna lateral */}
      <div className="space-y-5">
        <Card className="p-5 shadow-sm space-y-4">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary text-xl font-bold ring-2 ring-primary/20">
              {user.iniciales}
            </div>
            <div>
              <div className="font-semibold">{user.nombre_completo}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
            <UserRoleBadge rol={user.rol} />
          </div>
        </Card>

        <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
          <strong className="text-foreground block">Cuenta</strong>
          <div>Email: {user.email}</div>
          <div>Estado: {user.activo ? "Activo" : "Inactivo"}</div>
        </div>
      </div>
    </div>
  );
}
