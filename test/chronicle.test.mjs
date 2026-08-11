import {
  assert,
  mkdtempSync,
  path,
  readFileSync,
  rmSync,
  test,
  tmpdir,
  runCli,
  shiftTestDate,
  writeCodexUsage,
} from "./helpers.mjs";

import { deriveTuiSnapshot } from "../src/application/tui.mjs";
import { deriveCollectionSets } from "../src/collection-sets.mjs";
import { deriveMutationChronicle } from "../src/chronicle.mjs";

function chronicleFixture(t) {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-chronicle-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  const codex = path.join(workspace, "codex");
  const startDate = "2026-01-01";
  const endDate = shiftTestDate(startDate, 90);
  const usage = {
    input_tokens: 4_000,
    cached_input_tokens: 1_000,
    output_tokens: 500,
    total_tokens: 4_500,
  };
  writeCodexUsage(codex, [usage], startDate);
  writeCodexUsage(codex, [usage], endDate);
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: codex,
    ANTI_AI_CREATURE_SEED: "chronicle-contract-seed",
  };
  const hatched = runCli(["creature", "--date", startDate, "--json"], env);
  assert.equal(hatched.status, 0, hatched.stderr);
  const settled = runCli(["creature", "--date", endDate, "--json"], env);
  assert.equal(settled.status, 0, settled.stderr);
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  return { endDate, env, state, statePath };
}

test("the mutation chronicle derives 7/30/90-day change windows and a generation comparison without private usage fields", (t) => {
  const { endDate, state } = chronicleFixture(t);
  const original = JSON.stringify(state);
  const chronicle = deriveMutationChronicle(state, endDate);

  assert.equal(chronicle.version, 1);
  assert.equal(chronicle.date, endDate);
  assert.deepEqual(chronicle.periods.map(({ days }) => days), [7, 30, 90]);
  assert.ok(chronicle.periods.every(({ endDate: periodEnd }) => periodEnd === endDate));
  assert.equal(chronicle.comparison.current.generation, 2);
  assert.equal(chronicle.comparison.baseline.kind, "fossil");
  assert.equal(chronicle.comparison.baseline.generation, 1);
  assert.ok(chronicle.identity.specimenId.length > 0);
  assert.ok(chronicle.identity.art.length >= 8);
  assert.equal(chronicle.collectionSets.total, 6);
  assert.deepEqual(chronicle.collectionSets.routes, {
    pollution: 2,
    clarity: 2,
    paradox: 2,
  });
  assert.equal(JSON.stringify(state), original);
  assert.doesNotMatch(
    JSON.stringify(chronicle),
    /total_tokens|totalTokens|pollutionDose|model|source|session\.jsonl|\/Users\//,
  );
});

test("collection-set progress is route-balanced, derived from existing discoveries, and grants presentation only", () => {
  const codex = {
    sections: {
      forms: [{ id: "polluted-form", discovered: true, ecologyId: "polluted", pathologyId: "nuclear" }],
      achievements: [{ id: "offense", discovered: true, category: "offense" }],
      habitatPhenomena: [{ id: "pollution-event", discovered: true, routeId: "pollution" }],
      expeditionArtifacts: [{ id: "reactor", discovered: true, destinationId: "reactor_graveyard" }],
      chromaticAbilities: [],
      scars: [],
      specimens: [],
      foreignSpecimens: [],
      caseSlices: [],
      incidentReports: [],
      cultures: [],
      companions: [],
      fossils: [],
      expeditionAchievements: [],
    },
  };
  const sets = deriveCollectionSets(codex);

  assert.equal(sets.length, 6);
  assert.deepEqual(
    Object.fromEntries(
      ["pollution", "clarity", "paradox"].map((route) => [
        route,
        sets.filter((entry) => entry.routeId === route).length,
      ]),
    ),
    { pollution: 2, clarity: 2, paradox: 2 },
  );
  assert.equal(sets.find(({ id }) => id === "set_licensed_overfeed").completed, true);
  assert.ok(sets.every((entry) => entry.presentationOnly));
  assert.ok(sets.every((entry) => !("reward" in entry) && !("power" in entry)));
});

test("creature chronicle is a bilingual read-only CLI view and Codex JSON exposes six set trials", (t) => {
  const { endDate, env, statePath } = chronicleFixture(t);
  const before = readFileSync(statePath, "utf8");
  const machine = runCli(["creature", "chronicle", "--date", endDate, "--json"], env);
  const chinese = runCli(["creature", "chronicle", "--date", endDate], env);
  const english = runCli(["creature", "chronicle", "--date", endDate, "--lang", "en"], env);
  const codex = runCli(["codex", "--date", endDate, "--json"], env);

  for (const result of [machine, chinese, english, codex]) {
    assert.equal(result.status, 0, result.stderr);
  }
  assert.equal(readFileSync(statePath, "utf8"), before);
  assert.deepEqual(JSON.parse(machine.stdout).periods.map(({ days }) => days), [7, 30, 90]);
  assert.equal(JSON.parse(codex.stdout).collectionSets.length, 6);
  assert.match(chinese.stdout, /异变年鉴/);
  assert.match(chinese.stdout, /7 天 · 30 天 · 90 天/);
  assert.match(chinese.stdout, /世代对照/);
  assert.match(chinese.stdout, /收藏套组/);
  assert.match(english.stdout, /MUTATION CHRONICLE/);
  assert.match(english.stdout, /7 DAYS · 30 DAYS · 90 DAYS/);
  assert.match(english.stdout, /GENERATION COMPARISON/);
  assert.doesNotMatch(
    `${machine.stdout}${chinese.stdout}${english.stdout}`,
    /4,500 tokens|mutation-test|Codex|session\.jsonl|\/Users\//,
  );
});

test("dossier share cards summarize the chronicle without exposing exact usage", (t) => {
  const { endDate, env } = chronicleFixture(t);
  const chinese = runCli(["share", "--card", "dossier", "--date", endDate], env);
  const english = runCli(["share", "--card", "dossier", "--date", endDate, "--lang", "en"], env);

  for (const result of [chinese, english]) {
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^<svg\b/);
    assert.match(result.stdout, /30/);
    assert.doesNotMatch(
      result.stdout,
      /4,500 tokens|mutation-test|Codex|session\.jsonl|\/Users\//,
    );
  }
  assert.match(chinese.stdout, /异变体标本档案/);
  assert.match(chinese.stdout, /隐私模式/);
  assert.match(english.stdout, /MUTATION DOSSIER/);
  assert.match(english.stdout, /PRIVACY MODE/);
});

test("the TUI keeps five top-level areas while surfacing the chronicle and set trials", (t) => {
  const { endDate, state } = chronicleFixture(t);
  const snapshot = deriveTuiSnapshot(state, endDate, "zh");

  assert.deepEqual(snapshot.navigation.map(({ id }) => id), [
    "overview",
    "habitat",
    "expedition",
    "laboratory",
    "codex",
  ]);
  assert.equal(snapshot.overview.chronicle.periods.length, 3);
  assert.match(snapshot.overview.chronicle.diagnosis, /。$/);
  const sets = snapshot.codex.categories.find(({ id }) => id === "collectionSets");
  assert.equal(sets.entries.length, 6);
  assert.ok(sets.entries.every((entry) => entry.canDisplay === false));
});
