"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Lock, X } from "lucide-react";
import type { ModuleMeta } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import { lessonProgressEventName, readLessonProgress } from "@/lib/lesson-progress";
import { getCurriculumProgress } from "@/lib/lesson-progress-core.js";

type PendingRedirect = {
  continueHref: string;
  lessonTitle: string;
  moduleTitle: string;
};

type ProgressNavButtonProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
  initialProgress?: LessonProgressState;
  modules: ModuleMeta[];
};

function isProtectedResourcePath(href: string) {
  return href === "/quizzes" || href === "/projects";
}

export function ProgressNavButton({
  children,
  className = "",
  href,
  initialProgress = {},
  modules
}: ProgressNavButtonProps) {
  const [pendingRedirect, setPendingRedirect] = useState<PendingRedirect | null>(null);
  const [progress, setProgress] = useState<LessonProgressState>(initialProgress);

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
  }, [initialProgress]);

  const curriculumProgress = useMemo(
    () => getCurriculumProgress(modules, progress),
    [modules, progress]
  );
  const nextLesson = curriculumProgress.nextLesson;
  const shouldGate =
    isProtectedResourcePath(href) && Boolean(nextLesson);

  const continueHref = nextLesson
    ? `/curriculum/${nextLesson.moduleSlug}/${nextLesson.lessonSlug}`
    : href;

  if (!shouldGate) {
    return (
      <Link className={className} href={href}>
        {children}
      </Link>
    );
  }

  const lockedCopy = `Continue with "${nextLesson?.lessonTitle ?? "your current lesson"}" in ${nextLesson?.moduleTitle ?? "the curriculum"} first.`;

  return (
    <>
      <button
        className={className}
        onClick={() =>
          setPendingRedirect(
            nextLesson
              ? {
                  continueHref,
                  lessonTitle: nextLesson.lessonTitle,
                  moduleTitle: nextLesson.moduleTitle
                }
              : null
          )
        }
        type="button"
      >
        {children}
      </button>
      {pendingRedirect ? (
        <div
          aria-labelledby="progress-nav-modal-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/30 px-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-lg border border-rule bg-surface p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                <Lock className="size-4" aria-hidden="true" />
                Keep your path
              </div>
              <button
                aria-label="Close confirmation"
                className="inline-flex size-9 items-center justify-center rounded-full border border-rule bg-paper text-ink-soft transition hover:border-accent/50 hover:text-ink"
                onClick={() => setPendingRedirect(null)}
                type="button"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <h2 id="progress-nav-modal-title" className="mt-3 text-2xl font-black tracking-[-0.03em] text-ink">
              Continue in order
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              Open <span className="font-semibold text-ink">{pendingRedirect.lessonTitle}</span> in{" "}
              <span className="font-semibold text-ink">{pendingRedirect.moduleTitle}</span> before jumping to this
              section.
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-soft">{lockedCopy}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="inline-flex min-h-11 items-center rounded-full border border-rule bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent/50"
                onClick={() => setPendingRedirect(null)}
                type="button"
              >
                Cancel
              </button>
              <Link
                className="inline-flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-surface transition"
                href={pendingRedirect.continueHref}
                style={{
                  backgroundColor: "var(--color-ink)"
                }}
              >
                Continue
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
