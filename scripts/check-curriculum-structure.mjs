import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const contentRoot = path.join(process.cwd(), "content");
const requiredLessonHeadings = [
  "## Objective",
  "## Prerequisites",
  "## Plain-English Explanation",
  "## Key Terms",
  "## Mental Model",
  "## Example",
  "## Code Walkthrough",
  "## Common Mistakes",
  "## Exercise",
  "## Reflection",
  "## Further Reading",
  "## Completion Checklist"
];
const requiredModuleDocs = ["overview.mdx", "exercises.mdx", "README.md"];

function listModules() {
  return fs
    .readdirSync(contentRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(contentRoot, entry.name));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readModuleContent(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function getLessonFilePath(moduleDir, lesson) {
  return path.join(moduleDir, lesson.file);
}

function hasReferenceLinks(source) {
  return (
    /\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(source) ||
    /\[[^\]]+\]\(mailto:[^)]+\)/.test(source) ||
    /\[[^\]]+\]\(\/\/[^)]+\)/.test(source)
  );
}

function withName(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function moduleFolders() {
  return listModules()
    .map((moduleDir) => {
      const moduleJson = path.join(moduleDir, "module.json");

      return {
        slug: path.basename(moduleDir),
        moduleDir,
        moduleJson
      };
    })
    .filter(({ moduleJson }) => fs.existsSync(moduleJson));
}

for (const { slug, moduleDir, moduleJson } of moduleFolders()) {
  test(`module folder includes required docs: ${slug}`, () => {
    for (const doc of requiredModuleDocs) {
      const filePath = path.join(moduleDir, doc);
      assert.ok(fs.existsSync(filePath), `${slug}/${doc} is required`);
    }
  });

  test(`module JSON parses and includes required lesson docs: ${slug}`, () => {
    const module = readJson(moduleJson);
    assert.ok(withName(module.title), `${slug}: module.title is required`);
    assert.ok(Array.isArray(module.lessons), `${slug}: module.lessons must be an array`);
    assert.ok(module.lessons.length >= 1, `${slug}: module.lessons should not be empty`);

    const lessonCount = module.lessons.filter((lesson) => lesson?.type === "lesson").length;
    const quizCount = module.lessons.filter((lesson) => lesson?.type === "quiz").length;
    const projectCount = module.lessons.filter((lesson) => lesson?.type === "project").length;
    const miniProjectCount = module.lessons.filter(
      (lesson) =>
        lesson?.type === "project" &&
        typeof lesson?.title === "string" &&
        lesson.title.startsWith("Mini Project:")
    ).length;

    assert.ok(lessonCount >= 5 && lessonCount <= 12, `${slug}: lesson count should be 5–12`);
    assert.ok(quizCount >= 1, `${slug}: must include at least one quiz`);
    assert.ok(projectCount >= 2, `${slug}: must include mini-project and portfolio project`);
    assert.ok(miniProjectCount >= 1, `${slug}: must include a mini project`);
    assert.ok(
      quizCount > 0 && projectCount >= 2,
      `${slug}: check roadmap requirements (quiz + mini project + portfolio project)`
    );
  });
}

test("all module lesson markdown follows template and includes reference links", () => {
  const modules = moduleFolders();

  assert.ok(modules.length >= 1, "at least one module must exist");

  for (const { slug, moduleDir, moduleJson } of modules) {
    const module = readJson(moduleJson);

    for (const lesson of module.lessons || []) {
      const source = readModuleContent(getLessonFilePath(moduleDir, lesson));

      for (const heading of requiredLessonHeadings) {
        assert.ok(source.includes(heading), `${slug}/${lesson.file} missing ${heading}`);
      }

      assert.ok(
        hasReferenceLinks(source),
        `${slug}/${lesson.file} needs at least one reference link`
      );
    }
  }
});
