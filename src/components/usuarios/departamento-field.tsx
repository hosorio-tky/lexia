"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const OTRO    = "__otro__";
const NINGUNO = "__ninguno__";

export function DepartamentoField({
  name = "departamento",
  defaultValue,
  departamentos,
  placeholder = "Ej. Legal",
}: {
  name?: string;
  defaultValue?: string;
  departamentos: string[];
  placeholder?: string;
}) {
  const isInList = departamentos.includes(defaultValue ?? "");
  const [selected, setSelected] = useState<string>(
    isInList ? (defaultValue ?? NINGUNO) : (defaultValue ? OTRO : NINGUNO)
  );
  const [custom, setCustom] = useState<string>((!isInList && defaultValue) ? defaultValue : "");

  const hiddenValue = selected === NINGUNO ? "" : selected === OTRO ? custom : selected;

  return (
    <div className="space-y-2">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona un departamento…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NINGUNO}>— Ninguno —</SelectItem>
          {departamentos.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
          <SelectItem value={OTRO}>Otro (escribir)</SelectItem>
        </SelectContent>
      </Select>

      {selected === OTRO && (
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
      )}

      <input type="hidden" name={name} value={hiddenValue} />
    </div>
  );
}
