"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { UserRoleBadge } from "./user-role-badge";
import { invitarUsuario } from "@/app/actions/usuarios";
import { USER_ROLES, ROLE_LABELS } from "@/types/users";

export function UserInviteForm() {
  const [rol, setRol] = useState("usuario");

  const actionWithRol = async (_prev: unknown, formData: FormData) => {
    formData.set("rol", rol);
    return invitarUsuario(_prev, formData);
  };

  const [state, formAction, isPending] = useActionState(actionWithRol, {});

  // ── Éxito: email enviado ───────────────────────────────────
  if (state?.success) {
    return (
      <Card className="p-6 shadow-sm space-y-5">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <Mail className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-semibold">Invitación enviada</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Se envió un correo de activación a{" "}
            <span className="font-medium text-foreground">{state.email}</span>.
            El usuario debe hacer clic en el enlace para establecer su contraseña.
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          💡 En entorno local, el correo llega a{" "}
          <a
            href="http://127.0.0.1:54324"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Mailpit
          </a>
          .
        </div>
        <div className="flex gap-2">
          <Link href="/usuarios/invitar">
            <Button variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Invitar otro
            </Button>
          </Link>
          <Link href="/usuarios">
            <Button>Ver usuarios</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-sm font-semibold">Datos del usuario</h2>
        <Separator className="mt-3" />
      </div>

      <form action={formAction} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre <span className="text-destructive">*</span></Label>
            <Input id="nombre" name="nombre" placeholder="Ej. Juan" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apellido">Apellido</Label>
            <Input id="apellido" name="apellido" placeholder="Ej. Pérez" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="email">Correo electrónico <span className="text-destructive">*</span></Label>
            <Input id="email" name="email" type="email" placeholder="juan@empresa.com" required />
          </div>
          <div className="space-y-1.5">
            <Label>Rol <span className="text-destructive">*</span></Label>
            <Select value={rol} onValueChange={setRol}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.filter((r) => r !== "admin").map((r) => (
                  <SelectItem key={r} value={r}>
                    <span className="flex items-center gap-2">
                      {ROLE_LABELS[r]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cargo">Cargo</Label>
            <Input id="cargo" name="cargo" placeholder="Ej. Gerente Legal" />
          </div>
        </div>

        {/* Preview del rol */}
        <div className="rounded-lg border bg-muted/20 p-3 flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Permisos del rol:</span>
          <UserRoleBadge rol={rol as "admin" | "supervisor" | "usuario" | "solo_lectura"} />
          <span className="text-xs text-muted-foreground">
            {rol === "supervisor"  && "— puede crear y editar, no eliminar"}
            {rol === "usuario"     && "— puede crear y editar permisos"}
            {rol === "solo_lectura" && "— solo puede ver información"}
          </span>
        </div>

        {state?.error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Link href="/usuarios">
            <Button type="button" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={isPending}>
            <UserPlus className="mr-2 h-4 w-4" />
            {isPending ? "Invitando…" : "Invitar usuario"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
