"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Clock, Edit, ToggleLeft, ToggleRight,
  Mail, CheckCircle, Link2, ShieldCheck, ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserRoleBadge } from "./user-role-badge";
import { toggleActivoUsuario, reenviarInvitacion, generarLinkInvitacion, actualizarMfaRequerido } from "@/app/actions/usuarios";
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
    generar_link_invitacion: "Generó link de invitación",
    activar_mfa_requerido:   "Activó el requisito de MFA",
    desactivar_mfa_requerido: "Desactivó el requisito de MFA",
  };

  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0">
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium flex flex-wrap items-center gap-1.5">
          <span>
            {actionLabels[event.accion] ?? event.accion}
            {event.recurso_desc && (
              <span className="font-normal text-muted-foreground"> — {event.recurso_desc}</span>
            )}
          </span>
          {event.metadata?.origen === "agente_ia" && (
            <span
              title="Generado por Lexia AI a partir de una instrucción o documento en el chat"
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
            >
              🤖 IA
            </span>
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
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [manualLink, setManualLink] = useState<string | null>(null);

  const isAdmin   = session.rol === "admin";
  const isSelf    = session.user_id === user.id;
  const nuncaAccedio = !user.ultimo_acceso;

  const handleToggleActivo = () => {
    const newActivo = !user.activo;
    setUser((u) => ({ ...u, activo: newActivo }));
    startTransition(() => toggleActivoUsuario(user.id, newActivo));
  };

  const handleToggleMfaRequerido = () => {
    const newMfaRequired = !user.mfa_required;
    setUser((u) => ({ ...u, mfa_required: newMfaRequired }));
    startTransition(() => actualizarMfaRequerido(user.id, newMfaRequired));
  };

  const handleReenviarInvitacion = () => {
    setInviteError(null);
    startTransition(async () => {
      const result = await reenviarInvitacion(user.id);
      if (result.error) setInviteError(result.error);
      else setInviteSent(true);
    });
  };

  const handleCopiarLinkInvitacion = () => {
    setInviteError(null);
    setManualLink(null);
    setIsGeneratingLink(true);

    // La generación del link requiere un round-trip al servidor. Si
    // esperamos (`await`) esa respuesta antes de tocar el portapapeles,
    // Safari (y otros navegadores estrictos) ya no consideran la escritura
    // parte del gesto de clic original y la rechazan en silencio — el botón
    // "parece" funcionar pero no copia nada. Por eso el link se resuelve
    // como una promesa que se pasa directo a clipboard.write(), sin ningún
    // await previo: el navegador espera esa promesa manteniendo vivo el
    // permiso del gesto.
    const linkPromise = generarLinkInvitacion(user.id).then((result) => {
      if (result.error || !result.link) {
        throw new Error(result.error ?? "No se pudo generar el enlace");
      }
      return result.link;
    });

    const finish = () => setIsGeneratingLink(false);
    const onSuccess = () => {
      toast.success("Link de invitación copiado", {
        description: "Es de un solo uso y expira — compártelo por un canal seguro.",
      });
      finish();
    };
    const onFailure = async () => {
      // El portapapeles falló (permiso denegado, navegador sin soporte,
      // etc.) — igual mostramos el link para que se pueda copiar a mano,
      // así la invitación nunca queda inaccesible.
      try {
        setManualLink(await linkPromise);
      } catch (err) {
        setInviteError(err instanceof Error ? err.message : "No se pudo generar el enlace");
      } finally {
        finish();
      }
    };

    if (navigator.clipboard && "write" in navigator.clipboard && typeof ClipboardItem !== "undefined") {
      navigator.clipboard
        .write([
          new ClipboardItem({
            "text/plain": linkPromise.then((link) => new Blob([link], { type: "text/plain" })),
          }),
        ])
        .then(onSuccess, onFailure);
    } else {
      // Fallback para navegadores sin soporte de ClipboardItem — no hay
      // forma de diferir la escritura, así que se acepta el riesgo de que
      // el gesto ya haya expirado y se muestra el link igual si falla.
      linkPromise
        .then((link) => navigator.clipboard.writeText(link).then(onSuccess, onFailure))
        .catch((err) => {
          setInviteError(err instanceof Error ? err.message : "No se pudo generar el enlace");
          finish();
        });
    }
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
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Rol</span>
              <UserRoleBadge rol={user.rol} />
            </div>
            <InfoRow label="Cargo"         value={user.cargo} />
            <InfoRow label="Departamento"  value={user.departamento} />
            <InfoRow label="Teléfono"      value={user.telefono} />
            <InfoRow label="Correo"        value={user.email} />
            <InfoRow label="Miembro desde" value={formatDate(user.created_at)} />
            <InfoRow label="Último acceso" value={formatDate(user.ultimo_acceso)} />
            <InfoRow label="MFA requerido" value={user.mfa_required ? "Sí" : "No"} />
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
            {isAdmin && !isSelf && nuncaAccedio && (
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleReenviarInvitacion}
                  disabled={isPending || inviteSent}
                >
                  {inviteSent
                    ? <><CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />Invitación enviada</>
                    : <><Mail className="mr-2 h-4 w-4" />Reenviar invitación</>
                  }
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCopiarLinkInvitacion}
                  disabled={isGeneratingLink}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  {isGeneratingLink ? "Generando link…" : "Copiar link de invitación"}
                </Button>
                {inviteError && (
                  <p className="text-xs text-destructive">{inviteError}</p>
                )}
                {manualLink && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      No se pudo copiar automáticamente — selecciona y copia el link:
                    </p>
                    <input
                      readOnly
                      value={manualLink}
                      onFocus={(e) => e.currentTarget.select()}
                      className="w-full rounded-md border bg-muted/40 px-2 py-1.5 text-xs font-mono"
                    />
                  </div>
                )}
              </>
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
            {isAdmin && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleToggleMfaRequerido}
                disabled={isPending}
                title={isSelf ? "Cambia el requisito de MFA para tu propia cuenta" : undefined}
              >
                {user.mfa_required
                  ? <><ShieldOff  className="mr-2 h-4 w-4" />Desactivar MFA requerido</>
                  : <><ShieldCheck className="mr-2 h-4 w-4" />Activar MFA requerido</>
                }
              </Button>
            )}
          </Card>

          {/* Estado */}
          <Card className="p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Estado de la cuenta</h3>
            <div className="flex items-center gap-2">
              {!user.activo ? (
                <>
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  <span className="text-sm">Inactivo</span>
                </>
              ) : !user.ultimo_acceso ? (
                <>
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="text-sm text-amber-600">Pendiente de activación</span>
                </>
              ) : (
                <>
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm">Activo</span>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
