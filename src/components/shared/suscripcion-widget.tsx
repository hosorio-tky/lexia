"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  suscribirse,
  cancelarSuscripcion,
  suscribirUsuario,
  removerSuscriptor,
} from "@/app/actions/suscripciones";
import type { Suscripcion } from "@/lib/repositories/suscripciones";
import type { ResourceType } from "@/types/access-control";
import type { UserProfile } from "@/types/users";

interface Props {
  resourceType:  ResourceType;
  resourceId:    string;
  userId:        string;
  canManage:     boolean;        // admin o creador
  initialSuscrito:     boolean;
  initialSuscripciones: Suscripcion[];
  usuarios:      UserProfile[];
}

export function SuscripcionWidget({
  resourceType,
  resourceId,
  userId,
  canManage,
  initialSuscrito,
  initialSuscripciones,
  usuarios,
}: Props) {
  const [suscrito, setSuscrito]         = useState(initialSuscrito);
  const [suscripciones, setSuscripciones] = useState(initialSuscripciones);
  const [addUserId, setAddUserId]       = useState("");
  const [isPending, startTransition]    = useTransition();

  const handleToggleSelf = () => {
    const next = !suscrito;
    setSuscrito(next);
    startTransition(async () => {
      try {
        if (next) {
          await suscribirse(resourceType, resourceId);
          toast.success("Suscrito a alertas de vencimiento");
        } else {
          await cancelarSuscripcion(resourceType, resourceId);
          toast.success("Suscripción cancelada");
        }
      } catch {
        setSuscrito(!next);
        toast.error("Error al actualizar suscripción");
      }
    });
  };

  const handleAddUser = () => {
    if (!addUserId) return;
    startTransition(async () => {
      try {
        await suscribirUsuario(resourceType, resourceId, addUserId);
        const profile = usuarios.find((u) => u.id === addUserId);
        setSuscripciones((prev) => [
          ...prev,
          {
            id:            `temp-${Date.now()}`,
            tenant_id:     "",
            resource_type: resourceType,
            resource_id:   resourceId,
            user_id:       addUserId,
            suscrito_por:  userId,
            created_at:    new Date().toISOString(),
            nombre:        profile?.nombre,
            apellido:      profile?.apellido,
            email:         profile?.email,
          },
        ]);
        setAddUserId("");
        toast.success("Usuario suscrito a alertas");
      } catch {
        toast.error("Error al suscribir usuario");
      }
    });
  };

  const handleRemove = (sub: Suscripcion) => {
    startTransition(async () => {
      try {
        await removerSuscriptor(resourceType, resourceId, sub.user_id);
        setSuscripciones((prev) => prev.filter((s) => s.user_id !== sub.user_id));
        if (sub.user_id === userId) setSuscrito(false);
        toast.success("Suscriptor eliminado");
      } catch {
        toast.error("Error al eliminar suscriptor");
      }
    });
  };

  const suscritosSet = new Set(suscripciones.map((s) => s.user_id));
  const disponibles  = usuarios.filter((u) => !suscritosSet.has(u.id));

  return (
    <div className="space-y-3">
      {/* Toggle auto-suscripción */}
      <button
        onClick={handleToggleSelf}
        disabled={isPending}
        className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
          suscrito
            ? "border-primary/40 bg-primary/5 text-primary"
            : "border-input bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
        }`}
      >
        {suscrito
          ? <Bell className="h-4 w-4 shrink-0" />
          : <BellOff className="h-4 w-4 shrink-0" />
        }
        <span className="flex-1 text-left text-sm">
          {suscrito ? "Suscrito a alertas" : "Suscribirse a alertas"}
        </span>
        {suscrito && (
          <span className="text-xs text-primary/70">Activo</span>
        )}
      </button>

      {/* Lista y gestión de suscriptores — solo admin/creador */}
      {canManage && (
        <div className="space-y-2">
          {suscripciones.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Suscriptores</p>
              {suscripciones.map((sub) => {
                const nombre = [sub.nombre, sub.apellido].filter(Boolean).join(" ") || sub.email || "Usuario";
                return (
                  <div
                    key={sub.user_id}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-1.5"
                  >
                    <span className="text-xs truncate text-muted-foreground">{nombre}</span>
                    <button
                      onClick={() => handleRemove(sub)}
                      disabled={isPending}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive transition disabled:opacity-50"
                      title="Eliminar suscripción"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Agregar suscriptor */}
          {disponibles.length > 0 && (
            <div className="flex gap-2">
              <Select value={addUserId} onValueChange={setAddUserId}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Agregar usuario…" />
                </SelectTrigger>
                <SelectContent>
                  {disponibles.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.nombre_completo || u.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2"
                onClick={handleAddUser}
                disabled={!addUserId || isPending}
                title="Suscribir usuario"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
