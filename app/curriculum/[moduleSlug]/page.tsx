import { notFound } from "next/navigation";
import { CheckCircle2, ClipboardList, FileText } from "lucide-react";
import { LessonList } from "@/components/curriculum/lesson-list";
import { ModuleAccessGate } from "@/components/curriculum/module-access-gate";
import { ModuleProgressPanel } from "@/components/curriculum/module-progress";
import { ButtonLink } from "@/components/ui/button";
import { getModules } from "@/lib/content";
import { getModulePrerequisiteState, getOrderedModules } from "@/lib/curriculum-prerequisites";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUserLessonProgress } from "@/lib/supabase/progress";
import { createClient } from "@/lib/supabase/server";

export async function generateStaticParams() {
  const modules = await getModules();

  return modules.map((module) => ({
    moduleSlug: module.slug
  }));
}

export default async function ModulePage({
  params
}: {
  params: Promise<{ moduleSlug: string }>;
}) {
  const { moduleSlug } = await params;
  const modules = await getModules();
  const orderedModules = getOrderedModules(modules);
  const accessState = getModulePrerequisiteState({
    modules: orderedModules,
    moduleSlug,
    progress: {}
  });
  const module = accessState?.module;

  if (!module) {
    notFound();
  }

  const prerequisiteModules = accessState?.prerequisiteModules ?? [];
  const prerequisiteSlugs = prerequisiteModules.map((prerequisiteModule) => prerequisiteModule.slug);

  let isAuthenticated = false;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;

    isAuthenticated =
      typeof claims === "object" &&
      claims !== null &&
      "sub" in claims &&
      typeof (claims as { sub?: unknown }).sub === "string";
  }

  const requestedSlugs = prerequisiteSlugs.concat([module.slug]);
  const progress = isSupabaseConfigured() && isAuthenticated
    ? await getCurrentUserLessonProgress(requestedSlugs)
    : {};

  const firstLesson = module.lessons[0];
  const lessonCount = module.lessons.filter((lesson) => lesson.type === "lesson").length;
  const quizCount = module.lessons.filter((lesson) => lesson.type === "quiz").length;
  const projectCount = module.lessons.filter((lesson) => lesson.type === "project").length;

  const moduleContent = (
    <main
      id="main-content"
      className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]"
    >
      <section>
        <p className="font-mono text-sm font-semibold text-accent">
          Module {String(module.order).padStart(2, "0")} / {module.level}
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-ink">{module.title}</h1>
        <p className="mt-5 text-lg leading-8 text-ink-soft">{module.description}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold text-ink-soft">
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <FileText className="size-4 text-accent" aria-hidden="true" />
            {lessonCount} lesson{lessonCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />
            {quizCount} quiz{quizCount === 1 ? "" : "zes"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <ClipboardList className="size-4 text-accent" aria-hidden="true" />
            {projectCount} project{projectCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-6">
          <ModuleProgressPanel module={module} initialProgress={progress} />
        </div>
        <div className="mt-6 rounded-lg border border-rule bg-surface p-5">
          <h2 className="font-mono text-sm font-bold uppercase text-ink-soft">Outcomes</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-ink-soft">
            {module.outcomes.map((outcome) => (
              <li className="flex gap-2" key={outcome}>
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                {outcome}
              </li>
            ))}
          </ul>
        </div>
        {firstLesson ? (
          <ButtonLink
            className="mt-6 w-full sm:w-auto"
            href={`/curriculum/${module.slug}/${firstLesson.slug}`}
          >
            Start module
          </ButtonLink>
        ) : (
          <div className="mt-6 rounded-lg border border-rule bg-surface p-5 text-sm text-ink-soft">
            This module has no lessons yet. Add lesson entries to module.json to make it startable.
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-4 text-xl font-bold text-ink">Lessons</h2>
        <LessonList module={module} initialProgress={progress} />
      </section>
    </main>
  );

  return (
    <ModuleAccessGate moduleSlug={module.slug} modules={orderedModules} initialProgress={progress}>
      {moduleContent}
    </ModuleAccessGate>
  );
}
