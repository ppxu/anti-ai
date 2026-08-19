import readline from "node:readline";

import { addModelUsage, addUsage } from "../../core/usage.mjs";
import {
  addSnapshotResults,
  createReadStream,
  earliestLocalMidnight,
  jsonlFiles,
  localDate,
  matchingFiles,
  openClawFile,
  preferSnapshot,
  sourceUsageByDate,
  usageFromFields,
  visitBoundedJsonlRecords,
} from "./runtime.mjs";

const CODEX_USAGE_MARKERS = [
  '"type":"token_count"',
  '"type":"turn_context"',
];

async function scanCodex(root, dates, timezone) {
  const results = sourceUsageByDate(dates);
  for await (const file of jsonlFiles(root, earliestLocalMidnight(dates))) {
    let currentModel = "unknown";
    await visitBoundedJsonlRecords(file, CODEX_USAGE_MARKERS, (record) => {
      if (record?.type === "turn_context") {
        currentModel = record?.payload?.model ?? currentModel;
        return;
      }
      const usage = record?.payload?.info?.last_token_usage;
      if (record?.payload?.type !== "token_count" || !usage) return;
      const result = results.get(localDate(record.timestamp, timezone));
      if (!result) return;
      const delta = usageFromFields({
        input: usage.input_tokens,
        output: usage.output_tokens,
        cacheRead: usage.cached_input_tokens,
        cacheWrite: usage.cache_write_input_tokens,
        reasoning: usage.reasoning_output_tokens,
        total: usage.total_tokens,
        includeCacheInInput: false,
      });
      addUsage(result.usage, delta);
      addModelUsage(result.models, currentModel, delta);
    });
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
      preferSnapshot(snapshots, messageId, {
        timestamp: record.timestamp,
        model: message.model,
        usage: usageFromFields({
          input: usage.input_tokens,
          output: usage.output_tokens,
          cacheRead: usage.cache_read_input_tokens,
          cacheWrite: usage.cache_creation_input_tokens,
        }),
      });
    }
  }
  const results = sourceUsageByDate(dates);
  addSnapshotResults(results, snapshots, timezone);
  return results;
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
      ) continue;
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
      if (record?.type === "message" && record?.message?.role === "assistant") {
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

export { scanClaude, scanCodex, scanOpenClaw, scanPi };
