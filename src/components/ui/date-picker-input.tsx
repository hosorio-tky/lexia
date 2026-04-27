"use client";

import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatePickerInputProps {
  /** Nombre del hidden input que va al FormData */
  name: string;
  /** Valor inicial en formato ISO (YYYY-MM-DD) */
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

export function DatePickerInput({
  name,
  defaultValue,
  placeholder = "Seleccionar fecha",
  className,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Date | undefined>(() => {
    if (!defaultValue) return undefined;
    const d = parseISO(defaultValue);
    return isValid(d) ? d : undefined;
  });

  // Valor ISO para el hidden input (siempre YYYY-MM-DD)
  const isoValue = selected ? format(selected, "yyyy-MM-dd") : "";

  // Etiqueta legible en español
  const label = selected
    ? format(selected, "d 'de' MMMM yyyy", { locale: es })
    : null;

  function handleSelect(day: Date | undefined) {
    setSelected(day);
    if (day) setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    setSelected(undefined);
  }

  return (
    <>
      {/* Hidden input que captura el FormData */}
      <input type="hidden" name={name} value={isoValue} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selected && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
            <span className="flex-1 truncate">
              {label ?? placeholder}
            </span>
            {selected && (
              <X
                className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected}
            locale={es}
            captionLayout="dropdown"
            startMonth={new Date(2000, 0)}
            endMonth={new Date(2040, 11)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
