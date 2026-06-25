import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, CircleCheck, LayoutDashboard } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { ButtonLink } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserLessonProgress } from "@/lib/supabase/progress";
import { getModules } from "@/lib/content";
import { getCurriculumProgress, getModuleLessonProgress } from "@/lib/lesson-progress-core.js";
import { formatModuleDisplayLabel } from "@/lib/curriculum-prerequisites";
import { getCurrentUserProjectSubmissions } from "@/lib/supabase/project-submissions";
import { getNextLessonHref } from "@/lib/progress-navigation";

export const metadata = {
  title: "Dashboard | AI Foundry"
};

function getClaimValue(claims: Record<string, unknown> | null, key: string) {
  const value = claims?.[key];

  return typeof value === "string" ? value : null;
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <section className="rounded-xl border border-rule bg-surface p-6">
          <p className="font-mono text-sm font-semibold uppercase text-accent">Dashboard setup</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-ink">
            Connect Supabase to enable learner accounts.
          </h1>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then create
            the profiles and progress tables before storing account progress.
          </p>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/auth/login");
  }

  const modules = await getModules();
  const userProgress = await getCurrentUserLessonProgress(modules.map((module) => module.slug));
  const curriculumProgress = getCurriculumProgress(modules, userProgress);
  const recentSubmissions = await getCurrentUserProjectSubmissions(modules.map((module) => module.slug));
  const lessonTitleByModuleAndSlug = new Map(
    modules.flatMap((module) =>
      module.lessons.map((lesson) => [`${module.slug}::${lesson.slug}`, lesson.title] as const)
    )
  );
  const recentProjectSubmissions = recentSubmissions.slice(0, 3);
  const claims = data.claims as Record<string, unknown>;
  const email = getClaimValue(claims, "email") ?? "Learner";
  const fullName = getClaimValue(claims, "full_name") ?? getClaimValue(claims, "name");
  const { href: firstIncompleteLessonHref, isComplete: hasCompletedAllLessons } = getNextLessonHref(
    modules,
    userProgress
  );
  const hasRemainingLessons = !hasCompletedAllLessons;
  const completedModules = modules.filter(
    (module) => getModuleLessonProgress(module, userProgress).percent === 100
  );
  const completedModuleCount = completedModules.length;
  const nextModule = modules.find((module) => getModuleLessonProgress(module, userProgress).percent < 100);
  const mostRecentCompletedModule = completedModules.at(-1);
  const completedModuleCopy = mostRecentCompletedModule
    ? `${formatModuleDisplayLabel(mostRecentCompletedModule)}`
    : null;
  const nextModuleCopy = formatModuleDisplayLabel(nextModule ?? modules[0] ?? null);
  const allModulesComplete = completedModuleCount === modules.length;
  const currentPathCopy = hasRemainingLessons ? nextModuleCopy : "All modules complete";
  const nextStepCopy = allModulesComplete
    ? "You’ve completed all published modules."
    : completedModuleCopy && nextModule
      ? `You finished ${completedModuleCopy}, continue with ${nextModuleCopy}.`
      : `Start with ${nextModuleCopy}.`;

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-xl border border-rule bg-surface p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-accent">
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Learner dashboard
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-ink">
            {fullName ? `Welcome, ${fullName}` : "Welcome back"}
          </h1>
          <p className="mt-3 text-sm text-ink-soft">{email}</p>
          <p className="mt-5 max-w-2xl leading-7 text-ink-soft">
            Auth is connected. Lesson completion now persists per user through Supabase-backed
            progress records.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={firstIncompleteLessonHref}>
              {hasRemainingLessons ? "Continue learning" : "Browse curriculum"}
            </ButtonLink>
            <form action={logout}>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-rule bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent/50"
                type="submit"
              >
                Log out
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-rule bg-surface p-5">
            <BookOpen className="size-5 text-accent" aria-hidden="true" />
            <p className="mt-4 font-mono text-xs font-semibold uppercase text-ink-soft">
              Current path
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink">
              {currentPathCopy}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {curriculumProgress.total > 0
                ? `${curriculumProgress.completed} of ${curriculumProgress.total} lessons complete (${curriculumProgress.percent}%)`
                : "No lessons published yet."}
            </p>
          </div>
          <div className="rounded-xl border border-rule bg-surface p-5">
            <CircleCheck className="size-5 text-accent" aria-hidden="true" />
            <p className="mt-4 font-mono text-xs font-semibold uppercase text-ink-soft">
              Account progress
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink">Progress synced for this account</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Lesson completion is now persisted for signed-in learners in `lesson_progress`.
            </p>
          </div>
        </section>
        <section className="rounded-xl border border-rule bg-surface p-5">
          <p className="font-mono text-xs font-semibold uppercase text-ink-soft">Next step</p>
          <h2 className="mt-2 text-xl font-bold text-ink">
            {hasRemainingLessons
              ? `${curriculumProgress.nextLesson?.lessonTitle}`
              : "You’re all caught up"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {hasRemainingLessons
              ? `${nextStepCopy}`
              : "Review completed modules or explore new topics."}
          </p>
          {hasRemainingLessons ? (
            <p className="mt-3">
              <Link
                className="inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-accent"
                href={firstIncompleteLessonHref}
              >
                Go to next lesson
                <ArrowRight className="size-4" />
              </Link>
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href={firstIncompleteLessonHref}>
              {hasRemainingLessons ? "Continue learning" : "Browse curriculum"}
            </ButtonLink>
          </div>
        </section>
        <section className="rounded-xl border border-rule bg-surface p-5">
          <p className="font-mono text-xs font-semibold uppercase text-ink-soft">Recent project submissions</p>
          <h2 className="mt-2 text-xl font-bold text-ink">
            {recentProjectSubmissions.length > 0
              ? `${recentProjectSubmissions.length} saved`
              : "No submissions yet"}
          </h2>
          {recentProjectSubmissions.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {recentProjectSubmissions.map((submission) => (
                <li key={submission.id} className="text-sm text-ink-soft">
                  <p className="font-semibold text-ink">
                    {lessonTitleByModuleAndSlug.get(`${submission.moduleSlug}::${submission.lessonSlug}`) ??
                      submission.lessonSlug}
                  </p>
                  <p className="text-xs">Status: {submission.status}</p>
                  <a
                    className="mt-1 inline-flex items-center gap-2 text-xs font-semibold text-accent underline underline-offset-4"
                    href={submission.repoUrl}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    View repo
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </main>
  );
}
