import { ModuleCard } from "@/components/curriculum/module-card";
import { CurriculumProgressPanel } from "@/components/curriculum/curriculum-progress";
import { ProgressControls } from "@/components/curriculum/progress-controls";
import { LearningPathSection } from "@/components/curriculum/learning-path-section";
import {
  CuratedResourceList,
  CuratedResourcesDisclaimer
} from "@/components/curriculum/curated-resources";
import { getOrderedModules } from "@/lib/curriculum-prerequisites";
import { type CuratedResource } from "@/lib/content";
import { getModules } from "@/lib/content.server";
import { getCurrentUserGamificationStats, getCurrentUserLessonProgress } from "@/lib/supabase/progress";
import { getCurrentUserProjectSubmissions } from "@/lib/supabase/project-submissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getLevelProgress } from "@/lib/gamification";
import { XPBadge, LevelProgressBar, StreakBadge } from "@/components/gamification/gamification-components";

export const metadata = {
  title: "Curriculum | AI Foundry"
};

export default async function CurriculumPage() {
  const stageLabel = "Stage";

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
  const userStats = isSupabaseConfigured() && isAuthenticated
    ? await getCurrentUserGamificationStats()
    : null;
  const levelProgress = getLevelProgress(userStats?.totalXp ?? 0);
  const displayTotalXp = userStats?.totalXp ?? 0;
  const displayStreak = userStats?.currentStreak ?? 0;
  const hasGamificationData = Boolean(isAuthenticated && userStats);
  const userProjectSubmissions = isSupabaseConfigured() && isAuthenticated
    ? await getCurrentUserProjectSubmissions(orderedModules.map((module) => module.slug))
    : [];
  const curatedPartners: CuratedResource[] = [
    {
      title: "CS50's Introduction to Programming with Python",
      provider: "Harvard / CS50",
      url: "https://pll.harvard.edu/course/cs50s-introduction-programming-python",
      type: "course",
      level: "Beginner",
      placement: "Primary foundation",
      checkedAt: "2026-06-20",
      whenToUse: "Start here before entering AI-heavy modules.",
      required: true,
      why: "Build a sturdy Python foundation before moving into AI engineering practices."
    },
    {
      title: "AI Python for Beginners",
      provider: "DeepLearning.AI",
      url: "https://www.deeplearning.ai/courses/ai-python-for-beginners/",
      type: "course",
      level: "Beginner",
      placement: "Bridge resource",
      checkedAt: "2026-06-20",
      whenToUse: "Use after Python basics before Math and Data modules.",
      required: false,
      why: "Shows practical AI workflows built directly on Python fundamentals."
    },
    {
      title: "Neural Networks Visual Intuition",
      provider: "3Blue1Brown",
      url: "https://www.3blue1brown.com/topics/neural-networks",
      type: "video",
      level: "Intermediate",
      placement: "Visual intuition track",
      checkedAt: "2026-06-20",
      whenToUse: "Use when model intuition feels too abstract.",
      required: false,
      why: "Helps connect geometric concepts to AI learning and representation."
    },
    {
      title: "Neural Networks: Zero to Hero",
      provider: "Andrej Karpathy",
      url: "https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ",
      type: "playlist",
      level: "Intermediate",
      placement: "Advanced builder path",
      checkedAt: "2026-06-20",
      whenToUse: "Use after Deep Learning for hands-on implementation depth.",
      required: false,
      why: "A practical sequence for building intuition and implementations from first principles."
    },
    {
      title: "Building Effective Agents",
      provider: "Anthropic",
      url: "https://www.anthropic.com/engineering/building-effective-agents",
      type: "guide",
      level: "Advanced",
      placement: "AI Agents guidance",
      checkedAt: "2026-06-20",
      whenToUse: "Use during AI Agents module planning and design.",
      required: false,
      why: "Defines composable patterns for safe, effective autonomous workflows."
    },
    {
      title: "AI Engineering Hub",
      provider: "patchy631",
      url: "https://github.com/patchy631/ai-engineering-hub",
      type: "project-library",
      level: "Intermediate",
      placement: "Portfolio exploration",
      checkedAt: "2026-06-20",
      whenToUse: "Use after module projects to compare practical implementation styles.",
      required: false,
      why: "A project library for practical AI engineering example ideas."
    },
    {
      title: "AI Engineering",
      provider: "Chip Huyen",
      url: "https://www.oreilly.com/library/view/ai-engineering/9781098177351/",
      type: "book",
      level: "Advanced",
      placement: "Long-form production reference",
      checkedAt: "2026-06-20",
      whenToUse: "Use through late-stage production and deployment modules.",
      required: false,
      why: "A practical long-form guide for shipping reliable AI systems."
    },
    {
      title: "Transformers Course",
      provider: "Hugging Face",
      url: "https://huggingface.co/learn/nlp-course/chapter1/1",
      type: "course",
      level: "Intermediate",
      placement: "Applied LLM path",
      checkedAt: "2026-06-20",
      whenToUse: "Use alongside LLM Engineering for practical ecosystem exposure.",
      required: false,
      why: "Provides practical building blocks for modern LLM tooling and workflows."
    }
  ];

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="max-w-3xl">
        <p className="font-mono text-sm font-semibold uppercase text-accent">Quest {stageLabel} Map</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-ink sm:text-5xl">
          Build your AI engineering quest one {stageLabel.toLowerCase()} at a time.
        </h1>
        <p className="mt-5 text-lg leading-8 text-ink-soft">
          Start with plain-English concepts, then move toward Python, data, machine learning, LLMs,
          RAG, agents, and production systems.
        </p>
      </div>
      <section className="mt-6 rounded-xl border border-rule bg-surface p-5">
        <p className="text-lg font-bold text-ink">Quest progress</p>
        <p className="mt-1 text-sm text-ink-soft">
          {hasGamificationData ? "Current learner gamification stats" : "Sign in to track live XP, level, and streak."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <XPBadge xp={displayTotalXp} label="Total" />
          <StreakBadge days={displayStreak} />
        </div>
        <div className="mt-4">
          <p className="font-mono text-xs font-semibold uppercase text-ink-soft">
            {levelProgress.currentLevel.title} • Level {levelProgress.currentLevel.level}
          </p>
          <LevelProgressBar progress={levelProgress.progressPercent} />
        </div>
      </section>
      <div className="mt-8 max-w-3xl">
        <CurriculumProgressPanel modules={orderedModules} initialProgress={serverProgress} />
      </div>
      <LearningPathSection
        isAuthenticated={isAuthenticated}
        initialProgress={serverProgress}
        modules={orderedModules}
        stageLabel={stageLabel}
      />
      <section className="mt-10 rounded-xl border border-rule bg-paper p-5">
        <p className="font-mono text-xs font-semibold uppercase text-accent">Curated roadmap</p>
        <h2 className="mt-2 text-xl font-bold text-ink">
          Curated from the best AI engineering resources
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft">
          AI Foundry organizes and contextualizes public AI learning resources into one practical
          project-based roadmap. We summarize and connect, while keeping external content linked to
          its original source.
        </p>
        <CuratedResourceList resources={curatedPartners} title="Curated Resources" />
        <div className="mt-4">
          <CuratedResourcesDisclaimer />
        </div>
      </section>
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
          <h2 className="text-xl font-bold text-ink">No stages published yet</h2>
          <p className="mt-2 text-ink-soft">
            Add a stage folder under content with a module.json file to publish the first path.
          </p>
        </div>
      )}
    </main>
  );
}
