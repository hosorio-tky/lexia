import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Accent = "default" | "success" | "warning" | "danger" | "info";

const ACCENT_STYLES: Record<
  Accent,
  { border: string; icon: string; value: string; bg: string }
> = {
  default: {
    border: "border-border",
    icon:   "bg-muted text-muted-foreground",
    value:  "text-foreground",
    bg:     "",
  },
  success: {
    border: "border-emerald-200",
    icon:   "bg-emerald-100 text-emerald-600",
    value:  "text-emerald-700",
    bg:     "bg-emerald-50/40",
  },
  warning: {
    border: "border-orange-200",
    icon:   "bg-orange-100 text-orange-600",
    value:  "text-orange-700",
    bg:     "bg-orange-50/40",
  },
  danger: {
    border: "border-red-200",
    icon:   "bg-red-100 text-red-600",
    value:  "text-red-700",
    bg:     "bg-red-50/40",
  },
  info: {
    border: "border-blue-200",
    icon:   "bg-blue-100 text-blue-600",
    value:  "text-blue-700",
    bg:     "bg-blue-50/40",
  },
};

interface StatCardProps {
  title: string;
  value: number | string;
  description?: React.ReactNode;
  icon: React.ReactNode;
  accent?: Accent;
  href?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  accent = "default",
  href,
}: StatCardProps) {
  const s = ACCENT_STYLES[accent];

  const inner = (
    <Card
      className={cn(
        "flex items-start gap-4 p-5 shadow-sm transition-shadow",
        s.border,
        s.bg,
        href && "hover:shadow-md"
      )}
    >
      <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", s.icon)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <p className={cn("mt-0.5 text-3xl font-bold leading-none tracking-tight", s.value)}>
          {value}
        </p>
        {description && (
          <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </Card>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
