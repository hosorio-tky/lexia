"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { cn } from "@/lib/utils";

export interface MentionUser {
  id:     string;
  label:  string;   // nombre_completo o nombre
  iniciales: string;
}

interface MentionListProps {
  items:    MentionUser[];
  command:  (item: MentionUser) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIdx, setSelectedIdx] = useState(0);

    // Reset selection when items change
    useEffect(() => setSelectedIdx(0), [items]);

    function selectItem(idx: number) {
      const item = items[idx];
      if (item) command(item);
    }

    useImperativeHandle(ref, () => ({
      onKeyDown({ event }: { event: KeyboardEvent }) {
        if (event.key === "ArrowUp") {
          setSelectedIdx((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIdx((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIdx);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="rounded-lg border bg-popover p-2 shadow-md">
          <p className="px-2 py-1 text-xs text-muted-foreground">Sin resultados</p>
        </div>
      );
    }

    return (
      <div className="rounded-lg border bg-popover shadow-md overflow-hidden w-52">
        {items.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
              idx === selectedIdx
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
            onClick={() => selectItem(idx)}
            onMouseEnter={() => setSelectedIdx(idx)}
          >
            <span
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ring-1",
                idx === selectedIdx
                  ? "bg-primary-foreground/20 text-primary-foreground ring-primary-foreground/30"
                  : "bg-primary/10 text-primary ring-primary/20"
              )}
            >
              {item.iniciales}
            </span>
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = "MentionList";
export { MentionList };
