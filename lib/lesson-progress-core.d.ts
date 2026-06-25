export type LessonProgressState = Record<string, true>;
export type ModuleLessonIdentifier = {
  slug: string;
  type: "lesson" | "quiz" | "project";
  title: string;
};
export type ModuleMetaLike = {
  slug: string;
  title?: string;
  lessons: ModuleLessonIdentifier[];
};
export type CurriculumLessonRef = {
  moduleSlug: string;
  lessonSlug: string;
  lessonTitle: string;
  moduleTitle: string;
};
export type ModuleProgress = {
  total: number;
  completed: number;
  percent: number;
  nextLesson: ModuleLessonIdentifier | null;
};
export type CurriculumProgress = {
  total: number;
  completed: number;
  percent: number;
  nextLesson: CurriculumLessonRef | null;
};
export type LessonAccessState = {
  isUnlocked: boolean;
  currentIndex: number;
  requiredLesson: ModuleLessonIdentifier | null;
};

export function getModuleLessonProgress(
  module: ModuleMetaLike,
  progress: LessonProgressState
): ModuleProgress;
export function getCurriculumProgress(
  modules: ModuleMetaLike[],
  progress: LessonProgressState
): CurriculumProgress;
export function getLessonAccessState(
  module: ModuleMetaLike,
  lessonSlug: string,
  progress: LessonProgressState
): LessonAccessState | null;
