"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
} from "@/app/actions/lexbase";
import type { LexbaseCategoria } from "@/types/lexbase";

const PRESET_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#06b6d4", // cyan
  "#64748b", // slate
  "#78716c", // stone
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: color,
            borderColor: value === color ? "black" : "transparent",
          }}
          title={color}
        />
      ))}
    </div>
  );
}

interface EditRowProps {
  categoria?: LexbaseCategoria;
  onCancel: () => void;
  onSaved: () => void;
}

function EditRow({ categoria, onCancel, onSaved }: EditRowProps) {
  const [nombre, setNombre]   = useState(categoria?.nombre ?? "");
  const [color, setColor]     = useState(categoria?.color ?? "#6366f1");
  const [desc, setDesc]       = useState(categoria?.descripcion ?? "");
  const [isPending, start]    = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("nombre", nombre);
    fd.set("color", color);
    fd.set("descripcion", desc);

    start(async () => {
      try {
        if (categoria) {
          await actualizarCategoria(categoria.id, fd);
        } else {
          await crearCategoria(fd);
        }
        onSaved();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("NEXT_REDIRECT")) alert(`Error: ${msg}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Nombre</Label>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la categoría"
            className="h-8 text-sm"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Descripción (opcional)</Label>
          <Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Descripción breve"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Color</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" />
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          <Check className="h-4 w-4 mr-1" />
          {isPending ? "Guardando…" : categoria ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}

interface LexbaseCategoriaManagerProps {
  initialCategorias: LexbaseCategoria[];
}

export function LexbaseCategoriaManager({
  initialCategorias,
}: LexbaseCategoriaManagerProps) {
  const [adding, setAdding]         = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta categoría? Los documentos no se eliminarán.")) return;
    startTransition(async () => {
      await eliminarCategoria(id);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Categorías ({initialCategorias.length})</h3>
        {!adding && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nueva categoría
          </Button>
        )}
      </div>

      {adding && (
        <EditRow
          onCancel={() => setAdding(false)}
          onSaved={() => setAdding(false)}
        />
      )}

      <div className="space-y-2">
        {initialCategorias.map((cat) => (
          <div key={cat.id}>
            {editingId === cat.id ? (
              <EditRow
                categoria={cat}
                onCancel={() => setEditingId(null)}
                onSaved={() => setEditingId(null)}
              />
            ) : (
              <Card className="flex items-center justify-between p-3 shadow-none">
                <div className="flex items-center gap-3">
                  <span
                    className="h-5 w-5 rounded-full shrink-0 ring-1 ring-black/10"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div>
                    <p className="text-sm font-medium">{cat.nombre}</p>
                    {cat.descripcion && (
                      <p className="text-xs text-muted-foreground">{cat.descripcion}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setEditingId(cat.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(cat.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            )}
          </div>
        ))}

        {initialCategorias.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground text-center py-6 rounded-xl border border-dashed">
            Aún no hay categorías. Crea la primera.
          </p>
        )}
      </div>
    </div>
  );
}
