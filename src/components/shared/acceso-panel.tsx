"use client";

import { useState } from "react";
import { Globe, Lock, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccesoModal } from "./acceso-modal";
import type { RecursoAcceso, ResourceType, Grupo } from "@/types/access-control";
import type { UserProfile } from "@/types/users";

interface AccesoPanelProps {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  visibilidad: "publico" | "restringido";
  accesos: RecursoAcceso[];
  usuarios: UserProfile[];
  grupos: Grupo[];
  canManage: boolean;
}

export function AccesoPanel({
  resourceType,
  resourceId,
  resourceName,
  visibilidad,
  accesos,
  usuarios,
  grupos,
  canManage,
}: AccesoPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const isPublico    = visibilidad === "publico";
  const accesoCount  = accesos.length;

  return (
    <div className="space-y-3">
      {/* Estado actual de visibilidad */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isPublico
            ? <Globe className="h-4 w-4 text-emerald-600 shrink-0" />
            : <Lock className="h-4 w-4 text-amber-600 shrink-0" />
          }
          <div>
            <p className="text-sm font-medium">
              {isPublico ? "Público" : "Restringido"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPublico
                ? "Visible para todos en el tenant"
                : accesoCount > 0
                  ? `${accesoCount} ${accesoCount === 1 ? "acceso explícito" : "accesos explícitos"}`
                  : "Solo admin y creador tienen acceso"
              }
            </p>
          </div>
        </div>

        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="shrink-0"
          >
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            Administrar
          </Button>
        )}
      </div>

      {/* Lista compacta de accesos si está restringido */}
      {!isPublico && accesoCount > 0 && (
        <div className="space-y-1.5">
          {accesos.slice(0, 5).map((acceso) => {
            const name =
              acceso.subject_type === "user"
                ? usuarios.find((u) => u.id === acceso.subject_id)?.nombre_completo ||
                  usuarios.find((u) => u.id === acceso.subject_id)?.nombre ||
                  "Usuario"
                : grupos.find((g) => g.id === acceso.subject_id)?.nombre || "Grupo";

            return (
              <div
                key={`${acceso.subject_type}-${acceso.subject_id}`}
                className="flex items-center justify-between text-xs rounded-md bg-muted/40 px-2.5 py-1.5"
              >
                <span className="text-muted-foreground truncate">{name}</span>
                <span className={`ml-2 shrink-0 font-medium ${
                  acceso.nivel === "edicion" ? "text-blue-600" : "text-muted-foreground"
                }`}>
                  {acceso.nivel === "edicion" ? "Edición" : "Lectura"}
                </span>
              </div>
            );
          })}
          {accesoCount > 5 && (
            <p className="text-xs text-muted-foreground text-center">
              +{accesoCount - 5} más
            </p>
          )}
        </div>
      )}

      <AccesoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        resourceType={resourceType}
        resourceId={resourceId}
        resourceName={resourceName}
        visibilidad={visibilidad}
        accesos={accesos}
        usuarios={usuarios}
        grupos={grupos}
      />
    </div>
  );
}
