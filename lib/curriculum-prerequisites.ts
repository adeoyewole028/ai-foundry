import type { ModuleMeta } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import { getModuleLessonProgress } from "@/lib/lesson-progress-core.js";

export function formatModuleDisplayLabel(module: ModuleMeta | null): string {
  if (!module) {
    return "No module published";
  }

  return `Module ${String(module.order).padStart(2, "0")} — ${module.title}`;
}

export function getModuleStatusLabel(params: {
  isUnlocked: boolean;
  percentComplete: number;
}): string {
  const { isUnlocked, percentComplete } = params;

  if (!isUnlocked) {
    return "Locked";
  }

  if (percentComplete === 100) {
    return "Completed";
  }

  if (percentComplete === 0) {
    return "Not started";
  }

  return "In progress";
}

export function getOrderedModules(modules: ModuleMeta[]): ModuleMeta[] {
  return [...modules].sort((a, b) => a.order - b.order);
}

export type ModulePrerequisiteState = {
  module: ModuleMeta;
  prerequisiteModules: ModuleMeta[];
  arePrerequisitesLocked: boolean;
  lockedPrerequisiteOrder: number | null;
};

export function getModulePrerequisiteState(params: {
  modules: ModuleMeta[];
  moduleSlug: string;
  progress: LessonProgressState;
}): ModulePrerequisiteState | null {
  const orderedModules = getOrderedModules(params.modules);
  const targetModule = orderedModules.find((candidate) => candidate.slug === params.moduleSlug);

  if (!targetModule) {
    return null;
  }

  const targetIndex = orderedModules.findIndex((candidate) => candidate.slug === targetModule.slug);
  const prerequisiteModules = targetIndex > 0 ? orderedModules.slice(0, targetIndex) : [];
  const arePrerequisitesLocked = prerequisiteModules.some(
    (prerequisiteModule) => getModuleLessonProgress(prerequisiteModule, params.progress).percent !== 100
  );

  return {
    module: targetModule,
    prerequisiteModules,
    arePrerequisitesLocked,
    lockedPrerequisiteOrder:
      arePrerequisitesLocked && prerequisiteModules.length > 0
        ? prerequisiteModules[prerequisiteModules.length - 1].order
        : null
  };
}

export function isModuleUnlocked(params: {
  modules: ModuleMeta[];
  moduleSlug: string;
  progress: LessonProgressState;
}): boolean {
  const state = getModulePrerequisiteState(params);

  return state ? !state.arePrerequisitesLocked : false;
}
