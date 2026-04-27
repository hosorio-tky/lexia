"use client";

import { useState, useRef, useTransition, useActionState } from "react";
import {
  FileText, FileImage, FileSpreadsheet, Upload,
  Trash2, Download, Eye, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { subirDocumento, eliminarDocumento, obtenerUrlFirmada } from "@/app/actions/documentos";
import type { Documento } from "@/lib/repositories/documentos";

// ─── Iconos por MIME ─────────────────────────────────────────

function DocIcon({ mime }: { mime: string | null }) {
  if (!mime) return <FileText className="h-5 w-5 text-muted-foreground" />;
  if (mime.startsWith("image/"))
    return <FileImage className="h-5 w-5 text-blue-500" />;
  if (mime.includes("spreadsheet") || mime.includes("excel"))
    return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
  if (mime === "application/pdf")
    return <FileText className="h-5 w-5 text-red-500" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Componente principal ─────────────────────────────────────

interface DocumentosPanelProps {
  modulo: string;
  recursoId: string;
  initialDocs: Documento[];
}

export function DocumentosPanel({
  modulo,
  recursoId,
  initialDocs,
}: DocumentosPanelProps) {
  const [docs, setDocs]         = useState<Documento[]>(initialDocs);
  const [isDragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition]     = useTransition();

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadError(null);

    const fd = new FormData();
    fd.set("file", file);
    fd.set("modulo", modulo);
    fd.set("recurso_id", recursoId);

    const res = await subirDocumento(null, fd);
    setUploading(false);

    if (res.error) {
      setUploadError(res.error);
    } else {
      // Refresh: recargar la lista sumando el archivo subido como optimista
      setDocs((prev) => [
        {
          id:                crypto.randomUUID(),
          tenant_id:         "",
          modulo,
          recurso_id:        recursoId,
          nombre:            file.name,
          tipo_mime:         file.type,
          tamano:            file.size,
          storage_path:      "",
          subido_por:        null,
          subido_por_nombre: null,
          created_at:        new Date().toISOString(),
        },
        ...prev,
      ]);
      // Recarga real en background (revalidatePath hará el refresco)
      window.location.reload();
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  async function handleView(doc: Documento) {
    const { url, error } = await obtenerUrlFirmada(doc.storage_path);
    if (error || !url) return;
    window.open(url, "_blank");
  }

  async function handleDownload(doc: Documento) {
    const { url, error } = await obtenerUrlFirmada(doc.storage_path);
    if (error || !url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.nombre;
    a.click();
  }

  function handleDelete(doc: Documento) {
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    startTransition(() =>
      eliminarDocumento(doc.id, doc.storage_path, modulo, recursoId)
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-6 w-6 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">
            Arrastra archivos aquí o{" "}
            <span className="text-primary underline underline-offset-2">
              selecciona
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            PDF, DOCX, XLSX, JPG, PNG · Máx. 20 MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.xlsx,.doc,.xls,.jpg,.jpeg,.png,.webp"
          onChange={handleFileChange}
        />
      </div>

      {uploading && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Subiendo…</p>
          <Progress value={undefined} className="h-1 animate-pulse" />
        </div>
      )}

      {uploadError && (
        <p className="text-sm text-destructive">{uploadError}</p>
      )}

      {/* Lista de documentos */}
      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-1">Sin documentos adjuntos.</p>
      ) : (
        <div className="divide-y rounded-xl border overflow-hidden">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center gap-3 bg-card px-3 py-2.5 hover:bg-muted/30 transition-colors"
            >
              <DocIcon mime={doc.tipo_mime} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.nombre}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(doc.tamano)}
                  {doc.subido_por_nombre && ` · ${doc.subido_por_nombre}`}
                  {" · "}
                  {format(parseISO(doc.created_at), "d MMM yyyy", { locale: es })}
                </p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                {(doc.tipo_mime?.startsWith("image/") || doc.tipo_mime === "application/pdf") && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver" onClick={() => handleView(doc)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Descargar" onClick={() => handleDownload(doc)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  title="Eliminar"
                  onClick={() => handleDelete(doc)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
