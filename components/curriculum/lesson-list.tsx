"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, FileText, Lock, X } from "lucide-react";
import type { LessonMeta, ModuleMeta } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import type { ProjectSubmission } from "@/lib/supabase/project-submissions";
import { getFirstLockedLessonIndex, isLessonCompleted, lessonProgressEventName, readLessonProgress } from "@/lib/lesson-progress";
import { getLessonAccessState } from "@/lib/lesson-progress-core.js";

type UseLessonProgressParams = {
  moduleSlug: string;
  initialProgress?: LessonProgressState;
};

const lessonIcons = {
  lesson: FileText,
  quiz: CheckCircle2,
  project: ClipboardList
};

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
  projectSubmissions = []
}: {
  module: ModuleMeta;
  activeLessonSlug?: string;
  initialProgress?: LessonProgressState;
  projectSubmissions?: ProjectSubmission[];
}) {
  const progress = useLessonProgress({
    moduleSlug: module.slug,
    initialProgress
  });
  const firstLockedIndex = getFirstLockedLessonIndex(module, progress);
  const maxUnlockedIndex = firstLockedIndex === -1 ? module.lessons.length - 1 : Math.max(0, firstLockedIndex);
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
          ? `/curriculum/${module.slug}/${lesson.slug}`
          : requiredLesson
            ? `/curriculum/${module.slug}/${requiredLesson.slug}`
            : `/curriculum/${module.slug}`;
        const lockedCopy = requiredLesson
          ? `Continue with "${requiredLesson.title}" first.`
          : "Complete earlier lessons to unlock.";

        return isLessonUnlocked ? (
          <li key={lesson.slug}>
            <Link
              className={`flex gap-3 rounded-md border p-3 text-sm transition ${
                isActive
                  ? "border-accent/50 bg-accent-soft text-ink"
                  : "border-rule bg-surface text-ink-soft hover:border-accent/40 hover:text-ink"
              }`}
              href={`/curriculum/${module.slug}/${lesson.slug}`}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-semibold">{lesson.title}</span>
                <span className="mt-1 block font-mono text-xs text-ink-soft">
                  {lesson.estimatedMinutes} min / {lesson.type}
                </span>
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
        <div
          aria-labelledby="locked-lesson-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/30 px-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-lg border border-rule bg-surface p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                <Lock className="size-4" aria-hidden="true" />
                Lesson locked
              </div>
              <button
                aria-label="Close"
                className="inline-flex size-9 items-center justify-center rounded-full border border-rule bg-paper text-ink-soft transition hover:border-accent/50 hover:text-ink"
                onClick={() => setPendingRedirect(null)}
                type="button"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <h2 id="locked-lesson-title" className="mt-3 text-2xl font-black tracking-[-0.03em] text-ink">
              Continue in order
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              <span className="font-semibold text-ink">{pendingRedirect.lessonTitle}</span> is not unlocked yet.
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-soft">{pendingRedirect.lockedCopy}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="inline-flex min-h-11 items-center rounded-full border border-rule bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent/50"
                onClick={() => setPendingRedirect(null)}
                type="button"
              >
                Cancel
              </button>
              <Link
                className="inline-flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition"
                href={pendingRedirect.href}
                style={{ backgroundColor: "var(--color-ink)", color: "var(--color-surface)" }}
                onClick={() => setPendingRedirect(null)}
              >
                <span>Continue</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </ol>
  );
}
