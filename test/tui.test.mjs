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
  writeCodexUsage,
} from "./helpers.mjs";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";
import { render } from "ink-testing-library";
import React from "react";

import { deriveTuiSnapshot } from "../src/application/tui.mjs";
import {
  createContainmentSession,
  executeContainmentAction,
  previewContainmentAction,
} from "../src/application/actions.mjs";

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

test("the TUI snapshot unifies four product areas without mutating state", (t) => {
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

  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.date, "2026-07-23");
  assert.equal(snapshot.readOnly, true);
  assert.deepEqual(
    snapshot.navigation.map(({ id }) => id),
    ["overview", "habitat", "laboratory", "codex"],
  );
  assert.equal(snapshot.overview.status, "active");
  assert.equal(snapshot.overview.experienceDays, 1);
  assert.ok(snapshot.overview.title.length > 0);
  assert.ok(snapshot.overview.art.length >= 8);
  assert.equal(snapshot.habitat.companion, null);
  assert.equal(snapshot.laboratory.cultures, 0);
  assert.equal(snapshot.codex.fixed.total, 68);
  assert.equal(snapshot.overview.actions.length, 0);
  assert.equal(JSON.stringify(state), original);
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
      { id: "choose_intervention", available: false, reason: "no_pending_case" },
      { id: "choose_evolution", available: false, reason: "no_pending_evolution" },
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

test("choice actions preview stable options and execute intervention, evolution, incubation, and bonding", async (t) => {
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

test("the containment console navigates all four product areas by keyboard", async (t) => {
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
  assert.match(screen.lastFrame(), /当前没有待办/u);
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
  assert.match(screen.lastFrame(), /生态舱状态/u);
  screen.stdin.write("\r");
  await waitForFrame(screen, /器官观察/u);
  assert.match(screen.lastFrame(), /监测复眼/u);
  screen.stdin.write("\u001B[B");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /请求口器/u);
  screen.stdin.write("\u001B");
  await waitForFrame(screen, /器官观察/u, { absent: true });
  assert.match(screen.lastFrame(), /生态舱状态/u);
  screen.stdin.write("r");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /事件回放/u);
  assert.match(screen.lastFrame(), /缓存月蚀/u);
  screen.stdin.write("r");
  await new Promise((resolve) => setImmediate(resolve));
  assert.doesNotMatch(screen.lastFrame(), /事件回放/u);
  screen.stdin.write("3");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /污染实验室/u);
  screen.stdin.write("4");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /病理图鉴/u);
  screen.stdin.write("1");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /当前没有待办/u);
  screen.stdin.write("?");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /m.*动态档位/u);
  assert.match(screen.lastFrame(), /a.*收容协议行动中心/u);
  assert.match(screen.lastFrame(), /Enter.*器官观察/u);
  assert.match(screen.lastFrame(), /r.*回放最近事件/u);
  assert.equal(readFileSync(statePath, "utf8"), originalStateFile);
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
  assert.match(screen.lastFrame(), /待执行收容协议/u);
  assert.match(screen.lastFrame(), /本日已经结算|处理待定/u);

  screen.stdin.write("\r");
  await waitForFrame(screen, /影响预览 · 结算工作后遗症/u);
  assert.match(screen.lastFrame(), /2,200/u);
  assert.match(screen.lastFrame(), /Esc 返回/u);
  assert.doesNotMatch(screen.lastFrame(), /q 退出/u);
  assert.equal(executions, 0);

  screen.stdin.write("n");
  await waitForFrame(screen, /待执行收容协议/u);
  assert.equal(executions, 0);

  screen.stdin.write("\r");
  await waitForFrame(screen, /影响预览 · 结算工作后遗症/u);
  screen.stdin.write("\u001B");
  await waitForFrame(screen, /待执行收容协议/u);
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

  screen.stdin.write("3");
  await new Promise((resolve) => setImmediate(resolve));
  screen.stdin.write("\r");
  await waitForFrame(screen, /影响预览 · 孵化污染培养物/u);
  assert.match(screen.lastFrame(), /> 1\. 缓存菌毯/u);
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
