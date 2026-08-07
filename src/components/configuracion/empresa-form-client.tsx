"use client";

import { useState, useActionState } from "react";
import { Building2, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CatalogAddDialog } from "@/components/shared/catalog-add-dialog";
import { actualizarEmpresa } from "@/app/actions/configuracion";
import type { TenantSettings, CatalogoItem } from "@/types/settings";

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
  industrias: industriasProp = [],
  paises: paisesProp = [],
}: {
  settings: TenantSettings | null;
  industrias?: CatalogoItem[];
  paises?: CatalogoItem[];
}) {
  const [state, action, isPending] = useActionState(actualizarEmpresa, null);

  const [industriaItems, setIndustriaItems] = useState<CatalogoItem[]>(industriasProp);
  const [paisItems,      setPaisItems]      = useState<CatalogoItem[]>(paisesProp);
  const [industriaId,    setIndustriaId]    = useState(settings?.industria_id ?? "");
  const [paisId,         setPaisId]         = useState(settings?.pais_id ?? "");
  const [addIndustriaOpen, setAddIndustriaOpen] = useState(false);
  const [addPaisOpen,      setAddPaisOpen]      = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Información de la empresa</h2>
        <p className="text-sm text-muted-foreground">
          Datos generales de tu organización en Lexia.
        </p>
      </div>

      <form action={action} className="space-y-6">
        {/* Hidden inputs para los selects controlados */}
        <input type="hidden" name="industria_id" value={industriaId} />
        <input type="hidden" name="pais_id"      value={paisId} />

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
              <Select
                value={industriaId || "__none__"}
                onValueChange={(v) => {
                  if (v === "__add__") { setAddIndustriaOpen(true); return; }
                  setIndustriaId(v === "__none__" ? "" : v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar industria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin especificar</SelectItem>
                  {industriaItems.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.valor}</SelectItem>
                  ))}
                  <SelectItem value="__add__" className="text-primary font-medium">
                    <Plus className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />Agregar industria…
                  </SelectItem>
                </SelectContent>
              </Select>
              <CatalogAddDialog
                open={addIndustriaOpen}
                onOpenChange={setAddIndustriaOpen}
                title="Industrias"
                modulo="global"
                tipo="industria"
                onItemAdded={(item) => {
                  setIndustriaItems((prev) => [...prev, item]);
                  setIndustriaId(item.id);
                }}
              />
            </Field>

            <Field label="País">
              <Select
                value={paisId || "__none__"}
                onValueChange={(v) => {
                  if (v === "__add__") { setAddPaisOpen(true); return; }
                  setPaisId(v === "__none__" ? "" : v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar país" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin especificar</SelectItem>
                  {paisItems.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.valor}</SelectItem>
                  ))}
                  <SelectItem value="__add__" className="text-primary font-medium">
                    <Plus className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />Agregar país…
                  </SelectItem>
                </SelectContent>
              </Select>
              <CatalogAddDialog
                open={addPaisOpen}
                onOpenChange={setAddPaisOpen}
                title="Países"
                modulo="global"
                tipo="pais"
                onItemAdded={(item) => {
                  setPaisItems((prev) => [...prev, item]);
                  setPaisId(item.id);
                }}
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
