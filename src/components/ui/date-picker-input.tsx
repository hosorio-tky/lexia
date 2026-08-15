"use client";

import * as React from "react";
import {
  format, parseISO, isValid,
  addMonths, subMonths, setMonth, setYear,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const WEEKDAYS = ["lu","ma","mi","ju","vi","sá","do"];
const THIS_YEAR = new Date().getFullYear();
// Descendente: más recientes arriba (el año actual queda visible de primero)
const YEARS = Array.from({ length: 46 }, (_, i) => THIS_YEAR + 15 - i);

function getCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end   = endOfWeek(endOfMonth(month),     { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

interface DatePickerInputProps {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

export function DatePickerInput({
  name, defaultValue, placeholder = "Seleccionar fecha", className,
}: DatePickerInputProps) {
  const [open, setOpen]         = React.useState(false);
  const [selected, setSelected] = React.useState<Date | undefined>(() => {
    if (!defaultValue) return undefined;
    const d = parseISO(defaultValue);
    return isValid(d) ? d : undefined;
  });
  const [displayMonth, setDisplayMonth] = React.useState<Date>(
    () => selected ?? new Date()
  );

  const isoValue = selected ? format(selected, "yyyy-MM-dd") : "";
  const label    = selected
    ? format(selected, "d 'de' MMMM yyyy", { locale: es })
    : null;

  function handleSelect(day: Date) {
    setSelected(day);
    setOpen(false);
  }


  const days = getCalendarDays(displayMonth);
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <>
      <input type="hidden" name={name} value={isoValue} />

      <Popover open={open} onOpenChange={setOpen}>
        {/* Wrapper relativo para superponer el botón X fuera del trigger */}
        <div className="relative w-full">
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                selected && "pr-8",
                !selected && "text-muted-foreground",
                className
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
              <span className="flex-1 truncate">{label ?? placeholder}</span>
            </Button>
          </PopoverTrigger>
          {selected && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSelected(undefined)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/*
          Popover width = header width = 248px:
            px-1 (8px) + btn (28px) + selects (110+4+70=184px) + btn (28px) = 248px
          Grid width:
            p-3 (12px×2=24px) + 7 cols × 32px (h-8 w-8) = 224+24 = 248px ✓
        */}
        <PopoverContent className="w-auto p-0" align="start">
          {/* Navegación */}
          <div className="flex items-center border-b px-1 py-1.5">
            <Button
              type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0"
              onClick={() => setDisplayMonth((m) => subMonths(m, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex flex-1 items-center justify-center gap-1">
              <Select
                value={String(displayMonth.getMonth())}
                onValueChange={(v) => setDisplayMonth((m) => setMonth(m, Number(v)))}
              >
                <SelectTrigger className="h-7 w-[110px] border-none px-2 text-xs shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_ES.map((m, i) => (
                    <SelectItem key={i} value={String(i)} className="text-xs">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <select
                value={displayMonth.getFullYear()}
                onChange={(e) => setDisplayMonth((m) => setYear(m, Number(e.target.value)))}
                className="h-7 cursor-pointer rounded bg-transparent px-1 text-xs focus:outline-none focus:ring-0"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <Button
              type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0"
              onClick={() => setDisplayMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Grilla: p-3 + 7×32px = 248px exacto */}
          <div className="p-3">
            {/* Encabezados de días */}
            <div className="mb-1 grid grid-cols-7">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="flex h-8 w-8 items-center justify-center text-[0.75rem] font-normal text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Semanas */}
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((day, di) => {
                  const inMonth    = isSameMonth(day, displayMonth);
                  const isSelected = !!selected && isSameDay(day, selected);
                  const todayDay   = isToday(day);

                  return (
                    <button
                      key={di}
                      type="button"
                      onClick={() => handleSelect(day)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        !inMonth && "text-muted-foreground opacity-40",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                        todayDay && !isSelected && "font-semibold",
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
