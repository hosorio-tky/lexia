"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserRoleBadge } from "./user-role-badge";
import { editarUsuario } from "@/app/actions/usuarios";
import { DepartamentoField } from "./departamento-field";
import { USER_ROLES, ROLE_LABELS } from "@/types/users";
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

export function UserEditClient({
  user,
  rolInvitador,
  departamentos = [],
}: {
  user: UserProfile;
  rolInvitador: string;
  departamentos?: string[];
}) {
  const router = useRouter();
  const [rol, setRol] = useState<string>(user.rol);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("rol", rol);
    start(async () => {
      try {
        await editarUsuario(user.id, fd);
        router.push(`/usuarios/${user.id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar cambios");
      }
    });
  }

  return (
    <Card className="p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-sm font-semibold">Datos del usuario</h2>
        <Separator className="mt-3" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required>
            <Input name="nombre" defaultValue={user.nombre} required />
          </Field>
          <Field label="Apellido">
            <Input name="apellido" defaultValue={user.apellido ?? ""} />
          </Field>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Correo electrónico</Label>
            <Input value={user.email} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">El correo no puede modificarse desde aquí.</p>
          </div>
          <Field label="Rol">
            <Select value={rol} onValueChange={setRol} disabled={rolInvitador !== "admin"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.filter((r) => rolInvitador === "admin" ? true : r !== "admin").map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rolInvitador !== "admin" && (
              <p className="text-xs text-muted-foreground">Solo un administrador puede cambiar el rol.</p>
            )}
          </Field>
          <Field label="Cargo">
            <Input name="cargo" defaultValue={user.cargo ?? ""} placeholder="Ej. Gerente Legal" />
          </Field>
          <Field label="Departamento">
            <DepartamentoField departamentos={departamentos} defaultValue={user.departamento} />
          </Field>
          <Field label="Teléfono">
            <Input name="telefono" defaultValue={user.telefono ?? ""} placeholder="Ej. +503 7000-0000" />
          </Field>
        </div>

        {/* Preview del rol */}
        <div className="rounded-lg border bg-muted/20 p-3 flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Permisos del rol:</span>
          <UserRoleBadge rol={rol as "admin" | "supervisor" | "usuario" | "solo_lectura"} />
          <span className="text-xs text-muted-foreground">
            {rol === "admin"        && "— acceso total, gestiona usuarios y configuración"}
            {rol === "supervisor"   && "— puede crear y editar, no eliminar"}
            {rol === "usuario"      && "— puede crear y editar permisos"}
            {rol === "solo_lectura" && "— solo puede ver información"}
          </span>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Link href={`/usuarios/${user.id}`}>
            <Button type="button" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
