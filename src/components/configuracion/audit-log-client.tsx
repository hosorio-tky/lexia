"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Search, FilterX, ScrollText, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActivityEvent, UserProfile } from "@/types/users";

const MODULO_LABELS: Record<string, string> = {
  auth:          "Autenticación",
  permisos:      "Permisos",
  contratos:     "Contratos",
  tareas:        "Tareas",
  usuarios:      "Usuarios",
  configuracion: "Configuración",
};

const MODULOS_FIJOS = ["auth", "permisos", "contratos", "tareas", "usuarios", "configuracion"] as const;

const ACCION_COLORS: Record<string, string> = {
  login:                    "bg-slate-100 text-slate-700",
  registro:                 "bg-indigo-50 text-indigo-700",
  crear_permiso:            "bg-emerald-50 text-emerald-700",
  editar_permiso:           "bg-blue-50 text-blue-700",
  cambiar_estado:           "bg-amber-50 text-amber-700",
  eliminar_permiso:         "bg-red-50 text-red-700",
  crear_contrato:           "bg-emerald-50 text-emerald-700",
  editar_contrato:          "bg-blue-50 text-blue-700",
  cambiar_estado_contrato:  "bg-amber-50 text-amber-700",
  eliminar_contrato:        "bg-red-50 text-red-700",
  crear_tarea:              "bg-emerald-50 text-emerald-700",
  editar_tarea:             "bg-blue-50 text-blue-700",
  cambiar_estado_tarea:     "bg-amber-50 text-amber-700",
  eliminar_tarea:           "bg-red-50 text-red-700",
  agregar_comentario_tarea: "bg-slate-100 text-slate-700",
  invitar_usuario:          "bg-purple-50 text-purple-700",
  editar_usuario:           "bg-blue-50 text-blue-700",
  editar_perfil:            "bg-blue-50 text-blue-700",
  activar_usuario:          "bg-emerald-50 text-emerald-700",
  desactivar_usuario:       "bg-red-50 text-red-700",
  cambiar_contrasena:       "bg-slate-100 text-slate-700",
  actualizar_empresa:       "bg-slate-100 text-slate-700",
  crear_catalogo:           "bg-cyan-50 text-cyan-700",
  editar_catalogo:          "bg-blue-50 text-blue-700",
  eliminar_catalogo:        "bg-red-50 text-red-700",
};

function accionLabel(accion: string) {
  return accion.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string) {
  try {
    return format(parseISO(iso), "d MMM yyyy · HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

// ─── Modal de detalle ─────────────────────────────────────────
function MetadataDetail({ accion, metadata }: { accion: string; metadata: Record<string, unknown> }) {
  if (metadata.cambios) {
    const cambios = metadata.cambios as Array<{ campo: string; de: string | null; a: string | null }>;
    if (cambios.length === 0) return <p className="text-sm text-muted-foreground">Sin cambios registrados.</p>;
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1.5 pr-4 text-left font-medium text-muted-foreground w-1/4">Campo</th>
            <th className="py-1.5 pr-4 text-left font-medium text-muted-foreground w-[37.5%]">Antes</th>
            <th className="py-1.5 text-left font-medium text-muted-foreground w-[37.5%]">Después</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {cambios.map((c, i) => (
            <tr key={i}>
              <td className="py-2 pr-4 font-medium">{c.campo}</td>
              <td className="py-2 pr-4 text-muted-foreground line-through">{c.de ?? <span className="not-italic opacity-40">—</span>}</td>
              <td className="py-2">{c.a ?? <span className="opacity-40">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (metadata.estado_nuevo) {
    const { estado_anterior, estado_nuevo, comentario } = metadata as {
      estado_anterior?: string | null;
      estado_nuevo: string;
      comentario?: string | null;
    };
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          {estado_anterior && (
            <>
              <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground line-through">{estado_anterior}</span>
              <span className="text-muted-foreground">→</span>
            </>
          )}
          <span className="rounded-md bg-primary/10 px-2 py-1 font-medium text-primary">{estado_nuevo}</span>
        </div>
        {comentario && (
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-muted-foreground italic">
            &ldquo;{comentario}&rdquo;
          </p>
        )}
      </div>
    );
  }

  if (accion.includes("comentario") && metadata.contenido) {
    return (
      <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground italic">
        &ldquo;{metadata.contenido as string}&rdquo;
      </p>
    );
  }

  return (
    <pre className="rounded-md bg-muted px-3 py-2 text-xs overflow-auto max-h-64">
      {JSON.stringify(metadata, null, 2)}
    </pre>
  );
}

// ─── Componente principal ─────────────────────────────────────
export function AuditLogClient({
  logs,
  usuarios,
  total,
  page,
  pageSize,
}: {
  logs:      ActivityEvent[];
  usuarios:  UserProfile[];
  total:     number;
  page:      number;
  pageSize:  number;
}) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<ActivityEvent | null>(null);

  // Search con debounce — no dispara request en cada tecla
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");

  const navigate = useCallback((overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    // Cualquier cambio de filtro vuelve a la página 0
    if (!("page" in overrides)) params.delete("page");
    router.push(`?${params.toString()}`);
  }, [router, searchParams]);

  // Debounce del campo search: espera 400ms tras dejar de escribir
  useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams.get("search") ?? "";
      if (searchInput !== current) {
        navigate({ search: searchInput || undefined });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages  = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters  = !!(searchParams.get("search") || searchParams.get("modulo") || searchParams.get("usuario"));

  function clearFilters() {
    setSearchInput("");
    router.push("?");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Log de auditoría</h2>
        <p className="text-sm text-muted-foreground">
          Historial de actividad de todos los usuarios del sistema.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por acción, usuario o descripción…"
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <Select
          value={searchParams.get("modulo") ?? "_todos"}
          onValueChange={(v) => navigate({ modulo: v === "_todos" ? undefined : v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_todos">Todos los módulos</SelectItem>
            {MODULOS_FIJOS.map((m) => (
              <SelectItem key={m} value={m}>
                {MODULO_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("usuario") ?? "_todos"}
          onValueChange={(v) => navigate({ usuario: v === "_todos" ? undefined : v })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Usuario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_todos">Todos los usuarios</SelectItem>
            {usuarios.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nombre_completo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="outline" size="sm" className="self-start" onClick={clearFilters}>
            <FilterX className="mr-2 h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Contador */}
      <div className="text-xs text-muted-foreground">
        {total === 0
          ? "Sin registros"
          : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} de ${total} registros`}
      </div>

      {/* Lista */}
      {logs.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <ScrollText className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No hay registros que coincidan con los filtros.
          </p>
        </Card>
      ) : (
        <Card className="divide-y overflow-hidden">
          {logs.map((log) => {
            const colorClass = ACCION_COLORS[log.accion] ?? "bg-slate-100 text-slate-700";
            const hasDetail  = !!log.metadata && Object.keys(log.metadata).length > 0;
            return (
              <div key={log.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="shrink-0">
                  <Badge className={`text-[11px] font-medium px-2 py-0.5 rounded-md border-0 ${colorClass}`}>
                    {accionLabel(log.accion)}
                  </Badge>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {log.user_nombre && (
                      <span className="text-sm font-medium">{log.user_nombre}</span>
                    )}
                    {log.modulo && (
                      <span className="text-xs text-muted-foreground">
                        · {MODULO_LABELS[log.modulo] ?? log.modulo}
                      </span>
                    )}
                  </div>
                  {log.recurso_desc && (
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {log.recurso_desc}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </span>
                  {hasDetail && (
                    <button
                      type="button"
                      onClick={() => setSelected(log)}
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      title="Ver detalle"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => navigate({ page: String(page - 1) })}
          >
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Anterior
          </Button>

          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => navigate({ page: String(page + 1) })}
          >
            Siguiente
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Modal de detalle */}
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {selected ? accionLabel(selected.accion) : ""}
            </DialogTitle>
            {selected?.user_nombre && (
              <p className="text-sm text-muted-foreground">
                {selected.user_nombre}
                {selected.created_at && ` · ${formatDate(selected.created_at)}`}
              </p>
            )}
          </DialogHeader>
          {selected?.metadata && (
            <MetadataDetail accion={selected.accion} metadata={selected.metadata} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
