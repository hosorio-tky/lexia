"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Search, FilterX, ScrollText } from "lucide-react";
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
import type { ActivityEvent } from "@/types/users";
import type { UserProfile } from "@/types/users";

const MODULO_LABELS: Record<string, string> = {
  auth:          "Autenticación",
  permisos:      "Permisos",
  usuarios:      "Usuarios",
  configuracion: "Configuración",
};

const ACCION_COLORS: Record<string, string> = {
  login:               "bg-slate-100 text-slate-700",
  registro:            "bg-indigo-50 text-indigo-700",
  crear_permiso:       "bg-emerald-50 text-emerald-700",
  editar_permiso:      "bg-blue-50 text-blue-700",
  cambiar_estado:      "bg-amber-50 text-amber-700",
  eliminar_permiso:    "bg-red-50 text-red-700",
  invitar_usuario:     "bg-purple-50 text-purple-700",
  editar_usuario:      "bg-blue-50 text-blue-700",
  activar_usuario:     "bg-emerald-50 text-emerald-700",
  desactivar_usuario:  "bg-red-50 text-red-700",
  actualizar_empresa:  "bg-slate-100 text-slate-700",
  crear_catalogo:      "bg-cyan-50 text-cyan-700",
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

export function AuditLogClient({
  logs,
  usuarios,
}: {
  logs: ActivityEvent[];
  usuarios: UserProfile[];
}) {
  const [search,        setSearch]        = useState("");
  const [filtroModulo,  setFiltroModulo]  = useState("_todos");
  const [filtroUsuario, setFiltroUsuario] = useState("_todos");

  const modulos = useMemo(
    () => Array.from(new Set(logs.map((l) => l.modulo).filter(Boolean) as string[])).sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filtroModulo !== "_todos" && l.modulo !== filtroModulo)  return false;
      if (filtroUsuario !== "_todos" && !l.user_nombre?.toLowerCase().includes(
        usuarios.find((u) => u.id === filtroUsuario)?.nombre_completo.toLowerCase() ?? ""
      )) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.accion.toLowerCase().includes(q) ||
          l.user_nombre?.toLowerCase().includes(q) ||
          l.recurso_desc?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, filtroModulo, filtroUsuario, search, usuarios]);

  const hasFilters = search || filtroModulo !== "_todos" || filtroUsuario !== "_todos";

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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={filtroModulo} onValueChange={setFiltroModulo}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_todos">Todos los módulos</SelectItem>
            {modulos.map((m) => (
              <SelectItem key={m} value={m}>
                {MODULO_LABELS[m] ?? m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroUsuario} onValueChange={setFiltroUsuario}>
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
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => {
              setSearch("");
              setFiltroModulo("_todos");
              setFiltroUsuario("_todos");
            }}
          >
            <FilterX className="mr-2 h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Resultados */}
      <div className="text-xs text-muted-foreground">
        {filtered.length} de {logs.length} registros
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <ScrollText className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No hay registros que coincidan con los filtros.
          </p>
        </Card>
      ) : (
        <Card className="divide-y overflow-hidden">
          {filtered.map((log) => {
            const colorClass =
              ACCION_COLORS[log.accion] ?? "bg-slate-100 text-slate-700";
            return (
              <div key={log.id} className="flex items-start gap-4 px-5 py-3.5">
                <div className="shrink-0 pt-0.5">
                  <Badge
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-md border-0 ${colorClass}`}
                  >
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

                <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(log.created_at)}
                </span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
