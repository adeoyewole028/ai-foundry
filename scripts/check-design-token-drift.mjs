import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

const TARGET_DIRS = ["app", "components", "content"];
const INCLUDED_EXT = new Set([".tsx", ".ts", ".jsx", ".js", ".css", ".mdx", ".md"]);

const DISALLOWED_COLOR_REGEX = /(?<![a-zA-Z0-9_-])(#[0-9A-Fa-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab)\s*\([^)]*\))/g;
const DISALLOWED_FONT_FAMILY_REGEX = /\b(?:font-family|fontFamily)\s*:\s*[^;`"']*["'`](?!var\(--).+?["'`]/g;
const DISALLOWED_TW_COLOR_CLASS_REGEX = /\b(?:bg|text|border|ring|from|to|via|decoration|fill|stroke|outline)-(?:black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{1,3}\b/g;

function toLineColumn(text, index) {
  const lines = text.slice(0, index).split("\n");
  const line = lines.length;
  const column = lines.at(-1).length + 1;
  return { line, column };
}

function findDisallowed(text) {
  const issues = [];

  const allMatches = [];
  for (const regex of [DISALLOWED_COLOR_REGEX, DISALLOWED_FONT_FAMILY_REGEX, DISALLOWED_TW_COLOR_CLASS_REGEX]) {
    const matcher = new RegExp(regex);
    let match;
    while ((match = matcher.exec(text)) !== null) {
      allMatches.push({
        index: match.index,
        value: match[0]
      });
    }
  }

  const lines = text.split("\n");

  for (const item of allMatches) {
    const { line, column } = toLineColumn(text, item.index);
    issues.push({
      line,
      column,
      match: item.value,
      lineText: lines[line - 1]?.trim()
    });
  }

  return issues;
}

async function walkDir(dir, out = []) {
  const absolutePath = path.join(ROOT, dir);

  const entries = await fs.readdir(absolutePath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(absolutePath, entry.name);
    if (entry.isDirectory()) {
      await walkDir(path.relative(ROOT, fullPath), out);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name);
    if (INCLUDED_EXT.has(ext)) {
      out.push(fullPath);
    }
  }

  return out;
}

async function main() {
  const files = (
    await Promise.all(TARGET_DIRS.map((dir) => walkDir(dir)))
  ).flat();

  const findings = [];

  for (const file of files) {
    const text = await fs.readFile(file, "utf8");
    const relative = path.relative(ROOT, file);
    const issues = findDisallowed(text);

    for (const issue of issues) {
      findings.push({
        file: relative,
        line: issue.line,
        column: issue.column,
        match: issue.match,
        lineText: issue.lineText
      });
    }
  }

  if (findings.length > 0) {
    console.error("Design drift detected: hardcoded color/font values found in app/components/content.");
    for (const issue of findings) {
      console.error(`- ${issue.file}:${issue.line}:${issue.column}`);
      console.error(`  match: ${issue.match}`);
      console.error(`  line:  ${issue.lineText}`);
    }

    process.exitCode = 1;
    return;
  }

  console.info("✅ Design token drift check passed.");
}

main().catch((error) => {
  console.error("Design token drift check failed.");
  console.error(error?.message ?? error);
  process.exit(1);
});
