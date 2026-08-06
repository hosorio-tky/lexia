"use client";

import { useState, useTransition } from "react";
import { Globe, Lock, Users, User, X, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { setVisibilidad, grantAcceso, revokeAcceso } from "@/app/actions/acceso";
import type { RecursoAcceso, ResourceType, SubjectType, NivelAcceso, Grupo } from "@/types/access-control";
import type { UserProfile } from "@/types/users";

interface AccesoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  visibilidad: "publico" | "restringido";
  accesos: RecursoAcceso[];
  usuarios: UserProfile[];
  grupos: Grupo[];
  onVisibilidadChange?: (v: "publico" | "restringido") => void;
  onAccesosChange?: (accesos: RecursoAcceso[]) => void;
}

const NIVEL_LABELS: Record<NivelAcceso, string> = {
  lectura: "Lectura",
  edicion: "Edición",
};

export function AccesoModal({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  resourceName,
  visibilidad: initialVisibilidad,
  accesos: initialAccesos,
  usuarios,
  grupos,
  onVisibilidadChange,
  onAccesosChange,
}: AccesoModalProps) {
  const [visibilidad, setVisibilidadLocal]   = useState(initialVisibilidad);
  const [accesos, setAccesos]               = useState(initialAccesos);
  const [subjectType, setSubjectType]       = useState<SubjectType>("user");
  const [subjectId, setSubjectId]           = useState("");
  const [nivel, setNivel]                   = useState<NivelAcceso>("lectura");
  const [isPending, startTransition]        = useTransition();

  function resolveSubjectName(acceso: RecursoAcceso): string {
    if (acceso.subject_type === "user") {
      const u = usuarios.find((u) => u.id === acceso.subject_id);
      return u?.nombre_completo || u?.nombre || "Usuario desconocido";
    }
    const g = grupos.find((g) => g.id === acceso.subject_id);
    return g?.nombre || "Grupo desconocido";
  }

  const handleToggleVisibilidad = () => {
    const next = visibilidad === "publico" ? "restringido" : "publico";
    setVisibilidadLocal(next);
    onVisibilidadChange?.(next);
    startTransition(async () => {
      try {
        await setVisibilidad(resourceType, resourceId, next);
      } catch {
        setVisibilidadLocal(visibilidad);
        onVisibilidadChange?.(visibilidad);
        toast.error("Error al cambiar la visibilidad");
      }
    });
  };

  const handleGrant = () => {
    if (!subjectId) return;
    const newAcceso: RecursoAcceso = {
      id:            `temp-${Date.now()}`,
      tenant_id:     "",
      resource_type: resourceType,
      resource_id:   resourceId,
      subject_type:  subjectType,
      subject_id:    subjectId,
      nivel,
      created_at:    new Date().toISOString(),
    };
    setAccesos((prev) => {
      const filtered = prev.filter(
        (a) => !(a.subject_type === subjectType && a.subject_id === subjectId)
      );
      const next = [...filtered, newAcceso];
      onAccesosChange?.(next);
      return next;
    });
    setSubjectId("");
    startTransition(async () => {
      try {
        await grantAcceso(resourceType, resourceId, subjectType, subjectId, nivel);
        toast.success("Acceso otorgado");
      } catch {
        setAccesos(initialAccesos);
        toast.error("Error al otorgar acceso");
      }
    });
  };

  const handleRevoke = (acceso: RecursoAcceso) => {
    setAccesos((prev) => {
      const next = prev.filter(
        (a) => !(a.subject_type === acceso.subject_type && a.subject_id === acceso.subject_id)
      );
      onAccesosChange?.(next);
      return next;
    });
    startTransition(async () => {
      try {
        await revokeAcceso(resourceType, resourceId, acceso.subject_type, acceso.subject_id);
        toast.success("Acceso revocado");
      } catch {
        setAccesos(initialAccesos);
        toast.error("Error al revocar acceso");
      }
    });
  };

  // Filtrar sujetos ya con acceso para no mostrarlos dos veces
  const subjectsWithAccess = new Set(
    accesos.filter((a) => a.subject_type === subjectType).map((a) => a.subject_id)
  );

  const availableOptions =
    subjectType === "user"
      ? usuarios.filter((u) => !subjectsWithAccess.has(u.id))
      : grupos.filter((g) => !subjectsWithAccess.has(g.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Control de acceso</DialogTitle>
          <DialogDescription className="line-clamp-1">{resourceName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Visibilidad */}
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {visibilidad === "publico"
                  ? <Globe className="h-4 w-4 text-emerald-600" />
                  : <Lock className="h-4 w-4 text-amber-600" />
                }
                <span className="text-sm font-medium">
                  {visibilidad === "publico" ? "Público" : "Restringido"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleVisibilidad}
                disabled={isPending}
              >
                {isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : visibilidad === "publico" ? "Restringir" : "Hacer público"
                }
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {visibilidad === "publico"
                ? "Todos los usuarios del tenant pueden ver y editar este recurso."
                : "Solo las personas con acceso explícito pueden ver este recurso."
              }
            </p>
          </div>

          {/* Lista de accesos (solo si restringido) */}
          {visibilidad === "restringido" && (
            <>
              <Separator />

              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Accesos otorgados
                </Label>

                {accesos.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">
                    Sin accesos explícitos. Nadie fuera de ti y los admins puede ver este recurso.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {accesos.map((acceso) => (
                      <div
                        key={`${acceso.subject_type}-${acceso.subject_id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {acceso.subject_type === "user"
                            ? <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                            : <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                          }
                          <span className="text-sm truncate">{resolveSubjectName(acceso)}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                            acceso.nivel === "edicion"
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                              : "bg-muted text-muted-foreground border-border"
                          }`}>
                            {NIVEL_LABELS[acceso.nivel]}
                          </span>
                          <button
                            onClick={() => handleRevoke(acceso)}
                            disabled={isPending}
                            className="rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
                            title="Revocar acceso"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Agregar acceso */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Agregar acceso
                </Label>

                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center">
                  {/* Tipo: usuario o grupo */}
                  <Select
                    value={subjectType}
                    onValueChange={(v) => { setSubjectType(v as SubjectType); setSubjectId(""); }}
                  >
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" /> Usuario
                        </span>
                      </SelectItem>
                      <SelectItem value="group">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" /> Grupo
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Quién */}
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder={subjectType === "user" ? "Seleccionar usuario…" : "Seleccionar grupo…"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          {subjectType === "user" ? "Todos los usuarios ya tienen acceso" : "No hay grupos disponibles"}
                        </div>
                      ) : (
                        availableOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {"nombre_completo" in opt ? opt.nombre_completo || opt.nombre : (opt as Grupo).nombre}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  {/* Nivel */}
                  <Select value={nivel} onValueChange={(v) => setNivel(v as NivelAcceso)}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lectura">Lectura</SelectItem>
                      <SelectItem value="edicion">Edición</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Agregar */}
                  <Button
                    size="sm"
                    onClick={handleGrant}
                    disabled={!subjectId || isPending}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
