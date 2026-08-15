"use client";

import { useState } from "react";
import { ChevronDown, X, Plus } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ResponsableAddDialog } from "./responsable-add-dialog";
import type { Responsable } from "@/lib/repositories/responsables";
import type { ProfileOption } from "@/types/users";

interface ResponsableMultiSelectProps {
  responsables: Responsable[];
  profiles: ProfileOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onResponsableAdded: (r: Responsable) => void;
}

function getProfileForResponsable(r: Responsable, profiles: ProfileOption[]) {
  if (!r.user_id) return null;
  return profiles.find((p) => p.id === r.user_id) ?? null;
}

export function ResponsableMultiSelect({
  responsables,
  profiles,
  selectedIds,
  onChange,
  onResponsableAdded,
}: ResponsableMultiSelectProps) {
  const [open, setOpen]         = useState(false);
  const [addOpen, setAddOpen]   = useState(false);

  const active = responsables.filter((r) => r.activo);
  const selected = selectedIds
    .map((id) => active.find((r) => r.id === id))
    .filter((r): r is Responsable => r !== undefined);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-muted-foreground">
              {selectedIds.length === 0
                ? "Sin asignar"
                : selectedIds.length === 1
                ? selected[0]?.nombre ?? "1 seleccionado"
                : `${selectedIds.length} responsables`}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="max-h-56 overflow-y-auto p-1">
            {active.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                Sin responsables configurados.
              </p>
            ) : (
              active.map((r) => {
                const checked = selectedIds.includes(r.id);
                const profile = getProfileForResponsable(r, profiles);
                const dept  = profile?.departamento || null;
                const cargo = profile ? (profile.cargo || null) : (r.area || null);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggle(r.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted transition"
                  >
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                      {checked && (
                        <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="font-medium truncate">{r.nombre}</p>
                      {(dept || cargo) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[dept, cargo].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t p-1">
            <button
              type="button"
              onClick={() => { setOpen(false); setAddOpen(true); }}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm text-primary font-medium hover:bg-muted transition"
            >
              <Plus className="h-3.5 w-3.5" />Agregar responsable…
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Cards de responsables seleccionados */}
      {selected.length > 0 && (
        <div className="space-y-1.5">
          {selected.map((r) => {
            const profile = getProfileForResponsable(r, profiles);
            const dept  = profile?.departamento || null;
            const cargo = profile ? (profile.cargo || null) : (r.area || null);
            return (
              <div key={r.id} className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
                  {r.nombre.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-medium truncate">{r.nombre}</p>
                  {(dept || cargo) && (
                    <p className="text-muted-foreground truncate">
                      {[dept, cargo].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {r.email && <p className="text-muted-foreground truncate">{r.email}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="shrink-0 grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-destructive hover:bg-muted transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden inputs para el form */}
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="responsable_ids[]" value={id} />
      ))}

      <ResponsableAddDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        profiles={profiles}
        onItemAdded={(r) => {
          onResponsableAdded(r);
          onChange([...selectedIds, r.id]);
        }}
      />
    </div>
  );
}
