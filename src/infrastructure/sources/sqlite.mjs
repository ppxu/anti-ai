import { addModelUsage, addUsage } from "../../core/usage.mjs";
import {
  addSnapshotResults,
  databaseHasTable,
  earliestLocalMidnight,
  epochMilliseconds,
  localDate,
  openReadonlyDatabase,
  preferSnapshot,
  safeNumber,
  sourceUsageByDate,
  usageFromFields,
} from "./runtime.mjs";

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

export { scanHermes, scanOpenCode };
