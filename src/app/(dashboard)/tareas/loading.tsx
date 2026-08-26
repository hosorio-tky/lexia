export default function TareasLoading() {
  return (
    <>
      <div className="h-7 w-48 rounded-lg bg-muted animate-pulse mb-6" />

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["Pendientes", "En progreso", "Completadas"].map((col) => (
          <div key={col} className="rounded-2xl border bg-card/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="h-5 w-6 rounded-full bg-muted animate-pulse" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-3 space-y-2">
                <div className="h-3.5 rounded bg-muted animate-pulse" style={{ width: `${50 + i * 15}%` }} />
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
