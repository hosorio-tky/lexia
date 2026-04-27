"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Plus, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { actualizarDocumento, eliminarDocumento } from "@/app/actions/lexbase";
import { LEXBASE_TIPOS, type LexbaseCategoria, type LexbaseDocumento } from "@/types/lexbase";
import { cn } from "@/lib/utils";

interface LexbaseEditFormProps {
  documento:  LexbaseDocumento;
  categorias: LexbaseCategoria[];
}

const PAISES = [
  "El Salvador", "Guatemala", "Honduras", "Nicaragua", "Costa Rica",
  "Panamá", "México", "Colombia", "Argentina", "Chile", "Perú", "España", "Otro",
];

const ACCEPTED_TYPES = ".pdf,.docx,.doc,.txt";

export function LexbaseEditForm({ documento, categorias }: LexbaseEditFormProps) {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition]       = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [confirmDelete, setConfirmDelete]   = useState(false);

  const [dragOver, setDragOver]         = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Pre-fill from existing document
  const [tags, setTags]             = useState<string[]>(documento.tags ?? []);
  const [tagInput, setTagInput]     = useState("");
  const [tieneReformas, setTieneReformas] = useState(documento.tiene_reformas);
  const [tipo, setTipo]             = useState<string>(documento.tipo);
  const [categoriaId, setCategoriaId] = useState(documento.categoria_id ?? "");
  const [pais, setPais]             = useState(documento.pais ?? "El Salvador");

  function handleFile(file: File) { setSelectedFile(file); }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function addTag() {
    const val = tagInput.trim();
    if (val && !tags.includes(val)) setTags([...tags, val]);
    setTagInput("");
  }

  function removeTag(tag: string) { setTags(tags.filter((t) => t !== tag)); }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tipo", tipo);
    fd.set("categoria_id", categoriaId);
    fd.set("pais", pais);
    fd.set("tiene_reformas", String(tieneReformas));
    fd.set("tags", tags.join(","));
    if (selectedFile) fd.set("file", selectedFile);

    startTransition(() => {
      actualizarDocumento(documento.id, fd).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("NEXT_REDIRECT")) alert(`Error: ${msg}`);
      });
    });
  }

  function handleDelete() {
    startDeleteTransition(() => {
      eliminarDocumento(documento.id).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("NEXT_REDIRECT")) alert(`Error: ${msg}`);
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título <span className="text-destructive">*</span></Label>
            <Input
              id="titulo" name="titulo" required
              defaultValue={documento.titulo}
              placeholder="Ej. Código de Trabajo"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de documento</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEXBASE_TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {categorias.length > 0 && (
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin categoría</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="numero_oficial">Número oficial</Label>
            <Input
              id="numero_oficial" name="numero_oficial"
              defaultValue={documento.numero_oficial ?? ""}
              placeholder="Ej. D.L. 15, D.O. 142"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="organo_emisor">Órgano emisor</Label>
            <Input
              id="organo_emisor" name="organo_emisor"
              defaultValue={documento.organo_emisor ?? ""}
              placeholder="Ej. Asamblea Legislativa"
            />
          </div>

          <div className="space-y-1.5">
            <Label>País</Label>
            <Select value={pais} onValueChange={setPais}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAISES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fecha_publicacion">Fecha de publicación</Label>
            <Input
              id="fecha_publicacion" name="fecha_publicacion" type="date"
              defaultValue={documento.fecha_publicacion ?? ""}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fecha_vigencia">Fecha de vigencia</Label>
            <Input
              id="fecha_vigencia" name="fecha_vigencia" type="date"
              defaultValue={documento.fecha_vigencia ?? ""}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion" name="descripcion" rows={3}
              defaultValue={documento.descripcion ?? ""}
              placeholder="Resumen del contenido…"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Agregar tag y presionar Enter"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Tiene reformas</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTieneReformas(!tieneReformas)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  tieneReformas ? "bg-red-500" : "bg-muted"
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform",
                  tieneReformas ? "translate-x-6" : "translate-x-1"
                )} />
              </button>
              <span className="text-sm text-muted-foreground">
                {tieneReformas ? "Sí, tiene reformas" : "Sin reformas conocidas"}
              </span>
            </div>
          </div>

          {tieneReformas && (
            <div className="space-y-1.5">
              <Label htmlFor="reformas_descripcion">Descripción de reformas</Label>
              <Textarea
                id="reformas_descripcion" name="reformas_descripcion" rows={2}
                defaultValue={documento.reformas_descripcion ?? ""}
                placeholder="Descripción de las reformas aplicadas…"
              />
            </div>
          )}
        </div>
      </div>

      {/* File replacement */}
      <div className="space-y-1.5">
        <Label>
          {documento.storage_path ? "Reemplazar archivo" : "Agregar archivo"}{" "}
          <span className="text-xs text-muted-foreground font-normal">(opcional — PDF, DOCX, TXT)</span>
        </Label>
        {documento.storage_path && !selectedFile && (
          <p className="text-xs text-muted-foreground">
            Ya existe un archivo adjunto. Sube uno nuevo solo si quieres reemplazarlo.
          </p>
        )}
        <Card
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
          )}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileRef} type="file" accept={ACCEPTED_TYPES} className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {selectedFile ? (
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="ml-2 rounded-full p-1 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-7 w-7 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Arrastra el archivo aquí o haz clic para seleccionar
              </p>
            </>
          )}
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 border-t pt-4">
        {/* Delete */}
        <div>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-destructive">¿Eliminar definitivamente?</span>
              <Button
                type="button" variant="destructive" size="sm"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? "Eliminando…" : "Sí, eliminar"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              type="button" variant="ghost" size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Eliminar documento
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </form>
  );
}
