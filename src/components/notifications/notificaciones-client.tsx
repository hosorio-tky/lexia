"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bell, Check, CheckCheck, ExternalLink,
  FileText, ClipboardCheck, Filter, Trash2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  marcarComoLeida,
  marcarTodosComoLeidos,
  eliminarNotificacion,
  generarAlertasVencimiento,
} from "@/app/actions/notificaciones";
import type { Notificacion } from "@/types/notifications";

const MODULO_LABELS: Record<string, string> = {
  permisos: "Permisos",
  tareas:   "Tareas",
};

const MODULO_ICONS: Record<string, React.ReactNode> = {
  permisos: <FileText      className="h-4 w-4" />,
  tareas:   <ClipboardCheck className="h-4 w-4" />,
};

const MODULO_HREFS: Record<string, string> = {
  permisos: "/permisos",
  tareas:   "/tareas",
};

export function NotificacionesClient({
  initialNotifs,
}: {
  initialNotifs: Notificacion[];
}) {
  const [notifs, setNotifs]     = useState<Notificacion[]>(initialNotifs);
  const [filtroLeida, setFiltroLeida] = useState<"todas" | "sin_leer" | "leidas">("todas");
  const [filtroModulo, setFiltroModulo] = useState<string>("_todos");
  const [isPending, startTransition]   = useTransition();
  const [generando, setGenerando]      = useState(false);
  const [genMsg, setGenMsg]            = useState<string | null>(null);

  const unreadCount = notifs.filter((n) => !n.leida).length;

  const visible = notifs.filter((n) => {
    if (filtroLeida === "sin_leer" && n.leida)    return false;
    if (filtroLeida === "leidas"   && !n.leida)   return false;
    if (filtroModulo !== "_todos"  && n.modulo !== filtroModulo) return false;
    return true;
  });

  function handleRead(id: string) {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
    startTransition(() => marcarComoLeida(id));
  }

  function handleDelete(id: string) {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    startTransition(() => eliminarNotificacion(id));
  }

  function handleMarkAll() {
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
    startTransition(() => marcarTodosComoLeidos());
  }

  async function handleGenerar() {
    setGenerando(true);
    setGenMsg(null);
    const res = await generarAlertasVencimiento();
    setGenerando(false);
    if (res.error) {
      setGenMsg("Error: " + res.error);
    } else {
      setGenMsg(
        res.count === 0
          ? "No hay vencimientos próximos sin notificar."
          : `${res.count} notificación${res.count > 1 ? "es" : ""} generada${res.count > 1 ? "s" : ""}.`
      );
      // Refrescar lista
      window.location.reload();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Filtro leída */}
          <Select value={filtroLeida} onValueChange={(v) => setFiltroLeida(v as typeof filtroLeida)}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="sin_leer">Sin leer</SelectItem>
              <SelectItem value="leidas">Leídas</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro módulo */}
          <Select value={filtroModulo} onValueChange={setFiltroModulo}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_todos">Todos los módulos</SelectItem>
              <SelectItem value="permisos">Permisos</SelectItem>
              <SelectItem value="tareas">Tareas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleMarkAll}
              disabled={isPending}
            >
              <CheckCheck className="h-4 w-4" />
              Marcar todas como leídas
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleGenerar}
            disabled={generando}
          >
            <RefreshCw className={cn("h-4 w-4", generando && "animate-spin")} />
            Generar alertas
          </Button>
        </div>
      </div>

      {genMsg && (
        <p className="rounded-lg border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          {genMsg}
        </p>
      )}

      {/* Resumen */}
      {unreadCount > 0 && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{unreadCount}</span> sin leer
          de <span className="font-semibold text-foreground">{notifs.length}</span> en total
        </p>
      )}

      {/* Lista */}
      {visible.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-20 text-center shadow-sm">
          <Bell className="h-10 w-10 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground">No hay notificaciones</p>
        </Card>
      ) : (
        <Card className="overflow-hidden shadow-sm">
          <div className="divide-y">
            {visible.map((n) => (
              <NotifRow
                key={n.id}
                notif={n}
                onRead={handleRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function NotifRow({
  notif,
  onRead,
  onDelete,
}: {
  notif: Notificacion;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const href =
    notif.modulo && notif.recurso_id
      ? `${MODULO_HREFS[notif.modulo] ?? ""}/${notif.recurso_id}`
      : null;

  return (
    <div
      className={cn(
        "group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/30",
        !notif.leida && "bg-primary/[0.03]"
      )}
    >
      {/* Ícono módulo */}
      <div
        className={cn(
          "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl",
          !notif.leida
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {MODULO_ICONS[notif.modulo ?? ""] ?? <Bell className="h-4 w-4" />}
      </div>

      {/* Contenido */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-sm", !notif.leida && "font-semibold")}>
            {notif.titulo}
          </span>
          {notif.modulo && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {MODULO_LABELS[notif.modulo] ?? notif.modulo}
            </Badge>
          )}
          {!notif.leida && (
            <span className="h-2 w-2 rounded-full bg-primary" />
          )}
        </div>
        {notif.mensaje && (
          <p className="mt-0.5 text-sm text-muted-foreground">{notif.mensaje}</p>
        )}
        {notif.recurso_desc && notif.recurso_desc !== notif.mensaje && (
          <p className="mt-0.5 text-xs text-muted-foreground/70">
            {notif.recurso_desc}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground/60">
          {format(parseISO(notif.created_at), "d MMM yyyy · HH:mm", { locale: es })}
          {" · "}
          {formatDistanceToNow(parseISO(notif.created_at), { addSuffix: true, locale: es })}
        </p>
      </div>

      {/* Acciones */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {href && (
          <Link href={href} onClick={() => onRead(notif.id)}>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Abrir">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        )}
        {!notif.leida && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Marcar como leída"
            onClick={() => onRead(notif.id)}
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          title="Eliminar"
          onClick={() => onDelete(notif.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
