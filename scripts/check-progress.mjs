import assert from "node:assert/strict";
import test from "node:test";

import { getCurriculumProgress, getModuleLessonProgress } from "../lib/lesson-progress-core.js";

const modules = [
  {
    slug: "module-1",
    title: "Module 1",
    lessons: [
      { slug: "intro", title: "Intro" },
      { slug: "setup", title: "Setup" },
    ],
  },
  {
    slug: "module-2",
    title: "Module 2",
    lessons: [
      { slug: "deep-dive", title: "Deep Dive" },
    ],
  },
];

test("getModuleLessonProgress computes completed and next lesson", () => {
  assert.deepEqual(
    getModuleLessonProgress(modules[0], {
      "module-1::intro": true,
    }),
    {
      total: 2,
      completed: 1,
      percent: 50,
      nextLesson: modules[0].lessons[1],
    }
  );
});

test("getCurriculumProgress handles no progress", () => {
  assert.deepEqual(getCurriculumProgress(modules, {}), {
    total: 3,
    completed: 0,
    percent: 0,
    nextLesson: {
      moduleSlug: "module-1",
      lessonSlug: "intro",
      lessonTitle: "Intro",
      moduleTitle: "Module 1",
    },
  });
});

test("getCurriculumProgress computes percentage and next lesson", () => {
  assert.deepEqual(
    getCurriculumProgress(modules, {
      "module-1::intro": true,
      "module-2::deep-dive": true,
    }),
    {
      total: 3,
      completed: 2,
      percent: 67,
      nextLesson: {
        moduleSlug: "module-1",
        lessonSlug: "setup",
        lessonTitle: "Setup",
        moduleTitle: "Module 1",
      },
    }
  );
});

test("getCurriculumProgress returns completed when all lessons are done", () => {
  assert.deepEqual(getCurriculumProgress(modules, {
    "module-1::intro": true,
    "module-1::setup": true,
    "module-2::deep-dive": true,
  }), {
    total: 3,
    completed: 3,
    percent: 100,
    nextLesson: null,
  });
});
