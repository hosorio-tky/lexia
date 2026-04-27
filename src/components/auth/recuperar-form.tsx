"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { solicitarRecuperacion, actualizarContrasena } from "@/app/actions/auth";

// ─── Solicitar recuperación ───────────────────────────────────
export function RecuperarForm() {
  const [state, formAction, isPending] = useActionState(solicitarRecuperacion, {});

  if (state?.success) {
    return (
      <Card className="p-6 shadow-sm space-y-4 text-center">
        <div className="grid h-12 w-12 mx-auto place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <Mail className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-semibold">Revisa tu correo</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enviamos las instrucciones para restablecer tu contraseña.
            Revisa también la carpeta de spam.
          </p>
        </div>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al inicio de sesión
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-sm space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Recuperar contraseña</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Te enviaremos un enlace para restablecerla
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="tu@empresa.com"
            required
            autoComplete="email"
          />
        </div>

        {state?.error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          <Mail className="mr-2 h-4 w-4" />
          {isPending ? "Enviando…" : "Enviar enlace de recuperación"}
        </Button>
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio de sesión
      </Link>
    </Card>
  );
}

// ─── Actualizar contraseña (desde link de recuperación) ───────
export function ActualizarContrasenaForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, isPending] = useActionState(actualizarContrasena, {});

  if (state?.success) {
    return (
      <Card className="p-6 shadow-sm space-y-4 text-center">
        <div className="grid h-12 w-12 mx-auto place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <KeyRound className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-semibold">Contraseña actualizada</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tu contraseña fue actualizada correctamente.
          </p>
        </div>
        <Link href="/permisos">
          <Button className="w-full">Ir a la aplicación</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-sm space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Nueva contraseña</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Elige una contraseña segura de al menos 8 caracteres
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Nueva contraseña</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              required
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirmar contraseña</Label>
          <Input
            id="confirm"
            name="confirm"
            type={showPassword ? "text" : "password"}
            placeholder="Repite la contraseña"
            required
          />
        </div>

        {state?.error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          <KeyRound className="mr-2 h-4 w-4" />
          {isPending ? "Guardando…" : "Actualizar contraseña"}
        </Button>
      </form>
    </Card>
  );
}
