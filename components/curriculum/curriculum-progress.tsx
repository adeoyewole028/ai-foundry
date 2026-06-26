"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CircleCheck, Play } from "lucide-react";
import type { ModuleMeta } from "@/lib/content";
import type { CurriculumProgress, LessonProgressState } from "@/lib/lesson-progress";
import {
  getCurriculumProgress,
  lessonProgressEventName,
  readLessonProgress
} from "@/lib/lesson-progress";
import { getNextLessonHref } from "@/lib/progress-navigation";

type CurriculumProgressPanelProps = {
  modules: ModuleMeta[];
  initialProgress?: LessonProgressState;
};

export function CurriculumProgressPanel({
  modules,
  initialProgress = {}
}: CurriculumProgressPanelProps) {
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

  const curriculumProgress = useMemo<CurriculumProgress>(
    () => getCurriculumProgress(modules, progress),
    [modules, progress]
  );

  const { href: nextLessonHref } = getNextLessonHref(modules, progress);

  return (
    <section className="rounded-xl border border-rule bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-ink">Journey progress</p>
          <p className="mt-1 text-sm text-ink-soft">
            {curriculumProgress.completed} of {curriculumProgress.total} quests completed
          </p>
        </div>
        <p className="text-sm font-semibold text-ink-soft">{curriculumProgress.percent}%</p>
      </div>
      <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-full bg-rule">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${curriculumProgress.percent}%` }}
        />
      </div>
      {curriculumProgress.nextLesson ? (
        <Link
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-accent"
          href={nextLessonHref}
        >
          <Play className="size-4" />
          <span>
            Continue to {curriculumProgress.nextLesson.moduleTitle} → {curriculumProgress.nextLesson.lessonTitle}
          </span>
          <ArrowRight className="size-4" />
        </Link>
      ) : (
        <p className="mt-5 flex items-center gap-2 text-sm text-ink-soft">
          <CircleCheck className="size-4" />
          All regions cleared.
        </p>
      )}
    </section>
  );
}
