"use client";

import { useState, useRef, useTransition } from "react";
import {
  FileText, FileImage, FileSpreadsheet, Paperclip,
  Trash2, Download, Eye, X, Plus, Pencil, Check, ChevronDown, ChevronUp,
} from "lucide-react";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { RichTextEditor, RichTextView } from "./rich-text-editor";
import { crearNota, editarNota, eliminarNota, eliminarDocumentoDeNota, obtenerUrlSubida, registrarDocumento } from "@/app/actions/notas";
import type { Nota } from "@/lib/repositories/notas";
import type { Documento } from "@/lib/repositories/documentos";
import type { MentionUser } from "./mention-list";

function extractMentionIds(html: string): string[] {
  const matches = [...html.matchAll(/data-id="([^"]+)"/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

// ─── Upload directo al Storage (browser → Supabase, sin pasar por Next.js) ──
async function uploadViaSupabase(
  file: File,
  notaId: string,
  modulo: string,
  recursoId: string,
): Promise<{ error?: string; docId?: string; storagePath?: string; createdAt?: string }> {
  const ext = file.name.split(".").pop() ?? "bin";

  // 1. Pedir URL pre-firmada al servidor
  const { signedUrl, storagePath, error: urlError } =
    await obtenerUrlSubida({ modulo, recursoId, fileName: file.name, fileExt: ext });

  if (urlError || !signedUrl || !storagePath) {
    return { error: urlError ?? "No se pudo obtener URL de subida" };
  }

  // 2. Subir el archivo directo desde el browser a Supabase Storage
  const uploadRes = await fetch(signedUrl, {
    method:  "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body:    file,
  });

  if (!uploadRes.ok) {
    const body = await uploadRes.json().catch(() => ({})) as { message?: string };
    return { error: body.message ?? `Error al subir archivo (${uploadRes.status})` };
  }

  // 3. Registrar metadatos en la BD y obtener el ID real
  const { error: dbError, docId, createdAt } = await registrarDocumento({
    notaId,
    modulo,
    recursoId,
    storagePath,
    nombre:   file.name,
    tipoMime: file.type,
    tamano:   file.size,
  });

  return { error: dbError, docId, storagePath, createdAt };
}

// ─── Utilidades ───────────────────────────────────────────────

function DocIcon({ mime }: { mime: string | null }) {
  if (!mime) return <FileText className="h-4 w-4 text-muted-foreground" />;
  if (mime.startsWith("image/")) return <FileImage className="h-4 w-4 text-blue-500" />;
  if (mime.includes("spreadsheet") || mime.includes("excel")) return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
  if (mime === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function initials(nombre: string) {
  return nombre.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Fila de documento adjunto ────────────────────────────────

function DocRow({
  doc,
  modulo,
  recursoId,
  onDelete,
}: {
  doc: Documento;
  modulo: string;
  recursoId: string;
  onDelete: (doc: Documento) => void;
}) {
  const [rowError, setRowError] = useState<string | null>(null);

  function buildUrl(forDownload: boolean): string | null {
    if (!doc.storage_path) {
      setRowError("Ruta no disponible — recarga la página");
      return null;
    }
    setRowError(null);
    const params = new URLSearchParams({ path: doc.storage_path });
    if (forDownload) {
      params.set("dl", "1");
      params.set("name", doc.nombre);
    }
    return `/api/download?${params.toString()}`;
  }

  function handleView() {
    const url = buildUrl(false);
    if (url) window.open(url, "_blank");
  }

  function handleDownload() {
    const url = buildUrl(true);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="rounded-lg border bg-muted/30 transition-colors hover:bg-muted/60">
      <div className="group flex items-center gap-2 px-2.5 py-1.5">
        <DocIcon mime={doc.tipo_mime} />
        <span className="flex-1 truncate text-xs font-medium">{doc.nombre}</span>
        <span className="text-[11px] text-muted-foreground shrink-0">{formatBytes(doc.tamano)}</span>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {(doc.tipo_mime?.startsWith("image/") || doc.tipo_mime === "application/pdf") && (
            <button
              type="button"
              onClick={handleView}
              className="grid h-6 w-6 place-items-center rounded hover:bg-background"
              title="Ver"
            >
              <Eye className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="grid h-6 w-6 place-items-center rounded hover:bg-background"
            title="Descargar"
          >
            <Download className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(doc)}
            className="grid h-6 w-6 place-items-center rounded hover:bg-background"
            title="Eliminar"
          >
            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>
      {rowError && (
        <p className="px-2.5 pb-1.5 text-[11px] text-destructive">{rowError}</p>
      )}
    </div>
  );
}

// ─── Selector de archivos inline ──────────────────────────────

function FileSelector({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nuevos = Array.from(e.target.files ?? []);
    onChange([...files, ...nuevos]);
    e.target.value = "";
  }

  function remove(i: number) {
    onChange(files.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-1.5">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs"
            >
              <DocIcon mime={f.type} />
              <span className="max-w-[140px] truncate">{f.name}</span>
              <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Paperclip className="h-3.5 w-3.5" />
        Adjuntar archivo
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.docx,.xlsx,.doc,.xls,.jpg,.jpeg,.png,.webp"
        onChange={handleChange}
      />
    </div>
  );
}

// ─── Tarjeta de una nota ──────────────────────────────────────

function NotaCard({
  nota,
  modulo,
  recursoId,
  onDelete,
  users = [],
}: {
  nota: Nota;
  modulo: string;
  recursoId: string;
  onDelete: (id: string) => void;
  users?: MentionUser[];
}) {
  const [editing, setEditing]       = useState(false);
  const [editContent, setEditContent] = useState(nota.contenido);
  const [docs, setDocs]             = useState<Documento[]>(nota.documentos ?? []);
  const [docsOpen, setDocsOpen]     = useState(true);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ini = initials(nota.user_nombre);
  const relTime = formatDistanceToNow(new Date(nota.created_at), { addSuffix: true, locale: es });
  const absTime = format(parseISO(nota.created_at), "d MMM yyyy, HH:mm", { locale: es });

  function handleSaveEdit() {
    if (!editContent.trim() || editContent === "<p></p>") return;
    const fd = new FormData();
    fd.set("contenido",   editContent);
    fd.set("modulo",      modulo);
    fd.set("recurso_id",  recursoId);
    fd.set("mention_ids", extractMentionIds(editContent).join(","));
    startTransition(() => { editarNota(nota.id, null, fd); });
    setEditing(false);
  }

  function handleDeleteDoc(doc: Documento) {
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    startTransition(() => {
      eliminarDocumentoDeNota(doc.id, doc.storage_path, modulo, recursoId);
    });
  }

  async function handleAddFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // Placeholder optimista mientras sube
    const tempId = `temp-${Date.now()}`;
    const tempDoc: Documento = {
      id: tempId,
      tenant_id: "", modulo, recurso_id: recursoId,
      nota_id: nota.id, nombre: file.name,
      tipo_mime: file.type, tamano: file.size,
      storage_path: "", subido_por: null, subido_por_nombre: null,
      created_at: new Date().toISOString(),
    };
    setDocs((prev) => [...prev, tempDoc]);

    try {
      const { error, docId, storagePath, createdAt } =
        await uploadViaSupabase(file, nota.id, modulo, recursoId);

      if (error || !docId || !storagePath) {
        setDocs((prev) => prev.filter((d) => d.id !== tempId));
        console.error("[notas-panel] handleAddFile error:", error);
        alert(`Error al subir "${file.name}": ${error ?? "datos incompletos"}`);
      } else {
        // Reemplazar placeholder con el documento real (storage_path correcto para ver/descargar)
        setDocs((prev) => prev.map((d) =>
          d.id === tempId
            ? { ...d, id: docId, storage_path: storagePath, created_at: createdAt ?? d.created_at }
            : d
        ));
      }
    } catch (err) {
      setDocs((prev) => prev.filter((d) => d.id !== tempId));
      console.error("[notas-panel] handleAddFile exception:", err);
      alert(`Error inesperado al subir el archivo`);
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-2.5 px-4 pt-3 pb-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
          {ini}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{nota.user_nombre}</span>
            <span className="text-xs text-muted-foreground" title={absTime}>{relTime}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="grid h-7 w-7 place-items-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(nota.id)}
            className="grid h-7 w-7 place-items-center rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
            title="Eliminar nota"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="px-4 pb-3">
        {editing ? (
          <div className="space-y-2">
            <RichTextEditor
              content={editContent}
              onChange={setEditContent}
              minHeight="80px"
              users={users}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit} disabled={isPending}>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditContent(nota.contenido); }}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <RichTextView html={nota.contenido} />
        )}
      </div>

      {/* Documentos adjuntos */}
      {(docs.length > 0 || true) && (
        <div className="border-t bg-muted/20 px-4 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <button
              type="button"
              onClick={() => setDocsOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Paperclip className="h-3.5 w-3.5" />
              {docs.length > 0 ? `${docs.length} archivo${docs.length !== 1 ? "s" : ""}` : "Sin archivos"}
              {docsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Adjuntar archivo"
            >
              <Plus className="h-3.5 w-3.5" />
              Adjuntar
            </button>
            <input ref={fileInputRef} type="file" className="hidden"
              accept=".pdf,.docx,.xlsx,.doc,.xls,.jpg,.jpeg,.png,.webp"
              onChange={handleAddFile}
            />
          </div>
          {docsOpen && docs.length > 0 && (
            <div className="space-y-1.5">
              {docs.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  modulo={modulo}
                  recursoId={recursoId}
                  onDelete={handleDeleteDoc}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Formulario nueva nota ────────────────────────────────────

function NuevaNotaForm({
  modulo,
  recursoId,
  onCreated,
  onCancel,
  users = [],
}: {
  modulo: string;
  recursoId: string;
  onCreated: (nota: Nota) => void;
  onCancel: () => void;
  users?: MentionUser[];
}) {
  const [contenido, setContenido] = useState("");
  const [files, setFiles]         = useState<File[]>([]);
  const [error, setError]         = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contenido.trim() || contenido === "<p></p>") {
      setError("La nota no puede estar vacía");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      // Paso 1: crear la nota (sin archivos)
      const fd = new FormData();
      fd.set("modulo",      modulo);
      fd.set("recurso_id",  recursoId);
      fd.set("contenido",   contenido);
      fd.set("mention_ids", extractMentionIds(contenido).join(","));

      const res = await crearNota(null, fd);

      if (res.error || !res.nota) {
        setError(res.error ?? "Error al crear la nota");
        return;
      }

      // Paso 2: subir archivos
      const docsSubidos: Documento[] = [];

      for (const file of files) {
        const { error: uploadErr, docId, storagePath, createdAt } =
          await uploadViaSupabase(file, res.nota.id, modulo, recursoId);

        if (uploadErr) {
          console.error(`[notas-panel] upload error for "${file.name}":`, uploadErr);
          setError(`Error al subir "${file.name}": ${uploadErr}`);
        } else if (docId && storagePath) {
          docsSubidos.push({
            id: docId,
            tenant_id: "", modulo, recurso_id: recursoId,
            nota_id: res.nota.id, nombre: file.name,
            tipo_mime: file.type, tamano: file.size,
            storage_path: storagePath,
            subido_por: null, subido_por_nombre: null,
            created_at: createdAt ?? new Date().toISOString(),
          });
        }
      }

      // Mostrar la nota con todos los archivos que subieron correctamente
      onCreated({ ...res.nota, documentos: docsSubidos });
    } catch (err) {
      console.error("[notas-panel] handleSubmit exception:", err);
      setError(err instanceof Error ? err.message : "Error inesperado al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <RichTextEditor
          content={contenido}
          onChange={setContenido}
          placeholder="Escribe una nota… usa @ para mencionar"
          minHeight="100px"
          users={users}
        />
      </div>
      <div className="border-t bg-muted/20 px-4 py-2.5 space-y-2">
        <FileSelector files={files} onChange={setFiles} />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Guardando…" : "Guardar nota"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
}

// ─── Panel principal ──────────────────────────────────────────

interface NotasPanelProps {
  modulo:       string;
  recursoId:    string;
  initialNotas: Nota[];
  users?:       MentionUser[];
}

export function NotasPanel({ modulo, recursoId, initialNotas, users = [] }: NotasPanelProps) {
  const [notas, setNotas]       = useState<Nota[]>(initialNotas);
  const [adding, setAdding]     = useState(false);
  const [, startTransition]     = useTransition();

  function handleCreated(nota: Nota) {
    setNotas((prev) => [nota, ...prev]);
    setAdding(false);
  }

  function handleDelete(id: string) {
    setNotas((prev) => prev.filter((n) => n.id !== id));
    startTransition(() => eliminarNota(id, modulo, recursoId));
  }

  return (
    <div className="space-y-4">
      {/* Botón agregar */}
      {!adding && (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nueva nota
        </Button>
      )}

      {/* Formulario nueva nota */}
      {adding && (
        <NuevaNotaForm
          modulo={modulo}
          recursoId={recursoId}
          onCreated={handleCreated}
          onCancel={() => setAdding(false)}
          users={users}
        />
      )}

      {/* Lista de notas */}
      {notas.length === 0 && !adding ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p>Sin notas aún. Agrega una para dejar contexto o adjuntar documentos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notas.map((nota) => (
            <NotaCard
              key={nota.id}
              nota={nota}
              modulo={modulo}
              recursoId={recursoId}
              onDelete={handleDelete}
              users={users}
            />
          ))}
        </div>
      )}
    </div>
  );
}
