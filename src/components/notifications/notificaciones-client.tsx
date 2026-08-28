"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bell, Check, CheckCheck, ExternalLink,
  FileText, FileSignature, ClipboardCheck, RefreshCw, Trash2,
  ChevronLeft, ChevronRight,
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
import { cn } from "@/lib/utils";
import {
  marcarComoLeida,
  marcarTodosComoLeidos,
  eliminarNotificacion,
  generarAlertasVencimiento,
} from "@/app/actions/notificaciones";
import type { Notificacion } from "@/types/notifications";

const MODULO_LABELS: Record<string, string> = {
  permisos:  "Permisos",
  contratos: "Contratos",
  tareas:    "Tareas",
};

const MODULO_ICONS: Record<string, React.ReactNode> = {
  permisos:  <FileText       className="h-4 w-4" />,
  contratos: <FileSignature  className="h-4 w-4" />,
  tareas:    <ClipboardCheck className="h-4 w-4" />,
};

export function NotificacionesClient({
  initialNotifs,
  totalUnread,
  total,
  page,
  pageSize,
}: {
  initialNotifs: Notificacion[];
  totalUnread:   number;
  total:         number;
  page:          number;
  pageSize:      number;
}) {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  // Local state for optimistic mark-as-read / delete (within current page)
  const [notifs, setNotifs]     = useState<Notificacion[]>(initialNotifs);
  const [localUnread, setLocalUnread] = useState(totalUnread);
  const [isPending, startTransition]  = useTransition();
  const [generando, setGenerando]     = useState(false);
  const [genMsg, setGenMsg]           = useState<string | null>(null);

  const navigate = useCallback((overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== undefined) params.set(k, v); else params.delete(k);
    }
    if (!("page" in overrides)) params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }, [router, searchParams, pathname]);

  const filtroLeida  = searchParams.get("leida")  ?? "todas";
  const filtroModulo = searchParams.get("modulo") ?? "_todos";

  function setFiltroLeida(v: string) {
    navigate({ leida: v === "todas" ? undefined : v === "sin_leer" ? "false" : "true" });
  }
  function setFiltroModulo(v: string) {
    navigate({ modulo: v === "_todos" ? undefined : v });
  }

  function handleRead(id: string) {
    const wasUnread = notifs.some((n) => n.id === id && !n.leida);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    if (wasUnread) setLocalUnread((prev) => Math.max(0, prev - 1));
    startTransition(() => marcarComoLeida(id));
  }

  function handleDelete(id: string) {
    const wasUnread = notifs.some((n) => n.id === id && !n.leida);
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setLocalUnread((prev) => Math.max(0, prev - 1));
    startTransition(() => eliminarNotificacion(id));
  }

  function handleMarkAll() {
    const countOnPage = notifs.filter((n) => !n.leida).length;
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
    setLocalUnread((prev) => Math.max(0, prev - countOnPage));
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
      window.location.reload();
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-5">
      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={filtroLeida} onValueChange={setFiltroLeida}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="sin_leer">Sin leer</SelectItem>
              <SelectItem value="leidas">Leídas</SelectItem>
            </SelectContent>
          </Select>

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
          {localUnread > 0 && (
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

      {/* Resumen global */}
      {localUnread > 0 && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{localUnread}</span> sin leer
          de <span className="font-semibold text-foreground">{total}</span> en total
        </p>
      )}

      {/* Lista */}
      {notifs.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-20 text-center shadow-sm">
          <Bell className="h-10 w-10 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground">No hay notificaciones</p>
        </Card>
      ) : (
        <Card className="overflow-hidden shadow-sm">
          <div className="divide-y">
            {notifs.map((n) => (
              <NotifRow key={n.id} notif={n} onRead={handleRead} onDelete={handleDelete} />
            ))}
          </div>
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
    </div>
  );
}

function NotifRow({
  notif,
  onRead,
  onDelete,
}: {
  notif:    Notificacion;
  onRead:   (id: string) => void;
  onDelete: (id: string) => void;
}) {
  // notif.modulo ya es el segmento de ruta real ("permisos", "contratos", ...)
  // — viene tal cual de dónde se generó la notificación (ComentariosPanel/
  // NotasPanel/alertas). Un mapa aparte aquí solo se desincroniza cuando se
  // agrega un módulo nuevo (era el caso de "contratos": generaba un link roto).
  const href =
    notif.modulo && notif.recurso_id
      ? `/${notif.modulo}/${notif.recurso_id}`
      : null;

  return (
    <div
      className={cn(
        "group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/30",
        !notif.leida && "bg-primary/[0.03]"
      )}
    >
      <div
        className={cn(
          "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl",
          !notif.leida ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {MODULO_ICONS[notif.modulo ?? ""] ?? <Bell className="h-4 w-4" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-sm", !notif.leida && "font-semibold")}>{notif.titulo}</span>
          {notif.modulo && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {MODULO_LABELS[notif.modulo] ?? notif.modulo}
            </Badge>
          )}
          {!notif.leida && <span className="h-2 w-2 rounded-full bg-primary" />}
        </div>
        {notif.mensaje && (
          <p className="mt-0.5 text-sm text-muted-foreground">{notif.mensaje}</p>
        )}
        {notif.recurso_desc && notif.recurso_desc !== notif.mensaje && (
          <p className="mt-0.5 text-xs text-muted-foreground/70">{notif.recurso_desc}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground/60">
          {format(parseISO(notif.created_at), "d MMM yyyy · HH:mm", { locale: es })}
          {" · "}
          {formatDistanceToNow(parseISO(notif.created_at), { addSuffix: true, locale: es })}
        </p>
      </div>

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
