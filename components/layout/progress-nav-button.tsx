"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { ModuleMeta } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import { lessonProgressEventName, readLessonProgress } from "@/lib/lesson-progress";
import { getCurriculumProgress, getModuleLessonProgress } from "@/lib/lesson-progress-core.js";
import { ProgressInterruptionModal } from "@/components/curriculum/progress-interruption-modal";

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
  onActivate?: () => void;
};

function isProtectedResourcePath(href: string) {
  return href === "/quizzes" || href === "/projects";
}

export function ProgressNavButton({
  children,
  className = "",
  href,
  initialProgress = {},
  modules,
  onActivate
}: ProgressNavButtonProps) {
  const [pendingRedirect, setPendingRedirect] = useState<PendingRedirect | null>(null);
  const [progress, setProgress] = useState<LessonProgressState>(initialProgress);
  const pathname = usePathname();

  const activeCurriculumLesson = useMemo(() => {
    if (!pathname) {
      return null;
    }

    const match = pathname.match(/^\/curriculum\/([^/]+)\/([^/]+)/);

    if (!match) {
      return null;
    }

    const moduleSlug = decodeURIComponent(match[1]);
    const lessonSlug = decodeURIComponent(match[2]);
    const module = modules.find((candidate) => candidate.slug === moduleSlug);

    if (!module) {
      return null;
    }

    const lesson = module.lessons.find((candidate) => candidate.slug === lessonSlug);

    if (!lesson) {
      return null;
    }

    return {
      module,
      lesson
    };
  }, [modules, pathname]);

  const activeModuleRoute = useMemo(() => {
    if (!pathname) {
      return null;
    }

    const match = pathname.match(/^\/curriculum\/([^/]+)$/);

    if (!match) {
      return null;
    }

    const moduleSlug = decodeURIComponent(match[1]);
    const module = modules.find((candidate) => candidate.slug === moduleSlug);

    if (!module) {
      return null;
    }

    const moduleProgress = getModuleLessonProgress(module, progress);
    const nextLesson = moduleProgress.nextLesson;

    if (!nextLesson) {
      return null;
    }

    return {
      moduleSlug: module.slug,
      lessonSlug: nextLesson.slug,
      lessonTitle: nextLesson.title,
      moduleTitle: module.title
    };
  }, [modules, pathname, progress]);

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
  const activeLessonRef = activeCurriculumLesson
    ? {
      moduleSlug: activeCurriculumLesson.module.slug,
      lessonSlug: activeCurriculumLesson.lesson.slug,
      lessonTitle: activeCurriculumLesson.lesson.title,
      moduleTitle: activeCurriculumLesson.module.title
    }
    : null;
  const targetLesson = activeCurriculumLesson
    ? activeLessonRef
    : activeModuleRoute ?? nextLesson;
  const shouldGate =
    isProtectedResourcePath(href) && Boolean(targetLesson);

  const continueHref = targetLesson
    ? `/curriculum/${targetLesson.moduleSlug}/${targetLesson.lessonSlug}`
    : href;
  const lockedCopy = targetLesson
    ? `Complete ${targetLesson.lessonTitle ? `the quest "${targetLesson.lessonTitle}"` : "your current quest"} in ${targetLesson.moduleTitle ?? "the training path"} first.`
    : "Finish your current quest first before moving forward.";
  const progressHint = targetLesson
    ? `Quizzes and projects are unlocked only after completing your current path progress.`
    : "Finish your current quest first before moving forward.";

  if (!shouldGate) {
    return (
      <Link className={className} href={href} onClick={onActivate}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button
        className={className}
        onClick={() => {
          onActivate?.();
          setPendingRedirect(
            targetLesson
              ? {
                continueHref,
                lessonTitle: targetLesson.lessonTitle,
                moduleTitle: targetLesson.moduleTitle
              }
              : null
          );
        }}
        type="button"
      >
        {children}
      </button>
      {pendingRedirect ? (
        <ProgressInterruptionModal
          continueHref={pendingRedirect.continueHref}
          continueLabel="Continue current quest"
          description={`Open ${pendingRedirect.lessonTitle} in ${pendingRedirect.moduleTitle} before continuing.`}
          progressHint={progressHint}
          onClose={() => setPendingRedirect(null)}
          open
          supportingText={lockedCopy}
          title="Continue your quest path"
        />
      ) : null}
    </>
  );
}
