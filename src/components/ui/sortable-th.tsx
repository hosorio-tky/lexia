import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortState } from "@/lib/sort-utils";

interface SortableThProps<K extends string> {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  className?: string;
  align?: "left" | "right";
}

export function SortableTh<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className,
  align = "left",
}: SortableThProps<K>) {
  const active = sort.key === sortKey;
  return (
    <th className={cn("h-10 px-4 align-middle", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground select-none",
          active ? "text-foreground" : "text-muted-foreground",
          align === "right" && "flex-row-reverse"
        )}
      >
        {label}
        {active ? (
          sort.dir === "asc"
            ? <ChevronUp   className="h-3 w-3 shrink-0" />
            : <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-40" />
        )}
      </button>
    </th>
  );
}
