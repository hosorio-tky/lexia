"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registrar } from "@/app/actions/auth";

export function RegistroForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, isPending] = useActionState(registrar, null);

  return (
    <Card className="p-6 shadow-sm space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Empieza tu prueba gratuita de Lexia
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="empresa">Nombre de la empresa</Label>
          <Input
            id="empresa"
            name="empresa"
            placeholder="Ej. Grupo Empresarial S.A."
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nombre">Tu nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej. Ana López"
            required
            autoComplete="name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="ana@empresa.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              required
              autoComplete="new-password"
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
          <UserPlus className="mr-2 h-4 w-4" />
          {isPending ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Al crear una cuenta aceptas nuestros{" "}
        <span className="text-foreground">Términos de Servicio</span>.
      </p>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </Card>
  );
}
