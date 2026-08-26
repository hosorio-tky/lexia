export default function DashboardHomeLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Saludo */}
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-80 rounded bg-muted animate-pulse" />
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
            </div>
            <div className="h-8 w-16 rounded bg-muted animate-pulse" />
            <div className="h-3 w-32 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>

      {/* Fila central */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-2xl border bg-card p-5 space-y-4">
          <div className="h-4 w-36 rounded bg-muted animate-pulse" />
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        </div>
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5 space-y-4">
          <div className="h-4 w-36 rounded bg-muted animate-pulse" />
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>

      {/* Fila inferior */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-2xl border bg-card p-5 space-y-3">
          <div className="h-4 w-40 rounded bg-muted animate-pulse" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 rounded bg-muted animate-pulse flex-1" style={{ width: `${50 + i * 8}%` }} />
              <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5 space-y-3">
          <div className="h-4 w-36 rounded bg-muted animate-pulse" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-lg bg-muted animate-pulse shrink-0" />
              <div className="h-3.5 rounded bg-muted animate-pulse" style={{ width: `${40 + i * 10}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
