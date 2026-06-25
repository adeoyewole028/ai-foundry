import { ModuleCard } from "@/components/curriculum/module-card";
import { CurriculumProgressPanel } from "@/components/curriculum/curriculum-progress";
import { ProgressControls } from "@/components/curriculum/progress-controls";
import { getOrderedModules } from "@/lib/curriculum-prerequisites";
import { getModules } from "@/lib/content";
import { getCurrentUserLessonProgress } from "@/lib/supabase/progress";
import { getCurrentUserProjectSubmissions } from "@/lib/supabase/project-submissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Curriculum | AI Foundry"
};

export default async function CurriculumPage() {
  const modules = await getModules();
  const orderedModules = getOrderedModules(modules);
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

  const serverProgress = isSupabaseConfigured()
    ? await getCurrentUserLessonProgress(orderedModules.map((module) => module.slug))
    : {};
  const userProjectSubmissions = isSupabaseConfigured() && isAuthenticated
    ? await getCurrentUserProjectSubmissions(orderedModules.map((module) => module.slug))
    : [];

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="max-w-3xl">
        <p className="font-mono text-sm font-semibold uppercase text-accent">Curriculum</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-ink sm:text-5xl">
          Build your AI engineering path one module at a time.
        </h1>
        <p className="mt-5 text-lg leading-8 text-ink-soft">
          Start with plain-English concepts, then move toward Python, data, machine learning, LLMs,
          RAG, agents, and production systems.
        </p>
      </div>
      <div className="mt-8 max-w-3xl">
        <CurriculumProgressPanel modules={orderedModules} initialProgress={serverProgress} />
      </div>
      <div className="mt-4">
        <ProgressControls />
      </div>
      {modules.length > 0 ? (
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {orderedModules.map((module) => (
            <ModuleCard
              module={module}
              key={module.slug}
              modules={orderedModules}
              initialProgress={serverProgress}
              projectSubmissions={userProjectSubmissions}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-lg border border-rule bg-surface p-6">
          <h2 className="text-xl font-bold text-ink">No modules published yet</h2>
          <p className="mt-2 text-ink-soft">
            Add a module folder under content with a module.json file to publish the first path.
          </p>
        </div>
      )}
    </main>
  );
}
