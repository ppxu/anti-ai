import { createReadStream, existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import { addModelUsage, addUsage } from "../../core/usage.mjs";
import { emptyUsage } from "../../shared.mjs";

let sqliteDriverPromise;

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

async function* jsonlFiles(root, modifiedSince = undefined) {
  yield* matchingFiles(
    root,
    (name) => name.endsWith(".jsonl"),
    modifiedSince,
  );
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
    if (error.code === "SQLITE_CANTOPEN" || error.code === "ENOENT") {
      return null;
    }
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
  includeCacheInInput = true,
}) {
  const cachedInputTokens = safeNumber(cacheRead);
  const cacheWriteInputTokens = safeNumber(cacheWrite);
  const inputTokens = safeNumber(input) + (includeCacheInInput
    ? cachedInputTokens + cacheWriteInputTokens
    : 0);
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

function sourceUsageByDate(dates) {
  return new Map(
    dates.map((date) => [date, { usage: emptyUsage(), models: {} }]),
  );
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

function earliestLocalMidnight(dates) {
  return new Date(`${dates[0]}T00:00:00`).getTime();
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

function openClawFile(name) {
  return (
    !name.includes(".trajectory.") &&
    !name.endsWith(".trajectory.jsonl") &&
    /\.jsonl(?:\.reset\..+)?$/.test(name)
  );
}

export {
  addSnapshotResults,
  countMatchingFiles,
  createReadStream,
  databaseHasTable,
  earliestLocalMidnight,
  epochMilliseconds,
  inspectDatabase,
  jsonlFiles,
  localDate,
  matchingFiles,
  openClawFile,
  openReadonlyDatabase,
  preferSnapshot,
  safeNumber,
  sourceUsageByDate,
  sqliteDatabaseConstructor,
  usageFromFields,
};
