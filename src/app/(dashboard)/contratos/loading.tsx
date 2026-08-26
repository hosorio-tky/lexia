export default function ContratosLoading() {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="h-7 w-36 rounded-lg bg-muted animate-pulse" />
        <div className="h-9 w-36 rounded-lg bg-muted animate-pulse" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            <div className="h-6 w-10 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="h-9 w-56 rounded-lg bg-muted animate-pulse" />
        <div className="h-9 w-28 rounded-lg bg-muted animate-pulse" />
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 rounded bg-muted animate-pulse" style={{ width: `${40 + (i % 4) * 12}%` }} />
                <div className="h-3 w-28 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
              <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
