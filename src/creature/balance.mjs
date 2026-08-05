const CREATURE_BALANCE_VERSION = 2;
const CREATURE_BASELINE_WINDOW = 28;
const CREATURE_ECOLOGY_WINDOW = 28;
const CREATURE_ECOLOGY_THRESHOLD = 0.6;
const CREATURE_ABSOLUTE_POLLUTION_DOSE = 75;

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function creatureUsageBaseline(historicalReports = []) {
  const activeTotals = historicalReports
    .slice(-CREATURE_BASELINE_WINDOW)
    .map((report) => report?.totals?.totalTokens ?? 0)
    .filter((totalTokens) => totalTokens > 0);
  return median(activeTotals);
}

function creatureUsageBand(totalTokens, baselineTokens) {
  if (totalTokens <= 0) {
    return {
      id: "sober",
      gains: { pollution: 0, clarity: 3 },
    };
  }
  if (baselineTokens <= 0) {
    return {
      id: "calibrating",
      gains: { pollution: 1, clarity: 0 },
    };
  }
  const ratio = totalTokens / baselineTokens;
  if (ratio <= 0.3) {
    return { id: "restrained", gains: { pollution: 0, clarity: 2 } };
  }
  if (ratio <= 0.7) {
    return { id: "light", gains: { pollution: 0, clarity: 1 } };
  }
  if (ratio <= 1.5) {
    return { id: "habitual", gains: { pollution: 0, clarity: 0 } };
  }
  if (ratio <= 3) {
    return { id: "heavy", gains: { pollution: 1, clarity: 0 } };
  }
  if (ratio <= 6) {
    return { id: "binge", gains: { pollution: 2, clarity: 0 } };
  }
  return { id: "meltdown", gains: { pollution: 3, clarity: 0 } };
}

function creatureEcologyGainsForDose(usage, pollutionDose) {
  return {
    ...usage.gains,
    pollution: pollutionDose >= CREATURE_ABSOLUTE_POLLUTION_DOSE
      ? Math.max(1, usage.gains.pollution)
      : usage.gains.pollution,
  };
}

function creatureEcologyWindow(gains = []) {
  const recent = gains.slice(-CREATURE_ECOLOGY_WINDOW);
  const pollution = recent.reduce(
    (sum, gain) => sum + (gain?.pollution ?? 0),
    0,
  );
  const clarity = recent.reduce(
    (sum, gain) => sum + (gain?.clarity ?? 0),
    0,
  );
  return {
    days: recent.length,
    pollution,
    clarity,
    pollutionRate: recent.length === 0 ? 0 : pollution / recent.length,
    clarityRate: recent.length === 0 ? 0 : clarity / recent.length,
  };
}

function classifyCreatureEcologyWindow(gains = []) {
  const window = creatureEcologyWindow(gains);
  if (window.days === 0) return { type: "unformed", window };
  const polluted = window.pollutionRate >= CREATURE_ECOLOGY_THRESHOLD;
  const lucid = window.clarityRate >= CREATURE_ECOLOGY_THRESHOLD;
  return {
    type: polluted && lucid
      ? "paradox"
      : polluted
        ? "polluted"
        : lucid
          ? "lucid"
          : "unformed",
    window,
  };
}

export {
  CREATURE_BALANCE_VERSION,
  CREATURE_ABSOLUTE_POLLUTION_DOSE,
  CREATURE_BASELINE_WINDOW,
  CREATURE_ECOLOGY_THRESHOLD,
  CREATURE_ECOLOGY_WINDOW,
  classifyCreatureEcologyWindow,
  creatureEcologyWindow,
  creatureEcologyGainsForDose,
  creatureUsageBand,
  creatureUsageBaseline,
};
