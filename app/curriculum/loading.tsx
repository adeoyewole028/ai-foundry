export default function CurriculumLoading() {
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-surface" />
        <div className="h-12 w-3/4 animate-pulse rounded-lg bg-surface" />
        <div className="h-6 w-5/6 animate-pulse rounded-lg bg-surface" />
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl border border-rule bg-surface p-5" />
        <div className="h-40 animate-pulse rounded-xl border border-rule bg-surface p-5" />
        <div className="h-40 animate-pulse rounded-xl border border-rule bg-surface p-5" />
      </div>
    </main>
  );
}
