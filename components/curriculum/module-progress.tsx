"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CircleCheck } from "lucide-react";
import type { ModuleMeta } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import { getModuleLessonProgress, lessonProgressEventName, readLessonProgress } from "@/lib/lesson-progress";

type ModuleProgressPanelProps = {
  module: ModuleMeta;
  initialProgress?: LessonProgressState;
};

export function ModuleProgressPanel({
  module,
  initialProgress = {}
}: ModuleProgressPanelProps) {
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
  }, [initialProgress, module.slug]);

  const { total, completed, percent, nextLesson } = useMemo(
    () => getModuleLessonProgress(module, progress),
    [module, progress]
  );

  const nextLessonHref = nextLesson
    ? `/curriculum/${module.slug}/${nextLesson.slug}`
    : `/curriculum/${module.slug}/${module.lessons.at(-1)?.slug ?? ""}`;

  return (
    <section className="rounded-xl border border-rule bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold text-ink">Module progress</p>
        <span className="text-sm font-semibold text-ink-soft">
          {completed} / {total} completed
        </span>
      </div>
      <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-rule">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-ink-soft">{percent}% complete</p>
      {nextLesson ? (
        <Link
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-accent"
          href={nextLessonHref}
        >
          <span>
            {completed === 0 ? "Resume your first lesson" : `Continue with ${nextLesson.title}`}
          </span>
          <ArrowRight className="size-4" />
        </Link>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
          <CircleCheck className="size-4" /> Module complete.
        </p>
      )}
    </section>
  );
}
