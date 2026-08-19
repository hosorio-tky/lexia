"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle, FileText, Library, RotateCcw, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { restaurar, eliminarDefinitivamente, type ModuloPapelera } from "@/app/actions/papelera";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PermisoEliminado {
  id: string; nombre: string; numero_expediente: string | null; descripcion: string | null;
  tipo: string; estado: string; entidad_reguladora: string | null;
  responsable_nombre: string | null; fecha_solicitud: string | null;
  fecha_emision: string | null; fecha_vencimiento: string | null; ubicacion: string | null;
  base_legal: string | null; riesgo_incumplimiento: string | null;
  valor_tramite: number | null; moneda: string | null;
  deleted_at: string; deleted_by_nombre: string | null;
}

export interface ContratoEliminado {
  id: string; titulo: string; numero: string | null; descripcion: string | null;
  tipo: string; estado: string; contraparte_nombre: string | null;
  contraparte_email: string | null; responsable_nombre: string | null;
  fecha_inicio: string | null; fecha_fin: string | null; fecha_firma: string | null;
  valor: number | null; moneda: string | null;
  deleted_at: string; deleted_by_nombre: string | null;
}

export interface LexbaseEliminado {
  id: string; titulo: string; tipo: string; descripcion: string | null;
  pais: string; numero_oficial: string | null; organo_emisor: string | null;
  fecha_publicacion: string | null; fecha_vigencia: string | null;
  storage_path: string | null; tags: string[];
  deleted_at: string; deleted_by_nombre: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fechaRel(iso: string) {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es }); }
  catch { return iso; }
}

function Campo({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm">{String(value)}</span>
    </div>
  );
}

// ─── Panel de detalle ─────────────────────────────────────────────────────────

function DetallePanel({
  modulo,
  item,
  onClose,
  onRestore,
  onHardDelete,
}: {
  modulo: ModuloPapelera;
  item: PermisoEliminado | ContratoEliminado | LexbaseEliminado;
  onClose: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {modulo === "permisos" ? "Permiso" : modulo === "contratos" ? "Contrato" : "Lexbase"}
          </p>
          <p className="mt-0.5 text-base font-semibold leading-snug">
            {"nombre" in item ? (item as PermisoEliminado).nombre : (item as ContratoEliminado | LexbaseEliminado).titulo}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Info eliminación */}
      <div className="border-b bg-red-50/50 px-5 py-3 text-xs text-red-700">
        Eliminado {fechaRel(item.deleted_at)}
        {item.deleted_by_nombre && <> por <strong>{item.deleted_by_nombre}</strong></>}
      </div>

      {/* Campos */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {modulo === "permisos" && (() => {
            const p = item as PermisoEliminado;
            return (
              <>
                <Campo label="Expediente"        value={p.numero_expediente} />
                <Campo label="Tipo"              value={p.tipo} />
                <Campo label="Estado"            value={p.estado} />
                <Campo label="Responsable"       value={p.responsable_nombre} />
                <Campo label="Entidad reguladora" value={p.entidad_reguladora} />
                <Campo label="Ubicación"         value={p.ubicacion} />
                <Campo label="Fecha solicitud"   value={p.fecha_solicitud} />
                <Campo label="Fecha emisión"     value={p.fecha_emision} />
                <Campo label="Fecha vencimiento" value={p.fecha_vencimiento} />
                <Campo label="Valor trámite"     value={p.valor_tramite != null ? `${p.valor_tramite} ${p.moneda ?? ""}` : null} />
                <Campo label="Riesgo"            value={p.riesgo_incumplimiento} />
                {p.descripcion && (
                  <div className="col-span-full flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Descripción</span>
                    <p className="text-sm text-muted-foreground">{p.descripcion}</p>
                  </div>
                )}
                {p.base_legal && (
                  <div className="col-span-full flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Base legal</span>
                    <p className="text-sm text-muted-foreground">{p.base_legal}</p>
                  </div>
                )}
              </>
            );
          })()}

          {modulo === "contratos" && (() => {
            const c = item as ContratoEliminado;
            return (
              <>
                <Campo label="Número"         value={c.numero} />
                <Campo label="Tipo"           value={c.tipo} />
                <Campo label="Estado"         value={c.estado} />
                <Campo label="Contraparte"    value={c.contraparte_nombre} />
                <Campo label="Email contraparte" value={"contraparte_email" in c ? (c as ContratoEliminado & { contraparte_email?: string | null }).contraparte_email : null} />
                <Campo label="Responsable"    value={c.responsable_nombre} />
                <Campo label="Fecha inicio"   value={c.fecha_inicio} />
                <Campo label="Fecha fin"      value={c.fecha_fin} />
                <Campo label="Fecha firma"    value={c.fecha_firma} />
                <Campo label="Valor"          value={c.valor != null ? `${c.valor} ${c.moneda ?? ""}` : null} />
                {c.descripcion && (
                  <div className="col-span-full flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Descripción</span>
                    <p className="text-sm text-muted-foreground">{c.descripcion}</p>
                  </div>
                )}
              </>
            );
          })()}

          {modulo === "lexbase" && (() => {
            const l = item as LexbaseEliminado;
            return (
              <>
                <Campo label="Tipo"               value={l.tipo} />
                <Campo label="País"               value={l.pais} />
                <Campo label="Número oficial"     value={l.numero_oficial} />
                <Campo label="Órgano emisor"      value={l.organo_emisor} />
                <Campo label="Fecha publicación"  value={l.fecha_publicacion} />
                <Campo label="Fecha vigencia"     value={l.fecha_vigencia} />
                {l.tags?.length > 0 && (
                  <div className="col-span-full flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Etiquetas</span>
                    <div className="flex flex-wrap gap-1.5">
                      {l.tags.map((t) => (
                        <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {l.descripcion && (
                  <div className="col-span-full flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Descripción</span>
                    <p className="text-sm text-muted-foreground">{l.descripcion}</p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Acciones */}
      <div className="border-t px-5 py-4 flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={isPending}
          onClick={() => startTransition(onRestore)}
        >
          <RotateCcw className="h-4 w-4" />
          Restaurar
        </Button>

        {!confirmDelete ? (
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar definitivamente
          </Button>
        ) : (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex flex-col gap-2">
            <p className="text-xs text-destructive font-medium">
              Esta acción es irreversible. ¿Confirmas?
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                disabled={isPending}
                onClick={() => startTransition(onHardDelete)}
              >
                Sí, eliminar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Fila de item ────────────────────────────────────────────────────────────

function ItemRow({
  label,
  sublabel,
  deletedAt,
  isActive,
  onClick,
}: {
  label: string;
  sublabel: string;
  deletedAt: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition",
        isActive ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/60",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground">{fechaRel(deletedAt)}</span>
    </button>
  );
}

// ─── Tab de módulo ────────────────────────────────────────────────────────────

type AnyEliminado = PermisoEliminado | ContratoEliminado | LexbaseEliminado;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TabPanel({
  items,
  modulo,
  getLabel,
  getSublabel,
}: {
  items: AnyEliminado[];
  modulo: ModuloPapelera;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getLabel: (item: any) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSublabel: (item: any) => string;
}) {
  const [selected, setSelected] = useState<AnyEliminado | null>(null);
  const [, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
          <Trash2 className="h-5 w-5 opacity-40" />
        </div>
        <p>La papelera está vacía</p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-0">
      {/* Lista */}
      <div className={cn("flex flex-col gap-1 overflow-y-auto p-3", selected ? "hidden md:flex md:w-80 md:shrink-0 md:border-r" : "w-full")}>
        {items.map((item) => (
          <ItemRow
            key={item.id}
            label={getLabel(item)}
            sublabel={getSublabel(item)}
            deletedAt={item.deleted_at}
            isActive={selected?.id === item.id}
            onClick={() => setSelected(item)}
          />
        ))}
      </div>

      {/* Detalle */}
      {selected && (
        <div className="flex-1 overflow-hidden">
          <DetallePanel
            modulo={modulo}
            item={selected}
            onClose={() => setSelected(null)}
            onRestore={() => startTransition(async () => {
              await restaurar(selected.id, modulo);
              setSelected(null);
            })}
            onHardDelete={() => startTransition(async () => {
              await eliminarDefinitivamente(selected.id, modulo);
              setSelected(null);
            })}
          />
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

const TABS: { key: ModuloPapelera; label: string; icon: React.ElementType }[] = [
  { key: "permisos",  label: "Permisos",  icon: FileText },
  { key: "contratos", label: "Contratos", icon: FileText },
  { key: "lexbase",   label: "Lexbase",   icon: Library  },
];

export function PapeleraClient({
  permisos,
  contratos,
  lexbase,
}: {
  permisos:  PermisoEliminado[];
  contratos: ContratoEliminado[];
  lexbase:   LexbaseEliminado[];
}) {
  const [tab, setTab] = useState<ModuloPapelera>("permisos");

  const totalItems = permisos.length + contratos.length + lexbase.length;

  return (
    <div className="flex flex-col gap-4">
      {totalItems > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Los elementos de la papelera no se eliminan automáticamente. Usa "Eliminar definitivamente" para borrar de forma permanente.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Tabs */}
        <div className="flex border-b">
          {TABS.map((t) => {
            const count = t.key === "permisos" ? permisos.length : t.key === "contratos" ? contratos.length : lexbase.length;
            const Icon  = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition border-b-2",
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {count > 0 && (
                  <span className={cn(
                    "flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                    tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contenido */}
        <div className="min-h-[400px]">
          {tab === "permisos" && (
            <TabPanel
              items={permisos}
              modulo="permisos"
              getLabel={(p) => p.nombre}
              getSublabel={(p) => [p.tipo, p.estado, p.responsable_nombre].filter(Boolean).join(" · ")}
            />
          )}
          {tab === "contratos" && (
            <TabPanel
              items={contratos}
              modulo="contratos"
              getLabel={(c) => c.titulo}
              getSublabel={(c) => [c.tipo, c.contraparte_nombre, c.responsable_nombre].filter(Boolean).join(" · ")}
            />
          )}
          {tab === "lexbase" && (
            <TabPanel
              items={lexbase}
              modulo="lexbase"
              getLabel={(l) => l.titulo}
              getSublabel={(l) => [l.tipo, l.pais, l.organo_emisor].filter(Boolean).join(" · ")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
