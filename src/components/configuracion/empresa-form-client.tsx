"use client";

import { useActionState } from "react";
import { Building2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { actualizarEmpresa } from "@/app/actions/configuracion";
import type { TenantSettings } from "@/types/settings";

const INDUSTRIAS = [
  "Alimentos y Bebidas",
  "Manufactura",
  "Servicios Financieros",
  "Salud y Farmacéutica",
  "Construcción y Inmobiliaria",
  "Tecnología",
  "Comercio y Retail",
  "Transporte y Logística",
  "Energía y Utilities",
  "Educación",
  "Agropecuario",
  "Otro",
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function EmpresaFormClient({
  settings,
}: {
  settings: TenantSettings | null;
}) {
  const [state, action, isPending] = useActionState(actualizarEmpresa, null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Información de la empresa</h2>
        <p className="text-sm text-muted-foreground">
          Datos generales de tu organización en Lexia.
        </p>
      </div>

      <form action={action} className="space-y-6">
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{settings?.nombre ?? "Mi empresa"}</p>
              <p className="text-xs text-muted-foreground">@{settings?.slug}</p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nombre de la empresa">
                <Input
                  name="nombre"
                  defaultValue={settings?.nombre}
                  placeholder="Nombre legal de tu empresa"
                />
              </Field>
            </div>

            <Field label="Industria">
              <select
                name="industria"
                defaultValue={settings?.industria ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Seleccionar industria</option>
                {INDUSTRIAS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </Field>

            <Field label="País">
              <Input
                name="pais"
                defaultValue={settings?.pais ?? "El Salvador"}
                placeholder="País de operación"
              />
            </Field>

            <Field label="Sitio web">
              <Input
                name="sitio_web"
                type="url"
                defaultValue={settings?.sitio_web}
                placeholder="https://tuempresa.com"
              />
            </Field>

            <Field label="URL del logo">
              <Input
                name="logo_url"
                type="url"
                defaultValue={settings?.logo_url}
                placeholder="https://tuempresa.com/logo.png"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Descripción">
                <Textarea
                  name="descripcion"
                  defaultValue={settings?.descripcion}
                  placeholder="Breve descripción de la empresa y su actividad principal…"
                  rows={3}
                />
              </Field>
            </div>

            <Field label="Color de marca">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="color_marca"
                  defaultValue={settings?.color_marca ?? "#6366f1"}
                  className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
                />
                <span className="text-xs text-muted-foreground">
                  Color principal usado en la interfaz
                </span>
              </div>
            </Field>
          </div>
        </Card>

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-emerald-600">Cambios guardados correctamente.</p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
