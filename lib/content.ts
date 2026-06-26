export type LessonType = "lesson" | "quiz" | "project";

export type CuratedResourceType =
  | "course"
  | "video"
  | "playlist"
  | "article"
  | "book"
  | "github"
  | "documentation"
  | "project-library"
  | "paper"
  | "guide";

const curatedResourceTypes = [
  "course",
  "video",
  "playlist",
  "article",
  "book",
  "github",
  "documentation",
  "project-library",
  "paper",
  "guide"
] as const satisfies readonly CuratedResourceType[];

export function isCuratedResourceType(value: unknown): value is CuratedResourceType {
  return typeof value === "string" && curatedResourceTypes.includes(value as CuratedResourceType);
}

export type CuratedResource = {
  title: string;
  provider: string;
  url: string;
  type: CuratedResourceType;
  level: string;
  placement: string;
  why: string;
  required: boolean;
  whenToUse?: string;
  notes?: string;
  checkedAt?: string;
};

export type LessonMeta = {
  title: string;
  slug: string;
  file: string;
  order: number;
  type: LessonType;
  description: string;
  estimatedMinutes: number;
  quizMode?: "multiple-choice" | "short-answer";
  checklist: string[];
  questions: string[];
  quizQuestions: QuizQuestion[];
  mentorNote?: string;
  curatedResources?: CuratedResource[];
};

export type BossBattleMeta = {
  title: string;
  slug: string;
  description: string;
  xpReward?: number;
  required?: boolean;
};

export type ModuleStory = {
  role: string;
  setting: string;
  mission: string;
  mentorNote: string;
};

export type BossBattleSelection = {
  lesson: LessonMeta;
  source: "metadata" | "legacy-slug" | "fallback";
  meta?: BossBattleMeta;
};

export type ModuleMeta = {
  title: string;
  slug: string;
  order: number;
  description: string;
  level: string;
  estimatedHours: number;
  outcomes: string[];
  curatedResources?: CuratedResource[];
  bossBattle?: BossBattleMeta;
  mentorNote?: string;
  story?: ModuleStory;
  lessons: LessonMeta[];
};

export type Lesson = LessonMeta & {
  module: ModuleMeta;
  source: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  correctAnswer: string;
  keywords: string[];
  options: QuizOption[];
  correctOptionId: string | null;
  rubric?: QuizRubric[];
  passingScore?: number | null;
};

export type QuizOption = {
  id: string;
  label: string;
  explanation: string;
};

export type QuizRubric = {
  id: string;
  label: string;
  required: boolean;
  terms: string[];
  minMatch?: number;
};

export const lessonTypes = ["lesson", "quiz", "project"] as const;

export function isLessonType(value: string): value is LessonType {
  return lessonTypes.includes(value as LessonType);
}

export function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid content: ${label} must be a non-empty string.`);
  }

  return value;
}

export function assertNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid content: ${label} must be a number.`);
  }

  return value;
}

export function parseLesson(value: unknown, moduleSlug: string): LessonMeta {
  if (!isStringRecord(value)) {
    throw new Error(`Invalid content: ${moduleSlug} contains a malformed lesson.`);
  }

  const type = assertString(value.type, `${moduleSlug}.lesson.type`);

  if (!isLessonType(type)) {
    throw new Error(`Invalid content: ${moduleSlug}.lesson.type is unsupported.`);
  }

  return {
    title: assertString(value.title, `${moduleSlug}.lesson.title`),
    slug: assertString(value.slug, `${moduleSlug}.lesson.slug`),
    file: assertString(value.file, `${moduleSlug}.lesson.file`),
    order: assertNumber(value.order, `${moduleSlug}.lesson.order`),
    type,
    description: assertString(value.description, `${moduleSlug}.lesson.description`),
    estimatedMinutes: assertNumber(
      value.estimatedMinutes,
      `${moduleSlug}.lesson.estimatedMinutes`
    ),
    quizMode:
      value.quizMode === "short-answer" || value.quizMode === "multiple-choice"
        ? value.quizMode
        : undefined,
    checklist: parseStringArray(value.checklist, `${moduleSlug}.lesson.checklist`),
    questions: parseStringArray(value.questions, `${moduleSlug}.lesson.questions`),
    quizQuestions: parseQuizQuestions(value.quizQuestions, `${moduleSlug}.lesson.quizQuestions`),
    mentorNote:
      typeof value.mentorNote === "string" && value.mentorNote.trim().length > 0
        ? value.mentorNote.trim()
        : undefined,
    curatedResources: parseCuratedResources(value.curatedResources, `${moduleSlug}.lesson.curatedResources`)
  };
}

export function parseModuleStory(value: unknown, label: string): ModuleStory | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isStringRecord(value)) {
    throw new Error(`Invalid content: ${label} must be an object.`);
  }

  const role = assertString(value.role, `${label}.role`);
  const setting = assertString(value.setting, `${label}.setting`);
  const mission = assertString(value.mission, `${label}.mission`);
  const mentorNote =
    typeof value.mentorNote === "string" && value.mentorNote.trim().length > 0
      ? value.mentorNote.trim()
      : undefined;

  if (mentorNote === undefined || mentorNote.length === 0) {
    throw new Error(`Invalid content: ${label}.mentorNote must be a non-empty string.`);
  }

  return {
    role,
    setting,
    mission,
    mentorNote
  };
}

export function parseCuratedResources(value: unknown, label: string): CuratedResource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const resources: CuratedResource[] = [];

  value.forEach((item, index) => {
    if (!isStringRecord(item)) {
      throw new Error(`Invalid content: ${label}[${index}] must be an object.`);
    }

    const title = assertString(item.title, `${label}[${index}].title`);
    const provider = assertString(item.provider, `${label}[${index}].provider`);
    const url = assertString(item.url, `${label}[${index}].url`);
    const placement = assertString(item.placement, `${label}[${index}].placement`);
    const why = assertString(item.why, `${label}[${index}].why`);
    const level = assertString(item.level, `${label}[${index}].level`);
    const rawType = assertString(item.type, `${label}[${index}].type`);

    if (!isCuratedResourceType(rawType)) {
      throw new Error(`Invalid content: ${label}[${index}].type must be one of ${curatedResourceTypes.join(", ")}.`);
    }

    resources.push({
      title,
      provider,
      url,
      type: rawType,
      level,
      placement,
      why,
      required: item.required === true,
      whenToUse:
        typeof item.whenToUse === "string" && item.whenToUse.trim().length > 0
          ? item.whenToUse.trim()
          : undefined,
      notes:
        typeof item.notes === "string" && item.notes.trim().length > 0
          ? item.notes.trim()
          : undefined,
      checkedAt:
        typeof item.checkedAt === "string" && item.checkedAt.trim().length > 0
          ? item.checkedAt.trim()
          : undefined
    });
  });

  return resources;
}

export function parseQuizQuestions(value: unknown, label: string): QuizQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    if (!isStringRecord(item)) {
      throw new Error(`Invalid content: ${label}[${index}] must be an object.`);
    }

    const options = parseQuizOptions(item.options, `${label}[${index}].options`);
    const rubric = parseRubric(item.rubric, `${label}[${index}].rubric`);
    const correctOptionId =
      typeof item.correctOptionId === "string" && item.correctOptionId.trim().length > 0
        ? item.correctOptionId.trim()
        : options.find((option) => option.id === "correct")?.id ?? null;
    const passingScore =
      typeof item.passingScore === "number" && Number.isFinite(item.passingScore)
        ? Math.max(1, Math.floor(item.passingScore))
        : null;

    return {
      id: assertString(item.id, `${label}[${index}].id`),
      prompt: assertString(item.prompt, `${label}[${index}].prompt`),
      correctAnswer: assertString(item.correctAnswer, `${label}[${index}].correctAnswer`),
      keywords: parseStringArray(item.keywords, `${label}[${index}].keywords`),
      options,
      correctOptionId,
      rubric,
      passingScore
    };
  });
}

export function parseRubric(value: unknown, label: string): QuizRubric[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map<QuizRubric | null>((item, index) => {
      if (!isStringRecord(item)) {
        return null;
      }

      const rawTerms = parseStringArray(item.terms, `${label}[${index}].terms`);

      if (rawTerms.length === 0) {
        return null;
      }

      const id = assertString(item.id, `${label}[${index}].id`);
      const labelText = assertString(item.label, `${label}[${index}].label`);
      const rawRequired = typeof item.required === "boolean" ? item.required : false;
      const minMatch = typeof item.minMatch === "number" && Number.isFinite(item.minMatch)
        ? Math.max(1, Math.floor(item.minMatch))
        : undefined;

      return {
        id,
        label: labelText,
        required: rawRequired,
        terms: rawTerms,
        minMatch
      } satisfies QuizRubric;
    })
    .filter((item): item is QuizRubric => item !== null);
}

export function parseQuizOptions(value: unknown, label: string): QuizOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    if (!isStringRecord(item)) {
      throw new Error(`Invalid content: ${label}[${index}] must be an object.`);
    }

    return {
      id: assertString(item.id, `${label}[${index}].id`),
      label: assertString(item.label, `${label}[${index}].label`),
      explanation:
        typeof item.explanation === "string" && item.explanation.trim().length > 0
          ? item.explanation.trim()
          : ""
    };
  });
}

export function parseBossBattle(value: unknown, label: string): BossBattleMeta | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isStringRecord(value)) {
    throw new Error(`Invalid content: ${label} must be an object.`);
  }

  const slug = assertString(value.slug, `${label}.slug`);
  const title = assertString(value.title, `${label}.title`);
  const description = assertString(value.description, `${label}.description`);
  const xpReward =
    typeof value.xpReward === "number" && Number.isFinite(value.xpReward)
      ? Math.max(0, Math.floor(value.xpReward))
      : undefined;
  const required = value.required === true;

  return {
    title,
    slug,
    description,
    ...(xpReward === undefined ? undefined : { xpReward }),
    ...(required ? { required } : {})
  };
}

export function isBossBattleLesson(lesson: LessonMeta): boolean {
  return lesson.type === "project" && lesson.slug.toLowerCase().includes("boss-battle");
}

export function getBossBattleForModule(module: ModuleMeta): BossBattleSelection | null {
  if (module.bossBattle) {
    const configuredLesson = module.lessons.find((lesson) => lesson.slug === module.bossBattle!.slug);

    if (configuredLesson) {
      return {
        lesson: configuredLesson,
        source: "metadata",
        meta: module.bossBattle
      };
    }

    if (module.bossBattle.required) {
      return null;
    }
  }

  const legacyBossBattleLesson = module.lessons.find((lesson) => isBossBattleLesson(lesson));

  if (legacyBossBattleLesson) {
    return { lesson: legacyBossBattleLesson, source: "legacy-slug" };
  }

  const projects = module.lessons.filter((lesson) => lesson.type === "project");
  if (projects.length === 0) {
    return null;
  }

  const fallback = [...projects].sort((a, b) => b.order - a.order)[0];
  return fallback ? { lesson: fallback, source: "fallback" } : null;
}

export function parseStringArray(
  value: unknown,
  label: string
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

export function parseModule(value: unknown, folderName: string): ModuleMeta {
  if (!isStringRecord(value)) {
    throw new Error(`Invalid content: ${folderName}/module.json is malformed.`);
  }

  const slug = assertString(value.slug, `${folderName}.slug`);
  const lessons = value.lessons;
  const outcomes = value.outcomes;

  if (!Array.isArray(lessons)) {
    throw new Error(`Invalid content: ${slug}.lessons must be an array.`);
  }

  if (!Array.isArray(outcomes) || outcomes.some((item) => typeof item !== "string")) {
    throw new Error(`Invalid content: ${slug}.outcomes must be a string array.`);
  }

  return {
    title: assertString(value.title, `${folderName}.title`),
    slug,
    order: assertNumber(value.order, `${folderName}.order`),
    description: assertString(value.description, `${folderName}.description`),
    level: assertString(value.level, `${folderName}.level`),
    estimatedHours: assertNumber(value.estimatedHours, `${folderName}.estimatedHours`),
    outcomes,
    curatedResources: parseCuratedResources(value.curatedResources, `${folderName}.curatedResources`),
    bossBattle: parseBossBattle(value.bossBattle, `${folderName}.bossBattle`),
    mentorNote:
      typeof value.mentorNote === "string" && value.mentorNote.trim().length > 0
        ? value.mentorNote.trim()
        : undefined,
    story: parseModuleStory(value.story, `${folderName}.story`),
    lessons: lessons.map((lesson) => parseLesson(lesson, slug)).sort((a, b) => a.order - b.order)
  };
}

export function getAdjacentLessons(module: ModuleMeta, lessonSlug: string) {
  const currentIndex = module.lessons.findIndex((lesson) => lesson.slug === lessonSlug);

  return {
    previousLesson: currentIndex > 0 ? module.lessons[currentIndex - 1] : null,
    nextLesson:
      currentIndex >= 0 && currentIndex < module.lessons.length - 1
        ? module.lessons[currentIndex + 1]
        : null
  };
}
