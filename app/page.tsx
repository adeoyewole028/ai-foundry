import { BookOpen, CheckCircle2, Clock, FileText, ListChecks } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getModules } from "@/lib/content.server";
import { HomeCta } from "@/components/curriculum/home-cta";
import { getOrderedModules } from "@/lib/curriculum-prerequisites";
import { getCurrentUserLessonProgress } from "@/lib/supabase/progress";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const learningLoop = [
  "Read a plain-English concept",
  "Work through a product example",
  "Try the exercise",
  "Capture the reflection"
];

export default async function HomePage() {
  const modules = await getModules();
  const orderedModules = getOrderedModules(modules);
  const firstModule = orderedModules[0];
  const totalUnits = modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const totalProjects = modules.reduce(
    (sum, module) => sum + module.lessons.filter((lesson) => lesson.type === "project").length,
    0
  );
  let initialProgress = {};

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;

    if (
      typeof claims === "object" &&
      claims !== null &&
      "sub" in claims &&
      typeof (claims as { sub?: unknown }).sub === "string"
    ) {
      initialProgress = await getCurrentUserLessonProgress(
        orderedModules.map((module) => module.slug)
      );
    }
  }

  return (
    <main id="main-content">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-20">
        <div className="min-w-0">
          <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-rule bg-surface px-3 py-1 font-mono text-sm font-semibold text-accent">
            <BookOpen className="size-4" aria-hidden="true" />
            <span className="truncate">
              Learning Journey <span className="hidden sm:inline">/ foundation path</span>
            </span>
          </p>
          <h1 className="mt-6 max-w-3xl text-[var(--text-display)] font-black leading-[0.95] tracking-[-0.035em] text-ink">
            Learn AI by shipping the small pieces.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft">
            AI Foundry gives builders a sequenced path through AI concepts, product judgment, and
            portfolio work. Start with the foundation module and move one learning step at a time.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <HomeCta modules={orderedModules} initialProgress={initialProgress} />
            <ButtonLink href="/curriculum" variant="secondary">
              Browse curriculum
            </ButtonLink>
          </div>
          <dl className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-rule bg-surface p-4">
              <dt className="font-mono text-xs uppercase text-ink-soft">Modules</dt>
              <dd className="mt-2 text-2xl font-black text-ink">{modules.length}</dd>
            </div>
            <div className="rounded-lg border border-rule bg-surface p-4">
              <dt className="font-mono text-xs uppercase text-ink-soft">Learning units</dt>
              <dd className="mt-2 text-2xl font-black text-ink">{totalUnits}</dd>
            </div>
            <div className="rounded-lg border border-rule bg-surface p-4">
              <dt className="font-mono text-xs uppercase text-ink-soft">Projects</dt>
              <dd className="mt-2 text-2xl font-black text-ink">{totalProjects}</dd>
            </div>
          </dl>
        </div>

        <section
          aria-label="AI Foundations workbench preview"
          className="rounded-xl border border-rule bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-5"
        >
          <div className="rounded-lg bg-ink p-4 text-paper">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper/15 pb-4">
              <div>
                <p className="font-mono text-xs uppercase text-paper/60">Current module</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.02em]">
                  {firstModule?.title ?? "No module yet"}
                </h2>
              </div>
              <span className="rounded-full bg-paper px-3 py-1 font-mono text-xs font-bold text-ink">
                {firstModule?.level ?? "Draft"}
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {firstModule?.lessons.slice(0, 3).map((lesson, index) => (
                <div className="flex items-start gap-3 rounded-md bg-paper/8 p-3" key={lesson.slug}>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-paper text-sm font-black text-ink">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{lesson.title}</p>
                    <p className="mt-1 text-sm leading-6 text-paper/65">{lesson.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-rule bg-paper p-4">
              <Clock className="size-5 text-accent" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-ink">Designed for steady pace</p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                Lessons stay short enough to complete, review, and explain back.
              </p>
            </div>
            <div className="rounded-lg border border-rule bg-paper p-4">
              <ListChecks className="size-5 text-accent" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-ink">Every lesson follows a clear flow</p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                Objective, example, exercise, reflection, and checklist.
              </p>
            </div>
          </div>
        </section>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.02em] text-ink">The learning loop</h2>
            <p className="mt-3 max-w-xl leading-7 text-ink-soft">
              The first stage is designed to make the next step obvious, even before optional account
              tracking is enabled.
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {learningLoop.map((item) => (
              <li className="flex gap-3 rounded-lg border border-rule bg-surface p-4" key={item}>
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                <span className="font-medium text-ink">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-rule bg-surface p-5 sm:p-8">
          <FileText className="size-6 text-accent" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-black tracking-[-0.02em] text-ink">
            Learning stays first.
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-ink-soft">
            The product focus is clear structure first: reliable module loading, consistent lesson pages,
            and obvious next-step guidance.
          </p>
        </div>
      </section>
    </main>
  );
}
