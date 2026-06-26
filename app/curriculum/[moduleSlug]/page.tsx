import { notFound } from "next/navigation";
import { CheckCircle2, ClipboardList, FileText } from "lucide-react";
import { LessonList } from "@/components/curriculum/lesson-list";
import {
  CuratedResourcesDisclaimer,
  CuratedResourceList,
  ExternalResourceWarning
} from "@/components/curriculum/curated-resources";
import { ModuleAccessGate } from "@/components/curriculum/module-access-gate";
import { ModuleProgressPanel } from "@/components/curriculum/module-progress";
import { ButtonLink } from "@/components/ui/button";
import { getBossBattleForModule } from "@/lib/content";
import { getModules } from "@/lib/content.server";
import { getModulePrerequisiteState, getOrderedModules } from "@/lib/curriculum-prerequisites";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUserLessonProgress } from "@/lib/supabase/progress";
import { createClient } from "@/lib/supabase/server";
import { XP_REWARDS } from "@/lib/gamification";
import { MentorNoteCard, MissionBriefCard } from "@/components/gamification/gamification-components";

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
  const stageLabel = "Stage";
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
  const bossBattleSelection = getBossBattleForModule(module);
  const bossBattleLesson = bossBattleSelection?.lesson;
  const lessonCount = module.lessons.filter((lesson) => lesson.type === "lesson").length;
  const quizCount = module.lessons.filter((lesson) => lesson.type === "quiz").length;
  const projectCount = module.lessons.filter((lesson) => lesson.type === "project").length;
  const modulePotentialXp =
    lessonCount * XP_REWARDS.LESSON_COMPLETE +
    quizCount * XP_REWARDS.QUIZ_COMPLETE +
    projectCount * XP_REWARDS.PROJECT_SUBMITTED +
    XP_REWARDS.MODULE_COMPLETE;

  const moduleContent = (
    <main
      id="main-content"
      className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]"
    >
      <section>
        <p className="font-mono text-sm font-semibold text-accent">
          {stageLabel} {String(module.order).padStart(2, "0")} / {module.level}
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-ink">{module.title}</h1>
        <p className="mt-5 text-lg leading-8 text-ink-soft">{module.description}</p>
        {module.story ? (
          <div className="mt-5 space-y-3">
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
        {module.story ? null : module.mentorNote ? (
          <MentorNoteCard
            className="mt-5"
            mentorName="Ada"
            role="Module guidance"
            note={module.mentorNote}
          />
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold text-ink-soft">
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <FileText className="size-4 text-accent" aria-hidden="true" />
            {lessonCount === 1 ? "1 Quest" : `${lessonCount} Quests`}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />
            {quizCount === 1 ? "1 Knowledge Trial" : `${quizCount} Knowledge Trials`}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <ClipboardList className="size-4 text-accent" aria-hidden="true" />
            {projectCount === 1 ? "1 Build Mission" : `${projectCount} Build Missions`}
          </span>
        </div>
        <section className="mt-5 rounded-lg border border-rule bg-surface p-4 text-sm leading-6 text-ink-soft">
          <p className="font-mono text-xs font-semibold uppercase text-accent">XP target</p>
          <p className="mt-2">
            Clearing this stage can award <span className="font-semibold text-ink">{modulePotentialXp} XP</span>
            {' '}including the Stage Clear bonus.
          </p>
        </section>
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
        {module.curatedResources?.length ? (
          <>
            <CuratedResourceList
              resources={module.curatedResources}
              title="Curated Resources"
            />
            <ExternalResourceWarning />
          </>
        ) : null}
        {bossBattleLesson ? (
          <ButtonLink
            className="mt-3 w-full sm:w-auto"
            href={`/curriculum/${module.slug}/boss-battle`}
          >
            {bossBattleSelection?.source === "fallback" ? "Enter Final Mission" : "Enter Boss Battle"}
          </ButtonLink>
        ) : null}
        {firstLesson ? (
          <ButtonLink
            className="mt-6 w-full sm:w-auto"
            href={`/curriculum/${module.slug}/${firstLesson.slug}`}
          >
            Start {stageLabel.toLowerCase()}
          </ButtonLink>
        ) : (
          <div className="mt-6 rounded-lg border border-rule bg-surface p-5 text-sm text-ink-soft">
            This stage has no quests yet. Add quest entries to module.json to make it startable.
          </div>
        )}
        <div className="mt-6">
          <CuratedResourcesDisclaimer />
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-xl font-bold text-ink">Quest chain</h2>
        <LessonList
          module={module}
          initialProgress={progress}
          bossBattle={bossBattleLesson
            ? {
              lessonSlug: bossBattleLesson.slug,
              source: bossBattleSelection?.source ?? "fallback"
            }
            : null}
        />
      </section>
    </main>
  );

  return (
    <ModuleAccessGate moduleSlug={module.slug} modules={orderedModules} initialProgress={progress}>
      {moduleContent}
    </ModuleAccessGate>
  );
}
