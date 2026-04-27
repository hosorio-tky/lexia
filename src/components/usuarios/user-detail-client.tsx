"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Clock, Edit, ToggleLeft, ToggleRight,
  Building2, Phone, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserRoleBadge } from "./user-role-badge";
import { toggleActivoUsuario } from "@/app/actions/usuarios";
import type { UserProfile, ActivityEvent, SessionInfo } from "@/types/users";

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-SV", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

function ActivityItem({ event }: { event: ActivityEvent }) {
  const actionLabels: Record<string, string> = {
    login:            "Inició sesión",
    registro:         "Registró la cuenta",
    crear_permiso:    "Creó permiso",
    editar_permiso:   "Editó permiso",
    eliminar_permiso: "Eliminó permiso",
    cambiar_estado:   "Cambió estado",
    editar_perfil:    "Actualizó su perfil",
    invitar_usuario:  "Invitó usuario",
    editar_usuario:   "Editó usuario",
    activar_usuario:  "Activó usuario",
    desactivar_usuario: "Desactivó usuario",
  };

  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0">
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">
          {actionLabels[event.accion] ?? event.accion}
          {event.recurso_desc && (
            <span className="font-normal text-muted-foreground"> — {event.recurso_desc}</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {formatDate(event.created_at)}
        </div>
      </div>
    </div>
  );
}

export function UserDetailClient({
  user: initialUser,
  activity,
  session,
}: {
  user: UserProfile;
  activity: ActivityEvent[];
  session: SessionInfo;
}) {
  const [user, setUser] = useState(initialUser);
  const [isPending, startTransition] = useTransition();

  const isAdmin = session.rol === "admin";
  const isSelf  = session.user_id === user.id;

  const handleToggleActivo = () => {
    const newActivo = !user.activo;
    setUser((u) => ({ ...u, activo: newActivo }));
    startTransition(() => toggleActivoUsuario(user.id, newActivo));
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/usuarios"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Usuarios
      </Link>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Perfil */}
          <Card className="p-5 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-bold ${
                user.activo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {user.iniciales}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{user.nombre_completo}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Separator className="mb-4" />
            <InfoRow label="Rol"         value={undefined} />
            <div className="-mt-6 mb-2 flex justify-end"><UserRoleBadge rol={user.rol} /></div>
            {user.cargo        && <div className="flex items-center gap-2 text-sm py-2 border-b"><Briefcase className="h-4 w-4 text-muted-foreground" />{user.cargo}</div>}
            {user.departamento && <div className="flex items-center gap-2 text-sm py-2 border-b"><Building2 className="h-4 w-4 text-muted-foreground" />{user.departamento}</div>}
            {user.telefono     && <div className="flex items-center gap-2 text-sm py-2 border-b"><Phone className="h-4 w-4 text-muted-foreground" />{user.telefono}</div>}
            <InfoRow label="Miembro desde" value={formatDate(user.created_at)} />
            <InfoRow label="Último acceso"  value={formatDate(user.ultimo_acceso)} />
          </Card>

          {/* Actividad */}
          <Card className="p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Actividad reciente</h3>
            <Separator className="mb-1" />
            {activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay actividad registrada aún.
              </p>
            ) : (
              <div>
                {activity.map((e) => <ActivityItem key={e.id} event={e} />)}
              </div>
            )}
          </Card>
        </div>

        {/* Columna lateral */}
        <div className="flex flex-col gap-5">
          {/* Acciones */}
          <Card className="p-4 shadow-sm space-y-2">
            <h3 className="text-sm font-semibold mb-1">Acciones</h3>
            {(isSelf || isAdmin) && (
              <Link href={isSelf ? "/perfil" : `/usuarios/${user.id}/editar`}>
                <Button variant="outline" className="w-full">
                  <Edit className="mr-2 h-4 w-4" />
                  {isSelf ? "Editar mi perfil" : "Editar usuario"}
                </Button>
              </Link>
            )}
            {isAdmin && !isSelf && (
              <Button
                variant="outline"
                className={`w-full ${user.activo ? "text-destructive hover:text-destructive" : ""}`}
                onClick={handleToggleActivo}
                disabled={isPending}
              >
                {user.activo
                  ? <><ToggleLeft  className="mr-2 h-4 w-4" />Desactivar</>
                  : <><ToggleRight className="mr-2 h-4 w-4" />Activar</>
                }
              </Button>
            )}
          </Card>

          {/* Estado */}
          <Card className="p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Estado de la cuenta</h3>
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${user.activo ? "bg-emerald-500" : "bg-slate-400"}`} />
              <span className="text-sm">{user.activo ? "Activo" : "Inactivo"}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
