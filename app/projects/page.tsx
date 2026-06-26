import { ResourceIndexList } from "@/components/curriculum/resource-index-list";
import { HomeCta } from "@/components/curriculum/home-cta";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getModules } from "@/lib/content.server";
import { PortfolioProgress } from "@/components/gamification/gamification-components";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUserLessonProgress } from "@/lib/supabase/progress";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProjectSubmissions } from "@/lib/supabase/project-submissions";

export const metadata = {
  title: "Build Missions | AI Foundry"
};

export default async function ProjectsPage() {
  const modules = await getModules();
  const isSupabaseReady = isSupabaseConfigured();
  let isAuthenticated = false;
  if (isSupabaseReady) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;

    isAuthenticated =
      typeof claims === "object" &&
      claims !== null &&
      "sub" in claims &&
      typeof (claims as { sub?: unknown }).sub === "string";
  }

  const userProjectSubmissions = isAuthenticated
    ? await getCurrentUserProjectSubmissions(modules.map((module) => module.slug))
    : [];
  const initialProgress = isSupabaseReady
    ? await getCurrentUserLessonProgress(modules.map((module) => module.slug))
    : {};
  const projects = modules.flatMap((module) =>
    module.lessons
      .filter((lesson) => lesson.type === "project")
      .map((lesson) => ({
        ...lesson,
        moduleTitle: module.title,
        moduleSlug: module.slug
      }))
  );
  const submissionCount = isAuthenticated ? userProjectSubmissions.length : 0;
  const recentProjectSubmissions = isAuthenticated ? userProjectSubmissions.slice(0, 3) : [];
  const lessonTitleByProgressKey = new Map(
    modules.flatMap((module) =>
      module.lessons.map((lesson) => [`${module.slug}::${lesson.slug}`, lesson.title] as const)
    )
  );
  const moduleBuildMissions = modules.flatMap((module) =>
    module.lessons
      .filter((lesson) => lesson.type === "project")
      .map((lesson) => ({
        moduleSlug: module.slug,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        moduleTitle: module.title
      }))
  );
  const submissionLookup = new Map(
    userProjectSubmissions.map((submission) => [`${submission.moduleSlug}::${submission.lessonSlug}`, submission])
  );
  const portfolioCompleteCount = moduleBuildMissions.filter((mission) =>
    submissionLookup.has(`${mission.moduleSlug}::${mission.lessonSlug}`)
  ).length;
  const incompletePortfolioMissions = moduleBuildMissions
    .filter((mission) => !submissionLookup.has(`${mission.moduleSlug}::${mission.lessonSlug}`))
    .slice(0, 4);

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="font-mono text-sm font-semibold uppercase text-accent">Build Missions</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-ink">Build Missions</h1>
      <p className="mt-4 max-w-2xl leading-7 text-ink-soft">
        Build Missions turn lessons into evidence. Complete yours to build a portfolio trail as you
        move through the curriculum.
      </p>
      <div className="mt-6">
        <HomeCta modules={modules} initialProgress={initialProgress} />
      </div>
      <section className="mt-6">
        <PortfolioProgress
          completedMissions={portfolioCompleteCount}
          missingMissions={incompletePortfolioMissions}
          totalMissions={moduleBuildMissions.length}
        />
      </section>
      <section className="mt-6 rounded-xl border border-rule bg-surface p-4">
        <p className="text-sm font-semibold text-ink">Your submissions</p>
        {isAuthenticated ? (
          <p className="mt-2 text-sm text-ink-soft">
            {submissionCount} build mission submission{submissionCount === 1 ? "" : "s"} synced to your account.
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">
            Log in to save and track your build mission submissions.
          </p>
        )}
      {recentProjectSubmissions.length > 0 ? (
          <ul className="mt-4 grid gap-3">
            {recentProjectSubmissions.map((submission) => {
              const lessonTitle = lessonTitleByProgressKey.get(`${submission.moduleSlug}::${submission.lessonSlug}`) ?? submission.lessonSlug;
              return (
                <li
                  key={submission.id}
                  className="rounded-lg border border-rule bg-paper px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-ink">
                    {submission.moduleSlug} — {lessonTitle}
                  </p>
                  <p className="mt-1 text-ink-soft">Status: {submission.status}</p>
                  {submission.skills.length > 0 ? (
                    <p className="mt-1 text-xs text-ink-soft">
                      Skills: {submission.skills.join(", ")}
                    </p>
                  ) : null}
                  {submission.technicalWriteup ? (
                    <p className="mt-1 text-xs text-ink-soft">
                      Write-up: {submission.technicalWriteup.slice(0, 120)}
                      {submission.technicalWriteup.length > 120 ? "..." : ""}
                    </p>
                  ) : null}
                  {submission.reflection ? (
                    <p className="mt-1 text-xs text-ink-soft">
                      Reflection: {submission.reflection.slice(0, 140)}
                      {submission.reflection.length > 140 ? "..." : ""}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <a
                      className="inline-flex items-center gap-2 text-sm font-semibold text-accent underline underline-offset-4"
                      href={submission.repoUrl}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      Repo
                    </a>
                    {submission.liveUrl ? (
                      <a
                        className="inline-flex items-center gap-2 text-sm font-semibold text-accent underline underline-offset-4"
                        href={submission.liveUrl}
                        rel="noreferrer noopener"
                        target="_blank"
                      >
                        Live demo
                      </a>
                    ) : null}
                    <Link
                      className="inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-accent"
                      href={`/curriculum/${submission.moduleSlug}/${submission.lessonSlug}`}
                    >
                      Open mission
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
      {projects.length > 0 ? (
        <ResourceIndexList
          initialProgress={initialProgress}
          items={projects}
          modules={modules}
          type="project"
          projectSubmissions={userProjectSubmissions}
        />
      ) : (
        <div className="mt-8 rounded-lg border border-rule bg-surface p-6">
          <h2 className="text-xl font-bold text-ink">No build missions published yet</h2>
          <p className="mt-2 text-ink-soft">
            Add a lesson with type "project" to a module.json file to publish a build mission.
          </p>
        </div>
      )}
    </main>
  );
}
