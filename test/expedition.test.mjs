import {
  assert,
  mkdtempSync,
  path,
  readFileSync,
  rmSync,
  runCli,
  shiftTestDate,
  test,
  tmpdir,
  writeCodexUsage,
  writeFileSync,
} from "./helpers.mjs";
import { readdirSync } from "node:fs";
import {
  executeContainmentAction,
  previewContainmentAction,
} from "../src/application/actions.mjs";
import { createTuiShareController } from "../src/application/share-export.mjs";
import {
  expeditionEventView,
  expeditionReturnSummary,
  expeditionShareView,
} from "../src/expedition/presentation.mjs";

test("expedition status exposes one read-only opportunity after a settled day", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-expedition-status-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const date = "2026-08-06";
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 800,
        cached_input_tokens: 200,
        output_tokens: 100,
        total_tokens: 900,
      },
    ],
    date,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "expedition-status",
  };

  const settled = runCli(["creature", "--date", date, "--json"], env);
  assert.equal(settled.status, 0, settled.stderr);
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const before = readFileSync(statePath, "utf8");

  const first = runCli(["expedition", "--date", date, "--json"], env);
  const second = runCli(["expedition", "--date", date, "--json"], env);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(JSON.parse(first.stdout), {
    version: 1,
    date,
    eligibility: {
      available: true,
      reason: null,
      experienceDays: 1,
      lastStartedExperienceDay: 0,
    },
    active: null,
    latest: null,
    totals: {
      started: 0,
      completed: 0,
      abandoned: 0,
    },
  });
  assert.equal(second.stdout, first.stdout);
  assert.equal(readFileSync(statePath, "utf8"), before);
  assert.doesNotMatch(
    first.stdout,
    /totalTokens|inputTokens|outputTokens|model|source|path|prompt|response/i,
  );
});

test("expedition start seals one deterministic ten-cell run without rerolls", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-expedition-start-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const date = "2026-08-07";
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 400,
        cached_input_tokens: 100,
        output_tokens: 50,
        total_tokens: 450,
      },
    ],
    date,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "expedition-start",
  };
  assert.equal(
    runCli(["creature", "--date", date, "--json"], env).status,
    0,
  );

  const started = runCli(
    ["expedition", "start", "context_mine", "--date", date, "--json"],
    env,
  );
  assert.equal(started.status, 0, started.stderr);
  const result = JSON.parse(started.stdout);
  assert.equal(result.eligibility.available, false);
  assert.equal(result.eligibility.reason, "active");
  assert.deepEqual(result.active, {
    id: "exp-0001",
    version: 1,
    destinationId: "context_mine",
    status: "active",
    startedAt: date,
    sourceExperienceDay: 1,
    step: 0,
    totalSteps: 10,
    pendingChoice: null,
    events: [],
    temporaryEffects: [],
    permanentEffect: null,
    artifactIds: [],
    achievementIds: [],
  });
  assert.equal(Object.hasOwn(result.active, "seed"), false);
  assert.equal(Object.hasOwn(result.active, "eventPlan"), false);
  const activeHistory = runCli(
    ["creature", "history", "--date", date, "--json"],
    env,
  );
  assert.equal(activeHistory.status, 0, activeHistory.stderr);
  assert.deepEqual(
    JSON.parse(activeHistory.stdout).events
      .filter(({ type }) => type.startsWith("expedition_"))
      .map(({ type }) => type),
    ["expedition_started"],
  );

  const duplicate = runCli(
    ["expedition", "start", "cache_swamp", "--date", date, "--json"],
    env,
  );
  assert.equal(duplicate.status, 2);
  assert.equal(duplicate.stdout, "");
  assert.match(duplicate.stderr, /已有远征正在进行/);

  const resumed = runCli(["expedition", "--date", date, "--json"], env);
  assert.equal(resumed.status, 0, resumed.stderr);
  assert.equal(resumed.stdout, started.stdout);

  const state = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  assert.equal(state.schemaVersion, 14);
  assert.equal(state.expeditions.lastStartedExperienceDay, 1);
  assert.equal(state.expeditions.active.eventPlan.length, 10);
  assert.equal(new Set(state.expeditions.active.eventPlan).size, 10);
});

test("expedition advances ten cells, blocks on choices, and seals one history record", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-expedition-run-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const date = "2026-08-08";
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 1_000,
        cached_input_tokens: 500,
        output_tokens: 100,
        total_tokens: 1_100,
      },
    ],
    date,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "expedition-run",
  };
  assert.equal(
    runCli(["creature", "--date", date, "--json"], env).status,
    0,
  );
  assert.equal(
    runCli(
      ["expedition", "start", "cache_swamp", "--date", date, "--json"],
      env,
    ).status,
    0,
  );

  const observedTypes = new Set();
  let choiceCount = 0;
  let finalStatus = null;
  for (let expectedStep = 1; expectedStep <= 10; expectedStep += 1) {
    const advanced = runCli(
      ["expedition", "next", "--date", date, "--json"],
      env,
    );
    assert.equal(advanced.status, 0, advanced.stderr);
    let status = JSON.parse(advanced.stdout);
    const run = status.active ?? status.latest;
    assert.equal(run.step, expectedStep);
    assert.equal(run.events.length, expectedStep);
    const event = run.events.at(-1);
    assert.equal(event.step, expectedStep);
    observedTypes.add(event.type);

    if (run.pendingChoice) {
      choiceCount += 1;
      assert.equal(run.pendingChoice.options.length, 3);
      const blocked = runCli(
        ["expedition", "next", "--date", date, "--json"],
        env,
      );
      assert.equal(blocked.status, 2);
      assert.match(blocked.stderr, /必须先处理当前分叉/);
      const chosen = runCli(
        ["expedition", "choose", "2", "--date", date, "--json"],
        env,
      );
      assert.equal(chosen.status, 0, chosen.stderr);
      status = JSON.parse(chosen.stdout);
      const chosenRun = status.active ?? status.latest;
      assert.equal(chosenRun.pendingChoice, null);
      assert.equal(chosenRun.events.at(-1).choice.slot, "2");
    }
    finalStatus = status;
  }

  assert.equal(choiceCount, 1);
  assert.ok(observedTypes.has("empty"));
  assert.ok(observedTypes.has("observation"));
  assert.ok(observedTypes.has("condition"));
  assert.ok(observedTypes.has("ability"));
  assert.ok(observedTypes.has("choice"));
  assert.equal(finalStatus.active, null);
  assert.equal(finalStatus.latest.status, "completed");
  assert.equal(finalStatus.latest.completedAt, date);
  assert.equal(finalStatus.totals.completed, 1);
  assert.ok(Math.abs(finalStatus.latest.permanentEffect.delta) <= 2);

  const returnSummary = runCli(["expedition", "--date", date], env);
  assert.equal(returnSummary.status, 0, returnSummary.stderr);
  assert.match(returnSummary.stdout, /返航总结/u);
  assert.match(returnSummary.stdout, /事件轨迹/u);
  assert.match(returnSummary.stdout, /返航诊断/u);
  assert.match(returnSummary.stdout, /临时状态.*返航时失效/u);

  const history = runCli(
    ["expedition", "history", "--date", date, "--json"],
    env,
  );
  assert.equal(history.status, 0, history.stderr);
  const archive = JSON.parse(history.stdout);
  assert.equal(archive.records.length, 1);
  assert.deepEqual(archive.records[0], finalStatus.latest);
  const historyHuman = runCli(
    ["expedition", "history", "--date", date, "--lang", "en"],
    env,
  );
  assert.equal(historyHuman.status, 0, historyHuman.stderr);
  assert.match(historyHuman.stdout, /EXPEDITION HISTORY · 1/u);
  assert.match(historyHuman.stdout, /CACHE SWAMP · RETURNED · 10 \/ 10/u);
  assert.doesNotMatch(historyHuman.stdout, /[\p{Script=Han}]/u);

  const used = runCli(
    ["expedition", "start", "request_nest", "--date", date, "--json"],
    env,
  );
  assert.equal(used.status, 2);
  assert.match(used.stderr, /本阅历日的远征机会已经使用/);
});

test("abandon consumes the opportunity while reached permanent effects survive", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-expedition-abandon-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const date = "2026-08-09";
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 600,
        cached_input_tokens: 100,
        output_tokens: 50,
        total_tokens: 650,
      },
    ],
    date,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "expedition-abandon",
  };
  const settled = runCli(["creature", "--date", date, "--json"], env);
  assert.equal(settled.status, 0, settled.stderr);
  const before = JSON.parse(settled.stdout).abilityTotals;
  assert.equal(
    runCli(
      ["expedition", "start", "request_nest", "--date", date, "--json"],
      env,
    ).status,
    0,
  );

  let permanentEffect = null;
  while (!permanentEffect) {
    const advanced = runCli(
      ["expedition", "next", "--date", date, "--json"],
      env,
    );
    assert.equal(advanced.status, 0, advanced.stderr);
    const status = JSON.parse(advanced.stdout);
    const run = status.active ?? status.latest;
    if (run.pendingChoice) {
      assert.equal(
        runCli(
          ["expedition", "choose", "1", "--date", date, "--json"],
          env,
        ).status,
        0,
      );
    }
    permanentEffect = run.permanentEffect;
  }

  const abandoned = runCli(
    ["expedition", "abandon", "--date", date, "--json"],
    env,
  );
  assert.equal(abandoned.status, 0, abandoned.stderr);
  const status = JSON.parse(abandoned.stdout);
  assert.equal(status.active, null);
  assert.equal(status.latest.status, "abandoned");
  assert.equal(status.latest.abandonedAt, date);
  assert.equal(status.totals.abandoned, 1);

  const after = runCli(["creature", "--date", date, "--json"], env);
  assert.equal(after.status, 0, after.stderr);
  const abilityTotals = JSON.parse(after.stdout).abilityTotals;
  assert.equal(
    abilityTotals[permanentEffect.abilityId],
    Math.max(0, before[permanentEffect.abilityId] + permanentEffect.delta),
  );

  const unavailable = runCli(
    ["expedition", "start", "reactor_graveyard", "--date", date],
    env,
  );
  assert.equal(unavailable.status, 2);

  const laterDate = "2026-08-12";
  const laterCreature = runCli(
    ["creature", "--date", laterDate, "--json"],
    env,
  );
  assert.equal(laterCreature.status, 0, laterCreature.stderr);
  const nextOpportunity = runCli(
    ["expedition", "--date", laterDate, "--json"],
    env,
  );
  assert.equal(nextOpportunity.status, 0, nextOpportunity.stderr);
  const eligibility = JSON.parse(nextOpportunity.stdout).eligibility;
  assert.equal(eligibility.available, true);
  assert.equal(eligibility.experienceDays, 4);
  assert.equal(eligibility.lastStartedExperienceDay, 1);
});

test("an early negative permanent adjustment cannot erase later daily growth", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-expedition-effect-order-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const activeDate = "2026-08-10";
  const quietDate = "2026-08-11";
  writeCodexUsage(
    root,
    [{ input_tokens: 500, output_tokens: 50, total_tokens: 550 }],
    activeDate,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "expedition-effect-order",
  };
  const settled = runCli(
    ["creature", "--date", quietDate, "--json"],
    env,
  );
  assert.equal(settled.status, 0, settled.stderr);
  assert.equal(JSON.parse(settled.stdout).abilityTotals.withdrawal, 1);

  const statePath = path.join(home, ".anti-ai", "creature.json");
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  state.expeditions = {
    version: 1,
    nextSequence: 2,
    lastStartedExperienceDay: 1,
    active: null,
    history: [{
      id: "exp-0001",
      version: 1,
      destinationId: "context_mine",
      status: "abandoned",
      startedAt: activeDate,
      abandonedAt: activeDate,
      sourceExperienceDay: 1,
      step: 1,
      planSeed: "derived-test-plan",
      eventPlan: [],
      pendingChoice: null,
      events: [],
      temporaryEffects: [],
      permanentEffect: {
        abilityId: "withdrawal",
        delta: -1,
        named: false,
        appliedAt: quietDate,
        appliedExperienceDay: 1,
        eventId: "context_mine:ability:0:1",
        step: 1,
      },
      artifactIds: [],
      achievementIds: [],
    }],
    artifactIds: [],
    achievementIds: [],
    artifactRecords: [],
    achievementRecords: [],
  };
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");

  const result = runCli(
    ["creature", "--date", quietDate, "--json"],
    env,
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).abilityTotals.withdrawal, 1);
});

test("expedition and every state-changing subcommand have bilingual help", () => {
  const targets = ["expedition", "start", "next", "choose", "history", "abandon"];
  for (const target of targets) {
    const args = target === "expedition"
      ? ["expedition", "--help"]
      : ["expedition", target, "--help"];
    const zh = runCli(args);
    const en = runCli([...args, "--lang", "en"]);
    assert.equal(zh.status, 0, zh.stderr);
    assert.equal(en.status, 0, en.stderr);
    assert.match(zh.stdout, /Usage: anti-ai expedition/);
    assert.match(en.stdout, /Usage: anti-ai expedition/);
    assert.match(zh.stdout, /状态行为/);
    assert.match(en.stdout, /State behavior/);
    assert.doesNotMatch(en.stdout, /[\p{Script=Han}]/u);
  }

  const top = runCli(["--help", "--lang", "en"]);
  assert.equal(top.status, 0, top.stderr);
  assert.match(top.stdout, /expedition\s+Start or continue/);
});

test("human expedition output renders the ten-cell rail and localized event copy", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-expedition-copy-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const date = "2026-08-10";
  writeCodexUsage(
    root,
    [{ input_tokens: 500, output_tokens: 50, total_tokens: 550 }],
    date,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "expedition-copy",
  };
  assert.equal(
    runCli(["creature", "--date", date, "--json"], env).status,
    0,
  );
  const started = runCli(
    ["expedition", "start", "reactor_graveyard", "--date", date],
    env,
  );
  assert.equal(started.status, 0, started.stderr);
  assert.match(started.stdout, /收容远征 · 反应堆墓场/);
  assert.match(started.stdout, /\[@\].*\[\?\].*\[\?\]/);

  const nextZh = runCli(["expedition", "next", "--date", date], env);
  const nextEn = runCli(
    ["expedition", "--date", date, "--lang", "en"],
    env,
  );
  assert.equal(nextZh.status, 0, nextZh.stderr);
  assert.equal(nextEn.status, 0, nextEn.stderr);
  assert.match(nextZh.stdout, /第 1 \/ 10 格/);
  assert.match(nextZh.stdout, /最近事件/);
  assert.match(nextZh.stdout, /\[(?:静默格|普通事件|状态变动|特殊事件)\]/u);
  assert.match(nextZh.stdout, /系统记录.*已封存/u);
  assert.match(nextEn.stdout, /CONTAINMENT EXPEDITION · REACTOR GRAVEYARD/);
  assert.match(nextEn.stdout, /CELL 1 \/ 10/);
  assert.match(nextEn.stdout, /LATEST EVENT/);
  assert.doesNotMatch(nextEn.stdout, /[\p{Script=Han}]/u);
});

test("expedition presentation separates special events from system copy and builds a localized return summary", () => {
  const record = {
    id: "exp-presentation",
    version: 1,
    destinationId: "context_mine",
    status: "completed",
    startedAt: "2026-08-10",
    completedAt: "2026-08-10",
    sourceExperienceDay: 4,
    step: 10,
    totalSteps: 10,
    pendingChoice: null,
    events: [
      {
        id: "context_mine:observation:0:1",
        step: 1,
        type: "observation",
        bodyId: "context_mine_observation_0",
      },
      {
        id: "context_mine:anomaly:1:8",
        step: 8,
        type: "anomaly",
        bodyId: "context_mine_anomaly_1",
        effect: {
          abilityId: "withdrawal",
          delta: -2,
          duration: "expedition",
        },
      },
      {
        id: "context_mine:artifact:4:9",
        step: 9,
        type: "artifact",
        bodyId: "context_mine_artifact_4",
        artifactId: "context_mine_artifact_5",
      },
      {
        id: "context_mine:ability:0:10",
        step: 10,
        type: "ability",
        bodyId: "context_mine_ability_0",
        effect: {
          abilityId: "appetite",
          delta: 1,
          duration: "permanent",
          named: false,
        },
      },
    ],
    temporaryEffects: [{ abilityId: "withdrawal", delta: -2 }],
    permanentEffect: { abilityId: "appetite", delta: 1, named: false },
    artifactIds: ["context_mine_artifact_5"],
    achievementIds: ["first_return", "permanent_increase"],
  };

  const event = expeditionEventView(record, record.events[1], "zh");
  assert.equal(event.badge, "特殊事件");
  assert.equal(event.stage, "返航窗口");
  assert.equal(event.effect.ability, "戒断反应");
  assert.match(event.system, /第 8 格.*已封存/u);

  const summary = expeditionReturnSummary(record, "zh");
  assert.equal(summary.status, "已返航");
  assert.equal(summary.events.total, 4);
  assert.equal(summary.events.special, 2);
  assert.equal(summary.recentEvents.length, 3);
  assert.equal(summary.artifacts[0].name, "空白引用核");
  assert.equal(summary.artifacts[0].rarity, "rare");
  assert.equal(summary.achievements[1].name, "病灶增生");
  assert.equal(summary.permanentEffect.ability, "吞噬欲");
  assert.match(summary.temporaryEffectNote, /返航时失效/u);
  assert.ok(summary.diagnosis.length > 10);

  const english = expeditionReturnSummary(record, "en");
  assert.equal(english.status, "RETURNED");
  assert.doesNotMatch(JSON.stringify(english), /[\p{Script=Han}]/u);
  const share = expeditionShareView(record, "en");
  assert.equal(share.eventLog[1].badge, "SPECIAL EVENT");
  assert.equal(share.latestEvent.badge, "CONDITION SHIFT");
});

test("completed expeditions feed fixed Codex artifacts and achievements", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-expedition-codex-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const date = "2026-08-11";
  writeCodexUsage(
    root,
    [{ input_tokens: 700, output_tokens: 80, total_tokens: 780 }],
    date,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "expedition-codex",
  };
  assert.equal(
    runCli(["creature", "--date", date, "--json"], env).status,
    0,
  );
  assert.equal(
    runCli(
      ["expedition", "start", "context_mine", "--date", date, "--json"],
      env,
    ).status,
    0,
  );
  for (let step = 0; step < 10; step += 1) {
    const advanced = runCli(
      ["expedition", "next", "--date", date, "--json"],
      env,
    );
    assert.equal(advanced.status, 0, advanced.stderr);
    const run = JSON.parse(advanced.stdout).active;
    if (run?.pendingChoice) {
      assert.equal(
        runCli(
          ["expedition", "choose", "3", "--date", date, "--json"],
          env,
        ).status,
        0,
      );
    }
  }

  const codex = runCli(["codex", "--date", date, "--json"], env);
  const human = runCli(["codex", "--date", date, "--lang", "en"], env);
  assert.equal(codex.status, 0, codex.stderr);
  assert.equal(human.status, 0, human.stderr);
  const collection = JSON.parse(codex.stdout);
  assert.equal(collection.summary.fixed.total, 134);
  assert.equal(collection.summary.expeditionArtifacts.total, 24);
  assert.equal(collection.summary.expeditionAchievements.total, 12);
  assert.equal(collection.sections.expeditionArtifacts.length, 24);
  assert.equal(collection.sections.expeditionAchievements.length, 12);
  assert.ok(collection.summary.expeditionAchievements.discovered >= 1);
  assert.ok(
    collection.sections.expeditionAchievements.some(
      ({ id, discovered, provenance }) =>
        id === "first_return" &&
        discovered &&
        provenance.sourceType === "expedition_return",
    ),
  );
  assert.match(human.stdout, /EXPEDITION ARTIFACTS/);
  assert.match(human.stdout, /EXPEDITION ACHIEVEMENTS/);
  assert.doesNotMatch(human.stdout, /[\p{Script=Han}]/u);

  const history = runCli(
    ["creature", "history", "--date", date, "--json"],
    env,
  );
  assert.equal(history.status, 0, history.stderr);
  assert.deepEqual(
    JSON.parse(history.stdout).events
      .filter(({ type }) => type.startsWith("expedition_"))
      .map(({ type }) => type),
    ["expedition_started", "expedition_returned"],
  );
  const week = runCli(["week", "--date", date, "--lang", "en"], env);
  assert.equal(week.status, 0, week.stderr);
  assert.match(week.stdout, /expedition artifacts \d+ · expedition achievements \d+/u);
});

test("schema v13 migrates read-only until the first explicit expedition write", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-expedition-migrate-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const date = "2026-08-12";
  writeCodexUsage(
    root,
    [{ input_tokens: 300, output_tokens: 40, total_tokens: 340 }],
    date,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "expedition-migrate",
  };
  assert.equal(
    runCli(["creature", "--date", date, "--json"], env).status,
    0,
  );
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const legacyState = JSON.parse(readFileSync(statePath, "utf8"));
  legacyState.schemaVersion = 13;
  delete legacyState.expeditions;
  const legacyContents = `${JSON.stringify(legacyState, null, 2)}\n`;
  writeFileSync(statePath, legacyContents);

  const status = runCli(["expedition", "--date", date, "--json"], env);
  assert.equal(status.status, 0, status.stderr);
  assert.equal(JSON.parse(status.stdout).eligibility.available, true);
  assert.equal(readFileSync(statePath, "utf8"), legacyContents);

  const started = runCli(
    ["expedition", "start", "context_mine", "--date", date, "--json"],
    env,
  );
  assert.equal(started.status, 0, started.stderr);
  const migrated = JSON.parse(readFileSync(statePath, "utf8"));
  assert.equal(migrated.schemaVersion, 14);
  assert.equal(migrated.expeditions.active.destinationId, "context_mine");
  const backupDirectory = path.join(home, ".anti-ai", "backups");
  const backups = readdirSync(backupDirectory);
  assert.equal(backups.length, 1);
  assert.match(backups[0], /^creature-v13-[a-f0-9]{12}\.json$/);
  assert.equal(
    readFileSync(path.join(backupDirectory, backups[0]), "utf8"),
    legacyContents,
  );
});

test("TUI application actions preview and execute expedition writes through shared services", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-expedition-actions-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const date = "2026-08-13";
  writeCodexUsage(
    root,
    [{ input_tokens: 800, output_tokens: 100, total_tokens: 900 }],
    date,
  );
  const environment = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "expedition-actions",
  };
  assert.equal(
    runCli(["creature", "--date", date, "--json"], environment).status,
    0,
  );
  const previousEnvironment = Object.fromEntries(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  t.after(() => {
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const options = { date, lang: "en", source: "all" };
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const before = readFileSync(statePath, "utf8");

  const preview = await previewContainmentAction(
    "start_expedition",
    options,
  );
  assert.equal(preview.available, true);
  assert.equal(preview.choices.length, 4);
  assert.match(preview.title, /START CONTAINMENT EXPEDITION/);
  assert.equal(readFileSync(statePath, "utf8"), before);

  const started = await executeContainmentAction(
    "start_expedition",
    { ...options, choice: "cache_swamp" },
  );
  assert.equal(started.status, "completed");
  assert.equal(started.snapshot.expedition.active.destinationId, "cache_swamp");
  assert.equal(started.snapshot.navigation.length, 5);
  assert.equal(started.snapshot.navigation[2].id, "expedition");

  const nextPreview = await previewContainmentAction(
    "advance_expedition",
    options,
  );
  assert.equal(nextPreview.available, true);
  assert.equal(nextPreview.choices.length, 0);
  assert.match(nextPreview.warning, /cannot be rerolled/i);
  const advanced = await executeContainmentAction(
    "advance_expedition",
    options,
  );
  assert.equal(advanced.status, "completed");
  assert.equal(advanced.snapshot.expedition.active.step, 1);
});

test("the expedition share card is read-only and omits local accounting details", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-expedition-share-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const date = "2026-08-15";
  writeCodexUsage(
    root,
    [{ input_tokens: 900, output_tokens: 100, total_tokens: 1_000 }],
    date,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "expedition-share",
  };
  assert.equal(
    runCli(["creature", "--date", date, "--json"], env).status,
    0,
  );
  assert.equal(
    runCli(
      ["expedition", "start", "cache_swamp", "--date", date, "--json"],
      env,
    ).status,
    0,
  );
  assert.equal(
    runCli(["expedition", "next", "--date", date, "--json"], env).status,
    0,
  );
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const before = readFileSync(statePath, "utf8");

  const card = runCli(
    ["share", "--card", "expedition", "--date", date, "--lang", "en"],
    env,
  );
  assert.equal(card.status, 0, card.stderr);
  assert.match(card.stdout, /^<svg/u);
  assert.match(card.stdout, /CONTAINMENT EXPEDITION/u);
  assert.match(card.stdout, /CACHE SWAMP/u);
  assert.match(card.stdout, /CELL 1 \/ 10/u);
  assert.match(card.stdout, /\[@\].*\[\?\]/u);
  assert.match(
    card.stdout,
    /<text x="72" y="210"[^>]*><tspan x="72" dy="0">[^<]+<\/tspan><tspan x="72" dy="22">[^<]+<\/tspan><\/text>/u,
  );
  assert.match(
    card.stdout,
    /<text x="72" y="264" class="mono accent" font-size="20">/u,
  );
  assert.doesNotMatch(
    card.stdout,
    /1,000|"(?:totalTokens|inputTokens|outputTokens|model|source|prompt|response)"|mutation-test|\/Users\//iu,
  );
  assert.equal(readFileSync(statePath, "utf8"), before);
});

test("a resumed expedition can export its return card on an unsettled completion date", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-expedition-resumed-share-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-08-16";
  const completionDate = "2026-08-17";
  writeCodexUsage(
    root,
    [{ input_tokens: 900, output_tokens: 100, total_tokens: 1_000 }],
    startDate,
  );
  const environment = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "expedition-resumed-share",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], environment).status,
    0,
  );
  assert.equal(
    runCli(
      ["expedition", "start", "context_mine", "--date", startDate, "--json"],
      environment,
    ).status,
    0,
  );
  let completed = null;
  for (let index = 0; index < 10; index += 1) {
    const advanced = runCli(
      ["expedition", "next", "--date", completionDate, "--json"],
      environment,
    );
    assert.equal(advanced.status, 0, advanced.stderr);
    let status = JSON.parse(advanced.stdout);
    if (status.active?.pendingChoice) {
      const chosen = runCli(
        ["expedition", "choose", "2", "--date", completionDate, "--json"],
        environment,
      );
      assert.equal(chosen.status, 0, chosen.stderr);
      status = JSON.parse(chosen.stdout);
    }
    completed = status.latest;
  }
  assert.equal(completed.completedAt, completionDate);

  const previousEnvironment = Object.fromEntries(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  t.after(() => {
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const before = readFileSync(statePath, "utf8");
  const controller = createTuiShareController(
    { lang: "en" },
    { outputDirectory: workspace },
  );
  const preview = await controller.preview({
    screen: "expedition",
    date: completionDate,
  });

  assert.equal(preview.available, true);
  assert.equal(preview.card, "expedition");
  assert.equal(preview.date, completionDate);
  const card = runCli(
    ["share", "--card", "expedition", "--date", completionDate, "--lang", "en"],
    environment,
  );
  assert.equal(card.status, 0, card.stderr);
  assert.match(card.stdout, /RETURN DIAGNOSIS/u);
  assert.match(card.stdout, /EVENT TRAIL/u);
  assert.equal(readFileSync(statePath, "utf8"), before);
});

test("historical expedition views never reveal runs or cards from a later date", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-expedition-history-date-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const earlierDate = "2026-08-18";
  const laterDate = "2026-08-19";
  writeCodexUsage(
    root,
    [{ input_tokens: 300, output_tokens: 30, total_tokens: 330 }],
    earlierDate,
  );
  writeCodexUsage(
    root,
    [{ input_tokens: 500, output_tokens: 50, total_tokens: 550 }],
    laterDate,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "expedition-history-date",
  };
  assert.equal(
    runCli(["creature", "--date", laterDate, "--json"], env).status,
    0,
  );
  assert.equal(
    runCli(
      ["expedition", "start", "context_mine", "--date", laterDate, "--json"],
      env,
    ).status,
    0,
  );
  for (let step = 0; step < 10; step += 1) {
    const advanced = runCli(
      ["expedition", "next", "--date", laterDate, "--json"],
      env,
    );
    assert.equal(advanced.status, 0, advanced.stderr);
    const run = JSON.parse(advanced.stdout).active ?? JSON.parse(advanced.stdout).latest;
    if (run.pendingChoice) {
      const chosen = runCli(
        ["expedition", "choose", "2", "--date", laterDate, "--json"],
        env,
      );
      assert.equal(chosen.status, 0, chosen.stderr);
    }
  }

  const status = runCli(
    ["expedition", "--date", earlierDate, "--json"],
    env,
  );
  assert.equal(status.status, 0, status.stderr);
  assert.deepEqual(JSON.parse(status.stdout), {
    version: 1,
    date: earlierDate,
    eligibility: {
      available: false,
      reason: "expired",
      experienceDays: 1,
      lastStartedExperienceDay: 0,
    },
    active: null,
    latest: null,
    totals: { started: 0, completed: 0, abandoned: 0 },
  });

  const history = runCli(
    ["expedition", "history", "--date", earlierDate, "--json"],
    env,
  );
  assert.equal(history.status, 0, history.stderr);
  assert.deepEqual(JSON.parse(history.stdout).records, []);

  const share = runCli(
    ["share", "--card", "expedition", "--date", earlierDate],
    env,
  );
  assert.equal(share.status, 2);
  assert.match(share.stderr, /没有可分享的远征记录/);
});

test("skipped expedition opportunities never accumulate into historical runs", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-expedition-nonstacking-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const earlierDate = "2026-08-20";
  const currentDate = "2026-08-21";
  writeCodexUsage(
    root,
    [{ input_tokens: 300, output_tokens: 30, total_tokens: 330 }],
    earlierDate,
  );
  writeCodexUsage(
    root,
    [{ input_tokens: 400, output_tokens: 40, total_tokens: 440 }],
    currentDate,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "expedition-nonstacking",
  };
  assert.equal(
    runCli(["creature", "--date", currentDate, "--json"], env).status,
    0,
  );

  const expired = runCli(
    ["expedition", "start", "cache_swamp", "--date", earlierDate],
    env,
  );
  assert.equal(expired.status, 2);
  assert.match(expired.stderr, /过去阅历日的远征机会不会累计/);

  const current = runCli(
    ["expedition", "start", "cache_swamp", "--date", currentDate, "--json"],
    env,
  );
  assert.equal(current.status, 0, current.stderr);
  assert.equal(JSON.parse(current.stdout).active.sourceExperienceDay, 2);
});

test("an expedition cannot write events or abandonment before its last action date", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-expedition-date-order-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const date = "2026-08-22";
  const earlierDate = "2026-08-21";
  writeCodexUsage(
    root,
    [{ input_tokens: 400, output_tokens: 40, total_tokens: 440 }],
    date,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "expedition-date-order",
  };
  assert.equal(runCli(["creature", "--date", date, "--json"], env).status, 0);
  assert.equal(
    runCli(
      ["expedition", "start", "request_nest", "--date", date, "--json"],
      env,
    ).status,
    0,
  );
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const before = readFileSync(statePath, "utf8");
  const preview = await previewContainmentAction(
    "advance_expedition",
    { date: earlierDate, lang: "zh" },
    { state: JSON.parse(before) },
  );
  assert.equal(preview.available, false);
  assert.equal(preview.reason, "expedition_date_before_last_action");

  for (const action of ["next", "abandon"]) {
    const result = runCli(
      ["expedition", action, "--date", earlierDate],
      env,
    );
    assert.equal(result.status, 2);
    assert.match(result.stderr, /不能早于远征最近一次操作日期/);
    assert.equal(readFileSync(statePath, "utf8"), before);
  }

  const advanced = runCli(
    ["expedition", "next", "--date", date, "--json"],
    env,
  );
  assert.equal(advanced.status, 0, advanced.stderr);
  assert.equal((JSON.parse(advanced.stdout).active ?? JSON.parse(advanced.stdout).latest).step, 1);
});

test("heavy use and an AI-free day receive the same expedition sequence and collection odds", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-expedition-guardrail-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const startDate = "2026-08-16";
  const date = shiftTestDate(startDate, 1);
  const highRoot = path.join(workspace, "high-codex");
  const quietRoot = path.join(workspace, "quiet-codex");
  const commonUsage = [{
    input_tokens: 500,
    output_tokens: 50,
    total_tokens: 550,
  }];
  writeCodexUsage(highRoot, commonUsage, startDate);
  writeCodexUsage(quietRoot, commonUsage, startDate);
  writeCodexUsage(
    highRoot,
    [{
      input_tokens: 20_000_000,
      output_tokens: 1_000_000,
      total_tokens: 21_000_000,
    }],
    date,
  );
  const highEnv = {
    HOME: path.join(workspace, "high-home"),
    ANTI_AI_CODEX_DIR: highRoot,
    ANTI_AI_CREATURE_SEED: "expedition-equal-odds",
  };
  const quietEnv = {
    HOME: path.join(workspace, "quiet-home"),
    ANTI_AI_CODEX_DIR: quietRoot,
    ANTI_AI_CREATURE_SEED: "expedition-equal-odds",
  };
  for (const env of [highEnv, quietEnv]) {
    const creature = runCli(["creature", "--date", date, "--json"], env);
    assert.equal(creature.status, 0, creature.stderr);
    assert.equal(JSON.parse(creature.stdout).experienceDays, 2);
    assert.equal(
      runCli(
        ["expedition", "start", "reactor_graveyard", "--date", date, "--json"],
        env,
      ).status,
      0,
    );
  }

  function finish(env) {
    let latest = null;
    for (let step = 0; step < 10; step += 1) {
      const advanced = runCli(
        ["expedition", "next", "--date", date, "--json"],
        env,
      );
      assert.equal(advanced.status, 0, advanced.stderr);
      const status = JSON.parse(advanced.stdout);
      const record = status.active ?? status.latest;
      if (record.pendingChoice) {
        const chosen = runCli(
          ["expedition", "choose", "2", "--date", date, "--json"],
          env,
        );
        assert.equal(chosen.status, 0, chosen.stderr);
        latest = JSON.parse(chosen.stdout).active ?? JSON.parse(chosen.stdout).latest;
      } else {
        latest = record;
      }
    }
    return latest;
  }

  const high = finish(highEnv);
  const quiet = finish(quietEnv);
  assert.deepEqual(
    high.events.map(({ id, type, artifactId = null }) => ({ id, type, artifactId })),
    quiet.events.map(({ id, type, artifactId = null }) => ({ id, type, artifactId })),
  );
  assert.deepEqual(high.artifactIds, quiet.artifactIds);
  assert.deepEqual(high.permanentEffect, quiet.permanentEffect);
  assert.deepEqual(high.achievementIds, quiet.achievementIds);
});
