"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import type { ModuleMeta } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import {
  getCurriculumProgress,
  getLessonAccessState,
  lessonProgressEventName,
  readLessonProgress
} from "@/lib/lesson-progress";
import { getModulePrerequisiteState } from "@/lib/curriculum-prerequisites";

type LessonAccessGateProps = {
  module: ModuleMeta;
  modules: ModuleMeta[];
  lessonSlug: string;
  initialProgress: LessonProgressState;
  children: ReactNode;
};

export function LessonAccessGate({
  module,
  modules,
  lessonSlug,
  initialProgress,
  children
}: LessonAccessGateProps) {
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

  const accessState = useMemo(
    () => getLessonAccessState(module, lessonSlug, progress),
    [lessonSlug, module, progress]
  );
  const moduleAccessState = useMemo(
    () =>
      getModulePrerequisiteState({
        modules,
        moduleSlug: module.slug,
        progress
      }),
    [module.slug, modules, progress]
  );
  const curriculumProgress = useMemo(
    () => getCurriculumProgress(modules, progress),
    [modules, progress]
  );

  if (!accessState) {
    return null;
  }

  const isModuleUnlocked = moduleAccessState ? !moduleAccessState.arePrerequisitesLocked : false;

  if (!isModuleUnlocked || !accessState.isUnlocked) {
    const globalNextLesson = curriculumProgress.nextLesson;
    const requiredLesson = isModuleUnlocked ? accessState.requiredLesson : null;
    const requiredHref = !isModuleUnlocked && globalNextLesson
      ? `/curriculum/${globalNextLesson.moduleSlug}/${globalNextLesson.lessonSlug}`
      : requiredLesson
      ? `/curriculum/${module.slug}/${requiredLesson.slug}`
      : `/curriculum/${module.slug}`;
    const requiredTitle = !isModuleUnlocked && globalNextLesson
      ? globalNextLesson.lessonTitle
      : requiredLesson?.title ?? "the module";

    return (
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <section className="rounded-lg border border-rule bg-surface p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-accent">
            <Lock className="size-4" aria-hidden="true" />
            Quest locked
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-ink">
            Finish the current quest first
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-soft">
            Quests, knowledge trials, and build missions unlock in sequence. Continue from your
            current place in the curriculum first.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {requiredTitle ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-surface transition hover:bg-ink/90"
                href={requiredHref}
              >
                Continue {requiredTitle}
              </Link>
            ) : null}
            <Link
              className="inline-flex min-h-11 items-center rounded-full border border-rule bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent/50"
              href={`/curriculum/${module.slug}`}
            >
              Open stage
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
