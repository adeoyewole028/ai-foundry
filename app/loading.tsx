export default function Loading() {
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="space-y-4">
        <div className="h-8 w-52 animate-pulse rounded-lg bg-surface" />
        <div className="h-12 w-4/5 animate-pulse rounded-lg bg-surface" />
        <div className="h-6 w-1/3 animate-pulse rounded-lg bg-surface" />
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="h-48 animate-pulse rounded-xl border border-rule bg-surface p-5" />
        <div className="h-48 animate-pulse rounded-xl border border-rule bg-surface p-5" />
      </div>
    </main>
  );
}
