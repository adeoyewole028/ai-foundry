import assert from "node:assert/strict";
import test from "node:test";

import { getModuleLessonProgress } from "../lib/lesson-progress-core.js";

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
