import type { ModuleMeta } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import { getCurriculumProgress } from "@/lib/lesson-progress-core.js";

export type NextLessonResult = {
  href: string;
  isComplete: boolean;
};

export function getNextLessonHref(
  modules: ModuleMeta[],
  progress: LessonProgressState,
  fallbackHref = "/curriculum"
): NextLessonResult {
  const { nextLesson } = getCurriculumProgress(modules, progress);

  if (!nextLesson) {
    return {
      href: fallbackHref,
      isComplete: true
    };
  }

  return {
    href: `/curriculum/${nextLesson.moduleSlug}/${nextLesson.lessonSlug}`,
      isComplete: false
  };
}
