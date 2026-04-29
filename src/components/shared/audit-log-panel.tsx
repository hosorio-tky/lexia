"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  FileText, MessageSquare, Pencil, Plus,
  RefreshCw, Trash2, Upload, User,
} from "lucide-react";
import type { ActividadEntry } from "@/lib/repositories/actividad";

// ─── Metadatos de cada acción ─────────────────────────────────
const ACCION_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
}> = {
  // ── Permisos ──────────────────────────────────────────────────
  crear_permiso:           { label: "Permiso creado",          icon: Plus,           color: "text-emerald-600 bg-emerald-50" },
  editar_permiso:          { label: "Permiso editado",         icon: Pencil,         color: "text-blue-600 bg-blue-50" },
  cambiar_estado:          { label: "Estado cambiado",         icon: RefreshCw,      color: "text-indigo-600 bg-indigo-50" },
  eliminar_permiso:        { label: "Permiso eliminado",       icon: Trash2,         color: "text-red-600 bg-red-50" },
  // ── Contratos ────────────────────────────────────────────────
  crear_contrato:          { label: "Contrato creado",         icon: Plus,           color: "text-emerald-600 bg-emerald-50" },
  editar_contrato:         { label: "Contrato editado",        icon: Pencil,         color: "text-blue-600 bg-blue-50" },
  cambiar_estado_contrato: { label: "Estado cambiado",         icon: RefreshCw,      color: "text-indigo-600 bg-indigo-50" },
  eliminar_contrato:       { label: "Contrato eliminado",      icon: Trash2,         color: "text-red-600 bg-red-50" },
  // ── Compartidos ──────────────────────────────────────────────
  agregar_comentario:      { label: "Comentario agregado",     icon: MessageSquare,  color: "text-slate-600 bg-slate-100" },
  editar_comentario:       { label: "Comentario editado",      icon: MessageSquare,  color: "text-slate-500 bg-slate-50" },
  eliminar_comentario:     { label: "Comentario eliminado",    icon: Trash2,         color: "text-slate-500 bg-slate-50" },
  subir_documento:         { label: "Documento subido",        icon: Upload,         color: "text-violet-600 bg-violet-50" },
  eliminar_documento:      { label: "Documento eliminado",     icon: Trash2,         color: "text-red-500 bg-red-50" },
};

const DEFAULT_CONFIG = {
  label: "Actividad",
  icon: FileText,
  color: "text-muted-foreground bg-muted",
};

// ─── Renderizar detalle por acción ────────────────────────────
function ActionDetail({ accion, metadata }: { accion: string; metadata: Record<string, unknown> | null }) {
  if (!metadata) return null;

  if (accion === "editar_permiso" || accion === "editar_contrato") {
    const cambios = metadata.cambios as Array<{ campo: string; de: string | null; a: string | null }> | undefined;
    if (!cambios?.length) return null;
    return (
      <ul className="mt-1.5 space-y-0.5">
        {cambios.map((c, i) => (
          <li key={i} className="flex flex-wrap gap-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{c.campo}:</span>
            <span className="line-through opacity-60">{c.de ?? "—"}</span>
            <span className="text-muted-foreground">→</span>
            <span>{c.a ?? "—"}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (accion === "cambiar_estado" || accion === "cambiar_estado_contrato") {
    const { estado_anterior, estado_nuevo, comentario } = metadata as {
      estado_anterior?: string | null;
      estado_nuevo?: string;
      comentario?: string | null;
    };
    return (
      <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5">
        {estado_anterior && (
          <p>
            <span className="line-through opacity-60">{estado_anterior}</span>
            {" → "}
            <span className="font-medium text-foreground">{estado_nuevo}</span>
          </p>
        )}
        {comentario && <p className="italic">"{comentario}"</p>}
      </div>
    );
  }

  if (accion === "subir_documento") {
    const { nombre, tamano } = metadata as { nombre?: string; tamano?: number };
    if (!nombre) return null;
    const kb = tamano ? ` (${(tamano / 1024).toFixed(0)} KB)` : "";
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        {nombre}{kb}
      </p>
    );
  }

  return null;
}

// ─── Fila de actividad ────────────────────────────────────────
function AuditRow({ entry }: { entry: ActividadEntry }) {
  const cfg = ACCION_CONFIG[entry.accion] ?? DEFAULT_CONFIG;
  const Icon = cfg.icon;

  const initials = entry.user_nombre
    ? entry.user_nombre
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  const relTime = formatDistanceToNow(new Date(entry.created_at), {
    addSuffix: true,
    locale: es,
  });

  const absTime = new Date(entry.created_at).toLocaleString("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex gap-3">
      {/* Icono de acción */}
      <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${cfg.color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium">{cfg.label}</span>
          <span className="text-xs text-muted-foreground">
            por{" "}
            <span className="font-medium text-foreground">
              {entry.user_nombre ?? "Sistema"}
            </span>
          </span>
          <span
            className="text-xs text-muted-foreground ml-auto shrink-0"
            title={absTime}
          >
            {relTime}
          </span>
        </div>

        <ActionDetail accion={entry.accion} metadata={entry.metadata} />
      </div>
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────
export function AuditLogPanel({ entries }: { entries: ActividadEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
        <User className="h-8 w-8 opacity-30" />
        <p>Sin actividad registrada aún.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, i) => (
        <div key={entry.id}>
          <AuditRow entry={entry} />
          {i < entries.length - 1 && (
            <div className="ml-3.5 mt-4 border-l border-dashed border-border h-2" />
          )}
        </div>
      ))}
    </div>
  );
}
