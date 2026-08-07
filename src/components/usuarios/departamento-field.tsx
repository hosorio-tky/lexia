"use client";

import { useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { CatalogoItem } from "@/types/settings";

const NINGUNO = "__ninguno__";

export function DepartamentoField({
  defaultValue,
  departamentos,
}: {
  defaultValue?: string;  // departamento_id (UUID)
  departamentos: CatalogoItem[];
}) {
  const [value, setValue] = useState(defaultValue ?? NINGUNO);

  return (
    <>
      {/* Hidden input envía "" cuando es Ninguno, para que || null en la action funcione */}
      <input type="hidden" name="departamento_id" value={value === NINGUNO ? "" : value} />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona un departamento…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NINGUNO}>— Ninguno —</SelectItem>
          {departamentos.map((d) => (
            <SelectItem key={d.id} value={d.id}>{d.valor}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
