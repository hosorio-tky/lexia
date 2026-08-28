"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface FilterMultiSelectProps {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
}

// Selector múltiple compacto para barras de filtros: el botón siempre
// muestra el nombre de la categoría (nunca solo "Todos"/"Todas"), con
// un contador cuando hay selección activa.
export function FilterMultiSelect({
  label,
  options,
  selected,
  onChange,
  className,
}: FilterMultiSelectProps) {
  const [open, setOpen] = useState(false);

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50 transition whitespace-nowrap",
            className
          )}
        >
          <span>{label}</span>
          {selected.length > 0 && (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary/10 px-1 text-[11px] font-semibold text-primary">
              {selected.length}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <div className="max-h-64 overflow-y-auto">
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted transition"
              >
                <div
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    checked ? "border-primary bg-primary text-primary-foreground" : "border-input"
                  )}
                >
                  {checked && <Check className="h-3 w-3" />}
                </div>
                <span className="truncate text-left">{opt.label}</span>
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <div className="mt-1 border-t pt-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted transition"
            >
              Limpiar
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
