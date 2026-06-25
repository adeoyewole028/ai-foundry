import { ResourceIndexList } from "@/components/curriculum/resource-index-list";
import { HomeCta } from "@/components/curriculum/home-cta";
import { getModules } from "@/lib/content";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUserLessonProgress } from "@/lib/supabase/progress";

export const metadata = {
  title: "Quizzes | AI Foundry"
};

export default async function QuizzesPage() {
  const modules = await getModules();
  const initialProgress = isSupabaseConfigured()
    ? await getCurrentUserLessonProgress(modules.map((module) => module.slug))
    : {};
  const quizzes = modules.flatMap((module) =>
    module.lessons
      .filter((lesson) => lesson.type === "quiz")
      .map((lesson) => ({
        ...lesson,
        moduleTitle: module.title,
        moduleSlug: module.slug
      }))
  );

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="font-mono text-sm font-semibold uppercase text-accent">Quizzes</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-ink">Knowledge checks</h1>
      <p className="mt-4 max-w-2xl leading-7 text-ink-soft">
        Quizzes help you explain each module back in plain language before you move on to a project.
      </p>
      <div className="mt-6">
        <HomeCta modules={modules} initialProgress={initialProgress} />
      </div>
      {quizzes.length > 0 ? (
        <ResourceIndexList
          initialProgress={initialProgress}
          items={quizzes}
          modules={modules}
          type="quiz"
        />
      ) : (
        <div className="mt-8 rounded-lg border border-rule bg-surface p-6">
          <h2 className="text-xl font-bold text-ink">No quizzes published yet</h2>
          <p className="mt-2 text-ink-soft">
            Add a lesson with type "quiz" to a module.json file to publish a module check-in.
          </p>
        </div>
      )}
    </main>
  );
}
