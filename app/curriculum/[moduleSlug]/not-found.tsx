import Link from "next/link";

export default function ModuleNotFoundPage() {
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <section className="rounded-xl border border-rule bg-surface p-6">
        <p className="font-mono text-sm font-semibold uppercase text-accent">Module not found</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-ink">This module is not available yet.</h1>
        <p className="mt-3 text-ink-soft">
          Check back after the curriculum is refreshed, or browse other modules from the roadmap.
        </p>
        <Link
          href="/curriculum"
          className="mt-5 inline-flex items-center rounded-full border border-rule bg-surface px-4 py-2 text-sm font-semibold"
        >
          Return to curriculum
        </Link>
      </section>
    </main>
  );
}
