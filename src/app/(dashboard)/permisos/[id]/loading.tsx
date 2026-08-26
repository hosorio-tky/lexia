export default function PermisoDetalleLoading() {
  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="space-y-2">
          <div className="h-7 w-72 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-40 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />
          <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border bg-card p-5 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${50 + i * 8}%` }} />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="h-3.5 rounded bg-muted animate-pulse" style={{ width: `${40 + i * 12}%` }} />
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
