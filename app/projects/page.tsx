import { ResourceIndexList } from "@/components/curriculum/resource-index-list";
import { HomeCta } from "@/components/curriculum/home-cta";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getModules } from "@/lib/content";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUserLessonProgress } from "@/lib/supabase/progress";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProjectSubmissions } from "@/lib/supabase/project-submissions";

export const metadata = {
  title: "Projects | AI Foundry"
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

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="font-mono text-sm font-semibold uppercase text-accent">Projects</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-ink">Portfolio work</h1>
      <p className="mt-4 max-w-2xl leading-7 text-ink-soft">
        Projects turn lessons into evidence. Submit yours and keep a portfolio trail as you complete the
        curriculum.
      </p>
      <div className="mt-6">
        <HomeCta modules={modules} initialProgress={initialProgress} />
      </div>
      <section className="mt-6 rounded-xl border border-rule bg-surface p-4">
        <p className="text-sm font-semibold text-ink">Your submissions</p>
        {isAuthenticated ? (
          <p className="mt-2 text-sm text-ink-soft">
            {submissionCount} project submission{submissionCount === 1 ? "" : "s"} synced to your account.
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">
            Log in to save and track your project submissions.
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
                      Open lesson
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
          <h2 className="text-xl font-bold text-ink">No projects published yet</h2>
          <p className="mt-2 text-ink-soft">
            Add a lesson with type "project" to a module.json file to publish portfolio work.
          </p>
        </div>
      )}
    </main>
  );
}
