import { shiftDate } from "./core/date.mjs";

const CLINIC_STUDY_VERSION = 1;

const CLINIC_PROTOCOLS = Object.freeze([
  {
    id: "cache_rehab",
    cli: "cache-rehab",
    durationDays: 7,
    labels: ["缓存康复观察", "CACHE REHAB OBSERVATION"],
  },
  {
    id: "context_diet",
    cli: "context-diet",
    durationDays: 14,
    labels: ["上下文节食观察", "CONTEXT DIET OBSERVATION"],
  },
  {
    id: "load_recovery",
    cli: "load-recovery",
    durationDays: 30,
    labels: ["负载恢复观察", "LOAD RECOVERY OBSERVATION"],
  },
]);

function ensureClinicState(state) {
  state.clinic ??= { version: CLINIC_STUDY_VERSION, studies: [] };
  state.clinic.version = CLINIC_STUDY_VERSION;
  state.clinic.studies ??= [];
  return state.clinic;
}

function clinicProtocol(value) {
  return CLINIC_PROTOCOLS.find(
    ({ id, cli }) => value === id || value === cli,
  ) ?? null;
}

function dateDistance(startDate, endDate) {
  const start = new Date(`${startDate}T12:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T12:00:00.000Z`).getTime();
  return Math.round((end - start) / 86_400_000);
}

function studySamples(state, study, viewDate) {
  const sampleEnd = viewDate < study.endsAt ? viewDate : study.endsAt;
  if (sampleEnd < study.startedAt) return [];
  return Object.entries(state.days ?? {})
    .filter(
      ([date, day]) =>
        date >= study.startedAt &&
        date <= sampleEnd &&
        day.metabolism?.version === 1,
    )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, day]) => ({ date, ...day.metabolism }));
}

function signalCount(samples, signalId) {
  return samples.filter(({ signals }) =>
    signals.some(({ id }) => id === signalId),
  ).length;
}

function studyResult(protocolId, samples) {
  const observableDays = samples.length;
  if (protocolId === "cache_rehab") {
    if (observableDays < 3) return "insufficient_evidence";
    return signalCount(samples, "cache_imbalance") / observableDays <= 0.25
      ? "cache_stable"
      : "write_relapse";
  }
  if (protocolId === "context_diet") {
    if (observableDays < 4) return "insufficient_evidence";
    const bloat = signalCount(samples, "context_bloat");
    const fragmentation = signalCount(samples, "request_fragmentation");
    if (fragmentation >= bloat && fragmentation / observableDays >= 0.3) {
      return "fragmented";
    }
    return bloat / observableDays >= 0.3
      ? "context_swelling"
      : "context_stable";
  }
  if (observableDays < 7) return "insufficient_evidence";
  const overload = signalCount(samples, "burst_overload");
  const recovery = signalCount(samples, "restrained_recovery");
  if (overload > 0 && recovery > 0) return "load_oscillating";
  return overload / observableDays >= 0.25
    ? "overload_relapse"
    : "load_recovered";
}

function deriveStudyRecord(state, study, viewDate) {
  const protocol = clinicProtocol(study.protocolId);
  const samples = studySamples(state, study, viewDate);
  const status = viewDate < study.startedAt
    ? "upcoming"
    : viewDate <= study.endsAt
      ? "active"
      : "completed";
  const elapsedDays = status === "upcoming"
    ? 0
    : Math.min(
        protocol.durationDays,
        dateDistance(study.startedAt, viewDate) + 1,
      );
  const resultId = status === "completed"
    ? studyResult(study.protocolId, samples)
    : null;
  return {
    id: study.id,
    protocolId: study.protocolId,
    durationDays: protocol.durationDays,
    startedAt: study.startedAt,
    endsAt: study.endsAt,
    status,
    progress: {
      elapsedDays,
      totalDays: protocol.durationDays,
      observableDays: samples.length,
    },
    resultId,
    sealId: resultId
      ? `study_${study.protocolId}_${resultId}`
      : null,
  };
}

function deriveClinicStudyHistory(state, viewDate) {
  const records = (state.clinic?.studies ?? [])
    .map((study) => deriveStudyRecord(state, study, viewDate))
    .sort(
      (left, right) =>
        right.startedAt.localeCompare(left.startedAt) ||
        right.id.localeCompare(left.id),
    );
  return {
    version: CLINIC_STUDY_VERSION,
    date: viewDate,
    active: records.find(({ status }) => status === "active") ?? null,
    records,
  };
}

function sealedTrend(state, viewDate, days) {
  const startDate = shiftDate(viewDate, -(days - 1));
  const selected = Object.entries(state.days ?? {})
    .filter(([date]) => date >= startDate && date <= viewDate)
    .sort(([left], [right]) => left.localeCompare(right));
  const observable = selected.filter(
    ([, day]) =>
      day.metabolism?.version === 1 &&
      day.metabolism.mainDiagnosisId !== "insufficient_evidence",
  );
  const midpoint = Math.floor(observable.length / 2);
  const signalRate = (entries) =>
    entries.length === 0
      ? null
      : entries.filter(([, day]) => day.metabolism.signals.length > 0).length /
        entries.length;
  const earlierRate = signalRate(observable.slice(0, midpoint));
  const laterRate = signalRate(observable.slice(midpoint));
  let direction = "insufficient";
  if (earlierRate !== null && laterRate !== null) {
    const delta = laterRate - earlierRate;
    direction = delta >= 0.1
      ? "increasing"
      : delta <= -0.1
        ? "decreasing"
        : "stable";
  }
  return {
    observableDays: observable.length,
    activeDays: selected.filter(([, day]) => day.active === true).length,
    soberDays: selected.filter(([, day]) => day.active === false).length,
    signalDays: observable.filter(
      ([, day]) => day.metabolism.signals.length > 0,
    ).length,
    direction,
  };
}

function deriveSealedClinicTrends(state, viewDate) {
  return {
    days7: sealedTrend(state, viewDate, 7),
    days30: sealedTrend(state, viewDate, 30),
  };
}

function startClinicStudy(state, date, protocolValue) {
  const clinic = ensureClinicState(state);
  const protocol = clinicProtocol(protocolValue);
  if (!protocol) return { error: "invalid_protocol" };
  const endsAt = shiftDate(date, protocol.durationDays - 1);
  const overlaps = clinic.studies.some(
    (study) => study.startedAt <= endsAt && date <= study.endsAt,
  );
  if (overlaps) return { error: "study_active" };
  const study = {
    id: `study-${date}-${protocol.id}`,
    protocolId: protocol.id,
    startedAt: date,
    endsAt,
    contentVersion: 1,
  };
  clinic.studies.push(study);
  clinic.studies.sort(
    (left, right) =>
      left.startedAt.localeCompare(right.startedAt) ||
      left.id.localeCompare(right.id),
  );
  return { value: study };
}

export {
  CLINIC_PROTOCOLS,
  CLINIC_STUDY_VERSION,
  clinicProtocol,
  deriveClinicStudyHistory,
  deriveSealedClinicTrends,
  ensureClinicState,
  startClinicStudy,
};
