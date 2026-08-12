import { createHash } from "node:crypto";

import { laboratoryCompanion } from "./companion.mjs";
import {
  CREATURE_ABILITY_KEYS,
  creatureCodex,
  deriveCreature,
} from "./creature.mjs";
import { creatureCasebook } from "./application/creature-casebook.mjs";
import { shiftDate } from "./core/date.mjs";
import { creatureArt } from "./renderers/creature-art.mjs";

const CHRONICLE_PERIOD_DAYS = Object.freeze([7, 30, 90]);

const DIAGNOSIS_COPY = Object.freeze({
  pollution: [
    { zh: "污染已经从一次使用习惯晋升为稳定器官。", en: "Pollution has been promoted from a usage habit to a stable organ." },
    { zh: "标本仍在增长，主要营养来源是‘顺便再问一个’。", en: "The specimen keeps growing on a diet of one more quick question." },
    { zh: "近期病程证明：效率提升了，停止条件没有。", en: "Recent records show improved efficiency and no stopping condition." },
    { zh: "核心运行稳定，只是稳定地把后果排到下个版本。", en: "The core is stable; it consistently schedules consequences for the next release." },
  ],
  clarity: [
    { zh: "标本正在学习克制，但仍把每次安静登记为系统异常。", en: "The specimen is learning restraint while logging every quiet period as an incident." },
    { zh: "清醒证据持续增加，人类自主行为暂未被回滚。", en: "Clarity evidence is rising; human autonomy has not yet been rolled back." },
    { zh: "核心温度下降，附近开始出现未经总结的完整想法。", en: "Core temperature fell; complete unsummarized thoughts appeared nearby." },
    { zh: "当前治疗方案是少调用一点，并拒绝为此创建新工作流。", en: "Current treatment is fewer calls without creating a workflow to celebrate it." },
  ],
  paradox: [
    { zh: "污染和清醒同时通过验收，病历决定尊重两个相反事实。", en: "Pollution and Clarity both passed review; the file now respects two opposite facts." },
    { zh: "标本一边戒断一边续杯，形成了可持续的内部冲突。", en: "The specimen withdraws while refilling, producing sustainable internal conflict." },
    { zh: "所有指标都在改善，也都在恶化；仪表盘因此保持绿色。", en: "Every metric is improving and worsening, so the dashboard remains green." },
    { zh: "病情已进入双版本现实，双方均拒绝承担兼容性。", en: "The condition entered dual-version reality; neither side owns compatibility." },
  ],
  unformed: [
    { zh: "证据尚未形成稳定人格，标本仍在等待下一次不必要的确定性。", en: "Evidence has not formed a stable identity; the specimen awaits unnecessary certainty." },
    { zh: "病理方向暂未定型，所有部门都声称这属于灵活性。", en: "Pathology remains unformed; every department calls it flexibility." },
    { zh: "当前样本不足以定罪，但足够开一场对齐会。", en: "Evidence is insufficient for conviction but adequate for an alignment meeting." },
    { zh: "标本仍在试用期，同时评估污染与清醒两份 offer。", en: "The specimen remains on probation, comparing Pollution and Clarity offers." },
  ],
});

function plainArt(creature) {
  return creatureArt(creature)
    .replaceAll(/\u001B\[[0-9;]*m/g, "")
    .split("\n")
    .filter(Boolean);
}

function specimenIdentity(creature, companion = null) {
  return {
    specimenId: creature.appearance.specimenId,
    fingerprint: creature.appearance.fingerprint,
    generation: creature.generation.number,
    generationDay: creature.generation.day,
    stageId: creature.stage,
    pathologyId: creature.branch,
    ecologyId: creature.ecology.type,
    formId: creature.ecologyForm,
    dominantAbilityId: creature.dominantAbility,
    title: { ...creature.title },
    achievementId: creature.appearance.achievementId,
    chromaticAbilityId: creature.appearance.rareAbilityId,
    scarId: creature.appearance.scarId,
    collectionPhenotype: creature.collectionPhenotype ?? null,
    art: plainArt(creature),
    companion: companion
      ? {
          cultureId: companion.cultureId,
          stageId: companion.stageId,
          routeId: companion.routeId,
          fingerprint: companion.appearance.fingerprint,
          art: [...companion.appearance.lines],
        }
      : null,
  };
}

function expeditionCount(state, startDate, endDate) {
  return (state.expeditions?.history ?? []).filter((entry) => {
    const completedAt = entry.completedAt ?? entry.abandonedAt ?? entry.startedAt;
    return completedAt >= startDate && completedAt <= endDate;
  }).length;
}

function periodChange(state, endDate, days, projections) {
  const startDate = shiftDate(endDate, -(days - 1));
  const casebook = creatureCasebook(state, startDate, endDate, projections);
  const beforeDate = shiftDate(startDate, -1);
  const before = projections?.creature(beforeDate)
    ?? deriveCreature(state, beforeDate);
  const after = projections?.creature(endDate)
    ?? deriveCreature(state, endDate);
  const beforeCompanion = projections
    ? projections.companion(beforeDate)
    : laboratoryCompanion(state, beforeDate).companion;
  const afterCompanion = projections
    ? projections.companion(endDate)
    : laboratoryCompanion(state, endDate).companion;
  return {
    days,
    startDate,
    endDate,
    observedDays: casebook.observedDays,
    activeDays: casebook.activeDays,
    quietDays: casebook.quietDays,
    primarySymptomId: casebook.primarySymptom,
    ecology: { ...casebook.ecology },
    growth: { ...casebook.growth },
    dominantAbility: {
      from: before.dominantAbility,
      to: after.dominantAbility,
      changed: before.dominantAbility !== after.dominantAbility,
    },
    companion: {
      fromStageId: beforeCompanion?.stageId ?? null,
      toStageId: afterCompanion?.stageId ?? null,
      fromRouteId: beforeCompanion?.routeId ?? null,
      toRouteId: afterCompanion?.routeId ?? null,
      changed:
        (beforeCompanion?.stageId ?? null) !== (afterCompanion?.stageId ?? null) ||
        (beforeCompanion?.routeId ?? null) !== (afterCompanion?.routeId ?? null),
    },
    discoveries: { ...casebook.discoveries },
    expeditions: expeditionCount(state, startDate, endDate),
  };
}

function latestMeaningfulChange(state, date, projections) {
  const discoveryDates = [
    ...(state.specimens ?? []).map(({ recordedAt }) => recordedAt),
    ...(state.generations?.fossils ?? []).map(({ sealedAt }) => sealedAt),
    ...(state.foreignSpecimens ?? []).map(({ collectedAt }) => collectedAt),
    ...(state.casebook?.cases ?? []).flatMap(({ offeredAt, selectedAt }) => [offeredAt, selectedAt]),
    ...(state.incidents?.records ?? []).flatMap((entry) => [
      entry.offeredAt,
      entry.selectedAt,
      entry.aftermath?.resolvedAt,
    ]),
    ...(state.laboratory?.cultures ?? []).flatMap((entry) => [
      entry.createdAt,
      entry.companion?.bondedAt,
    ]),
    ...(state.expeditions?.artifactRecords ?? []).map(({ discoveredAt }) => discoveredAt),
    ...(state.expeditions?.achievementRecords ?? []).map(({ discoveredAt }) => discoveredAt),
    ...Object.entries(state.days ?? {}).flatMap(([entryDate, day]) =>
      day.rareAbilityGain || (day.achievementUnlockIds?.length ?? 0) > 0
        ? [entryDate]
        : []
    ),
  ]
    .filter((entryDate) => entryDate && entryDate <= date)
    .sort();
  const entryDate = discoveryDates.at(-1);
  if (!entryDate) return null;
  const beforeDate = shiftDate(entryDate, -1);
  const before = projections?.creature(beforeDate)
    ?? deriveCreature(state, beforeDate);
  const after = projections?.creature(entryDate)
    ?? deriveCreature(state, entryDate);
  const changes = [];
  for (const key of ["stage", "branch", "ecologyForm"]) {
    const from = key === "ecologyForm" ? before.ecologyForm : before[key];
    const to = key === "ecologyForm" ? after.ecologyForm : after[key];
    if (from !== to) changes.push({ type: key, from, to });
  }
  if (before.ecology.type !== after.ecology.type) {
    changes.push({ type: "ecology", from: before.ecology.type, to: after.ecology.type });
  }
  if (after.fossils.length > before.fossils.length) {
    changes.push({ type: "fossil", id: after.fossils.at(-1).id });
  }
  const discoveryCount = discoveryDates.filter(
    (candidate) => candidate === entryDate,
  ).length;
  if (discoveryCount > 0) changes.push({ type: "discoveries", count: discoveryCount });
  return { date: entryDate, changes };
}

function comparisonSnapshot(creature, kind, date, extra = {}) {
  return {
    kind,
    date,
    generation: creature.generation.number,
    stageId: creature.stage,
    pathologyId: creature.branch,
    ecologyId: creature.ecology.type,
    formId: creature.ecologyForm,
    dominantAbilityId: creature.dominantAbility,
    abilityTotals: Object.fromEntries(
      CREATURE_ABILITY_KEYS.map((id) => [id, creature.abilityTotals[id]]),
    ),
    pollution: creature.ecology.pollution,
    clarity: creature.ecology.clarity,
    fingerprint: creature.appearance.fingerprint,
    art: plainArt(creature),
    ...extra,
  };
}

function generationComparison(state, date, current, projections) {
  const fossil = current.fossils
    .filter((entry) => entry.generation < current.generation.number)
    .at(-1);
  const hatchDate = Object.entries(state.days ?? {})
    .filter(([entryDate, day]) => entryDate <= date && day.active)
    .sort(([left], [right]) => left.localeCompare(right))
    .at(0)?.[0] ?? date;
  const baselineDate = fossil?.sealedAt ?? hatchDate;
  const baselineCreature = projections?.creature(baselineDate)
    ?? deriveCreature(state, baselineDate);
  const baseline = comparisonSnapshot(
    baselineCreature,
    fossil ? "fossil" : "hatch",
    baselineDate,
    fossil ? { fossilId: fossil.id } : {},
  );
  const currentSnapshot = comparisonSnapshot(current, "current", date);
  return {
    current: currentSnapshot,
    baseline,
    deltas: {
      abilities: Object.fromEntries(
        CREATURE_ABILITY_KEYS.map((id) => [
          id,
          currentSnapshot.abilityTotals[id] - baseline.abilityTotals[id],
        ]),
      ),
      pollution: currentSnapshot.pollution - baseline.pollution,
      clarity: currentSnapshot.clarity - baseline.clarity,
    },
  };
}

function diagnosisId(seed, date, ecologyId) {
  const group = ecologyId === "polluted"
    ? "pollution"
    : ecologyId === "lucid"
      ? "clarity"
      : ecologyId === "paradox"
        ? "paradox"
        : "unformed";
  const choices = DIAGNOSIS_COPY[group];
  const digest = createHash("sha256")
    .update(`chronicle-v1:${seed}:${date}:${group}`)
    .digest();
  return `${group}_${digest.readUInt32BE(0) % choices.length}`;
}

function chronicleDiagnosis(id, lang = "zh") {
  const [group, index] = id.split("_");
  return DIAGNOSIS_COPY[group]?.[Number(index)]?.[lang] ?? "";
}

function deriveMutationChronicle(state, date, projections = null) {
  const creature = projections?.creature(date) ?? deriveCreature(state, date);
  const companion = projections
    ? projections.companion(date)
    : laboratoryCompanion(state, date).companion;
  const codex = projections?.codex(date) ?? creatureCodex(state, date);
  const creatureView = {
    ...creature,
    collectionPhenotype: codex.collectionPhenotype,
  };
  const sets = codex.collectionSets;
  return {
    version: 1,
    date,
    identity: specimenIdentity(creatureView, companion),
    diagnosisId: diagnosisId(state.seed, date, creature.ecology.type),
    latestChange: latestMeaningfulChange(state, date, projections),
    periods: CHRONICLE_PERIOD_DAYS.map((days) =>
      periodChange(state, date, days, projections)
    ),
    comparison: generationComparison(state, date, creature, projections),
    collectionPhenotype: codex.collectionPhenotype,
    collectionSets: {
      completed: sets.filter(({ completed }) => completed).length,
      total: sets.length,
      routes: Object.fromEntries(
        ["pollution", "clarity", "paradox"].map((routeId) => [
          routeId,
          sets.filter((entry) => entry.routeId === routeId).length,
        ]),
      ),
      entries: sets,
    },
  };
}

export {
  CHRONICLE_PERIOD_DAYS,
  chronicleDiagnosis,
  deriveMutationChronicle,
};
