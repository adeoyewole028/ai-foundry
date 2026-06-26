"use client";

import { useEffect, useState } from "react";
import type { ModuleMeta } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import { getModuleStatusLabel, isModuleUnlocked } from "@/lib/curriculum-prerequisites";
import { getCurriculumProgress, getModuleLessonProgress } from "@/lib/lesson-progress-core.js";
import { lessonProgressEventName, readLessonProgress } from "@/lib/lesson-progress";
import { LearningPathStep } from "@/components/curriculum/learning-path-step";

type LearningPathSectionProps = {
  modules: ModuleMeta[];
  initialProgress: LessonProgressState;
  isAuthenticated: boolean;
  stageLabel: string;
};

export function LearningPathSection({
  modules,
  initialProgress,
  isAuthenticated,
  stageLabel
}: LearningPathSectionProps) {
  const [progress, setProgress] = useState<LessonProgressState>(initialProgress);
  const curriculumProgress = getCurriculumProgress(modules, progress);
  const continueHref = curriculumProgress.nextLesson
    ? `/curriculum/${curriculumProgress.nextLesson.moduleSlug}/${curriculumProgress.nextLesson.lessonSlug}`
    : "/curriculum";
  const continueTitle = curriculumProgress.nextLesson
    ? `${curriculumProgress.nextLesson.moduleTitle} — ${curriculumProgress.nextLesson.lessonTitle}`
    : "your current stage";

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

  return (
    <section className="mt-10">
      <p className="font-mono text-xs font-semibold uppercase text-accent">Quest map</p>
      <h2 className="mt-2 text-xl font-bold text-ink">Progress through each region in order</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {modules.map((module) => {
          const moduleProgress = getModuleLessonProgress(module, progress);
          const moduleUnlocked = isModuleUnlocked({
            modules,
            moduleSlug: module.slug,
            progress
          });

          const canOpen = isAuthenticated ? moduleUnlocked : true;
          const status = getModuleStatusLabel({
            isUnlocked: canOpen,
            percentComplete: moduleProgress.percent
          });
          const summary = `${module.description} ${module.level ? `(${module.level})` : ""}`;

          return (
            <LearningPathStep
              title={module.title}
              href={`/curriculum/${module.slug}`}
              index={module.order}
              isEnabled={canOpen}
              key={module.slug}
              progress={moduleProgress.percent}
              stageLabel={stageLabel}
              status={status}
              summary={summary}
              continueHref={canOpen ? undefined : continueHref}
              lockedTitle={canOpen ? undefined : continueTitle}
            />
          );
        })}
      </div>
    </section>
  );
}
