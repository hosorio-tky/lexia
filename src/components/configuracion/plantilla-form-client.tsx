"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Button }    from "@/components/ui/button";
import { Card }      from "@/components/ui/card";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { Textarea }  from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { CatalogAddDialog } from "@/components/shared/catalog-add-dialog";
import type { ContratoPlantilla } from "@/lib/repositories/contrato-plantillas";
import type { CatalogoItem } from "@/types/settings";

interface PlantillaFormClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (_prev: any, formData: FormData) => Promise<any>;
  mode: "create" | "edit";
  defaultValues?: Partial<ContratoPlantilla>;
  backHref: string;
  tiposContrato?: CatalogoItem[];
}

export function PlantillaFormClient({
  action,
  mode,
  defaultValues,
  backHref,
  tiposContrato = [],
}: PlantillaFormClientProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError]            = useState<string | null>(null);
  const [tipo, setTipo]              = useState(defaultValues?.tipo ?? "__none__");
  const [contenidoHtml, setContenidoHtml] = useState(defaultValues?.contenido_html ?? "");
  const [tipoItems, setTipoItems]    = useState<CatalogoItem[]>(tiposContrato);
  const [addTipoOpen, setAddTipoOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("contenido_html", contenidoHtml);
    if (tipo && tipo !== "__none__") fd.set("tipo", tipo);
    else fd.delete("tipo");

    startTransition(async () => {
      const result = await action(null, fd);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Plantillas
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {mode === "create" ? "Nueva plantilla" : "Editar plantilla"}
        </h1>
        <Button type="submit" size="sm" disabled={isPending}>
          <Save className="mr-1.5 h-4 w-4" />
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {mode === "edit" && defaultValues?.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}

      <Card className="p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold">Información general</h2>
          <Separator className="mt-3" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              name="nombre"
              placeholder="Ej. NDA estándar, Contrato de Servicio Tecnología"
              defaultValue={defaultValues?.nombre}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de contrato</Label>
            <Select
              value={tipo}
              onValueChange={(v) => {
                if (v === "__add__") { setAddTipoOpen(true); return; }
                setTipo(v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin tipo específico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin tipo específico</SelectItem>
                {tipoItems.map((t) => (
                  <SelectItem key={t.id} value={t.valor}>{t.valor}</SelectItem>
                ))}
                <SelectItem value="__add__" className="text-primary font-medium">
                  + Agregar tipo…
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Filtra la plantilla al crear contratos de ese tipo.
            </p>
            <CatalogAddDialog
              open={addTipoOpen}
              onOpenChange={setAddTipoOpen}
              title="Nuevo tipo de contrato"
              modulo="contratos"
              tipo="tipo"
              onItemAdded={(item) => {
                setTipoItems((prev) => [...prev, item]);
                setTipo(item.valor);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea
              name="descripcion"
              placeholder="Uso previsto de esta plantilla…"
              defaultValue={defaultValues?.descripcion ?? ""}
              rows={2}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold">Contenido de la plantilla</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Usa <code className="bg-muted px-1 py-0.5 rounded text-xs">{`{{NOMBRE_VARIABLE}}`}</code> para marcar los campos que la IA completará.
            Ejemplo: <code className="bg-muted px-1 py-0.5 rounded text-xs">{`{{CONTRAPARTE}}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">{`{{PERIODO}}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">{`{{MONTO}}`}</code>.
          </p>
          <Separator className="mt-3" />
        </div>
        <RichTextEditor
          content={contenidoHtml}
          onChange={setContenidoHtml}
          placeholder="Escribe el contenido base del contrato. Usa {{VARIABLE}} donde la IA deba completar información…"
          minHeight="400px"
        />
      </Card>

      <div className="flex justify-end gap-3">
        <Link href={backHref}>
          <Button type="button" variant="outline">Cancelar</Button>
        </Link>
        <Button type="submit" disabled={isPending}>
          <Save className="mr-1.5 h-4 w-4" />
          {isPending ? "Guardando…" : mode === "create" ? "Crear plantilla" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
