const CLINIC_VERSION = 1;
const BASELINE_ACTIVE_DAYS = 14;
const MIN_BASELINE_ACTIVE_DAYS = 3;

const SIGNAL_PRIORITY = Object.freeze([
  "burst_overload",
  "cache_imbalance",
  "context_bloat",
  "request_fragmentation",
  "model_migration",
  "restrained_recovery",
]);

const SIGNAL_FIELDS = Object.freeze({
  burst_overload: ["totalTokens"],
  cache_imbalance: [
    "inputTokens",
    "cachedInputTokens",
    "cacheWriteInputTokens",
    "requests",
  ],
  context_bloat: [
    "inputTokens",
    "cachedInputTokens",
    "cacheWriteInputTokens",
    "requests",
  ],
  request_fragmentation: ["requests", "totalTokens"],
  model_migration: ["models.totalTokens"],
  restrained_recovery: ["totalTokens"],
  stable_metabolism: ["totalTokens"],
  insufficient_evidence: [],
});

const SOURCE_CAPABILITIES = Object.freeze({
  codex: { requests: true, cache: true, models: true },
  claude: { requests: true, cache: true, models: true },
  opencode: { requests: true, cache: true, models: true },
  openclaw: { requests: true, cache: true, models: true },
  pi: { requests: true, cache: true, models: true },
  hermes: { requests: false, cache: false, models: false },
});

const LIMITATIONS = Object.freeze([
  "correlation_not_causation",
  "not_productivity_judgment",
]);

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function shiftDate(date, days) {
  const shifted = new Date(`${date}T12:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function activeSourceIds(report) {
  return Object.entries(report?.sources ?? {})
    .filter(([, usage]) => usage.totalTokens > 0)
    .map(([source]) => source)
    .sort();
}

function reportsThrough(reports, targetDate) {
  return reports
    .filter(({ date }) => date <= targetDate)
    .sort((left, right) => left.date.localeCompare(right.date));
}

function sourceActiveReports(reports, targetDate, source) {
  return reports
    .filter(
      (report) =>
        report.date < targetDate &&
        (report.sources?.[source]?.totalTokens ?? 0) > 0,
    )
    .slice(-BASELINE_ACTIVE_DAYS);
}

function freshInputPerRequest(usage) {
  if (!usage || usage.requests <= 0) return null;
  const fresh = Math.max(
    0,
    usage.inputTokens -
      usage.cachedInputTokens -
      usage.cacheWriteInputTokens,
  );
  return fresh / usage.requests;
}

function tokensPerRequest(usage) {
  return usage?.requests > 0 ? usage.totalTokens / usage.requests : null;
}

function dominantModel(report, source) {
  const candidates = Object.entries(report?.models?.[source] ?? {})
    .filter(([model, usage]) => model !== "unknown" && usage.totalTokens > 0)
    .sort(
      (left, right) =>
        right[1].totalTokens - left[1].totalTokens ||
        left[0].localeCompare(right[0]),
    );
  const total = candidates.reduce(
    (sum, [, usage]) => sum + usage.totalTokens,
    0,
  );
  if (candidates.length === 0 || total <= 0) return null;
  return {
    id: candidates[0][0],
    share: candidates[0][1].totalTokens / total,
  };
}

function sourceSupports(source, signalId) {
  const capabilities = SOURCE_CAPABILITIES[source] ?? {
    requests: false,
    cache: false,
    models: false,
  };
  if (["cache_imbalance", "context_bloat"].includes(signalId)) {
    return capabilities.requests && capabilities.cache;
  }
  if (signalId === "request_fragmentation") return capabilities.requests;
  if (signalId === "model_migration") return capabilities.models;
  return true;
}

function globalBaseline(throughTarget, targetDate) {
  return throughTarget
    .filter(
      (report) => report.date < targetDate && report.totals.totalTokens > 0,
    )
    .slice(-BASELINE_ACTIVE_DAYS);
}

function burstSignal(target, baseline) {
  if (baseline.length < MIN_BASELINE_ACTIVE_DAYS) return null;
  const baselineMedian = median(
    baseline.map(({ totals }) => totals.totalTokens),
  );
  if (!(baselineMedian > 0)) return null;
  const ratio = target.totals.totalTokens / baselineMedian;
  if (ratio < 2.5) return null;
  return {
    id: "burst_overload",
    severityBand: ratio >= 3 ? "high" : "moderate",
    score: ratio / 2.5,
    sourceIds: uniqueSorted([
      ...activeSourceIds(target),
      ...baseline.flatMap((report) => activeSourceIds(report)),
    ]),
    baselineActiveDays: baseline.length,
  };
}

function cacheSignals(target) {
  return Object.entries(target.sources ?? {}).flatMap(([source, usage]) => {
    if (!sourceSupports(source, "cache_imbalance")) return [];
    if (usage.requests < 3 || usage.inputTokens <= 0) return [];
    const writeShare = usage.cacheWriteInputTokens / usage.inputTokens;
    const readShare = usage.cachedInputTokens / usage.inputTokens;
    if (writeShare < 0.35 || readShare >= 0.15) return [];
    return [{
      id: "cache_imbalance",
      severityBand: writeShare >= 0.6 ? "high" : "moderate",
      score: writeShare / 0.35,
      sourceIds: [source],
      baselineActiveDays: 0,
    }];
  });
}

function contextSignals(throughTarget, target, targetDate) {
  return Object.entries(target.sources ?? {}).flatMap(([source, usage]) => {
    if (!sourceSupports(source, "context_bloat") || usage.requests < 3) {
      return [];
    }
    const current = freshInputPerRequest(usage);
    const baseline = sourceActiveReports(throughTarget, targetDate, source)
      .map((report) => freshInputPerRequest(report.sources[source]))
      .filter((value) => value !== null);
    if (baseline.length < MIN_BASELINE_ACTIVE_DAYS) return [];
    const baselineMedian = median(baseline);
    if (!(baselineMedian > 0) || current / baselineMedian < 2.2) return [];
    const ratio = current / baselineMedian;
    return [{
      id: "context_bloat",
      severityBand: ratio >= 3.3 ? "high" : "moderate",
      score: ratio / 2.2,
      sourceIds: [source],
      baselineActiveDays: baseline.length,
    }];
  });
}

function fragmentationSignals(throughTarget, target, targetDate) {
  return Object.entries(target.sources ?? {}).flatMap(([source, usage]) => {
    if (!sourceSupports(source, "request_fragmentation") || usage.requests <= 0) {
      return [];
    }
    const baselineReports = sourceActiveReports(
      throughTarget,
      targetDate,
      source,
    ).filter((report) => report.sources[source].requests > 0);
    if (baselineReports.length < MIN_BASELINE_ACTIVE_DAYS) return [];
    const requestMedian = median(
      baselineReports.map((report) => report.sources[source].requests),
    );
    const tokenMedian = median(
      baselineReports.map((report) =>
        tokensPerRequest(report.sources[source]),
      ),
    );
    const currentTokens = tokensPerRequest(usage);
    if (!(requestMedian > 0) || !(tokenMedian > 0)) return [];
    const requestRatio = usage.requests / requestMedian;
    const tokenRatio = currentTokens / tokenMedian;
    if (requestRatio < 2 || tokenRatio > 0.55) return [];
    return [{
      id: "request_fragmentation",
      severityBand:
        requestRatio >= 3 || tokenRatio <= 0.35 ? "high" : "moderate",
      score: Math.max(requestRatio / 2, 0.55 / tokenRatio),
      sourceIds: [source],
      baselineActiveDays: baselineReports.length,
    }];
  });
}

function migrationSignals(throughTarget, target, targetDate) {
  return Object.keys(target.sources ?? {}).flatMap((source) => {
    if (!sourceSupports(source, "model_migration")) return [];
    const current = dominantModel(target, source);
    if (!current || current.share < 0.6) return [];
    const baseline = sourceActiveReports(throughTarget, targetDate, source)
      .map((report) => dominantModel(report, source))
      .filter(Boolean)
      .slice(-3);
    if (
      baseline.length < 3 ||
      baseline.some(
        (entry) => entry.share < 0.6 || entry.id !== baseline[0].id,
      ) ||
      current.id === baseline[0].id
    ) {
      return [];
    }
    return [{
      id: "model_migration",
      severityBand: "moderate",
      score: current.share / 0.6,
      sourceIds: [source],
      baselineActiveDays: baseline.length,
    }];
  });
}

function recoverySignal(target, baseline, targetDate, currentDate) {
  if (
    targetDate >= currentDate ||
    baseline.length < MIN_BASELINE_ACTIVE_DAYS
  ) {
    return null;
  }
  const baselineMedian = median(
    baseline.map(({ totals }) => totals.totalTokens),
  );
  if (!(baselineMedian > 0)) return null;
  const ratio = target.totals.totalTokens / baselineMedian;
  if (target.totals.totalTokens > 0 && ratio > 0.45) return null;
  return {
    id: "restrained_recovery",
    severityBand: "recovery",
    score: target.totals.totalTokens === 0 ? 2 : 0.45 / ratio,
    sourceIds: uniqueSorted([
      ...activeSourceIds(target),
      ...baseline.flatMap((report) => activeSourceIds(report)),
    ]),
    baselineActiveDays: baseline.length,
  };
}

function strongestBySignal(signals) {
  const byId = new Map();
  for (const signal of signals) {
    const previous = byId.get(signal.id);
    const sourceKey = signal.sourceIds.join("\0");
    const previousSourceKey = previous?.sourceIds.join("\0") ?? "";
    if (
      !previous ||
      signal.score > previous.score ||
      (signal.score === previous.score && sourceKey < previousSourceKey)
    ) {
      byId.set(signal.id, signal);
    }
  }
  return SIGNAL_PRIORITY.flatMap((id) => byId.get(id) ?? []);
}

function scanFailedSources(target) {
  return new Set((target.warnings ?? []).map(({ source }) => source));
}

function comparableBaselineCount(throughTarget, targetDate, source, signalId) {
  const baseline = sourceActiveReports(throughTarget, targetDate, source);
  if (signalId === "context_bloat") {
    return baseline.filter(
      (report) => freshInputPerRequest(report.sources[source]) !== null,
    ).length;
  }
  if (signalId === "request_fragmentation") {
    return baseline.filter(
      (report) =>
        report.sources[source].requests > 0 &&
        tokensPerRequest(report.sources[source]) > 0,
    ).length;
  }
  if (signalId === "model_migration") {
    return baseline.filter((report) => dominantModel(report, source)).length;
  }
  return baseline.length;
}

function excludedSources(throughTarget, target, targetDate, signalId, used) {
  const failures = scanFailedSources(target);
  const active = uniqueSorted([
    ...failures,
    ...activeSourceIds(target),
    ...throughTarget
      .filter(({ date }) => date < targetDate)
      .flatMap((report) => activeSourceIds(report)),
  ]);
  return active.flatMap((source) => {
    if (used.includes(source)) return [];
    if (failures.has(source)) return [{ id: source, reason: "scan_failed" }];
    if (!sourceSupports(source, signalId)) {
      return [{ id: source, reason: "field_unavailable" }];
    }
    if (
      [
        "context_bloat",
        "request_fragmentation",
        "model_migration",
      ].includes(signalId) &&
      comparableBaselineCount(throughTarget, targetDate, source, signalId) <
        MIN_BASELINE_ACTIVE_DAYS
    ) {
      return [{ id: source, reason: "no_comparable_baseline" }];
    }
    return [];
  });
}

function diagnoseDay(reports, targetDate, currentDate) {
  const throughTarget = reportsThrough(reports, targetDate);
  const target = throughTarget.find(({ date }) => date === targetDate);
  if (!target) {
    return {
      diagnosis: {
        id: "insufficient_evidence",
        severityBand: "unknown",
        signals: [],
      },
      evidence: {
        fieldsUsed: [],
        sourcesUsed: [],
        excludedSources: [],
        baselineActiveDays: 0,
      },
      provisional: targetDate >= currentDate,
      signalDetails: [],
    };
  }

  const baseline = globalBaseline(throughTarget, targetDate);
  const signals = strongestBySignal([
    burstSignal(target, baseline),
    ...cacheSignals(target),
    ...contextSignals(throughTarget, target, targetDate),
    ...fragmentationSignals(throughTarget, target, targetDate),
    ...migrationSignals(throughTarget, target, targetDate),
    recoverySignal(target, baseline, targetDate, currentDate),
  ].filter(Boolean));
  const main = signals[0];
  const enoughForStable =
    target.totals.totalTokens > 0 &&
    baseline.length >= MIN_BASELINE_ACTIVE_DAYS;
  const id = main?.id ??
    (enoughForStable ? "stable_metabolism" : "insufficient_evidence");
  const sourceIds = main?.sourceIds ??
    (enoughForStable
      ? uniqueSorted([
          ...activeSourceIds(target),
          ...baseline.flatMap((report) => activeSourceIds(report)),
        ])
      : []);

  return {
    diagnosis: {
      id,
      severityBand: main?.severityBand ??
        (enoughForStable ? "stable" : "unknown"),
      signals: signals.map(({ id: signalId }) => signalId),
    },
    evidence: {
      fieldsUsed: [...SIGNAL_FIELDS[id]],
      sourcesUsed: [...sourceIds].sort(),
      excludedSources: excludedSources(
        throughTarget,
        target,
        targetDate,
        id,
        sourceIds,
      ),
      baselineActiveDays: main?.baselineActiveDays || baseline.length,
    },
    provisional: targetDate >= currentDate,
    signalDetails: signals.map(({ id: signalId, severityBand }) => ({
      id: signalId,
      severityBand,
    })),
  };
}

function trendForDays(reports, targetDate, currentDate, days) {
  const startDate = shiftDate(targetDate, -(days - 1));
  const selected = reportsThrough(reports, targetDate).filter(
    ({ date }) => date >= startDate,
  );
  const diagnosed = selected.map((report) => ({
    report,
    result: diagnoseDay(reports, report.date, currentDate),
  }));
  const observable = diagnosed.filter(
    ({ result }) => result.diagnosis.id !== "insufficient_evidence",
  );
  const counts = new Map();
  for (const { result } of observable) {
    for (const signal of result.diagnosis.signals) {
      counts.set(signal, (counts.get(signal) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort(
    (left, right) =>
      right[1] - left[1] ||
      SIGNAL_PRIORITY.indexOf(left[0]) - SIGNAL_PRIORITY.indexOf(right[0]),
  );
  const midpoint = Math.floor(observable.length / 2);
  const rate = (entries) =>
    entries.length === 0
      ? null
      : entries.filter(({ result }) => result.diagnosis.signals.length > 0)
          .length / entries.length;
  const earlierRate = rate(observable.slice(0, midpoint));
  const laterRate = rate(observable.slice(midpoint));
  let direction = "insufficient";
  if (earlierRate !== null && laterRate !== null) {
    const delta = laterRate - earlierRate;
    direction = delta >= 0.1 ? "increasing" : delta <= -0.1 ? "decreasing" : "stable";
  }
  return {
    observableDays: observable.length,
    activeDays: selected.filter(({ totals }) => totals.totalTokens > 0).length,
    soberDays: selected.filter(({ totals }) => totals.totalTokens === 0).length,
    signalDays: observable.filter(
      ({ result }) => result.diagnosis.signals.length > 0,
    ).length,
    topSignal: ranked[0]?.[0] ?? null,
    direction,
  };
}

function deriveClinicReport(reports, targetDate, options = {}) {
  const currentDate = options.currentDate ?? targetDate;
  const result = diagnoseDay(reports, targetDate, currentDate);
  return {
    version: CLINIC_VERSION,
    date: targetDate,
    provisional: result.provisional,
    diagnosis: result.diagnosis,
    evidence: result.evidence,
    trends: {
      days7: trendForDays(reports, targetDate, currentDate, 7),
      days30: trendForDays(reports, targetDate, currentDate, 30),
    },
    study: options.study ?? null,
    limitations: [...LIMITATIONS],
  };
}

function deriveMetabolismSnapshot(reports, targetDate, currentDate = targetDate) {
  const result = diagnoseDay(reports, targetDate, currentDate);
  return {
    version: CLINIC_VERSION,
    mainDiagnosisId: result.diagnosis.id,
    signals: result.signalDetails,
    fieldsUsed: result.evidence.fieldsUsed,
    sourceIds: result.evidence.sourcesUsed,
    excludedSourceIds: uniqueSorted(
      result.evidence.excludedSources.map(({ id }) => id),
    ),
    baselineActiveDays: result.evidence.baselineActiveDays,
    provisional: result.provisional,
  };
}

export {
  CLINIC_VERSION,
  SIGNAL_FIELDS,
  SOURCE_CAPABILITIES,
  deriveClinicReport,
  deriveMetabolismSnapshot,
};
