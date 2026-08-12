import { laboratoryCompanion } from "../companion.mjs";
import { creatureCodex, deriveCreature } from "../creature.mjs";
import { shiftDate } from "../core/date.mjs";

function pathologyChanges(before, after) {
  if (before.activeDays === 0 && after.activeDays > 0) {
    return [{ type: "hatch", from: null, to: after.stage }];
  }
  const comparisons = [
    ["stage", before.stage, after.stage],
    ["branch", before.branch, after.branch],
    ["ecology", before.ecology.type, after.ecology.type],
    ["form", before.ecologyForm, after.ecologyForm],
  ];
  return comparisons
    .filter(([, from, to]) => from !== to)
    .map(([type, from, to]) => ({ type, from, to }));
}

function incidentChanges(state, date) {
  const changes = [];
  for (const incident of state.incidents?.records ?? []) {
    if (incident.offeredAt === date) {
      changes.push({ type: "opened", id: incident.id, incidentId: incident.incidentId });
    }
    if (incident.selectedAt === date) {
      changes.push({ type: "responded", id: incident.id, incidentId: incident.incidentId });
    }
    if (incident.aftermath?.resolvedAt === date) {
      changes.push({ type: "resolved", id: incident.id, incidentId: incident.incidentId });
    }
  }
  return changes;
}

function laboratoryChanges(state, date) {
  const changes = [];
  for (const culture of state.laboratory?.cultures ?? []) {
    if (culture.createdAt === date) {
      changes.push({ type: "culture", id: culture.id, typeId: culture.typeId });
    }
    if (culture.companion?.bondedAt === date) {
      changes.push({ type: "bond", id: culture.id, typeId: culture.typeId });
    }
  }
  return changes;
}

function caseChanges(state, date) {
  return (state.casebook?.cases ?? []).flatMap((entry) => [
    ...(entry.offeredAt === date
      ? [{ type: "offered", id: entry.id, caseId: entry.caseId }]
      : []),
    ...(entry.selectedAt === date
      ? [{ type: "selected", id: entry.id, caseId: entry.caseId }]
      : []),
  ]);
}

function archiveDay(state, date, projections = null) {
  const day = state.days?.[date];
  if (!day) return null;
  const beforeDate = shiftDate(date, -1);
  const before = projections?.creature(beforeDate)
    ?? deriveCreature(state, beforeDate);
  const after = projections?.creature(date) ?? deriveCreature(state, date);
  const companion = projections
    ? projections.companion(date)
    : laboratoryCompanion(state, date).companion;
  return {
    date,
    status: day.active ? "active" : "quiet",
    usageBand: day.usageBand,
    balanceVersion: day.balanceVersion ?? 1,
    ecologyGains: { ...(day.ecologyGains ?? { pollution: 0, clarity: 0 }) },
    pathologyChanges: pathologyChanges(before, after),
    discoveries: (projections?.codex(date) ?? creatureCodex(state, date)).recent,
    mutationEvent: day.event ? { ...day.event } : null,
    achievementUnlockIds: [...(day.achievementUnlockIds ?? [])],
    incidentChanges: incidentChanges(state, date),
    caseChanges: caseChanges(state, date),
    laboratoryChanges: laboratoryChanges(state, date),
    companion: companion
      ? {
          cultureId: companion.cultureId,
          stageId: companion.stageId,
          routeId: companion.routeId,
          todayImprint: companion.todayImprint,
        }
      : null,
    interactions: Object.keys(day.interactions ?? {}),
  };
}

function containmentArchive(state, date, limit = 30, projections = null) {
  const settledDates = Object.keys(state.days ?? {})
    .filter((entryDate) => entryDate <= date)
    .sort();
  const hatchedAt = settledDates.find(
    (entryDate) => state.days[entryDate]?.active,
  );
  const dates = settledDates
    .filter((entryDate) => hatchedAt && entryDate >= hatchedAt)
    .slice(-limit)
    .reverse();
  return dates.map((entryDate) => archiveDay(state, entryDate, projections));
}

function nextContainmentMilestone(creature) {
  if (creature.activeDays === 0) {
    return { type: "hatch", remainingDays: 1, target: null };
  }
  if (creature.nextStageAt !== null) {
    return {
      type: "stage",
      remainingDays: Math.max(0, creature.nextStageAt - creature.experienceDays),
      target: creature.nextStageAt,
    };
  }
  return {
    type: "generation",
    remainingDays: Math.max(
      0,
      creature.generation.length - creature.generation.day,
    ),
    target: creature.generation.number + 1,
  };
}

function containmentBrief(state, date, projections = null) {
  const creature = projections?.creature(date) ?? deriveCreature(state, date);
  return {
    day: archiveDay(state, date, projections),
    nextMilestone: nextContainmentMilestone(creature),
  };
}

export { archiveDay, containmentArchive, containmentBrief };
