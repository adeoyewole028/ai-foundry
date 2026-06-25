import fs from "node:fs/promises";
import path from "node:path";

const contentDirectory = path.join(process.cwd(), "content");

export type LessonType = "lesson" | "quiz" | "project";

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
};

export type ModuleMeta = {
  title: string;
  slug: string;
  order: number;
  description: string;
  level: string;
  estimatedHours: number;
  outcomes: string[];
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

const lessonTypes = ["lesson", "quiz", "project"] as const;

function isLessonType(value: string): value is LessonType {
  return lessonTypes.includes(value as LessonType);
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid content: ${label} must be a non-empty string.`);
  }

  return value;
}

function assertNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid content: ${label} must be a number.`);
  }

  return value;
}

function parseLesson(value: unknown, moduleSlug: string): LessonMeta {
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
    quizQuestions: parseQuizQuestions(value.quizQuestions, `${moduleSlug}.lesson.quizQuestions`)
  };
}

function parseQuizQuestions(value: unknown, label: string): QuizQuestion[] {
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

function parseRubric(value: unknown, label: string): QuizRubric[] {
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

function parseQuizOptions(value: unknown, label: string): QuizOption[] {
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

function parseStringArray(
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

function parseModule(value: unknown, folderName: string): ModuleMeta {
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
    lessons: lessons.map((lesson) => parseLesson(lesson, slug)).sort((a, b) => a.order - b.order)
  };
}

async function readModuleFromFolder(folderName: string): Promise<ModuleMeta> {
  const modulePath = path.join(contentDirectory, folderName, "module.json");
  const file = await fs.readFile(modulePath, "utf8");

  return parseModule(JSON.parse(file), folderName);
}

export async function getModules(): Promise<ModuleMeta[]> {
  const entries = await fs.readdir(contentDirectory, { withFileTypes: true });
  const modules = await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map((entry) => readModuleFromFolder(entry.name))
  );

  return modules.sort((a, b) => a.order - b.order);
}

export async function getModule(moduleSlug: string): Promise<ModuleMeta | null> {
  const modules = await getModules();

  return modules.find((module) => module.slug === moduleSlug) ?? null;
}

export async function getLesson(
  moduleSlug: string,
  lessonSlug: string
): Promise<Lesson | null> {
  const module = await getModule(moduleSlug);

  if (!module) {
    return null;
  }

  const lesson = module.lessons.find((item) => item.slug === lessonSlug);

  if (!lesson) {
    return null;
  }

  const moduleFolder = `${String(module.order).padStart(2, "0")}-${module.slug}`;
  const source = await fs.readFile(path.join(contentDirectory, moduleFolder, lesson.file), "utf8");

  return {
    ...lesson,
    module,
    source
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
