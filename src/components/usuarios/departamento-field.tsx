"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CatalogAddDialog } from "@/components/shared/catalog-add-dialog";
import type { CatalogoItem } from "@/types/settings";

const NINGUNO = "__ninguno__";

export function DepartamentoField({
  defaultValue,
  departamentos,
}: {
  defaultValue?: string;
  departamentos: CatalogoItem[];
}) {
  const [items, setItems]   = useState<CatalogoItem[]>(departamentos);
  const [value, setValue]   = useState(defaultValue ?? NINGUNO);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <input type="hidden" name="departamento_id" value={value === NINGUNO ? "" : value} />
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === "__add__") { setAddOpen(true); return; }
          setValue(v);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecciona un departamento…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NINGUNO}>— Ninguno —</SelectItem>
          {items.map((d) => (
            <SelectItem key={d.id} value={d.id}>{d.valor}</SelectItem>
          ))}
          <SelectItem value="__add__" className="text-primary font-medium">
            <Plus className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />Agregar departamento…
          </SelectItem>
        </SelectContent>
      </Select>
      <CatalogAddDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Departamentos"
        modulo="global"
        tipo="departamento"
        onItemAdded={(item) => {
          setItems((prev) => [...prev, item]);
          setValue(item.id);
        }}
      />
    </>
  );
}
