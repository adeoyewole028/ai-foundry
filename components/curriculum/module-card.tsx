"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock, GraduationCap, Play } from "lucide-react";
import type { ModuleMeta } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import type { ProjectSubmission } from "@/lib/supabase/project-submissions";
import {
  getModulePrerequisiteState,
  getModuleStatusLabel,
  isModuleUnlocked
} from "@/lib/curriculum-prerequisites";
import {
  getModuleLessonProgress,
  lessonProgressEventName,
  readLessonProgress
} from "@/lib/lesson-progress";
import { ButtonLink } from "@/components/ui/button";

export function ModuleCard({
  module,
  modules = [],
  initialProgress = {},
  projectSubmissions = [],
  isAuthenticated = false
}: {
  module: ModuleMeta;
  modules?: ModuleMeta[];
  initialProgress?: LessonProgressState;
  projectSubmissions?: ProjectSubmission[];
  isAuthenticated?: boolean;
}) {
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

  const moduleProgress = useMemo(
    () => getModuleLessonProgress(module, progress),
    [module, progress]
  );
  const prerequisiteState = useMemo(
    () =>
      getModulePrerequisiteState({
        modules,
        moduleSlug: module.slug,
        progress
      }),
    [module.slug, modules, progress]
  );
  const isUnlocked = useMemo(
    () =>
      isModuleUnlocked({
        modules,
        moduleSlug: module.slug,
        progress
      }),
    [modules, module.slug, progress]
  );
  const resumeLesson = moduleProgress.nextLesson ?? module.lessons.at(0);
  const resumeHref = resumeLesson
    ? `/curriculum/${module.slug}/${resumeLesson.slug}`
    : `/curriculum/${module.slug}`;
  const lockedPrerequisite = prerequisiteState?.prerequisiteModules.at(-1);
  const lockedPrerequisiteProgress = lockedPrerequisite
    ? getModuleLessonProgress(lockedPrerequisite, progress)
    : null;
  const resumePreviousHref = lockedPrerequisite
    ? lockedPrerequisiteProgress?.nextLesson
      ? `/curriculum/${lockedPrerequisite.slug}/${lockedPrerequisiteProgress.nextLesson.slug}`
      : `/curriculum/${lockedPrerequisite.slug}`
    : "/curriculum";
  const lessonCount = module.lessons.filter((lesson) => lesson.type === "lesson").length;
  const quizCount = module.lessons.filter((lesson) => lesson.type === "quiz").length;
  const projectCount = module.lessons.filter((lesson) => lesson.type === "project").length;
  const submittedProjectCount = projectCount > 0
    ? module.lessons.reduce((acc, lesson) => {
      if (lesson.type !== "project") {
        return acc;
      }

      const hasSubmission = projectSubmissions.some(
        (submission) =>
          submission.moduleSlug === module.slug &&
          submission.lessonSlug === lesson.slug
      );

      return acc + (hasSubmission ? 1 : 0);
    }, 0)
    : 0;
  const lockedModuleTitle = lockedPrerequisite?.title;
  const moduleStatusLabel = useMemo(
    () =>
      getModuleStatusLabel({
        isUnlocked,
        percentComplete: moduleProgress.percent
      }),
    [isUnlocked, moduleProgress.percent]
  );

  return (
    <article className="group rounded-lg border border-rule bg-surface p-5 shadow-sm transition duration-150 ease-out hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm font-semibold text-accent">Module {String(module.order).padStart(2, "0")}</p>
          <h2 className="mt-2 text-xl font-bold text-ink">{module.title}</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper px-2.5 py-1 text-xs font-semibold text-ink-soft">
          {moduleStatusLabel}
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-soft">{module.description}</p>
      {!isUnlocked && isAuthenticated && lockedModuleTitle ? (
        <p className="mt-3 text-xs font-semibold text-ink-soft">
          Complete <span className="text-ink">“{lockedModuleTitle}”</span> first to unlock this module.
        </p>
      ) : null}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink-soft">
          <span>{moduleProgress.completed}/{moduleProgress.total} completed</span>
          <span>{moduleProgress.percent}%</span>
        </div>
        <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-rule">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${moduleProgress.percent}%` }}
          />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-ink-soft">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-accent">
          <GraduationCap className="size-3.5" />
          {module.level}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-ink-soft">
          <Clock className="size-3.5" />
          {module.estimatedHours} hours
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-ink-soft">
          {lessonCount} lesson{lessonCount === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-ink-soft">
          {quizCount} quiz{quizCount === 1 ? "" : "zes"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-ink-soft">
          {projectCount} project{projectCount === 1 ? "" : "s"}
        </span>
        {projectCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-ink-soft">
            {submittedProjectCount}/{projectCount} submitted
          </span>
        ) : null}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {isUnlocked ? (
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper px-3 py-2 text-xs font-semibold text-ink transition hover:border-accent/50 hover:text-accent"
            href={`/curriculum/${module.slug}`}
          >
            Open module
          </Link>
        ) : (
          <button
            type="button"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-rule bg-paper px-3 py-2 text-xs font-semibold text-ink-soft disabled:opacity-60"
            disabled
          >
            Open module
          </button>
        )}
        {isUnlocked ? (
          <ButtonLink
            className="inline-flex items-center gap-2 px-3 py-2"
            href={resumeHref}
          >
            <Play className="size-3.5" />
            {moduleProgress.percent === 100
              ? "Review module"
              : moduleProgress.completed === 0
                ? "Start module"
                : `Resume module`}
          </ButtonLink>
        ) : (
          isAuthenticated ? (
            <ButtonLink
              className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper px-3 py-2 text-xs font-semibold text-ink transition hover:border-accent/50 hover:text-accent"
              href={resumePreviousHref}
            >
              <Play className="size-3.5" />
              {lockedPrerequisite
                ? `Resume module ${String(lockedPrerequisite.order).padStart(2, "0")}`
                : "Open prerequisites"}
            </ButtonLink>
          ) : (
            <button
              type="button"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-rule bg-muted px-3 py-2 text-xs font-semibold text-ink-soft disabled:opacity-60"
              disabled
            >
              <Play className="size-3.5" />
              Finish previous module first
            </button>
          )
        )}
      </div>
    </article>
  );
}
