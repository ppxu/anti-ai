import { createHash } from "node:crypto";

import {
  CREATURE_CLINICAL_NOTES,
  CREATURE_CONTENT_VERSION,
} from "../creature/content.mjs";
import { shiftDate } from "../core/date.mjs";
import { createProjectionContext } from "./projections.mjs";

function dominantTrait(traits) {
  return Object.keys(traits).reduce(
    (current, key) => traits[key] > traits[current] ? key : current,
    "context",
  );
}

function discoveriesBetween(codex, startDate, endDate) {
  const sections = {
    forms: "forms",
    achievements: "achievements",
    chromatics: "chromaticAbilities",
    scars: "scars",
    specimens: "specimens",
    foreignSpecimens: "foreignSpecimens",
    fossils: "fossils",
    caseSlices: "caseSlices",
    cultures: "cultures",
    companions: "companions",
    incidentReports: "incidentReports",
    expeditionArtifacts: "expeditionArtifacts",
    expeditionAchievements: "expeditionAchievements",
  };
  return Object.fromEntries(
    Object.entries(sections).map(([key, section]) => [
      key,
      codex.sections[section].filter(
        ({ discoveredAt }) =>
          discoveredAt >= startDate && discoveredAt <= endDate,
      ).length,
    ]),
  );
}

function creatureCasebook(
  state,
  startDate,
  endDate,
  projections = createProjectionContext(state),
) {
  projections ??= createProjectionContext(state);
  const before = projections.creature(shiftDate(startDate, -1));
  const after = projections.creature(endDate);
  const hatchedAt = Object.entries(state.days)
    .filter(([date, day]) => date <= endDate && day.active)
    .sort(([left], [right]) => left.localeCompare(right))
    .at(0)?.[0];
  const days = Object.entries(state.days)
    .filter(([date]) => date >= startDate && date <= endDate)
    .filter(([date]) => hatchedAt !== undefined && date >= hatchedAt)
    .sort(([left], [right]) => left.localeCompare(right));
  const symptomCounts = {
    context: 0,
    cache: 0,
    frenzy: 0,
    nuclear: 0,
    withdrawal: 0,
  };
  for (const [, day] of days) {
    const symptom = day.active ? dominantTrait(day.traits) : "withdrawal";
    symptomCounts[symptom] += 1;
  }
  const primarySymptom = hatchedAt === undefined
    ? "unhatched"
    : Object.keys(symptomCounts).reduce(
        (current, symptom) =>
          symptomCounts[symptom] > symptomCounts[current] ? symptom : current,
        "context",
      );
  const achievements = after.achievements.unlocked.filter(
    ({ unlockedAt }) => unlockedAt >= startDate && unlockedAt <= endDate,
  );
  const discoveries = discoveriesBetween(
    projections.codex(endDate),
    startDate,
    endDate,
  );
  return {
    contentVersion: days.some(([, day]) => (day.contentVersion ?? 1) >= 2)
      ? CREATURE_CONTENT_VERSION
      : 1,
    startDate,
    endDate,
    observedDays: days.length,
    activeDays: days.filter(([, day]) => day.active).length,
    quietDays: days.filter(([, day]) => !day.active).length,
    primarySymptom,
    symptomDays: symptomCounts[primarySymptom] ?? 0,
    ecology: {
      from: before.ecology.type,
      to: after.ecology.type,
      pollutionDelta: after.ecology.pollution - before.ecology.pollution,
      clarityDelta: after.ecology.clarity - before.ecology.clarity,
    },
    growth: {
      experienceDelta: after.experienceDays - before.experienceDays,
      stageFrom: before.stage,
      stageTo: after.stage,
      generationFrom: before.generation.number,
      generationTo: after.generation.number,
      fossilsSealed: after.fossils.filter(
        ({ sealedAt }) => sealedAt >= startDate && sealedAt <= endDate,
      ).length,
    },
    achievementIds: achievements.map(({ id }) => id),
    achievements,
    discoveries: {
      ...discoveries,
      total: Object.values(discoveries).reduce(
        (sum, count) => sum + count,
        0,
      ),
    },
  };
}

function creatureClinicalNote(casebook, lang = "zh", kind = "week") {
  const expandedNotes = CREATURE_CLINICAL_NOTES[casebook.primarySymptom]
    ?? CREATURE_CLINICAL_NOTES.unhatched;
  const notes = casebook.contentVersion >= 2
    ? expandedNotes
    : expandedNotes.slice(0, 6);
  const digest = createHash("sha256")
    .update(
      `${casebook.startDate}:${casebook.endDate}:${casebook.primarySymptom}:${casebook.ecology.to}:${kind}`,
    )
    .digest();
  return notes[digest.readUInt32BE(0) % notes.length][lang];
}

export { creatureCasebook, creatureClinicalNote };
