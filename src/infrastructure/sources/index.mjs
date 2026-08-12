import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { addUsage } from "../../core/usage.mjs";
import { SOURCE_REGISTRY } from "../../registry.mjs";
import { emptyUsage } from "../../shared.mjs";
import { scanClaude, scanCodex, scanOpenClaw, scanPi } from "./jsonl.mjs";
import { scanHermes, scanOpenCode } from "./sqlite.mjs";
import {
  countMatchingFiles,
  inspectDatabase,
  openClawFile,
  sourceUsageByDate,
  sqliteDatabaseConstructor,
} from "./runtime.mjs";

class SourceScanError extends Error {
  constructor(source, cause) {
    super(`Unable to scan ${source}`, { cause });
    this.name = "SourceScanError";
    this.code = "ANTI_AI_SOURCE_SCAN_FAILED";
    this.source = source;
    this.sourceCode = cause?.code ?? "UNKNOWN";
  }
}

function sourceRoots() {
  return Object.fromEntries(
    SOURCE_REGISTRY.map((source) => [
      source.id,
      process.env[source.environment] ?? path.join(os.homedir(), ...source.homePath),
    ]),
  );
}

function sourceAdapters(roots = sourceRoots()) {
  const sqliteInspection = (source, tables) => async () => {
    if (!existsSync(roots[source])) {
      return { available: false, issue: "missing" };
    }
    if (!(await sqliteDatabaseConstructor())) {
      return { available: false, issue: "driver" };
    }
    const available = (await Promise.all(
      tables.map((table) => inspectDatabase(roots[source], table)),
    )).some(Boolean);
    return { available, issue: available ? null : "unreadable" };
  };
  const operations = {
    codex: {
      count: () => countMatchingFiles(roots.codex, (name) => name.endsWith(".jsonl")),
      scan: (dates, timezone) => scanCodex(roots.codex, dates, timezone),
    },
    claude: {
      count: () => countMatchingFiles(roots.claude, (name) => name.endsWith(".jsonl")),
      scan: (dates, timezone) => scanClaude(roots.claude, dates, timezone),
    },
    opencode: {
      inspect: sqliteInspection("opencode", ["message", "session_message"]),
      scan: (dates, timezone) => scanOpenCode(roots.opencode, dates, timezone),
    },
    openclaw: {
      count: () => countMatchingFiles(roots.openclaw, openClawFile),
      scan: (dates, timezone) => scanOpenClaw(roots.openclaw, dates, timezone),
    },
    hermes: {
      inspect: sqliteInspection("hermes", ["sessions"]),
      scan: (dates, timezone) => scanHermes(roots.hermes, dates, timezone),
    },
    pi: {
      count: () => countMatchingFiles(roots.pi, (name) => name.endsWith(".jsonl")),
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
        return { ...definition, ...(await definition.inspect()) };
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
      warnings.push({ source: adapter.id, code: error?.code ?? "UNKNOWN" });
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
  inspectLocalSources,
  reportsForDates,
  sourceAdapters,
  sourceRoots,
};
