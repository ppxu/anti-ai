import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

import { addModelUsage, addUsage } from "./reporting.mjs";
import { emptyUsage } from "./shared.mjs";

function localDate(timestamp, timezone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

async function* jsonlFiles(root, modifiedSince = undefined) {
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
      yield* jsonlFiles(entryPath, modifiedSince);
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
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
      const previous = snapshots.get(messageId);

      if (
        !previous ||
        snapshot.usage.totalTokens > previous.usage.totalTokens ||
        (snapshot.usage.totalTokens === previous.usage.totalTokens &&
          snapshot.timestamp > previous.timestamp)
      ) {
        snapshots.set(messageId, snapshot);
      }
    }
  }

  const results = sourceUsageByDate(dates);
  for (const snapshot of snapshots.values()) {
    const result = results.get(localDate(snapshot.timestamp, timezone));
    if (result) {
      addUsage(result.usage, snapshot.usage);
      addModelUsage(result.models, snapshot.model, snapshot.usage);
    }
  }
  return results;
}

function sourceRoots() {
  return {
    codex:
      process.env.ANTI_AI_CODEX_DIR ??
      path.join(os.homedir(), ".codex", "sessions"),
    claude:
      process.env.ANTI_AI_CLAUDE_DIR ??
      path.join(os.homedir(), ".claude", "projects"),
  };
}

async function reportsForDates(options, dates, timezone) {
  const roots = sourceRoots();
  const sourceResults = {};

  if (options.source === "all" || options.source === "codex") {
    sourceResults.codex = await scanCodex(roots.codex, dates, timezone);
  }
  if (options.source === "all" || options.source === "claude") {
    sourceResults.claude = await scanClaude(roots.claude, dates, timezone);
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
    return { date, timezone, sources, models, totals };
  });
}

export { jsonlFiles, localDate, reportsForDates, sourceRoots };
