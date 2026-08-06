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

import { CASEBOOK_CASES } from "../src/casebook.mjs";

test("v2.9 doubles the route-balanced casebook pool", () => {
  assert.equal(CASEBOOK_CASES.length, 24);
  assert.deepEqual(
    Object.fromEntries(
      ["context", "cache", "frenzy", "nuclear"].map((pathologyId) => [
        pathologyId,
        CASEBOOK_CASES.filter((entry) => entry.pathologyId === pathologyId)
          .length,
      ]),
    ),
    { context: 4, cache: 4, frenzy: 4, nuclear: 4 },
  );
  assert.equal(CASEBOOK_CASES.filter((entry) => entry.ecologyId === "lucid").length, 4);
  assert.equal(CASEBOOK_CASES.filter((entry) => entry.ecologyId === "paradox").length, 4);
});

test("creature history compresses settled growth into key local casebook events", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-history-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  const endDate = shiftTestDate(startDate, 30);
  for (let index = 0; index <= 30; index += 1) {
    writeCodexUsage(
      root,
      [
        {
          input_tokens: 1_000,
          cached_input_tokens: 100,
          output_tokens: 100,
          total_tokens: 1_100,
        },
      ],
      shiftTestDate(startDate, index),
    );
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "history-casebook",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );

  const history = runCli(
    ["creature", "history", "--date", endDate, "--json"],
    env,
  );

  assert.equal(history.status, 0, history.stderr);
  assert.equal(history.stderr, "");
  const report = JSON.parse(history.stdout);
  assert.equal(report.date, endDate);
  assert.equal(report.observedDays, 31);
  assert.equal(report.daily, undefined);
  assert.ok(report.events.length < report.observedDays);
  assert.deepEqual(
    report.events
      .filter((event) => event.type === "stage")
      .map((event) => event.id),
    ["contaminated_embryo", "mutated_juvenile", "runaway_adult"],
  );
  assert.equal(report.events[0].type, "hatch");
  assert.equal(report.events[0].date, startDate);
  assert.doesNotMatch(
    history.stdout,
    /1,100 tokens|mutation-test|Codex|session\.jsonl|\/Users\//,
  );
});

test("creature history records selected cases and expands daily records only with --full", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-history-cases-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  const endDate = shiftTestDate(startDate, 13);
  for (let index = 0; index <= 13; index += 1) {
    writeCodexUsage(
      root,
      [
        {
          input_tokens: 1_500,
          cached_input_tokens: 300,
          output_tokens: 150,
          total_tokens: 1_650,
        },
      ],
      shiftTestDate(startDate, index),
    );
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "history-selected-case",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );
  assert.equal(
    runCli(
      ["creature", "intervene", "3", "--date", endDate, "--json"],
      env,
    ).status,
    0,
  );

  const compact = runCli(
    ["creature", "history", "--date", endDate, "--json"],
    env,
  );
  const full = runCli(
    ["creature", "history", "--date", endDate, "--full", "--json"],
    env,
  );
  const fullHuman = runCli(
    ["creature", "history", "--date", endDate, "--full"],
    env,
  );
  const english = runCli(
    ["creature", "history", "--date", endDate, "--lang", "en"],
    env,
  );

  assert.equal(compact.status, 0, compact.stderr);
  assert.equal(full.status, 0, full.stderr);
  assert.equal(fullHuman.status, 0, fullHuman.stderr);
  assert.equal(english.status, 0, english.stderr);
  const compactHistory = JSON.parse(compact.stdout);
  assert.equal(compactHistory.daily, undefined);
  assert.ok(
    compactHistory.events.some((event) => event.type === "case_offered"),
  );
  assert.ok(
    compactHistory.events.some(
      (event) =>
        event.type === "case_selected" &&
        event.routeId === "paradox" &&
        event.markId === "paradox",
    ),
  );
  const fullHistory = JSON.parse(full.stdout);
  assert.equal(fullHistory.daily.length, 14);
  assert.deepEqual(
    fullHistory.daily.map((day) => day.experienceDay),
    Array.from({ length: 14 }, (_, index) => index + 1),
  );
  assert.doesNotMatch(
    JSON.stringify(fullHistory.daily),
    /totalTokens|inputTokens|outputTokens|model|path|prompt|response/,
  );
  assert.match(fullHuman.stdout, /逐日病程/);
  assert.match(fullHuman.stdout, /2026-01-01\s+阅历 1 · 活跃/);
  assert.match(fullHuman.stdout, /2026-01-14\s+阅历 14 · 活跃/);
  assert.doesNotMatch(
    fullHuman.stdout,
    /1,650 tokens|Codex|session\.jsonl|\/Users\//,
  );
  assert.match(english.stdout, /FORKED CASEBOOK · KEY HISTORY/);
  assert.match(english.stdout, /TURNING CASE/);
  assert.match(english.stdout, /FORKED SCAR/);
  assert.doesNotMatch(english.stdout, /[\p{Script=Han}]/u);
});

test("creature history promotes rare mutations, chromatic gains, and badges to key events", (t) => {
  const rareHome = mkdtempSync(path.join(tmpdir(), "anti-ai-history-rare-"));
  const badgeHome = mkdtempSync(path.join(tmpdir(), "anti-ai-history-badge-"));
  t.after(() => rmSync(rareHome, { recursive: true, force: true }));
  t.after(() => rmSync(badgeHome, { recursive: true, force: true }));

  const rare = runCli(
    ["creature", "history", "--date", "2026-07-23", "--json"],
    {
      HOME: rareHome,
      ANTI_AI_CREATURE_SEED: "rare-ability-758",
    },
  );
  const badges = runCli(
    ["creature", "history", "--date", "2026-07-23", "--json"],
    {
      HOME: badgeHome,
      ANTI_AI_CODEX_DIR: baselineCodexDir,
      ANTI_AI_CREATURE_SEED: "history-badges",
    },
  );

  assert.equal(rare.status, 0, rare.stderr);
  assert.equal(badges.status, 0, badges.stderr);
  const rareEvents = JSON.parse(rare.stdout).events;
  assert.ok(
    rareEvents.some(
      (event) =>
        event.type === "chromatic" &&
        event.id === "deadline_scent" &&
        event.levelGain === 1,
    ),
  );
  const badgeEvents = JSON.parse(badges.stdout).events;
  assert.ok(
    badgeEvents.some(
      (event) =>
        event.type === "achievement" &&
        event.id === "desk_reactor",
    ),
  );
  assert.ok(
    badgeEvents.some(
      (event) =>
        event.type === "achievement" &&
        event.id === "seven_day_feeding",
    ),
  );
});

test("creature history preserves fossils and sealed evolution choices as key events", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-history-generation-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  const endDate = shiftTestDate(startDate, 89);
  for (let index = 0; index < 90; index += 1) {
    writeCodexUsage(
      root,
      [
        {
          input_tokens: 1_000,
          cached_input_tokens: 100,
          output_tokens: 100,
          total_tokens: 1_100,
        },
      ],
      shiftTestDate(startDate, index),
    );
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "history-generation",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );
  assert.equal(
    runCli(["creature", "evolve", "1", "--date", endDate, "--json"], env)
      .status,
    0,
  );

  const history = runCli(
    ["creature", "history", "--date", endDate, "--json"],
    env,
  );

  assert.equal(history.status, 0, history.stderr);
  const events = JSON.parse(history.stdout).events;
  assert.ok(
    events.some(
      (event) =>
        event.type === "fossil" &&
        event.generation === 1 &&
        event.date === endDate,
    ),
  );
  assert.ok(
    events.some(
      (event) =>
        event.type === "evolution_selected" &&
        event.generation === 2 &&
        event.date === endDate,
    ),
  );
});

test("creature intervene offers one stable three-way case and seals one costly choice", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-intervention-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-02-01";
  const endDate = shiftTestDate(startDate, 13);
  for (let index = 0; index <= 13; index += 1) {
    writeCodexUsage(
      root,
      [
        {
          input_tokens: 2_000,
          cached_input_tokens: 500,
          output_tokens: 200,
          total_tokens: 2_200,
        },
      ],
      shiftTestDate(startDate, index),
    );
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "intervention-casebook",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );

  const first = runCli(
    ["creature", "intervene", "--date", endDate, "--json"],
    env,
  );
  const second = runCli(
    ["creature", "intervene", "--date", endDate, "--json"],
    env,
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const pending = JSON.parse(first.stdout);
  assert.deepEqual(JSON.parse(second.stdout), pending);
  assert.match(pending.id, /^[0-9a-f]{8}$/);
  assert.equal(pending.offeredAt, endDate);
  assert.equal(pending.status, "pending");
  assert.equal(pending.trigger.experienceDays, 14);
  assert.deepEqual(
    pending.options.map((option) => option.route),
    ["pollution", "clarity", "paradox"],
  );
  assert.deepEqual(
    pending.options.map((option) => option.slot),
    [1, 2, 3],
  );
  assert.equal(pending.selected, null);

  const selectedResult = runCli(
    ["creature", "intervene", "2", "--date", endDate, "--json"],
    env,
  );
  assert.equal(selectedResult.status, 0, selectedResult.stderr);
  const selected = JSON.parse(selectedResult.stdout);
  assert.equal(selected.status, "selected");
  assert.equal(selected.selected.slot, 2);
  assert.equal(selected.selected.route, "clarity");
  assert.equal(selected.selectedAt, endDate);

  const locked = runCli(
    ["creature", "intervene", "1", "--date", endDate, "--json"],
    env,
  );
  assert.equal(locked.status, 2);
  assert.equal(locked.stdout, "");
  assert.equal(
    locked.stderr,
    "病例已封存，不能改选治疗方案。\n",
  );
});

test("creature surfaces pending intervention and selected aftereffects in its normal file", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-case-ui-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-02-01";
  const endDate = shiftTestDate(startDate, 13);
  for (let index = 0; index <= 13; index += 1) {
    writeCodexUsage(
      root,
      [
        {
          input_tokens: 2_500,
          cached_input_tokens: 400,
          output_tokens: 250,
          total_tokens: 2_750,
        },
      ],
      shiftTestDate(startDate, index),
    );
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "creature-case-ui",
    COLUMNS: "80",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );

  const pending = runCli(["creature", "--date", endDate], env);
  const pendingJson = runCli(
    ["creature", "--date", endDate, "--json"],
    env,
  );
  assert.equal(pending.status, 0, pending.stderr);
  assert.match(pending.stdout, /转折病例\s+待处理/);
  assert.match(pending.stdout, /anti-ai creature intervene/);
  assert.ok(
    pending.stdout
      .trimEnd()
      .split("\n")
      .every((line) => terminalWidth(line) <= 80),
    pending.stdout,
  );
  assert.equal(
    JSON.parse(pendingJson.stdout).casebook.current.status,
    "pending",
  );

  assert.equal(
    runCli(
      ["creature", "intervene", "2", "--date", endDate, "--json"],
      env,
    ).status,
    0,
  );
  const selected = runCli(
    ["creature", "--date", endDate, "--lang", "en"],
    env,
  );
  const selectedJson = runCli(
    ["creature", "--date", endDate, "--json"],
    env,
  );
  assert.equal(selected.status, 0, selected.stderr);
  assert.match(selected.stdout, /CASE AFTEREFFECT\s+ABSTINENCE SEAL/);
  assert.equal(
    JSON.parse(selectedJson.stdout).casebook.current.selected.route,
    "clarity",
  );
  assert.equal(JSON.parse(selectedJson.stdout).casebook.selectedCount, 1);
});

test("creature prognosis explains three local futures without fake probabilities", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-prognosis-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-03-01";
  const endDate = shiftTestDate(startDate, 13);
  for (let index = 0; index <= 13; index += 1) {
    writeCodexUsage(
      root,
      [
        {
          input_tokens: 3_000,
          cached_input_tokens: 200,
          output_tokens: 300,
          total_tokens: 3_300,
        },
      ],
      shiftTestDate(startDate, index),
    );
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "prognosis-casebook",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );

  const before = runCli(
    ["creature", "prognosis", "--date", endDate, "--json"],
    env,
  );
  assert.equal(before.status, 0, before.stderr);
  const baseline = JSON.parse(before.stdout);
  assert.deepEqual(baseline.window, { minDays: 14, maxDays: 30 });
  assert.deepEqual(
    baseline.routes.map((route) => route.route),
    ["pollution", "clarity", "paradox"],
  );
  assert.deepEqual(
    [...baseline.routes.map((route) => route.likelihood)].sort(),
    ["latent", "leading", "possible"],
  );
  for (const route of baseline.routes) {
    assert.ok(route.driverIds.length > 0);
    assert.match(route.previewCaseId, /^[a-z_]+$/);
    assert.equal("probability" in route, false);
    assert.equal("percent" in route, false);
  }

  const selected = runCli(
    ["creature", "intervene", "2", "--date", endDate, "--json"],
    env,
  );
  assert.equal(selected.status, 0, selected.stderr);
  const after = runCli(
    ["creature", "prognosis", "--date", endDate, "--json"],
    env,
  );
  const repeated = runCli(
    ["creature", "prognosis", "--date", endDate, "--json"],
    env,
  );
  assert.equal(after.status, 0, after.stderr);
  assert.deepEqual(JSON.parse(repeated.stdout), JSON.parse(after.stdout));
  const clarity = JSON.parse(after.stdout).routes.find(
    (route) => route.route === "clarity",
  );
  assert.ok(clarity.driverIds.includes("intervention_clarity"));
  assert.doesNotMatch(
    after.stdout,
    /3,300 tokens|mutation-test|Codex|session\.jsonl|\/Users\//,
  );
});

test("interventions use lived days, reward quiet routes, and never build a choice backlog", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-case-fairness-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const activeHome = path.join(workspace, "active-home");
  const quietHome = path.join(workspace, "quiet-home");
  const startDate = "2026-06-01";
  const day13 = shiftTestDate(startDate, 12);
  const day14 = shiftTestDate(startDate, 13);
  const day42 = shiftTestDate(startDate, 41);
  for (let index = 0; index <= 41; index += 1) {
    writeCodexUsage(
      root,
      [
        {
          input_tokens: 9_000_000,
          cached_input_tokens: 0,
          output_tokens: 1_000,
          total_tokens: 9_001_000,
        },
      ],
      shiftTestDate(startDate, index),
    );
  }
  const activeEnv = {
    HOME: activeHome,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "case-fairness-active",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], activeEnv).status,
    0,
  );
  const early = runCli(
    ["creature", "intervene", "--date", day13, "--json"],
    activeEnv,
  );
  assert.equal(early.status, 2);
  assert.equal(early.stderr, "当前没有可干预的转折病例。\n");

  const first = runCli(
    ["creature", "intervene", "--date", day14, "--json"],
    activeEnv,
  );
  assert.equal(first.status, 0, first.stderr);
  const firstCase = JSON.parse(first.stdout);
  assert.equal(firstCase.trigger.experienceDays, 14);

  const muchLater = runCli(
    ["creature", "intervene", "--date", day42, "--json"],
    activeEnv,
  );
  assert.equal(muchLater.status, 0, muchLater.stderr);
  assert.equal(JSON.parse(muchLater.stdout).id, firstCase.id);
  assert.equal(JSON.parse(muchLater.stdout).status, "pending");
  assert.equal(
    runCli(
      ["creature", "intervene", "1", "--date", day42, "--json"],
      activeEnv,
    ).status,
    0,
  );
  const noBacklog = runCli(
    ["creature", "intervene", "--date", day42, "--json"],
    activeEnv,
  );
  assert.equal(noBacklog.status, 0, noBacklog.stderr);
  assert.equal(JSON.parse(noBacklog.stdout).id, firstCase.id);
  assert.equal(JSON.parse(noBacklog.stdout).status, "selected");

  const quietRoot = path.join(workspace, "quiet-codex");
  writeCodexUsage(
    quietRoot,
    [
      {
        input_tokens: 100,
        cached_input_tokens: 0,
        output_tokens: 10,
        total_tokens: 110,
      },
    ],
    startDate,
  );
  const quietEnv = {
    HOME: quietHome,
    ANTI_AI_CODEX_DIR: quietRoot,
    ANTI_AI_CREATURE_SEED: "case-fairness-quiet",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], quietEnv).status,
    0,
  );
  const quiet = runCli(
    ["creature", "intervene", "--date", day14, "--json"],
    quietEnv,
  );
  assert.equal(quiet.status, 0, quiet.stderr);
  assert.equal(JSON.parse(quiet.stdout).trigger.experienceDays, 14);
  assert.equal(JSON.parse(quiet.stdout).trigger.ecologyId, "lucid");
});
