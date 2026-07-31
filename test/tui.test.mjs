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
} from "./helpers.mjs";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";
import { render } from "ink-testing-library";
import React from "react";

import { deriveTuiSnapshot } from "../src/application/tui.mjs";

test("the TUI snapshot unifies the four read-only product areas", (t) => {
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
  assert.ok(
    snapshot.overview.actions.some(
      ({ command }) => command === "anti-ai today --date 2026-07-23",
    ),
  );
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
  assert.match(screen.lastFrame(), /结算今天的工作后遗症/u);
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
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /器官观察/u);
  assert.match(screen.lastFrame(), /监测复眼/u);
  screen.stdin.write("\u001B[B");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /请求口器/u);
  screen.stdin.write("\u001B");
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.doesNotMatch(screen.lastFrame(), /器官观察/u);
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
  assert.match(screen.lastFrame(), /结算今天的工作后遗症/u);
  screen.stdin.write("?");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(screen.lastFrame(), /m.*动态档位/u);
  assert.match(screen.lastFrame(), /Enter.*器官观察/u);
  assert.match(screen.lastFrame(), /r.*回放最近事件/u);
  assert.equal(readFileSync(statePath, "utf8"), originalStateFile);
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
