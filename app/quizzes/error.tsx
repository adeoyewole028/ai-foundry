"use client";

import Link from "next/link";

export default function QuizzesError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <section className="rounded-xl border border-rule bg-surface p-6">
        <p className="font-mono text-sm font-semibold uppercase text-accent">Quizzes error</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-ink">
          We cannot load quizzes right now.
        </h1>
        <p className="mt-3 text-ink-soft">
          Retry the list, or return to the curriculum and open a quiz from its module.
        </p>
        {error.message ? (
          <p className="mt-2 text-xs text-ink-soft">Details: {error.message}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={reset}
            type="button"
            className="rounded-full border border-rule bg-paper px-4 py-2 text-sm font-semibold"
          >
            Retry
          </button>
          <Link
            href="/curriculum"
            className="rounded-full border border-rule bg-surface px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent"
          >
            Back to curriculum
          </Link>
        </div>
      </section>
    </main>
  );
}
