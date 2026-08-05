import assert from "node:assert/strict";
import test from "node:test";

import {
  CREATURE_BALANCE_VERSION,
  classifyCreatureEcologyWindow,
  creatureUsageBand,
  creatureUsageBaseline,
} from "../src/creature/balance.mjs";

function report(totalTokens) {
  return { totals: { totalTokens } };
}

function settleUsageScenario(totals) {
  const history = [];
  return totals.map((totalTokens) => {
    const baseline = creatureUsageBaseline(history);
    const band = creatureUsageBand(totalTokens, baseline);
    history.push(report(totalTokens));
    return band;
  });
}

test("30-day balance scenario keeps weekly spikes out of the clarity route", () => {
  const days = Array.from(
    { length: 30 },
    (_, index) => ((index + 1) % 7 === 0 ? 700_000 : 100_000),
  );
  const bands = settleUsageScenario(days);
  assert.equal(CREATURE_BALANCE_VERSION, 2);
  assert.equal(
    bands.reduce((sum, band) => sum + band.gains.clarity, 0),
    0,
  );
  assert.ok(bands.filter((band) => band.id === "meltdown").length >= 4);
});

test("90-day balance scenario rewards a durable reduction without permanent farming", () => {
  const bands = settleUsageScenario([
    ...Array(60).fill(100_000),
    ...Array(30).fill(30_000),
  ]);
  const reduced = bands.slice(-30);
  assert.ok(
    reduced.filter((band) => ["restrained", "light"].includes(band.id)).length >= 14,
  );
  assert.equal(reduced.at(-1).id, "habitual");
});

test("365-day balance scenario derives current identity from the latest window", () => {
  const lifetime = [
    ...Array.from({ length: 337 }, () => ({ pollution: 1, clarity: 0 })),
    ...Array.from({ length: 28 }, () => ({ pollution: 0, clarity: 1 })),
  ];
  const ecology = classifyCreatureEcologyWindow(lifetime);
  assert.equal(ecology.type, "lucid");
  assert.deepEqual(ecology.window, {
    days: 28,
    pollution: 0,
    clarity: 28,
    pollutionRate: 0,
    clarityRate: 1,
  });
});
