"use server";

import { revalidatePath } from "next/cache";
import type { QuizQuestion } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import { buildEntityId } from "@/lib/gamification";
import { XP_REWARDS } from "@/lib/gamification";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ProjectSubmission } from "@/lib/supabase/project-submissions";
import { getBossBattleForModule } from "@/lib/content";
import { getModule } from "@/lib/content.server";
import {
  awardXpForCurrentUser,
  awardModuleCompletionIfReadyForCurrentUser,
  getCurrentUserUnlockedAchievementIds,
  getCurrentUserLessonProgress,
  getLatestQuizAttemptForCurrentUser,
  markBossBattleCompletionForCurrentUser,
  markLessonCompletionForCurrentUser,
  syncLessonProgressForCurrentUser,
  submitQuizAttemptForCurrentUser
} from "@/lib/supabase/progress";
import { submitProjectSubmissionForCurrentUser, normalizeProjectSubmissionForm } from "@/lib/supabase/project-submissions";

function getTodayActivityKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getFormString(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}

async function awardDailyStreak() {
  await awardXpForCurrentUser({
    eventType: "STREAK_DAY",
    entityType: "streak",
    entityId: getTodayActivityKey(),
    xpAmount: XP_REWARDS.STREAK_DAY
  });
}

async function withUnlockedAchievementDiff<T>(execute: () => Promise<T>): Promise<{
  result: T;
  unlockedAchievementIds: string[];
}> {
  const before = await getCurrentUserUnlockedAchievementIds();
  const result = await execute();
  const after = await getCurrentUserUnlockedAchievementIds();
  const beforeSet = new Set(before);

  return {
    result,
    unlockedAchievementIds: after.filter((id) => !beforeSet.has(id))
  };
}

export async function getLessonProgressForUserAction(moduleSlugs?: string[]) {
  if (!isSupabaseConfigured()) {
    return {};
  }

  return getCurrentUserLessonProgress(moduleSlugs);
}

export async function syncLocalLessonProgressAction(progress: LessonProgressState) {
  const localCompletedLessons = Object.entries(progress).flatMap(([lessonKey, completed]) => {
    if (!completed) {
      return [];
    }

    const [moduleSlug, lessonSlug] = lessonKey.split("::");

    if (!moduleSlug || !lessonSlug) {
      return [];
    }

    return [{ lessonKey, moduleSlug, lessonSlug }];
  });

  const serverCompletedLessons = await getCurrentUserLessonProgress();
  const newCompletedLessons = localCompletedLessons.filter(({ lessonKey }) => !serverCompletedLessons[lessonKey]);

  const { result, unlockedAchievementIds } = await withUnlockedAchievementDiff(async () => {
    const syncResult = await syncLessonProgressForCurrentUser(progress);

    if (!syncResult.ok) {
      return syncResult;
    }

    const modulesToCheck = new Set<string>();

    for (const { moduleSlug, lessonSlug } of newCompletedLessons) {
      const xpResult = await awardXpForCurrentUser({
        eventType: "LESSON_COMPLETE",
        entityType: "lesson",
        entityId: buildEntityId(moduleSlug, lessonSlug)
      });

      if (!xpResult.ok) {
        return { ok: false, error: xpResult.error ?? "Could not award synced lesson XP." };
      }

      if (xpResult.awarded) {
        await awardDailyStreak();
      }

      modulesToCheck.add(moduleSlug);
    }

    for (const moduleSlug of modulesToCheck) {
      await awardModuleCompletionIfReadyForCurrentUser(moduleSlug);
    }

    if (newCompletedLessons.length > 0) {
      revalidatePath("/curriculum");
      revalidatePath("/dashboard");
    }

    return syncResult;
  });

  if ((result as { ok: boolean }).ok) {
    return { ...(result as { ok: true; synced?: number; error?: string }), unlockedAchievementIds };
  }

  return { ...(result as { ok: false; error: string; synced?: number }), unlockedAchievementIds };
}

export async function syncLessonCompletion({
  moduleSlug,
  lessonSlug,
  completed
}: {
  moduleSlug: string;
  lessonSlug: string;
  completed: boolean;
}): Promise<
  {
    ok: true;
    unlockedAchievementIds?: string[];
  } | {
    ok: false;
    error: string;
    unlockedAchievementIds?: string[];
  }
> {
  const { result, unlockedAchievementIds } = await withUnlockedAchievementDiff(async () => {
    const markResult = await markLessonCompletionForCurrentUser({
      moduleSlug,
      lessonSlug,
      completed
    });

    if (!markResult.ok) {
      return markResult;
    }

    if (completed) {
      const xpResult = await awardXpForCurrentUser({
        eventType: "LESSON_COMPLETE",
        entityType: "lesson",
        entityId: buildEntityId(moduleSlug, lessonSlug)
      });

      if (!xpResult.ok) {
        return { ok: false, error: xpResult.error ?? "Could not award lesson XP." };
      }

      if (xpResult.awarded) {
        await awardDailyStreak();
      }

      await awardModuleCompletionIfReadyForCurrentUser(moduleSlug);

      revalidatePath("/curriculum");
      revalidatePath(`/curriculum/${moduleSlug}`);
      revalidatePath(`/curriculum/${moduleSlug}/${lessonSlug}`);
      revalidatePath("/dashboard");
    }

    return markResult;
  });

  if ((result as { ok: boolean }).ok) {
    return { ...(result as { ok: true }), unlockedAchievementIds };
  }

  return { ...(result as { ok: false; error: string }), unlockedAchievementIds };
}

export async function completeBossBattleAction(formData: FormData): Promise<
  | {
      ok: true;
      awarded?: boolean;
      alreadyCompleted?: boolean;
      unlockedAchievementIds?: string[];
    }
  | { ok: false; error: string; unlockedAchievementIds?: string[] }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const moduleSlug = getFormString(formData, "moduleSlug").trim();
  const bossBattleSlug = getFormString(formData, "bossBattleSlug").trim();
  const response = getFormString(formData, "response").trim();

  if (!moduleSlug || !bossBattleSlug) {
    return { ok: false, error: "Missing required boss battle identifiers." };
  }

  const module = await getModule(moduleSlug);

  if (!module) {
    return { ok: false, error: "Invalid module." };
  }

  const bossBattleSelection = getBossBattleForModule(module);

  if (!bossBattleSelection || bossBattleSelection.lesson.slug !== bossBattleSlug) {
    return { ok: false, error: "Boss battle is not configured for this module." };
  }

  const bossBattleReward = bossBattleSelection.meta?.xpReward;
  const eventEntityId = buildEntityId(moduleSlug, bossBattleSlug);
  const { result, unlockedAchievementIds } = await withUnlockedAchievementDiff(async () => {
    const bossBattleProgressResult = await markBossBattleCompletionForCurrentUser({
      moduleSlug,
      bossBattleSlug,
      response
    });

    if (!bossBattleProgressResult.ok) {
      return {
        ok: false as const,
        error: bossBattleProgressResult.error ?? "Could not save boss battle response."
      };
    }

    const completionResult = await markLessonCompletionForCurrentUser({
      moduleSlug,
      lessonSlug: bossBattleSlug,
      completed: true
    });

    if (!completionResult.ok) {
      return {
        ok: false as const,
        error: completionResult.error ?? "Could not mark boss battle complete."
      };
    }

    const xpResult = await awardXpForCurrentUser({
      eventType: "BOSS_BATTLE_COMPLETE",
      entityType: "boss_battle",
      entityId: eventEntityId,
      xpAmount: bossBattleReward ?? XP_REWARDS.BOSS_BATTLE_COMPLETE
    });

    if (!xpResult.ok) {
      return {
        ok: false as const,
        error: xpResult.error ?? "Could not award boss battle XP."
      };
    }

    if (xpResult.awarded) {
      await awardDailyStreak();
    }

    await awardModuleCompletionIfReadyForCurrentUser(moduleSlug);
    revalidatePath(`/curriculum/${moduleSlug}`);
    revalidatePath(`/curriculum/${moduleSlug}/boss-battle`);
    revalidatePath("/dashboard");

    return {
      ok: true as const,
      awarded: xpResult.awarded,
      alreadyCompleted: xpResult.awarded ? false : true
    };
  });

  return { ...result, unlockedAchievementIds };
}

export async function submitQuizAttemptAction({
  moduleSlug,
  lessonSlug,
  questions,
  answers,
  quizMode
}: {
  moduleSlug: string;
  lessonSlug: string;
  questions: QuizQuestion[];
  answers: Record<string, string>;
  quizMode?: "multiple-choice" | "short-answer";
}) {
  const { result, unlockedAchievementIds } = await withUnlockedAchievementDiff(async () => {
      const result = await submitQuizAttemptForCurrentUser({
        moduleSlug,
        lessonSlug,
        questions,
        answers,
      quizMode
    });

    if (result.ok && result.passed) {
      await markLessonCompletionForCurrentUser({
        moduleSlug,
        lessonSlug,
        completed: true
      });

      const quizXpResult = await awardXpForCurrentUser({
        eventType: "QUIZ_COMPLETE",
        entityType: "quiz",
        entityId: buildEntityId(moduleSlug, lessonSlug)
      });

      if (!quizXpResult.ok) {
        return { ok: false, error: quizXpResult.error ?? "Could not award quiz XP." };
      }

      if (quizXpResult.awarded) {
        await awardDailyStreak();
      }

      if (result.score >= result.totalQuestions && result.totalQuestions > 0) {
        const perfectXpResult = await awardXpForCurrentUser({
          eventType: "PERFECT_QUIZ",
          entityType: "quiz",
          entityId: buildEntityId(moduleSlug, lessonSlug)
        });

        if (!perfectXpResult.ok) {
          return { ok: false, error: perfectXpResult.error ?? "Could not award perfect quiz XP." };
        }
      }
      await awardModuleCompletionIfReadyForCurrentUser(moduleSlug);

      revalidatePath("/curriculum");
      revalidatePath(`/curriculum/${moduleSlug}`);
      revalidatePath(`/curriculum/${moduleSlug}/${lessonSlug}`);
      revalidatePath("/dashboard");
    }

    return result;
  });

  if (result && typeof result === "object" && "ok" in result) {
    return { ...result, unlockedAchievementIds };
  }

  return { ok: false, error: "Failed to record attempt.", unlockedAchievementIds };
}

export async function getLatestQuizAttemptAction({
  moduleSlug,
  lessonSlug
}: {
  moduleSlug: string;
  lessonSlug: string;
}) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return getLatestQuizAttemptForCurrentUser({
    moduleSlug,
    lessonSlug
  });
}

export async function submitProjectSubmissionAction(formData: FormData): Promise<
  | ({ ok: true; submission: ProjectSubmission; unlockedAchievementIds?: string[] })
  | ({ ok: false; error: string; unlockedAchievementIds?: string[] })
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const parsed = normalizeProjectSubmissionForm(formData);

  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const { result, unlockedAchievementIds } = await withUnlockedAchievementDiff(async () => {
    const result = await submitProjectSubmissionForCurrentUser(parsed.value);

    if (!result.ok) {
      return result;
    }

    const { moduleSlug, lessonSlug } = parsed.value;
    const completionResult = await markLessonCompletionForCurrentUser({
      moduleSlug,
      lessonSlug,
      completed: true
    });

    if (!completionResult.ok) {
      return {
        ok: false as const,
        error: completionResult.error ?? "Could not mark lesson complete."
      };
    }

    const projectXpResult = await awardXpForCurrentUser({
      eventType: "PROJECT_SUBMITTED",
      entityType: "project",
      entityId: buildEntityId(moduleSlug, lessonSlug)
    });

    if (!projectXpResult.ok) {
      return {
        ok: false as const,
        error: projectXpResult.error ?? "Could not award project XP."
      };
    }

    if (projectXpResult.awarded) {
      await awardDailyStreak();
    }

    await awardModuleCompletionIfReadyForCurrentUser(moduleSlug);

    revalidatePath("/curriculum");
    revalidatePath(`/curriculum/${moduleSlug}`);
    revalidatePath(`/curriculum/${moduleSlug}/${lessonSlug}`);
    revalidatePath("/projects");
    revalidatePath("/dashboard");

    return result;
  });

  return { ...result, unlockedAchievementIds };
}
