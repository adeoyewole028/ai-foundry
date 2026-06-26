import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, CircleCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { LessonList } from "@/components/curriculum/lesson-list";
import { ModuleAccessGate } from "@/components/curriculum/module-access-gate";
import { ModuleProgressPanel } from "@/components/curriculum/module-progress";
import { MentorNoteCard, MissionBriefCard } from "@/components/gamification/gamification-components";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useMDXComponents } from "@/mdx-components";
import {
  getCurrentUserLessonProgress,
  hasCompletedBossBattleForCurrentUser
} from "@/lib/supabase/progress";
import { getBossBattleForModule } from "@/lib/content";
import { getLesson, getModules } from "@/lib/content.server";
import { getModulePrerequisiteState, getOrderedModules } from "@/lib/curriculum-prerequisites";
import { XP_REWARDS } from "@/lib/gamification";
import { completeBossBattleAction } from "@/app/progress/actions";

export async function generateStaticParams() {
  const modules = await getModules();

  return modules.map((module) => ({
    moduleSlug: module.slug
  }));
}

export default async function BossBattlePage({
  params
}: {
  params: Promise<{ moduleSlug: string }>;
}) {
  const { moduleSlug } = await params;
  const modules = await getModules();
  const orderedModules = getOrderedModules(modules);
  const accessState = getModulePrerequisiteState({ modules: orderedModules, moduleSlug, progress: {} });
  const module = accessState?.module;

  if (!module) {
    notFound();
  }

  const bossBattleSelection = getBossBattleForModule(module);

  if (!bossBattleSelection) {
    notFound();
  }
  const { lesson: bossBattleLesson, source: bossBattleSource, meta: bossBattleMeta } = bossBattleSelection;

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

  const progress = isSupabaseConfigured() && isAuthenticated
    ? await getCurrentUserLessonProgress([module.slug])
    : {};

  const bossBattleContent = await getLesson(moduleSlug, bossBattleLesson.slug);

  if (!bossBattleContent) {
    notFound();
  }

  const isBossBattleCompleted = isSupabaseConfigured() && isAuthenticated
    ? await hasCompletedBossBattleForCurrentUser({
        moduleSlug: module.slug,
        bossBattleSlug: bossBattleContent.slug
      })
    : false;
  const missionTypeLabel = bossBattleSource === "fallback"
    ? "Final Mission"
    : "Boss Battle";

  const mdxComponents = useMDXComponents({});

  const bossBattlePage = (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[300px_1fr]">
      <article className="order-1 min-w-0 rounded-xl border border-rule bg-surface p-5 sm:p-8 lg:order-2 lg:col-start-2">
        <p className="mb-3 font-mono text-xs font-semibold uppercase text-accent">
          {bossBattleSource === "fallback" ? "Mission: Build Mission" : "Mission: Boss Battle"}
        </p>
        <h1 className="text-3xl font-black tracking-[-0.03em] text-ink">{bossBattleMeta?.title ?? bossBattleContent.title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-soft">
          {bossBattleMeta?.description ?? bossBattleContent.description}
        </p>
        {module.story ? (
          <div className="mt-4 space-y-3">
            <MissionBriefCard
              setting={module.story.setting}
              mission={module.story.mission}
              mentorNote={module.story.mentorNote}
            />
            <MentorNoteCard
              mentorName="Ada"
              role={module.story.role}
              note={module.story.mentorNote}
            />
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-ink-soft">
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <CircleCheck className="size-4 text-accent" aria-hidden="true" />
            Type: {missionTypeLabel}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <Award className="size-4 text-accent" aria-hidden="true" />
            Reward: {typeof bossBattleMeta?.xpReward === "number" ? bossBattleMeta.xpReward : XP_REWARDS.BOSS_BATTLE_COMPLETE} XP
          </span>
        </div>

        <div className="mt-6 rounded-xl border border-rule bg-paper p-4">
          <p className="font-mono text-xs font-semibold uppercase text-accent">Mission objective</p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {bossBattleSource === "fallback"
              ? "This module doesn't have a dedicated Boss Battle yet, so your final Build Mission is serving as the capstone challenge. Complete this brief and claim the boss-battle reward."
              : "This is your capstone mission for the stage. Read the brief, complete any supporting work, then mark this mission complete to claim rewards."}
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-rule bg-paper p-4">
          <div className="prose-foundry max-w-none">
            <MDXRemote source={bossBattleContent.source} components={mdxComponents} />
          </div>
        </div>

        {isSupabaseConfigured() && isAuthenticated ? (
          <div className="mt-6">
            <form
              action={async (formData: FormData) => {
                await completeBossBattleAction(formData);
              }}
            >
              <input type="hidden" name="moduleSlug" value={module.slug} />
              <input type="hidden" name="bossBattleSlug" value={bossBattleContent.slug} />
              <label className="mb-2 block text-sm text-ink-soft" htmlFor={`boss-battle-response-${module.slug}`}>
                Mission response
              </label>
              <textarea
                id={`boss-battle-response-${module.slug}`}
                name="response"
                rows={4}
                className="mb-4 block w-full rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="Add a short note about your approach, scenario diagnosis, or implementation plan."
                defaultValue=""
              />
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-paper transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBossBattleCompleted}
                type="submit"
              >
                {isBossBattleCompleted ? "Mission complete" : "Mark mission complete"}
              </button>
            </form>
            <p className="mt-2 text-sm text-ink-soft">
              {isBossBattleCompleted ? "This Boss Battle is complete." : "Submit once when your mission is ready."}
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-rule bg-muted p-4 text-sm text-ink-soft">
            Sign in to claim mission rewards and record completion.
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center rounded-full border border-rule px-4 py-2 text-sm font-semibold transition hover:border-accent/50"
            href={`/curriculum/${module.slug}`}
          >
            Back to stage
          </Link>
          <ButtonLink href="/curriculum">Back to roadmap</ButtonLink>
        </div>
      </article>

      <aside className="order-2 lg:order-1 lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] lg:overflow-y-auto lg:col-start-1 lg:row-start-1">
        <ModuleProgressPanel module={module} initialProgress={progress} />
        <div className="mt-4 rounded-xl border border-rule bg-surface p-4">
          <p className="font-mono text-xs font-semibold uppercase text-ink-soft">Quest chain</p>
          <p className="mt-2 text-sm text-ink-soft">Continue through this stage from this map.</p>
        </div>
        <div className="mt-4">
          <LessonList
            module={module}
            initialProgress={progress}
            activeLessonSlug={bossBattleLesson.slug}
            bossBattle={{
              lessonSlug: bossBattleLesson.slug,
              source: bossBattleSource
            }}
          />
        </div>
      </aside>
    </main>
  );

  return (
    <ModuleAccessGate moduleSlug={module.slug} modules={orderedModules} initialProgress={progress}>
      {bossBattlePage}
    </ModuleAccessGate>
  );
}
