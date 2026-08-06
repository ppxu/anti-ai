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
  assert.match(skill, /anti-ai share --card specimen/);
  assert.match(skill, /anti-ai share --card wanted/);
  assert.match(skill, /anti-ai share --card fossil/);
  assert.match(skill, /anti-ai share --card encounter --with/);
  assert.match(skill, /anti-ai share --card prognosis/);
  assert.match(skill, /anti-ai share --card culture/);
  assert.match(skill, /anti-ai share --card companion/);
  assert.match(skill, /anti-ai share --card habitat/);
  assert.match(skill, /anti-ai share --card expedition/);
  assert.match(skill, /anti-ai lab --json/);
  assert.match(skill, /anti-ai lab incubate <1\|2\|3>/);
  assert.match(skill, /anti-ai lab shelf/);
  assert.match(skill, /anti-ai lab inspect <culture-id>/);
  assert.match(skill, /anti-ai lab bond <culture-id>/);
  assert.match(skill, /anti-ai lab companion/);
  assert.match(skill, /anti-ai codex --json/);
  assert.match(skill, /anti-ai creature/);
  assert.match(skill, /anti-ai creature habitat --json/);
  assert.match(skill, /anti-ai creature export/);
  assert.match(skill, /anti-ai creature history/);
  assert.match(skill, /anti-ai creature intervene <1\|2\|3>/);
  assert.match(skill, /anti-ai creature incident <1\|2\|3>/);
  assert.match(skill, /anti-ai creature prognosis/);
  assert.match(skill, /anti-ai encounter <pollution-code>/);
  assert.match(skill, /anti-ai expedition --json/);
  assert.match(skill, /anti-ai expedition start <destination>/);
  assert.match(skill, /anti-ai expedition next/);
  assert.match(skill, /anti-ai expedition choose <1\|2\|3>/);
  assert.match(skill, /anti-ai expedition abandon/);
  assert.match(skill, /anti-ai creature evolve <1\|2\|3>/);
  assert.match(skill, /anti-ai creature reset/);
  assert.match(skill, /deterministic|确定性/i);
  assert.match(skill, /Pollution.*Clarity.*three-day/s);
  assert.match(skill, /Offense.*Sobriety.*Paradox/s);
  assert.match(skill, /living casebook/i);
  assert.match(skill, /monthly follow-up/i);
  assert.match(skill, /143 deterministic combinations/i);
  assert.match(skill, /90 experience days.*permanent fossil/is);
  assert.match(skill, /POLLUTION.*CLARITY.*PARADOX.*choice/is);
  assert.match(skill, /benefit.*cost/is);
  assert.match(skill, /schema v14/);
  assert.match(skill, /PARASITIC HATCHLING.*SYMBIOTIC ABERRATION.*ACCOMPLICE ORGAN/is);
  assert.match(skill, /one imprint per observed day/i);
  assert.match(skill, /heavy.*restrained.*AI-free.*same rate/is);
  assert.match(skill, /materials.*not consumed/is);
  assert.match(skill, /does not.*growth|does not.*Token-powered/is);
  assert.match(skill, /never choose.*incubat/is);
  assert.match(
    skill,
    /turning-point case.*POLLUTION.*CLARITY.*PARADOX/is,
  );
  assert.match(skill, /no precise probabilities/i);
  assert.match(skill, /1–255.*MALIGNANT I/is);
  assert.match(skill, /134 fixed collection entries/i);
  assert.match(skill, /24 fixed artifacts.*12 fixed Expedition achievements/is);
  assert.match(skill, /opportunities do not stack/i);
  assert.match(skill, /Do not start, advance, choose, or abandon.*explicitly request/is);
  assert.match(skill, /one deterministic event.*seven experience days/is);
  assert.match(skill, /locked.*\?\?\?/is);
  assert.match(skill, /foreign specimens|外来标本/i);
  assert.match(skill, /today.*week.*month.*collection discoveries/is);
  assert.match(skill, /~\/\.anti-ai\/creature\.json/);
  assert.match(
    skill,
    /named public high-side references|具名公开高位参考/i,
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
  assert.ok(packageJson.files.includes("docs"));
});
