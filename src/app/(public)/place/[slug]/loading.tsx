export default function ListingLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 h-5 w-28 rounded-sm bg-muted" />
      <div className="h-[420px] rounded-md border bg-card shadow-sm" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="h-36 rounded-md border bg-card shadow-sm" />
          <div className="h-32 rounded-md border bg-card shadow-sm" />
          <div className="h-48 rounded-md border bg-card shadow-sm" />
        </div>
        <div className="h-56 rounded-md border bg-card shadow-sm" />
      </div>
    </div>
  );
}
