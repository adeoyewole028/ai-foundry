export default function LessonLoading() {
  return (
    <main id="main-content" className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-3">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-surface" />
        <div className="h-56 rounded-lg border border-rule bg-surface p-3" />
      </aside>
      <article className="rounded-xl border border-rule bg-surface px-5 py-8 sm:px-8">
        <div className="space-y-3">
          <div className="h-4 w-28 animate-pulse rounded-lg bg-rule" />
          <div className="h-10 w-4/5 animate-pulse rounded-lg bg-rule" />
          <div className="h-4 w-full animate-pulse rounded-lg bg-rule" />
          <div className="h-4 w-3/4 animate-pulse rounded-lg bg-rule" />
          <div className="h-4 w-2/3 animate-pulse rounded-lg bg-rule" />
        </div>
      </article>
    </main>
  );
}
