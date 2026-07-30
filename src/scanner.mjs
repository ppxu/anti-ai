import { createReadStream, existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

import { addModelUsage, addUsage } from "./reporting.mjs";
import { SOURCE_REGISTRY } from "./registry.mjs";
import { emptyUsage } from "./shared.mjs";

let sqliteDriverPromise;

class SourceScanError extends Error {
  constructor(source, cause) {
    super(`Unable to scan ${source}`, { cause });
    this.name = "SourceScanError";
    this.code = "ANTI_AI_SOURCE_SCAN_FAILED";
    this.source = source;
    this.sourceCode = cause?.code ?? "UNKNOWN";
  }
}

async function sqliteDatabaseConstructor() {
  sqliteDriverPromise ??= import("better-sqlite3")
    .then((module) => module.default)
    .catch((error) => {
      if (
        error.code === "ERR_MODULE_NOT_FOUND" ||
        error.code === "ERR_DLOPEN_FAILED"
      ) {
        return null;
      }
      throw error;
    });
  return sqliteDriverPromise;
}

function localDate(timestamp, timezone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

async function* jsonlFiles(root, modifiedSince = undefined) {
  yield* matchingFiles(
    root,
    (name) => name.endsWith(".jsonl"),
    modifiedSince,
  );
}

async function* matchingFiles(root, matches, modifiedSince = undefined) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      yield* matchingFiles(entryPath, matches, modifiedSince);
    } else if (entry.isFile() && matches(entry.name)) {
      if (modifiedSince !== undefined) {
        let fileStat;
        try {
          fileStat = await stat(entryPath);
        } catch (error) {
          if (error.code === "ENOENT") continue;
          throw error;
        }
        if (fileStat.mtimeMs < modifiedSince) continue;
      }
      yield entryPath;
    }
  }
}

async function openReadonlyDatabase(databasePath) {
  if (!existsSync(databasePath)) return null;
  const Database = await sqliteDatabaseConstructor();
  if (!Database) {
    const error = new Error("Optional SQLite driver is unavailable");
    error.code = "SQLITE_DRIVER_UNAVAILABLE";
    throw error;
  }
  try {
    return new Database(databasePath, {
      readonly: true,
      fileMustExist: true,
    });
  } catch (error) {
    if (error.code === "SQLITE_CANTOPEN" || error.code === "ENOENT") return null;
    throw error;
  }
}

function safeNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function usageFromFields({
  input,
  output,
  cacheRead,
  cacheWrite,
  reasoning,
  total,
  requests = 1,
}) {
  const cachedInputTokens = safeNumber(cacheRead);
  const cacheWriteInputTokens = safeNumber(cacheWrite);
  const inputTokens =
    safeNumber(input) + cachedInputTokens + cacheWriteInputTokens;
  const outputTokens = safeNumber(output);
  return {
    requests: Math.max(1, safeNumber(requests)),
    inputTokens,
    cachedInputTokens,
    cacheWriteInputTokens,
    outputTokens,
    reasoningOutputTokens: safeNumber(reasoning),
    totalTokens: safeNumber(total) || inputTokens + outputTokens,
  };
}

function addSnapshotResults(results, snapshots, timezone) {
  for (const snapshot of snapshots.values()) {
    const result = results.get(localDate(snapshot.timestamp, timezone));
    if (!result) continue;
    addUsage(result.usage, snapshot.usage);
    addModelUsage(result.models, snapshot.model, snapshot.usage);
  }
}

function preferSnapshot(snapshots, id, snapshot) {
  const previous = snapshots.get(id);
  if (
    !previous ||
    snapshot.usage.totalTokens > previous.usage.totalTokens ||
    (snapshot.usage.totalTokens === previous.usage.totalTokens &&
      snapshot.timestamp > previous.timestamp)
  ) {
    snapshots.set(id, snapshot);
  }
}

function sourceUsageByDate(dates) {
  return new Map(
    dates.map((date) => [
      date,
      {
        usage: emptyUsage(),
        models: {},
      },
    ]),
  );
}

function earliestLocalMidnight(dates) {
  return new Date(`${dates[0]}T00:00:00`).getTime();
}

async function scanCodex(root, dates, timezone) {
  const results = sourceUsageByDate(dates);

  for await (const file of jsonlFiles(root, earliestLocalMidnight(dates))) {
    let currentModel = "unknown";
    const lines = readline.createInterface({
      input: createReadStream(file),
      crlfDelay: Infinity,
    });

    for await (const line of lines) {
      if (
        !line.includes('"type":"token_count"') &&
        !line.includes('"type":"turn_context"')
      ) {
        continue;
      }
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }

      if (record?.type === "turn_context") {
        currentModel = record?.payload?.model ?? currentModel;
        continue;
      }

      const usage = record?.payload?.info?.last_token_usage;
      if (record?.payload?.type !== "token_count" || !usage) continue;
      const date = localDate(record.timestamp, timezone);
      const result = results.get(date);
      if (!result) continue;

      const inputTokens = Number(usage.input_tokens ?? 0);
      const outputTokens = Number(usage.output_tokens ?? 0);
      const delta = {
        requests: 1,
        inputTokens,
        cachedInputTokens: Number(usage.cached_input_tokens ?? 0),
        cacheWriteInputTokens: Number(usage.cache_write_input_tokens ?? 0),
        outputTokens,
        reasoningOutputTokens: Number(usage.reasoning_output_tokens ?? 0),
        totalTokens: Number(usage.total_tokens ?? inputTokens + outputTokens),
      };
      addUsage(result.usage, delta);
      addModelUsage(result.models, currentModel, delta);
    }
  }

  return results;
}

async function scanClaude(root, dates, timezone) {
  const snapshots = new Map();

  for await (const file of jsonlFiles(root, earliestLocalMidnight(dates))) {
    const lines = readline.createInterface({
      input: createReadStream(file),
      crlfDelay: Infinity,
    });

    for await (const line of lines) {
      if (!line.includes('"usage"') || !line.includes('"type":"assistant"')) {
        continue;
      }
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }

      const message = record?.message;
      const usage = message?.usage;
      const messageId = message?.id ?? record?.uuid;
      if (record?.type !== "assistant" || !usage || !messageId) continue;

      const uncachedInputTokens = Number(usage.input_tokens ?? 0);
      const cachedInputTokens = Number(usage.cache_read_input_tokens ?? 0);
      const cacheWriteInputTokens = Number(
        usage.cache_creation_input_tokens ?? 0,
      );
      const inputTokens =
        uncachedInputTokens + cachedInputTokens + cacheWriteInputTokens;
      const outputTokens = Number(usage.output_tokens ?? 0);
      const snapshot = {
        timestamp: record.timestamp,
        model: message.model,
        usage: {
          requests: 1,
          inputTokens,
          cachedInputTokens,
          cacheWriteInputTokens,
          outputTokens,
          reasoningOutputTokens: 0,
          totalTokens: inputTokens + outputTokens,
        },
      };
      preferSnapshot(snapshots, messageId, snapshot);
    }
  }

  const results = sourceUsageByDate(dates);
  addSnapshotResults(results, snapshots, timezone);
  return results;
}

async function scanOpenCode(databasePath, dates, timezone) {
  const results = sourceUsageByDate(dates);
  const database = await openReadonlyDatabase(databasePath);
  if (!database) return results;

  try {
    const availableTables = new Set(
      database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('message', 'session_message')",
        )
        .all()
        .map((table) => table.name),
    );
    if (availableTables.size === 0) return results;

    const lowerBound = earliestLocalMidnight(dates) - 86_400_000;
    const upperBound =
      new Date(`${dates.at(-1)}T23:59:59.999`).getTime() + 86_400_000;
    const snapshots = new Map();
    for (const tableName of ["message", "session_message"]) {
      if (!availableTables.has(tableName)) continue;
      const rows = database
        .prepare(
          `SELECT id, time_created, data FROM ${tableName} WHERE time_created BETWEEN ? AND ?`,
        )
        .all(lowerBound, upperBound);

      for (const row of rows) {
        let message;
        try {
          message = JSON.parse(row.data);
        } catch {
          continue;
        }
        if (message?.role !== "assistant" || !message.tokens) continue;
        const timestamp = safeNumber(message?.time?.created) || row.time_created;
        preferSnapshot(snapshots, row.id, {
          timestamp,
          model: message.modelID,
          usage: usageFromFields({
            input: message.tokens.input,
            output: message.tokens.output,
            cacheRead: message.tokens.cache?.read,
            cacheWrite: message.tokens.cache?.write,
            reasoning: message.tokens.reasoning,
            total: message.tokens.total,
          }),
        });
      }
    }
    addSnapshotResults(results, snapshots, timezone);
  } finally {
    database.close();
  }

  return results;
}

function openClawFile(name) {
  return (
    !name.includes(".trajectory.") &&
    !name.endsWith(".trajectory.jsonl") &&
    /\.jsonl(?:\.reset\..+)?$/.test(name)
  );
}

async function scanOpenClaw(root, dates, timezone) {
  const snapshots = new Map();

  for await (const file of matchingFiles(
    root,
    openClawFile,
    earliestLocalMidnight(dates),
  )) {
    const lines = readline.createInterface({
      input: createReadStream(file),
      crlfDelay: Infinity,
    });
    for await (const line of lines) {
      if (!line.includes('"role":"assistant"') || !line.includes('"usage"')) {
        continue;
      }
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      const message = record?.message;
      if (
        record?.type !== "message" ||
        message?.role !== "assistant" ||
        !message.usage
      ) {
        continue;
      }
      const id = record.id ?? message.id;
      if (!id) continue;
      preferSnapshot(snapshots, id, {
        timestamp: message.timestamp ?? record.timestamp,
        model: message.model,
        usage: usageFromFields({
          input: message.usage.input,
          output: message.usage.output,
          cacheRead: message.usage.cacheRead,
          cacheWrite: message.usage.cacheWrite,
          reasoning: message.usage.reasoningTokens,
          total: message.usage.totalTokens,
        }),
      });
    }
  }

  const results = sourceUsageByDate(dates);
  addSnapshotResults(results, snapshots, timezone);
  return results;
}

async function scanPi(root, dates, timezone) {
  const snapshots = new Map();

  for await (const file of jsonlFiles(root, earliestLocalMidnight(dates))) {
    let currentModel = "unknown";
    const lines = readline.createInterface({
      input: createReadStream(file),
      crlfDelay: Infinity,
    });
    for await (const line of lines) {
      if (!line.includes('"type"')) continue;
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }

      if (record?.type === "model_change") {
        currentModel = record.modelId ?? currentModel;
        continue;
      }

      let usage;
      let model = currentModel;
      let timestamp = record.timestamp;
      if (
        record?.type === "message" &&
        record?.message?.role === "assistant"
      ) {
        usage = record.message.usage;
        model = record.message.model ?? model;
        currentModel = model;
        timestamp = record.message.timestamp ?? timestamp;
      } else if (
        ["compaction", "branch_summary"].includes(record?.type) &&
        record.usage
      ) {
        usage = record.usage;
      }
      if (!record?.id || !usage) continue;

      preferSnapshot(snapshots, record.id, {
        timestamp,
        model,
        usage: usageFromFields({
          input: usage.input,
          output: usage.output,
          cacheRead: usage.cacheRead,
          cacheWrite: usage.cacheWrite,
          reasoning: usage.reasoningTokens,
          total: usage.totalTokens,
        }),
      });
    }
  }

  const results = sourceUsageByDate(dates);
  addSnapshotResults(results, snapshots, timezone);
  return results;
}

function epochMilliseconds(value) {
  if (typeof value === "string" && !/^\d+(?:\.\d+)?$/.test(value)) {
    return Date.parse(value);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) return Number.NaN;
  return number < 1_000_000_000_000 ? number * 1000 : number;
}

function databaseHasTable(database, tableName) {
  return Boolean(
    database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      )
      .get(tableName),
  );
}

async function scanHermes(databasePath, dates, timezone) {
  const results = sourceUsageByDate(dates);
  const database = await openReadonlyDatabase(databasePath);
  if (!database) return results;

  try {
    if (!databaseHasTable(database, "sessions")) return results;
    const useModelUsage = databaseHasTable(database, "session_model_usage");
    const tableName = useModelUsage ? "session_model_usage" : "sessions";
    const columns = new Set(
      database
        .prepare(`PRAGMA table_info(${tableName})`)
        .all()
        .map((column) => column.name),
    );
    const required = useModelUsage
      ? ["session_id", "model"]
      : ["id", "started_at"];
    if (required.some((column) => !columns.has(column))) return results;
    const optional = (column, fallback = "0") =>
      columns.has(column) ? column : `${fallback} AS ${column}`;
    const rows = database
      .prepare(`
        SELECT
          ${useModelUsage ? "session_id AS id" : "id"},
          ${optional("model", "'unknown'")},
          ${optional("started_at", "NULL")},
          ${optional("ended_at", "NULL")},
          ${optional("first_seen", "NULL")},
          ${optional("last_seen", "NULL")},
          ${optional("input_tokens")},
          ${optional("output_tokens")},
          ${optional("cache_read_tokens")},
          ${optional("cache_write_tokens")},
          ${optional("reasoning_tokens")},
          ${optional("api_call_count", "1")}
        FROM ${tableName}
      `)
      .all();

    for (const row of rows) {
      const timestamp = epochMilliseconds(
        row.last_seen ?? row.first_seen ?? row.ended_at ?? row.started_at,
      );
      if (!Number.isFinite(timestamp)) continue;
      const result = results.get(localDate(timestamp, timezone));
      if (!result) continue;
      const usage = usageFromFields({
        input: row.input_tokens,
        output: row.output_tokens,
        cacheRead: row.cache_read_tokens,
        cacheWrite: row.cache_write_tokens,
        reasoning: row.reasoning_tokens,
        requests: row.api_call_count,
      });
      addUsage(result.usage, usage);
      addModelUsage(result.models, row.model, usage);
    }
  } finally {
    database.close();
  }

  return results;
}

async function countMatchingFiles(root, matches) {
  let count = 0;
  for await (const _file of matchingFiles(root, matches)) count += 1;
  return count;
}

async function inspectDatabase(databasePath, tableName) {
  const database = await openReadonlyDatabase(databasePath);
  if (!database) return false;
  try {
    return Boolean(
      database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        )
        .get(tableName),
    );
  } catch {
    return false;
  } finally {
    database.close();
  }
}

function sourceRoots() {
  return Object.fromEntries(
    SOURCE_REGISTRY.map((source) => [
      source.id,
      process.env[source.environment] ??
        path.join(os.homedir(), ...source.homePath),
    ]),
  );
}

function sourceAdapters(roots = sourceRoots()) {
  const operations = {
    codex: {
      count: () =>
        countMatchingFiles(roots.codex, (name) => name.endsWith(".jsonl")),
      scan: (dates, timezone) => scanCodex(roots.codex, dates, timezone),
    },
    claude: {
      count: () =>
        countMatchingFiles(roots.claude, (name) => name.endsWith(".jsonl")),
      scan: (dates, timezone) => scanClaude(roots.claude, dates, timezone),
    },
    opencode: {
      inspect: async () => {
        if (!existsSync(roots.opencode)) {
          return { available: false, issue: "missing" };
        }
        if (!(await sqliteDatabaseConstructor())) {
          return { available: false, issue: "driver" };
        }
        const available =
          (await inspectDatabase(roots.opencode, "message")) ||
          (await inspectDatabase(roots.opencode, "session_message"));
        return {
          available,
          issue: available ? null : "unreadable",
        };
      },
      scan: (dates, timezone) => scanOpenCode(roots.opencode, dates, timezone),
    },
    openclaw: {
      count: () => countMatchingFiles(roots.openclaw, openClawFile),
      scan: (dates, timezone) => scanOpenClaw(roots.openclaw, dates, timezone),
    },
    hermes: {
      inspect: async () => {
        if (!existsSync(roots.hermes)) {
          return { available: false, issue: "missing" };
        }
        if (!(await sqliteDatabaseConstructor())) {
          return { available: false, issue: "driver" };
        }
        const available = await inspectDatabase(roots.hermes, "sessions");
        return {
          available,
          issue: available ? null : "unreadable",
        };
      },
      scan: (dates, timezone) => scanHermes(roots.hermes, dates, timezone),
    },
    pi: {
      count: () =>
        countMatchingFiles(roots.pi, (name) => name.endsWith(".jsonl")),
      scan: (dates, timezone) => scanPi(roots.pi, dates, timezone),
    },
  };

  return SOURCE_REGISTRY.map((source) => ({
    ...source,
    root: roots[source.id],
    ...operations[source.id],
  }));
}

async function inspectLocalSources(source = "all") {
  const selected = sourceAdapters().filter(
    (definition) => source === "all" || definition.id === source,
  );
  return Promise.all(
    selected.map(async (definition) => {
      if (definition.kind === "sqlite") {
        const inspection = await definition.inspect();
        return { ...definition, ...inspection };
      }
      const count = await definition.count();
      return { ...definition, available: count > 0, count };
    }),
  );
}

async function reportsForDates(options, dates, timezone) {
  const sourceResults = {};
  const warnings = [];
  const selected = sourceAdapters().filter(
    (adapter) => options.source === "all" || adapter.id === options.source,
  );
  for (const adapter of selected) {
    try {
      sourceResults[adapter.id] = await adapter.scan(dates, timezone);
    } catch (error) {
      if (options.source !== "all") {
        throw new SourceScanError(adapter.id, error);
      }
      sourceResults[adapter.id] = sourceUsageByDate(dates);
      warnings.push({
        source: adapter.id,
        code: error?.code ?? "UNKNOWN",
      });
    }
  }

  return dates.map((date) => {
    const sources = {};
    const models = {};
    for (const [source, results] of Object.entries(sourceResults)) {
      const sourceResult = results.get(date);
      sources[source] = sourceResult.usage;
      models[source] = sourceResult.models;
    }
    const totals = emptyUsage();
    for (const usage of Object.values(sources)) addUsage(totals, usage);
    return {
      date,
      timezone,
      sources,
      models,
      totals,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  });
}

export {
  SourceScanError,
  jsonlFiles,
  inspectLocalSources,
  localDate,
  matchingFiles,
  openClawFile,
  reportsForDates,
  sourceAdapters,
  sourceRoots,
};
