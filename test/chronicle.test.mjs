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
import {
  COLLECTION_SET_DEFINITIONS,
  collectionSetPhaseCopy,
  deriveCollectionSets,
} from "../src/collection-sets.mjs";
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
  assert.equal(chronicle.collectionSets.total, 12);
  assert.deepEqual(chronicle.collectionSets.routes, {
    pollution: 4,
    clarity: 4,
    paradox: 4,
  });
  assert.equal(JSON.stringify(state), original);
  assert.doesNotMatch(
    JSON.stringify(chronicle),
    /total_tokens|totalTokens|pollutionDose|model|source|session\.jsonl|\/Users\//,
  );
});

test("pathology constellations keep legacy sets while adding route-balanced hidden diagnoses", () => {
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

  assert.equal(sets.length, 12);
  assert.deepEqual(
    Object.fromEntries(
      ["pollution", "clarity", "paradox"].map((route) => [
        route,
        sets.filter((entry) => entry.routeId === route).length,
      ]),
    ),
    { pollution: 4, clarity: 4, paradox: 4 },
  );
  for (const routeId of ["pollution", "clarity", "paradox"]) {
    assert.deepEqual(
      Object.fromEntries(
        ["rare", "epic", "legendary"].map((rarity) => [
          rarity,
          sets.filter((entry) => entry.routeId === routeId && entry.rarity === rarity).length,
        ]),
      ),
      { rare: 1, epic: 2, legendary: 1 },
    );
  }
  assert.equal(sets.find(({ id }) => id === "set_licensed_overfeed").completed, true);
  const hidden = sets.find(({ routeId, rarity }) => routeId === "pollution" && rarity === "legendary");
  assert.equal(hidden.hidden, true);
  assert.equal(hidden.revealed, false);
  assert.equal(hidden.phase, "unknown");
  assert.ok(hidden.requirements.every((requirement) => requirement.concealed));
  assert.ok(sets.every((entry) => entry.presentationOnly));
  assert.ok(sets.every((entry) => !("reward" in entry) && !("power" in entry)));
});

test("a legendary diagnosis reveals after two route sets and completes from historical evidence", () => {
  const discovered = (id, discoveredAt, fields = {}) => ({
    id,
    discovered: true,
    discoveredAt,
    ...fields,
  });
  const codex = {
    sections: {
      forms: [
        discovered("polluted-nuclear", "2026-01-01", { ecologyId: "polluted", pathologyId: "nuclear" }),
        discovered("polluted-cache", "2026-01-02", { ecologyId: "polluted", pathologyId: "cache" }),
        discovered("polluted-frenzy", "2026-01-03", { ecologyId: "polluted", pathologyId: "frenzy" }),
      ],
      achievements: [
        discovered("cache_afterlife", "2026-01-04", { category: "offense" }),
        discovered("request_swarm", "2026-01-05", { category: "offense" }),
      ],
      habitatPhenomena: [
        discovered("reactor_leak", "2026-01-06", { routeId: "pollution" }),
      ],
      expeditionArtifacts: [
        discovered("reactor_graveyard_artifact_1", "2026-01-07", { destinationId: "reactor_graveyard" }),
        discovered("cache_swamp_artifact_1", "2026-01-08", { destinationId: "cache_swamp" }),
        discovered("request_nest_artifact_1", "2026-01-09", { destinationId: "request_nest" }),
      ],
      cultures: [
        discovered("cache-culture", "2026-01-10", { pathologyId: "cache", ecologyId: "polluted" }),
        discovered("frenzy-culture", "2026-01-11", { pathologyId: "frenzy", ecologyId: "polluted" }),
      ],
      scars: [discovered("carbonized_spine", "2026-01-12")],
      chromaticAbilities: [],
      specimens: [],
      foreignSpecimens: [],
      caseSlices: [],
      incidentReports: [],
      companions: [],
      fossils: [],
      expeditionAchievements: [],
    },
  };
  const sets = deriveCollectionSets(codex);
  const legendary = sets.find(({ routeId, rarity }) => routeId === "pollution" && rarity === "legendary");

  assert.equal(sets.filter(({ routeId, completed }) => routeId === "pollution" && completed).length, 4);
  assert.equal(legendary.revealed, true);
  assert.equal(legendary.completed, true);
  assert.equal(legendary.phase, "complete");
  assert.equal(legendary.discoveredAt, "2026-01-12");
  assert.ok(legendary.requirements.every((requirement) => !requirement.concealed));
});

test("all twelve constellations provide four distinct bilingual pathology phases", () => {
  for (const lang of ["zh", "en"]) {
    const lines = COLLECTION_SET_DEFINITIONS.flatMap(({ id }) =>
      ["unknown", "started", "near", "complete"].map((phase) =>
        collectionSetPhaseCopy(id, phase, lang)
      )
    );
    assert.equal(lines.length, 48);
    assert.equal(new Set(lines).size, 48);
    assert.ok(lines.every((line) => line.length > 8));
  }
});

test("creature chronicle is a bilingual read-only CLI view and Codex JSON exposes twelve set trials", (t) => {
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
  assert.equal(JSON.parse(codex.stdout).collectionSets.length, 12);
  assert.equal(JSON.parse(codex.stdout).collectionPhenotype.presentationOnly, true);
  assert.equal(JSON.parse(codex.stdout).capacity.collectionPhenotypes, 29);
  assert.match(chinese.stdout, /异变年鉴/);
  assert.match(chinese.stdout, /7 天 · 30 天 · 90 天/);
  assert.match(chinese.stdout, /世代对照/);
  assert.match(chinese.stdout, /病理星图/);
  assert.match(english.stdout, /MUTATION CHRONICLE/);
  assert.match(english.stdout, /7 DAYS · 30 DAYS · 90 DAYS/);
  assert.match(english.stdout, /GENERATION COMPARISON/);
  assert.doesNotMatch(
    `${machine.stdout}${chinese.stdout}${english.stdout}`,
    /4,500 tokens|mutation-test|Codex|session\.jsonl|\/Users\//,
  );
});

test("Codex focuses one constellation in both languages without revealing a sealed diagnosis", (t) => {
  const { endDate, env } = chronicleFixture(t);
  const chinese = runCli([
    "codex",
    "--date",
    endDate,
    "--set",
    "set_licensed_overfeed",
  ], env);
  const english = runCli([
    "codex",
    "--date",
    endDate,
    "--set",
    "set_authorized_collapse",
    "--lang",
    "en",
  ], env);
  const machine = runCli([
    "codex",
    "--date",
    endDate,
    "--set",
    "set_licensed_overfeed",
    "--json",
  ], env);
  const invalid = runCli(["codex", "--set", "set_missing"], env);
  const help = runCli(["codex", "--help", "--lang", "en"], env);

  assert.equal(chinese.status, 0, chinese.stderr);
  assert.match(chinese.stdout, /病理星图/);
  assert.match(chinese.stdout, /持证暴食/);
  assert.match(chinese.stdout, /证据节点/);
  assert.match(chinese.stdout, /暴食/);
  assert.equal(english.status, 0, english.stderr);
  assert.match(english.stdout, /LEGENDARY COMPOUND/);
  assert.doesNotMatch(english.stdout, /AUTHORIZED COLLAPSE/);
  assert.equal(machine.status, 0, machine.stderr);
  assert.equal(
    JSON.parse(machine.stdout).focusedCollectionSet.id,
    "set_licensed_overfeed",
  );
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /未知病理套组/);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--set <set-id>/);
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
  assert.equal(sets.entries.length, 12);
  assert.ok(sets.entries.every((entry) => entry.canDisplay === false));
  assert.equal(snapshot.overview.collectionPhenotype.presentationOnly, true);
  assert.deepEqual(
    snapshot.overview.art,
    snapshot.habitat.specimen.art,
  );
});
