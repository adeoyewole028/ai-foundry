import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import type { QuizQuestion } from "@/lib/content";
import { gradeQuizSubmission } from "@/lib/quiz-grading";

type QuizAnswer = Record<string, string>;

type QuizAttemptFeedback = {
  questionId: string;
  prompt: string;
  passed: boolean;
  matchedKeywords: string[];
  expectedMinimum: number;
  answerLength: number;
  criterionResults?: Array<{
    criterionId: string;
    label: string;
    passed: boolean;
    matchedTerms: string[];
    requiredTerms: string[];
  }>;
};

type QuizAttemptFeedbackPayload = {
  score: number;
  totalQuestions: number;
  matchedKeywordCount: number;
  passed: boolean;
  feedback: QuizAttemptFeedback[];
};

function getUserId(claims: unknown): string | null {
  if (
    typeof claims === "object" &&
    claims !== null &&
    "sub" in claims &&
    typeof (claims as { sub?: unknown }).sub === "string"
  ) {
    return (claims as { sub: string }).sub;
  }

  return null;
}

export async function getCurrentUserLessonProgress(
  moduleSlugs?: string[]
): Promise<LessonProgressState> {
  if (!isSupabaseConfigured()) {
    return {};
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return {};
  }

  let query = supabase
    .from("lesson_progress")
    .select("module_slug,lesson_slug,completed")
    .eq("user_id", userId)
    .eq("completed", true);

  if (moduleSlugs && moduleSlugs.length > 0) {
    query = query.in("module_slug", moduleSlugs);
  }

  const { data: rows, error } = await query;

  if (error || !Array.isArray(rows)) {
    return {};
  }

  return rows.reduce<LessonProgressState>((acc, row) => {
    if (row && typeof row === "object" && row.module_slug && row.lesson_slug) {
      acc[`${String(row.module_slug)}::${String(row.lesson_slug)}`] = true;
    }

    return acc;
  }, {});
}

export async function markLessonCompletionForCurrentUser({
  moduleSlug,
  lessonSlug,
  completed
}: {
  moduleSlug: string;
  lessonSlug: string;
  completed: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return { ok: false, error: "not_authenticated" };
  }

  if (completed) {
    const { error } = await supabase.from("lesson_progress").upsert({
      user_id: userId,
      module_slug: moduleSlug,
      lesson_slug: lessonSlug,
      completed: true,
      completed_at: new Date().toISOString()
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  const { error } = await supabase
    .from("lesson_progress")
    .delete()
    .eq("user_id", userId)
    .eq("module_slug", moduleSlug)
    .eq("lesson_slug", lessonSlug);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function syncLessonProgressForCurrentUser(progress: LessonProgressState): Promise<{
  ok: boolean;
  error?: string;
  synced?: number;
}> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return { ok: false, error: "not_authenticated" };
  }

  const rows = Object.entries(progress)
    .filter(([, completed]) => completed === true)
    .map(([lessonKey]) => {
      const [module_slug, lesson_slug] = lessonKey.split("::");
      return { user_id: userId, module_slug, lesson_slug, completed: true, completed_at: new Date().toISOString() };
    })
    .filter((row) => row.module_slug && row.lesson_slug);

  if (rows.length === 0) {
    return { ok: true, synced: 0 };
  }

  const { error } = await supabase.from("lesson_progress").upsert(rows, {
    onConflict: "user_id,module_slug,lesson_slug"
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, synced: rows.length };
}

export async function getLatestQuizAttemptForCurrentUser({
  moduleSlug,
  lessonSlug
}: {
  moduleSlug: string;
  lessonSlug: string;
}) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return null;
  }

  const { data: rows, error } = await supabase
    .from("quiz_attempts")
    .select("id,score,total_questions,matched_count,passed,answers,feedback,created_at")
    .eq("user_id", userId)
    .eq("module_slug", moduleSlug)
    .eq("lesson_slug", lessonSlug)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const row = rows[0] as {
    id: number;
    score: number | null;
    total_questions: number | null;
    matched_count: number | null;
    passed: boolean | null;
    answers: unknown;
    feedback: unknown;
    created_at?: string | null;
  };

  const answers =
    typeof row.answers === "object" && row.answers !== null
      ? (Object.entries(row.answers).reduce<QuizAnswer>((acc, [questionId, answer]) => {
          if (typeof questionId === "string" && typeof answer === "string") {
            acc[questionId] = answer;
          }

          return acc;
        }, {}) as QuizAnswer)
      : {};

  return {
    id: row.id,
    score: row.score ?? 0,
    totalQuestions: row.total_questions ?? 0,
    matchedCount: row.matched_count ?? 0,
    passed: Boolean(row.passed),
    answers,
    feedback: row.feedback as unknown,
    createdAt: row.created_at ?? null
  };
}

export async function submitQuizAttemptForCurrentUser({
  moduleSlug,
  lessonSlug,
  questions,
  answers
}: {
  moduleSlug: string;
  lessonSlug: string;
  questions: QuizQuestion[];
  answers: QuizAnswer;
}): Promise<
  ({ ok: true } & QuizAttemptFeedbackPayload) | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return { ok: false, error: "not_authenticated" };
  }

  const { results: feedback, score, totalQuestions, matchedKeywordCount, passed } = gradeQuizSubmission(
    questions,
    answers
  );

  const { error: attemptError } = await supabase.from("quiz_attempts").insert({
    user_id: userId,
    module_slug: moduleSlug,
    lesson_slug: lessonSlug,
    answers,
    score,
    total_questions: totalQuestions,
    matched_count: matchedKeywordCount,
    passed,
    feedback
  });

  if (attemptError) {
    return { ok: false, error: attemptError.message };
  }

  if (passed) {
    await markLessonCompletionForCurrentUser({
      moduleSlug,
      lessonSlug,
      completed: true
    });
  }

  return {
    ok: true,
    score,
    totalQuestions,
    matchedKeywordCount,
    passed,
    feedback
  };
}
