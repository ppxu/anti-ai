import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createScanProgress } from "../src/cli/progress.mjs";
import {
  createReportSession,
} from "../src/infrastructure/sources/index.mjs";
import { scanCodex } from "../src/infrastructure/sources/jsonl.mjs";
import {
  sourceUsageByDate,
} from "../src/infrastructure/sources/runtime.mjs";

test("Codex scanning ignores oversized non-usage records without losing adjacent usage", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-fast-codex-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const sessionDirectory = path.join(root, "2026", "08", "19");
  mkdirSync(sessionDirectory, { recursive: true });

  const records = [
    JSON.stringify({
      timestamp: "2026-08-19T01:00:00.000Z",
      type: "turn_context",
      payload: { model: "fast-model" },
    }),
    JSON.stringify({
      timestamp: "2026-08-19T01:00:01.000Z",
      type: "response_item",
      payload: {
        body: `${"x".repeat(2 * 1024 * 1024)}\"type\":\"token_count\"`,
      },
    }),
    JSON.stringify({
      timestamp: "2026-08-19T01:00:02.000Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          last_token_usage: {
            input_tokens: 120,
            cached_input_tokens: 40,
            output_tokens: 30,
            reasoning_output_tokens: 10,
            total_tokens: 150,
          },
        },
      },
    }),
  ];
  writeFileSync(
    path.join(sessionDirectory, "session.jsonl"),
    `${records.join("\n")}\n`,
  );

  const report = await scanCodex(root, ["2026-08-19"], "Asia/Shanghai");
  assert.equal(report.get("2026-08-19").usage.totalTokens, 150);
  assert.equal(report.get("2026-08-19").models["fast-model"].totalTokens, 150);
});

test("one report session starts sources together and reuses covered dates", async () => {
  const starts = [];
  const calls = new Map();
  let releaseFirstScan;
  const firstScanGate = new Promise((resolve) => {
    releaseFirstScan = resolve;
  });
  const adapters = ["codex", "claude"].map((id) => ({
    id,
    async scan(dates) {
      const count = (calls.get(id) ?? 0) + 1;
      calls.set(id, count);
      starts.push({ id, dates: [...dates] });
      if (count === 1) await firstScanGate;
      return sourceUsageByDate(dates);
    },
  }));
  const session = createReportSession(
    { source: "all" },
    "Asia/Shanghai",
    { adapters },
  );

  const first = session.reportsForDates(["2026-08-18", "2026-08-19"]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(starts.map(({ id }) => id), ["codex", "claude"]);
  releaseFirstScan();
  await first;

  await session.reportsForDates(["2026-08-19"]);
  assert.deepEqual(Object.fromEntries(calls), { codex: 1, claude: 1 });

  await session.reportsForDates(["2026-08-17", "2026-08-19"]);
  assert.deepEqual(Object.fromEntries(calls), { codex: 2, claude: 2 });
  assert.deepEqual(starts.at(-1).dates, ["2026-08-17"]);
});

test("report sessions always finish progress after a selected source fails", async () => {
  const events = [];
  const session = createReportSession(
    {
      source: "codex",
      onScanProgress: (event) => events.push(event.type),
    },
    "Asia/Shanghai",
    {
      adapters: [{
        id: "codex",
        async scan() {
          const error = new Error("fixture failure");
          error.code = "FIXTURE_FAILURE";
          throw error;
        },
      }],
    },
  );

  await assert.rejects(
    session.reportsForDates(["2026-08-19"]),
    (error) =>
      error.code === "ANTI_AI_SOURCE_SCAN_FAILED" &&
      error.source === "codex" &&
      error.sourceCode === "FIXTURE_FAILURE",
  );
  assert.deepEqual(events, ["scan:start", "scan:finish"]);
});

test("interactive scan progress is delayed, localized, and cleared", async () => {
  const writes = [];
  const progress = createScanProgress({
    stream: { isTTY: true, write: (value) => writes.push(value) },
    lang: "zh",
    delayMs: 0,
    intervalMs: 5,
  });

  progress.handle({ type: "scan:start", sourceIds: ["codex", "claude"] });
  await new Promise((resolve) => setTimeout(resolve, 12));
  progress.handle({ type: "scan:finish" });

  assert.match(writes.join(""), /正在扫描 2 个本地 Agent 数据源/u);
  assert.ok(writes.at(-1).includes("\u001B[2K"));

  const quickWrites = [];
  const quickProgress = createScanProgress({
    stream: { isTTY: true, write: (value) => quickWrites.push(value) },
    delayMs: 20,
    intervalMs: 5,
  });
  quickProgress.handle({ type: "scan:start", sourceIds: ["codex"] });
  quickProgress.handle({ type: "scan:finish" });
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.deepEqual(quickWrites, []);

  const englishWrites = [];
  const englishProgress = createScanProgress({
    stream: { isTTY: true, write: (value) => englishWrites.push(value) },
    lang: "en",
    delayMs: 0,
    intervalMs: 5,
  });
  englishProgress.handle({ type: "scan:start", sourceIds: ["codex"] });
  await new Promise((resolve) => setTimeout(resolve, 1));
  englishProgress.stop();
  assert.match(englishWrites.join(""), /Scanning 1 local Agent source/u);
});
