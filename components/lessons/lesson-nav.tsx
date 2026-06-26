"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import type { LessonMeta, ModuleMeta } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import { isLessonCompleted, lessonProgressEventName, readLessonProgress } from "@/lib/lesson-progress";

export function LessonNav({
  module,
  currentLessonSlug,
  previousLesson,
  nextLesson,
  initialProgress = {}
}: {
  module: ModuleMeta;
  currentLessonSlug: string;
  previousLesson: LessonMeta | null;
  nextLesson: LessonMeta | null;
  initialProgress?: LessonProgressState;
}) {
  const [progress, setProgress] = useState<LessonProgressState>(initialProgress);
  const isCurrentCompleted = isLessonCompleted(progress, {
    moduleSlug: module.slug,
    lessonSlug: currentLessonSlug
  });

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

  const nextLocked = !!nextLesson && !isCurrentCompleted;

  return (
    <nav className="mt-12 grid gap-3 border-t border-ink/10 pt-6">
      {previousLesson ? (
        <Link
          className="flex min-w-0 items-center gap-3 rounded-lg border border-rule bg-surface p-4 text-sm font-semibold text-ink transition hover:border-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          href={`/curriculum/${module.slug}/${previousLesson.slug}`}
        >
          <ArrowLeft className="size-4" />
          <span className="truncate">{previousLesson.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {nextLocked ? (
        <span className="flex items-center justify-end gap-2 rounded-lg border border-rule bg-surface p-4 text-sm font-semibold text-ink-soft">
          <Lock className="size-4" />
          <span>Complete this quest to unlock next.</span>
        </span>
      ) : nextLesson ? (
        <Link
          className="flex items-center justify-end gap-3 rounded-lg border border-rule bg-surface p-4 text-right text-sm font-semibold text-ink transition hover:border-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          href={`/curriculum/${module.slug}/${nextLesson.slug}`}
        >
          <span>{nextLesson.title}</span>
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </nav>
  );
}
