import { existsSync } from "node:fs";

import {
  assert,
  mkdirSync,
  mkdtempSync,
  path,
  readFileSync,
  rmSync,
  runCli,
  test,
  tmpdir,
  writeFileSync,
  writeCodexUsage,
} from "./helpers.mjs";

import {
  deriveClinicReport,
  deriveMetabolismSnapshot,
} from "../src/clinic.mjs";
import {
  deriveClinicStudyHistory,
  deriveSealedClinicTrends,
} from "../src/clinic-studies.mjs";
import { deriveTuiSnapshot } from "../src/application/tui.mjs";
import { renderClinic } from "../src/renderers/clinic.mjs";
import {
  executeContainmentAction,
  previewContainmentAction,
} from "../src/application/actions.mjs";

const SOURCE_IDS = [
  "codex",
  "claude",
  "opencode",
  "openclaw",
  "hermes",
  "pi",
];

function emptyUsage() {
  return {
    requests: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  };
}

function usage(overrides = {}) {
  return { ...emptyUsage(), ...overrides };
}

function report(date, sourceUsage = {}, sourceModels = {}) {
  const sources = Object.fromEntries(
    SOURCE_IDS.map((source) => [source, usage(sourceUsage[source])]),
  );
  const totals = Object.values(sources).reduce((total, current) => {
    for (const field of Object.keys(total)) total[field] += current[field];
    return total;
  }, emptyUsage());
  return {
    date,
    timezone: "Asia/Shanghai",
    sources,
    models: Object.fromEntries(
      SOURCE_IDS.map((source) => [source, sourceModels[source] ?? {}]),
    ),
    totals,
  };
}

function datesThrough(targetDate, count) {
  const target = new Date(`${targetDate}T12:00:00.000Z`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(target);
    date.setUTCDate(target.getUTCDate() + index - count + 1);
    return date.toISOString().slice(0, 10);
  });
}

test("clinic diagnoses a reproducible burst overload against active-day median", () => {
  const dates = datesThrough("2026-08-12", 8);
  const reports = dates.map((date, index) =>
    report(date, {
      codex: usage({
        requests: 4,
        inputTokens: index === 7 ? 2_700 : 900,
        outputTokens: index === 7 ? 300 : 100,
        totalTokens: index === 7 ? 3_000 : 1_000,
      }),
    }),
  );

  const first = deriveClinicReport(reports, "2026-08-12", {
    currentDate: "2026-08-12",
  });
  const second = deriveClinicReport(reports, "2026-08-12", {
    currentDate: "2026-08-12",
  });

  assert.deepEqual(second, first);
  assert.equal(first.version, 1);
  assert.equal(first.date, "2026-08-12");
  assert.equal(first.provisional, true);
  assert.deepEqual(first.diagnosis, {
    id: "burst_overload",
    severityBand: "high",
    signals: ["burst_overload", "context_bloat"],
  });
  assert.deepEqual(first.evidence.fieldsUsed, ["totalTokens"]);
  assert.deepEqual(first.evidence.sourcesUsed, ["codex"]);
  assert.equal(first.evidence.baselineActiveDays, 7);
  assert.deepEqual(first.limitations, [
    "correlation_not_causation",
    "not_productivity_judgment",
  ]);
});

test("total-volume diagnoses disclose both target and baseline source evidence", () => {
  const dates = datesThrough("2026-08-12", 4);
  const reports = dates.map((date, index) =>
    report(date, index === 3
      ? {
          codex: usage({ requests: 3, inputTokens: 2_700, totalTokens: 3_000 }),
        }
      : {
          claude: usage({ requests: 3, inputTokens: 900, totalTokens: 1_000 }),
        }),
  );

  const clinic = deriveClinicReport(reports, "2026-08-12", {
    currentDate: "2026-08-12",
  });

  assert.equal(clinic.diagnosis.id, "burst_overload");
  assert.deepEqual(clinic.evidence.sourcesUsed, ["claude", "codex"]);
});

test("clinic refuses to invent a diagnosis without three active baseline days", () => {
  const reports = [
    report("2026-08-11", {
      codex: usage({ requests: 1, inputTokens: 90, totalTokens: 100 }),
    }),
    report("2026-08-12", {
      codex: usage({ requests: 1, inputTokens: 900, totalTokens: 1_000 }),
    }),
  ];

  const clinic = deriveClinicReport(reports, "2026-08-12", {
    currentDate: "2026-08-12",
  });

  assert.deepEqual(clinic.diagnosis, {
    id: "insufficient_evidence",
    severityBand: "unknown",
    signals: [],
  });
  assert.equal(clinic.evidence.baselineActiveDays, 1);
});

test("clinic detects cache imbalance only on cache-capable request sources", () => {
  const dates = datesThrough("2026-08-12", 4);
  const reports = dates.map((date, index) =>
    report(date, {
      codex: usage({
        requests: 4,
        inputTokens: 1_000,
        cachedInputTokens: index === 3 ? 50 : 500,
        cacheWriteInputTokens: index === 3 ? 400 : 50,
        outputTokens: 100,
        totalTokens: 1_100,
      }),
      hermes: usage({
        requests: 8,
        inputTokens: 1_000,
        cachedInputTokens: 0,
        cacheWriteInputTokens: 900,
        totalTokens: 1_000,
      }),
    }),
  );

  const clinic = deriveClinicReport(reports, "2026-08-12", {
    currentDate: "2026-08-12",
  });

  assert.equal(clinic.diagnosis.id, "cache_imbalance");
  assert.deepEqual(clinic.evidence.sourcesUsed, ["codex"]);
  assert.deepEqual(clinic.evidence.fieldsUsed, [
    "inputTokens",
    "cachedInputTokens",
    "cacheWriteInputTokens",
    "requests",
  ]);
  assert.deepEqual(clinic.evidence.excludedSources, [
    { id: "hermes", reason: "field_unavailable" },
  ]);
});

test("clinic keeps failed sources visible in the evidence exclusions", () => {
  const dates = datesThrough("2026-08-12", 4);
  const reports = dates.map((date) =>
    report(date, {
      codex: usage({
        requests: 4,
        inputTokens: 900,
        outputTokens: 100,
        totalTokens: 1_000,
      }),
    }),
  );
  reports.at(-1).warnings = [
    { source: "opencode", code: "source_unavailable" },
  ];

  const clinic = deriveClinicReport(reports, "2026-08-12", {
    currentDate: "2026-08-12",
  });

  assert.deepEqual(clinic.evidence.excludedSources, [
    { id: "opencode", reason: "scan_failed" },
  ]);
});

test("clinic detects source-relative context bloat without pooling request semantics", () => {
  const dates = datesThrough("2026-08-12", 4);
  const reports = dates.map((date, index) =>
    report(date, {
      pi: usage({
        requests: 4,
        inputTokens: index === 3 ? 1_000 : 400,
        outputTokens: 100,
        totalTokens: index === 3 ? 1_100 : 500,
      }),
    }),
  );

  const clinic = deriveClinicReport(reports, "2026-08-12", {
    currentDate: "2026-08-12",
  });

  assert.equal(clinic.diagnosis.id, "context_bloat");
  assert.deepEqual(clinic.evidence.sourcesUsed, ["pi"]);
  assert.equal(clinic.evidence.baselineActiveDays, 3);
});

test("clinic source tie-breaking is independent of object insertion order", () => {
  const dates = datesThrough("2026-08-12", 4);
  const reports = dates.map((date, index) =>
    report(date, {
      codex: usage({
        requests: 4,
        inputTokens: index === 3 ? 1_000 : 400,
        outputTokens: 100,
        totalTokens: index === 3 ? 1_100 : 500,
      }),
      pi: usage({
        requests: 4,
        inputTokens: index === 3 ? 1_000 : 400,
        outputTokens: 100,
        totalTokens: index === 3 ? 1_100 : 500,
      }),
    }),
  );
  const reversed = reports.map((entry) => ({
    ...entry,
    sources: Object.fromEntries(Object.entries(entry.sources).reverse()),
  }));

  const normal = deriveClinicReport(reports, "2026-08-12", {
    currentDate: "2026-08-12",
  });
  const reordered = deriveClinicReport(reversed, "2026-08-12", {
    currentDate: "2026-08-12",
  });

  assert.deepEqual(reordered, normal);
  assert.deepEqual(normal.evidence.sourcesUsed, ["codex"]);
});

test("clinic reports a source with unusable request history as non-comparable", () => {
  const dates = datesThrough("2026-08-12", 4);
  const reports = dates.map((date, index) =>
    report(date, {
      codex: usage({
        requests: 4,
        inputTokens: index === 3 ? 1_000 : 400,
        outputTokens: 100,
        totalTokens: index === 3 ? 1_100 : 500,
      }),
      pi: usage({
        requests: index === 3 ? 4 : 0,
        inputTokens: 400,
        outputTokens: 100,
        totalTokens: 500,
      }),
    }),
  );

  const clinic = deriveClinicReport(reports, "2026-08-12", {
    currentDate: "2026-08-12",
  });

  assert.equal(clinic.diagnosis.id, "context_bloat");
  assert.deepEqual(clinic.evidence.excludedSources, [
    { id: "pi", reason: "no_comparable_baseline" },
  ]);
});

test("clinic detects request fragmentation from request count and tokens per event", () => {
  const dates = datesThrough("2026-08-12", 4);
  const reports = dates.map((date, index) =>
    report(date, {
      claude: usage({
        requests: index === 3 ? 8 : 4,
        inputTokens: index === 3 ? 900 : 900,
        outputTokens: 100,
        totalTokens: 1_000,
      }),
    }),
  );

  const clinic = deriveClinicReport(reports, "2026-08-12", {
    currentDate: "2026-08-12",
  });

  assert.equal(clinic.diagnosis.id, "request_fragmentation");
  assert.deepEqual(clinic.evidence.fieldsUsed, ["requests", "totalTokens"]);
});

test("clinic detects a dominant model migration without exposing model names", () => {
  const dates = datesThrough("2026-08-12", 4);
  const reports = dates.map((date, index) => {
    const oldModel = usage({ requests: 3, totalTokens: 700 });
    const minority = usage({ requests: 1, totalTokens: 300 });
    const newModel = usage({ requests: 3, totalTokens: 700 });
    return report(
      date,
      {
        opencode: usage({ requests: 4, inputTokens: 900, outputTokens: 100, totalTokens: 1_000 }),
      },
      {
        opencode: index === 3
          ? { "new-private-model": newModel, "old-private-model": minority }
          : { "old-private-model": oldModel, fallback: minority },
      },
    );
  });

  const clinic = deriveClinicReport(reports, "2026-08-12", {
    currentDate: "2026-08-12",
  });
  const serialized = JSON.stringify(clinic);

  assert.equal(clinic.diagnosis.id, "model_migration");
  assert.deepEqual(clinic.evidence.fieldsUsed, ["models.totalTokens"]);
  assert.doesNotMatch(serialized, /new-private-model|old-private-model|fallback/);
});

test("clinic only seals restrained recovery after the natural day has ended", () => {
  const dates = datesThrough("2026-08-12", 4);
  const reports = dates.map((date, index) =>
    report(date, {
      codex: usage({
        requests: 4,
        inputTokens: index === 3 ? 350 : 900,
        outputTokens: index === 3 ? 50 : 100,
        totalTokens: index === 3 ? 400 : 1_000,
      }),
    }),
  );

  const completed = deriveClinicReport(reports, "2026-08-12", {
    currentDate: "2026-08-13",
  });
  const stillToday = deriveClinicReport(reports, "2026-08-12", {
    currentDate: "2026-08-12",
  });

  assert.equal(completed.diagnosis.id, "restrained_recovery");
  assert.equal(completed.diagnosis.severityBand, "recovery");
  assert.equal(stillToday.diagnosis.id, "stable_metabolism");
  assert.equal(stillToday.provisional, true);
});

test("metabolism snapshots preserve an open-day provisional marker", () => {
  const dates = datesThrough("2026-08-12", 4);
  const reports = dates.map((date, index) =>
    report(date, {
      codex: usage({
        requests: 4,
        inputTokens: index === 3 ? 350 : 900,
        outputTokens: index === 3 ? 50 : 100,
        totalTokens: index === 3 ? 400 : 1_000,
      }),
    }),
  );

  const snapshot = deriveMetabolismSnapshot(
    reports,
    "2026-08-12",
    "2026-08-12",
  );

  assert.equal(snapshot.mainDiagnosisId, "stable_metabolism");
  assert.equal(snapshot.provisional, true);
});

test("clinic emits stable metabolism and populated 7/30-day evidence trends", () => {
  const dates = datesThrough("2026-08-12", 31);
  const reports = dates.map((date) =>
    report(date, {
      codex: usage({
        requests: 4,
        inputTokens: 900,
        outputTokens: 100,
        totalTokens: 1_000,
      }),
    }),
  );

  const clinic = deriveClinicReport(reports, "2026-08-12", {
    currentDate: "2026-08-12",
  });

  assert.deepEqual(clinic.diagnosis, {
    id: "stable_metabolism",
    severityBand: "stable",
    signals: [],
  });
  assert.deepEqual(clinic.trends.days7, {
    observableDays: 7,
    activeDays: 7,
    soberDays: 0,
    signalDays: 0,
    topSignal: null,
    direction: "stable",
  });
  assert.equal(clinic.trends.days30.observableDays, 28);
  assert.equal(clinic.trends.days30.activeDays, 30);
});

test("burst overload remains the main diagnosis when lower-priority signals coexist", () => {
  const dates = datesThrough("2026-08-12", 4);
  const reports = dates.map((date, index) =>
    report(date, {
      codex: usage({
        requests: 4,
        inputTokens: index === 3 ? 2_700 : 900,
        cachedInputTokens: index === 3 ? 0 : 400,
        cacheWriteInputTokens: index === 3 ? 1_000 : 50,
        outputTokens: index === 3 ? 300 : 100,
        totalTokens: index === 3 ? 3_000 : 1_000,
      }),
    }),
  );

  const clinic = deriveClinicReport(reports, "2026-08-12", {
    currentDate: "2026-08-12",
  });

  assert.equal(clinic.diagnosis.id, "burst_overload");
  assert.deepEqual(clinic.diagnosis.signals, [
    "burst_overload",
    "cache_imbalance",
    "context_bloat",
  ]);
});

test("clinic CLI exposes a read-only language-neutral JSON diagnosis", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-clinic-cli-"));
  const home = path.join(workspace, "home");
  const codex = path.join(workspace, "codex");
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const dates = datesThrough("2026-07-23", 8);
  for (const [index, date] of dates.entries()) {
    writeCodexUsage(
      codex,
      Array.from({ length: 4 }, () => ({
        input_tokens: index === 7 ? 675 : 225,
        cached_input_tokens: 0,
        cache_write_input_tokens: 0,
        output_tokens: index === 7 ? 75 : 25,
        total_tokens: index === 7 ? 750 : 250,
      })),
      date,
    );
  }

  const result = runCli(
    [
      "clinic",
      "--date",
      "2026-07-23",
      "--source",
      "codex",
      "--lang",
      "en",
      "--json",
    ],
    { HOME: home, ANTI_AI_CODEX_DIR: codex },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.date, "2026-07-23");
  assert.equal(parsed.provisional, false);
  assert.equal(parsed.diagnosis.id, "burst_overload");
  assert.deepEqual(parsed.evidence.sourcesUsed, ["codex"]);
  assert.deepEqual(parsed.limitations, [
    "correlation_not_causation",
    "not_productivity_judgment",
  ]);
  assert.doesNotMatch(result.stdout, /mutation-test|input_tokens|会话|模型/);
  assert.equal(existsSync(path.join(home, ".anti-ai", "creature.json")), false);
});

test("clinic CLI renders bilingual evidence boundaries and command help", () => {
  const chinese = runCli([
    "clinic",
    "--date",
    "2026-07-23",
    "--source",
    "codex",
  ]);
  const english = runCli([
    "clinic",
    "--date",
    "2026-07-23",
    "--source",
    "codex",
    "--lang",
    "en",
  ]);
  const help = runCli(["clinic", "--help", "--lang", "en"]);
  const startHelp = runCli(["clinic", "start", "--help", "--lang", "en"]);
  const historyHelp = runCli(["help", "clinic", "history", "--lang", "en"]);

  assert.equal(chinese.status, 0, chinese.stderr);
  assert.match(chinese.stdout, /TOKEN 代谢门诊/);
  assert.match(chinese.stdout, /主诊断/);
  assert.match(chinese.stdout, /证据范围/);
  assert.match(chinese.stdout, /7 天趋势/);
  assert.match(chinese.stdout, /相关性观察/);
  assert.doesNotMatch(chinese.stdout, /置信度/);

  assert.equal(english.status, 0, english.stderr);
  assert.match(english.stdout, /TOKEN METABOLIC CLINIC/);
  assert.match(english.stdout, /PRIMARY DIAGNOSIS/);
  assert.match(english.stdout, /EVIDENCE SCOPE/);
  assert.match(english.stdout, /Correlation only/);
  assert.doesNotMatch(english.stdout, /[\p{Script=Han}]/u);

  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Usage: anti-ai clinic \[options\]/);
  assert.match(help.stdout, /anti-ai clinic start/);
  assert.match(help.stdout, /anti-ai clinic history/);
  assert.match(help.stdout, /--json/);
  assert.equal(startHelp.status, 0, startHelp.stderr);
  assert.match(
    startHelp.stdout,
    /Usage: anti-ai clinic start <cache-rehab\|context-diet\|load-recovery>/,
  );
  assert.match(startHelp.stdout, /missed days never reset/);
  assert.equal(historyHelp.status, 0, historyHelp.stderr);
  assert.match(historyHelp.stdout, /Usage: anti-ai clinic history/);
  assert.match(historyHelp.stdout, /never scans raw Agent logs/);
});

test("clinic human output keeps dense evidence readable within 80 columns", () => {
  const dense = {
    version: 1,
    date: "2026-08-12",
    provisional: true,
    diagnosis: {
      id: "cache_imbalance",
      severityBand: "high",
      signals: ["cache_imbalance"],
    },
    evidence: {
      fieldsUsed: [
        "inputTokens",
        "cachedInputTokens",
        "cacheWriteInputTokens",
        "requests",
      ],
      sourcesUsed: ["claude", "codex", "openclaw", "opencode", "pi"],
      excludedSources: [{ id: "hermes", reason: "field_unavailable" }],
      baselineActiveDays: 14,
    },
    trends: {
      days7: {
        observableDays: 7,
        activeDays: 6,
        soberDays: 1,
        signalDays: 5,
        topSignal: "cache_imbalance",
        direction: "increasing",
      },
      days30: {
        observableDays: 29,
        activeDays: 26,
        soberDays: 3,
        signalDays: 18,
        topSignal: "cache_imbalance",
        direction: "stable",
      },
    },
    study: null,
    limitations: ["correlation_not_causation", "not_productivity_judgment"],
  };

  for (const lang of ["zh", "en"]) {
    const lines = renderClinic(dense, lang)
      .replace(/\u001B\[[0-9;]*m/g, "")
      .split("\n");
    assert.ok(
      lines.every((line) => [...line].length <= 80),
      `${lang}:\n${lines.filter((line) => [...line].length > 80).join("\n")}`,
    );
  }
});

test("clinic main view includes the active passive study", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-clinic-main-study-"));
  const home = path.join(workspace, "home");
  t.after(() => rmSync(workspace, { recursive: true, force: true }));

  const started = runCli(
    ["clinic", "start", "cache-rehab", "--date", "2026-07-23"],
    { HOME: home },
  );
  const clinic = runCli(
    ["clinic", "--date", "2026-07-23", "--source", "codex"],
    { HOME: home },
  );

  assert.equal(started.status, 0, started.stderr);
  assert.equal(clinic.status, 0, clinic.stderr);
  assert.match(clinic.stdout, /研究课题/);
  assert.match(clinic.stdout, /缓存康复观察/);
  assert.match(clinic.stdout, /1 \/ 7 天/);
});

test("clinic start seals one passive calendar-day study and rejects overlap", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-clinic-study-"));
  const home = path.join(workspace, "home");
  t.after(() => rmSync(workspace, { recursive: true, force: true }));

  const started = runCli(
    [
      "clinic",
      "start",
      "cache-rehab",
      "--date",
      "2026-07-23",
      "--json",
    ],
    { HOME: home },
  );
  assert.equal(started.status, 0, started.stderr);
  const view = JSON.parse(started.stdout);
  assert.equal(view.version, 1);
  assert.deepEqual(view.active, {
    id: "study-2026-07-23-cache_rehab",
    protocolId: "cache_rehab",
    durationDays: 7,
    startedAt: "2026-07-23",
    endsAt: "2026-07-29",
    status: "active",
    progress: { elapsedDays: 1, totalDays: 7, observableDays: 0 },
    resultId: null,
    sealId: null,
  });

  const statePath = path.join(home, ".anti-ai", "creature.json");
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  assert.equal(state.schemaVersion, 15);
  assert.deepEqual(state.clinic, {
    version: 1,
    studies: [
      {
        id: "study-2026-07-23-cache_rehab",
        protocolId: "cache_rehab",
        startedAt: "2026-07-23",
        endsAt: "2026-07-29",
        contentVersion: 1,
      },
    ],
  });
  assert.doesNotMatch(JSON.stringify(state.clinic), /token|model|path|prompt/i);

  const overlap = runCli(
    ["clinic", "start", "context-diet", "--date", "2026-07-24"],
    { HOME: home },
  );
  assert.equal(overlap.status, 2);
  assert.match(overlap.stderr, /已有研究正在进行/);
});

test("clinic history completes by natural date without check-in or state writes", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-clinic-history-"));
  const home = path.join(workspace, "home");
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const started = runCli(
    ["clinic", "start", "cache-rehab", "--date", "2026-07-23"],
    { HOME: home },
  );
  assert.equal(started.status, 0, started.stderr);
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const before = readFileSync(statePath, "utf8");

  const history = runCli(
    ["clinic", "history", "--date", "2026-07-30", "--json"],
    {
      HOME: home,
      ANTI_AI_OPENCODE_DB: path.join(workspace, "intentionally-missing.db"),
    },
  );
  assert.equal(history.status, 0, history.stderr);
  const parsed = JSON.parse(history.stdout);
  assert.equal(parsed.active, null);
  assert.equal(parsed.records[0].status, "completed");
  assert.equal(parsed.records[0].progress.elapsedDays, 7);
  assert.equal(parsed.records[0].progress.observableDays, 0);
  assert.equal(parsed.records[0].resultId, "insufficient_evidence");
  assert.equal(
    parsed.records[0].sealId,
    "study_cache_rehab_insufficient_evidence",
  );
  assert.equal(readFileSync(statePath, "utf8"), before);

  const human = runCli(
    ["clinic", "history", "--date", "2026-07-30", "--lang", "en"],
    { HOME: home },
  );
  assert.equal(human.status, 0, human.stderr);
  assert.match(human.stdout, /CACHE REHAB OBSERVATION/);
  assert.match(human.stdout, /INSUFFICIENT EVIDENCE/);
  assert.doesNotMatch(human.stdout, /[\p{Script=Han}]/u);
  assert.equal(readFileSync(statePath, "utf8"), before);

  const next = runCli(
    ["clinic", "start", "context-diet", "--date", "2026-07-30", "--json"],
    { HOME: home },
  );
  assert.equal(next.status, 0, next.stderr);
  assert.equal(JSON.parse(next.stdout).active.protocolId, "context_diet");
});

test("clinic start migrates schema 14 once and rejects unknown protocols", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-clinic-v14-"));
  const home = path.join(workspace, "home");
  const stateDirectory = path.join(home, ".anti-ai");
  mkdirSync(stateDirectory, { recursive: true });
  writeFileSync(
    path.join(stateDirectory, "creature.json"),
    `${JSON.stringify({ schemaVersion: 14, seed: "clinic-migration", days: {} })}\n`,
  );
  t.after(() => rmSync(workspace, { recursive: true, force: true }));

  const invalid = runCli(
    ["clinic", "start", "unknown-protocol", "--date", "2026-07-23"],
    { HOME: home },
  );
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /未知研究协议/);

  const valid = runCli(
    ["clinic", "start", "load-recovery", "--date", "2026-07-23"],
    { HOME: home },
  );
  assert.equal(valid.status, 0, valid.stderr);
  const saved = JSON.parse(
    readFileSync(path.join(stateDirectory, "creature.json"), "utf8"),
  );
  assert.equal(saved.schemaVersion, 15);
  assert.equal(saved.clinic.studies[0].protocolId, "load_recovery");
});

test("creature settlement seals a privacy-safe metabolism sample once", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-clinic-settle-"));
  const home = path.join(workspace, "home");
  const codex = path.join(workspace, "codex");
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const dates = datesThrough("2026-07-23", 4);
  for (const date of dates) {
    writeCodexUsage(
      codex,
      Array.from({ length: 4 }, () => ({
        input_tokens: 225,
        cached_input_tokens: 0,
        cache_write_input_tokens: 0,
        output_tokens: 25,
        total_tokens: 250,
      })),
      date,
    );
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: codex,
    ANTI_AI_CREATURE_SEED: "clinic-settlement",
  };
  const first = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    env,
  );
  assert.equal(first.status, 0, first.stderr);
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const firstState = JSON.parse(readFileSync(statePath, "utf8"));
  const sample = firstState.days["2026-07-23"].metabolism;
  assert.deepEqual(sample, {
    version: 1,
    mainDiagnosisId: "stable_metabolism",
    signals: [],
    fieldsUsed: ["totalTokens"],
    sourceIds: ["codex"],
    excludedSourceIds: [],
    baselineActiveDays: 3,
    provisional: false,
  });
  assert.doesNotMatch(JSON.stringify(sample), /1000|mutation-test|model|path|prompt/i);

  writeCodexUsage(
    codex,
    Array.from({ length: 4 }, () => ({
      input_tokens: 2_250,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 250,
      total_tokens: 2_500,
    })),
    "2026-07-23",
  );
  const repeated = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    env,
  );
  assert.equal(repeated.status, 0, repeated.stderr);
  const repeatedState = JSON.parse(readFileSync(statePath, "utf8"));
  assert.deepEqual(repeatedState.days["2026-07-23"].metabolism, sample);
});

test("historical creature settlement seals a completed low-use diagnosis", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-clinic-historical-settle-"));
  const home = path.join(workspace, "home");
  const codex = path.join(workspace, "codex");
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const dates = datesThrough("2026-07-23", 4);
  for (const [index, date] of dates.entries()) {
    writeCodexUsage(
      codex,
      Array.from({ length: 4 }, () => ({
        input_tokens: index === 3 ? 87.5 : 225,
        output_tokens: index === 3 ? 12.5 : 25,
        total_tokens: index === 3 ? 100 : 250,
      })),
      date,
    );
  }

  const result = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    {
      HOME: home,
      ANTI_AI_CODEX_DIR: codex,
      ANTI_AI_CREATURE_SEED: "clinic-historical-settlement",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  assert.equal(
    state.days["2026-07-23"].metabolism.mainDiagnosisId,
    "restrained_recovery",
  );
  assert.equal(state.days["2026-07-23"].metabolism.provisional, false);
});

test("a later settlement finalizes an older provisional sample without rewriting growth", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-clinic-finalize-"));
  const home = path.join(workspace, "home");
  const codex = path.join(workspace, "codex");
  const statePath = path.join(home, ".anti-ai", "creature.json");
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  for (const [index, date] of datesThrough("2026-07-23", 5).entries()) {
    const low = index === 3;
    writeCodexUsage(
      codex,
      Array.from({ length: 4 }, () => ({
        input_tokens: low ? 87.5 : 225,
        output_tokens: low ? 12.5 : 25,
        total_tokens: low ? 100 : 250,
      })),
      date,
    );
  }
  const environment = {
    HOME: home,
    ANTI_AI_CODEX_DIR: codex,
    ANTI_AI_CREATURE_SEED: "clinic-finalize",
  };
  const first = runCli(
    ["creature", "--date", "2026-07-22", "--json"],
    environment,
  );
  assert.equal(first.status, 0, first.stderr);
  const provisionalState = JSON.parse(readFileSync(statePath, "utf8"));
  const growthBefore = {
    ...provisionalState.days["2026-07-22"],
    metabolism: undefined,
  };
  provisionalState.days["2026-07-22"].metabolism = {
    version: 1,
    mainDiagnosisId: "stable_metabolism",
    signals: [],
    fieldsUsed: ["totalTokens"],
    sourceIds: ["codex"],
    excludedSourceIds: [],
    baselineActiveDays: 3,
    provisional: true,
  };
  writeFileSync(statePath, `${JSON.stringify(provisionalState, null, 2)}\n`);

  const second = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    environment,
  );

  assert.equal(second.status, 0, second.stderr);
  const finalizedState = JSON.parse(readFileSync(statePath, "utf8"));
  assert.equal(
    finalizedState.days["2026-07-22"].metabolism.mainDiagnosisId,
    "restrained_recovery",
  );
  assert.equal(finalizedState.days["2026-07-22"].metabolism.provisional, false);
  assert.deepEqual(
    { ...finalizedState.days["2026-07-22"], metabolism: undefined },
    growthBefore,
  );
});

test("study outcomes derive from sealed samples without changing growth", () => {
  const state = {
    clinic: {
      version: 1,
      studies: [
        {
          id: "study-2026-07-01-cache_rehab",
          protocolId: "cache_rehab",
          startedAt: "2026-07-01",
          endsAt: "2026-07-07",
          contentVersion: 1,
        },
      ],
    },
    days: Object.fromEntries(
      datesThrough("2026-07-07", 7).map((date, index) => [
        date,
        {
          metabolism: {
            version: 1,
            mainDiagnosisId: index === 0 ? "cache_imbalance" : "stable_metabolism",
            signals: index === 0
              ? [{ id: "cache_imbalance", severityBand: "moderate" }]
              : [],
            fieldsUsed: [],
            sourceIds: ["codex"],
            excludedSourceIds: [],
            baselineActiveDays: 3,
            provisional: false,
          },
        },
      ]),
    ),
  };

  const history = deriveClinicStudyHistory(state, "2026-07-08");

  assert.equal(history.records[0].resultId, "cache_stable");
  assert.equal(history.records[0].progress.observableDays, 7);
  assert.deepEqual(Object.keys(state), ["clinic", "days"]);
});

test("study history projection does not mutate a legacy state in memory", () => {
  const state = { schemaVersion: 14, seed: "legacy", days: {} };
  const before = JSON.stringify(state);

  const history = deriveClinicStudyHistory(state, "2026-07-23");

  assert.deepEqual(history.records, []);
  assert.equal(JSON.stringify(state), before);
});

test("sealed clinic trends remain a read-only TUI projection", () => {
  const state = {
    days: Object.fromEntries(
      datesThrough("2026-07-23", 7).map((date, index) => [
        date,
        {
          active: index !== 1,
          metabolism: {
            version: 1,
            mainDiagnosisId: index < 2
              ? "insufficient_evidence"
              : index < 5
                ? "cache_imbalance"
                : "stable_metabolism",
            signals: index >= 2 && index < 5
              ? [{ id: "cache_imbalance", severityBand: "moderate" }]
              : [],
            fieldsUsed: ["totalTokens"],
            sourceIds: ["codex"],
            excludedSourceIds: [],
            baselineActiveDays: Math.max(0, index - 1),
            provisional: false,
          },
        },
      ]),
    ),
  };
  const before = JSON.stringify(state);

  const trends = deriveSealedClinicTrends(state, "2026-07-23");

  assert.deepEqual(trends.days7, {
    observableDays: 5,
    activeDays: 6,
    soberDays: 1,
    signalDays: 3,
    direction: "decreasing",
  });
  assert.deepEqual(trends.days30, trends.days7);
  assert.equal(JSON.stringify(state), before);
});

test("today week and month append one period-sized clinic section without changing today JSON", () => {
  const today = runCli([
    "today",
    "--date",
    "2026-07-23",
    "--source",
    "codex",
  ]);
  const week = runCli([
    "week",
    "--date",
    "2026-07-23",
    "--source",
    "codex",
    "--lang",
    "en",
  ]);
  const month = runCli([
    "month",
    "--date",
    "2026-07-23",
    "--source",
    "codex",
  ]);
  const todayJson = runCli([
    "today",
    "--date",
    "2026-07-23",
    "--source",
    "codex",
    "--json",
  ]);

  assert.equal(today.status, 0, today.stderr);
  assert.equal((today.stdout.match(/代谢门诊/g) ?? []).length, 1);
  assert.match(today.stdout, /主诊断/);
  assert.match(today.stdout, /证据范围/);
  assert.match(today.stdout, /anti-ai clinic/);
  assert.ok(
    today.stdout.indexOf("生活翻译") < today.stdout.indexOf("代谢门诊"),
  );

  assert.equal(week.status, 0, week.stderr);
  assert.equal((week.stdout.match(/METABOLIC CLINIC/g) ?? []).length, 1);
  assert.match(week.stdout, /7-DAY REVIEW/);
  assert.match(week.stdout, /observable/);
  assert.doesNotMatch(week.stdout, /[\p{Script=Han}]/u);

  assert.equal(month.status, 0, month.stderr);
  assert.equal((month.stdout.match(/代谢门诊/g) ?? []).length, 1);
  assert.match(month.stdout, /30 天复查/);

  assert.equal(todayJson.status, 0, todayJson.stderr);
  const parsed = JSON.parse(todayJson.stdout);
  assert.equal(parsed.diagnosis, undefined);
  assert.equal(parsed.clinic, undefined);
});

test("TUI overview projects sealed metabolism and starts studies through the shared action flow", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-clinic-tui-"));
  const home = path.join(workspace, "home");
  const codex = path.join(workspace, "codex");
  const date = "2026-07-23";
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  for (const entryDate of datesThrough(date, 4)) {
    writeCodexUsage(
      codex,
      Array.from({ length: 4 }, () => ({
        input_tokens: 225,
        output_tokens: 25,
        total_tokens: 250,
      })),
      entryDate,
    );
  }
  const environment = {
    HOME: home,
    ANTI_AI_CODEX_DIR: codex,
    ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
    ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
    ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
    ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
    ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
    ANTI_AI_CREATURE_SEED: "clinic-tui",
  };
  const settled = runCli(["creature", "--date", date, "--json"], environment);
  assert.equal(settled.status, 0, settled.stderr);
  const expedition = runCli(
    ["expedition", "start", "context_mine", "--date", date, "--json"],
    environment,
  );
  assert.equal(expedition.status, 0, expedition.stderr);
  const abandoned = runCli(
    ["expedition", "abandon", "--date", date, "--json"],
    environment,
  );
  assert.equal(abandoned.status, 0, abandoned.stderr);
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const snapshot = deriveTuiSnapshot(state, date, "en");

  assert.equal(snapshot.clinic.diagnosis.id, "stable_metabolism");
  assert.match(snapshot.clinic.diagnosis.label, /METABOLISM STABLE/);
  assert.deepEqual(snapshot.clinic.evidence.fieldsUsed, ["totalTokens"]);
  assert.deepEqual(snapshot.clinic.evidence.sourceIds, ["codex"]);
  assert.equal(snapshot.clinic.trends.days7.observableDays, 1);
  assert.equal(snapshot.clinic.trends.days30.observableDays, 1);
  assert.equal(snapshot.clinic.study.active, null);
  assert.equal(
    snapshot.actions.find(({ id }) => id === "start_study").available,
    true,
  );
  assert.notEqual(snapshot.dailyBriefing.recommendation?.id, "start_study");
  assert.match(
    snapshot.dailyBriefing.sections.find(({ id }) => id === "diagnosis").detail,
    /METABOLISM STABLE/,
  );

  const previousEnvironment = Object.fromEntries(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  t.after(() => {
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const before = readFileSync(statePath, "utf8");
  const preview = await previewContainmentAction("start_study", {
    date,
    lang: "en",
  });
  assert.equal(preview.available, true);
  assert.deepEqual(
    preview.choices.map(({ id }) => id),
    ["cache-rehab", "context-diet", "load-recovery"],
  );
  assert.equal(readFileSync(statePath, "utf8"), before);

  const completed = await executeContainmentAction("start_study", {
    date,
    lang: "en",
    choice: "context-diet",
  });
  assert.equal(completed.status, "completed");
  assert.equal(completed.snapshot.clinic.study.active.protocolId, "context_diet");
  assert.equal(
    completed.snapshot.actions.find(({ id }) => id === "start_study").reason,
    "study_active",
  );
});
