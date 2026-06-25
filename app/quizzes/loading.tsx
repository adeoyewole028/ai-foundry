export default function QuizzesLoading() {
  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="space-y-4">
        <div className="h-5 w-24 animate-pulse rounded-lg bg-surface" />
        <div className="h-12 w-80 max-w-full animate-pulse rounded-lg bg-surface" />
        <div className="h-6 w-full max-w-2xl animate-pulse rounded-lg bg-surface" />
      </div>
      <div className="mt-8 grid gap-4">
        <div className="h-36 animate-pulse rounded-lg border border-rule bg-surface" />
        <div className="h-36 animate-pulse rounded-lg border border-rule bg-surface" />
      </div>
    </main>
  );
}
