export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 space-y-2">
        <div className="h-4 w-36 rounded-sm bg-muted" />
        <div className="h-8 w-64 rounded-sm bg-muted" />
        <div className="h-4 w-80 max-w-full rounded-sm bg-muted" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="h-[520px] rounded-md border bg-card p-4 shadow-sm" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,45%)]">
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                className="h-80 rounded-md border bg-card shadow-sm"
                key={index}
              />
            ))}
          </div>
          <div className="hidden h-[520px] rounded-md border bg-card shadow-sm lg:block" />
        </div>
      </div>
    </div>
  );
}
