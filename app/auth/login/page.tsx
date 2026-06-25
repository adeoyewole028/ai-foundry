import Link from "next/link";
import { LogIn } from "lucide-react";
import { login } from "@/app/auth/actions";
import { LocalProgressField } from "@/components/auth/local-progress-field";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = {
  title: "Log in | AI Foundry"
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const isConfigured = isSupabaseConfigured();

  return (
    <main id="main-content" className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <section className="rounded-xl border border-rule bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-accent">
          <LogIn className="size-4" aria-hidden="true" />
          Learner account
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-ink">Log in</h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          Sign in to save progress, resume lessons, and unlock the dashboard.
        </p>

        {!isConfigured ? (
          <div className="mt-5 rounded-lg border border-rule bg-paper p-4 text-sm text-ink-soft">
            Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to enable
            authentication.
          </div>
        ) : null}

        {params.error ? (
          <p className="mt-5 rounded-lg border border-rule bg-paper p-3 text-sm text-accent">
            {params.error}
          </p>
        ) : null}
        {params.message ? (
          <p className="mt-5 rounded-lg border border-rule bg-accent-soft p-3 text-sm text-ink">
            {params.message}
          </p>
        ) : null}

        <form action={login} className="mt-6 grid gap-4">
          <LocalProgressField fieldName="localProgress" quizFieldName="localQuizProgress" />
          <label className="grid gap-1 text-sm font-semibold text-ink">
            Email
            <input
              className="min-h-11 rounded-lg border border-rule bg-paper px-3 text-sm font-normal"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-ink">
            Password
            <input
              className="min-h-11 rounded-lg border border-rule bg-paper px-3 text-sm font-normal"
              minLength={6}
              name="password"
              required
              type="password"
            />
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-surface transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isConfigured}
            type="submit"
          >
            Log in
          </button>
        </form>

        <p className="mt-5 text-sm text-ink-soft">
          New here?{" "}
          <Link className="font-semibold text-accent underline underline-offset-4" href="/auth/signup">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
