import assert from "node:assert/strict";
import test from "node:test";

import { getLessonAccessState, getModuleLessonProgress } from "../lib/lesson-progress-core.js";

function getOrderedModules(modules) {
  return [...modules].sort((a, b) => a.order - b.order);
}

function isModuleLocked(modules, targetSlug, progress) {
  const orderedModules = getOrderedModules(modules);
  const target = orderedModules.find((module) => module.slug === targetSlug);

  if (!target) {
    throw new Error(`Unknown module: ${targetSlug}`);
  }

  const targetIndex = orderedModules.findIndex((module) => module.slug === target.slug);
  const prerequisiteModules = targetIndex > 0 ? orderedModules.slice(0, targetIndex) : [];

  return {
    arePrerequisitesLocked: prerequisiteModules.some(
      (prerequisiteModule) => getModuleLessonProgress(prerequisiteModule, progress).percent !== 100
    ),
    lockedPrerequisiteOrder: prerequisiteModules.length > 0
      ? prerequisiteModules[prerequisiteModules.length - 1].order
      : null
  };
}

function isModuleUnlocked(modules, targetSlug, progress) {
  return !isModuleLocked(modules, targetSlug, progress).arePrerequisitesLocked;
}

function isLessonUnlocked(modules, moduleSlug, lessonSlug, progress) {
  const module = modules.find((candidate) => candidate.slug === moduleSlug);

  if (!module) {
    throw new Error(`Unknown module for access check: ${moduleSlug}`);
  }

  const result = getLessonAccessState(module, lessonSlug, progress);

  return result?.isUnlocked ?? false;
}

const modules = [
  {
    slug: "module-00",
    order: 0,
    lessons: [
      { slug: "intro", title: "Intro" },
      { slug: "basics", title: "Basics" }
    ]
  },
  {
    slug: "module-01",
    order: 1,
    lessons: [{ slug: "next-steps", title: "Next steps" }]
  },
  {
    slug: "module-02",
    order: 2,
    lessons: [{ slug: "advanced", title: "Advanced" }]
  }
];

test("first module is never locked by prerequisites", () => {
  assert.deepEqual(isModuleLocked(modules, "module-00", {}), {
    arePrerequisitesLocked: false,
    lockedPrerequisiteOrder: null
  });
});

test("module remains locked when prior module is incomplete", () => {
  assert.deepEqual(isModuleLocked(modules, "module-01", {
    "module-00::intro": true
  }), {
    arePrerequisitesLocked: true,
    lockedPrerequisiteOrder: 0
  });
});

test("module unlocks only when all prior modules are complete", () => {
  assert.deepEqual(isModuleLocked(modules, "module-02", {
    "module-00::intro": true,
    "module-00::basics": true,
    "module-01::next-steps": true
  }), {
    arePrerequisitesLocked: false,
    lockedPrerequisiteOrder: 1
  });
});

test("module unlock helper uses prerequisite state", () => {
  assert.equal(
    isModuleUnlocked(modules, "module-01", { "module-00::intro": true }),
    false
  );

  assert.equal(
    isModuleUnlocked(modules, "module-01", {
      "module-00::intro": true,
      "module-00::basics": true
    }),
    true
  );
});

test("module-02 stays locked if module-01 is missing completion", () => {
  assert.deepEqual(isModuleLocked(modules, "module-02", {
    "module-00::intro": true,
    "module-00::basics": true
  }), {
    arePrerequisitesLocked: true,
    lockedPrerequisiteOrder: 1
  });
});

test("lesson unlocks by in-module progression and module-level prerequisite lock", () => {
  const module01UnlockedEvenBeforeCompletion = {
    "module-00::intro": true,
    "module-00::basics": true,
    "module-01::next-steps": false
  };

  assert.equal(isLessonUnlocked(modules, "module-01", "next-steps", module01UnlockedEvenBeforeCompletion), true);

  const module00Incomplete = {
    "module-00::intro": false,
    "module-00::basics": false
  };

  assert.equal(isLessonUnlocked(modules, "module-00", "basics", module00Incomplete), false);
  assert.equal(isLessonUnlocked(modules, "module-00", "intro", module00Incomplete), true);

  const module01LockedByPrereq = {
    "module-00::intro": true,
    "module-00::basics": false
  };

  const module01Access = getLessonAccessState(
    modules.find((candidate) => candidate.slug === "module-01"),
    "next-steps",
    module01LockedByPrereq
  );

  assert.equal(isModuleUnlocked(modules, "module-01", module01LockedByPrereq), false);
  assert.equal(module01Access?.isUnlocked ?? false, true);
});
