"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import type { ModuleMeta } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import { getModulePrerequisiteState } from "@/lib/curriculum-prerequisites";
import { getModuleLessonProgress } from "@/lib/lesson-progress-core.js";
import { lessonProgressEventName, readLessonProgress } from "@/lib/lesson-progress";

type ModuleAccessGateProps = {
  moduleSlug: string;
  modules: ModuleMeta[];
  initialProgress: LessonProgressState;
  children: ReactNode;
};

export function ModuleAccessGate({
  moduleSlug,
  modules,
  initialProgress,
  children
}: ModuleAccessGateProps) {
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
    () =>
      getModulePrerequisiteState({
        modules,
        moduleSlug,
        progress
      }),
    [moduleSlug, modules, progress]
  );

  if (!accessState) {
    return null;
  }

  if (accessState.arePrerequisitesLocked) {
    const lockedPrerequisite = accessState.prerequisiteModules.at(-1);
    const lockedModuleProgress = lockedPrerequisite
      ? getModuleLessonProgress(lockedPrerequisite, progress)
      : null;
    const continueHref = lockedPrerequisite
      ? lockedModuleProgress?.nextLesson
        ? `/curriculum/${lockedPrerequisite.slug}/${lockedModuleProgress.nextLesson.slug}`
        : `/curriculum/${lockedPrerequisite.slug}`
      : "/curriculum";

    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="rounded-lg border border-rule bg-surface p-6">
          <p className="font-mono text-sm font-semibold uppercase text-accent">Module locked</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-ink">Finish earlier modules first</h1>
          <p className="mt-4 text-sm text-ink-soft">
            Complete Module {String(accessState.lockedPrerequisiteOrder).padStart(2, "0")} first to unlock
            this section.
          </p>
          <p className="mt-4 text-sm text-ink-soft">
            You can still browse content, and your progress syncs once you log in.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {lockedPrerequisite ? (
              <Link
                className="inline-flex rounded-full border border-rule bg-paper px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent/50 hover:text-accent"
                href={continueHref}
              >
                Resume module {String(lockedPrerequisite.order).padStart(2, "0")}
              </Link>
            ) : null}
            <Link
              className="inline-flex rounded-full border border-rule bg-paper px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent/50 hover:text-accent"
              href="/curriculum"
            >
              Return to curriculum
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
