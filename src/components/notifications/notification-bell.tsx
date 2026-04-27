"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bell, Check, CheckCheck, ExternalLink, FileText,
  ClipboardCheck, Trash2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  obtenerNotificacionesRecientes,
  marcarComoLeida,
  marcarTodosComoLeidos,
  eliminarNotificacion,
} from "@/app/actions/notificaciones";
import type { Notificacion } from "@/types/notifications";

const MODULO_ICONS: Record<string, React.ReactNode> = {
  permisos: <FileText     className="h-3.5 w-3.5" />,
  tareas:   <ClipboardCheck className="h-3.5 w-3.5" />,
};

const MODULO_HREFS: Record<string, string> = {
  permisos: "/permisos",
  tareas:   "/tareas",
};

function NotifItem({
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
        "group flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
        !notif.leida && "bg-primary/5"
      )}
    >
      {/* Icono del módulo */}
      <div
        className={cn(
          "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg",
          !notif.leida
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {MODULO_ICONS[notif.modulo ?? ""] ?? <Bell className="h-3.5 w-3.5" />}
      </div>

      {/* Contenido */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-snug",
            !notif.leida ? "font-medium" : "text-muted-foreground"
          )}
        >
          {notif.titulo}
        </p>
        {notif.mensaje && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {notif.mensaje}
          </p>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          {formatDistanceToNow(parseISO(notif.created_at), {
            addSuffix: true,
            locale: es,
          })}
        </p>
      </div>

      {/* Acciones */}
      <div className="flex shrink-0 flex-col items-end justify-between gap-1">
        {!notif.leida && (
          <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
        )}
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {href && (
            <Link href={href} onClick={() => onRead(notif.id)}>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Ver">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          )}
          {!notif.leida && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Marcar leída"
              onClick={() => onRead(notif.id)}
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            title="Eliminar"
            onClick={() => onDelete(notif.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const [notifs, setNotifs]     = useState<Notificacion[]>([]);
  const [open, setOpen]         = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [, startTransition]     = useTransition();

  const unreadCount = notifs.filter((n) => !n.leida).length;

  // Cargar al montar
  useEffect(() => {
    obtenerNotificacionesRecientes().then((data) => {
      setNotifs(data);
      setLoaded(true);
    });
  }, []);

  function handleOpen(v: boolean) {
    setOpen(v);
  }

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

  function handleMarkAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
    startTransition(() => marcarTodosComoLeidos());
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border transition hover:text-foreground"
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
          {loaded && unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-primary-foreground ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold">Notificaciones</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </Button>
          )}
        </div>
        <Separator />

        {/* Lista */}
        <div className="max-h-[360px] overflow-y-auto">
          {!loaded ? (
            <div className="flex flex-col gap-2 px-4 py-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : notifs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Sin notificaciones pendientes
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifs.map((n) => (
                <NotifItem
                  key={n.id}
                  notif={n}
                  onRead={handleRead}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifs.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-2">
              <Link href="/notificaciones">
                <Button
                  variant="ghost"
                  className="h-8 w-full text-xs"
                  onClick={() => setOpen(false)}
                >
                  Ver todas las notificaciones
                </Button>
              </Link>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
