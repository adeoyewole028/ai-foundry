export const XP_REWARDS = {
  LESSON_COMPLETE: 20,
  EXERCISE_COMPLETE: 50,
  QUIZ_COMPLETE: 75,
  PERFECT_QUIZ: 125,
  PROJECT_SUBMITTED: 200,
  MODULE_COMPLETE: 500,
  BOSS_BATTLE_COMPLETE: 750,
  STREAK_DAY: 25
} as const;

export type XpRewardEvent = keyof typeof XP_REWARDS;

export type XpEntityType = "lesson" | "quiz" | "project" | "module" | "boss_battle" | "streak";

export type LevelDefinition = {
  level: number;
  minXp: number;
  title: string;
};

export const LEVELS = [
  { level: 1, minXp: 0, title: "AI Apprentice" },
  { level: 2, minXp: 200, title: "Python Initiate" },
  { level: 3, minXp: 500, title: "Data Explorer" },
  { level: 4, minXp: 1000, title: "ML Beginner" },
  { level: 5, minXp: 1800, title: "Model Builder" },
  { level: 6, minXp: 2800, title: "Deep Learning Trainee" },
  { level: 7, minXp: 4200, title: "LLM Practitioner" },
  { level: 8, minXp: 6000, title: "RAG Builder" },
  { level: 9, minXp: 8500, title: "Agent Engineer" },
  { level: 10, minXp: 12000, title: "AI Systems Engineer" },
  { level: 15, minXp: 20000, title: "Senior AI Engineer" },
  { level: 20, minXp: 35000, title: "AI Architect" }
] as const satisfies readonly LevelDefinition[];

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  icon?: "sparkles" | "check" | "award" | "flame" | "code" | "trophy";
};

export const BADGES = [
  {
    id: "first_quest",
    title: "First Quest",
    description: "Complete your first lesson.",
    icon: "sparkles"
  },
  {
    id: "foundation_finisher",
    title: "Foundation Finisher",
    description: "Complete AI Foundations.",
    icon: "check"
  },
  {
    id: "quiz_slayer",
    title: "Quiz Slayer",
    description: "Complete your first quiz.",
    icon: "award"
  },
  {
    id: "builder_1",
    title: "First Build Mission",
    description: "Submit your first project.",
    icon: "code"
  },
  {
    id: "boss_slayer",
    title: "Boss Slayer",
    description: "Complete your first boss battle.",
    icon: "trophy"
  },
  {
    id: "streak_7",
    title: "7-Day Flame",
    description: "Maintain a 7-day learning streak.",
    icon: "flame"
  },
  {
    id: "xp_1000",
    title: "1K XP",
    description: "Earn 1,000 total XP.",
    icon: "award"
  }
] as const satisfies readonly AchievementDefinition[];

export type LevelProgress = {
  currentLevel: LevelDefinition;
  nextLevel: LevelDefinition | null;
  totalXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpRemaining: number;
  progressPercent: number;
};

export type UserGamificationStats = {
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
};

export function getLevelProgress(totalXp: number): LevelProgress {
  const normalizedXp = Math.max(0, Math.floor(totalXp));
  const currentLevel = [...LEVELS].reverse().find((level) => normalizedXp >= level.minXp) ?? LEVELS[0];
  const nextLevel = LEVELS.find((level) => level.minXp > normalizedXp) ?? null;
  const xpForNextLevel = nextLevel ? nextLevel.minXp - currentLevel.minXp : 0;
  const xpIntoLevel = normalizedXp - currentLevel.minXp;
  const xpRemaining = nextLevel ? Math.max(0, nextLevel.minXp - normalizedXp) : 0;
  const progressPercent = nextLevel
    ? Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))
    : 100;

  return {
    currentLevel,
    nextLevel,
    totalXp: normalizedXp,
    xpIntoLevel,
    xpForNextLevel,
    xpRemaining,
    progressPercent
  };
}

export function formatXp(xp: number): string {
  return `${new Intl.NumberFormat("en-US").format(xp)} XP`;
}

export function buildEntityId(moduleSlug: string, entitySlug?: string): string {
  return entitySlug ? `${moduleSlug}::${entitySlug}` : moduleSlug;
}
