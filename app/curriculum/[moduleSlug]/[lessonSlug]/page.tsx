import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import { LessonList } from "@/components/curriculum/lesson-list";
import { LessonAccessGate } from "@/components/curriculum/lesson-access-gate";
import { ModuleAccessGate } from "@/components/curriculum/module-access-gate";
import { ModuleProgressPanel } from "@/components/curriculum/module-progress";
import { LessonNav } from "@/components/lessons/lesson-nav";
import { LessonChecklist } from "@/components/lessons/lesson-checklist";
import { ProjectSubmissionForm } from "@/components/lessons/project-submission-form";
import { QuizAssessment } from "@/components/lessons/quiz-assessment";
import { useMDXComponents } from "@/mdx-components";
import { getAdjacentLessons, getLesson, getModules } from "@/lib/content";
import { getModulePrerequisiteState, getOrderedModules } from "@/lib/curriculum-prerequisites";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUserLessonProgress, getLatestQuizAttemptForCurrentUser } from "@/lib/supabase/progress";
import {
  getCurrentUserProjectSubmissions,
  getLatestProjectSubmissionForCurrentUser
} from "@/lib/supabase/project-submissions";
import { lessonProgressKey } from "@/lib/lesson-progress";
import { createClient } from "@/lib/supabase/server";

const lessonTypeCopy = {
  lesson: {
    heading: null,
    summary: null
  },
  quiz: {
    heading: "Module check-in",
    summary:
      "Use this quiz to explain the concepts back in your own words before you move into the project."
  },
  project: {
    heading: "Portfolio assignment",
    summary:
      "This project is where you turn the module into a concrete artifact you can review, refine, and eventually show."
  }
} as const;

export async function generateStaticParams() {
  const modules = await getModules();

  return modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      moduleSlug: module.slug,
      lessonSlug: lesson.slug
    }))
  );
}

export default async function LessonPage({
  params
}: {
  params: Promise<{ moduleSlug: string; lessonSlug: string }>;
}) {
  const { moduleSlug, lessonSlug } = await params;
  const lesson = await getLesson(moduleSlug, lessonSlug);

  if (!lesson) {
    notFound();
  }

  const modules = await getModules();
  const orderedModules = getOrderedModules(modules);
  const moduleAccessState = getModulePrerequisiteState({
    modules: orderedModules,
    moduleSlug: lesson.module.slug,
    progress: {}
  });

  if (!moduleAccessState) {
    notFound();
  }

  const prerequisiteModules = moduleAccessState.prerequisiteModules;
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

  const requestedSlugs = prerequisiteSlugs.concat([lesson.module.slug]);
  const progress = isSupabaseConfigured() && isAuthenticated
    ? await getCurrentUserLessonProgress(requestedSlugs)
    : {};

  const { previousLesson, nextLesson } = getAdjacentLessons(lesson.module, lesson.slug);
  const mdxComponents = useMDXComponents({});
  const typeCopy = lessonTypeCopy[lesson.type];
  const lessonProgress = progress[lessonProgressKey({ moduleSlug: lesson.module.slug, lessonSlug: lesson.slug })] === true;
  const quizAttempt =
    lesson.type === "quiz"
      ? await getLatestQuizAttemptForCurrentUser({
          moduleSlug: lesson.module.slug,
          lessonSlug: lesson.slug
        })
      : null;
  const projectSubmission =
    lesson.type === "project" && isSupabaseConfigured() && isAuthenticated
      ? await getLatestProjectSubmissionForCurrentUser({
          moduleSlug: lesson.module.slug,
          lessonSlug: lesson.slug
        })
      : null;
  const projectSubmissions =
    isSupabaseConfigured() && isAuthenticated
      ? await getCurrentUserProjectSubmissions([lesson.module.slug])
      : [];

  const lessonContent = (
    <main
      id="main-content"
      className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[300px_1fr]"
    >
      <article className="order-1 min-w-0 rounded-xl border border-rule bg-surface px-5 py-8 shadow-sm sm:px-8 lg:order-2 lg:col-start-2 lg:row-start-1">
        <div className="mb-8 flex flex-wrap gap-2 text-xs font-semibold text-ink-soft">
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">{lesson.type}</span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-ink-soft">
            {lesson.estimatedMinutes} min
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-ink-soft">
            {lesson.module.title}
          </span>
        </div>
        {typeCopy.heading && typeCopy.summary ? (
          <section className="mb-8 rounded-xl border border-rule bg-paper px-4 py-4 sm:px-5">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              {typeCopy.heading}
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">{typeCopy.summary}</p>
          </section>
        ) : null}
        <div className="prose-foundry max-w-none">
          <MDXRemote source={lesson.source} components={mdxComponents} />
        </div>
        {lesson.type === "quiz" ? (
          <QuizAssessment
            moduleSlug={lesson.module.slug}
            lessonSlug={lesson.slug}
            quizMode={lesson.quizMode}
            questions={lesson.quizQuestions}
            initialCompleted={lessonProgress}
            initialAnswers={quizAttempt?.answers}
            initialSubmitted={quizAttempt !== null}
          />
        ) : (
          <>
            <LessonChecklist
              moduleSlug={lesson.module.slug}
              lessonSlug={lesson.slug}
              lesson={lesson}
              initialCompleted={lessonProgress}
            />
            {lesson.type === "project" ? (
              <ProjectSubmissionForm
                moduleSlug={lesson.module.slug}
                lessonSlug={lesson.slug}
                lessonTitle={lesson.title}
                initialSubmission={projectSubmission}
                isAuthenticated={isAuthenticated}
                isSupabaseConfigured={isSupabaseConfigured()}
              />
            ) : null}
          </>
        )}
        <LessonNav
          module={lesson.module}
          currentLessonSlug={lesson.slug}
          nextLesson={nextLesson}
          previousLesson={previousLesson}
          initialProgress={progress}
        />
      </article>
      <aside className="order-2 lg:order-1 lg:sticky lg:top-28 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto lg:col-start-1 lg:row-start-1">
        <ModuleProgressPanel module={lesson.module} initialProgress={progress} />
        <p className="mb-3 font-mono text-sm font-semibold text-accent">{lesson.module.title}</p>
        <details className="lg:hidden">
          <summary className="inline-flex cursor-pointer items-center justify-between rounded-md border border-rule bg-surface px-3 py-2 text-sm font-semibold text-ink transition hover:border-accent/40 hover:text-accent">
            <span>Lesson list</span>
            <span aria-hidden="true">▾</span>
          </summary>
          <div className="mt-3">
            <LessonList
              activeLessonSlug={lesson.slug}
              module={lesson.module}
              initialProgress={progress}
              projectSubmissions={projectSubmissions}
            />
          </div>
        </details>
        <div className="hidden lg:block">
          <LessonList
            activeLessonSlug={lesson.slug}
            module={lesson.module}
            initialProgress={progress}
            projectSubmissions={projectSubmissions}
          />
        </div>
      </aside>
    </main>
  );

  const gatedLessonContent = (
    <LessonAccessGate
      module={lesson.module}
      modules={orderedModules}
      lessonSlug={lesson.slug}
      initialProgress={progress}
    >
      {lessonContent}
    </LessonAccessGate>
  );

  return (
    <ModuleAccessGate moduleSlug={lesson.module.slug} modules={orderedModules} initialProgress={progress}>
      {gatedLessonContent}
    </ModuleAccessGate>
  );
}
