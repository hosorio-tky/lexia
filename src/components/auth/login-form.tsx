"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/app/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [showPassword, setShowPassword] = useState(false);

  const actionWithNext = async (_prev: unknown, formData: FormData) => {
    if (next) formData.set("next", next);
    return signIn(_prev, formData);
  };

  const [state, formAction, isPending] = useActionState(actionWithNext, null);

  return (
    <Card className="p-6 shadow-sm space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ingresa a tu cuenta de Lexia
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link
              href="/recuperar"
              className="text-xs text-muted-foreground hover:text-foreground transition"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword
                ? <EyeOff className="h-4 w-4" />
                : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {state?.error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          <LogIn className="mr-2 h-4 w-4" />
          {isPending ? "Iniciando sesión…" : "Iniciar sesión"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-primary hover:underline">
          Crear cuenta
        </Link>
      </p>
    </Card>
  );
}
