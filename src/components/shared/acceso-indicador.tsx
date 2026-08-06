"use client";

import { useState } from "react";
import { Globe, Lock, Loader2 } from "lucide-react";
import { AccesoModal } from "./acceso-modal";
import type { ResourceType, RecursoAcceso, Grupo } from "@/types/access-control";
import type { UserProfile } from "@/types/users";

interface AccesoIndicadorProps {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  visibilidad: "publico" | "restringido";
  canManage: boolean;
}

type LazyData = {
  accesos: RecursoAcceso[];
  usuarios: UserProfile[];
  grupos: Grupo[];
};

export function AccesoIndicador({
  resourceType,
  resourceId,
  resourceName,
  visibilidad: initialVisibilidad,
  canManage,
}: AccesoIndicadorProps) {
  const [open, setOpen]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState<LazyData | null>(null);
  const [visibilidad, setVis]     = useState(initialVisibilidad);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canManage) return;

    if (data) {
      setOpen(true);
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch(`/api/acceso/${resourceType}/${resourceId}`);
      const json = await res.json() as LazyData;
      setData(json);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const icon = loading ? (
    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
  ) : visibilidad === "restringido" ? (
    <Lock className="h-3.5 w-3.5 text-amber-500" />
  ) : (
    <Globe className="h-3.5 w-3.5 text-emerald-500" />
  );

  return (
    <>
      <button
        onClick={handleClick}
        title={visibilidad === "restringido" ? "Restringido — click para gestionar acceso" : "Público — click para gestionar acceso"}
        className={`inline-flex items-center justify-center rounded p-0.5 transition-colors shrink-0 ${
          canManage
            ? "cursor-pointer hover:bg-muted"
            : "cursor-default opacity-60"
        }`}
      >
        {icon}
      </button>

      {data && (
        <AccesoModal
          open={open}
          onOpenChange={setOpen}
          resourceType={resourceType}
          resourceId={resourceId}
          resourceName={resourceName}
          visibilidad={visibilidad}
          accesos={data.accesos}
          usuarios={data.usuarios}
          grupos={data.grupos}
          onVisibilidadChange={setVis}
        />
      )}
    </>
  );
}
