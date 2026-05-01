/**
 * Muestra createdAt y updatedAt en una sola celda compacta.
 * - Si hay modificación posterior: muestra "Modif." como fecha principal
 *   y "Creado" como secundaria.
 * - Si no: muestra solo "Creado".
 */

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ActivityCell({
  createdAt,
  updatedAt,
}: {
  createdAt: string;
  updatedAt?: string | null;
}) {
  const hasUpdate =
    updatedAt && updatedAt !== createdAt && updatedAt > createdAt;

  const title = [
    `Creado: ${fmt(createdAt)}`,
    hasUpdate ? `Modificado: ${fmt(updatedAt!)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="flex flex-col gap-0.5 min-w-[100px]" title={title}>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground w-10 shrink-0">
          {hasUpdate ? "Modif." : "Creado"}
        </span>
        <span className="text-xs text-foreground">
          {fmt(hasUpdate ? updatedAt! : createdAt)}
        </span>
      </div>
      {hasUpdate && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground w-10 shrink-0">
            Creado
          </span>
          <span className="text-[11px] text-muted-foreground">
            {fmt(createdAt)}
          </span>
        </div>
      )}
    </div>
  );
}
