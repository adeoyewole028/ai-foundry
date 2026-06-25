function isModuleLessonCompleted(progress, moduleSlug, lessonSlug) {
  const key = `${moduleSlug}::${lessonSlug}`;
  return progress[key] === true;
}

function getModuleLessonProgress(module, progress) {
  const total = module.lessons.length;
  const completed = module.lessons.reduce((count, lesson) => {
    return isModuleLessonCompleted(progress, module.slug, lesson.slug) ? count + 1 : count;
  }, 0);
  const nextLesson = module.lessons.find((lesson) => !isModuleLessonCompleted(progress, module.slug, lesson.slug)) ?? null;

  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    nextLesson
  };
}

function getCurriculumProgress(modules, progress) {
  let total = 0;
  let completed = 0;
  let nextLesson = null;

  modules.forEach((module) => {
    module.lessons.forEach((lesson) => {
      total += 1;

      if (isModuleLessonCompleted(progress, module.slug, lesson.slug)) {
        completed += 1;
      } else if (!nextLesson) {
        nextLesson = {
          moduleSlug: module.slug,
          lessonSlug: lesson.slug,
          lessonTitle: lesson.title,
          moduleTitle: module.title ?? module.slug
        };
      }
    });
  });

  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    nextLesson
  };
}

function getLessonAccessState(module, lessonSlug, progress) {
  const currentIndex = module.lessons.findIndex((lesson) => lesson.slug === lessonSlug);

  if (currentIndex === -1) {
    return null;
  }

  const firstIncompleteIndex = module.lessons.findIndex((lesson) => {
    return !isModuleLessonCompleted(progress, module.slug, lesson.slug);
  });
  const maxUnlockedIndex =
    firstIncompleteIndex === -1 ? module.lessons.length - 1 : Math.max(0, firstIncompleteIndex);
  const isCompleted = isModuleLessonCompleted(progress, module.slug, lessonSlug);
  const isUnlocked = currentIndex <= maxUnlockedIndex || isCompleted;
  const requiredLesson = isUnlocked ? null : module.lessons[maxUnlockedIndex] ?? module.lessons[0] ?? null;

  return {
    isUnlocked,
    currentIndex,
    requiredLesson
  };
}

export { getModuleLessonProgress, getCurriculumProgress, getLessonAccessState };
