"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, FileText, Lock } from "lucide-react";
import type { LessonMeta, ModuleMeta } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import type { ProjectSubmission } from "@/lib/supabase/project-submissions";
import { getFirstLockedLessonIndex, isLessonCompleted, lessonProgressEventName, readLessonProgress } from "@/lib/lesson-progress";
import { getLessonAccessState } from "@/lib/lesson-progress-core.js";
import { ProgressInterruptionModal } from "@/components/curriculum/progress-interruption-modal";

type UseLessonProgressParams = {
  moduleSlug: string;
  initialProgress?: LessonProgressState;
};

type BossBattleState = {
  lessonSlug: string;
  source: "metadata" | "legacy-slug" | "fallback";
};

const lessonIcons = {
  lesson: FileText,
  quiz: CheckCircle2,
  project: ClipboardList
};
const lessonTypeLabels = {
  lesson: "Quest",
  quiz: "Knowledge Trial",
  project: "Build Mission"
} as const;

function useLessonProgress({
  moduleSlug,
  initialProgress
}: UseLessonProgressParams) {
  const [progress, setProgress] = useState<LessonProgressState>(initialProgress ?? {});

  useEffect(() => {
    const refresh = () => {
      const localProgress = readLessonProgress();

      setProgress({
        ...initialProgress,
        ...localProgress
      });
    };

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(lessonProgressEventName, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(lessonProgressEventName, refresh);
    };
  }, [moduleSlug, initialProgress]);

  return progress;
}

type PendingRedirect = {
  href: string;
  lessonTitle: string;
  lockedCopy: string;
};

export function LessonList({
  module,
  activeLessonSlug,
  initialProgress,
  projectSubmissions = [],
  bossBattle
}: {
  module: ModuleMeta;
  activeLessonSlug?: string;
  initialProgress?: LessonProgressState;
  projectSubmissions?: ProjectSubmission[];
  bossBattle?: BossBattleState | null;
}) {
  const progress = useLessonProgress({
    moduleSlug: module.slug,
    initialProgress
  });
  const firstLockedIndex = getFirstLockedLessonIndex(module, progress);
  const maxUnlockedIndex = firstLockedIndex === -1 ? module.lessons.length - 1 : Math.max(0, firstLockedIndex);
  const bossBattleLesson = bossBattle
    ? module.lessons.find((lesson) => lesson.slug === bossBattle.lessonSlug)
    : null;
  const [pendingRedirect, setPendingRedirect] = useState<PendingRedirect | null>(null);
  const projectSubmissionByLesson = useMemo(() => {
    return new Map(
      projectSubmissions.map((submission) => [
        `${submission.moduleSlug}::${submission.lessonSlug}`,
        submission
      ])
    );
  }, [projectSubmissions]);

  return (
    <ol className="space-y-2">
      {module.lessons.map((lesson) => {
        const lessonKey = `${module.slug}::${lesson.slug}`;
        const projectSubmission = lesson.type === "project"
          ? projectSubmissionByLesson.get(lessonKey)
          : null;
        const Icon = lessonIcons[lesson.type];
        const isBossBattle = lesson.slug === bossBattleLesson?.slug;
        const lessonTypeLabel = isBossBattle
          ? bossBattle?.source === "fallback"
            ? "Final Mission"
            : "Boss Battle"
          : lessonTypeLabels[lesson.type];
        const index = module.lessons.findIndex((item) => item.slug === lesson.slug);
        const lessonAccess = getLessonAccessState(module, lesson.slug, progress);
        const isLessonUnlocked =
          index <= maxUnlockedIndex ||
          isLessonCompleted(progress, {
            moduleSlug: module.slug,
            lessonSlug: lesson.slug
          }) ||
          lesson.slug === activeLessonSlug;
        const isActive = lesson.slug === activeLessonSlug;
        const requiredLesson = lessonAccess?.requiredLesson ?? null;
        const href = isLessonUnlocked
          ? isBossBattle
            ? `/curriculum/${module.slug}/boss-battle`
            : `/curriculum/${module.slug}/${lesson.slug}`
          : requiredLesson
            ? `/curriculum/${module.slug}/${requiredLesson.slug}`
            : `/curriculum/${module.slug}`;
        const lockedCopy = requiredLesson
          ? `Finish "${requiredLesson.title}" before continuing this quest.`
          : "Complete earlier quests to unlock your path.";

        return isLessonUnlocked ? (
          <li key={lesson.slug}>
            <Link
              className={`flex gap-3 rounded-md border p-3 text-sm transition ${
                isActive
                  ? "border-accent/50 bg-accent-soft text-ink"
                  : "border-rule bg-surface text-ink-soft hover:border-accent/40 hover:text-ink"
              }`}
              href={href}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-semibold">{lesson.title}</span>
                <span className="mt-1 block font-mono text-xs text-ink-soft">
                  {lesson.estimatedMinutes} min / {lessonTypeLabel}
                </span>
                {isBossBattle ? (
                  <span className="mt-1 block font-mono text-xs text-accent">
                    Boss Battle
                  </span>
                ) : null}
                {projectSubmission ? (
                  <span className="mt-1 block font-semibold text-accent">
                    Submitted
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ) : (
          <li key={lesson.slug}>
            <button
              className="flex w-full gap-3 rounded-md border border-rule bg-surface/60 p-3 text-left text-sm text-ink-soft opacity-75 transition"
              onClick={() =>
                setPendingRedirect({
                  href,
                  lessonTitle: lesson.title,
                  lockedCopy
                })
              }
              type="button"
            >
              <Lock className="mt-0.5 size-4 shrink-0 text-ink-soft/75" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-semibold">{lesson.title}</span>
                <span className="mt-1 block font-mono text-xs text-ink-soft">
                  {lesson.estimatedMinutes} min / {lessonTypeLabel}
                </span>
                {isBossBattle ? (
                  <span className="mt-1 block font-mono text-xs text-accent">
                    Boss Battle
                  </span>
                ) : null}
                {projectSubmission ? (
                  <span className="mt-1 block font-mono text-xs text-accent">
                    Submitted
                  </span>
                ) : null}
                <span className="mt-1 block font-mono text-xs">
                  {lockedCopy}
                </span>
              </span>
            </button>
          </li>
        );
      })}
      {pendingRedirect ? (
        <ProgressInterruptionModal
          continueLabel="Continue current quest"
          continueHref={pendingRedirect.href}
          description={`You can’t open "${pendingRedirect.lessonTitle}" yet.`}
          progressHint="Complete the current module steps in order so quiz and project checkpoints unlock as you go."
          onClose={() => setPendingRedirect(null)}
          open={Boolean(pendingRedirect)}
          supportingText={`Why blocked: ${pendingRedirect.lockedCopy}`}
          title="Quest locked"
        />
      ) : null}
    </ol>
  );
}
