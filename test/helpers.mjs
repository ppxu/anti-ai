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
  const dayStart = new Date(`${date}T12:00:00Z`).getTime();
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

export {
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
};
