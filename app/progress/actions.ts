"use server";

import { revalidatePath } from "next/cache";
import type { QuizQuestion } from "@/lib/content";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ProjectSubmission } from "@/lib/supabase/project-submissions";
import {
  getCurrentUserLessonProgress,
  getLatestQuizAttemptForCurrentUser,
  markLessonCompletionForCurrentUser,
  syncLessonProgressForCurrentUser,
  submitQuizAttemptForCurrentUser
} from "@/lib/supabase/progress";
import { submitProjectSubmissionForCurrentUser, normalizeProjectSubmissionForm } from "@/lib/supabase/project-submissions";

export async function getLessonProgressForUserAction(moduleSlugs?: string[]) {
  if (!isSupabaseConfigured()) {
    return {};
  }

  return getCurrentUserLessonProgress(moduleSlugs);
}

export async function syncLocalLessonProgressAction(progress: LessonProgressState) {
  return syncLessonProgressForCurrentUser(progress);
}

export async function syncLessonCompletion({
  moduleSlug,
  lessonSlug,
  completed
}: {
  moduleSlug: string;
  lessonSlug: string;
  completed: boolean;
}) {
  const result = await markLessonCompletionForCurrentUser({
    moduleSlug,
    lessonSlug,
    completed
  });

  if (result.ok) {
    revalidatePath("/curriculum");
    revalidatePath(`/curriculum/${moduleSlug}`);
    revalidatePath(`/curriculum/${moduleSlug}/${lessonSlug}`);
    revalidatePath("/dashboard");
  }

  return result;
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
  const result = await submitQuizAttemptForCurrentUser({
    moduleSlug,
    lessonSlug,
    questions,
    answers,
    quizMode
  });

  if (result.ok) {
    revalidatePath("/curriculum");
    revalidatePath(`/curriculum/${moduleSlug}`);
    revalidatePath(`/curriculum/${moduleSlug}/${lessonSlug}`);
    revalidatePath("/dashboard");
  }

  return result;
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
  | ({ ok: true; submission: ProjectSubmission })
  | ({ ok: false; error: string })
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const parsed = normalizeProjectSubmissionForm(formData);

  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

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
      ok: false,
      error: completionResult.error ?? "Could not mark lesson complete."
    };
  }

  revalidatePath("/curriculum");
  revalidatePath(`/curriculum/${moduleSlug}`);
  revalidatePath(`/curriculum/${moduleSlug}/${lessonSlug}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");

  return result;
}
