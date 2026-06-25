export default function DashboardLoading() {
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="h-72 animate-pulse rounded-xl border border-rule bg-surface" />
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="h-48 animate-pulse rounded-xl border border-rule bg-surface" />
          <div className="h-48 animate-pulse rounded-xl border border-rule bg-surface" />
        </section>
      </div>
    </main>
  );
}
