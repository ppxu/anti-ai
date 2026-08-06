import {
  assert,
  Database,
  mkdirSync,
  mkdtempSync,
  path,
  readFileSync,
  rmSync,
  spawnSync,
  test,
  tmpdir,
  writeFileSync,
  baselineCodexDir,
  cliPath,
  fixtureDir,
  projectDir,
  testDir,
  creatureAppearanceContentStats,
  creatureAppearanceState,
  creatureArt,
  creatureClinicalNote,
  creatureEvent,
  deriveCreatureAppearance,
  everydayComparisonLines,
  framedFooter,
  runCli,
  shiftTestDate,
  terminalWidth,
  writeCodexUsage,
  writeHermesDb,
  writeHermesModelUsage,
  writeJsonl,
  writeOpenCodeDb,
  writeOpenCodeSessionMessageDb,
} from "./helpers.mjs";

import {
  CULTURE_COMPLICATION_IDS,
  CULTURE_SIDE_EFFECT_IDS,
  CULTURE_TYPE_IDS,
} from "../src/laboratory.mjs";
import { COMPANION_COPY } from "../src/companion.mjs";
import { HABITAT_COPY } from "../src/habitat.mjs";

test("v2.9 expands culture, companion, and habitat collection pools", () => {
  assert.equal(CULTURE_TYPE_IDS.length, 10);
  assert.equal(CULTURE_COMPLICATION_IDS.length, 10);
  assert.equal(CULTURE_SIDE_EFFECT_IDS.length, 10);
  assert.equal(Object.keys(COMPANION_COPY.anomalies).length, 27);
  assert.equal(Object.keys(HABITAT_COPY.relationships).length, 24);
  assert.equal(Object.keys(HABITAT_COPY.decorations).length, 24);
  assert.deepEqual(
    Object.values(HABITAT_COPY.duoTitles).map((titles) => titles.length),
    [12, 12, 12],
  );
});

test("lab offers one stable three-formula batch from local derived collections", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-lab-formulas-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 8,
      seed: "lab-formulas",
      days: {},
      foreignSpecimens: [
        {
          id: "visitor-001",
          collectedAt: "2026-07-01",
          typeId: "failed_symbiosis",
          weatherId: "cache_fog",
          local: { specimenId: "local001", formId: "extinguished_core" },
          visitor: {
            specimenId: "guest001",
            fingerprint: "guest001abcd",
            formId: "context_polyp",
          },
          hybrid: {
            specimenId: "hybrid01",
            fingerprint: "hybrid01abcd",
            formId: "context_polyp",
            stageIndex: 2,
            ecology: "paradox",
            pathology: "context",
            geneIds: {},
            achievementId: null,
            achievementCategory: null,
            rareAbilityId: null,
            scarId: null,
          },
        },
      ],
      generations: {
        fossils: [
          {
            id: "fossil01",
            generation: 1,
            sealedAt: "2026-07-10",
            ecologyId: "lucid",
            pathologyId: "cache",
            scarId: "clarity_seal",
          },
        ],
        evolutions: {},
      },
      casebook: {
        cases: [
          {
            id: "case-001",
            caseId: "autonomous_refill",
            offeredAt: "2026-07-15",
            selectedAt: "2026-07-16",
            selectedSlot: 3,
            status: "selected",
          },
        ],
        nextAtExperience: 28,
      },
    })}\n`,
  );
  const env = { HOME: home };

  const first = runCli(["lab", "--date", "2026-07-30", "--json"], env);
  const second = runCli(["lab", "--date", "2026-07-30", "--json"], env);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.stderr, "");
  assert.equal(second.status, 0, second.stderr);
  const report = JSON.parse(first.stdout);
  assert.deepEqual(JSON.parse(second.stdout), report);
  assert.deepEqual(report.inventory, {
    foreignSpecimens: 1,
    fossils: 1,
    caseSlices: 1,
    total: 3,
  });
  assert.equal(report.status, "ready");
  assert.equal(report.batch, 1);
  assert.equal(report.cultures, 0);
  assert.equal(report.proposals.length, 3);
  assert.deepEqual(
    [...new Set(report.proposals.map((proposal) => proposal.slot))],
    [1, 2, 3],
  );
  assert.ok(
    report.proposals.every(
      (proposal) =>
        /^[0-9a-f]{10}$/.test(proposal.id) &&
        proposal.ingredients.length >= 2 &&
        proposal.ingredients.every(({ type, id }) =>
          ["foreignSpecimen", "fossil", "caseSlice", "selfTissue"].includes(
            type,
          ) && typeof id === "string",
        ),
    ),
  );
  assert.deepEqual(
    [...new Set(report.proposals.flatMap((proposal) =>
      proposal.ingredients.map(({ type }) => type),
    ))].sort(),
    ["caseSlice", "foreignSpecimen", "fossil"],
  );
  assert.ok(
    report.proposals.some(
      (proposal) =>
        new Set(proposal.ingredients.map(({ type }) => type)).size === 3 &&
        ["epic", "mythic"].includes(proposal.rarity),
    ),
  );
  assert.doesNotMatch(
    first.stdout,
    /totalTokens|modelName|prompt|response|requestTimestamp|session\.jsonl/,
  );
});

test("lab renders bilingual readable formulas within an 80-column terminal", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-lab-human-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "lab-human",
      days: {},
      appearance: {
        version: 1,
        specimenId: "decafbad",
        genes: {},
        unlockedPartIds: [],
      },
      generations: {
        fossils: [
          {
            id: "fossil06",
            generation: 1,
            sealedAt: "2026-07-10",
            ecologyId: "lucid",
            pathologyId: "cache",
            scarId: "sterile_halo",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  const env = { HOME: home, COLUMNS: "80" };

  const zh = runCli(["lab", "--date", "2026-07-30"], env);
  const en = runCli(
    ["lab", "--date", "2026-07-30", "--lang", "en"],
    env,
  );
  const colored = runCli(["lab", "--date", "2026-07-30"], {
    ...env,
    FORCE_COLOR: "1",
    NO_COLOR: "",
  });

  assert.equal(zh.status, 0, zh.stderr);
  assert.equal(en.status, 0, en.stderr);
  assert.equal(colored.status, 0, colored.stderr);
  assert.match(zh.stdout, /污染实验室/);
  assert.match(zh.stdout, /方案 1/);
  assert.match(zh.stdout, /原料/);
  assert.match(zh.stdout, /副作用/);
  assert.match(zh.stdout, /anti-ai lab incubate 1/);
  assert.match(en.stdout, /POLLUTION LABORATORY/);
  assert.match(en.stdout, /FORMULA 1/);
  assert.match(en.stdout, /MATERIALS/);
  assert.match(en.stdout, /SIDE EFFECT/);
  assert.match(en.stdout, /anti-ai lab incubate 1/);
  assert.doesNotMatch(en.stdout, /[\p{Script=Han}]/u);
  assert.match(colored.stdout, /\u001b\[[0-9;]*m/);
  assert.equal(
    colored.stdout.replaceAll(/\u001b\[[0-9;]*m/g, ""),
    zh.stdout,
  );
  for (const output of [zh.stdout, en.stdout, colored.stdout]) {
    assert.ok(
      output
        .trimEnd()
        .split("\n")
        .every((line) => terminalWidth(line) <= 80),
      output,
    );
  }
});

test("lab incubate seals one culture without changing creature growth", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-lab-incubate-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  const initialState = {
    schemaVersion: 8,
    seed: "lab-incubate",
    days: {},
    appearance: {
      version: 1,
      specimenId: "feedbeef",
      genes: {},
      unlockedPartIds: [],
    },
    generations: {
      fossils: [
        {
          id: "fossil02",
          generation: 1,
          sealedAt: "2026-07-10",
          ecologyId: "polluted",
          pathologyId: "nuclear",
          scarId: "pollution_scar",
        },
      ],
      evolutions: {},
    },
    casebook: { cases: [], nextAtExperience: 14 },
    foreignSpecimens: [],
  };
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify(initialState)}\n`,
  );
  const env = { HOME: home };
  const before = runCli(["lab", "--date", "2026-07-30", "--json"], env);

  const selected = runCli(
    ["lab", "incubate", "2", "--date", "2026-07-30", "--json"],
    env,
  );

  assert.equal(before.status, 0, before.stderr);
  assert.equal(selected.status, 0, selected.stderr);
  const proposal = JSON.parse(before.stdout).proposals[1];
  const result = JSON.parse(selected.stdout);
  assert.equal(result.status, "incubated");
  assert.deepEqual(result.culture, {
    ...proposal,
    batch: 1,
    createdAt: "2026-07-30",
    appearance: {
      version: 1,
      fingerprint: result.culture.appearance.fingerprint,
      lines: result.culture.appearance.lines,
    },
  });
  assert.match(result.culture.appearance.fingerprint, /^[0-9a-f]{12}$/);
  assert.ok(result.culture.appearance.lines.length >= 5);
  assert.ok(
    result.culture.appearance.lines.every(
      (line) => typeof line === "string" && line.length <= 31,
    ),
  );

  const savedText = readFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    "utf8",
  );
  const saved = JSON.parse(savedText);
  assert.equal(saved.schemaVersion, 14);
  assert.equal(saved.laboratory.nextBatch, 2);
  assert.deepEqual(saved.laboratory.cultures, [result.culture]);
  assert.deepEqual(saved.days, initialState.days);
  assert.deepEqual(saved.generations, initialState.generations);
  assert.deepEqual(saved.casebook, initialState.casebook);
  assert.deepEqual(saved.foreignSpecimens, initialState.foreignSpecimens);
  assert.doesNotMatch(
    savedText,
    /totalTokens|inputTokens|outputTokens|modelName|prompt|response|requestTimestamp/,
  );

  const after = runCli(["lab", "--date", "2026-07-30", "--json"], env);
  assert.equal(after.status, 0, after.stderr);
  const next = JSON.parse(after.stdout);
  assert.equal(next.batch, 2);
  assert.equal(next.cultures, 1);
  assert.ok(
    next.proposals.every(
      (candidate) => candidate.id !== result.culture.id,
    ),
  );
});

test("lab bonds one sealed culture as the active companion", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-lab-bond-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "lab-bond",
      days: {},
      generations: {
        fossils: [
          {
            id: "fossil-bond",
            generation: 1,
            sealedAt: "2026-07-10",
            ecologyId: "paradox",
            pathologyId: "context",
            scarId: "split_shadow",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  const env = { HOME: home };
  const incubated = runCli(
    ["lab", "incubate", "1", "--date", "2026-07-29", "--json"],
    env,
  );
  assert.equal(incubated.status, 0, incubated.stderr);
  const culture = JSON.parse(incubated.stdout).culture;
  const cultureId = culture.id;

  const bonded = runCli(
    ["lab", "bond", cultureId, "--date", "2026-07-30", "--json"],
    env,
  );
  const companion = runCli(
    ["lab", "companion", "--date", "2026-07-30", "--json"],
    env,
  );
  const repeated = runCli(
    ["lab", "bond", cultureId, "--date", "2026-07-30", "--json"],
    env,
  );

  assert.equal(bonded.status, 0, bonded.stderr);
  assert.equal(companion.status, 0, companion.stderr);
  assert.equal(repeated.status, 0, repeated.stderr);
  const bondedView = JSON.parse(bonded.stdout);
  const companionView = JSON.parse(companion.stdout);
  assert.equal(bondedView.status, "bonded");
  assert.deepEqual(bondedView.companion, companionView.companion);
  assert.equal(companionView.date, "2026-07-30");
  assert.equal(companionView.status, "active");
  assert.equal(companionView.companion.cultureId, cultureId);
  assert.equal(companionView.companion.bondedAt, "2026-07-30");
  assert.equal(companionView.companion.stageId, "parasite");
  assert.equal(companionView.companion.nextStageAt, 7);
  assert.equal(companionView.companion.routeId, "paradox");
  assert.deepEqual(companionView.companion.imprintCounts, {
    pollution: 0,
    clarity: 1,
    neutral: 0,
    total: 1,
  });
  assert.equal(companionView.companion.todayImprint, "clarity");
  assert.deepEqual(companionView.companion.anomalyIds, []);
  assert.equal(companionView.companion.typeId, culture.typeId);
  assert.equal(companionView.companion.rarity, culture.rarity);
  assert.equal(companionView.companion.appearance.version, 2);
  assert.match(companionView.companion.appearance.fingerprint, /^[0-9a-f]{12}$/);
  assert.notEqual(
    companionView.companion.appearance.fingerprint,
    culture.appearance.fingerprint,
  );
  assert.deepEqual(JSON.parse(repeated.stdout), bondedView);
  assert.doesNotMatch(
    `${bonded.stdout}${companion.stdout}${repeated.stdout}`,
    /totalTokens|modelName|prompt|response|requestTimestamp|session\.jsonl/,
  );
});

test("a bonded companion gains one pollution imprint per observed day", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-companion-growth-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  const days = Object.fromEntries(
    Array.from({ length: 7 }, (_, index) => {
      const date = `2026-07-0${index + 1}`;
      return [
        date,
        {
          pollutionDose: 90,
          active: true,
          usageBand: "meltdown",
          ecologyGains: { pollution: 3, clarity: 0 },
          traits: { context: 1, cache: 1, frenzy: 1, nuclear: 3 },
          event: null,
        },
      ];
    }),
  );
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "companion-growth",
      days,
      generations: {
        fossils: [
          {
            id: "fossil-growth",
            generation: 1,
            sealedAt: "2026-06-20",
            ecologyId: "polluted",
            pathologyId: "nuclear",
            scarId: "carbonized_spine",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  const env = { HOME: home };
  const incubated = runCli(
    ["lab", "incubate", "1", "--date", "2026-06-30", "--json"],
    env,
  );
  assert.equal(incubated.status, 0, incubated.stderr);
  const culture = JSON.parse(incubated.stdout).culture;
  const cultureId = culture.id;
  const bonded = runCli(
    ["lab", "bond", cultureId, "--date", "2026-07-01", "--json"],
    env,
  );
  assert.equal(bonded.status, 0, bonded.stderr);

  const first = runCli(
    ["lab", "companion", "--date", "2026-07-07", "--json"],
    env,
  );
  const repeated = runCli(
    ["lab", "companion", "--date", "2026-07-07", "--json"],
    env,
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(repeated.status, 0, repeated.stderr);
  const view = JSON.parse(first.stdout);
  assert.deepEqual(JSON.parse(repeated.stdout), view);
  assert.equal(view.status, "active");
  assert.deepEqual(view.companion.imprintCounts, {
    pollution: 7,
    clarity: 0,
    neutral: 0,
    total: 7,
  });
  assert.equal(view.companion.stageId, "symbiote");
  assert.equal(view.companion.nextStageAt, 21);
  assert.equal(view.companion.routeId, "pollution");
});

test("lab companion settles an unseen day while share only previews the next imprint", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-companion-standalone-"));
  const codexDir = path.join(home, "codex");
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "companion-standalone",
      days: {
        "2026-07-22": {
          pollutionDose: 50,
          active: true,
          usageBand: "habitual",
          ecologyGains: { pollution: 1, clarity: 0 },
          traits: { context: 1, cache: 1, frenzy: 1, nuclear: 1 },
          event: null,
        },
      },
      generations: {
        fossils: [
          {
            id: "fossil-standalone",
            generation: 1,
            sealedAt: "2026-07-10",
            ecologyId: "polluted",
            pathologyId: "context",
            scarId: "carbonized_spine",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  writeCodexUsage(
    codexDir,
    [
      {
        input_tokens: 4_000,
        cached_input_tokens: 500,
        cache_write_input_tokens: 0,
        output_tokens: 800,
        reasoning_output_tokens: 100,
        total_tokens: 4_800,
      },
    ],
    "2026-07-23",
  );
  const env = { HOME: home, ANTI_AI_CODEX_DIR: codexDir };
  const incubated = runCli(
    ["lab", "incubate", "1", "--date", "2026-07-22", "--json"],
    env,
  );
  assert.equal(incubated.status, 0, incubated.stderr);
  const cultureId = JSON.parse(incubated.stdout).culture.id;
  const bonded = runCli(
    ["lab", "bond", cultureId, "--date", "2026-07-22", "--json"],
    env,
  );
  assert.equal(bonded.status, 0, bonded.stderr);
  assert.equal(JSON.parse(bonded.stdout).companion.imprintCounts.total, 1);

  const companion = runCli(
    ["lab", "companion", "--date", "2026-07-23", "--json"],
    env,
  );

  assert.equal(companion.status, 0, companion.stderr);
  const view = JSON.parse(companion.stdout).companion;
  assert.equal(view.imprintCounts.total, 2);
  assert.equal(view.todayImprint, "pollution");
  const saved = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  assert.ok(saved.days["2026-07-23"]);
  assert.equal(saved.laboratory.imprintAssignments["2026-07-23"], cultureId);

  writeCodexUsage(
    codexDir,
    [
      {
        input_tokens: 5_000,
        cached_input_tokens: 1_000,
        cache_write_input_tokens: 0,
        output_tokens: 900,
        reasoning_output_tokens: 100,
        total_tokens: 5_900,
      },
    ],
    "2026-07-24",
  );
  const card = runCli(
    [
      "share",
      "--card",
      "companion",
      "--date",
      "2026-07-24",
      "--lang",
      "en",
    ],
    env,
  );
  assert.equal(card.status, 0, card.stderr);
  assert.match(card.stdout, /pollution 2 · clarity 0 · neutral 1/);
  const afterCard = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  assert.equal(afterCard.days["2026-07-24"], undefined);
  assert.equal(
    afterCard.laboratory.imprintAssignments["2026-07-24"],
    undefined,
  );
});

test("pollution, clarity, and neutral days grow companions at the same rate", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-companion-routes-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  const dayRecord = (kind) =>
    kind === "pollution"
      ? {
          pollutionDose: 90,
          active: true,
          usageBand: "meltdown",
          ecologyGains: { pollution: 3, clarity: 0 },
          traits: { context: 1, cache: 1, frenzy: 1, nuclear: 3 },
          event: null,
        }
      : kind === "clarity"
        ? {
            pollutionDose: 0,
            active: false,
            usageBand: "sober",
            ecologyGains: { pollution: 0, clarity: 3 },
            traits: { context: 0, cache: 0, frenzy: 0, nuclear: 0 },
            event: null,
          }
        : {
            pollutionDose: 40,
            active: true,
            usageBand: "habitual",
            ecologyGains: { pollution: 0, clarity: 0 },
            traits: { context: 1, cache: 1, frenzy: 1, nuclear: 1 },
            event: null,
          };
  const days = Object.fromEntries(
    Array.from({ length: 21 }, (_, index) => {
      const date = `2026-07-${String(index + 1).padStart(2, "0")}`;
      const kind =
        index < 7 ? "pollution" : index < 14 ? "clarity" : "neutral";
      return [date, dayRecord(kind)];
    }),
  );
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "companion-routes",
      days,
      generations: {
        fossils: [
          {
            id: "fossil-routes",
            generation: 1,
            sealedAt: "2026-06-20",
            ecologyId: "paradox",
            pathologyId: "context",
            scarId: "split_shadow",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  const env = { HOME: home };
  const cultureIds = [];
  for (const slot of ["1", "2", "3"]) {
    const incubated = runCli(
      ["lab", "incubate", slot, "--date", "2026-06-30", "--json"],
      env,
    );
    assert.equal(incubated.status, 0, incubated.stderr);
    cultureIds.push(JSON.parse(incubated.stdout).culture.id);
  }

  assert.equal(
    runCli(
      ["lab", "bond", cultureIds[0], "--date", "2026-07-01", "--json"],
      env,
    ).status,
    0,
  );
  const pollution = runCli(
    ["lab", "companion", "--date", "2026-07-07", "--json"],
    env,
  );
  assert.equal(pollution.status, 0, pollution.stderr);

  assert.equal(
    runCli(
      ["lab", "bond", cultureIds[1], "--date", "2026-07-07", "--json"],
      env,
    ).status,
    0,
  );
  const clarity = runCli(
    ["lab", "companion", "--date", "2026-07-14", "--json"],
    env,
  );
  assert.equal(clarity.status, 0, clarity.stderr);

  assert.equal(
    runCli(
      ["lab", "bond", cultureIds[2], "--date", "2026-07-14", "--json"],
      env,
    ).status,
    0,
  );
  const paradox = runCli(
    ["lab", "companion", "--date", "2026-07-21", "--json"],
    env,
  );
  assert.equal(paradox.status, 0, paradox.stderr);

  const views = [pollution, clarity, paradox].map(({ stdout }) =>
    JSON.parse(stdout).companion
  );
  assert.deepEqual(
    views.map(({ cultureId, stageId, routeId, imprintCounts }) => ({
      cultureId,
      stageId,
      routeId,
      imprintCounts,
    })),
    [
      {
        cultureId: cultureIds[0],
        stageId: "symbiote",
        routeId: "pollution",
        imprintCounts: {
          pollution: 7,
          clarity: 0,
          neutral: 0,
          total: 7,
        },
      },
      {
        cultureId: cultureIds[1],
        stageId: "symbiote",
        routeId: "clarity",
        imprintCounts: {
          pollution: 0,
          clarity: 7,
          neutral: 0,
          total: 7,
        },
      },
      {
        cultureId: cultureIds[2],
        stageId: "symbiote",
        routeId: "paradox",
        imprintCounts: {
          pollution: 0,
          clarity: 0,
          neutral: 7,
          total: 7,
        },
      },
    ],
  );
  assert.equal(
    views.reduce((sum, view) => sum + view.imprintCounts.total, 0),
    21,
  );
});

test("companion stage milestones seal stable anomalies and evolve its ASCII", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-companion-stages-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  const days = Object.fromEntries(
    Array.from({ length: 21 }, (_, index) => [
      `2026-07-${String(index + 1).padStart(2, "0")}`,
      {
        pollutionDose: 85,
        active: true,
        usageBand: "binge",
        ecologyGains: { pollution: 2, clarity: 0 },
        traits: { context: 1, cache: 2, frenzy: 2, nuclear: 1 },
        event: null,
      },
    ]),
  );
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "companion-stages",
      days,
      generations: {
        fossils: [
          {
            id: "fossil-stages",
            generation: 1,
            sealedAt: "2026-06-20",
            ecologyId: "polluted",
            pathologyId: "cache",
            scarId: "carbonized_spine",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  const env = { HOME: home };
  const incubated = runCli(
    ["lab", "incubate", "2", "--date", "2026-06-30", "--json"],
    env,
  );
  assert.equal(incubated.status, 0, incubated.stderr);
  const culture = JSON.parse(incubated.stdout).culture;
  const bonded = runCli(
    ["lab", "bond", culture.id, "--date", "2026-07-01", "--json"],
    env,
  );
  assert.equal(bonded.status, 0, bonded.stderr);

  const daySeven = runCli(
    ["lab", "companion", "--date", "2026-07-07", "--json"],
    env,
  );
  const dayTwentyOne = runCli(
    ["lab", "companion", "--date", "2026-07-21", "--json"],
    env,
  );
  const repeated = runCli(
    ["lab", "companion", "--date", "2026-07-21", "--json"],
    env,
  );
  const historicalDaySeven = runCli(
    ["lab", "companion", "--date", "2026-07-07", "--json"],
    env,
  );

  assert.equal(daySeven.status, 0, daySeven.stderr);
  assert.equal(dayTwentyOne.status, 0, dayTwentyOne.stderr);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(historicalDaySeven.status, 0, historicalDaySeven.stderr);
  const growing = JSON.parse(daySeven.stdout).companion;
  const complete = JSON.parse(dayTwentyOne.stdout).companion;
  assert.equal(growing.stageId, "symbiote");
  assert.equal(growing.anomalyIds.length, 1);
  assert.equal(complete.stageId, "accomplice");
  assert.equal(complete.nextStageAt, null);
  assert.equal(complete.anomalyIds.length, 2);
  assert.equal(new Set(complete.anomalyIds).size, 2);
  assert.deepEqual(JSON.parse(repeated.stdout).companion, complete);
  assert.deepEqual(JSON.parse(historicalDaySeven.stdout).companion, growing);
  assert.notEqual(growing.appearance.fingerprint, culture.appearance.fingerprint);
  assert.notEqual(complete.appearance.fingerprint, growing.appearance.fingerprint);
  assert.equal(growing.appearance.version, 2);
  assert.equal(complete.appearance.version, 2);
  assert.ok(growing.appearance.lines.length >= 5);
  assert.ok(complete.appearance.lines.length >= 7);
  assert.ok(
    complete.appearance.lines.every(
      (line) => terminalWidth(line) <= 31,
    ),
  );
});

test("lab companion renders a bilingual colored file within 80 columns", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-companion-human-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  const days = Object.fromEntries(
    Array.from({ length: 7 }, (_, index) => [
      `2026-07-0${index + 1}`,
      {
        pollutionDose: 80,
        active: true,
        usageBand: "binge",
        ecologyGains: { pollution: 2, clarity: 0 },
        traits: { context: 1, cache: 2, frenzy: 1, nuclear: 2 },
        event: null,
      },
    ]),
  );
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "companion-human",
      days,
      generations: {
        fossils: [
          {
            id: "fossil-human",
            generation: 1,
            sealedAt: "2026-06-20",
            ecologyId: "polluted",
            pathologyId: "cache",
            scarId: "carbonized_spine",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  const env = { HOME: home, COLUMNS: "80" };
  const incubated = runCli(
    ["lab", "incubate", "1", "--date", "2026-06-30", "--json"],
    env,
  );
  assert.equal(incubated.status, 0, incubated.stderr);
  const cultureId = JSON.parse(incubated.stdout).culture.id;
  assert.equal(
    runCli(
      ["lab", "bond", cultureId, "--date", "2026-07-01", "--json"],
      env,
    ).status,
    0,
  );

  const zh = runCli(
    ["lab", "companion", "--date", "2026-07-07"],
    env,
  );
  const en = runCli(
    [
      "lab",
      "companion",
      "--date",
      "2026-07-07",
      "--lang",
      "en",
      "--full",
    ],
    env,
  );
  const colored = runCli(
    ["lab", "companion", "--date", "2026-07-07"],
    { ...env, FORCE_COLOR: "1", NO_COLOR: "" },
  );

  assert.equal(zh.status, 0, zh.stderr);
  assert.equal(en.status, 0, en.stderr);
  assert.equal(colored.status, 0, colored.stderr);
  assert.match(zh.stdout, /伴生异物 · #[0-9a-f]+/);
  assert.match(zh.stdout, /阶段\s+共生异形/);
  assert.match(zh.stdout, /路线\s+污染寄生/);
  assert.match(zh.stdout, /印记\s+污染 7 · 清醒 0 · 常态 0/);
  assert.match(zh.stdout, /异常\s+\[1\]/);
  assert.match(zh.stdout, /anti-ai lab companion --full/);
  assert.match(en.stdout, /SYMBIOTIC COMPANION/);
  assert.match(en.stdout, /STAGE\s+SYMBIOTIC ABERRATION/);
  assert.match(en.stdout, /ROUTE\s+POLLUTION PARASITE/);
  assert.match(en.stdout, /IMPRINTS\s+pollution 7 · clarity 0 · neutral 0/);
  assert.match(en.stdout, /APPEARANCE FINGERPRINT/);
  assert.doesNotMatch(en.stdout, /[\p{Script=Han}]/u);
  assert.match(colored.stdout, /\u001b\[[0-9;]*m/);
  assert.equal(
    colored.stdout.replaceAll(/\u001b\[[0-9;]*m/g, ""),
    zh.stdout,
  );
  for (const output of [zh.stdout, en.stdout, colored.stdout]) {
    assert.ok(
      output
        .trimEnd()
        .split("\n")
        .every((line) => terminalWidth(line) <= 80),
      output,
    );
  }
});

test("creature carries its companion without receiving numeric growth", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-companion-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  const days = Object.fromEntries(
    Array.from({ length: 7 }, (_, index) => [
      `2026-07-0${index + 1}`,
      {
        pollutionDose: 75,
        active: true,
        usageBand: "heavy",
        ecologyGains: { pollution: 1, clarity: 0 },
        traits: { context: 2, cache: 1, frenzy: 1, nuclear: 1 },
        event: null,
      },
    ]),
  );
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "creature-companion",
      days,
      generations: {
        fossils: [
          {
            id: "fossil-companion",
            generation: 1,
            sealedAt: "2026-06-20",
            ecologyId: "polluted",
            pathologyId: "context",
            scarId: "carbonized_spine",
            inheritanceAbilityId: "memory",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  const env = { HOME: home };
  const incubated = runCli(
    ["lab", "incubate", "3", "--date", "2026-06-30", "--json"],
    env,
  );
  assert.equal(incubated.status, 0, incubated.stderr);
  const cultureId = JSON.parse(incubated.stdout).culture.id;

  const beforeResult = runCli(
    ["creature", "--date", "2026-07-07", "--json"],
    env,
  );
  assert.equal(beforeResult.status, 0, beforeResult.stderr);
  assert.equal(
    runCli(
      ["lab", "bond", cultureId, "--date", "2026-07-01", "--json"],
      env,
    ).status,
    0,
  );
  const afterResult = runCli(
    ["creature", "--date", "2026-07-07", "--json"],
    env,
  );
  const wide = runCli(["creature", "--date", "2026-07-07"], {
    ...env,
    COLUMNS: "120",
  });
  const narrow = runCli(
    ["creature", "--date", "2026-07-07", "--lang", "en"],
    { ...env, COLUMNS: "80" },
  );

  assert.equal(afterResult.status, 0, afterResult.stderr);
  assert.equal(wide.status, 0, wide.stderr);
  assert.equal(narrow.status, 0, narrow.stderr);
  const before = JSON.parse(beforeResult.stdout);
  const after = JSON.parse(afterResult.stdout);
  assert.equal(before.companion, null);
  assert.equal(after.companion.cultureId, cultureId);
  assert.equal(after.companion.stageId, "symbiote");
  assert.deepEqual(
    {
      exposure: after.exposure,
      abilities: after.abilities,
      malignancyRanks: after.malignancyRanks,
      ecology: after.ecology,
      fingerprint: after.appearance.fingerprint,
    },
    {
      exposure: before.exposure,
      abilities: before.abilities,
      malignancyRanks: before.malignancyRanks,
      ecology: before.ecology,
      fingerprint: before.appearance.fingerprint,
    },
  );
  assert.match(wide.stdout, /│ .*伴生异物 · #[0-9a-f]+/);
  assert.match(wide.stdout, /污染寄生/);
  assert.match(narrow.stdout, /SYMBIOTIC COMPANION · #[0-9a-f]+/);
  assert.match(narrow.stdout, /POLLUTION PARASITE/);
  assert.doesNotMatch(narrow.stdout, /[\p{Script=Han}]/u);
  for (const [output, width] of [
    [wide.stdout, 120],
    [narrow.stdout, 80],
  ]) {
    assert.ok(
      output
        .trimEnd()
        .split("\n")
        .every((line) => terminalWidth(line) <= width),
      output,
    );
  }
});

test("today week and month report companion growth without raw usage", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-companion-periods-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  const days = Object.fromEntries(
    Array.from({ length: 7 }, (_, index) => [
      `2026-07-0${index + 1}`,
      {
        pollutionDose: 75,
        active: true,
        usageBand: "heavy",
        ecologyGains: { pollution: 1, clarity: 0 },
        traits: { context: 2, cache: 1, frenzy: 1, nuclear: 1 },
        event: null,
      },
    ]),
  );
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "companion-periods",
      days,
      generations: {
        fossils: [
          {
            id: "fossil-periods",
            generation: 1,
            sealedAt: "2026-06-20",
            ecologyId: "polluted",
            pathologyId: "context",
            scarId: "carbonized_spine",
            inheritanceAbilityId: "memory",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  const env = { HOME: home, COLUMNS: "100" };
  const incubated = runCli(
    ["lab", "incubate", "1", "--date", "2026-06-30", "--json"],
    env,
  );
  assert.equal(incubated.status, 0, incubated.stderr);
  const cultureId = JSON.parse(incubated.stdout).culture.id;
  assert.equal(
    runCli(
      ["lab", "bond", cultureId, "--date", "2026-07-01", "--json"],
      env,
    ).status,
    0,
  );
  const companionResult = runCli(
    ["lab", "companion", "--date", "2026-07-07", "--json"],
    env,
  );
  assert.equal(companionResult.status, 0, companionResult.stderr);
  const companion = JSON.parse(companionResult.stdout).companion;

  const today = runCli(["today", "--date", "2026-07-07"], env);
  const week = runCli(["week", "--date", "2026-07-07"], env);
  const month = runCli(
    ["month", "--date", "2026-07-07", "--lang", "en"],
    env,
  );

  assert.equal(today.status, 0, today.stderr);
  assert.equal(week.status, 0, week.stderr);
  assert.equal(month.status, 0, month.stderr);
  assert.match(today.stdout, /伴生观察\s+污染印记 · 共生异形/);
  assert.match(
    week.stdout,
    /伴生病程\s+7 个印记 · 培养物 → 共生异形 · 污染寄生/,
  );
  assert.match(
    month.stdout,
    /COMPANION COURSE\s+7 IMPRINTS · POLLUTION CULTURE → SYMBIOTIC ABERRATION · POLLUTION PARASITE/,
  );
  assert.doesNotMatch(month.stdout, /[\p{Script=Han}]/u);
  assert.doesNotMatch(
    `${today.stdout}${week.stdout}${month.stdout}`,
    /"totalTokens"|modelName|prompt|response|requestTimestamp|session\.jsonl/,
  );
});

test("codex records companion stages and anomalies outside the fixed denominator", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-companion-codex-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  const days = Object.fromEntries(
    Array.from({ length: 7 }, (_, index) => [
      `2026-07-0${index + 1}`,
      {
        pollutionDose: 75,
        active: true,
        usageBand: "heavy",
        ecologyGains: { pollution: 1, clarity: 0 },
        traits: { context: 2, cache: 1, frenzy: 1, nuclear: 1 },
        event: null,
      },
    ]),
  );
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "companion-codex",
      days,
      generations: {
        fossils: [
          {
            id: "fossil-companion-codex",
            generation: 1,
            sealedAt: "2026-06-20",
            ecologyId: "polluted",
            pathologyId: "context",
            scarId: "carbonized_spine",
            inheritanceAbilityId: "memory",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  const env = { HOME: home };
  const incubated = runCli(
    ["lab", "incubate", "1", "--date", "2026-06-30", "--json"],
    env,
  );
  assert.equal(incubated.status, 0, incubated.stderr);
  const culture = JSON.parse(incubated.stdout).culture;
  const cultureId = culture.id;
  assert.equal(
    runCli(
      ["lab", "bond", cultureId, "--date", "2026-07-01", "--json"],
      env,
    ).status,
    0,
  );
  const companionResult = runCli(
    ["lab", "companion", "--date", "2026-07-07", "--json"],
    env,
  );
  assert.equal(companionResult.status, 0, companionResult.stderr);
  const companion = JSON.parse(companionResult.stdout).companion;

  const first = runCli(["codex", "--date", "2026-07-07", "--json"], env);
  const second = runCli(["codex", "--date", "2026-07-07", "--json"], env);
  const human = runCli(["codex", "--date", "2026-07-07"], env);
  const bondDate = runCli(
    ["codex", "--date", "2026-07-01", "--json"],
    env,
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(human.status, 0, human.stderr);
  assert.equal(bondDate.status, 0, bondDate.stderr);
  const codex = JSON.parse(first.stdout);
  assert.deepEqual(JSON.parse(second.stdout), codex);
  assert.equal(codex.summary.fixed.total, 134);
  assert.deepEqual(codex.summary.companions, { discovered: 1 });
  assert.deepEqual(codex.sections.companions, [
    {
      id: cultureId,
      discoveredAt: "2026-07-01",
      stageId: "symbiote",
      routeId: "pollution",
      rarity: culture.rarity,
      anomalyIds: companion.anomalyIds,
      fingerprint: companion.appearance.fingerprint,
      provenance: {
        firstDiscoveredAt: "2026-07-01",
        sourceType: "companion_bond",
        sourceId: cultureId,
        relatedId: "pollution",
      },
    },
  ]);
  assert.equal(codex.sections.companions[0].anomalyIds.length, 1);
  assert.match(codex.sections.companions[0].fingerprint, /^[0-9a-f]{12}$/);
  assert.match(human.stdout, /伴生异物\s+\[1\]/);
  assert.match(human.stdout, /共生异形 · 污染寄生 · 异常 1/);
  const bondDateCodex = JSON.parse(bondDate.stdout);
  assert.equal(bondDateCodex.sections.companions[0].stageId, "parasite");
  assert.deepEqual(bondDateCodex.sections.companions[0].anomalyIds, []);
  assert.ok(
    bondDateCodex.recent.some(
      (entry) => entry.type === "companion" && entry.id === cultureId,
    ),
  );
  assert.doesNotMatch(
    `${first.stdout}${human.stdout}`,
    /"totalTokens"|"modelName"|"prompt"|"response"|"requestTimestamp"|session\.jsonl/,
  );
});

test("companion share card renders one privacy-safe growing sidekick", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-companion-card-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  const days = Object.fromEntries(
    Array.from({ length: 7 }, (_, index) => [
      `2026-07-0${index + 1}`,
      {
        pollutionDose: 75,
        active: true,
        usageBand: "heavy",
        ecologyGains: { pollution: 1, clarity: 0 },
        traits: { context: 2, cache: 1, frenzy: 1, nuclear: 1 },
        event: null,
      },
    ]),
  );
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "companion-card",
      days,
      generations: {
        fossils: [
          {
            id: "fossil-companion-card",
            generation: 1,
            sealedAt: "2026-06-20",
            ecologyId: "polluted",
            pathologyId: "context",
            scarId: "carbonized_spine",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  const env = { HOME: home };
  const incubated = runCli(
    ["lab", "incubate", "2", "--date", "2026-06-30", "--json"],
    env,
  );
  assert.equal(incubated.status, 0, incubated.stderr);
  const cultureId = JSON.parse(incubated.stdout).culture.id;
  assert.equal(
    runCli(
      ["lab", "bond", cultureId, "--date", "2026-07-01", "--json"],
      env,
    ).status,
    0,
  );
  assert.equal(
    runCli(
      ["lab", "companion", "--date", "2026-07-07", "--json"],
      env,
    ).status,
    0,
  );

  const first = runCli(
    [
      "share",
      "--card",
      "companion",
      "--date",
      "2026-07-07",
      "--lang",
      "en",
    ],
    env,
  );
  const repeated = runCli(
    [
      "share",
      "--card",
      "companion",
      "--date",
      "2026-07-07",
      "--lang",
      "en",
    ],
    env,
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(repeated.stdout, first.stdout);
  assert.match(first.stdout, /<svg[^>]+width="1200"[^>]+height="630"/);
  assert.match(first.stdout, /SYMBIOTIC COMPANION/);
  assert.match(first.stdout, new RegExp(cultureId));
  assert.match(first.stdout, /SYMBIOTIC ABERRATION/);
  assert.match(first.stdout, /POLLUTION PARASITE/);
  assert.match(first.stdout, /ANOMALIES/);
  assert.match(first.stdout, /LOCAL-ONLY/);
  assert.match(first.stdout, /no chats, paths, model names, or exact tokens/);
  assert.doesNotMatch(first.stdout, /[\p{Script=Han}]/u);
  assert.doesNotMatch(
    first.stdout,
    /session\.jsonl|\/Users\/|mutation-test|"totalTokens"|"requestTimestamp"/,
  );
});

test("lab shelf and inspect render one sealed culture through public CLI", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-lab-shelf-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "lab-shelf",
      days: {},
      generations: {
        fossils: [
          {
            id: "fossil03",
            generation: 1,
            sealedAt: "2026-07-10",
            ecologyId: "lucid",
            pathologyId: "context",
            scarId: "clarity_seal",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  const env = { HOME: home };
  const incubated = runCli(
    ["lab", "incubate", "1", "--date", "2026-07-30", "--json"],
    env,
  );
  assert.equal(incubated.status, 0, incubated.stderr);
  const culture = JSON.parse(incubated.stdout).culture;

  const shelf = runCli(
    ["lab", "shelf", "--date", "2026-07-30", "--json"],
    env,
  );
  const inspected = runCli(
    ["lab", "inspect", culture.id, "--date", "2026-07-30", "--json"],
    env,
  );
  const zh = runCli(["lab", "shelf", "--date", "2026-07-30"], env);
  const en = runCli(
    [
      "lab",
      "inspect",
      culture.id,
      "--date",
      "2026-07-30",
      "--lang",
      "en",
    ],
    env,
  );

  assert.equal(shelf.status, 0, shelf.stderr);
  assert.equal(inspected.status, 0, inspected.stderr);
  assert.equal(zh.status, 0, zh.stderr);
  assert.equal(en.status, 0, en.stderr);
  assert.deepEqual(JSON.parse(shelf.stdout), {
    date: "2026-07-30",
    total: 1,
    cultures: [culture],
  });
  assert.deepEqual(JSON.parse(inspected.stdout), culture);
  assert.match(zh.stdout, /污染培养架 · 1/);
  assert.match(zh.stdout, new RegExp(`#${culture.id}`));
  assert.match(en.stdout, /POLLUTION CULTURE SPECIMEN/);
  assert.match(en.stdout, new RegExp(`#${culture.id}`));
  assert.match(en.stdout, /MATERIALS/);
  assert.match(en.stdout, /SIDE EFFECT/);
  assert.doesNotMatch(en.stdout, /[\p{Script=Han}]/u);
  assert.doesNotMatch(
    `${shelf.stdout}${inspected.stdout}${zh.stdout}${en.stdout}`,
    /totalTokens|modelName|prompt|response|requestTimestamp|session\.jsonl/,
  );
});

test("codex collects sealed laboratory cultures without creating duplicates", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-lab-codex-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "lab-codex",
      days: {},
      generations: {
        fossils: [
          {
            id: "fossil04",
            generation: 1,
            sealedAt: "2026-07-10",
            ecologyId: "paradox",
            pathologyId: "frenzy",
            scarId: "split_shadow",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  const env = { HOME: home };
  const incubated = runCli(
    ["lab", "incubate", "3", "--date", "2026-07-30", "--json"],
    env,
  );
  assert.equal(incubated.status, 0, incubated.stderr);
  const culture = JSON.parse(incubated.stdout).culture;

  const first = runCli(["codex", "--date", "2026-07-30", "--json"], env);
  const second = runCli(["codex", "--date", "2026-07-30", "--json"], env);
  const human = runCli(["codex", "--date", "2026-07-30"], env);
  const week = runCli(["week", "--date", "2026-07-30"], env);
  const month = runCli(
    ["month", "--date", "2026-07-30", "--lang", "en"],
    env,
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(human.status, 0, human.stderr);
  assert.equal(week.status, 0, week.stderr);
  assert.equal(month.status, 0, month.stderr);
  const codex = JSON.parse(first.stdout);
  assert.deepEqual(JSON.parse(second.stdout), codex);
  assert.deepEqual(codex.summary.cultures, { discovered: 1 });
  assert.deepEqual(codex.sections.cultures, [
    {
      id: culture.id,
      discoveredAt: "2026-07-30",
      typeId: culture.typeId,
      rarity: culture.rarity,
      fingerprint: culture.appearance.fingerprint,
      ingredientTypes: culture.ingredients.map(({ type }) => type),
      provenance: {
        firstDiscoveredAt: "2026-07-30",
        sourceType: "laboratory_culture",
        sourceId: culture.id,
        relatedId: culture.typeId,
      },
    },
  ]);
  assert.ok(
    codex.recent.some(
      (entry) =>
        entry.type === "culture" &&
        entry.id === culture.id &&
        entry.discoveredAt === "2026-07-30",
    ),
  );
  assert.match(human.stdout, /污染培养物\s+\[1\]/);
  assert.match(human.stdout, new RegExp(`#${culture.id}`));
  assert.match(week.stdout, /新增收藏\s+\d+ .* 培养 1/);
  assert.match(month.stdout, /NEW COLLECTIONS\s+\d+ .* cultures 1/);
  assert.doesNotMatch(
    `${first.stdout}${human.stdout}`,
    /"totalTokens"|"modelName"|"prompt"|"response"|"requestTimestamp"|session\.jsonl/,
  );
});

test("culture share card renders one privacy-safe local laboratory specimen", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-lab-card-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "lab-card",
      days: {},
      generations: {
        fossils: [
          {
            id: "fossil05",
            generation: 1,
            sealedAt: "2026-07-10",
            ecologyId: "polluted",
            pathologyId: "cache",
            scarId: "carbonized_spine",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  const env = { HOME: home };
  const incubated = runCli(
    ["lab", "incubate", "2", "--date", "2026-07-30", "--json"],
    env,
  );
  assert.equal(incubated.status, 0, incubated.stderr);
  const culture = JSON.parse(incubated.stdout).culture;

  const explicit = runCli(
    [
      "share",
      "--card",
      "culture",
      "--id",
      culture.id,
      "--date",
      "2026-07-30",
      "--lang",
      "en",
    ],
    env,
  );
  const latest = runCli(
    [
      "share",
      "--card",
      "culture",
      "--date",
      "2026-07-30",
      "--lang",
      "en",
    ],
    env,
  );

  assert.equal(explicit.status, 0, explicit.stderr);
  assert.equal(latest.status, 0, latest.stderr);
  assert.equal(latest.stdout, explicit.stdout);
  assert.match(
    explicit.stdout,
    /<svg[^>]+width="1200"[^>]+height="630"/,
  );
  assert.match(explicit.stdout, /POLLUTION CULTURE/);
  assert.match(explicit.stdout, new RegExp(culture.id));
  assert.match(explicit.stdout, /MATERIALS/);
  assert.match(explicit.stdout, /SIDE EFFECT/);
  assert.match(explicit.stdout, /LOCAL-ONLY/);
  assert.match(explicit.stdout, /no chats, paths, model names, or exact tokens/);
  assert.doesNotMatch(explicit.stdout, /[\p{Script=Han}]/u);
  assert.doesNotMatch(
    explicit.stdout,
    /session\.jsonl|\/Users\/|mutation-test|totalTokens|requestTimestamp/,
  );
});

test("encounter share card renders one private bilingual contact accident SVG", (t) => {
  const localHome = mkdtempSync(
    path.join(tmpdir(), "anti-ai-encounter-card-local-"),
  );
  const visitorHome = mkdtempSync(
    path.join(tmpdir(), "anti-ai-encounter-card-visitor-"),
  );
  t.after(() => {
    rmSync(localHome, { recursive: true, force: true });
    rmSync(visitorHome, { recursive: true, force: true });
  });
  const visitorResult = runCli(
    ["creature", "export", "--date", "2026-07-23", "--json"],
    {
      HOME: visitorHome,
      ANTI_AI_CREATURE_SEED: "encounter-card-visitor",
    },
  );
  assert.equal(visitorResult.status, 0, visitorResult.stderr);
  const visitor = JSON.parse(visitorResult.stdout);
  const env = {
    HOME: localHome,
    ANTI_AI_CREATURE_SEED: "encounter-card-local",
  };

  const card = runCli(
    [
      "share",
      "--card",
      "encounter",
      "--with",
      visitor.code,
      "--date",
      "2026-07-23",
      "--lang",
      "en",
    ],
    env,
  );
  assert.equal(card.status, 0, card.stderr);
  assert.match(card.stdout, /^<svg /);
  assert.match(card.stdout, /MUTATION CONTACT INCIDENT/);
  assert.match(card.stdout, /COMPUTE WEATHER/);
  assert.match(card.stdout, /CONTACT TYPE/);
  assert.match(card.stdout, /HYBRID SPECIMEN/);
  assert.match(card.stdout, /PRIVACY MODE/);
  assert.doesNotMatch(
    card.stdout,
    /gpt-test|180 tokens|session\.jsonl|AA1\./,
  );

  const missing = runCli(
    ["share", "--card", "encounter", "--date", "2026-07-23"],
    env,
  );
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /--with/);
});
