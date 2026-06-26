"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import type { Lesson } from "@/lib/content";
import type { QuizQuestion } from "@/lib/content";
import { getLesson } from "@/lib/content.server";
import { buildEntityId, XP_REWARDS } from "@/lib/gamification";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  awardXpForCurrentUser,
  awardModuleCompletionIfReadyForCurrentUser,
  syncCurrentUserAchievementUnlocksForCurrentUser,
  markLessonCompletionForCurrentUser,
  syncLessonProgressForCurrentUser,
  submitQuizAttemptForCurrentUser
} from "@/lib/supabase/progress";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function redirectWithMessage(path: string, type: "error" | "message", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

function parseLocalProgressFromForm(formData: FormData): LessonProgressState {
  const raw = formData.get("localProgress");

  if (typeof raw !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

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

type LocalQuizRecord = {
  quizAnswers?: unknown;
  quizSubmitted?: unknown;
};

type LocalQuizProgressState = Record<string, LocalQuizRecord>;

type PendingQuizAttempt = {
  moduleSlug: string;
  lessonSlug: string;
  answers: QuizAnswer;
  submitted: boolean;
};

type QuizAnswer = Record<string, string>;

function normalizeQuizAnswerRecord(raw: unknown): QuizAnswer | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const answers = Object.entries(raw).reduce<QuizAnswer>((acc, [questionId, answer]) => {
    if (typeof questionId === "string" && typeof answer === "string") {
      acc[questionId] = answer;
    }

    return acc;
  }, {});

  if (Object.keys(answers).length === 0) {
    return null;
  }

  return answers;
}

function parseLocalQuizProgressFromForm(formData: FormData): LocalQuizProgressState {
  const raw = formData.get("localQuizProgress");

  if (typeof raw !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    return Object.entries(parsed).reduce<LocalQuizProgressState>((acc, [key, value]) => {
      if (typeof key !== "string" || typeof value !== "object" || value === null || Array.isArray(value)) {
        return acc;
      }

      const candidate = value as LocalQuizRecord;
      const answers = normalizeQuizAnswerRecord(candidate.quizAnswers);
      const submitted = candidate.quizSubmitted === true;

      if (answers) {
        acc[key] = {
          quizAnswers: answers,
          quizSubmitted: submitted
        };
      }

      return acc;
    }, {});
  } catch {
    return {};
  }
}

function collectPendingQuizAttempts(localState: LocalQuizProgressState): PendingQuizAttempt[] {
  return Object.entries(localState).flatMap(([key, value]) => {
    if (!value.quizAnswers || value.quizSubmitted !== true) {
      return [];
    }

    const separatorIndex = key.indexOf("::");

    if (separatorIndex <= 0) {
      return [];
    }

    const moduleSlug = key.slice(0, separatorIndex);
    const lessonSlug = key.slice(separatorIndex + 2);

    return [{
      moduleSlug,
      lessonSlug,
      answers: value.quizAnswers as QuizAnswer,
      submitted: true
    }];
  });
}

function getQuizMetadataFromLesson(lesson: Lesson | null): {
  questions: QuizQuestion[];
  quizMode?: "multiple-choice" | "short-answer";
} | null {
  if (!lesson || lesson.type !== "quiz") {
    return null;
  }

  return {
    questions: lesson.quizQuestions,
    quizMode: lesson.quizMode
  };
}

async function syncPendingQuizProgress(formData: FormData) {
  const localQuizProgress = parseLocalQuizProgressFromForm(formData);
  const pendingAttempts = collectPendingQuizAttempts(localQuizProgress);

  if (pendingAttempts.length === 0) {
    return;
  }

  let awardedAnyXp = false;

  for (const attempt of pendingAttempts) {
    if (!attempt.submitted) {
      continue;
    }

    const lesson = await getLesson(attempt.moduleSlug, attempt.lessonSlug);
    const metadata = getQuizMetadataFromLesson(lesson);

    if (!metadata || metadata.questions.length === 0) {
      continue;
    }

    const result = await submitQuizAttemptForCurrentUser({
      moduleSlug: attempt.moduleSlug,
      lessonSlug: attempt.lessonSlug,
      questions: metadata.questions,
      answers: attempt.answers,
      quizMode: metadata.quizMode
    });

    if (!result.ok) {
      continue;
    }

    if (result.passed) {
      const entityId = buildEntityId(attempt.moduleSlug, attempt.lessonSlug);

      await markLessonCompletionForCurrentUser({
        moduleSlug: attempt.moduleSlug,
        lessonSlug: attempt.lessonSlug,
        completed: true
      });

      const quizCompleteResult = await awardXpForCurrentUser({
        eventType: "QUIZ_COMPLETE",
        entityType: "quiz",
        entityId
      });

      if (quizCompleteResult.ok && quizCompleteResult.awarded) {
        awardedAnyXp = true;
      }

      if (result.totalQuestions > 0 && result.score >= result.totalQuestions) {
        const perfectResult = await awardXpForCurrentUser({
          eventType: "PERFECT_QUIZ",
          entityType: "quiz",
          entityId
        });

        if (perfectResult.ok && perfectResult.awarded) {
          awardedAnyXp = true;
        }
      }

      await awardModuleCompletionIfReadyForCurrentUser(attempt.moduleSlug);
    }
  }

  if (awardedAnyXp) {
    await awardDailyStreak();
    await syncCurrentUserAchievementUnlocksForCurrentUser();
  }
}

function getTodayActivityKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function awardDailyStreak() {
  await awardXpForCurrentUser({
    eventType: "STREAK_DAY",
    entityType: "streak",
    entityId: getTodayActivityKey(),
    xpAmount: XP_REWARDS.STREAK_DAY
  });
}

async function syncPendingLessonProgress(formData: FormData) {
  const localProgress = parseLocalProgressFromForm(formData);

  if (Object.keys(localProgress).length === 0) {
    return;
  }

  const result = await syncLessonProgressForCurrentUser(localProgress);

  if (!result.ok) {
    return;
  }

  const syncedEntries = Object.keys(localProgress).filter((lessonKey) => localProgress[lessonKey] === true);

  let awardedAnyXp = false;

  if (syncedEntries.length === 0) {
    return;
  }

  const pendingModuleSlugs = new Set<string>();

  for (const lessonKey of syncedEntries) {
    const separatorIndex = lessonKey.indexOf("::");

    if (separatorIndex <= 0) {
      continue;
    }

    const moduleSlug = lessonKey.slice(0, separatorIndex);
    const lessonSlug = lessonKey.slice(separatorIndex + 2);
    pendingModuleSlugs.add(moduleSlug);

    const entityId = buildEntityId(moduleSlug, lessonSlug);
    const xpResult = await awardXpForCurrentUser({
      eventType: "LESSON_COMPLETE",
      entityType: "lesson",
      entityId
    });

    if (xpResult.ok && xpResult.awarded) {
      awardedAnyXp = true;
    }
  }

  for (const moduleSlug of pendingModuleSlugs) {
    await awardModuleCompletionIfReadyForCurrentUser(moduleSlug);
  }

  if (awardedAnyXp) {
    await awardDailyStreak();
    await syncCurrentUserAchievementUnlocksForCurrentUser();
  }
}

export async function login(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirectWithMessage(
      "/auth/login",
      "error",
      "Supabase is not configured yet. Add the project URL and publishable key."
    );
  }

  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!email || !password) {
    redirectWithMessage("/auth/login", "error", "Email and password are required.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirectWithMessage("/auth/login", "error", error.message);
  }

  await syncPendingLessonProgress(formData);
  await syncPendingQuizProgress(formData);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirectWithMessage(
      "/auth/signup",
      "error",
      "Supabase is not configured yet. Add the project URL and publishable key."
    );
  }

  const fullName = getString(formData, "fullName");
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!fullName || !email || !password) {
    redirectWithMessage("/auth/signup", "error", "Name, email, and password are required.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) {
    redirectWithMessage("/auth/signup", "error", error.message);
  }

  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: fullName
    });
    await syncPendingLessonProgress(formData);
    await syncPendingQuizProgress(formData);
  }

  revalidatePath("/", "layout");
  redirectWithMessage(
    "/auth/login",
    "message",
    "Account created. Check your email if confirmation is required, then sign in."
  );
}

export async function logout() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
