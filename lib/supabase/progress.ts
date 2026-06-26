import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { LessonProgressState } from "@/lib/lesson-progress-core.js";
import { getModuleLessonProgress } from "@/lib/lesson-progress-core.js";
import type { QuizQuestion } from "@/lib/content";
import { gradeQuizSubmission, type QuizMode } from "@/lib/quiz-grading";
import { getModules } from "@/lib/content.server";
import {
  buildEntityId,
  type UserGamificationStats,
  XP_REWARDS,
  getLevelProgress,
  type XpEntityType,
  type XpRewardEvent
} from "@/lib/gamification";

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

type AwardXpParams = {
  eventType: XpRewardEvent;
  entityType: XpEntityType;
  entityId: string;
  xpAmount?: number;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type StreakProjection = {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
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

async function getCurrentUserXpEventTotal(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data: eventRows, error } = await supabase
    .from("xp_events")
    .select("xp_amount")
    .eq("user_id", userId);

  if (error || !Array.isArray(eventRows)) {
    return 0;
  }

  return eventRows.reduce((sum, row) => {
    const xpAmount = typeof row?.xp_amount === "number" ? row.xp_amount : 0;

    return sum + Math.max(0, xpAmount);
  }, 0);
}

function toDayUtc(value: string): number {
  const [year, month, day] = value.split("-").map(Number);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return NaN;
  }

  return Date.UTC(year, month - 1, day);
}

function isDateConsecutive(previous: string, next: string): boolean {
  return toDayUtc(next) - toDayUtc(previous) === 86_400_000;
}

async function getCurrentUserStreakStatsFromXpEvents(supabase: SupabaseClient, userId: string): Promise<StreakProjection> {
  const { data: rows, error } = await supabase
    .from("xp_events")
    .select("entity_id")
    .eq("user_id", userId)
    .eq("event_type", "STREAK_DAY");

  if (error || !Array.isArray(rows)) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null
    };
  }

  const dateSet = new Set<string>();

  for (const row of rows) {
    if (typeof row?.entity_id !== "string") {
      continue;
    }

    const value = row.entity_id.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toDayUtc(value))) {
      dateSet.add(value);
    }
  }

  const streakDays = Array.from(dateSet).sort();

  if (streakDays.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null
    };
  }

  let longestStreak = 1;
  let currentRun = 1;

  for (let index = 1; index < streakDays.length; index += 1) {
    if (isDateConsecutive(streakDays[index - 1], streakDays[index])) {
      currentRun += 1;
      longestStreak = Math.max(longestStreak, currentRun);
    } else {
      currentRun = 1;
    }
  }

  let currentStreak = 1;
  for (let index = streakDays.length - 1; index > 0; index -= 1) {
    if (isDateConsecutive(streakDays[index - 1], streakDays[index])) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  return {
    currentStreak,
    longestStreak,
    lastActivityDate: streakDays[streakDays.length - 1]
  };
}

async function upsertUserStatsFromComputedData(
  supabase: SupabaseClient,
  userId: string,
  totalXp: number,
  streakProjection: StreakProjection
) {
  const levelProgress = getLevelProgress(totalXp);

  try {
    await supabase.from("user_stats").upsert(
      {
        user_id: userId,
        total_xp: totalXp,
        current_level: levelProgress.currentLevel.level,
        current_streak: streakProjection.currentStreak,
        longest_streak: streakProjection.longestStreak,
        last_activity_date: streakProjection.lastActivityDate
      },
      {
        onConflict: "user_id"
      }
    );
  } catch {
    return;
  }
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

export async function awardModuleCompletionIfReadyForCurrentUser(moduleSlug: string) {
  const modules = await getModules();
  const module = modules.find((candidate) => candidate.slug === moduleSlug);

  if (!module) {
    return;
  }

  const progress = await getCurrentUserLessonProgress([moduleSlug]);
  const moduleProgress = getModuleLessonProgress(module, progress);

  if (moduleProgress.total > 0 && moduleProgress.percent === 100) {
    await awardXpForCurrentUser({
      eventType: "MODULE_COMPLETE",
      entityType: "module",
      entityId: moduleSlug
    });
  }
}

export async function getCurrentUserGamificationStats(): Promise<UserGamificationStats | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return null;
  }

  const { data: row, error } = await supabase
    .from("user_stats")
    .select("total_xp,current_level,current_streak,longest_streak,last_activity_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  if (row) {
    return {
      totalXp: typeof row.total_xp === "number" ? row.total_xp : 0,
      currentLevel: typeof row.current_level === "number" ? row.current_level : 1,
      currentStreak: typeof row.current_streak === "number" ? row.current_streak : 0,
      longestStreak: typeof row.longest_streak === "number" ? row.longest_streak : 0,
      lastActivityDate: typeof row.last_activity_date === "string" ? row.last_activity_date : null
    };
  }

  const totalXp = await getCurrentUserXpEventTotal(supabase, userId);
  const { currentStreak, longestStreak, lastActivityDate } = await getCurrentUserStreakStatsFromXpEvents(
    supabase,
    userId
  );
  const levelProgress = getLevelProgress(totalXp);

  void upsertUserStatsFromComputedData(supabase, userId, totalXp, {
    currentStreak,
    longestStreak,
    lastActivityDate
  });

  return {
    totalXp,
    currentLevel: levelProgress.currentLevel.level,
    currentStreak,
    longestStreak,
    lastActivityDate
  };
}

async function computeCurrentUserUnlockedAchievementIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const modules = await getModules();
  const foundationModule = modules.find((module) => {
    const slug = module.slug.toLowerCase();
    const title = module.title.toLowerCase();
    return slug.includes("foundation") || title.includes("foundation");
  });

  const [
    lessonProgressResult,
    quizAttemptResult,
    submissionResult,
    statsResult,
    foundationProgressResult
  ] = await Promise.all([
    supabase
      .from("lesson_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", true),
    supabase
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("passed", true),
    supabase
      .from("project_submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("user_stats")
      .select("total_xp, current_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle(),
    foundationModule
      ? supabase
          .from("lesson_progress")
          .select("lesson_slug")
          .eq("user_id", userId)
          .eq("module_slug", foundationModule.slug)
          .eq("completed", true)
      : Promise.resolve({ data: [], error: null } as const),
  ]);

  const completedLessons = Number(lessonProgressResult.count ?? 0);
  const passedQuizzes = Number(quizAttemptResult.count ?? 0);
  const projectSubmissions = Number(submissionResult.count ?? 0);
  const stats = statsResult.data
    ? {
        totalXp: typeof statsResult.data.total_xp === "number" ? statsResult.data.total_xp : 0,
        streak:
          Math.max(
            Number(statsResult.data.current_streak ?? 0),
            Number(statsResult.data.longest_streak ?? 0)
          ) || 0
      }
    : { totalXp: 0, streak: 0 };

  const foundationLessonSlugs =
    foundationModule?.lessons.map((lesson) => lesson.slug).filter((slug) => slug && slug.length > 0) ?? [];
  const completedFoundationLessons = new Set(
    foundationProgressResult.data
      ?.map((row) => (typeof row?.lesson_slug === "string" ? row.lesson_slug : null))
      .filter((slug): slug is string => slug !== null) ?? []
  );
  const isFoundationFinisher =
    foundationLessonSlugs.length > 0 && foundationLessonSlugs.every((slug) => completedFoundationLessons.has(slug));
  const hasBossBattleWin = await hasCompletedAnyBossBattleForCurrentUser(supabase, userId);

  const unlocked: string[] = [];

  if (completedLessons > 0) {
    unlocked.push("first_quest");
  }
  if (isFoundationFinisher) {
    unlocked.push("foundation_finisher");
  }
  if (passedQuizzes > 0) {
    unlocked.push("quiz_slayer");
  }
  if (projectSubmissions > 0) {
    unlocked.push("builder_1");
  }
  if (stats.streak >= 7) {
    unlocked.push("streak_7");
  }
  if (hasBossBattleWin) {
    unlocked.push("boss_slayer");
  }
  if (stats.totalXp >= 1000) {
    unlocked.push("xp_1000");
  }

  return unlocked;
}

async function hasCompletedAnyBossBattleForCurrentUser(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const directQuery = await supabase
    .from("boss_battle_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (!directQuery.error) {
    return Number(directQuery.count ?? 0) > 0;
  }

  if (directQuery.error && directQuery.error.code !== "42P01") {
    return false;
  }

  const fallbackQuery = await supabase
    .from("xp_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "BOSS_BATTLE_COMPLETE")
    .eq("entity_type", "boss_battle");

  return Number(fallbackQuery.count ?? 0) > 0;
}

async function syncCurrentUserAchievementUnlocks(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return;
  }

  const unlockedAchievementIds = await computeCurrentUserUnlockedAchievementIds(supabase, userId);

  if (unlockedAchievementIds.length === 0) {
    return;
  }

  const rows = unlockedAchievementIds.map((achievementId) => ({
    user_id: userId,
    achievement_id: achievementId
  }));

  try {
    const { error } = await supabase.from("user_achievements").upsert(rows, {
      onConflict: "user_id,achievement_id"
    });

    if (error) {
      return;
    }
  } catch {
    return;
  }
}

export async function syncCurrentUserAchievementUnlocksForCurrentUser(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return;
  }

  await syncCurrentUserAchievementUnlocks(supabase);
}

export async function getCurrentUserUnlockedAchievementIds(): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return [];
  }

  await syncCurrentUserAchievementUnlocks(supabase);

  const { data: rows, error } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });

  if (error) {
    return await computeCurrentUserUnlockedAchievementIds(supabase, userId);
  }

  return (rows ?? [])
    .map((row) => (typeof row?.achievement_id === "string" ? row.achievement_id : null))
    .filter((id): id is string => id !== null);
}

export async function getRecentUnlockedAchievementIds(limit = 3): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return [];
  }

  await syncCurrentUserAchievementUnlocks(supabase);

  const { data: rows, error } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false })
    .limit(limit);

  if (error) {
    return await computeCurrentUserUnlockedAchievementIds(supabase, userId);
  }

  return (rows ?? [])
    .map((row) => (typeof row?.achievement_id === "string" ? row.achievement_id : null))
    .filter((id): id is string => id !== null);
}

export async function hasCompletedBossBattleForCurrentUser(params: {
  moduleSlug: string;
  bossBattleSlug: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return false;
  }

  const hasProgressRecord = await (async () => {
    const { count, error } = await supabase
      .from("boss_battle_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("module_slug", params.moduleSlug)
      .eq("boss_battle_slug", params.bossBattleSlug);

    if (!error) {
      return Number(count ?? 0) > 0;
    }

    if (error.code !== "42P01") {
      return false;
    }

    return false;
  })();

  if (hasProgressRecord) {
    return true;
  }

  const entityId = buildEntityId(params.moduleSlug, params.bossBattleSlug);
  const { count, error } = await supabase
    .from("xp_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "BOSS_BATTLE_COMPLETE")
    .eq("entity_type", "boss_battle")
    .eq("entity_id", entityId);

  if (error) {
    return false;
  }

  return Number(count ?? 0) > 0;
}

export async function markBossBattleCompletionForCurrentUser({
  moduleSlug,
  bossBattleSlug,
  response
}: {
  moduleSlug: string;
  bossBattleSlug: string;
  response?: string;
}): Promise<{ ok: boolean; awarded?: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return { ok: false, error: "not_authenticated" };
  }

  const alreadyCompletedResult = await supabase
    .from("boss_battle_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("module_slug", moduleSlug)
    .eq("boss_battle_slug", bossBattleSlug);

  if (alreadyCompletedResult.error) {
    if (alreadyCompletedResult.error.code === "42P01") {
      return { ok: true, awarded: false };
    }

    return { ok: false, error: alreadyCompletedResult.error.message };
  }

  const { error } = await supabase.from("boss_battle_progress").upsert({
    user_id: userId,
    module_slug: moduleSlug,
    boss_battle_slug: bossBattleSlug,
    response: response && response.trim().length > 0 ? response.trim() : null,
    completed_at: new Date().toISOString()
  });

  if (error) {
    if (error.code === "42P01") {
      return { ok: true, awarded: false };
    }

    return { ok: false, error: error.message };
  }

  return { ok: true, awarded: Number(alreadyCompletedResult.count ?? 0) === 0 };
}

export async function awardXpForCurrentUser({
  eventType,
  entityType,
  entityId,
  xpAmount = XP_REWARDS[eventType]
}: AwardXpParams): Promise<{ ok: boolean; awarded?: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = getUserId(data?.claims);

  if (!userId) {
    return { ok: false, error: "not_authenticated" };
  }

  const { data: awarded, error } = await supabase.rpc("award_xp_event", {
    p_event_type: eventType,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_xp_amount: xpAmount
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, awarded: awarded === true };
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
  answers,
  quizMode
}: {
  moduleSlug: string;
  lessonSlug: string;
  questions: QuizQuestion[];
  answers: QuizAnswer;
  quizMode?: QuizMode;
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
    answers,
    quizMode
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

  return {
    ok: true,
    score,
    totalQuestions,
    matchedKeywordCount,
    passed,
    feedback
  };
}
