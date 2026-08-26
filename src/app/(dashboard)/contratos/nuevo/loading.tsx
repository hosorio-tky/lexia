export default function NuevoContratoLoading() {
  return (
    <>
      <div className="h-7 w-44 rounded-lg bg-muted animate-pulse mb-6" />
      <div className="max-w-2xl space-y-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
            <div className={`w-full rounded-xl bg-muted animate-pulse ${i === 4 ? "h-28" : "h-10"}`} />
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <div className="h-10 w-32 rounded-xl bg-muted animate-pulse" />
          <div className="h-10 w-24 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    </>
  );
}
