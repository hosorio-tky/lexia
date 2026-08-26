export default function DashboardLoading() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      {/* Header skeleton */}
      <div className="fixed inset-x-0 top-0 z-40 h-16 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1400px] items-center gap-4 px-4 lg:px-6">
          <div className="ml-auto flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-muted animate-pulse" />
            <div className="h-9 w-9 rounded-xl bg-muted animate-pulse" />
            <div className="h-9 w-9 rounded-xl bg-muted animate-pulse" />
          </div>
        </div>
      </div>

      {/* Sidebar skeleton */}
      <aside className="fixed left-0 top-0 z-50 hidden h-svh w-[240px] border-r bg-background/80 backdrop-blur lg:flex lg:flex-col">
        {/* Logo placeholder */}
        <div className="flex h-16 items-center px-4">
          <div className="h-8 w-28 rounded-md bg-muted animate-pulse" />
        </div>

        {/* Nav items */}
        <div className="flex-1 px-3 py-3 space-y-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5">
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
              <div className="h-4 rounded-md bg-muted animate-pulse" style={{ width: `${55 + (i % 3) * 15}px` }} />
            </div>
          ))}
        </div>

        {/* User card */}
        <div className="px-3 pb-4">
          <div className="rounded-2xl border bg-card/70 p-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-muted animate-pulse" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Content skeleton */}
      <main className="w-full px-4 pb-10 pt-24 lg:pl-[264px] lg:pr-6">
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-40 rounded-lg bg-muted animate-pulse" />
          <div className="h-9 w-28 rounded-lg bg-muted animate-pulse" />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-4 space-y-3">
              <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
              <div className="h-7 w-16 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>

        {/* Content rows */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="p-4 border-b">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          </div>
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <div className="h-8 w-8 rounded-lg bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 rounded bg-muted animate-pulse" style={{ width: `${40 + (i % 4) * 12}%` }} />
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
