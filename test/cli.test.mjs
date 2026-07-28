import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import Database from "better-sqlite3";

import {
  creatureAppearanceContentStats,
  creatureAppearanceState,
  creatureArt,
  creatureClinicalNote,
  creatureEvent,
  deriveCreatureAppearance,
} from "../src/creature.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(testDir, "..");
const cliPath = path.join(projectDir, "bin", "anti-ai.mjs");
const fixtureDir = path.join(testDir, "fixtures");
const baselineCodexDir = path.join(fixtureDir, "baseline", "codex");

function runCli(args, env = {}) {
  const isolatedHome = env.HOME ?? mkdtempSync(
    path.join(tmpdir(), "anti-ai-cli-home-"),
  );
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectDir,
    encoding: "utf8",
    env: {
      ...process.env,
      TZ: "Asia/Shanghai",
      NO_COLOR: "1",
      HOME: isolatedHome,
      ANTI_AI_CODEX_DIR: path.join(fixtureDir, "codex"),
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "missing-claude"),
      ANTI_AI_OPENCODE_DB: path.join(fixtureDir, "missing-opencode.db"),
      ANTI_AI_OPENCLAW_DIR: path.join(fixtureDir, "missing-openclaw"),
      ANTI_AI_HERMES_DB: path.join(fixtureDir, "missing-hermes.db"),
      ANTI_AI_PI_DIR: path.join(fixtureDir, "missing-pi"),
      ...env,
    },
  });
  if (!env.HOME) rmSync(isolatedHome, { recursive: true, force: true });
  return result;
}

function writeCodexUsage(root, usages, date = "2026-07-23") {
  const dayStart = new Date(`${date}T00:00:00+08:00`).getTime();
  const records = usages.flatMap((usage, index) => [
    {
      timestamp: new Date(dayStart + index * 60_000).toISOString(),
      type: "turn_context",
      payload: { model: "mutation-test" },
    },
    {
      timestamp: new Date(dayStart + index * 60_000 + 30_000).toISOString(),
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          last_token_usage: usage,
        },
      },
    },
  ]);
  const [year, month, day] = date.split("-");
  mkdirSync(path.join(root, year, month, day), { recursive: true });
  writeFileSync(
    path.join(root, year, month, day, "session.jsonl"),
    `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
  );
}

function writeOpenCodeDb(dbPath, messages) {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const database = new Database(dbPath);
  database.exec(`
    CREATE TABLE message (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL,
      data TEXT NOT NULL
    )
  `);
  const insert = database.prepare(
    "INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?)",
  );
  for (const message of messages) {
    insert.run(
      message.id,
      message.sessionId ?? "session-test",
      message.timeCreated,
      message.timeUpdated ?? message.timeCreated,
      JSON.stringify(message.data),
    );
  }
  database.close();
}

function writeOpenCodeSessionMessageDb(dbPath, messages) {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const database = new Database(dbPath);
  database.exec(`
    CREATE TABLE session_message (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      seq INTEGER NOT NULL,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL,
      data TEXT NOT NULL
    )
  `);
  const insert = database.prepare(
    "INSERT INTO session_message (id, session_id, type, seq, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  messages.forEach((message, index) => {
    insert.run(
      message.id,
      message.sessionId ?? "session-test",
      message.type ?? "assistant",
      index,
      message.timeCreated,
      message.timeUpdated ?? message.timeCreated,
      JSON.stringify(message.data),
    );
  });
  database.close();
}

function writeHermesDb(dbPath, sessions) {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const database = new Database(dbPath);
  database.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      model TEXT,
      started_at REAL NOT NULL,
      ended_at REAL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cache_read_tokens INTEGER DEFAULT 0,
      cache_write_tokens INTEGER DEFAULT 0,
      reasoning_tokens INTEGER DEFAULT 0,
      api_call_count INTEGER DEFAULT 0
    )
  `);
  const insert = database.prepare(`
    INSERT INTO sessions (
      id, model, started_at, ended_at, input_tokens, output_tokens,
      cache_read_tokens, cache_write_tokens, reasoning_tokens, api_call_count
    ) VALUES (
      @id, @model, @started_at, @ended_at, @input_tokens, @output_tokens,
      @cache_read_tokens, @cache_write_tokens, @reasoning_tokens, @api_call_count
    )
  `);
  for (const session of sessions) insert.run(session);
  database.close();
}

function writeHermesModelUsage(dbPath, rows) {
  const database = new Database(dbPath);
  database.exec(`
    CREATE TABLE session_model_usage (
      session_id TEXT NOT NULL,
      model TEXT NOT NULL,
      task TEXT NOT NULL DEFAULT '',
      api_call_count INTEGER NOT NULL DEFAULT 0,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      cache_write_tokens INTEGER NOT NULL DEFAULT 0,
      reasoning_tokens INTEGER NOT NULL DEFAULT 0,
      first_seen REAL,
      last_seen REAL,
      PRIMARY KEY (session_id, model, task)
    )
  `);
  const insert = database.prepare(`
    INSERT INTO session_model_usage (
      session_id, model, task, api_call_count, input_tokens, output_tokens,
      cache_read_tokens, cache_write_tokens, reasoning_tokens, first_seen, last_seen
    ) VALUES (
      @session_id, @model, @task, @api_call_count, @input_tokens, @output_tokens,
      @cache_read_tokens, @cache_write_tokens, @reasoning_tokens, @first_seen, @last_seen
    )
  `);
  for (const row of rows) insert.run(row);
  database.close();
}

function writeJsonl(filePath, records) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(
    filePath,
    `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
  );
}

function shiftTestDate(date, days) {
  const shifted = new Date(`${date}T12:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function terminalWidth(value) {
  const plain = value.replace(/\u001b\[[0-9;]*m/g, "");
  return Array.from(plain).reduce(
    (width, character) =>
      width + (/\p{Script=Han}/u.test(character) ? 2 : 1),
    0,
  );
}

function everydayComparisonLines(output) {
  const lines = output.split("\n");
  const start = lines.findIndex((line) =>
    /生活翻译|Everyday translation/.test(line),
  );
  if (start === -1) return [];
  const end = lines.findIndex(
    (line, index) => index > start && line.trim() === "",
  );
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

function framedFooter(output) {
  const lines = output.trimEnd().split("\n");
  const border = lines.findLastIndex((line) => line.includes("└"));
  return border > 0 ? lines[border - 1].trim() : "";
}

test("today --json counts Codex request usage on the requested local date", () => {
  const result = runCli([
    "today",
    "--date",
    "2026-07-23",
    "--source",
    "codex",
    "--json",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), {
    date: "2026-07-23",
    timezone: "Asia/Shanghai",
    sources: {
      codex: {
        requests: 2,
        inputTokens: 150,
        cachedInputTokens: 40,
        cacheWriteInputTokens: 0,
        outputTokens: 30,
        reasoningOutputTokens: 5,
        totalTokens: 180,
      },
    },
    models: {
      codex: {
        "gpt-test": {
          requests: 2,
          inputTokens: 150,
          cachedInputTokens: 40,
          cacheWriteInputTokens: 0,
          outputTokens: 30,
          reasoningOutputTokens: 5,
          totalTokens: 180,
        },
      },
    },
    totals: {
      requests: 2,
      inputTokens: 150,
      cachedInputTokens: 40,
      cacheWriteInputTokens: 0,
      outputTokens: 30,
      reasoningOutputTokens: 5,
      totalTokens: 180,
    },
  });
});

test("today --json deduplicates Claude Code streaming usage by message id", () => {
  const result = runCli(
    [
      "today",
      "--date",
      "2026-07-23",
      "--source",
      "claude",
      "--json",
    ],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), {
    date: "2026-07-23",
    timezone: "Asia/Shanghai",
    sources: {
      claude: {
        requests: 2,
        inputTokens: 125,
        cachedInputTokens: 90,
        cacheWriteInputTokens: 20,
        outputTokens: 45,
        reasoningOutputTokens: 0,
        totalTokens: 170,
      },
    },
    models: {
      claude: {
        "claude-test": {
          requests: 2,
          inputTokens: 125,
          cachedInputTokens: 90,
          cacheWriteInputTokens: 20,
          outputTokens: 45,
          reasoningOutputTokens: 0,
          totalTokens: 170,
        },
      },
    },
    totals: {
      requests: 2,
      inputTokens: 125,
      cachedInputTokens: 90,
      cacheWriteInputTokens: 20,
      outputTokens: 45,
      reasoningOutputTokens: 0,
      totalTokens: 170,
    },
  });
});

test("today --json counts OpenCode SQLite assistant usage by message date", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-opencode-"));
  const databasePath = path.join(workspace, "opencode.db");
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const timestamp = new Date("2026-07-23T09:30:00+08:00").getTime();
  writeOpenCodeDb(databasePath, [
    {
      id: "message-assistant",
      timeCreated: timestamp,
      data: {
        role: "assistant",
        modelID: "opencode-test",
        providerID: "test-provider",
        time: { created: timestamp },
        tokens: {
          input: 10,
          output: 7,
          reasoning: 3,
          cache: { read: 20, write: 5 },
        },
      },
    },
    {
      id: "message-user",
      timeCreated: timestamp,
      data: {
        role: "user",
        tokens: { input: 999, output: 999 },
      },
    },
  ]);

  const result = runCli(
    [
      "today",
      "--date",
      "2026-07-23",
      "--source",
      "opencode",
      "--json",
    ],
    { ANTI_AI_OPENCODE_DB: databasePath },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    date: "2026-07-23",
    timezone: "Asia/Shanghai",
    sources: {
      opencode: {
        requests: 1,
        inputTokens: 35,
        cachedInputTokens: 20,
        cacheWriteInputTokens: 5,
        outputTokens: 7,
        reasoningOutputTokens: 3,
        totalTokens: 42,
      },
    },
    models: {
      opencode: {
        "opencode-test": {
          requests: 1,
          inputTokens: 35,
          cachedInputTokens: 20,
          cacheWriteInputTokens: 5,
          outputTokens: 7,
          reasoningOutputTokens: 3,
          totalTokens: 42,
        },
      },
    },
    totals: {
      requests: 1,
      inputTokens: 35,
      cachedInputTokens: 20,
      cacheWriteInputTokens: 5,
      outputTokens: 7,
      reasoningOutputTokens: 3,
      totalTokens: 42,
    },
  });

  const human = runCli(
    ["today", "--date", "2026-07-23", "--source", "opencode"],
    { ANTI_AI_OPENCODE_DB: databasePath },
  );
  assert.equal(human.status, 0, human.stderr);
  assert.match(human.stdout, /OpenCode\s+42/);
  assert.match(human.stdout, /OpenCode · opencode-test\s+42 tokens/);
  assert.doesNotMatch(human.stdout, /^\s+Codex\s+0$/m);
});

test("today --json supports OpenCode's session_message schema", (t) => {
  const workspace = mkdtempSync(
    path.join(tmpdir(), "anti-ai-opencode-modern-"),
  );
  const databasePath = path.join(workspace, "opencode.db");
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const timestamp = new Date("2026-07-23T10:00:00+08:00").getTime();
  writeOpenCodeSessionMessageDb(databasePath, [
    {
      id: "modern-assistant",
      timeCreated: timestamp,
      data: {
        role: "assistant",
        modelID: "opencode-modern",
        time: { created: timestamp },
        tokens: {
          input: 4,
          output: 2,
          reasoning: 1,
          cache: { read: 6, write: 0 },
        },
      },
    },
  ]);

  const result = runCli(
    [
      "today",
      "--date",
      "2026-07-23",
      "--source",
      "opencode",
      "--json",
    ],
    { ANTI_AI_OPENCODE_DB: databasePath },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).sources.opencode, {
    requests: 1,
    inputTokens: 10,
    cachedInputTokens: 6,
    cacheWriteInputTokens: 0,
    outputTokens: 2,
    reasoningOutputTokens: 1,
    totalTokens: 12,
  });
});

test("today --json deduplicates OpenClaw reset logs and ignores trajectory files", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "anti-ai-openclaw-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const assistantRecord = {
    type: "message",
    id: "openclaw-1",
    timestamp: "2026-07-23T01:00:00.000Z",
    message: {
      role: "assistant",
      provider: "test-provider",
      model: "openclaw-test",
      timestamp: Date.parse("2026-07-23T01:00:00.000Z"),
      usage: {
        input: 10,
        output: 4,
        cacheRead: 20,
        cacheWrite: 5,
        reasoningTokens: 2,
        totalTokens: 39,
      },
    },
  };
  writeJsonl(path.join(root, "active.jsonl"), [assistantRecord]);
  writeJsonl(path.join(root, "active.jsonl.reset.20260723"), [
    assistantRecord,
    {
      ...assistantRecord,
      id: "openclaw-2",
      timestamp: "2026-07-23T02:00:00.000Z",
      message: {
        ...assistantRecord.message,
        timestamp: Date.parse("2026-07-23T02:00:00.000Z"),
        usage: {
          input: 3,
          output: 2,
          cacheRead: 0,
          cacheWrite: 0,
          reasoningTokens: 0,
          totalTokens: 5,
        },
      },
    },
  ]);
  writeJsonl(path.join(root, "active.trajectory.jsonl"), [
    {
      ...assistantRecord,
      id: "trajectory-only",
      message: {
        ...assistantRecord.message,
        usage: { input: 1000, output: 1000, totalTokens: 2000 },
      },
    },
  ]);

  const result = runCli(
    [
      "today",
      "--date",
      "2026-07-23",
      "--source",
      "openclaw",
      "--json",
    ],
    { ANTI_AI_OPENCLAW_DIR: root },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).sources.openclaw, {
    requests: 2,
    inputTokens: 38,
    cachedInputTokens: 20,
    cacheWriteInputTokens: 5,
    outputTokens: 6,
    reasoningOutputTokens: 2,
    totalTokens: 44,
  });
  assert.deepEqual(Object.keys(JSON.parse(result.stdout).models.openclaw), [
    "openclaw-test",
  ]);
});

test("today --json counts Pi summaries and deduplicates cloned entry IDs", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "anti-ai-pi-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const assistant = {
    type: "message",
    id: "pi-assistant",
    parentId: "pi-user",
    timestamp: "2026-07-23T01:00:00.000Z",
    message: {
      role: "assistant",
      provider: "test-provider",
      model: "pi-test",
      timestamp: Date.parse("2026-07-23T01:00:00.000Z"),
      usage: {
        input: 11,
        output: 5,
        cacheRead: 2,
        cacheWrite: 3,
        totalTokens: 21,
      },
    },
  };
  const modelChange = {
    type: "model_change",
    id: "pi-model",
    parentId: "pi-assistant",
    timestamp: "2026-07-23T01:01:00.000Z",
    provider: "test-provider",
    modelId: "pi-test",
  };
  const compaction = {
    type: "compaction",
    id: "pi-compaction",
    parentId: "pi-model",
    timestamp: "2026-07-23T01:02:00.000Z",
    usage: {
      input: 7,
      output: 2,
      cacheRead: 1,
      cacheWrite: 0,
      totalTokens: 10,
    },
  };
  writeJsonl(path.join(root, "project", "original.jsonl"), [
    { type: "session", version: 3, id: "pi-session-1" },
    assistant,
    modelChange,
    compaction,
  ]);
  writeJsonl(path.join(root, "project", "clone.jsonl"), [
    { type: "session", version: 3, id: "pi-session-2" },
    assistant,
    modelChange,
    compaction,
  ]);

  const result = runCli(
    ["today", "--date", "2026-07-23", "--source", "pi", "--json"],
    { ANTI_AI_PI_DIR: root },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).sources.pi, {
    requests: 2,
    inputTokens: 24,
    cachedInputTokens: 3,
    cacheWriteInputTokens: 3,
    outputTokens: 7,
    reasoningOutputTokens: 0,
    totalTokens: 31,
  });
  assert.deepEqual(JSON.parse(result.stdout).models.pi["pi-test"], {
    requests: 2,
    inputTokens: 24,
    cachedInputTokens: 3,
    cacheWriteInputTokens: 3,
    outputTokens: 7,
    reasoningOutputTokens: 0,
    totalTokens: 31,
  });
});

test("today --json counts Hermes session totals on the session end date", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-hermes-"));
  const databasePath = path.join(workspace, "state.db");
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  writeHermesDb(databasePath, [
    {
      id: "hermes-session",
      model: "hermes-test",
      started_at: Date.parse("2026-07-22T23:55:00.000Z") / 1000,
      ended_at: Date.parse("2026-07-23T01:05:00.000Z") / 1000,
      input_tokens: 9,
      output_tokens: 4,
      cache_read_tokens: 20,
      cache_write_tokens: 5,
      reasoning_tokens: 2,
      api_call_count: 3,
    },
  ]);

  const result = runCli(
    ["today", "--date", "2026-07-23", "--source", "hermes", "--json"],
    { ANTI_AI_HERMES_DB: databasePath },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).sources.hermes, {
    requests: 3,
    inputTokens: 34,
    cachedInputTokens: 20,
    cacheWriteInputTokens: 5,
    outputTokens: 4,
    reasoningOutputTokens: 2,
    totalTokens: 38,
  });
  assert.deepEqual(JSON.parse(result.stdout).models.hermes["hermes-test"], {
    requests: 3,
    inputTokens: 34,
    cachedInputTokens: 20,
    cacheWriteInputTokens: 5,
    outputTokens: 4,
    reasoningOutputTokens: 2,
    totalTokens: 38,
  });
});

test("today --json prefers Hermes per-model usage including auxiliary calls", (t) => {
  const workspace = mkdtempSync(
    path.join(tmpdir(), "anti-ai-hermes-models-"),
  );
  const databasePath = path.join(workspace, "state.db");
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const timestamp = Date.parse("2026-07-23T01:05:00.000Z") / 1000;
  writeHermesDb(databasePath, [
    {
      id: "hermes-session",
      model: "stale-session-model",
      started_at: timestamp - 60,
      ended_at: timestamp,
      input_tokens: 999,
      output_tokens: 999,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      reasoning_tokens: 0,
      api_call_count: 99,
    },
  ]);
  writeHermesModelUsage(databasePath, [
    {
      session_id: "hermes-session",
      model: "hermes-main",
      task: "",
      api_call_count: 2,
      input_tokens: 5,
      output_tokens: 3,
      cache_read_tokens: 7,
      cache_write_tokens: 0,
      reasoning_tokens: 1,
      first_seen: timestamp - 30,
      last_seen: timestamp,
    },
    {
      session_id: "hermes-session",
      model: "hermes-aux",
      task: "compression",
      api_call_count: 1,
      input_tokens: 2,
      output_tokens: 1,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      reasoning_tokens: 0,
      first_seen: timestamp,
      last_seen: timestamp,
    },
  ]);

  const result = runCli(
    ["today", "--date", "2026-07-23", "--source", "hermes", "--json"],
    { ANTI_AI_HERMES_DB: databasePath },
  );

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.sources.hermes, {
    requests: 3,
    inputTokens: 14,
    cachedInputTokens: 7,
    cacheWriteInputTokens: 0,
    outputTokens: 4,
    reasoningOutputTokens: 1,
    totalTokens: 18,
  });
  assert.deepEqual(Object.keys(report.models.hermes).sort(), [
    "hermes-aux",
    "hermes-main",
  ]);
});

test("human-readable model names cannot inject terminal control characters", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "anti-ai-model-name-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const records = [
    {
      timestamp: "2026-07-22T16:00:00.000Z",
      type: "turn_context",
      payload: { model: "gpt\u001b[31m" },
    },
    {
      timestamp: "2026-07-22T16:01:00.000Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          last_token_usage: {
            input_tokens: 10,
            output_tokens: 5,
            total_tokens: 15,
          },
        },
      },
    },
  ];
  mkdirSync(path.join(root, "2026", "07", "23"), { recursive: true });
  writeFileSync(
    path.join(root, "2026", "07", "23", "session.jsonl"),
    `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
  );

  const result = runCli(["today", "--date", "2026-07-23", "--source", "codex"], {
    ANTI_AI_CODEX_DIR: root,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /\u001b/);
  assert.match(result.stdout, /Codex · gpt�\[31m/);
});

test("today prints a satirical receipt with transparent resource estimates", () => {
  const result = runCli(
    ["today", "--date", "2026-07-23"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /YOUR AI RECEIPT · 2026-07-23/);
  assert.match(result.stdout, /350 tokens · 4 次模型请求/);
  assert.match(result.stdout, /Codex\s+180/);
  assert.match(result.stdout, /Claude Code\s+170/);
  assert.match(result.stdout, /模型账单/);
  assert.match(result.stdout, /Codex · gpt-test\s+180 tokens · 2 次/);
  assert.match(
    result.stdout,
    /Claude Code · claude-test\s+170 tokens · 2 次/,
  );
  assert.match(result.stdout, /⚡\s+1\.36 Wh.*OpenAI/s);
  assert.match(result.stdout, /💧\s+8\.44 mL.*Mistral/s);
  assert.match(result.stdout, /☁️\s+0\.21 gCO₂e.*Mistral/s);
  assert.match(result.stdout, /资源消耗估算（参考公开数据）/);
  assert.doesNotMatch(result.stdout, /公开代理跨度/);
  assert.doesNotMatch(result.stdout, /置信度/);
  assert.match(result.stdout, /anti-ai explain resources/);
  assert.ok(framedFooter(result.stdout));
});

test("today supports a fully English human-readable receipt", () => {
  const result = runCli(
    ["today", "--date", "2026-07-23", "--lang", "en"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /350 tokens · 4 model requests/);
  assert.match(result.stdout, /Model bill/);
  assert.match(result.stdout, /Codex · gpt-test\s+180 tokens · 2 requests/);
  assert.match(result.stdout, /Estimated resource use \(from public data\)/);
  assert.doesNotMatch(result.stdout, /Published proxy range/);
  assert.match(result.stdout, /Everyday translation/);
  assert.match(result.stdout, /10W LED light\s+8\.16 minutes/);
  assert.match(result.stdout, /19Wh phone charge\s+0\.07 charges/);
  assert.match(result.stdout, /550mL drinking water\s+1\.53% of 1 bottle/);
  assert.match(result.stdout, /Personal baseline \(prior 7 calendar days\)/);
  assert.match(result.stdout, /Today's charge: [A-Z][A-Z -]+/);
  assert.doesNotMatch(result.stdout, /Confidence:/);
  assert.doesNotMatch(result.stdout, /次模型请求|模型账单|今日罪名|置信度/);
});

test("English verdicts keep the same local rule and date rotation", () => {
  const result = runCli(
    ["today", "--date", "2026-07-23", "--source", "codex", "--lang", "en"],
    {
      ANTI_AI_CODEX_DIR: baselineCodexDir,
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Today's charge: [A-Z][A-Z -]+/);
  assert.match(result.stdout, /3\.00× normal/);
  assert.doesNotMatch(result.stdout, /上下文囤积|请求没多/);
});

test("today JSON is language-independent", () => {
  const zh = runCli([
    "today",
    "--date",
    "2026-07-23",
    "--source",
    "codex",
    "--json",
  ]);
  const en = runCli([
    "today",
    "--date",
    "2026-07-23",
    "--source",
    "codex",
    "--lang",
    "en",
    "--json",
  ]);

  assert.equal(zh.status, 0, zh.stderr);
  assert.equal(en.status, 0, en.stderr);
  assert.deepEqual(JSON.parse(en.stdout), JSON.parse(zh.stdout));
});

test("today translates abstract resources into everyday comparisons", () => {
  const result = runCli(
    ["today", "--date", "2026-07-23"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /生活翻译（终于像人话了）/);
  assert.match(result.stdout, /💡\s+10W LED 灯\s+8\.16 分钟/);
  assert.match(
    result.stdout,
    /🥤\s+550mL 饮用水\s+相当于 1 瓶的 1\.53%/,
  );
  assert.match(result.stdout, /🚗\s+平均燃油车\s+0\.88 米/);
  assert.match(
    result.stdout,
    /📱\s+19Wh 手机充电\s+0\.07 次/,
  );
  assert.match(
    result.stdout,
    /💧\s+一滴水\s+168\.75 滴/,
  );
});

test("today names one high-side public reference and prints exactly five small comparisons", () => {
  const result = runCli(
    ["today", "--date", "2026-07-23"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /公开高位参照/);
  assert.match(result.stdout, /⚡\s+1\.36 Wh.*OpenAI.*请求级/);
  assert.match(result.stdout, /💧\s+8\.44 mL.*Mistral.*生命周期/);
  assert.match(result.stdout, /☁️\s+0\.21 gCO₂e.*Mistral.*生命周期/);
  assert.doesNotMatch(result.stdout, /置信度：低|Confidence: LOW/);

  const comparisons = everydayComparisonLines(result.stdout);
  assert.equal(comparisons.length, 5, result.stdout);
  assert.match(comparisons.join("\n"), /10W LED 灯/);
  assert.match(comparisons.join("\n"), /19Wh 手机充电/);
  assert.match(comparisons.join("\n"), /550mL 饮用水/);
  assert.match(comparisons.join("\n"), /一滴水/);
  assert.match(comparisons.join("\n"), /平均燃油车/);
});

test("week prints exactly five medium everyday activities", () => {
  const result = runCli(
    ["week", "--date", "2026-07-23"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const comparisons = everydayComparisonLines(result.stdout);
  assert.equal(comparisons.length, 5, result.stdout);
  assert.match(comparisons.join("\n"), /烧开 1L 水/);
  assert.match(comparisons.join("\n"), /50W 笔记本电脑/);
  assert.match(comparisons.join("\n"), /1kW 微波炉/);
  assert.match(comparisons.join("\n"), /WaterSense 淋浴/);
  assert.match(comparisons.join("\n"), /ENERGY STAR 洗碗机/);
});

test("month prints exactly five large comparisons without rounding tiny shares to zero", () => {
  const result = runCli(["month", "--date", "2026-07-23", "--source", "codex"], {
    ANTI_AI_CODEX_DIR: baselineCodexDir,
  });

  assert.equal(result.status, 0, result.stderr);
  const comparisons = everydayComparisonLines(result.stdout);
  assert.equal(comparisons.length, 5, result.stdout);
  assert.match(comparisons.join("\n"), /平均燃油车/);
  assert.match(comparisons.join("\n"), /1 棵城市树/);
  assert.match(comparisons.join("\n"), /标准泳池/);
  assert.match(comparisons.join("\n"), /美国家庭日均用电/);
  assert.match(comparisons.join("\n"), /一缸洗澡水/);
  assert.match(comparisons.join("\n"), /还差 [\d,.]+ 倍/);
  assert.doesNotMatch(comparisons.join("\n"), /\b0\.00\b/);
});

test("empty period comparisons render zero instead of infinite gaps", () => {
  const week = runCli(["week", "--date", "2026-01-07"]);
  const month = runCli(["month", "--date", "2026-01-31"]);

  assert.equal(week.status, 0, week.stderr);
  assert.equal(month.status, 0, month.stderr);
  assert.doesNotMatch(week.stdout, /∞|Infinity/);
  assert.doesNotMatch(month.stdout, /∞|Infinity/);
});

test("today compares usage with the prior seven days and prints one verdict", () => {
  const result = runCli(["today", "--date", "2026-07-23", "--source", "codex"], {
    ANTI_AI_CODEX_DIR: baselineCodexDir,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /个人基线（过去 7 个自然日）/);
  assert.match(result.stdout, /Token\s+\+200\.00%/);
  assert.match(result.stdout, /请求\s+0\.00%/);
  assert.match(result.stdout, /今日罪名：\S+/);
  assert.match(result.stdout, /3\.00 倍/);
});

test("today rotates satirical copy deterministically by date", () => {
  const first = runCli(
    ["today", "--date", "2026-07-23", "--source", "codex"],
    { ANTI_AI_CODEX_DIR: baselineCodexDir },
  );
  const repeated = runCli(
    ["today", "--date", "2026-07-23", "--source", "codex"],
    { ANTI_AI_CODEX_DIR: baselineCodexDir },
  );
  const next = runCli(
    ["today", "--date", "2026-07-24", "--source", "codex"],
    { ANTI_AI_CODEX_DIR: baselineCodexDir },
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(next.status, 0, next.stderr);
  const firstCharge = first.stdout.match(/今日罪名：(.+)\n\s+(.+)/)?.[0];
  const repeatedCharge = repeated.stdout.match(/今日罪名：(.+)\n\s+(.+)/)?.[0];
  const nextCharge = next.stdout.match(/今日罪名：(.+)\n\s+(.+)/)?.[0];
  assert.ok(firstCharge);
  assert.equal(repeatedCharge, firstCharge);
  assert.notEqual(nextCharge, firstCharge);
});

test("period footers and share methodology rotate through richer bilingual pools", () => {
  const weekFooters = new Set();
  const monthFooters = new Set();
  const shareMethodology = new Set();

  for (let day = 1; day <= 14; day += 1) {
    const date = `2026-09-${String(day).padStart(2, "0")}`;
    const week = runCli(["week", "--date", date, "--source", "codex"]);
    const month = runCli(["month", "--date", date, "--source", "codex"]);
    const share = runCli([
      "share",
      "--date",
      date,
      "--source",
      "codex",
    ]);

    assert.equal(week.status, 0, week.stderr);
    assert.equal(month.status, 0, month.stderr);
    assert.equal(share.status, 0, share.stderr);
    weekFooters.add(framedFooter(week.stdout));
    monthFooters.add(framedFooter(month.stdout));
    const methodology = share.stdout.match(
      /<text x="72" y="580"[^>]*>([^<]+)<\/text>/,
    )?.[1];
    assert.ok(methodology);
    shareMethodology.add(methodology);
  }

  assert.ok(weekFooters.size >= 12, `week footers: ${weekFooters.size}`);
  assert.ok(monthFooters.size >= 12, `month footers: ${monthFooters.size}`);
  assert.ok(
    shareMethodology.size >= 10,
    `share methodology lines: ${shareMethodology.size}`,
  );

  const english = runCli([
    "week",
    "--date",
    "2026-09-14",
    "--source",
    "codex",
    "--lang",
    "en",
  ]);
  assert.equal(english.status, 0, english.stderr);
  assert.doesNotMatch(framedFooter(english.stdout), /[\p{Script=Han}]/u);
});

test("today composes at least sixty non-repeating charges for one symptom", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-charge-pool-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const charges = [];

  for (let index = 0; index < 60; index += 1) {
    const date = shiftTestDate("2026-06-01", index);
    const root = path.join(workspace, String(index));
    for (let baselineDay = -7; baselineDay < 0; baselineDay += 1) {
      writeCodexUsage(
        root,
        [
          {
            input_tokens: 90,
            output_tokens: 10,
            total_tokens: 100,
          },
        ],
        shiftTestDate(date, baselineDay),
      );
    }
    writeCodexUsage(
      root,
      [
        {
          input_tokens: 290,
          output_tokens: 10,
          total_tokens: 300,
        },
      ],
      date,
    );

    const result = runCli(["today", "--date", date, "--source", "codex"], {
      ANTI_AI_CODEX_DIR: root,
    });
    assert.equal(result.status, 0, result.stderr);
    const charge = result.stdout.match(/今日罪名：(.+)\n\s+(.+)/);
    assert.ok(charge, `missing charge on ${date}`);
    charges.push(`${charge[1]} · ${charge[2]}`);
  }

  assert.equal(new Set(charges).size, 60);
});

test("today does not accuse normal personal cache usage every day", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "anti-ai-cache-baseline-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (let day = 16; day <= 23; day += 1) {
    writeCodexUsage(
      root,
      [
        {
          input_tokens: 100,
          cached_input_tokens: 80,
          output_tokens: 10,
          total_tokens: 110,
        },
      ],
      `2026-07-${day}`,
    );
  }

  const result = runCli(["today", "--date", "2026-07-23", "--source", "codex"], {
    ANTI_AI_CODEX_DIR: root,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /今日罪名：缓存考古学家/);
});

test("today rotates cache offense titles when cache usage is unusually high", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "anti-ai-cache-titles-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (let day = 16; day <= 24; day += 1) {
    writeCodexUsage(
      root,
      [
        {
          input_tokens: 100,
          cached_input_tokens: day >= 23 ? 80 : 40,
          output_tokens: 10,
          total_tokens: 110,
        },
      ],
      `2026-07-${day}`,
    );
  }

  const first = runCli(
    ["today", "--date", "2026-07-23", "--source", "codex"],
    { ANTI_AI_CODEX_DIR: root },
  );
  const second = runCli(
    ["today", "--date", "2026-07-24", "--source", "codex"],
    { ANTI_AI_CODEX_DIR: root },
  );
  const english = runCli(
    [
      "today",
      "--date",
      "2026-07-23",
      "--source",
      "codex",
      "--lang",
      "en",
    ],
    { ANTI_AI_CODEX_DIR: root },
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(english.status, 0, english.stderr);
  const firstTitle = first.stdout.match(/今日罪名：(.+)/)?.[1];
  const secondTitle = second.stdout.match(/今日罪名：(.+)/)?.[1];
  assert.ok(firstTitle);
  assert.ok(secondTitle);
  assert.notEqual(firstTitle, secondTitle);
  assert.match(first.stdout, /缓存占比|缓存占到|旧上下文|旧答案|缓存命中/);
  assert.match(english.stdout, /Today's charge: [A-Z][A-Z -]+/);
  assert.match(english.stdout, /cache/i);
});

test("today settles one creature day and appends a concise mutation summary", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-today-creature-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "today-creature",
  };

  const today = runCli(["today", "--date", "2026-07-23"], env);
  const creature = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    env,
  );

  assert.equal(today.status, 0, today.stderr);
  assert.equal(creature.status, 0, creature.stderr);
  assert.match(
    today.stdout,
    /今日异变体[\s\S]*生态切片\s+污染性 \+1 · 仍为「熄火幼核」[\s\S]*今日成就\s+无/,
  );
  const report = JSON.parse(creature.stdout);
  assert.equal(report.experienceDays, 1);
  assert.deepEqual(report.ecology, {
    pollution: 1,
    clarity: 0,
    pollutionRate: 1,
    clarityRate: 0,
    type: "unformed",
    pendingType: "polluted",
    pendingDays: 1,
  });
});

test("today keeps the mutation section inside the receipt after the daily charge", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-today-layout-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const result = runCli(["today", "--date", "2026-07-23"], {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "today-layout",
  });

  assert.equal(result.status, 0, result.stderr);
  const chargeIndex = result.stdout.indexOf("今日罪名：");
  const mutationIndex = result.stdout.indexOf("今日异变体");
  const closingIndex = result.stdout.lastIndexOf("└");
  assert.ok(chargeIndex >= 0, result.stdout);
  assert.ok(mutationIndex > chargeIndex, result.stdout);
  assert.ok(closingIndex > mutationIndex, result.stdout);
  assert.match(
    result.stdout,
    /今日异变体[\s\S]*查看完整档案\s+anti-ai creature[\s\S]*查看图鉴\s+anti-ai codex/,
  );
  assert.equal(result.stdout.trimEnd().split("\n").at(-1).startsWith("└"), true);
});

test("today keeps small-category comparisons readable for larger values", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "anti-ai-dynamic-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const records = Array.from({ length: 100 }, (_, index) =>
    JSON.stringify({
      timestamp: `2026-07-22T16:${String(index % 60).padStart(2, "0")}:00.000Z`,
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          last_token_usage: {
            input_tokens: 10,
            output_tokens: 1_000,
            total_tokens: 1_010,
          },
        },
      },
    }),
  );
  mkdirSync(path.join(root, "2026", "07", "23"), { recursive: true });
  writeFileSync(
    path.join(root, "2026", "07", "23", "session.jsonl"),
    `${records.join("\n")}\n`,
  );

  const result = runCli(["today", "--date", "2026-07-23", "--source", "codex"], {
    ANTI_AI_CODEX_DIR: root,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /💡\s+10W LED 灯\s+3\.40 小时/);
  assert.match(result.stdout, /📱\s+19Wh 手机充电\s+1\.79 次/);
  assert.match(result.stdout, /🥤\s+550mL 饮用水\s+20\.45 瓶/);
  assert.match(result.stdout, /🚗\s+平均燃油车\s+1\.17 公里/);
  assert.doesNotMatch(result.stdout, /淋浴|洗碗机|标准泳池/);
});

test("week prints the seven-day token trend ending on the requested date", () => {
  const result = runCli(
    ["week", "--date", "2026-07-23"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /YOUR AI HANGOVER · 2026-07-17 → 2026-07-23/,
  );
  assert.match(result.stdout, /07-17\s+·\s+0/);
  assert.match(result.stdout, /07-23\s+█+\s+350/);
  assert.match(result.stdout, /7 日合计\s+350 tokens · 4 次模型请求/);
  assert.match(result.stdout, /Codex · gpt-test\s+180 tokens · 2 次/);
  assert.match(
    result.stdout,
    /Claude Code · claude-test\s+170 tokens · 2 次/,
  );
  assert.match(result.stdout, /7 日资源账单/);
  assert.match(result.stdout, /⚡\s+1\.36 Wh/);
  assert.match(result.stdout, /💧\s+8\.44 mL/);
  assert.match(result.stdout, /☁️\s+0\.21 gCO₂e/);
  assert.match(result.stdout, /🫖\s+烧开 1L 水\s+0\.01 壶/);
  assert.ok(framedFooter(result.stdout));
});

test("week appends a bilingual living casebook from the complete creature history", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-week-casebook-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "week-casebook",
  };

  const chinese = runCli(["week", "--date", "2026-07-23"], env);
  const english = runCli(
    ["week", "--date", "2026-07-23", "--lang", "en"],
    env,
  );

  assert.equal(chinese.status, 0, chinese.stderr);
  assert.equal(english.status, 0, english.stderr);
  assert.match(chinese.stdout, /异变体周报 · 07-17 → 07-23/);
  assert.match(chinese.stdout, /本周主症状\s+核食/);
  assert.match(chinese.stdout, /生态变化\s+污染 \+8 · 清醒 \+0/);
  assert.match(
    chinese.stdout,
    /成长记录\s+阅历 \+7 · 异常胚体 I → 分化幼体 II/,
  );
  assert.match(chinese.stdout, /新增徽章.*基线纵火犯/);
  assert.match(chinese.stdout, /主治意见\s+\S+/);
  assert.match(english.stdout, /MUTATION WEEKLY · 07-17 → 07-23/);
  assert.match(english.stdout, /PRIMARY SYMPTOM\s+NUCLEAR FEEDING/);
  assert.match(english.stdout, /ECOLOGY CHANGE\s+pollution \+8 · clarity \+0/);
  assert.match(english.stdout, /ATTENDING NOTE\s+\S+/);
  assert.doesNotMatch(english.stdout, /异变体周报|本周主症状|生态变化|成长记录/);
});

test("week renders its mutation follow-up after everyday translation inside one frame", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-week-layout-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const result = runCli(["week", "--date", "2026-07-23"], {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "week-layout",
  });

  assert.equal(result.status, 0, result.stderr);
  const translationIndex = result.stdout.indexOf("生活翻译");
  const mutationIndex = result.stdout.indexOf("异变体周报");
  const closingIndex = result.stdout.lastIndexOf("└");
  assert.ok(mutationIndex > translationIndex, result.stdout);
  assert.ok(closingIndex > mutationIndex, result.stdout);
  assert.match(result.stdout, /异变体周报[\s\S]*查看完整档案\s+anti-ai creature/);
  assert.equal(result.stdout.trimEnd().split("\n").at(-1).startsWith("└"), true);
});

test("month prints a calendar heatmap and monthly usage summary", () => {
  const result = runCli(["month", "--date", "2026-07-23", "--source", "codex"], {
    ANTI_AI_CODEX_DIR: baselineCodexDir,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /YOUR AI CALENDAR · 2026-07-01 → 2026-07-23/,
  );
  assert.match(result.stdout, /一\s+二\s+三\s+四\s+五\s+六\s+日/);
  assert.match(result.stdout, /23█/);
  assert.match(result.stdout, /月度合计\s+1,000 tokens · 8 次模型请求/);
  assert.match(result.stdout, /AI 清醒日\s+15 天 \/ 23 天/);
  assert.match(result.stdout, /最长清醒期\s+15 天/);
  assert.match(result.stdout, /最重一天\s+07-23 · 300 tokens/);
  assert.match(
    result.stdout,
    /Codex · gpt-baseline\s+1,000 tokens · 8 次/,
  );
  assert.match(result.stdout, /本月资源账单/);
  assert.match(result.stdout, /⚡\s+2\.72 Wh/);
  assert.match(result.stdout, /💧\s+21\.38 mL/);
  assert.match(result.stdout, /☁️\s+0\.54 gCO₂e/);
  assert.match(result.stdout, /🚗\s+平均燃油车\s+2\.22 米/);
});

test("month appends a bilingual autopsy without diagnosing pre-hatch days", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-month-autopsy-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "month-autopsy",
  };

  const chinese = runCli(["month", "--date", "2026-07-23"], env);
  const english = runCli(
    ["month", "--date", "2026-07-23", "--lang", "en"],
    env,
  );

  assert.equal(chinese.status, 0, chinese.stderr);
  assert.equal(english.status, 0, english.stderr);
  assert.match(chinese.stdout, /月度复诊 · 2026-07/);
  assert.match(chinese.stdout, /有效观察\s+8 天 · 8 天活跃 · 0 天清醒/);
  assert.match(chinese.stdout, /主症状\s+核食/);
  assert.match(
    chinese.stdout,
    /生态人格\s+未定型 → 污染型 · 污染 \+9 · 清醒 \+0/,
  );
  assert.match(chinese.stdout, /成就回顾\s+\[4\].*基线纵火犯/);
  assert.match(chinese.stdout, /复诊意见\s+\S+/);
  assert.match(english.stdout, /MONTHLY FOLLOW-UP · 2026-07/);
  assert.match(english.stdout, /VALID OBSERVATION\s+8 days · 8 active · 0 AI-free/);
  assert.match(english.stdout, /ECOLOGY\s+UNFORMED → POLLUTED/);
  assert.match(english.stdout, /FOLLOW-UP NOTE\s+\S+/);
  assert.doesNotMatch(english.stdout, /月度复诊|有效观察|主症状|生态人格/);
});

test("month aligns calendar cells and renders a monthly follow-up inside the frame", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-month-layout-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const result = runCli(["month", "--date", "2026-07-23"], {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "month-layout",
  });

  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.split("\n");
  const header = lines.find((line) => /一.*二.*三.*四.*五.*六.*日/.test(line));
  const firstWeek = lines.find((line) => /01[·░▒▓█]/.test(line));
  assert.ok(header, result.stdout);
  assert.ok(firstWeek, result.stdout);
  const headerWednesday = terminalWidth(header.slice(0, header.indexOf("三")));
  const dayOne = terminalWidth(firstWeek.slice(0, firstWeek.indexOf("01")));
  assert.equal(dayOne, headerWednesday);

  const translationIndex = result.stdout.indexOf("生活翻译");
  const followUpIndex = result.stdout.indexOf("月度复诊");
  const closingIndex = result.stdout.lastIndexOf("└");
  assert.ok(followUpIndex > translationIndex, result.stdout);
  assert.ok(closingIndex > followUpIndex, result.stdout);
  assert.match(result.stdout, /复诊意见\s+\S+/);
  assert.match(result.stdout, /查看完整档案\s+anti-ai creature/);
  assert.doesNotMatch(result.stdout, /尸检|AUTOPSY/);
  assert.equal(result.stdout.trimEnd().split("\n").at(-1).startsWith("└"), true);
});

test("week and month support English summaries", () => {
  const week = runCli(
    ["week", "--date", "2026-07-23", "--lang", "en"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );
  const month = runCli(
    ["month", "--date", "2026-07-23", "--source", "codex", "--lang", "en"],
    {
      ANTI_AI_CODEX_DIR: baselineCodexDir,
    },
  );

  assert.equal(week.status, 0, week.stderr);
  assert.match(week.stdout, /7-day total\s+350 tokens · 4 model requests/);
  assert.match(week.stdout, /7-day resource bill/);
  assert.ok(framedFooter(week.stdout));
  assert.doesNotMatch(week.stdout, /7 日合计|资源账单|[\p{Script=Han}]/u);

  assert.equal(month.status, 0, month.stderr);
  assert.match(month.stdout, /Mon\s+Tue\s+Wed\s+Thu\s+Fri\s+Sat\s+Sun/);
  assert.match(month.stdout, /Monthly total\s+1,000 tokens · 8 model requests/);
  assert.match(month.stdout, /AI-free days\s+15 days \/ 23 days/);
  assert.match(month.stdout, /Monthly resource bill/);
  assert.doesNotMatch(month.stdout, /月度合计|AI 清醒日|本月资源账单/);
});

test("share prints a privacy-safe SVG without exact tokens or model names", () => {
  const result = runCli(
    ["share", "--date", "2026-07-23"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^<svg\b/);
  assert.match(result.stdout, /YOUR AI RECEIPT/);
  assert.match(result.stdout, /2026-07-23/);
  assert.match(result.stdout, /1\.36 Wh/);
  assert.match(result.stdout, /8\.44 mL/);
  assert.match(result.stdout, /0\.21 gCO₂e/);
  assert.match(result.stdout, /今日罪名：[^<]+/);
  assert.match(result.stdout, /隐私模式：未包含对话、路径、模型名和精确 Token/);
  assert.match(result.stdout, /<\/svg>\n$/);
  assert.doesNotMatch(result.stdout, /350 tokens|gpt-test|claude-test/);
  assert.doesNotMatch(result.stdout, /Codex|Claude Code|\/Users\//);
});

test("share supports a fully English privacy-safe SVG", () => {
  const result = runCli(
    ["share", "--date", "2026-07-23", "--lang", "en"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RESOURCE USE ESTIMATE/);
  assert.doesNotMatch(result.stdout, /PUBLISHED PROXY RANGE/);
  assert.match(result.stdout, /EVERYDAY TRANSLATION/);
  assert.match(result.stdout, /TODAY&apos;S CHARGE: [A-Z][A-Z -]+/);
  assert.match(
    result.stdout,
    /PRIVACY MODE: no chats, paths, model names, or exact tokens/,
  );
  assert.doesNotMatch(result.stdout, /今日罪名|隐私模式|生活翻译/);
});

test("share --card pathology prints a bilingual privacy-safe creature autopsy", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-pathology-card-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "pathology-card",
    ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
  };

  const chinese = runCli(
    ["share", "--card", "pathology", "--date", "2026-07-23"],
    env,
  );
  const english = runCli(
    [
      "share",
      "--card",
      "pathology",
      "--date",
      "2026-07-23",
      "--lang",
      "en",
    ],
    env,
  );

  for (const result of [chinese, english]) {
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^<svg\b/);
    assert.match(result.stdout, /[0-9a-f]{8}/);
    assert.doesNotMatch(result.stdout, /350 tokens|gpt-test|claude-test/);
    assert.doesNotMatch(result.stdout, /Codex|Claude Code|\/Users\//);
  }
  assert.match(chinese.stdout, /异变体病理报告/);
  assert.match(chinese.stdout, /标本编号/);
  assert.match(chinese.stdout, /生态人格/);
  assert.match(chinese.stdout, /隐私模式：无对话、路径、模型名或精确 Token/);
  assert.match(english.stdout, /MUTATION PATHOLOGY REPORT/);
  assert.match(english.stdout, /SPECIMEN ID/);
  assert.match(english.stdout, /ECOLOGY/);
  assert.match(
    english.stdout,
    /PRIVACY MODE: no chats, paths, model names, or exact tokens/,
  );
  assert.doesNotMatch(english.stdout, /异变体病理报告|标本编号|生态人格/);
});

test("share --card pathology reports a recoverable corrupted creature file", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-pathology-corrupt-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(path.join(home, ".anti-ai", "creature.json"), "{not-json\n");

  const result = runCli(
    ["share", "--card", "pathology", "--date", "2026-07-23"],
    { HOME: home },
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(
    result.stderr,
    "病理报告无法读取异变体档案。运行 anti-ai creature reset 后可重新孵化。\n",
  );
  assert.doesNotMatch(result.stderr, /\/Users\/|SyntaxError|at runCreature/);
});

test("share prints privacy-safe specimen and wanted collection cards", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-collection-cards-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "collection-cards",
  };

  const specimen = runCli(
    ["share", "--card", "specimen", "--date", "2026-07-23"],
    env,
  );
  const wanted = runCli(
    [
      "share",
      "--card",
      "wanted",
      "--date",
      "2026-07-23",
      "--lang",
      "en",
    ],
    env,
  );
  const fossil = runCli(
    ["share", "--card", "fossil", "--date", "2026-07-23"],
    env,
  );

  assert.equal(specimen.status, 0, specimen.stderr);
  assert.match(specimen.stdout, /^<svg\b/);
  assert.match(specimen.stdout, /异变标本卡/);
  assert.match(specimen.stdout, /标本编号/);
  assert.match(specimen.stdout, /熄火幼核/);
  assert.match(specimen.stdout, /隐私模式：无对话、路径、模型名或精确 Token/);

  assert.equal(wanted.status, 0, wanted.stderr);
  assert.match(wanted.stdout, /^<svg\b/);
  assert.match(wanted.stdout, /MUTATION WANTED/);
  assert.match(wanted.stdout, /REWARD: ONE MANUAL THOUGHT/);
  assert.match(wanted.stdout, /SPECIMEN ID/);
  assert.doesNotMatch(wanted.stdout, /异变悬赏|标本编号/);

  for (const card of [specimen, wanted]) {
    assert.doesNotMatch(
      card.stdout,
      /350 tokens|gpt-test|claude-test|Codex|Claude Code|\/Users\//,
    );
  }
  assert.equal(fossil.status, 2);
  assert.equal(fossil.stdout, "");
  assert.equal(
    fossil.stderr,
    "当前没有永久化石可生成证书。第 90 个阅历日后再来。\n",
  );
});

test("share --card fossil certifies the latest permanent fossil", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-fossil-card-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  const boundaryDate = shiftTestDate(startDate, 89);
  writeCodexUsage(
    root,
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
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "fossil-card",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );

  const fossil = runCli(
    [
      "share",
      "--card",
      "fossil",
      "--date",
      boundaryDate,
      "--lang",
      "en",
    ],
    env,
  );

  assert.equal(fossil.status, 0, fossil.stderr);
  assert.match(fossil.stdout, /^<svg\b/);
  assert.match(fossil.stdout, /PERMANENT FOSSIL CERTIFICATE/);
  assert.match(fossil.stdout, /GENERATION 1/);
  assert.match(fossil.stdout, /SEALED 2026-03-31/);
  assert.match(fossil.stdout, /FOSSIL ID [0-9a-f]{8}/);
  assert.match(
    fossil.stdout,
    /PRIVACY MODE: no chats, paths, model names, or exact tokens/,
  );
  assert.doesNotMatch(
    fossil.stdout,
    /5,000,100 tokens|mutation-test|Codex|Claude Code|\/Users\//,
  );
});

test("codex --json derives a stable private collection from creature history", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-codex-home-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "codex-test",
  };

  const first = runCli(
    ["codex", "--date", "2026-07-23", "--json"],
    env,
  );
  const second = runCli(
    ["codex", "--date", "2026-07-23", "--json"],
    env,
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.stderr, "");
  assert.equal(second.status, 0, second.stderr);
  const report = JSON.parse(first.stdout);
  assert.deepEqual(JSON.parse(second.stdout), report);
  assert.equal(report.date, "2026-07-23");
  assert.match(report.specimenId, /^[0-9a-f]{8}$/);
  assert.deepEqual(report.summary, {
    fixed: { discovered: 1, total: 50, percent: 2 },
    forms: { discovered: 1, total: 16 },
    achievements: { discovered: 0, total: 24 },
    chromaticAbilities: { discovered: 0, total: 6 },
    scars: { discovered: 0, total: 4 },
    specimens: { discovered: 1 },
    fossils: { discovered: 0 },
  });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(report.sections).map(([key, value]) => [
        key,
        value.length,
      ]),
    ),
    {
      forms: 16,
      achievements: 24,
      chromaticAbilities: 6,
      scars: 4,
      specimens: 1,
      fossils: 0,
    },
  );
  assert.deepEqual(
    report.sections.forms.find(({ id }) => id === "extinguished_core"),
    {
      id: "extinguished_core",
      ecologyId: "unformed",
      pathologyId: "nuclear",
      discovered: true,
      discoveredAt: "2026-07-23",
    },
  );
  assert.deepEqual(report.recent, [
    {
      type: "form",
      id: "extinguished_core",
      discoveredAt: "2026-07-23",
    },
    {
      type: "specimen",
      id: report.sections.specimens[0].id,
      discoveredAt: "2026-07-23",
    },
  ]);
  assert.equal(report.sections.specimens[0].formId, "extinguished_core");
  assert.doesNotMatch(
    first.stdout,
    /350 tokens|gpt-test|claude-test|Codex|Claude Code|\/Users\//,
  );
});

test("codex renders bilingual locked and discovered collections", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-codex-human-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "codex-human",
  };

  const chinese = runCli(["codex", "--date", "2026-07-23"], env);
  const english = runCli(
    ["codex", "--date", "2026-07-23", "--lang", "en"],
    env,
  );
  const filtered = runCli(
    ["codex", "--date", "2026-07-23", "--source", "codex"],
    env,
  );

  assert.equal(chinese.status, 0, chinese.stderr);
  assert.match(chinese.stdout, /病理图鉴 · 2026-07-23/);
  assert.match(chinese.stdout, /固定收藏\s+1 \/ 50 · 2%/);
  assert.match(chinese.stdout, /形态家族\s+\[1 \/ 16\]/);
  assert.match(chinese.stdout, /熄火幼核/);
  assert.match(chinese.stdout, /\?\?\? × 15/);
  assert.match(chinese.stdout, /动态标本\s+\[1\]/);
  assert.match(chinese.stdout, /今日发现\s+\[2\]/);
  assert.match(
    chinese.stdout,
    /隐私图鉴：只保存离散成长结果，不保存对话、路径、模型名或精确 Token/,
  );

  assert.equal(english.status, 0, english.stderr);
  assert.match(english.stdout, /PATHOLOGY CODEX · 2026-07-23/);
  assert.match(english.stdout, /FIXED COLLECTION\s+1 \/ 50 · 2%/);
  assert.match(english.stdout, /FORM FAMILIES\s+\[1 \/ 16\]/);
  assert.match(english.stdout, /EXTINGUISHED CORE/);
  assert.match(english.stdout, /DYNAMIC SPECIMENS\s+\[1\]/);
  assert.match(english.stdout, /TODAY'S DISCOVERIES\s+\[2\]/);
  assert.doesNotMatch(english.stdout, /病理图鉴|固定收藏|形态家族/);

  assert.equal(filtered.status, 2);
  assert.equal(filtered.stdout, "");
  assert.equal(
    filtered.stderr,
    "codex 必须使用完整数据源；请移除 --source 过滤。\n",
  );
});

test("codex colors discovered rarity labels without making color the only signal", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-codex-rarity-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "codex-rarity",
    NO_COLOR: "",
    FORCE_COLOR: "1",
  };

  const colored = runCli(["codex", "--date", "2026-07-23"], env);
  const plain = runCli(["codex", "--date", "2026-07-23"], {
    ...env,
    NO_COLOR: "1",
    FORCE_COLOR: "",
  });

  assert.equal(colored.status, 0, colored.stderr);
  assert.match(colored.stdout, /\u001b\[37m.*COMMON.*\u001b\[0m/);
  assert.match(colored.stdout, /\u001b\[36m.*UNCOMMON.*\u001b\[0m/);
  assert.match(colored.stdout, /\u001b\[35m.*RARE.*\u001b\[0m/);
  assert.equal(plain.status, 0, plain.stderr);
  assert.doesNotMatch(plain.stdout, /\u001b/);
  assert.match(plain.stdout, /COMMON/);
  assert.match(plain.stdout, /UNCOMMON/);
  assert.match(plain.stdout, /RARE/);
});

test("today week and month surface collection discoveries", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-codex-feedback-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "codex-feedback",
  };

  const today = runCli(["today", "--date", "2026-07-23"], env);
  const week = runCli(["week", "--date", "2026-07-23"], env);
  const month = runCli(
    ["month", "--date", "2026-07-23", "--lang", "en"],
    env,
  );

  assert.equal(today.status, 0, today.stderr);
  assert.match(today.stdout, /图鉴入库\s+\+2 · 熄火幼核 · 动态标本/);
  assert.equal(week.status, 0, week.stderr);
  assert.match(
    week.stdout,
    /新增收藏\s+2 · 形态 1 · 成就 0 · 异色 0 · 伤痕 0 · 标本 1 · 化石 0/,
  );
  assert.equal(month.status, 0, month.stderr);
  assert.match(
    month.stdout,
    /NEW COLLECTIONS\s+2 · forms 1 · achievements 0 · chromatics 0 · scars 0 · specimens 1 · fossils 0/,
  );
});

test("creature --json turns the latest 30 days into an initial mutation file", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-home-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    {
      HOME: home,
      ANTI_AI_CREATURE_SEED: "test-seed",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), {
    date: "2026-07-23",
    status: "active",
    stage: "contaminated_embryo",
    branch: "nuclear",
    form: "compute_embryo",
    exposure: 27,
    nextStageAt: 7,
    progressPercent: 14,
    quietStreakDays: 0,
    activeStreakDays: 1,
    ageDays: 1,
    experienceDays: 1,
    observedDays: 30,
    activeDays: 1,
    traits: {
      context: 0.01,
      cache: 15.2,
      frenzy: 1.08,
      nuclear: 22.68,
    },
    level: 1,
    abilities: {
      appetite: 1,
      memory: 0,
      shell: 1,
      mouths: 0,
      glow: 1,
      instability: 0,
      withdrawal: 0,
    },
    abilityPoints: 3,
    dominantAbility: "appetite",
    temperament: "voracious",
    epithet: "token_sink",
    talents: [],
    rareChancePercent: 8,
    rareAbilities: {},
    rareAbilityChancesPercent: {
      rare: 0.5,
      epic: 0.1,
      mythic: 0.02,
    },
    collections: {
      mutationEvents: 1,
      rareMutations: 0,
      talentsUnlocked: 0,
      rareAbilitiesUnlocked: 0,
      achievementsUnlocked: 0,
      formsUnlocked: 1,
      appearancePartsUnlocked: 3,
      specimensCollected: 1,
      fossilsSealed: 0,
      evolutionTriggers: 0,
      evolutionBenefitPoints: 0,
      evolutionCostPoints: 0,
      evolutionsMissed: 0,
    },
    generation: {
      number: 1,
      day: 1,
      length: 90,
      progressPercent: 1,
      inheritedAbilityId: null,
      scarId: null,
    },
    fossils: [],
    evolution: null,
    ecology: {
      pollution: 1,
      clarity: 0,
      pollutionRate: 1,
      clarityRate: 0,
      type: "unformed",
      pendingType: "polluted",
      pendingDays: 1,
    },
    ecologyForm: "extinguished_core",
    appearance: {
      version: 1,
      specimenId: "609f9f4b",
      geneIds: {
        body: "body_03",
        eyes: "eyes_08",
        mouth: "mouth_02",
        core: "core_01",
        limbs: "limbs_06",
        tail: "tail_06",
        pattern: "pattern_02",
      },
      partIds: ["body_03", "eyes_08", "mouth_02"],
      fingerprint: "a78d962af277",
      stageIndex: 0,
      ecology: "unformed",
      pathology: "nuclear",
      formId: "extinguished_core",
      achievementId: null,
      achievementCategory: null,
      rareAbilityId: null,
      scarId: null,
    },
    achievements: {
      unlocked: [],
      recent: [],
      total: 24,
    },
    title: {
      modifierId: "awaiting_shape",
      coreId: "extinguished_core",
      achievementId: null,
    },
    mood: "token_chewing",
    today: {
      pollutionDose: 27,
      usageBand: "calibrating",
      ecologyGains: {
        pollution: 1,
        clarity: 0,
      },
      event: {
        id: "cache_calcification",
        rarity: "common",
      },
      abilityGains: {
        appetite: 1,
        memory: 0,
        shell: 1,
        mouths: 0,
        glow: 1,
        instability: 0,
        withdrawal: 0,
      },
      rareAbilityGain: null,
      achievementUnlockIds: [],
      newTalents: [],
      evolutionEffect: null,
    },
  });
});

test("creature persists one deterministic mutation event per active day", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-event-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "test-seed",
  };

  const first = runCli(["creature", "--date", "2026-07-23", "--json"], env);
  const second = runCli(["creature", "--date", "2026-07-23", "--json"], env);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(JSON.parse(second.stdout), JSON.parse(first.stdout));
  assert.deepEqual(JSON.parse(first.stdout).today.event, {
    id: "cache_calcification",
    rarity: "common",
  });
});

test("creature events and clinical notes have enough deterministic variety", () => {
  const events = new Set();
  for (let day = 0; day < 800; day += 1) {
    events.add(
      creatureEvent(
        "content-richness",
        shiftTestDate("2026-01-01", day),
        999,
      ).id,
    );
  }
  assert.ok(events.size >= 18, `creature events: ${events.size}`);

  for (const symptom of [
    "context",
    "cache",
    "frenzy",
    "nuclear",
    "withdrawal",
    "unhatched",
  ]) {
    const notes = new Set();
    for (let day = 0; day < 120; day += 1) {
      const startDate = shiftTestDate("2026-01-01", day);
      notes.add(
        creatureClinicalNote(
          {
            startDate,
            endDate: shiftTestDate(startDate, 6),
            primarySymptom: symptom,
            ecology: { to: day % 2 === 0 ? "polluted" : "lucid" },
          },
          "zh",
          day % 2 === 0 ? "week" : "month",
        ),
      );
    }
    assert.ok(notes.size >= 5, `${symptom} clinical notes: ${notes.size}`);
  }
});

test("creature gives every settled day neutral experience and exposes ecology", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-ecology-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(["creature", "--date", "2026-07-23", "--json"], {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "ecology-seed",
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.experienceDays, 1);
  assert.deepEqual(report.ecology, {
    pollution: 1,
    clarity: 0,
    pollutionRate: 1,
    clarityRate: 0,
    type: "unformed",
    pendingType: "polluted",
    pendingDays: 1,
  });
  assert.deepEqual(report.today.ecologyGains, {
    pollution: 1,
    clarity: 0,
  });
  assert.equal(report.today.usageBand, "calibrating");
});

test("an unhatched creature keeps the first-stage threshold before generation one", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-unhatched-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  const emptyCodex = path.join(workspace, "empty-codex");
  const emptyClaude = path.join(workspace, "empty-claude");
  mkdirSync(emptyCodex, { recursive: true });
  mkdirSync(emptyClaude, { recursive: true });

  const result = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    {
      HOME: home,
      ANTI_AI_CODEX_DIR: emptyCodex,
      ANTI_AI_CLAUDE_DIR: emptyClaude,
      ANTI_AI_CREATURE_SEED: "unhatched-seed",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.experienceDays, 0);
  assert.equal(report.nextStageAt, 7);
  assert.deepEqual(report.generation, {
    number: 0,
    day: 0,
    length: 90,
    progressPercent: 0,
    inheritedAbilityId: null,
    scarId: null,
  });
});

test("creature uses the seven-day baseline for pollution and rewards quiet days equally", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-ecology-bands-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const regularUsage = [
    {
      input_tokens: 900,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 1_000,
    },
  ];
  const heavyUsage = [
    {
      input_tokens: 1_800,
      cached_input_tokens: 0,
      output_tokens: 200,
      total_tokens: 2_000,
    },
  ];
  for (let day = 1; day <= 7; day += 1) {
    writeCodexUsage(root, regularUsage, `2026-07-${String(day).padStart(2, "0")}`);
  }
  writeCodexUsage(root, heavyUsage, "2026-07-08");
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "ecology-bands",
  };

  const heavy = runCli(["creature", "--date", "2026-07-08", "--json"], env);
  const quiet = runCli(["creature", "--date", "2026-07-09", "--json"], env);

  assert.equal(heavy.status, 0, heavy.stderr);
  assert.equal(quiet.status, 0, quiet.stderr);
  const heavyReport = JSON.parse(heavy.stdout);
  const quietReport = JSON.parse(quiet.stdout);
  assert.equal(heavyReport.experienceDays, 8);
  assert.equal(heavyReport.stage, "mutated_juvenile");
  assert.equal(heavyReport.today.usageBand, "heavy");
  assert.deepEqual(heavyReport.today.ecologyGains, {
    pollution: 1,
    clarity: 0,
  });
  assert.equal(quietReport.experienceDays, 9);
  assert.equal(quietReport.stage, "mutated_juvenile");
  assert.equal(quietReport.today.usageBand, "sober");
  assert.deepEqual(quietReport.today.ecologyGains, {
    pollution: 0,
    clarity: 3,
  });
});

test("creature renders a stable individualized ASCII specimen from its local genome", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-genome-art-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const firstEnv = {
    HOME: path.join(workspace, "first"),
    ANTI_AI_CREATURE_SEED: "genome-first",
  };
  const secondEnv = {
    HOME: path.join(workspace, "second"),
    ANTI_AI_CREATURE_SEED: "genome-second",
  };

  const firstJson = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    firstEnv,
  );
  const repeatedArt = runCli(
    ["creature", "--date", "2026-07-23"],
    firstEnv,
  );
  const firstArt = runCli(
    ["creature", "--date", "2026-07-23"],
    firstEnv,
  );
  const englishArt = runCli(
    ["creature", "--date", "2026-07-23", "--lang", "en"],
    firstEnv,
  );
  const coloredArt = runCli(["creature", "--date", "2026-07-23"], {
    ...firstEnv,
    FORCE_COLOR: "1",
    NO_COLOR: "",
  });
  const secondJson = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    secondEnv,
  );
  const secondArt = runCli(
    ["creature", "--date", "2026-07-23"],
    secondEnv,
  );

  for (const result of [
    firstJson,
    repeatedArt,
    firstArt,
    englishArt,
    coloredArt,
    secondJson,
    secondArt,
  ]) {
    assert.equal(result.status, 0, result.stderr);
  }
  const firstReport = JSON.parse(firstJson.stdout);
  const secondReport = JSON.parse(secondJson.stdout);
  assert.match(firstReport.appearance.specimenId, /^[0-9a-f]{8}$/);
  assert.equal(firstReport.appearance.version, 1);
  assert.deepEqual(Object.keys(firstReport.appearance.geneIds), [
    "body",
    "eyes",
    "mouth",
    "core",
    "limbs",
    "tail",
    "pattern",
  ]);
  assert.ok(firstReport.appearance.partIds.length >= 3);
  assert.match(firstReport.appearance.fingerprint, /^[0-9a-f]{12}$/);
  assert.notEqual(
    firstReport.appearance.fingerprint,
    secondReport.appearance.fingerprint,
  );
  assert.match(firstArt.stdout, new RegExp(`标本编号\\s+${firstReport.appearance.specimenId}`));
  assert.equal(firstArt.stdout, repeatedArt.stdout);

  const artLines = (output) => {
    const lines = output.split("\n");
    const specimenIndex = lines.findIndex(
      (line) => line.includes("标本编号") || line.includes("SPECIMEN ID"),
    );
    return lines.slice(2, specimenIndex - 1);
  };
  const firstArtLines = artLines(firstArt.stdout);
  const englishArtLines = artLines(englishArt.stdout);
  const coloredArtLines = artLines(
    coloredArt.stdout.replace(/\u001b\[[0-9;]*m/g, ""),
  );
  const secondArtLines = artLines(secondArt.stdout);
  assert.deepEqual(firstArtLines, englishArtLines);
  assert.deepEqual(firstArtLines, coloredArtLines);
  assert.notDeepEqual(firstArtLines, secondArtLines);
  assert.ok(firstArtLines.length >= 5);
  assert.ok(firstArtLines.every((line) => terminalWidth(line) <= 39));
  assert.ok(secondArtLines.every((line) => terminalWidth(line) <= 39));
});

test("complete-form ASCII keeps 10,000 seeded specimens diverse and bounded", () => {
  const appearances = new Set();
  for (let index = 0; index < 10_000; index += 1) {
    const appearanceState = creatureAppearanceState(`collision-seed-${index}`);
    const appearance = deriveCreatureAppearance(
      appearanceState,
      3,
      "paradox",
      "context",
      [],
      {},
    );
    const art = creatureArt({ appearance });
    appearances.add(art);
    assert.ok(
      art.split("\n").every((line) => terminalWidth(line) <= 39),
      `seed ${index} exceeded 39 columns`,
    );
  }

  const collisionRate = (10_000 - appearances.size) / 10_000;
  assert.ok(collisionRate <= 0.05, `collision rate was ${collisionRate}`);
  assert.deepEqual(creatureAppearanceContentStats(), {
    basePartIds: 54,
    formFamilies: 16,
    achievements: 24,
  });
});

test("creature unlocks equally visible feeding and sobriety achievements", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-achievements-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const usage = [
    {
      input_tokens: 900,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 1_000,
    },
  ];
  for (let day = 1; day <= 7; day += 1) {
    writeCodexUsage(root, usage, `2026-07-${String(day).padStart(2, "0")}`);
  }
  writeCodexUsage(root, usage, "2026-07-11");
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "achievement-seed",
  };

  const active = runCli(["creature", "--date", "2026-07-07", "--json"], env);
  const quiet = runCli(["creature", "--date", "2026-07-08", "--json"], env);
  const human = runCli(["creature", "--date", "2026-07-08"], env);
  const coloredHuman = runCli(["creature", "--date", "2026-07-08"], {
    ...env,
    FORCE_COLOR: "1",
    NO_COLOR: "",
  });
  const paradoxHuman = runCli(["creature", "--date", "2026-07-11"], {
    ...env,
    FORCE_COLOR: "1",
    NO_COLOR: "",
  });

  assert.equal(active.status, 0, active.stderr);
  assert.equal(quiet.status, 0, quiet.stderr);
  assert.equal(human.status, 0, human.stderr);
  assert.equal(coloredHuman.status, 0, coloredHuman.stderr);
  assert.equal(paradoxHuman.status, 0, paradoxHuman.stderr);
  const activeReport = JSON.parse(active.stdout);
  const quietReport = JSON.parse(quiet.stdout);
  assert.ok(
    activeReport.achievements.unlocked.some(
      (achievement) => achievement.id === "seven_day_feeding",
    ),
  );
  assert.ok(
    quietReport.achievements.unlocked.some(
      (achievement) => achievement.id === "first_supply_cut",
    ),
  );
  assert.deepEqual(
    quietReport.achievements.recent.map((achievement) => achievement.id),
    ["first_supply_cut"],
  );
  assert.equal(
    quietReport.collections.achievementsUnlocked,
    quietReport.achievements.unlocked.length,
  );
  assert.match(quietReport.title.modifierId, /^[a-z_]+$/);
  assert.equal(quietReport.title.coreId, quietReport.ecologyForm);
  assert.match(human.stdout, /徽章\s+\[\d+\]/);
  assert.match(human.stdout, /今日成就\s+第一次断供/);
  assert.match(human.stdout, /称号\s+.*第一次断供/);
  assert.ok(coloredHuman.stdout.includes("\u001b[1;31m七日连喂"));
  assert.ok(coloredHuman.stdout.includes("\u001b[1;36m第一次断供"));
  assert.ok(paradoxHuman.stdout.includes("\u001b[1;33m续杯戒断者"));
});

test("repeatable achievements grow through three non-token tiers", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-achievement-tier-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const usage = [
    {
      input_tokens: 900,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 1_000,
    },
  ];
  for (let day = 1; day <= 30; day += 1) {
    writeCodexUsage(root, usage, `2026-06-${String(day).padStart(2, "0")}`);
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "achievement-tier-seed",
  };

  const json = runCli(["creature", "--date", "2026-06-30", "--json"], env);
  const human = runCli(["creature", "--date", "2026-06-30"], env);

  assert.equal(json.status, 0, json.stderr);
  assert.equal(human.status, 0, human.stderr);
  const achievement = JSON.parse(json.stdout).achievements.unlocked.find(
    (candidate) => candidate.id === "seven_day_feeding",
  );
  assert.deepEqual(achievement, {
    id: "seven_day_feeding",
    category: "offense",
    rarity: "common",
    tier: 2,
    maxTier: 3,
    progress: 30,
    nextTierAt: 100,
    unlockedAt: "2026-06-07",
  });
  assert.match(human.stdout, /七日连喂 \[定罪 30\/100\]/);
});

test("creature grows achievement-marked ASCII complexity without extra token experience", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-art-growth-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 900,
        cached_input_tokens: 0,
        output_tokens: 100,
        total_tokens: 1_000,
      },
    ],
    "2026-01-01",
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "art-growth",
  };

  const hatch = runCli(["creature", "--date", "2026-01-01", "--json"], env);
  const grown = runCli(["creature", "--date", "2026-03-31", "--json"], env);

  assert.equal(hatch.status, 0, hatch.stderr);
  assert.equal(grown.status, 0, grown.stderr);
  const hatchReport = JSON.parse(hatch.stdout);
  const grownReport = JSON.parse(grown.stdout);
  assert.equal(hatchReport.experienceDays, 1);
  assert.equal(hatchReport.appearance.partIds.length, 3);
  assert.equal(grownReport.experienceDays, 90);
  assert.equal(grownReport.stage, "catastrophe_complete");
  assert.equal(grownReport.ecology.type, "lucid");
  assert.equal(grownReport.appearance.partIds.length, 9);
  assert.ok(
    grownReport.appearance.partIds.some((partId) =>
      partId.startsWith("achievement_"),
    ),
  );
  assert.notEqual(
    grownReport.appearance.fingerprint,
    hatchReport.appearance.fingerprint,
  );
});

test("chromatic mutations visibly outrank achievement marks on complete forms", () => {
  const appearanceState = creatureAppearanceState("chromatic-priority");
  const achievements = [
    {
      id: "seven_day_feeding",
      category: "offense",
      rarity: "common",
      tier: 1,
      unlockedAt: "2026-01-07",
    },
  ];
  const achievementOnly = deriveCreatureAppearance(
    appearanceState,
    3,
    "polluted",
    "frenzy",
    achievements,
    {},
  );
  const chromatic = deriveCreatureAppearance(
    appearanceState,
    3,
    "polluted",
    "frenzy",
    achievements,
    { deadline_scent: { rarity: "rare", level: 1 } },
  );

  assert.equal(chromatic.partIds.at(-1), "chromatic_deadline_scent");
  assert.notEqual(chromatic.fingerprint, achievementOnly.fingerprint);
  assert.notEqual(
    creatureArt({ appearance: chromatic }),
    creatureArt({ appearance: achievementOnly }),
  );

  const embryo = deriveCreatureAppearance(
    appearanceState,
    0,
    "unformed",
    "frenzy",
    [],
    {},
  );
  const chromaticEmbryo = deriveCreatureAppearance(
    appearanceState,
    0,
    "unformed",
    "frenzy",
    [],
    { deadline_scent: { rarity: "rare", level: 1 } },
  );
  assert.equal(chromaticEmbryo.partIds.length, 3);
  assert.notEqual(chromaticEmbryo.fingerprint, embryo.fingerprint);
  assert.notEqual(
    creatureArt({ appearance: chromaticEmbryo }),
    creatureArt({ appearance: embryo }),
  );

  const scarredEmbryo = deriveCreatureAppearance(
    appearanceState,
    0,
    "unformed",
    "frenzy",
    [],
    {},
    "sterile_halo",
  );
  assert.ok(scarredEmbryo.partIds.includes("scar_sterile_halo"));
  assert.notEqual(scarredEmbryo.fingerprint, embryo.fingerprint);
  assert.notEqual(
    creatureArt({ appearance: scarredEmbryo }),
    creatureArt({ appearance: embryo }),
  );
});

test("creature grows deterministic random abilities and exposes playable state", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-abilities-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "ability-seed",
  };

  const first = runCli(["creature", "--date", "2026-07-23", "--json"], env);
  const second = runCli(["creature", "--date", "2026-07-23", "--json"], env);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const report = JSON.parse(first.stdout);
  assert.deepEqual(JSON.parse(second.stdout), report);
  assert.deepEqual(Object.keys(report.abilities), [
    "appetite",
    "memory",
    "shell",
    "mouths",
    "glow",
    "instability",
    "withdrawal",
  ]);
  assert.ok(
    Object.values(report.abilities).every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 999,
    ),
  );
  assert.ok(Object.values(report.today.abilityGains).some((value) => value > 0));
  assert.ok(Object.hasOwn(report.abilities, report.dominantAbility));
  assert.ok(report.level >= 1);
  assert.ok(report.abilityPoints > 0);
  assert.match(report.temperament, /^[a-z_]+$/);
  assert.match(report.mood, /^[a-z_]+$/);
  assert.ok(report.rareChancePercent >= 8);
  assert.deepEqual(report.collections, {
    mutationEvents: 1,
    rareMutations: 0,
    talentsUnlocked: report.talents.length,
    rareAbilitiesUnlocked: 0,
    achievementsUnlocked: report.achievements.unlocked.length,
    formsUnlocked: 1,
    appearancePartsUnlocked: report.appearance.partIds.length,
    specimensCollected: 1,
    fossilsSealed: 0,
    evolutionTriggers: 0,
    evolutionBenefitPoints: 0,
    evolutionCostPoints: 0,
    evolutionsMissed: 0,
  });
});

test("creature abilities unlock talents and withdrawal grows on AI-free days", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-ability-growth-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  const usage = [
    {
      input_tokens: 10_000,
      cached_input_tokens: 0,
      output_tokens: 1_000_000,
      total_tokens: 1_010_000,
    },
  ];
  for (let day = 1; day <= 12; day += 1) {
    writeCodexUsage(root, usage, `2026-07-${String(day).padStart(2, "0")}`);
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "talent-seed",
  };

  const active = runCli(["creature", "--date", "2026-07-12", "--json"], env);
  const quiet = runCli(["creature", "--date", "2026-07-13", "--json"], env);

  assert.equal(active.status, 0, active.stderr);
  assert.equal(quiet.status, 0, quiet.stderr);
  const activeReport = JSON.parse(active.stdout);
  const quietReport = JSON.parse(quiet.stdout);
  assert.ok(activeReport.level > 1);
  assert.ok(activeReport.talents.length > 0);
  assert.ok(activeReport.today.newTalents.length > 0);
  assert.equal(
    quietReport.abilities.withdrawal,
    activeReport.abilities.withdrawal + 1,
  );
  assert.equal(quietReport.today.abilityGains.withdrawal, 1);
  assert.equal(quietReport.mood, "withdrawal_tremor");
  assert.equal(
    quietReport.collections.talentsUnlocked,
    quietReport.talents.length,
  );
});

test("grown Instability raises the future rare-mutation chance", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-instability-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const usage = [
    {
      input_tokens: 10_000,
      cached_input_tokens: 0,
      output_tokens: 1_000_000,
      total_tokens: 1_010_000,
    },
  ];
  const startDate = "2026-01-01";
  for (let day = 0; day < 200; day += 1) {
    writeCodexUsage(root, usage, shiftTestDate(startDate, day));
  }

  const env = {
    HOME: path.join(workspace, "home"),
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "instability-0",
  };
  const hatch = runCli(["creature", "--date", startDate, "--json"], env);
  const result = runCli(
    ["creature", "--date", shiftTestDate(startDate, 199), "--json"],
    env,
  );

  assert.equal(hatch.status, 0, hatch.stderr);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.abilities.instability >= 20);
  assert.ok(report.rareChancePercent > 8);
  assert.ok(report.collections.rareMutations > 0);
});

test("creature abilities retain more than one year of growth headroom", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-year-growth-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2025-01-01";
  const usage = [
    {
      input_tokens: 10_000,
      cached_input_tokens: 0,
      output_tokens: 100_000_000,
      total_tokens: 100_010_000,
    },
  ];

  for (let day = 0; day < 400; day += 1) {
    writeCodexUsage(root, usage, shiftTestDate(startDate, day));
  }

  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "one-year-growth",
  };
  const hatch = runCli(
    ["creature", "--date", startDate, "--json"],
    env,
  );
  const grown = runCli(
    ["creature", "--date", shiftTestDate(startDate, 399), "--json"],
    env,
  );

  assert.equal(hatch.status, 0, hatch.stderr);
  assert.equal(grown.status, 0, grown.stderr);
  const report = JSON.parse(grown.stdout);
  const values = Object.values(report.abilities);
  assert.equal(report.activeDays, 400);
  assert.ok(Math.max(...values) > 99);
  assert.ok(Math.max(...values) < 999);
  assert.ok(values.every((value) => value >= 0 && value <= 999));
  assert.ok(report.talents.includes("planetary_feedlot"));
});

test("creature seals a fossil at day ninety and offers balanced next-generation evolution", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-generation-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  writeCodexUsage(
    root,
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
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "generation-seed",
  };

  const hatch = runCli(["creature", "--date", startDate, "--json"], env);
  const boundaryDate = shiftTestDate(startDate, 89);
  const boundary = runCli(
    ["creature", "--date", boundaryDate, "--json"],
    env,
  );
  const next = runCli(
    ["creature", "--date", shiftTestDate(startDate, 90), "--json"],
    env,
  );
  const todayAtBoundary = runCli(["today", "--date", boundaryDate], env);
  const weekAfterBoundary = runCli(
    ["week", "--date", shiftTestDate(startDate, 90)],
    env,
  );

  assert.equal(hatch.status, 0, hatch.stderr);
  assert.equal(boundary.status, 0, boundary.stderr);
  assert.equal(next.status, 0, next.stderr);
  assert.equal(todayAtBoundary.status, 0, todayAtBoundary.stderr);
  assert.match(todayAtBoundary.stdout, /永久化石 #[0-9a-f]{8} 已封存/);
  assert.match(
    todayAtBoundary.stdout,
    /第 2 代进化待选择.*anti-ai creature evolve/,
  );
  assert.equal(weekAfterBoundary.status, 0, weekAfterBoundary.stderr);
  assert.match(
    weekAfterBoundary.stdout,
    /世代  第 1 代 → 第 2 代 · 永久化石 \+1/,
  );
  const boundaryReport = JSON.parse(boundary.stdout);
  assert.deepEqual(boundaryReport.generation, {
    number: 1,
    day: 90,
    length: 90,
    progressPercent: 100,
    inheritedAbilityId: null,
    scarId: null,
  });
  assert.equal(boundaryReport.fossils.length, 1);
  assert.deepEqual(
    (({
      generation,
      sealedAt,
      ecologyId,
      pathologyId,
      inheritanceAbilityId,
      scarId,
    }) => ({
      generation,
      sealedAt,
      ecologyId,
      pathologyId,
      inheritanceAbilityId,
      scarId,
    }))(boundaryReport.fossils[0]),
    {
      generation: 1,
      sealedAt: boundaryDate,
      ecologyId: "lucid",
      pathologyId: "context",
      inheritanceAbilityId: "withdrawal",
      scarId: "sterile_halo",
    },
  );
  assert.match(boundaryReport.fossils[0].id, /^[0-9a-f]{8}$/);
  assert.deepEqual(
    boundaryReport.evolution.options.map(({ slot, category }) => ({
      slot,
      category,
    })),
    [
      { slot: 1, category: "pollution" },
      { slot: 2, category: "clarity" },
      { slot: 3, category: "paradox" },
    ],
  );
  assert.equal(boundaryReport.evolution.generation, 2);
  assert.equal(boundaryReport.evolution.status, "pending");

  const nextReport = JSON.parse(next.stdout);
  assert.equal(nextReport.stage, "contaminated_embryo");
  assert.equal(nextReport.nextStageAt, 97);
  assert.deepEqual(nextReport.generation, {
    number: 2,
    day: 1,
    length: 90,
    progressPercent: 1,
    inheritedAbilityId: "withdrawal",
    scarId: "sterile_halo",
  });
  assert.equal(nextReport.appearance.scarId, "sterile_halo");
  assert.ok(
    nextReport.appearance.partIds.includes("scar_sterile_halo"),
  );
  assert.equal(nextReport.abilities.withdrawal >= 94, true);
  assert.equal(nextReport.collections.fossilsSealed, 1);
});

test("the clarity evolution is powered by AI-free growth rather than token feeding", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-clarity-choice-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 2_000,
        cached_input_tokens: 0,
        output_tokens: 100,
        total_tokens: 2_100,
      },
    ],
    startDate,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "clarity-balance-5",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );

  const result = runCli(
    ["creature", "--date", shiftTestDate(startDate, 89), "--json"],
    env,
  );
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  const clarity = report.evolution.options.find(
    (option) => option.category === "clarity",
  );
  assert.equal(report.ecology.type, "lucid");
  assert.equal(report.abilities.withdrawal >= 89, true);
  assert.equal(clarity.id, "abstinence_sac");
  assert.equal(clarity.abilityId, "withdrawal");
  assert.ok(clarity.procChancePercent > 5);
});

test("creature evolve persists one explicit choice and refuses to rewrite it", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-evolve-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  writeCodexUsage(
    root,
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
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "evolve-seed",
  };
  const boundaryDate = shiftTestDate(startDate, 89);
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );
  assert.equal(
    runCli(["creature", "--date", boundaryDate, "--json"], env).status,
    0,
  );

  const menu = runCli(
    ["creature", "evolve", "--date", boundaryDate, "--json"],
    env,
  );
  assert.equal(menu.status, 0, menu.stderr);
  const pending = JSON.parse(menu.stdout);
  assert.equal(pending.generation, 2);
  assert.equal(pending.status, "pending");
  assert.deepEqual(
    pending.options.map(({ slot, category }) => ({ slot, category })),
    [
      { slot: 1, category: "pollution" },
      { slot: 2, category: "clarity" },
      { slot: 3, category: "paradox" },
    ],
  );

  const choice = runCli(
    ["creature", "evolve", "2", "--date", boundaryDate, "--json"],
    env,
  );
  const repeated = runCli(
    ["creature", "evolve", "2", "--date", boundaryDate, "--json"],
    env,
  );
  const rewrite = runCli(
    ["creature", "evolve", "1", "--date", boundaryDate, "--json"],
    env,
  );

  assert.equal(choice.status, 0, choice.stderr);
  assert.equal(repeated.status, 0, repeated.stderr);
  const selected = JSON.parse(choice.stdout);
  assert.deepEqual(JSON.parse(repeated.stdout), selected);
  assert.equal(selected.generation, 2);
  assert.equal(selected.status, "selected");
  assert.deepEqual(selected.selected, pending.options[1]);
  assert.equal(rewrite.status, 2);
  assert.equal(
    rewrite.stderr,
    "第 2 代进化已经封存，不能改选。\n",
  );
  assert.equal(rewrite.stdout, "");
});

test("creature evolve reports that no choice exists before the first fossil", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-no-evolution-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(
    ["creature", "evolve", "--date", "2026-07-23", "--json"],
    {
      HOME: home,
      ANTI_AI_CREATURE_SEED: "no-evolution-seed",
    },
  );

  assert.equal(result.status, 2);
  assert.equal(result.stderr, "当前没有可选择的进化。\n");
  assert.equal(result.stdout, "");
});

test("selected evolution turns ability and talents into both benefits and costs", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-rule-cost-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  const usage = [
    {
      input_tokens: 5_000_000,
      cached_input_tokens: 0,
      output_tokens: 100_000,
      total_tokens: 5_100_000,
    },
  ];
  for (let day = 0; day < 150; day += 1) {
    writeCodexUsage(root, usage, shiftTestDate(startDate, day));
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "rule-cost-seed",
  };
  const boundaryDate = shiftTestDate(startDate, 89);
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );
  assert.equal(
    runCli(["creature", "--date", boundaryDate, "--json"], env).status,
    0,
  );
  const choice = runCli(
    ["creature", "evolve", "1", "--date", boundaryDate, "--json"],
    env,
  );
  assert.equal(choice.status, 0, choice.stderr);

  const grown = runCli(
    ["creature", "--date", shiftTestDate(startDate, 149), "--json"],
    env,
  );
  const human = runCli(
    ["creature", "--date", shiftTestDate(startDate, 149)],
    env,
  );
  assert.equal(grown.status, 0, grown.stderr);
  assert.equal(human.status, 0, human.stderr);
  const report = JSON.parse(grown.stdout);
  assert.equal(report.generation.number, 2);
  assert.equal(report.evolution.status, "selected");
  assert.equal(report.evolution.selected.category, "pollution");
  assert.ok(report.evolution.selected.procChancePercent > 5);
  assert.ok(report.evolution.selected.talentModifiers > 0);
  assert.ok(report.collections.evolutionTriggers > 0);
  assert.ok(report.collections.evolutionBenefitPoints > 0);
  assert.ok(report.collections.evolutionCostPoints > 0);
  assert.equal(
    report.collections.evolutionBenefitPoints >=
      report.collections.evolutionTriggers,
    true,
  );
  assert.equal(
    report.collections.evolutionCostPoints >=
      report.collections.evolutionTriggers,
    true,
  );
  assert.match(
    human.stdout,
    /进化规则\s+\[污染\].*触发 \d+%.*累计发作 \d+ 次/,
  );
  assert.match(human.stdout, /累计收益 \d+ · 累计代价 \d+/);
});

test("creature renders bilingual fossils, inheritance, and evolution choices", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-generation-copy-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  writeCodexUsage(
    root,
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
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "generation-copy-seed",
  };
  const boundaryDate = shiftTestDate(startDate, 89);
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );

  const zh = runCli(["creature", "--date", boundaryDate], env);
  const en = runCli(
    ["creature", "--date", boundaryDate, "--lang", "en"],
    env,
  );
  const menu = runCli(
    ["creature", "evolve", "--date", boundaryDate, "--lang", "en"],
    env,
  );

  assert.equal(zh.status, 0, zh.stderr);
  assert.match(zh.stdout, /世代\s+第 1 代 · 90 \/ 90 天/);
  assert.match(zh.stdout, /遗传\s+无 · 伤疤\s+无/);
  assert.match(zh.stdout, /永久化石\s+\[1\]/);
  assert.match(zh.stdout, /第 1 代 · 清醒型 · 戒断反应 · 无菌光环/);
  assert.match(zh.stdout, /下一代进化\s+第 2 代 · 待选择/);
  assert.match(zh.stdout, /\n  1\. \[污染\]/);
  assert.match(zh.stdout, /收益.+代价/);
  assert.match(zh.stdout, /anti-ai creature evolve <1\|2\|3>/);

  assert.equal(en.status, 0, en.stderr);
  assert.match(en.stdout, /GENERATION\s+GEN 1 · 90 \/ 90 DAYS/);
  assert.match(en.stdout, /INHERITANCE\s+NONE · SCAR\s+NONE/);
  assert.match(en.stdout, /PERMANENT FOSSILS\s+\[1\]/);
  assert.match(en.stdout, /GEN 1 · LUCID · WITHDRAWAL · STERILE HALO/);
  assert.match(en.stdout, /NEXT EVOLUTION\s+GEN 2 · PENDING/);
  assert.match(en.stdout, /\n  1\. \[POLLUTION\]/);
  assert.match(en.stdout, /BENEFIT.+COST/);

  assert.equal(menu.status, 0, menu.stderr);
  assert.match(menu.stdout, /GENERATION 2 EVOLUTION · PENDING/);
  assert.match(menu.stdout, /1\. \[POLLUTION\]/);
  assert.match(menu.stdout, /2\. \[CLARITY\]/);
  assert.match(menu.stdout, /3\. \[PARADOX\]/);
});

test("an ignored evolution expires without blocking later generations", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-missed-evolution-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  writeCodexUsage(
    root,
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
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "missed-evolution-seed",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );

  const thirdGeneration = runCli(
    ["creature", "--date", shiftTestDate(startDate, 180), "--json"],
    env,
  );
  assert.equal(thirdGeneration.status, 0, thirdGeneration.stderr);
  const report = JSON.parse(thirdGeneration.stdout);
  assert.equal(report.generation.number, 3);
  assert.equal(report.generation.day, 1);
  assert.equal(report.fossils.length, 2);
  assert.equal(report.fossils[1].evolutionId, null);
  assert.equal(report.evolution.generation, 3);
  assert.equal(report.evolution.status, "pending");
  assert.equal(report.collections.evolutionsMissed, 1);

  const saved = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  assert.equal(saved.generations.evolutions["2"].status, "missed");
  assert.equal(saved.generations.evolutions["3"].status, "pending");
});

test("creature awakens deterministic low-probability rare abilities", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-rare-ability-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(["creature", "--date", "2026-07-23", "--json"], {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "rare-ability-297",
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.rareAbilityChancesPercent, {
    rare: 0.5,
    epic: 0.1,
    mythic: 0.02,
  });
  assert.deepEqual(report.rareAbilities, {
    deadline_scent: {
      rarity: "rare",
      level: 1,
    },
  });
  assert.deepEqual(report.today.rareAbilityGain, {
    id: "deadline_scent",
    rarity: "rare",
    points: 1,
  });
  assert.equal(report.collections.rareAbilitiesUnlocked, 1);
});

test("drawing the same rare ability again grows its level", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-rare-growth-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const usage = [
    {
      input_tokens: 1_000,
      cached_input_tokens: 0,
      output_tokens: 1_000,
      total_tokens: 2_000,
    },
  ];
  writeCodexUsage(root, usage, "2026-07-12");
  writeCodexUsage(root, usage, "2026-08-27");
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "growth-3",
  };

  const first = runCli(
    ["creature", "--date", "2026-07-12", "--json"],
    env,
  );
  const second = runCli(
    ["creature", "--date", "2026-08-27", "--json"],
    env,
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const report = JSON.parse(second.stdout);
  assert.deepEqual(report.rareAbilities.rubber_duck_necromancy, {
    rarity: "rare",
    level: 2,
  });
  assert.deepEqual(report.today.rareAbilityGain, {
    id: "rubber_duck_necromancy",
    rarity: "rare",
    points: 1,
  });
});

test("v0.6 creature files migrate without losing stored ability growth", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-v06-migration-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const days = {};
  const startDate = "2026-01-01";
  for (let day = 0; day < 100; day += 1) {
    days[shiftTestDate(startDate, day)] = {
      pollutionDose: 40,
      active: true,
      traits: {
        context: 0,
        cache: 0,
        frenzy: 40,
        nuclear: 0,
      },
      event: {
        id: "request_budding",
        rarity: "common",
      },
      abilityGains: {
        appetite: 1,
        memory: 0,
        shell: 0,
        mouths: 2,
        glow: 0,
        instability: 0,
        withdrawal: 0,
      },
    };
  }
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 2,
      seed: "v06-migration",
      days,
    })}\n`,
  );
  const env = { HOME: home };
  const date = shiftTestDate(startDate, 99);

  const first = runCli(["creature", "--date", date, "--json"], env);
  const second = runCli(["creature", "--date", date, "--json"], env);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const report = JSON.parse(first.stdout);
  assert.deepEqual(JSON.parse(second.stdout), report);
  assert.equal(report.abilities.mouths, 203);
  assert.equal(report.generation.inheritedAbilityId, "mouths");
  assert.equal(report.collections.fossilsSealed, 1);
  assert.ok(report.collections.rareAbilitiesUnlocked >= 0);
});

test("schema v1-v4 creature files migrate idempotently to private generation state", (t) => {
  for (const schemaVersion of [1, 2, 3, 4]) {
    const home = mkdtempSync(
      path.join(tmpdir(), `anti-ai-schema-${schemaVersion}-`),
    );
    t.after(() => rmSync(home, { recursive: true, force: true }));
    mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
    writeFileSync(
      path.join(home, ".anti-ai", "creature.json"),
      `${JSON.stringify({
        schemaVersion,
        seed: `schema-${schemaVersion}`,
        days: {
          "2026-07-01": {
            pollutionDose: 40,
            active: true,
            traits: {
              context: 40,
              cache: 0,
              frenzy: 0,
              nuclear: 0,
            },
            event: {
              id: "misplaced_context",
              rarity: "common",
            },
          },
          "2026-07-02": {
            pollutionDose: 0,
            active: false,
            traits: {
              context: 0,
              cache: 0,
              frenzy: 0,
              nuclear: 0,
            },
            event: null,
          },
        },
      })}\n`,
    );
    const env = { HOME: home };

    const first = runCli(
      ["creature", "--date", "2026-07-02", "--json"],
      env,
    );
    const second = runCli(
      ["creature", "--date", "2026-07-02", "--json"],
      env,
    );

    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.deepEqual(JSON.parse(second.stdout), JSON.parse(first.stdout));
    const report = JSON.parse(first.stdout);
    assert.equal(report.experienceDays, 2);
    assert.equal(report.ecology.pollution, 1);
    assert.equal(report.ecology.clarity, 3);
    const saved = JSON.parse(
      readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
    );
    assert.equal(saved.schemaVersion, 5);
    assert.equal(saved.appearance.version, 1);
    assert.match(saved.appearance.specimenId, /^[0-9a-f]{8}$/);
    assert.equal(saved.specimens.length, 1);
    assert.match(saved.specimens[0].fingerprint, /^[0-9a-f]{12}$/);
    assert.equal(saved.specimens[0].renderVersion, 1);
    assert.equal(saved.specimens[0].recordedAt, "2026-07-02");
    assert.deepEqual(saved.days["2026-07-02"].ecologyGains, {
      pollution: 0,
      clarity: 3,
    });
    assert.deepEqual(saved.generations, {
      fossils: [],
      evolutions: {},
    });
    assert.doesNotMatch(
      JSON.stringify(saved),
      /totalTokens|modelName|prompt|response|requestTimestamp/,
    );
  }
});

test("creature can reach a rare mutation from its local deterministic seed", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-rare-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(["creature", "--date", "2026-07-23", "--json"], {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "rare-4",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).today.event, {
    id: "infinite_appendix",
    rarity: "rare",
  });
});

test("creature evolves into four branches from distinct usage patterns", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-branches-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const patterns = {
    context: [
      {
        input_tokens: 5_000_000,
        cached_input_tokens: 0,
        output_tokens: 100,
        total_tokens: 5_000_100,
      },
    ],
    cache: [
      {
        input_tokens: 1_000_000,
        cached_input_tokens: 950_000,
        output_tokens: 100,
        total_tokens: 1_000_100,
      },
    ],
    frenzy: Array.from({ length: 60 }, () => ({
      input_tokens: 1_000,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 1_100,
    })),
    nuclear: [
      {
        input_tokens: 10_000,
        cached_input_tokens: 0,
        output_tokens: 1_000_000,
        total_tokens: 1_010_000,
      },
    ],
  };
  const actual = {};

  for (const [name, usages] of Object.entries(patterns)) {
    const root = path.join(workspace, name, "codex");
    const home = path.join(workspace, name, "home");
    mkdirSync(home, { recursive: true });
    writeCodexUsage(root, usages);
    const result = runCli(["creature", "--date", "2026-07-23", "--json"], {
      HOME: home,
      ANTI_AI_CODEX_DIR: root,
      ANTI_AI_CREATURE_SEED: "branch-seed",
    });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    actual[name] = {
      branch: report.branch,
      form: report.form,
      ecologyForm: report.ecologyForm,
    };
  }

  assert.deepEqual(actual, {
    context: {
      branch: "context",
      form: "context_polyp",
      ecologyForm: "blank_dossier_embryo",
    },
    cache: {
      branch: "cache",
      form: "cache_moss",
      ecologyForm: "standby_moss",
    },
    frenzy: {
      branch: "frenzy",
      form: "request_spore",
      ecologyForm: "unsent_spore",
    },
    nuclear: {
      branch: "nuclear",
      form: "compute_embryo",
      ecologyForm: "extinguished_core",
    },
  });
});

test("creature evolves across active days and becomes dormant on AI-free days", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-evolution-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  const heavyContextUsage = [
    {
      input_tokens: 5_000_000,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 5_000_100,
    },
  ];
  for (const date of ["2026-07-20", "2026-07-21", "2026-07-22"]) {
    writeCodexUsage(root, heavyContextUsage, date);
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "evolution-seed",
  };

  const firstQuietDay = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    env,
  );
  const secondQuietDay = runCli(
    ["creature", "--date", "2026-07-24", "--json"],
    env,
  );

  assert.equal(firstQuietDay.status, 0, firstQuietDay.stderr);
  assert.equal(secondQuietDay.status, 0, secondQuietDay.stderr);
  assert.deepEqual(
    [firstQuietDay, secondQuietDay].map((result) => {
      const report = JSON.parse(result.stdout);
      return {
        status: report.status,
        stage: report.stage,
        branch: report.branch,
        form: report.form,
        experienceDays: report.experienceDays,
        ecologyType: report.ecology.type,
        exposure: report.exposure,
        quietStreakDays: report.quietStreakDays,
        event: report.today.event,
      };
    }),
    [
      {
        status: "dormant",
        stage: "contaminated_embryo",
        branch: "context",
        form: "context_polyp",
        experienceDays: 4,
        ecologyType: "polluted",
        exposure: 238,
        quietStreakDays: 1,
        event: null,
      },
      {
        status: "dormant",
        stage: "contaminated_embryo",
        branch: "context",
        form: "context_polyp",
        experienceDays: 5,
        ecologyType: "polluted",
        exposure: 236,
        quietStreakDays: 2,
        event: null,
      },
    ],
  );
});

test("creature backfills the full gap between visits after its initial 30 days", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-gap-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  const usage = [
    {
      input_tokens: 5_000_000,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 5_000_100,
    },
  ];
  writeCodexUsage(root, usage, "2026-06-01");
  writeCodexUsage(root, usage, "2026-07-01");
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "gap-seed",
  };

  const firstVisit = runCli(
    ["creature", "--date", "2026-06-01", "--json"],
    env,
  );
  const laterVisit = runCli(
    ["creature", "--date", "2026-08-15", "--json"],
    env,
  );

  assert.equal(firstVisit.status, 0, firstVisit.stderr);
  assert.equal(laterVisit.status, 0, laterVisit.stderr);
  assert.equal(JSON.parse(firstVisit.stdout).activeDays, 1);
  assert.equal(JSON.parse(laterVisit.stdout).activeDays, 2);
});

test("creature renders bilingual mutation files without leaking raw usage", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-copy-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const env = {
    HOME: path.join(workspace, "home"),
    ANTI_AI_CREATURE_SEED: "test-seed",
  };
  mkdirSync(env.HOME, { recursive: true });

  const zh = runCli(["creature", "--date", "2026-07-23"], env);
  const en = runCli(
    ["creature", "--date", "2026-07-23", "--lang", "en"],
    env,
  );

  assert.equal(zh.status, 0, zh.stderr);
  assert.match(zh.stdout, /TOKEN MUTATION FILE · 2026-07-23/);
  assert.match(zh.stdout, /☢ 今日污染剂量\s+\+27/);
  assert.match(zh.stdout, /阶段\s+异常胚体 I · 14%/);
  assert.match(zh.stdout, /进化分支\s+核食系/);
  assert.match(zh.stdout, /生态人格\s+未定型/);
  assert.match(zh.stdout, /形态\s+熄火幼核/);
  assert.match(zh.stdout, /标本编号\s+[0-9a-f]{8}/);
  assert.match(zh.stdout, /徽章\s+\[\d+\]/);
  assert.match(zh.stdout, /今日成就/);
  assert.match(zh.stdout, /今日突变\s+\[普通\] 缓存钙化/);
  assert.match(zh.stdout, /能力值 · Lv\.\d+/);
  assert.match(zh.stdout, /吞噬欲/);
  assert.match(zh.stdout, /今日加点/);
  assert.match(zh.stdout, /今日解锁/);
  assert.match(zh.stdout, /畸变天赋/);
  assert.match(zh.stdout, /性格\s+/);
  assert.match(zh.stdout, /心情\s+/);
  assert.match(
    zh.stdout,
    /化石、进化选择.*不保存对话、路径、模型名或精确 Token/,
  );
  assert.doesNotMatch(zh.stdout, /180 tokens|gpt-test|Codex|\/Users\//);

  assert.equal(en.status, 0, en.stderr);
  assert.match(en.stdout, /TODAY'S POLLUTION DOSE\s+\+27/);
  assert.match(en.stdout, /STAGE\s+ANOMALOUS EMBRYO I · 14%/);
  assert.match(en.stdout, /EVOLUTION BRANCH\s+NUCLEAR FEEDER/);
  assert.match(en.stdout, /ECOLOGY\s+UNFORMED/);
  assert.match(en.stdout, /FORM\s+EXTINGUISHED CORE/);
  assert.match(en.stdout, /SPECIMEN ID\s+[0-9a-f]{8}/);
  assert.match(en.stdout, /BADGES\s+\[\d+\]/);
  assert.match(en.stdout, /TODAY'S ACHIEVEMENTS/);
  assert.match(en.stdout, /TODAY'S MUTATION\s+\[COMMON\] CACHE CALCIFICATION/);
  assert.match(en.stdout, /ABILITIES · LV\.\d+/);
  assert.match(en.stdout, /APPETITE/);
  assert.match(en.stdout, /TODAY'S GROWTH/);
  assert.match(en.stdout, /TODAY'S UNLOCKS/);
  assert.match(en.stdout, /MUTATION TALENTS/);
  assert.match(en.stdout, /TEMPERAMENT\s+/);
  assert.match(en.stdout, /MOOD\s+/);
  assert.match(
    en.stdout,
    /fossils, evolution choices.*stores no chats, paths, model names, or exact tokens/,
  );
  assert.doesNotMatch(en.stdout, /今日污染|阶段|进化分支|今日突变/);
});

test("creature uses horizontal space for a compact default and keeps full detail on demand", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-layout-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "creature-layout",
    COLUMNS: "120",
  };
  const compact = runCli(["creature", "--date", "2026-07-23"], env);
  const full = runCli(["creature", "--date", "2026-07-23", "--full"], env);

  assert.equal(compact.status, 0, compact.stderr);
  assert.equal(full.status, 0, full.stderr);
  const compactLines = compact.stdout.trimEnd().split("\n");
  const fullLines = full.stdout.trimEnd().split("\n");
  assert.ok(compactLines.length <= 34, compact.stdout);
  assert.ok(fullLines.length > compactLines.length, full.stdout);
  assert.match(compact.stdout, /│/);
  assert.match(compact.stdout, /完整病历\s+anti-ai creature --full/);
  assert.match(full.stdout, /永久化石[\s\S]*每日觉醒率/);
  assert.ok(compactLines.every((line) => terminalWidth(line) <= 120));
});

test("creature compact fallback does not overflow an 80-column terminal", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-narrow-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const result = runCli(["creature", "--date", "2026-07-23"], {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "creature-narrow",
    COLUMNS: "80",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    result.stdout
      .trimEnd()
      .split("\n")
      .every((line) => terminalWidth(line) <= 80),
    result.stdout,
  );
  assert.match(result.stdout, /完整病历\s+anti-ai creature --full/);
});

test("creature ability bars and numeric values align in both languages", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-alignment-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const env = {
    HOME: path.join(workspace, "home"),
    ANTI_AI_CREATURE_SEED: "alignment-seed",
  };
  mkdirSync(env.HOME, { recursive: true });

  const reports = [
    runCli(["creature", "--date", "2026-07-23"], env),
    runCli(["creature", "--date", "2026-07-23", "--lang", "en"], env),
  ];

  for (const report of reports) {
    assert.equal(report.status, 0, report.stderr);
    const lines = report.stdout
      .split("\n")
      .filter((line) => /[█░]{10}/u.test(line));
    assert.equal(lines.length, 7);
    const barColumns = lines.map((line) =>
      terminalWidth(line.slice(0, line.search(/[█░]/u))),
    );
    assert.equal(new Set(barColumns).size, 1);
    assert.ok(lines.every((line) => /[█░]{10} [ 0-9]{3} \/ 999$/u.test(line)));
  }
});

test("rare ability tiers use distinct terminal colors", (t) => {
  const cases = [
    ["rare-ability-297", "1;36", "[R] 截止日嗅觉"],
    ["rare-ability-268", "1;35", "[SR] 幻觉抗体"],
    ["rare-ability-345", "1;33", "[SSR] Token 炼金术"],
  ];

  for (const [seed, code, label] of cases) {
    const home = mkdtempSync(path.join(tmpdir(), "anti-ai-rare-color-"));
    t.after(() => rmSync(home, { recursive: true, force: true }));
    const result = runCli(["creature", "--date", "2026-07-23"], {
      HOME: home,
      ANTI_AI_CREATURE_SEED: seed,
      FORCE_COLOR: "1",
      NO_COLOR: "",
    });

    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes(`\u001b[${code}m${label}`));
  }
});

test("creature reset removes prior evolution through an explicit CLI action", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-reset-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 5_000_000,
        cached_input_tokens: 0,
        output_tokens: 100,
        total_tokens: 5_000_100,
      },
    ],
    "2026-06-01",
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "reset-seed",
  };

  const before = runCli(["creature", "--date", "2026-06-01", "--json"], env);
  const reset = runCli(["creature", "reset", "--json"], env);
  const after = runCli(["creature", "--date", "2026-07-23", "--json"], {
    ...env,
    ANTI_AI_CODEX_DIR: path.join(workspace, "empty-codex"),
  });

  assert.equal(before.status, 0, before.stderr);
  assert.equal(reset.status, 0, reset.stderr);
  assert.deepEqual(JSON.parse(reset.stdout), { reset: true });
  assert.equal(after.status, 0, after.stderr);
  assert.deepEqual(
    (({ status, exposure, activeDays, quietStreakDays }) => ({
      status,
      exposure,
      activeDays,
      quietStreakDays,
    }))(JSON.parse(after.stdout)),
    {
      status: "dormant",
      exposure: 0,
      activeDays: 0,
      quietStreakDays: 0,
    },
  );
});

test("creature rejects filtered sources that would corrupt one evolution history", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-source-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(
    ["creature", "--date", "2026-07-23", "--source", "codex"],
    { HOME: home },
  );

  assert.equal(result.status, 2);
  assert.equal(
    result.stderr,
    "creature 必须使用完整数据源；请移除 --source 过滤。\n",
  );
  assert.equal(result.stdout, "");
});

test("creature reports a recoverable error for a corrupted mutation file", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-corrupt-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(path.join(home, ".anti-ai", "creature.json"), "{not-json\n");

  const result = runCli(["creature", "--date", "2026-07-23"], { HOME: home });

  assert.equal(result.status, 1);
  assert.equal(
    result.stderr,
    "异变体档案无法读取。运行 anti-ai creature reset 后可重新孵化。\n",
  );
  assert.equal(result.stdout, "");
  assert.doesNotMatch(result.stderr, /\/Users\/|SyntaxError|at runCreature/);
});

test("doctor reports all supported sources and their accounting precision", () => {
  const result = runCli(
    ["doctor"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Codex\s+✓\s+1 个 JSONL 文件\s+·\s+逐消息精确/);
  assert.match(
    result.stdout,
    /Claude Code\s+✓\s+1 个 JSONL 文件\s+·\s+逐消息精确/,
  );
  assert.match(result.stdout, /OpenCode\s+✗\s+未找到 SQLite\s+·\s+逐消息精确/);
  assert.match(result.stdout, /OpenClaw\s+✗\s+0 个 JSONL 文件\s+·\s+逐消息精确/);
  assert.match(result.stdout, /Hermes\s+✗\s+未找到 SQLite\s+·\s+会话级近似/);
  assert.match(result.stdout, /Pi\s+✗\s+0 个 JSONL 文件\s+·\s+逐条目精确/);
  assert.match(result.stdout, /不采集、不保存、不输出会话正文/);
});

test("doctor treats missing SQLite parent directories as unavailable", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-doctor-empty-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(["doctor"], {
    HOME: home,
    ANTI_AI_OPENCODE_DB: path.join(home, "missing", "opencode", "opencode.db"),
    ANTI_AI_HERMES_DB: path.join(home, "missing", "hermes", "state.db"),
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OpenCode\s+✗\s+未找到 SQLite/);
  assert.match(result.stdout, /Hermes\s+✗\s+未找到 SQLite/);
});

test("explain discloses every estimate factor, formula, source, and limitation", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /资源消耗估算，不是实际测量值/);
  assert.doesNotMatch(result.stdout, /公开代理跨度/);
  assert.match(result.stdout, /Google.*0\.24 Wh.*0\.26 mL.*0\.03 gCO₂e/s);
  assert.match(result.stdout, /OpenAI.*0\.34 Wh.*0\.32176 mL/s);
  assert.match(result.stdout, /Mistral.*400 输出 tokens.*45 mL.*1\.14 gCO₂e/s);
  assert.match(result.stdout, /受支持的本地 Agent 都没有公开逐请求资源账单/);
  assert.match(result.stdout, /每项资源只展示数值最高的案例/);
  assert.doesNotMatch(result.stdout, /置信度|跨度|min\/max/);
  assert.match(result.stdout, /https:\/\/services\.google\.com\//);
  assert.match(result.stdout, /https:\/\/blog\.samaltman\.com\//);
  assert.match(result.stdout, /https:\/\/mistral\.ai\//);
});

test("explain supports focused resource and comparison topics", () => {
  const resources = runCli(["explain", "resources"]);
  const comparisons = runCli(["explain", "comparisons", "--lang", "en"]);
  const creature = runCli(["explain", "creature"]);

  assert.equal(resources.status, 0, resources.stderr);
  assert.match(resources.stdout, /公开高位参照/);
  assert.match(resources.stdout, /Google.*请求级生产测量.*0\.24 Wh/s);
  assert.match(resources.stdout, /OpenAI.*请求级公开平均.*0\.34 Wh/s);
  assert.match(resources.stdout, /Mistral.*生命周期高位.*400 输出 tokens/s);
  assert.match(resources.stdout, /分别计算.*只展示数值最高的具名案例/s);
  assert.doesNotMatch(resources.stdout, /污染进化系统|置信度/);

  assert.equal(comparisons.status, 0, comparisons.stderr);
  assert.match(comparisons.stdout, /19Wh phone charge/);
  assert.match(comparisons.stdout, /244\.2 gCO₂e\/km/);
  assert.match(comparisons.stdout, /7\.6L\/min WaterSense shower/);
  assert.match(comparisons.stdout, /12\.1L ENERGY STAR dishwasher/);
  assert.match(comparisons.stdout, /2\.5ML competition pool/);
  assert.match(comparisons.stdout, /12,194kWh\/year.*33\.4kWh\/day/s);
  assert.match(comparisons.stdout, /epa\.gov\/watersense\/showerheads/);
  assert.match(comparisons.stdout, /energystar\.gov\/products\/dishwashers/);
  assert.doesNotMatch(comparisons.stdout, /Mutation system/);

  assert.equal(creature.status, 0, creature.stderr);
  assert.match(creature.stdout, /异变体成长/);
  assert.match(creature.stdout, /能力上限 999/);
  assert.match(creature.stdout, /AI 清醒日.*清醒性/);
  assert.doesNotMatch(creature.stdout, /Google|OpenAI|Mistral/);
});

test("explain discloses the assumptions behind everyday comparisons", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /10W LED 灯.*电力 Wh ÷ 10W/s);
  assert.match(result.stdout, /50W 笔记本电脑.*电力 Wh ÷ 50W/s);
  assert.match(result.stdout, /19Wh 手机充电.*电力 Wh ÷ 19Wh/s);
  assert.match(result.stdout, /烧开 1L 水.*电力 Wh ÷ 100Wh/s);
  assert.match(result.stdout, /0\.05mL 一滴水.*550mL 饮用水/s);
  assert.match(result.stdout, /1kW 微波炉.*1,000W/s);
  assert.match(result.stdout, /WaterSense 淋浴.*7,600mL\/min/s);
  assert.match(result.stdout, /ENERGY STAR 洗碗机.*12,100mL/s);
  assert.match(result.stdout, /250 万升泳池.*33\.4kWh.*150L/s);
  assert.match(result.stdout, /12,194kWh\/年.*33\.4kWh\/天/s);
  assert.match(result.stdout, /不足 0\.01 次.*还差多少倍.*0\.00/s);
  assert.match(result.stdout, /平均燃油车.*244\.2 g CO₂e\/公里/s);
  assert.match(result.stdout, /城市树.*60 kg CO₂\/年/s);
  assert.match(result.stdout, /不换算成“砍了几棵树”/);
  assert.match(result.stdout, /https:\/\/www\.epa\.gov\/energy\//);
});

test("explain discloses the personal baseline and verdict rules", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /个人基线与判词.*过去 7 个自然日/s);
  assert.match(
    result.stdout,
    /上下文囤积.*请求数不高于基线 1\.2 倍.*单次 Token 不低于 1\.8 倍/s,
  );
  assert.match(result.stdout, /请求连发.*请求数不低于基线 2 倍/s);
  assert.match(
    result.stdout,
    /缓存类罪名.*缓存读取占输入至少 70%.*高出个人基线至少 10 个百分点/s,
  );
  assert.match(result.stdout, /同类罪名标题和文案按日期固定轮换/);
  assert.match(result.stdout, /判词由本地固定规则生成，不调用模型/);
  assert.match(result.stdout, /文案按日期固定轮换/);
  assert.match(result.stdout, /11 个罪名标题.*13 条详情.*143 种/s);
  assert.match(result.stdout, /跨月.*不会重置/s);
});

test("explain discloses how model usage is attributed", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /模型统计/);
  assert.match(result.stdout, /Codex.*turn_context.*model/s);
  assert.match(result.stdout, /Claude Code.*message\.model/s);
  assert.match(result.stdout, /OpenCode.*session_message/s);
  assert.match(result.stdout, /OpenClaw.*reset JSONL/s);
  assert.match(result.stdout, /Hermes.*会话级近似/s);
  assert.match(result.stdout, /Pi.*compaction.*branch_summary/s);
  assert.match(result.stdout, /缺少模型字段.*unknown/s);
  assert.match(
    result.stdout,
    /分享卡片.*不包含对话、路径、模型名或精确 Token/s,
  );
  assert.match(result.stdout, /anti-ai share --card pathology/);
  assert.match(result.stdout, /活体病历.*月度复诊/s);
});

test("explain discloses creature growth, chance, recovery, and state privacy", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /污染进化系统/);
  assert.match(
    result.stdout,
    /污染剂量.*log10\(当日 Token \+ 1\).*每日上限 100/s,
  );
  assert.match(result.stdout, /首次运行回看最近 30 个自然日/);
  assert.match(
    result.stdout,
    /上下文病变.*非缓存输入.*缓存化石.*缓存读取占比.*请求增殖.*请求数.*核食.*兜底/s,
  );
  assert.match(result.stdout, /生命阶段.*1、7、30、90/s);
  assert.match(result.stdout, /SHA-256.*8%.*稀有突变/s);
  assert.match(
    result.stdout,
    /7 个能力值.*吞噬欲.*赘生脑回.*化石甲.*请求口器.*核素亮度.*失控指数.*戒断反应/s,
  );
  assert.match(result.stdout, /活跃日.*确定性随机加点/s);
  assert.match(
    result.stdout,
    /失控指数.*每 10 点.*稀有突变率.*1.*上限 20%/s,
  );
  assert.match(result.stdout, /能力上限 999/);
  assert.match(
    result.stdout,
    /能力值达到 5、15、30、100、300、700.*解锁.*畸变天赋/s,
  );
  assert.match(
    result.stdout,
    /异色能力.*R 0\.50%.*SR 0\.10%.*SSR 0\.02%.*重复觉醒.*升级/s,
  );
  assert.match(result.stdout, /AI 清醒日.*污染 -2.*不会清除历史性状/s);
  assert.match(result.stdout, /~\/\.anti-ai\/creature\.json/);
  assert.match(
    result.stdout,
    /schema v5.*用量带、派生生态点、基因\/部件 ID、成就.*化石.*进化选择.*不保存精确 Token、模型名、路径、对话或逐请求时间/s,
  );
  assert.match(result.stdout, /anti-ai creature reset/);
});

test("explain discloses ecology, generations, evolution costs, and schema v5", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /阅历.*每个已结算自然日.*高 Token.*不能加速/s,
  );
  assert.match(
    result.stdout,
    /污染性.*清醒性.*未定型.*污染型.*清醒型.*矛盾型/s,
  );
  assert.match(result.stdout, /连续 3 个已结算日.*生态人格/);
  assert.match(
    result.stdout,
    /稳定本地基因.*生命阶段.*使用病型.*成就部件.*异色突变/s,
  );
  assert.match(result.stdout, /罪证章.*戒断章.*悖论章/);
  assert.match(
    result.stdout,
    /每 90 个阅历日.*永久化石.*下一代.*继承.*伤疤/s,
  );
  assert.match(
    result.stdout,
    /污染.*清醒.*悖论.*三选一.*触发概率.*能力值.*天赋.*收益.*代价/s,
  );
  assert.match(
    result.stdout,
    /schema v5.*不保存.*精确 Token.*模型名.*路径.*对话/s,
  );
});

test("doctor, explain, and help support English output", () => {
  const doctor = runCli(
    ["doctor", "--lang", "en"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );
  const explain = runCli(["explain", "--lang", "en"]);
  const help = runCli(["--help", "--lang", "en"]);

  assert.equal(doctor.status, 0, doctor.stderr);
  assert.match(doctor.stdout, /Does not collect, store, or print conversation text/);
  assert.doesNotMatch(doctor.stdout, /不采集/);

  assert.equal(explain.status, 0, explain.stderr);
  assert.match(explain.stdout, /Estimated resource use, not a measurement/);
  assert.doesNotMatch(explain.stdout, /Published proxy range/);
  assert.match(explain.stdout, /Model attribution/);
  assert.match(explain.stdout, /Verdicts are generated by fixed local rules/);
  assert.match(
    explain.stdout,
    /Share card.*omits chats, paths, model names, and exact token counts/s,
  );
  assert.match(explain.stdout, /Mutation system/);
  assert.match(explain.stdout, /8%.*rare mutation/s);
  assert.doesNotMatch(explain.stdout, /模型统计|个人基线与判词/);

  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Turn local AI tokens into an uncomfortable resource bill/);
  assert.match(help.stdout, /share\s+Print a privacy-safe SVG share card/);
  assert.match(help.stdout, /creature\s+Inspect and manage the mutation file/);
  assert.match(help.stdout, /--lang <zh\|en>/);
  assert.doesNotMatch(help.stdout, /打印今天/);
});

test("--help documents public commands and routes command-specific options", () => {
  const result = runCli(["--help"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage: anti-ai <command> \[options\]/);
  assert.match(result.stdout, /today\s+打印指定日期的 AI 资源账单/);
  assert.match(result.stdout, /week\s+打印截至指定日期的 7 天趋势/);
  assert.match(result.stdout, /month\s+打印本月至指定日期的用量日历/);
  assert.match(result.stdout, /codex\s+查看本地病理图鉴/);
  assert.match(result.stdout, /share\s+输出隐私安全的 SVG 分享卡/);
  assert.match(result.stdout, /creature\s+查看和管理异变体档案/);
  assert.match(result.stdout, /doctor\s+检查本地记录来源/);
  assert.match(result.stdout, /explain\s+解释统计、资源换算和隐私边界/);
  assert.match(result.stdout, /--lang <zh\|en>/);
  assert.match(result.stdout, /anti-ai help <command>/);
  assert.doesNotMatch(result.stdout, /--source|--json|--card/);
});

test("command help documents only the selected command contract", () => {
  const today = runCli(["today", "--help"]);
  const englishMonth = runCli(["help", "month", "--lang", "en"]);
  const explain = runCli(["explain", "--help"]);

  assert.equal(today.status, 0, today.stderr);
  assert.match(today.stdout, /Usage: anti-ai today \[options\]/);
  assert.match(today.stdout, /--date <YYYY-MM-DD>/);
  assert.match(
    today.stdout,
    /--source <all\|codex\|claude\|opencode\|openclaw\|hermes\|pi>/,
  );
  assert.match(today.stdout, /--json/);
  assert.match(today.stdout, /相关命令.*week.*month.*explain/s);
  assert.doesNotMatch(today.stdout, /--card/);
  assert.doesNotMatch(today.stdout, /creature \[reset\|evolve\]/);

  assert.equal(englishMonth.status, 0, englishMonth.stderr);
  assert.match(englishMonth.stdout, /Usage: anti-ai month \[options\]/);
  assert.match(englishMonth.stdout, /calendar heatmap/i);
  assert.match(englishMonth.stdout, /Related commands.*week.*creature/s);
  assert.doesNotMatch(englishMonth.stdout, /打印本月/);

  assert.equal(explain.status, 0, explain.stderr);
  assert.match(explain.stdout, /--lang <zh\|en>/);
  assert.match(explain.stdout, /-h, --help/);
});

test("nested creature actions expose focused help", () => {
  const evolve = runCli(["creature", "evolve", "--help"]);
  const reset = runCli(["help", "creature", "reset", "--lang", "en"]);

  assert.equal(evolve.status, 0, evolve.stderr);
  assert.match(evolve.stdout, /Usage: anti-ai creature evolve <1\|2\|3>/);
  assert.match(evolve.stdout, /显式封存本代进化选择/);
  assert.doesNotMatch(evolve.stdout, /--source/);

  assert.equal(reset.status, 0, reset.stderr);
  assert.match(reset.stdout, /Usage: anti-ai creature reset/);
  assert.match(reset.stdout, /permanently deletes/i);
});

test("top-level help keeps only global options and points to command help", () => {
  const result = runCli(["--help"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /anti-ai help <command>/);
  assert.match(result.stdout, /--lang <zh\|en>/);
  assert.match(result.stdout, /--version/);
  assert.doesNotMatch(result.stdout, /--date <YYYY-MM-DD>/);
  assert.doesNotMatch(result.stdout, /--source <all\|codex\|claude>/);
  assert.doesNotMatch(result.stdout, /--card <receipt/);
  assert.doesNotMatch(result.stdout, /--json/);
});

test("--version prints the published package version", () => {
  const result = runCli(["--version"]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "anti-ai 1.3.0\n");
  assert.equal(result.stderr, "");
});

test("an unknown option fails with a useful error", () => {
  const result = runCli(["today", "--wat"]);

  assert.equal(result.status, 2);
  assert.equal(result.stderr, "未知参数：--wat\n");
  assert.equal(result.stdout, "");
});

test("an option that needs a value fails when the value is missing", () => {
  const result = runCli(["today", "--date"]);

  assert.equal(result.status, 2);
  assert.equal(result.stderr, "参数 --date 缺少值\n");
  assert.equal(result.stdout, "");
});

test("an unknown source fails instead of returning an empty report", () => {
  const result = runCli(["today", "--source", "cursor", "--json"]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /不支持的数据源：cursor/);
  assert.equal(result.stdout, "");
});

test("an unknown language fails instead of silently falling back", () => {
  const result = runCli(["today", "--lang", "fr"]);

  assert.equal(result.status, 2);
  assert.equal(result.stderr, "不支持的语言：fr\n");
  assert.equal(result.stdout, "");
});

test("an impossible calendar date fails instead of being auto-corrected", () => {
  const result = runCli(["today", "--date", "2026-02-30", "--json"]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /无效日期：2026-02-30/);
  assert.equal(result.stdout, "");
});
