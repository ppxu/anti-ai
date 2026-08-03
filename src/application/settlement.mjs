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
import { inclusiveDateRange, shiftDate } from "../reporting.mjs";
import { reportsForDates } from "../scanner.mjs";

async function settleCreatureState(state, date, options, timezone) {
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
  const scanDates = inclusiveDateRange(shiftDate(startDate, -7), date);
  const scannedReports = await reportsForDates(options, scanDates, timezone);
  const reportsByDate = new Map(
    scannedReports.map((report) => [report.date, report]),
  );

  for (const report of dates.map((entryDate) => reportsByDate.get(entryDate))) {
    const previousCreature = deriveCreature(state, shiftDate(report.date, -1));
    const historicalReports = Array.from({ length: 7 }, (_, index) =>
      reportsByDate.get(shiftDate(report.date, index - 7)),
    );
    const record = dailyCreatureRecord(report, historicalReports);
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
  syncLaboratoryCompanion(state, date);
  return {
    state,
    creature,
    report: reportsByDate.get(date),
  };
}

export { settleCreatureState };
