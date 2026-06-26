import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import type { Lesson, ModuleMeta } from "@/lib/content";
import { parseModule } from "@/lib/content";

const contentDirectory = path.join(process.cwd(), "content");
const completionChecklistHeadingPattern = /^##\s+Completion Checklist\s*$/im;

function removeStaticCompletionChecklist(source: string): string {
  const match = completionChecklistHeadingPattern.exec(source);

  if (!match || match.index === undefined) {
    return source;
  }

  const nextHeadingIndex = source.slice(match.index + match[0].length).search(/^##\s+/m);

  if (nextHeadingIndex === -1) {
    return source.slice(0, match.index).trimEnd();
  }

  const sectionEnd = match.index + match[0].length + nextHeadingIndex;

  return `${source.slice(0, match.index).trimEnd()}\n\n${source.slice(sectionEnd).trimStart()}`;
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
  const source = removeStaticCompletionChecklist(
    await fs.readFile(path.join(contentDirectory, moduleFolder, lesson.file), "utf8")
  );

  return {
    ...lesson,
    module,
    source
  };
}
