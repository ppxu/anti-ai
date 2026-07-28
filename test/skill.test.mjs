import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(testDir, "..");
const skillPath = path.join(projectDir, "skills", "anti-ai", "SKILL.md");
const packagePath = path.join(projectDir, "package.json");

test("skills installer can discover a complete anti-ai agent workflow", async () => {
  const skill = await readFile(skillPath, "utf8");
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/);

  assert.ok(frontmatter, "SKILL.md must start with YAML frontmatter");
  assert.match(frontmatter[1], /^name: anti-ai$/m);
  assert.match(frontmatter[1], /^description: .+$/m);
  assert.match(skill, /anti-ai today --json/);
  assert.match(skill, /anti-ai (today|week|month)/);
  assert.match(skill, /anti-ai share/);
  assert.match(skill, /anti-ai share --card pathology/);
  assert.match(skill, /anti-ai creature/);
  assert.match(skill, /anti-ai creature reset/);
  assert.match(skill, /deterministic|确定性/i);
  assert.match(skill, /Pollution.*Clarity.*three-day/s);
  assert.match(skill, /Offense.*Sobriety.*Paradox/s);
  assert.match(skill, /living casebook/i);
  assert.match(skill, /monthly autopsy/i);
  assert.match(skill, /35 deterministic combinations/i);
  assert.match(skill, /schema v4/);
  assert.match(skill, /future codex/);
  assert.match(skill, /~\/\.anti-ai\/creature\.json/);
  assert.match(
    skill,
    /low-confidence estimate derived from public examples|参考公开案例的低置信度估算/i,
  );
  assert.match(skill, /do not read raw logs|不要读取原始日志/i);
  assert.match(
    skill,
    /npx skills add ppxu\/anti-ai --skill anti-ai/,
  );
});

test("published npm package includes runtime modules and the installable skill", async () => {
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

  assert.ok(packageJson.files.includes("src"));
  assert.ok(packageJson.files.includes("skills"));
});
