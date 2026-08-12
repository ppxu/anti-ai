import {
  assert,
  mkdirSync,
  mkdtempSync,
  path,
  readFileSync,
  rmSync,
  spawnSync,
  test,
  tmpdir,
  writeFileSync,
  projectDir,
  runCli,
  terminalWidth,
  writeCodexUsage,
} from "./helpers.mjs";
import { pathToFileURL } from "node:url";
import { chmodSync } from "node:fs";

import { build } from "esbuild";
import { render } from "ink-testing-library";
import React from "react";

import { deriveTuiSnapshot } from "../src/application/tui.mjs";
import {
  applyContainmentAction,
  createContainmentSession,
  executeContainmentAction,
  previewContainmentAction,
} from "../src/application/actions.mjs";
import { createTuiShareController } from "../src/application/share-export.mjs";

async function waitForFrame(screen, pattern, options = {}) {
  const { absent = false, timeout = 1_000 } = options;
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const frame = screen.lastFrame();
    if (pattern.test(frame) === !absent) return frame;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const frame = screen.lastFrame();
  if (absent) assert.doesNotMatch(frame, pattern);
  else assert.match(frame, pattern);
  return frame;
}

test("the TUI snapshot unifies five product areas without mutating state", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-model-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });

  const settled = runCli(["creature", "--date", "2026-07-23", "--json"], {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "tui-model-seed",
  });
  assert.equal(settled.status, 0, settled.stderr);

  const state = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  const original = JSON.stringify(state);
  const snapshot = deriveTuiSnapshot(state, "2026-07-23", "zh");

  assert.equal(snapshot.version, 3);
  assert.equal(snapshot.date, "2026-07-23");
  assert.equal(snapshot.readOnly, true);
  assert.deepEqual(
    snapshot.navigation.map(({ id }) => id),
    ["overview", "habitat", "expedition", "laboratory", "codex"],
  );
  assert.equal(snapshot.overview.status, "active");
  assert.equal(snapshot.overview.experienceDays, 1);
  assert.ok(snapshot.overview.title.length > 0);
  assert.ok(snapshot.overview.art.length >= 8);
  assert.equal(snapshot.habitat.companion, null);
  assert.ok(snapshot.habitat.scene.name.length > 0);
  assert.ok(snapshot.habitat.scene.climate.length > 0);
  assert.ok(snapshot.habitat.scene.bulletin.length > 0);
  assert.equal(snapshot.habitat.scene.art.length, 3);
  assert.equal(snapshot.laboratory.cultures, 0);
  assert.equal(snapshot.codex.fixed.total, 134);
  assert.equal(snapshot.codex.categories[0].entries.length, 16);
  assert.match(snapshot.codex.categories[0].entries[0].key, /^form:/);
  assert.ok(
    snapshot.codex.categories[0].entries.some(
      (entry) => !entry.discovered && entry.label === "???",
    ),
  );
  assert.deepEqual(snapshot.codex.cabinet.slots, [null, null, null]);
  assert.deepEqual(snapshot.codex.archive.availableSpans, [7, 30]);
  assert.equal(snapshot.codex.archive.defaultSpan, 7);
  assert.equal(snapshot.codex.archive.days.length, 1);
  assert.equal(snapshot.codex.archive.days[0].date, "2026-07-23");
  assert.equal(snapshot.codex.archive.days[0].status, "active");
  assert.ok(snapshot.overview.brief.nextMilestone.remainingDays >= 0);
  const discoveredEntry = snapshot.codex.categories
    .flatMap((category) => category.entries)
    .find((entry) => entry.discovered);
  const lockedEntry = snapshot.codex.categories
    .flatMap((category) => category.entries)
    .find((entry) => !entry.discovered);
  assert.equal(discoveredEntry.provenance.firstDiscoveredAt, "2026-07-23");
  assert.ok(discoveredEntry.provenance.sourceType.length > 0);
  assert.deepEqual(discoveredEntry.cabinet, {
    displayed: false,
    slot: null,
  });
  assert.equal(lockedEntry.provenance, null);
  assert.deepEqual(
    snapshot.overview.actions.map(({ id }) => id),
    ["start_expedition", "observe_specimen"],
  );
  assert.ok(snapshot.expedition.destinations.every(({ mood }) => mood.length > 0));
  assert.equal(
    snapshot.actions.find(({ id }) => id === "start_expedition").execution,
    "direct",
  );
  assert.equal(
    snapshot.actions.find(({ id }) => id === "choose_expedition").execution,
    "select",
  );
  assert.equal(
    snapshot.actions.find(({ id }) => id === "abandon_expedition").execution,
    "confirm",
  );
  assert.equal(JSON.stringify(state), original);
});

test("the 80-column TUI starts and advances an expedition with one Enter per ordinary step", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-expedition-"));
  const buildDirectory = mkdtempSync(
    path.join(projectDir, ".anti-ai-tui-expedition-test-"),
  );
  t.after(() => {
    rmSync(workspace, { recursive: true, force: true });
    rmSync(buildDirectory, { recursive: true, force: true });
  });
  const home = path.join(workspace, "home");
  const codex = path.join(workspace, "codex");
  const date = "2026-08-14";
  writeCodexUsage(
    codex,
    [{ input_tokens: 900, output_tokens: 100, total_tokens: 1_000 }],
    date,
  );
  const environment = {
    HOME: home,
    ANTI_AI_CODEX_DIR: codex,
    ANTI_AI_CREATURE_SEED: "tui-expedition-seed",
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
  const session = await createContainmentSession({
    date,
    lang: "zh",
    source: "all",
  });
  let directExecutions = 0;
  const actionController = {
    ...session.actionController,
    execute: async (...args) => {
      directExecutions += 1;
      await new Promise((resolve) => setImmediate(resolve));
      return session.actionController.execute(...args);
    },
  };
  const output = path.join(buildDirectory, "app.mjs");
  await build({
    entryPoints: [path.join(projectDir, "src", "tui", "app.jsx")],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["ink", "react"],
  });
  const { TuiApp } = await import(pathToFileURL(output).href);
  const screen = render(
    React.createElement(TuiApp, {
      snapshot: session.snapshot,
      lang: "zh",
      initialMotion: "off",
      actionController,
      terminalColumns: 80,
    }),
  );
  t.after(() => screen.unmount());

  screen.stdin.write("\r");
  await waitForFrame(screen, /收容远征/u);
  assert.match(screen.lastFrame(), /上下文矿井/u);
  assert.match(screen.lastFrame(), /反应堆墓场/u);
  assert.ok(
    screen.lastFrame().split("\n").every((line) => terminalWidth(line) <= 80),
  );

  screen.stdin.write("\r");
  screen.stdin.write("\r");
  await waitForFrame(screen, /第 0 \/ 10 格/u);
  assert.equal(directExecutions, 1);
  assert.doesNotMatch(screen.lastFrame(), /影响预览|协议执行完成/u);
  assert.match(screen.lastFrame(), /\[@\].*\[\?\]/u);

  screen.stdin.write("\r");
  await waitForFrame(screen, /第 1 \/ 10 格/u);
  assert.doesNotMatch(screen.lastFrame(), /影响预览|协议执行完成/u);
  assert.match(screen.lastFrame(), /最近事件/u);

  screen.stdin.write("q");
  await waitForFrame(screen, /每日收容播报/u);
  screen.stdin.write("a");
  await waitForFrame(screen, /行动中心/u);
  screen.stdin.write("\r");
  await waitForFrame(screen, /第 1 \/ 10 格/u);
  assert.doesNotMatch(screen.lastFrame(), /影响预览/u);

  for (let actions = 0; actions < 14; actions += 1) {
    if (/最近返航/u.test(screen.lastFrame())) break;
    const frameBefore = screen.lastFrame();
    const stepBefore = Number(frameBefore.match(/第 (\d+) \/ 10 格/u)?.[1] ?? 0);
    const branchPending = /当前分叉待处理/u.test(frameBefore);
    if (branchPending) {
      assert.match(frameBefore, /1\..*2\..*3\./su);
      assert.doesNotMatch(
        frameBefore,
        /\b(?:appetite|memory|shell|mouths|glow|instability|withdrawal)\b/u,
      );
    }
    screen.stdin.write("\r");
    if (branchPending) {
      await waitForFrame(screen, /当前分叉待处理/u, { absent: true });
    } else if (stepBefore < 9) {
      await waitForFrame(screen, new RegExp(`第 ${stepBefore + 1} / 10 格`, "u"));
    } else {
      await waitForFrame(screen, /最近返航/u);
    }
    assert.doesNotMatch(screen.lastFrame(), /影响预览|协议执行完成/u);
  }
  assert.match(screen.lastFrame(), /最近返航/u);
  assert.match(screen.lastFrame(), /COMPLETED/u);
  assert.match(screen.lastFrame(), /返航总结/u);
  assert.match(screen.lastFrame(), /事件轨迹/u);
  assert.match(screen.lastFrame(), /返航诊断/u);
  assert.ok(
    screen.lastFrame().split("\n").every((line) => terminalWidth(line) <= 80),
  );

  const completedState = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  const englishScreen = render(
    React.createElement(TuiApp, {
      snapshot: deriveTuiSnapshot(completedState, date, "en"),
      lang: "en",
      initialMotion: "off",
      terminalColumns: 80,
    }),
  );
  t.after(() => englishScreen.unmount());
  englishScreen.stdin.write("3");
  await waitForFrame(englishScreen, /RETURN SUMMARY/u);
  assert.match(englishScreen.lastFrame(), /EVENT TRAIL/u);
  assert.match(englishScreen.lastFrame(), /RETURN DIAGNOSIS/u);
  assert.doesNotMatch(englishScreen.lastFrame(), /[\p{Script=Han}]/u);
  assert.ok(
    englishScreen
      .lastFrame()
      .split("\n")
      .every((line) => terminalWidth(line) <= 80),
  );

  const nextDateScreen = render(
    React.createElement(TuiApp, {
      snapshot: deriveTuiSnapshot(completedState, "2026-08-15", "zh"),
      lang: "zh",
      initialMotion: "off",
      terminalColumns: 80,
    }),
  );
  t.after(() => nextDateScreen.unmount());
  nextDateScreen.stdin.write("3");
  await waitForFrame(nextDateScreen, /今日远征可用/u);
  assert.doesNotMatch(nextDateScreen.lastFrame(), /先结算|阅历日机会/u);
});

test("TUI sharing previews a private local target before exporting SVG", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-share-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  const outputDirectory = path.join(workspace, "exports");
  mkdirSync(home, { recursive: true });
  mkdirSync(outputDirectory, { recursive: true });
  const environment = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "tui-share-seed",
  };
  assert.equal(
    runCli(["creature", "--date", "2026-07-23", "--json"], environment)
      .status,
    0,
  );
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const original = readFileSync(statePath, "utf8");
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
  const controller = createTuiShareController(
    { lang: "en" },
    { outputDirectory },
  );

  const preview = await controller.preview({
    screen: "overview",
    date: "2026-07-23",
  });

  assert.equal(preview.card, "briefing");
  assert.equal(preview.filename, "anti-ai-briefing-2026-07-23.svg");
  assert.equal(preview.privacy, "LOCAL ONLY · NO CHATS, PATHS, MODELS, OR EXACT TOKENS");
  assert.equal(
    preview.warning,
    "Confirmation creates a new SVG in the current directory; existing files are never overwritten.",
  );
  assert.equal(readFileSync(statePath, "utf8"), original);
  assert.equal(
    spawnSync("test", ["-e", preview.targetPath]).status,
    1,
  );

  const result = await controller.execute(preview);
  assert.equal(result.status, "completed");
  const exported = readFileSync(result.targetPath, "utf8");
  assert.match(exported, /^<svg/u);
  const cliShare = runCli(
    ["share", "--card", "briefing", "--date", "2026-07-23", "--lang", "en"],
    environment,
  );
  assert.equal(cliShare.status, 0, cliShare.stderr);
  assert.equal(exported, cliShare.stdout);
  assert.equal(readFileSync(statePath, "utf8"), original);

  const unsettled = await controller.preview({
    screen: "overview",
    date: "2026-07-24",
  });
  assert.equal(unsettled.available, false);
  assert.equal(unsettled.reason, "date_not_settled");

  const collision = await controller.preview({
    screen: "overview",
    date: "2026-07-23",
  });
  const previewedCollisionPath = collision.targetPath;
  writeFileSync(previewedCollisionPath, "existing export", "utf8");
  collision.targetPath = path.join(outputDirectory, "unpreviewed.svg");
  const refused = await controller.execute(collision);
  assert.equal(refused.status, "failed");
  assert.equal(refused.reason, "share_target_exists");
  assert.match(refused.reasonLabel, /target file already exists/iu);
  assert.equal(readFileSync(previewedCollisionPath, "utf8"), "existing export");
  assert.equal(spawnSync("test", ["-e", collision.targetPath]).status, 1);
  assert.equal(readFileSync(statePath, "utf8"), original);

  const permissionPreview = await controller.preview({
    screen: "overview",
    date: "2026-07-23",
  });
  chmodSync(outputDirectory, 0o500);
  const permissionFailure = await controller.execute(permissionPreview);
  chmodSync(outputDirectory, 0o700);
  assert.equal(permissionFailure.status, "failed");
  assert.equal(permissionFailure.reason, "share_directory_not_writable");
  assert.match(permissionFailure.reasonLabel, /target directory is not writable/iu);
  assert.match(permissionFailure.reasonLabel, new RegExp(outputDirectory, "u"));
});

test("the consequence cabinet and daily interactions persist only explicit narrative choices", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-cabinet-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  const codex = path.join(workspace, "codex");
  writeCodexUsage(codex, [
    {
      input_tokens: 2_000,
      cached_input_tokens: 500,
      output_tokens: 200,
      total_tokens: 2_200,
    },
  ]);
  const environment = {
    HOME: home,
    ANTI_AI_CODEX_DIR: codex,
    ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
    ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
    ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
    ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
    ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
    ANTI_AI_CREATURE_SEED: "tui-cabinet-seed",
  };
  assert.equal(
    runCli(["creature", "--date", "2026-07-23", "--json"], environment).status,
    0,
  );
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const before = JSON.parse(readFileSync(statePath, "utf8"));
  const beforeDay = structuredClone(before.days["2026-07-23"]);
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

  const initial = deriveTuiSnapshot(before, "2026-07-23", "zh");
  const displayKey = initial.codex.categories
    .flatMap((category) => category.entries)
    .find((entry) => entry.discovered).key;
  const displayPreview = await previewContainmentAction("curate_display", {
    date: "2026-07-23",
    lang: "zh",
    target: displayKey,
  });
  assert.deepEqual(displayPreview.choices.map(({ id }) => id), [displayKey]);
  const displayed = await executeContainmentAction("curate_display", {
    date: "2026-07-23",
    lang: "zh",
    choice: displayKey,
  });
  assert.equal(displayed.status, "completed");
  assert.equal(displayed.snapshot.codex.cabinet.slots[0].key, displayKey);
  assert.equal(displayed.snapshot.habitat.cabinet.slots[0].key, displayKey);

  const observed = await executeContainmentAction("observe_specimen", {
    date: "2026-07-23",
    lang: "zh",
    choice: "specimen",
  });
  const contacted = await executeContainmentAction("contact_specimen", {
    date: "2026-07-23",
    lang: "zh",
    choice: "glass",
  });
  assert.equal(observed.status, "completed");
  assert.equal(contacted.status, "completed");
  assert.match(observed.message, /观察记录/);
  assert.match(contacted.message, /接触记录/);

  const repeated = await executeContainmentAction("observe_specimen", {
    date: "2026-07-23",
    lang: "zh",
    choice: "specimen",
  });
  assert.equal(repeated.status, "unavailable");
  assert.equal(repeated.reason, "already_observed");

  const after = JSON.parse(readFileSync(statePath, "utf8"));
  assert.equal(after.schemaVersion, 14);
  assert.equal(after.cabinet.featured[0], displayKey);
  assert.equal(after.days["2026-07-23"].interactions.observe.targetId, "specimen");
  assert.equal(after.days["2026-07-23"].interactions.contact.targetId, "glass");
  const { interactions, ...afterDay } = after.days["2026-07-23"];
  assert.deepEqual(afterDay, beforeDay);
  const afterSnapshot = deriveTuiSnapshot(after, "2026-07-23", "zh");
  assert.deepEqual(
    afterSnapshot.codex.archive.days[0].activities
      .filter(({ type }) => type === "interaction")
      .map(({ label }) => label),
    ["今日观察已封存", "今日接触已封存"],
  );
  assert.deepEqual(afterSnapshot.habitat.scene.layers.trace, {
    type: "interaction",
    id: `contact:glass:${after.days["2026-07-23"].interactions.contact.reactionId}`,
    date: "2026-07-23",
    label: "今日轻接触",
  });

  const habitat = runCli(
    ["creature", "habitat", "--date", "2026-07-23"],
    environment,
  );
  const habitatJson = runCli(
    ["creature", "habitat", "--date", "2026-07-23", "--json"],
    environment,
  );
  const habitatCard = runCli(
    ["share", "--card", "habitat", "--date", "2026-07-23"],
    environment,
  );
  assert.equal(habitat.status, 0, habitat.stderr);
  assert.match(habitat.stdout, /后果陈列柜[\s\S]*1\. 形态/u);
  assert.deepEqual(JSON.parse(habitatJson.stdout).cabinet.featured, [displayKey]);
  assert.match(habitatCard.stdout, /后果陈列柜/u);
  assert.match(habitatCard.stdout, /form #[^<]+/u);
});

test("the TUI distinguishes a settled AI-free day from an unsettled date", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-status-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  const settled = runCli(["creature", "--date", "2026-07-25", "--json"], {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "tui-status-seed",
  });
  assert.equal(settled.status, 0, settled.stderr);
  const state = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );

  const quiet = deriveTuiSnapshot(state, "2026-07-25", "zh");
  const awaiting = deriveTuiSnapshot(state, "2026-07-26", "en");

  assert.equal(quiet.overview.status, "quiet");
  assert.match(quiet.overview.statusLabel, /AI 清醒日已结算/);
  assert.equal(awaiting.overview.status, "awaiting");
  assert.equal(awaiting.overview.statusLabel, "DATE NOT SETTLED");
  assert.equal(awaiting.primaryAction.id, "settle_today");
  assert.equal(awaiting.primaryAction.available, true);
  assert.deepEqual(
    awaiting.actions.map(({ id, available, reason }) => ({
      id,
      available,
      reason,
    })),
    [
      { id: "settle_today", available: true, reason: null },
      { id: "resolve_incident", available: false, reason: "no_pending_incident" },
      { id: "choose_intervention", available: false, reason: "no_pending_case" },
      { id: "choose_evolution", available: false, reason: "no_pending_evolution" },
      { id: "start_expedition", available: true, reason: null },
      { id: "advance_expedition", available: false, reason: "no_active_expedition" },
      { id: "choose_expedition", available: false, reason: "no_expedition_choice" },
      { id: "abandon_expedition", available: false, reason: "no_active_expedition" },
      { id: "observe_specimen", available: false, reason: "date_not_settled" },
      { id: "contact_specimen", available: false, reason: "date_not_settled" },
      { id: "curate_display", available: true, reason: null },
      { id: "incubate", available: false, reason: "no_material" },
      { id: "bond", available: false, reason: "no_culture" },
    ],
  );
  assert.equal(quiet.actions[0].available, false);
  assert.equal(quiet.actions[0].reason, "already_settled");
});

test("the settle action previews without writing and executes one shared settlement", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-settle-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  const codex = path.join(workspace, "codex");
  const statePath = path.join(home, ".anti-ai", "creature.json");
  writeCodexUsage(codex, [
    {
      input_tokens: 2_000,
      cached_input_tokens: 500,
      output_tokens: 200,
      total_tokens: 2_200,
    },
  ]);
  const environment = {
    HOME: home,
    ANTI_AI_CODEX_DIR: codex,
    ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
    ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
    ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
    ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
    ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
    ANTI_AI_CREATURE_SEED: "tui-settle-seed",
  };
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

  const preview = await previewContainmentAction("settle_today", {
    date: "2026-07-23",
    lang: "en",
    source: "all",
  });

  assert.equal(preview.id, "settle_today");
  assert.equal(preview.available, true);
  assert.equal(preview.impact.totalTokens, 2_200);
  assert.equal(preview.impact.activeSources, 1);
  assert.equal(preview.choices.length, 0);
  assert.throws(() => readFileSync(statePath, "utf8"), { code: "ENOENT" });

  const completed = await executeContainmentAction("settle_today", {
    date: "2026-07-23",
    lang: "en",
    source: "all",
  });
  assert.equal(completed.status, "completed");
  assert.equal(completed.snapshot.overview.status, "active");
  assert.equal(completed.snapshot.actions[0].reason, "already_settled");
  assert.equal(
    JSON.parse(readFileSync(statePath, "utf8")).days["2026-07-23"].active,
    true,
  );
});

test("a first-run containment session preserves one specimen identity from preview through execution", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-first-run-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const environment = {
    HOME: path.join(workspace, "home"),
    ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
    ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
    ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
    ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
    ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
    ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
  };
  const trackedKeys = [...Object.keys(environment), "ANTI_AI_CREATURE_SEED"];
  const previousEnvironment = Object.fromEntries(
    trackedKeys.map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  delete process.env.ANTI_AI_CREATURE_SEED;
  t.after(() => {
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const session = await createContainmentSession({
    date: "2026-07-23",
    lang: "zh",
    source: "all",
  });
  const initialSpecimenId = session.snapshot.overview.specimenId;
  await session.actionController.preview("settle_today");
  const completed = await session.actionController.execute("settle_today");

  assert.equal(completed.status, "completed");
  assert.equal(completed.snapshot.overview.specimenId, initialSpecimenId);
});

test("a stale containment session reloads the latest file instead of keeping a partial action", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-stale-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  const environment = {
    HOME: home,
    ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
    ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
    ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
    ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
    ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
    ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
    ANTI_AI_CREATURE_SEED: "tui-stale-seed",
  };
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

  const session = await createContainmentSession({
    date: "2026-07-23",
    lang: "en",
    source: "all",
  });
  const external = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    environment,
  );
  assert.equal(external.status, 0, external.stderr);

  const result = await session.actionController.execute("settle_today");
  assert.equal(result.status, "failed");
  assert.equal(result.reason, "state_conflict");
  assert.equal(result.snapshot.actions[0].reason, "already_settled");
  assert.match(result.reasonLabel, /another process updated/i);
});

test("choice actions preview stable options and execute incidents, intervention, evolution, incubation, and bonding", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-actions-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  const codex = path.join(workspace, "codex");
  const startDate = "2026-01-01";
  const endDate = "2026-03-31";
  writeCodexUsage(
    codex,
    [
      {
        input_tokens: 5_000_000,
        cached_input_tokens: 0,
        output_tokens: 100,
        total_tokens: 5_000_100,
      },
    ],
    startDate,
  );
  const environment = {
    HOME: home,
    ANTI_AI_CODEX_DIR: codex,
    ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
    ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
    ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
    ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
    ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
    ANTI_AI_CREATURE_SEED: "tui-choice-seed",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], environment).status,
    0,
  );
  assert.equal(
    runCli(["creature", "--date", endDate, "--json"], environment).status,
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
  const options = { date: endDate, lang: "en", source: "all" };

  const incident = await previewContainmentAction(
    "resolve_incident",
    options,
  );
  assert.deepEqual(
    incident.choices.map(({ id, stance }) => ({ id, stance })),
    [
      { id: "1", stance: "quarantine" },
      { id: "2", stance: "observe" },
      { id: "3", stance: "resonate" },
    ],
  );
  const incidentResolved = await executeContainmentAction(
    "resolve_incident",
    { ...options, choice: "3" },
  );
  assert.equal(incidentResolved.status, "completed");
  assert.equal(incidentResolved.result.selected.stance, "resonate");

  const intervention = await previewContainmentAction(
    "choose_intervention",
    options,
  );
  assert.deepEqual(
    intervention.choices.map(({ id, route }) => ({ id, route })),
    [
      { id: "1", route: "pollution" },
      { id: "2", route: "clarity" },
      { id: "3", route: "paradox" },
    ],
  );
  const intervened = await executeContainmentAction(
    "choose_intervention",
    { ...options, choice: "2" },
  );
  assert.equal(intervened.status, "completed");
  assert.equal(intervened.result.selected.route, "clarity");

  const evolution = await previewContainmentAction(
    "choose_evolution",
    options,
  );
  assert.deepEqual(
    evolution.choices.map(({ id, category }) => ({ id, category })),
    [
      { id: "1", category: "pollution" },
      { id: "2", category: "clarity" },
      { id: "3", category: "paradox" },
    ],
  );
  const evolved = await executeContainmentAction("choose_evolution", {
    ...options,
    choice: "2",
  });
  assert.equal(evolved.status, "completed");
  assert.equal(evolved.result.selected.category, "clarity");

  const incubation = await previewContainmentAction("incubate", options);
  assert.deepEqual(incubation.choices.map(({ id }) => id), ["1", "2", "3"]);
  const incubated = await executeContainmentAction("incubate", {
    ...options,
    choice: "1",
  });
  assert.equal(incubated.status, "completed");
  assert.equal(incubated.result.status, "incubated");

  const bonding = await previewContainmentAction("bond", options);
  assert.deepEqual(
    bonding.choices.map(({ id }) => id),
    [incubated.result.culture.id],
  );
  const bonded = await executeContainmentAction("bond", {
    ...options,
    choice: incubated.result.culture.id,
  });
  assert.equal(bonded.status, "completed");
  assert.equal(
    bonded.snapshot.habitat.companion.cultureId,
    incubated.result.culture.id,
  );
});

test("the containment console navigates all five product areas by keyboard", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-screen-"));
  const buildDirectory = mkdtempSync(
    path.join(projectDir, ".anti-ai-tui-test-"),
  );
  t.after(() => {
    rmSync(workspace, { recursive: true, force: true });
    rmSync(buildDirectory, { recursive: true, force: true });
  });
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  const settled = runCli(["creature", "--date", "2026-07-23", "--json"], {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "tui-screen-seed",
  });
  assert.equal(settled.status, 0, settled.stderr);
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const originalStateFile = readFileSync(statePath, "utf8");
  const state = JSON.parse(originalStateFile);
  const snapshot = deriveTuiSnapshot(state, "2026-07-23", "zh");
  snapshot.habitat.events = [
    {
      id: "cached-moon",
      name: "缓存月蚀",
      body: "旧上下文遮住了核心。",
      discoveredAt: "2026-07-23",
    },
  ];
  const output = path.join(buildDirectory, "app.mjs");
  await build({
    entryPoints: [path.join(projectDir, "src", "tui", "app.jsx")],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["ink", "react"],
  });
  const { TuiApp } = await import(pathToFileURL(output).href);
  const screen = render(
    React.createElement(TuiApp, {
      snapshot,
      lang: "zh",
      initialMotion: "off",
    }),
  );
  t.after(() => screen.unmount());

  assert.match(screen.lastFrame(), /收容控制台/u);
  assert.match(screen.lastFrame(), /每日收容播报/u);
  assert.match(screen.lastFrame(), /系统状态/u);
  assert.match(screen.lastFrame(), /建议处置/u);
  assert.match(screen.lastFrame(), /开启今日收容远征/u);
  assert.doesNotMatch(screen.lastFrame(), /异变年鉴/u);
  assert.doesNotMatch(screen.lastFrame(), /null/u);
  assert.match(screen.lastFrame(), /动态 关闭/u);
  const staticFrame = screen.lastFrame();
  await new Promise((resolve) => setTimeout(resolve, 450));
  assert.equal(screen.lastFrame(), staticFrame);

  screen.stdin.write("m");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /动态 低频/u);
  const lowMotionFrame = screen.lastFrame();
  await new Promise((resolve) => setTimeout(resolve, 450));
  assert.notEqual(screen.lastFrame(), lowMotionFrame);

  screen.stdin.write("2");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /活体生态舱/u);
  assert.match(screen.lastFrame(), /生态短讯/u);
  assert.match(screen.lastFrame(), new RegExp(snapshot.habitat.scene.name, "u"));
  assert.match(screen.lastFrame(), /伴生收容进度.*0 \/ 3/u);
  assert.match(screen.lastFrame(), /尚无培养原料/u);
  assert.match(screen.lastFrame(), /l 前往实验室/u);
  assert.match(screen.lastFrame(), /Enter 观察 · r 回放 · s 分享\s+q 退出/u);
  screen.stdin.write("\r");
  await waitForFrame(screen, /器官观察/u);
  assert.match(screen.lastFrame(), /监测复眼/u);
  screen.stdin.write("\u001B[B");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /请求口器/u);
  screen.stdin.write("\u001B");
  await waitForFrame(screen, /器官观察/u, { absent: true });
  assert.match(screen.lastFrame(), /活体生态舱/u);
  screen.stdin.write("r");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /事件回放/u);
  assert.match(screen.lastFrame(), /缓存月蚀/u);
  screen.stdin.write("r");
  await new Promise((resolve) => setImmediate(resolve));
  assert.doesNotMatch(screen.lastFrame(), /事件回放/u);
  screen.stdin.write("4");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /污染实验室/u);
  assert.match(screen.lastFrame(), /培养流程.*0 \/ 3/u);
  assert.match(screen.lastFrame(), /anti-ai encounter <污染编码> --save/u);
  screen.stdin.write("5");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /病理图鉴/u);
  screen.stdin.write("1");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /每日收容播报/u);
  screen.stdin.write("e");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /异变年鉴/u);
  assert.match(screen.lastFrame(), /今天可做/u);
  screen.stdin.write("e");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /每日收容播报/u);
  assert.doesNotMatch(screen.lastFrame(), /异变年鉴/u);
  screen.stdin.write("?");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /m.*动态档位/u);
  assert.match(screen.lastFrame(), /a.*收容协议行动中心/u);
  assert.match(screen.lastFrame(), /Tab.*切换区域或当前焦点/u);
  assert.match(screen.lastFrame(), /Enter.*处理当前主要行动/u);
  assert.match(screen.lastFrame(), /e.*展开或收起完整档案/u);
  assert.doesNotMatch(screen.lastFrame(), /回放最近事件/u);
  assert.equal(readFileSync(statePath, "utf8"), originalStateFile);
});

test("the Codex drills into discovered entries and opens display preview for the focused record", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-codex-ui-"));
  const buildDirectory = mkdtempSync(
    path.join(projectDir, ".anti-ai-tui-codex-test-"),
  );
  t.after(() => {
    rmSync(workspace, { recursive: true, force: true });
    rmSync(buildDirectory, { recursive: true, force: true });
  });
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  assert.equal(
    runCli(["creature", "--date", "2026-07-23", "--json"], {
      HOME: home,
      ANTI_AI_CREATURE_SEED: "tui-codex-ui-seed",
    }).status,
    0,
  );
  const state = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  const snapshot = deriveTuiSnapshot(state, "2026-07-23", "zh");
  let previewTarget = null;
  const actionController = {
    preview: async (id, target) => {
      previewTarget = target;
      const entry = snapshot.codex.categories
        .flatMap((category) => category.entries)
        .find((candidate) => candidate.key === target);
      return {
        ...snapshot.actions.find((action) => action.id === id),
        title: "调整后果陈列柜",
        summary: "将当前收藏放入展示位。",
        warning: "只改变展示，不改变成长。",
        irreversible: false,
        impact: { displaySlots: 3 },
        choices: [{ id: target, label: entry.label, detail: entry.detail }],
      };
    },
  };
  let shareExecutions = 0;
  const shareController = {
    preview: async (context) => ({
      available: true,
      context,
      card: "specimen",
      date: context.date,
      filename: "anti-ai-specimen-2026-07-23.svg",
      targetPath: path.join(workspace, "anti-ai-specimen-2026-07-23.svg"),
      privacy: "仅写入本地 · 不含对话、路径、模型名或精确 Token",
      title: "导出分享卡",
      warning: "确认后会新建 SVG。",
    }),
    execute: async (preview) => {
      shareExecutions += 1;
      return {
        status: "completed",
        filename: preview.filename,
        targetPath: preview.targetPath,
        message: `分享卡已保存：${preview.filename}`,
      };
    },
  };
  const output = path.join(buildDirectory, "app.mjs");
  await build({
    entryPoints: [path.join(projectDir, "src", "tui", "app.jsx")],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["ink", "react"],
  });
  const { TuiApp } = await import(pathToFileURL(output).href);
  const screen = render(
    React.createElement(TuiApp, {
      snapshot,
      lang: "zh",
      initialMotion: "off",
      actionController,
      shareController,
      terminalColumns: 80,
    }),
  );
  t.after(() => screen.unmount());

  screen.stdin.write("5");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /基础图鉴/u);
  assert.match(screen.lastFrame(), /个人收藏/u);
  assert.ok(
    screen.lastFrame().split("\n").every((line) => terminalWidth(line) <= 80),
  );
  screen.stdin.write("h");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /收容档案/u);
  assert.match(screen.lastFrame(), /最近 7 天/u);
  screen.stdin.write("t");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /最近 30 天/u);
  screen.stdin.write("\r");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /每日收容记录/u);
  assert.match(screen.lastFrame(), /病理变化/u);
  screen.stdin.write("\u001B");
  await waitForFrame(screen, /最近 30 天/u);
  screen.stdin.write("\u001B");
  await waitForFrame(screen, /病理图鉴/u);
  assert.match(screen.lastFrame(), /病理图鉴/u);
  screen.stdin.write("\r");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /收藏条目/u);
  assert.match(screen.lastFrame(), /\?\?\?/u);
  screen.stdin.write("\r");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /条目档案/u);
  assert.match(screen.lastFrame(), /发现于/u);
  assert.match(screen.lastFrame(), /来源/u);
  assert.match(screen.lastFrame(), /关联记录/u);
  assert.match(screen.lastFrame(), /陈列状态/u);
  assert.match(screen.lastFrame(), /d 陈列/u);
  assert.ok(
    screen.lastFrame().split("\n").every((line) => terminalWidth(line) <= 80),
  );
  screen.stdin.write("s");
  await waitForFrame(screen, /分享卡预览/u);
  assert.match(screen.lastFrame(), /anti-ai-specimen-2026-07-23\.svg/u);
  screen.stdin.write("y");
  await waitForFrame(screen, /分享卡已保存/u);
  assert.equal(shareExecutions, 1);
  screen.stdin.write("\r");
  await waitForFrame(screen, /条目档案/u);
  screen.stdin.write("d");
  await waitForFrame(screen, /影响预览 · 调整后果陈列柜/u);
  assert.match(previewTarget, /^form:/u);

  const englishSnapshot = deriveTuiSnapshot(state, "2026-07-23", "en");
  for (const terminalColumns of [80, 100]) {
    const englishScreen = render(
      React.createElement(TuiApp, {
        snapshot: englishSnapshot,
        lang: "en",
        initialMotion: "off",
        terminalColumns,
      }),
    );
    englishScreen.stdin.write("5");
    await new Promise((resolve) => setImmediate(resolve));
    englishScreen.stdin.write("h");
    await new Promise((resolve) => setImmediate(resolve));
    assert.match(englishScreen.lastFrame(), /CONTAINMENT ARCHIVE/u);
    assert.ok(
      englishScreen
        .lastFrame()
        .split("\n")
        .every((line) => terminalWidth(line) <= terminalColumns),
    );
    englishScreen.stdin.write("\r");
    await new Promise((resolve) => setImmediate(resolve));
    assert.match(englishScreen.lastFrame(), /DAILY CONTAINMENT RECORD/u);
    assert.ok(
      englishScreen
        .lastFrame()
        .split("\n")
        .every((line) => terminalWidth(line) <= terminalColumns),
    );
    englishScreen.unmount();
  }
});

test("the containment console previews, cancels, confirms, and refreshes one action", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-protocol-"));
  const buildDirectory = mkdtempSync(
    path.join(projectDir, ".anti-ai-tui-action-test-"),
  );
  t.after(() => {
    rmSync(workspace, { recursive: true, force: true });
    rmSync(buildDirectory, { recursive: true, force: true });
  });
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  const settled = runCli(["creature", "--date", "2026-07-23", "--json"], {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "tui-protocol-seed",
  });
  assert.equal(settled.status, 0, settled.stderr);
  const state = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  const snapshot = deriveTuiSnapshot(state, "2026-07-24", "zh");
  const refreshed = structuredClone(snapshot);
  refreshed.overview.status = "active";
  refreshed.overview.statusLabel = "今日已进食";
  refreshed.actions[0].available = false;
  refreshed.actions[0].reason = "already_settled";
  refreshed.actions[0].reasonLabel = "本日已经结算";
  refreshed.primaryAction = null;
  refreshed.dailyBriefing.status = "settled";
  refreshed.dailyBriefing.sections[0].detail = "今日已进食 · 本日事故已封存";
  refreshed.dailyBriefing.recommendation = null;
  let executions = 0;
  const actionController = {
    preview: async (id) => ({
      ...snapshot.actions.find((action) => action.id === id),
      title: "结算工作后遗症",
      summary: "将扫描 1 个有记录的数据源并封存本日成长。",
      warning: "确认后会写入本地异变体档案。",
      irreversible: true,
      choices: [],
      impact: { totalTokens: 2_200, activeSources: 1 },
    }),
    execute: async (id) => {
      executions += 1;
      return {
        id,
        status: "completed",
        message: "本日事故已封存。",
        snapshot: refreshed,
      };
    },
  };
  const output = path.join(buildDirectory, "app.mjs");
  await build({
    entryPoints: [path.join(projectDir, "src", "tui", "app.jsx")],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["ink", "react"],
  });
  const { TuiApp } = await import(pathToFileURL(output).href);
  const screen = render(
    React.createElement(TuiApp, {
      snapshot,
      lang: "zh",
      initialMotion: "off",
      actionController,
    }),
  );
  t.after(() => screen.unmount());

  screen.stdin.write("a");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /行动中心/u);
  assert.match(screen.lastFrame(), /立即可用/u);

  screen.stdin.write("\r");
  await waitForFrame(screen, /影响预览 · 结算工作后遗症/u);
  assert.match(screen.lastFrame(), /2,200/u);
  assert.match(screen.lastFrame(), /Esc 返回/u);
  assert.doesNotMatch(screen.lastFrame(), /q 退出/u);
  assert.equal(executions, 0);

  screen.stdin.write("n");
  await waitForFrame(screen, /行动中心/u);
  assert.equal(executions, 0);

  screen.stdin.write("\r");
  await waitForFrame(screen, /影响预览 · 结算工作后遗症/u);
  screen.stdin.write("\u001B");
  await waitForFrame(screen, /行动中心/u);
  assert.equal(executions, 0);

  screen.stdin.write("\r");
  await waitForFrame(screen, /影响预览 · 结算工作后遗症/u);
  screen.stdin.write("\r");
  await waitForFrame(screen, /协议执行完成/u);
  assert.equal(executions, 1);
  assert.match(screen.lastFrame(), /协议执行完成/u);
  assert.match(screen.lastFrame(), /本日事故已封存/u);

  screen.stdin.write("\r");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /今日已进食/u);
  assert.doesNotMatch(screen.lastFrame(), /协议执行完成/u);
});

test("the containment console selects a three-way protocol with horizontal keys", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-choice-ui-"));
  const buildDirectory = mkdtempSync(
    path.join(projectDir, ".anti-ai-tui-choice-test-"),
  );
  t.after(() => {
    rmSync(workspace, { recursive: true, force: true });
    rmSync(buildDirectory, { recursive: true, force: true });
  });
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  assert.equal(
    runCli(["creature", "--date", "2026-07-23", "--json"], {
      HOME: home,
      ANTI_AI_CREATURE_SEED: "tui-choice-ui-seed",
    }).status,
    0,
  );
  const state = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  const snapshot = deriveTuiSnapshot(state, "2026-07-23", "zh");
  const intervention = snapshot.actions.find(
    ({ id }) => id === "choose_intervention",
  );
  intervention.available = true;
  intervention.reason = null;
  intervention.reasonLabel = null;
  snapshot.primaryAction = intervention;
  let selectedChoice = null;
  const actionController = {
    preview: async () => ({
      ...intervention,
      title: "处理转折病例",
      summary: "病例将永久保留一次治疗选择。",
      warning: "选择封存后不能改选。",
      irreversible: true,
      impact: { caseId: "case-001" },
      choices: [
        { id: "1", label: "污染治疗", detail: "污染收益与代价" },
        { id: "2", label: "清醒治疗", detail: "清醒收益与代价" },
        { id: "3", label: "悖论治疗", detail: "悖论收益与代价" },
      ],
    }),
    execute: async (_id, choice) => {
      selectedChoice = choice;
      return {
        status: "completed",
        message: "病例选择已封存。",
        snapshot,
      };
    },
  };
  const output = path.join(buildDirectory, "app.mjs");
  await build({
    entryPoints: [path.join(projectDir, "src", "tui", "app.jsx")],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["ink", "react"],
  });
  const { TuiApp } = await import(pathToFileURL(output).href);
  const screen = render(
    React.createElement(TuiApp, {
      snapshot,
      lang: "zh",
      initialMotion: "off",
      actionController,
    }),
  );
  t.after(() => screen.unmount());

  screen.stdin.write("\r");
  await waitForFrame(screen, /> 1\. 污染治疗/u);
  screen.stdin.write("\u001B[C");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /> 2\. 清醒治疗/u);
  screen.stdin.write("\r");
  await waitForFrame(screen, /协议执行完成/u);
  assert.equal(selectedChoice, "2");
  assert.match(screen.lastFrame(), /协议执行完成/u);
});

test("the laboratory opens its available incubation protocol with Enter", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-lab-action-"));
  const buildDirectory = mkdtempSync(
    path.join(projectDir, ".anti-ai-tui-lab-action-test-"),
  );
  t.after(() => {
    rmSync(workspace, { recursive: true, force: true });
    rmSync(buildDirectory, { recursive: true, force: true });
  });
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  assert.equal(
    runCli(["creature", "--date", "2026-07-23", "--json"], {
      HOME: home,
      ANTI_AI_CREATURE_SEED: "tui-lab-action-seed",
    }).status,
    0,
  );
  const state = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  const snapshot = deriveTuiSnapshot(state, "2026-07-23", "zh");
  const incubation = snapshot.actions.find(({ id }) => id === "incubate");
  incubation.available = true;
  incubation.reason = null;
  incubation.reasonLabel = null;
  snapshot.laboratory.status = "ready";
  snapshot.laboratory.inventory.foreignSpecimens = 1;
  snapshot.laboratory.inventory.total = 1;
  snapshot.laboratory.proposals = [
    {
      id: "formula-1",
      slot: 1,
      rarity: "uncommon",
      type: "缓存菌毯",
      ecology: "悖论生态",
      pathology: "缓存系",
      complication: "上下文回声",
    },
  ];
  snapshot.laboratory.workflow.completed = 1;
  snapshot.laboratory.workflow.next = {
    id: "incubate",
    label: "原料已就绪 · 请选择配方培养",
  };
  snapshot.laboratory.workflow.steps[0].complete = true;
  const output = path.join(buildDirectory, "app.mjs");
  await build({
    entryPoints: [path.join(projectDir, "src", "tui", "app.jsx")],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["ink", "react"],
  });
  const { TuiApp } = await import(pathToFileURL(output).href);
  const screen = render(
    React.createElement(TuiApp, {
      snapshot,
      lang: "zh",
      initialMotion: "off",
      actionController: {
        preview: async () => ({
          ...incubation,
          title: "孵化污染培养物",
          summary: "第 1 批提供三份配方。",
          warning: "确认后新增一份培养物。",
          irreversible: true,
          impact: { batch: 1 },
          choices: [
            { id: "1", label: "缓存菌毯", detail: "UNCOMMON" },
            { id: "2", label: "递归瘤", detail: "RARE" },
            { id: "3", label: "静默囊", detail: "EPIC" },
          ],
        }),
      },
    }),
  );
  t.after(() => screen.unmount());

  screen.stdin.write("4");
  await new Promise((resolve) => setImmediate(resolve));
  screen.stdin.write("\r");
  await waitForFrame(screen, /影响预览 · 孵化污染培养物/u);
  assert.match(screen.lastFrame(), /> 1\. 缓存菌毯/u);
});

test("an empty habitat can open a direct companion bond preview", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-habitat-bond-"));
  const buildDirectory = mkdtempSync(
    path.join(projectDir, ".anti-ai-tui-habitat-bond-test-"),
  );
  t.after(() => {
    rmSync(workspace, { recursive: true, force: true });
    rmSync(buildDirectory, { recursive: true, force: true });
  });
  const home = path.join(workspace, "home");
  const visitorHome = path.join(workspace, "visitor-home");
  mkdirSync(home, { recursive: true });
  assert.equal(
    runCli(["creature", "--date", "2026-07-23", "--json"], {
      HOME: home,
      ANTI_AI_CREATURE_SEED: "tui-habitat-bond-seed",
    }).status,
    0,
  );
  const visitor = runCli(
    ["creature", "export", "--date", "2026-07-23", "--json"],
    {
      HOME: visitorHome,
      ANTI_AI_CREATURE_SEED: "tui-habitat-bond-visitor",
    },
  );
  assert.equal(visitor.status, 0, visitor.stderr);
  const saved = runCli(
    [
      "encounter",
      JSON.parse(visitor.stdout).code,
      "--save",
      "--date",
      "2026-07-23",
      "--json",
    ],
    {
      HOME: home,
      ANTI_AI_CREATURE_SEED: "tui-habitat-bond-seed",
    },
  );
  assert.equal(saved.status, 0, saved.stderr);
  const state = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  const incubation = applyContainmentAction(
    state,
    "2026-07-23",
    "incubate",
    "1",
  );
  assert.equal(incubation.error, undefined);
  const snapshot = deriveTuiSnapshot(state, "2026-07-23", "zh");
  const cultureId = incubation.value.culture.id;
  let previewTarget = null;
  const bond = snapshot.actions.find(({ id }) => id === "bond");
  const actionController = {
    preview: async (id, target) => {
      previewTarget = target;
      return {
        ...bond,
        id,
        title: "建立伴生关系",
        summary: "选择一份培养物放入生态舱。",
        warning: "切换不会丢失成长。",
        irreversible: false,
        impact: { cultures: 1 },
        choices: [
          { id: cultureId, label: `#${cultureId} · 递归霉菌`, detail: "RARE" },
        ],
      };
    },
  };
  const output = path.join(buildDirectory, "app.mjs");
  await build({
    entryPoints: [path.join(projectDir, "src", "tui", "app.jsx")],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["ink", "react"],
  });
  const { TuiApp } = await import(pathToFileURL(output).href);
  const screen = render(
    React.createElement(TuiApp, {
      snapshot,
      lang: "zh",
      initialMotion: "off",
      actionController,
      terminalColumns: 80,
    }),
  );
  t.after(() => screen.unmount());

  screen.stdin.write("2");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /培养物已封存 · 可以建立伴生关系/u);
  assert.match(screen.lastFrame(), /b 选择并绑定伴生物/u);
  screen.stdin.write("b");
  await waitForFrame(screen, /影响预览 · 建立伴生关系/u);
  assert.equal(previewTarget, cultureId);
  assert.match(screen.lastFrame(), new RegExp(`> ${cultureId}\\. #${cultureId}`, "u"));

  screen.stdin.write("\u001B");
  await waitForFrame(screen, /活体生态舱/u);
  screen.stdin.write("4");
  await waitForFrame(screen, /污染实验室/u);
  screen.stdin.write("\t");
  await waitForFrame(screen, /培养架 · 已聚焦/u);
  assert.match(screen.lastFrame(), new RegExp(`> #${cultureId}`, "u"));
  screen.stdin.write("\r");
  await waitForFrame(screen, /培养物档案/u);
  assert.match(screen.lastFrame(), /原料/u);
  assert.match(screen.lastFrame(), /并发症/u);
  assert.match(screen.lastFrame(), /副作用/u);
  assert.match(screen.lastFrame(), /b 绑定为伴生物/u);
  assert.ok(
    screen.lastFrame().split("\n").every((line) => terminalWidth(line) <= 80),
  );
  screen.stdin.write("b");
  await waitForFrame(screen, /影响预览 · 建立伴生关系/u);
  assert.equal(previewTarget, cultureId);
});

test("the TUI completes incubation and bonding without leaving the console", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-lab-flow-"));
  const buildDirectory = mkdtempSync(
    path.join(projectDir, ".anti-ai-tui-lab-flow-test-"),
  );
  t.after(() => {
    rmSync(workspace, { recursive: true, force: true });
    rmSync(buildDirectory, { recursive: true, force: true });
  });
  const home = path.join(workspace, "home");
  const visitorHome = path.join(workspace, "visitor-home");
  const environment = {
    HOME: home,
    ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
    ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
    ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
    ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
    ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
    ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
    ANTI_AI_CREATURE_SEED: "tui-lab-flow-seed",
  };
  assert.equal(
    runCli(["creature", "--date", "2026-07-23", "--json"], environment).status,
    0,
  );
  const visitor = runCli(
    ["creature", "export", "--date", "2026-07-23", "--json"],
    {
      HOME: visitorHome,
      ANTI_AI_CREATURE_SEED: "tui-lab-flow-visitor",
    },
  );
  assert.equal(visitor.status, 0, visitor.stderr);
  const encounter = runCli(
    [
      "encounter",
      JSON.parse(visitor.stdout).code,
      "--save",
      "--date",
      "2026-07-23",
      "--json",
    ],
    environment,
  );
  assert.equal(encounter.status, 0, encounter.stderr);

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
  const session = await createContainmentSession({
    date: "2026-07-23",
    lang: "zh",
    source: "all",
  });
  const output = path.join(buildDirectory, "app.mjs");
  await build({
    entryPoints: [path.join(projectDir, "src", "tui", "app.jsx")],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["ink", "react"],
  });
  const { TuiApp } = await import(pathToFileURL(output).href);
  const screen = render(
    React.createElement(TuiApp, {
      snapshot: session.snapshot,
      lang: "zh",
      initialMotion: "off",
      actionController: session.actionController,
    }),
  );
  t.after(() => screen.unmount());

  screen.stdin.write("4");
  await waitForFrame(screen, /第 1 批配方/u);
  screen.stdin.write("\r");
  await waitForFrame(screen, /影响预览 · 孵化污染培养物/u);
  screen.stdin.write("\r");
  await waitForFrame(screen, /协议执行完成/u);
  screen.stdin.write("\r");
  await waitForFrame(screen, /培养流程 · 2 \/ 3/u);
  screen.stdin.write("\t");
  await waitForFrame(screen, /培养架 · 已聚焦/u);
  screen.stdin.write("b");
  await waitForFrame(screen, /影响预览 · 建立伴生关系/u);
  screen.stdin.write("\r");
  await waitForFrame(screen, /协议执行完成/u);
  screen.stdin.write("\r");
  await waitForFrame(screen, /活体生态舱/u);
  assert.match(screen.lastFrame(), /近期痕迹 · 伴生绑定痕迹/u);
  assert.doesNotMatch(screen.lastFrame(), /尚无培养原料|可以建立伴生关系/u);
  assert.match(screen.lastFrame(), /#\w+ · 1 天/u);

  const state = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  assert.equal(state.laboratory.cultures.length, 1);
  assert.equal(state.laboratory.activeCultureId, state.laboratory.cultures[0].id);
});

test("the interactive console reports a corrupted mutation file without a stack trace", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-tui-corrupt-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(path.join(home, ".anti-ai", "creature.json"), "{broken\n");
  const commandModule = pathToFileURL(
    path.join(projectDir, "src", "commands", "tui.mjs"),
  ).href;
  const runner = `
    Object.defineProperty(process.stdin, "isTTY", { value: true });
    Object.defineProperty(process.stdout, "isTTY", { value: true });
    const { runTui } = await import(${JSON.stringify(commandModule)});
    await runTui({ lang: "en", date: "2026-07-23" });
  `;

  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", runner],
    {
      cwd: projectDir,
      encoding: "utf8",
      env: { ...process.env, HOME: home, NO_COLOR: "1" },
    },
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /mutation file cannot be read/i);
  assert.doesNotMatch(result.stderr, /SyntaxError|at runTui|\/Users\//);
});
