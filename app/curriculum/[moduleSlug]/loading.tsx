export default function ModuleLoading() {
  return (
    <main id="main-content" className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="space-y-4">
        <div className="h-4 w-28 animate-pulse rounded-lg bg-surface" />
        <div className="h-12 w-3/4 animate-pulse rounded-lg bg-surface" />
        <div className="h-28 animate-pulse rounded-lg border border-rule bg-surface p-4" />
        <div className="h-10 w-40 animate-pulse rounded-full bg-surface" />
      </section>
      <section className="space-y-3">
        <div className="h-7 w-24 animate-pulse rounded-lg bg-surface" />
        <div className="h-28 animate-pulse rounded-xl border border-rule bg-surface p-5" />
      </section>
    </main>
  );
}
