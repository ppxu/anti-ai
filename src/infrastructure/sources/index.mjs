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

function notifyScanProgress(options, event) {
  try {
    options.onScanProgress?.(event);
  } catch {
    // Presentation callbacks must never make a local source scan fail.
  }
}

async function scanReportsForDates(
  options,
  dates,
  timezone,
  adapters = sourceAdapters(),
) {
  const selected = adapters.filter(
    (adapter) => options.source === "all" || adapter.id === options.source,
  );
  notifyScanProgress(options, {
    type: "scan:start",
    sourceIds: selected.map(({ id }) => id),
    dates,
  });
  try {
    const entries = await Promise.all(
      selected.map(async (adapter) => {
        try {
          return {
            id: adapter.id,
            results: await adapter.scan(dates, timezone),
            warning: null,
          };
        } catch (error) {
          if (options.source !== "all") {
            throw new SourceScanError(adapter.id, error);
          }
          return {
            id: adapter.id,
            results: sourceUsageByDate(dates),
            warning: {
              source: adapter.id,
              code: error?.code ?? "UNKNOWN",
            },
          };
        }
      }),
    );
    const sourceResults = Object.fromEntries(
      entries.map(({ id, results }) => [id, results]),
    );
    const warnings = entries
      .map(({ warning }) => warning)
      .filter(Boolean);
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
  } finally {
    notifyScanProgress(options, { type: "scan:finish" });
  }
}

function createReportSession(
  options,
  timezone,
  { adapters = sourceAdapters() } = {},
) {
  let coveredDates = new Set();
  let reportsByDate = new Map();
  let queue = Promise.resolve();

  const session = {
    reportsForDates(dates) {
      const requestedDates = [...dates];
      const operation = queue.then(async () => {
        const missingDates = [...new Set(requestedDates.filter(
          (date) => !coveredDates.has(date),
        ))].sort();
        if (missingDates.length > 0) {
          const reports = await scanReportsForDates(
            options,
            missingDates,
            timezone,
            adapters,
          );
          for (const report of reports) {
            reportsByDate.set(report.date, report);
            coveredDates.add(report.date);
          }
        }
        return requestedDates.map((date) => reportsByDate.get(date));
      });
      queue = operation.catch(() => {});
      return operation;
    },
  };
  return session;
}

async function reportsForDates(options, dates, timezone) {
  return createReportSession(options, timezone).reportsForDates(dates);
}

export {
  SourceScanError,
  createReportSession,
  inspectLocalSources,
  reportsForDates,
  sourceAdapters,
  sourceRoots,
};
