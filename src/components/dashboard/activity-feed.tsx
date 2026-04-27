import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, ClipboardCheck, Settings, Users, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/lib/repositories/dashboard";

const MODULO_ICONS: Record<string, React.ReactNode> = {
  permisos:      <FileText       className="h-3.5 w-3.5" />,
  tareas:        <ClipboardCheck className="h-3.5 w-3.5" />,
  configuracion: <Settings       className="h-3.5 w-3.5" />,
  usuarios:      <Users          className="h-3.5 w-3.5" />,
  auth:          <LogIn          className="h-3.5 w-3.5" />,
};

const MODULO_COLORS: Record<string, string> = {
  permisos:      "bg-indigo-100 text-indigo-600",
  tareas:        "bg-blue-100 text-blue-600",
  configuracion: "bg-slate-100 text-slate-600",
  usuarios:      "bg-emerald-100 text-emerald-600",
  auth:          "bg-muted text-muted-foreground",
};

const ACCION_LABELS: Record<string, string> = {
  crear_permiso:    "creó un permiso",
  editar_permiso:   "editó un permiso",
  cambio_estado:    "cambió el estado de",
  eliminar_permiso: "eliminó un permiso",
  crear_tarea:      "creó una tarea",
  editar_tarea:     "editó una tarea",
  tarea_asignada:   "asignó una tarea",
  login:            "inició sesión",
  logout:           "cerró sesión",
  invitar_usuario:  "invitó a un usuario",
};

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Sin actividad reciente
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40">
          {/* Ícono módulo */}
          <div
            className={cn(
              "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs",
              MODULO_COLORS[item.modulo] ?? "bg-muted text-muted-foreground"
            )}
          >
            {MODULO_ICONS[item.modulo] ?? <FileText className="h-3.5 w-3.5" />}
          </div>

          {/* Descripción */}
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug">
              <span className="font-medium">{item.user_nombre ?? "Sistema"}</span>
              {" "}
              <span className="text-muted-foreground">
                {ACCION_LABELS[item.accion] ?? item.accion}
              </span>
              {item.recurso_desc && (
                <>
                  {" "}
                  <span className="font-medium truncate">
                    {item.recurso_desc}
                  </span>
                </>
              )}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
              {formatDistanceToNow(parseISO(item.created_at), {
                addSuffix: true,
                locale: es,
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
