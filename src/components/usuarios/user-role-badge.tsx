import { ROLE_LABELS, ROLE_COLORS, type UserRole } from "@/types/users";

export function UserRoleBadge({ rol }: { rol: UserRole }) {
  const label = ROLE_LABELS[rol] ?? rol;
  const color = ROLE_COLORS[rol] ?? "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
