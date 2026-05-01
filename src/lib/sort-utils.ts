export type SortDir = "asc" | "desc";
export interface SortState<K extends string = string> {
  key: K;
  dir: SortDir;
}

/** Alterna dirección si la key es la misma; resetea a "desc" si cambia. */
export function nextSort<K extends string>(
  current: SortState<K>,
  key: K
): SortState<K> {
  if (current.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { key, dir: "desc" };
}

/** Ordena un array de objetos por la clave/valor devuelto por getField. */
export function sortItems<T>(
  items: T[],
  sort: SortState,
  getField: (item: T, key: string) => string | number | null | undefined
): T[] {
  return [...items].sort((a, b) => {
    const va = getField(a, sort.key) ?? "";
    const vb = getField(b, sort.key) ?? "";
    let cmp = 0;
    if (typeof va === "number" && typeof vb === "number") {
      cmp = va - vb;
    } else {
      cmp = String(va).localeCompare(String(vb), "es");
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });
}

/** Devuelve el timestamp más reciente entre created_at y updated_at. */
export function activityTs(createdAt: string, updatedAt?: string): number {
  const c = new Date(createdAt).getTime();
  const u = updatedAt ? new Date(updatedAt).getTime() : 0;
  return Math.max(c, u);
}
