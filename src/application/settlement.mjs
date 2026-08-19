import {
  applyCreatureEvolutionEffect,
  creatureAbilityGains,
  creatureEvent,
  creatureEvolutionEffect,
  creatureRareAbilityGain,
  dailyCreatureRecord,
  deriveCreature,
  roundCreature,
  syncCreatureAchievements,
  syncCreatureGenerations,
  syncCreatureSpecimen,
} from "../creature.mjs";
import { syncCreatureInterventions } from "../casebook.mjs";
import { syncLaboratoryCompanion } from "../companion.mjs";
import { syncCreatureIncidents } from "../incidents.mjs";
import { inclusiveDateRange, shiftDate } from "../core/date.mjs";
import { localDate, reportsForDates } from "../scanner.mjs";
import { CREATURE_BASELINE_WINDOW } from "../creature/balance.mjs";
import { deriveMetabolismSnapshot } from "../clinic.mjs";

async function settleCreatureState(
  state,
  date,
  options,
  timezone,
  reportSession = null,
  additionalScanDates = [],
) {
  const currentDate = localDate(new Date(), timezone);
  const defaultStart = shiftDate(date, -29);
  const observedDates = Object.keys(state.days);
  const latestObservedDate = observedDates
    .filter((entryDate) => entryDate < date)
    .sort()
    .at(-1);
  const startDate = state.days[date]
    ? date
    : latestObservedDate
      ? shiftDate(latestObservedDate, 1)
      : defaultStart;
  const dates = inclusiveDateRange(startDate, date);
  const scanDates = inclusiveDateRange(
    shiftDate(startDate, -CREATURE_BASELINE_WINDOW),
    date,
  );
  const requestedScanDates = [...new Set([
    ...scanDates,
    ...additionalScanDates,
  ])].sort();
  const scannedReports = reportSession
    ? await reportSession.reportsForDates(requestedScanDates)
    : await reportsForDates(options, requestedScanDates, timezone);
  const reportsByDate = new Map(
    scannedReports.map((report) => [report.date, report]),
  );

  for (const [entryDate, day] of Object.entries(state.days)) {
    if (!day.metabolism?.provisional || entryDate >= currentDate) continue;
    if (!reportsByDate.has(entryDate)) continue;
    day.metabolism = deriveMetabolismSnapshot(
      scannedReports,
      entryDate,
      currentDate,
    );
  }

  for (const report of dates.map((entryDate) => reportsByDate.get(entryDate))) {
    const sealedMetabolism = state.days[report.date]?.metabolism;
    const previousCreature = deriveCreature(state, shiftDate(report.date, -1));
    const historicalReports = Array.from(
      { length: CREATURE_BASELINE_WINDOW },
      (_, index) =>
        reportsByDate.get(
          shiftDate(report.date, index - CREATURE_BASELINE_WINDOW),
        ),
    );
    const record = dailyCreatureRecord(report, historicalReports);
    record.metabolism = sealedMetabolism ?? deriveMetabolismSnapshot(
      scannedReports,
      report.date,
      currentDate,
    );
    const evolutionEffect = creatureEvolutionEffect(
      state,
      report.date,
      record,
      previousCreature,
    );
    if (record.active) {
      const event = creatureEvent(
        state.seed,
        report.date,
        previousCreature.abilityTotals.instability,
        evolutionEffect?.triggered && evolutionEffect.category === "paradox"
          ? evolutionEffect.benefitPoints * 2
          : 0,
        record.contentVersion,
      );
      record.traits[event.trait] = roundCreature(
        record.traits[event.trait] + event.delta,
      );
      record.event = { id: event.id, rarity: event.rarity };
    } else {
      record.event = null;
    }
    record.abilityGains = creatureAbilityGains(
      state.seed,
      report.date,
      record,
      record.event,
      previousCreature.activeDays > 0,
    );
    applyCreatureEvolutionEffect(record, evolutionEffect);
    record.rareAbilityGain = creatureRareAbilityGain(
      state.seed,
      report.date,
      record.active,
      record.contentVersion,
    );
    state.days[report.date] = record;
  }

  syncCreatureAchievements(state, date);
  syncCreatureGenerations(state, date);
  let creature = deriveCreature(state, date);
  if (syncCreatureSpecimen(state, creature, date)) {
    creature = deriveCreature(state, date);
  }
  syncCreatureInterventions(state, date, creature);
  syncCreatureIncidents(state, date, creature);
  syncLaboratoryCompanion(state, date);
  return {
    state,
    creature,
    report: reportsByDate.get(date),
  };
}

export { settleCreatureState };
