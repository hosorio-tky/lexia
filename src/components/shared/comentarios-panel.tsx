"use client";

import { useState, useTransition, useRef } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Pencil, Send, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  crearComentario,
  editarComentario,
  eliminarComentario,
} from "@/app/actions/comentarios";
import { RichTextEditor, RichTextView } from "./rich-text-editor";
import type { Comentario } from "@/lib/repositories/comentarios";
import type { MentionUser } from "./mention-list";

interface ComentariosPanelProps {
  modulo:              string;
  recursoId:           string;
  userId:              string;
  initialComentarios:  Comentario[];
  users?:              MentionUser[];
}

/** Extrae los user_id de los nodos <span class="mention" data-id="..."> */
function extractMentionIds(html: string): string[] {
  const matches = [...html.matchAll(/data-id="([^"]+)"/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

export function ComentariosPanel({
  modulo,
  recursoId,
  userId,
  initialComentarios,
  users = [],
}: ComentariosPanelProps) {
  const [items, setItems]       = useState<Comentario[]>(initialComentarios);
  const [editingId, setEditing] = useState<string | null>(null);
  const [editHtml, setEditHtml] = useState("");
  const [newHtml, setNewHtml]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [, startTransition]     = useTransition();
  const editorKey               = useRef(0); // para resetear el editor

  // ── Crear ─────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newHtml.replace(/<[^>]+>/g, "").trim();
    if (!trimmed) return;

    setSaving(true);
    const fd = new FormData();
    fd.set("contenido",    newHtml);
    fd.set("modulo",       modulo);
    fd.set("recurso_id",   recursoId);
    fd.set("mention_ids",  extractMentionIds(newHtml).join(","));

    const res = await crearComentario(null, fd);
    setSaving(false);

    if (!res.error && res.comentario) {
      setItems((prev) => [...prev, res.comentario!]);
      setNewHtml("");
      editorKey.current += 1; // reinicia el editor
    }
  }

  // ── Editar ────────────────────────────────────────────────────
  function startEdit(c: Comentario) {
    setEditing(c.id);
    setEditHtml(c.contenido);
  }

  function cancelEdit() {
    setEditing(null);
    setEditHtml("");
  }

  function saveEdit(id: string) {
    const fd = new FormData();
    fd.set("contenido",   editHtml);
    fd.set("modulo",      modulo);
    fd.set("recurso_id",  recursoId);
    fd.set("mention_ids", extractMentionIds(editHtml).join(","));

    setItems((prev) =>
      prev.map((c) => c.id === id ? { ...c, contenido: editHtml, editado: true } : c)
    );
    setEditing(null);
    startTransition(() => { editarComentario(id, null, fd); });
  }

  // ── Eliminar ──────────────────────────────────────────────────
  function handleDelete(id: string) {
    setItems((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => eliminarComentario(id, modulo, recursoId));
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Lista */}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Sin comentarios todavía.</p>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const isOwn  = c.user_id === userId;
            const isEdit = editingId === c.id;

            return (
              <div key={c.id} className="group flex gap-3">
                {/* Avatar */}
                <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-bold ring-1 ring-primary/20">
                  {(c.user_nombre || "?")
                    .split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Cabecera */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium">{c.user_nombre}</span>
                      {c.editado && (
                        <span className="text-[10px] text-muted-foreground">(editado)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[11px] text-muted-foreground">
                        {format(parseISO(c.created_at), "d MMM · HH:mm", { locale: es })}
                      </span>
                      {isOwn && !isEdit && (
                        <div className="ml-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(c)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(c.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contenido / editor inline */}
                  {isEdit ? (
                    <div className="space-y-1.5">
                      <RichTextEditor
                        content={editHtml}
                        onChange={setEditHtml}
                        placeholder="Edita tu comentario…"
                        users={users}
                        minimal
                        minHeight="60px"
                      />
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 gap-1" onClick={() => saveEdit(c.id)}>
                          <Check className="h-3 w-3" /> Guardar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={cancelEdit}>
                          <X className="h-3 w-3" /> Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-muted/30 px-3 py-2">
                      <RichTextView html={c.contenido} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Separator />

      {/* Formulario nuevo comentario */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <div className="flex-1">
          <RichTextEditor
            key={editorKey.current}
            content={newHtml}
            onChange={setNewHtml}
            placeholder="Escribe un comentario… usa @ para mencionar"
            users={users}
            minimal
            minHeight="60px"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Escribe <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">@</kbd> para mencionar a alguien
          </p>
        </div>
        <Button type="submit" size="icon" disabled={saving} className="self-end mb-5">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
