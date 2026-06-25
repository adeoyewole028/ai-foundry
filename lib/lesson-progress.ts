import {
  type CurriculumProgress,
  type CurriculumLessonRef,
  type LessonProgressState,
  type ModuleLessonIdentifier,
  type ModuleMetaLike,
  type ModuleProgress,
  getCurriculumProgress,
  getLessonAccessState,
  getModuleLessonProgress
} from "./lesson-progress-core.js";

export type { CurriculumProgress, CurriculumLessonRef, LessonProgressState, ModuleLessonIdentifier, ModuleMetaLike, ModuleProgress };
export { getCurriculumProgress, getLessonAccessState, getModuleLessonProgress };

export const lessonProgressStorageKey = "ai-foundry:completed-lessons";
export const lessonActivityStorageKey = "ai-foundry:lesson-activity";
export const lessonProgressEventName = "ai-foundry:lesson-progress-updated";

type LessonIdentifier = {
  moduleSlug: string;
  lessonSlug: string;
};

type StoredLessonProgress = Record<string, unknown>;

export function lessonProgressKey({ moduleSlug, lessonSlug }: LessonIdentifier): string {
  return `${moduleSlug}::${lessonSlug}`;
}

export function readLessonProgress(): LessonProgressState {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(lessonProgressStorageKey);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as StoredLessonProgress;

    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    return Object.entries(parsed).reduce<LessonProgressState>((acc, [key, value]) => {
      if (typeof key === "string" && value === true) {
        acc[key] = true;
      }

      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function writeLessonProgress(progress: LessonProgressState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(lessonProgressStorageKey, JSON.stringify(progress));
  window.dispatchEvent(new Event(lessonProgressEventName));
}

export function resetLessonProgress(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(lessonProgressStorageKey);
  window.localStorage.removeItem(lessonActivityStorageKey);
  window.dispatchEvent(new Event(lessonProgressEventName));
}

export function setLessonCompleted(
  params: LessonIdentifier & { completed: boolean }
): void {
  const current = readLessonProgress();
  const key = lessonProgressKey(params);

  if (params.completed) {
    current[key] = true;
  } else {
    delete current[key];
  }

  writeLessonProgress(current);
}

export function isLessonCompleted(
  progress: LessonProgressState,
  params: LessonIdentifier
): boolean {
  return progress[lessonProgressKey(params)] === true;
}

export function getFirstLockedLessonIndex(module: {
  lessons: Array<{ slug: string }>;
  slug: string;
}, progress: LessonProgressState): number {
  return module.lessons.findIndex((lesson) => {
    return !isLessonCompleted(progress, { moduleSlug: module.slug, lessonSlug: lesson.slug });
  });
}
