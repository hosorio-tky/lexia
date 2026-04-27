"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2, MoreHorizontal, UserPlus, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserRoleBadge } from "./user-role-badge";
import { toggleActivoUsuario } from "@/app/actions/usuarios";
import type { UserProfile } from "@/types/users";
import type { SessionInfo } from "@/types/users";

function formatDate(iso?: string) {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleDateString("es-SV", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function UserAvatar({ nombre, activo }: { nombre: string; activo: boolean }) {
  const initials = nombre.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
  return (
    <div className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${
      activo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
    }`}>
      {initials}
      {!activo && (
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-slate-400" />
      )}
    </div>
  );
}

export function UserListClient({
  users,
  session,
}: {
  users: UserProfile[];
  session: SessionInfo;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticUsers, setOptimisticUsers] = useState(users);

  const handleToggleActivo = (id: string, activo: boolean) => {
    // Optimistic update
    setOptimisticUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, activo } : u))
    );
    startTransition(() => toggleActivoUsuario(id, activo));
  };

  const isAdmin = session.rol === "admin";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {optimisticUsers.length} usuario{optimisticUsers.length !== 1 ? "s" : ""} en tu organización
        </p>
        {isAdmin && (
          <Link href="/usuarios/invitar">
            <Button size="sm">
              <UserPlus className="mr-2 h-4 w-4" />
              Invitar usuario
            </Button>
          </Link>
        )}
      </div>

      <Card className="overflow-hidden shadow-sm">
        <div className="relative w-full overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Usuario</th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground hidden sm:table-cell">Rol</th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground hidden md:table-cell">Cargo / Depto.</th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground hidden lg:table-cell">Último acceso</th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Estado</th>
                <th className="h-10 w-[60px] px-4" />
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {optimisticUsers.map((user) => (
                <tr key={user.id} className="border-b transition-colors hover:bg-muted/30 group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar nombre={user.nombre_completo} activo={user.activo} />
                      <div>
                        <div className="font-medium leading-snug">
                          {user.nombre_completo}
                          {user.id === session.user_id && (
                            <span className="ml-2 text-[10px] text-muted-foreground font-normal">(tú)</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden sm:table-cell">
                    <UserRoleBadge rol={user.rol} />
                  </td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground">
                    {user.cargo
                      ? <><div>{user.cargo}</div>{user.departamento && <div className="text-xs">{user.departamento}</div>}</>
                      : "—"
                    }
                  </td>
                  <td className="p-4 hidden lg:table-cell text-muted-foreground">
                    {formatDate(user.ultimo_acceso)}
                  </td>
                  <td className="p-4">
                    {user.activo ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                        <XCircle className="h-3.5 w-3.5" /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/usuarios/${user.id}`}>Ver detalle</Link>
                        </DropdownMenuItem>
                        {isAdmin && user.id !== session.user_id && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleActivo(user.id, !user.activo)}
                              disabled={isPending}
                              className={user.activo ? "text-destructive" : ""}
                            >
                              {user.activo ? "Desactivar" : "Activar"}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
