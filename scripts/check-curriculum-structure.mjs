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
const MIN_SHORT_ANSWER_KEYWORDS = 2;
const REQUIRED_SECTION_PLAIN_TEXT_HEADINGS = [
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
  "## Further Reading"
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSectionText(source, heading) {
  const escaped = escapeRegExp(heading);
  const regex = new RegExp(`${escaped}[\\s\\S]*?(?=\\n## |$)`);
  const match = source.match(regex);

  if (!match) {
    return "";
  }

  return match[0].replace(heading, "").trim();
}

function isEmptySectionText(text) {
  return text.replace(/\s+/g, "").length === 0;
}

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

function isShortAnswerQuestion(question) {
  const hasOptions = Array.isArray(question.options) && question.options.length > 0;
  return question.quizMode === "short-answer" || !hasOptions;
}

function isQuestionModeCompatible(question, hasOptions) {
  if (question.quizMode === "short-answer") {
    return !hasOptions;
  }

  if (question.quizMode === "multiple-choice") {
    return hasOptions;
  }

  return true;
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

      for (const heading of REQUIRED_SECTION_PLAIN_TEXT_HEADINGS) {
        const sectionText = getSectionText(source, heading);
        assert.ok(
          !isEmptySectionText(sectionText),
          `${slug}/${lesson.file} section ${heading} should contain content`
        );
      }

      const checklistSectionText = getSectionText(source, "## Completion Checklist");
      assert.ok(
        /\[[\sxX]\]/.test(checklistSectionText),
        `${slug}/${lesson.file} completion checklist should use checkbox items (for example '- [ ] ...')`
      );

      if (lesson.type === "quiz") {
        const questions = Array.isArray(lesson.quizQuestions) ? lesson.quizQuestions : [];

        assert.ok(questions.length > 0, `${slug}/${lesson.file} quiz should include quiz questions`);

        for (const question of questions) {
          const hasOptions = Array.isArray(question.options) && question.options.length > 0;
          const shortAnswerMode = isShortAnswerQuestion(question);

          assert.ok(
            isQuestionModeCompatible(question, hasOptions),
            `${slug}/${lesson.file} question ${question.id || "unknown"} has quizMode/mode mismatch`
          );

          if (shortAnswerMode) {
            const rubric = Array.isArray(question.rubric) ? question.rubric : [];
            const keywords = Array.isArray(question.keywords) ? question.keywords : [];

            assert.ok(
              rubric.length > 0 || keywords.length >= MIN_SHORT_ANSWER_KEYWORDS,
              `${slug}/${lesson.file} question ${question.id || "unknown"} should include rubric or at least ${MIN_SHORT_ANSWER_KEYWORDS} keywords`
            );
          } else {
            assert.ok(
              typeof question.correctOptionId === "string" && question.correctOptionId.length > 0,
              `${slug}/${lesson.file} question ${question.id || "unknown"} missing correctOptionId`
            );
            assert.ok(
              question.options.length >= 2,
              `${slug}/${lesson.file} question ${question.id || "unknown"} needs at least 2 options`
            );
          }

          assert.ok(
            typeof question.correctAnswer === "string" && question.correctAnswer.trim().length > 0,
            `${slug}/${lesson.file} question ${question.id || "unknown"} missing correctAnswer`
          );
        }
      }
    }
  }
});
