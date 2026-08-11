import { chronicleDiagnosis } from "../chronicle.mjs";
import {
  presentCollectionSet,
} from "../collection-sets.mjs";
import { collectionPhenotypeCopy } from "../collection-phenotype.mjs";
import { companionLabel } from "../companion.mjs";
import { creatureLabel, creatureTitle } from "../creature.mjs";
import { localized } from "../shared.mjs";

function signed(value) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function latestChangeLabel(change, lang) {
  if (!change) {
    return localized(lang, "尚无结构性变化", "No structural change yet");
  }
  const labels = change.changes.map((entry) => {
    if (entry.type === "stage") {
      return `${localized(lang, "阶段", "stage")} ${creatureLabel("stages", entry.from, lang)} → ${creatureLabel("stages", entry.to, lang)}`;
    }
    if (entry.type === "branch") {
      return `${localized(lang, "病理", "pathology")} ${creatureLabel("branches", entry.from, lang)} → ${creatureLabel("branches", entry.to, lang)}`;
    }
    if (entry.type === "ecology") {
      return `${localized(lang, "生态", "ecology")} ${creatureLabel("ecologies", entry.from, lang)} → ${creatureLabel("ecologies", entry.to, lang)}`;
    }
    if (entry.type === "ecologyForm") {
      return `${localized(lang, "形态", "form")} ${creatureLabel("ecologyForms", entry.from, lang)} → ${creatureLabel("ecologyForms", entry.to, lang)}`;
    }
    if (entry.type === "fossil") {
      return localized(lang, `永久化石 #${entry.id} 已封存`, `permanent fossil #${entry.id} sealed`);
    }
    return localized(lang, `新增 ${entry.count} 项收藏`, `${entry.count} new discovery record(s)`);
  });
  return `${change.date} · ${labels.slice(0, 2).join(" · ")}`;
}

function periodPresentation(period, lang) {
  return {
    ...period,
    symptomLabel: period.primarySymptomId === "withdrawal"
      ? creatureLabel("abilities", "withdrawal", lang)
      : period.primarySymptomId === "unhatched"
        ? localized(lang, "尚未孵化", "UNHATCHED")
        : creatureLabel("branches", period.primarySymptomId, lang),
    ecologyFromLabel: creatureLabel("ecologies", period.ecology.from, lang),
    ecologyToLabel: creatureLabel("ecologies", period.ecology.to, lang),
    summary: localized(
      lang,
      `活跃 ${period.activeDays} · 清醒 ${period.quietDays} · 污染 ${signed(period.ecology.pollutionDelta)} / 清醒 ${signed(period.ecology.clarityDelta)} · 新入库 ${period.discoveries.total}`,
      `active ${period.activeDays} · AI-free ${period.quietDays} · pollution ${signed(period.ecology.pollutionDelta)} / clarity ${signed(period.ecology.clarityDelta)} · ${period.discoveries.total} new`,
    ),
  };
}

function comparisonPresentation(comparison, lang) {
  const baseline = comparison.baseline;
  const current = comparison.current;
  return {
    ...comparison,
    baseline: {
      ...baseline,
      label: baseline.kind === "fossil"
        ? localized(lang, `第 ${baseline.generation} 代化石`, `GENERATION ${baseline.generation} FOSSIL`)
        : localized(lang, "孵化起点", "HATCH BASELINE"),
      ecologyLabel: creatureLabel("ecologies", baseline.ecologyId, lang),
      pathologyLabel: creatureLabel("branches", baseline.pathologyId, lang),
      abilityLabel: creatureLabel("abilities", baseline.dominantAbilityId, lang),
    },
    current: {
      ...current,
      label: localized(lang, `当前第 ${current.generation} 代`, `CURRENT GENERATION ${current.generation}`),
      ecologyLabel: creatureLabel("ecologies", current.ecologyId, lang),
      pathologyLabel: creatureLabel("branches", current.pathologyId, lang),
      abilityLabel: creatureLabel("abilities", current.dominantAbilityId, lang),
    },
    summary: localized(
      lang,
      `${creatureLabel("ecologies", baseline.ecologyId, lang)} → ${creatureLabel("ecologies", current.ecologyId, lang)} · 主导能力 ${creatureLabel("abilities", baseline.dominantAbilityId, lang)} → ${creatureLabel("abilities", current.dominantAbilityId, lang)} · 污染 ${signed(comparison.deltas.pollution)} / 清醒 ${signed(comparison.deltas.clarity)}`,
      `${creatureLabel("ecologies", baseline.ecologyId, lang)} → ${creatureLabel("ecologies", current.ecologyId, lang)} · dominant ${creatureLabel("abilities", baseline.dominantAbilityId, lang)} → ${creatureLabel("abilities", current.dominantAbilityId, lang)} · pollution ${signed(comparison.deltas.pollution)} / clarity ${signed(comparison.deltas.clarity)}`,
    ),
  };
}

function setPresentation(entry, lang) {
  return presentCollectionSet(entry, lang);
}

function presentMutationChronicle(chronicle, lang = "zh") {
  const identity = chronicle.identity;
  const creatureForTitle = { title: identity.title };
  return {
    ...chronicle,
    identity: {
      ...identity,
      title: creatureTitle(creatureForTitle, lang),
      stageLabel: creatureLabel("stages", identity.stageId, lang),
      pathologyLabel: creatureLabel("branches", identity.pathologyId, lang),
      ecologyLabel: creatureLabel("ecologies", identity.ecologyId, lang),
      formLabel: creatureLabel("ecologyForms", identity.formId, lang),
      abilityLabel: creatureLabel("abilities", identity.dominantAbilityId, lang),
      companion: identity.companion
        ? {
            ...identity.companion,
            stageLabel: companionLabel("stages", identity.companion.stageId, lang),
            routeLabel: companionLabel("routes", identity.companion.routeId, lang),
          }
        : null,
    },
    diagnosis: chronicleDiagnosis(chronicle.diagnosisId, lang),
    collectionPhenotype: {
      ...chronicle.collectionPhenotype,
      copy: collectionPhenotypeCopy(chronicle.collectionPhenotype, lang),
    },
    latestChangeLabel: latestChangeLabel(chronicle.latestChange, lang),
    periods: chronicle.periods.map((period) => periodPresentation(period, lang)),
    comparison: comparisonPresentation(chronicle.comparison, lang),
    collectionSets: {
      ...chronicle.collectionSets,
      entries: chronicle.collectionSets.entries.map((entry) =>
        setPresentation(entry, lang)
      ),
    },
  };
}

function renderMutationChronicle(chronicle, lang = "zh") {
  const view = presentMutationChronicle(chronicle, lang);
  const setLines = [
    ["pollution", localized(lang, "污染", "POLLUTION")],
    ["clarity", localized(lang, "清醒", "CLARITY")],
    ["paradox", localized(lang, "悖论", "PARADOX")],
  ].map(([routeId, routeLabel]) => {
    const routeSets = view.collectionSets.entries.filter(
      (entry) => entry.routeId === routeId,
    );
    const focus = routeSets
      .filter((entry) => !entry.completed && entry.revealed)
      .sort((left, right) => right.progress.percent - left.progress.percent)[0]
      ?? routeSets.find((entry) => !entry.completed)
      ?? routeSets.at(-1);
    return `  ${routeLabel} ${routeSets.filter((entry) => entry.completed).length}/4 · ${focus.name} ${focus.progress.completed}/${focus.progress.total}`;
  });
  return [
    localized(lang, `异变年鉴 · ${view.date}`, `MUTATION CHRONICLE · ${view.date}`),
    localized(lang, "7 天 · 30 天 · 90 天", "7 DAYS · 30 DAYS · 90 DAYS"),
    "",
    `${localized(lang, "当前标本", "CURRENT SPECIMEN")}  #${view.identity.specimenId} · ${view.identity.title}`,
    `${localized(lang, "阶段 / 生态", "STAGE / ECOLOGY")}  ${view.identity.stageLabel} · ${view.identity.ecologyLabel}`,
    `${localized(lang, "病理 / 主导", "PATHOLOGY / DOMINANT")}  ${view.identity.pathologyLabel} · ${view.identity.abilityLabel}`,
    `${localized(lang, "伴生", "COMPANION")}  ${view.identity.companion ? `${view.identity.companion.stageLabel} · ${view.identity.companion.routeLabel}` : localized(lang, "未绑定", "UNBONDED")}`,
    `${localized(lang, "馆藏异变", "COLLECTION MUTATION")}  ${view.collectionPhenotype.copy ? `${view.collectionPhenotype.copy.name} · ${localized(lang, `阶段 ${view.collectionPhenotype.tier}`, `TIER ${view.collectionPhenotype.tier}`)}` : localized(lang, "尚未诱发", "NOT YET INDUCED")}`,
    "",
    `${localized(lang, "诊断", "DIAGNOSIS")}  ${view.diagnosis}`,
    `${localized(lang, "最近变化", "LATEST CHANGE")}  ${view.latestChangeLabel}`,
    "",
    localized(lang, "周期变化", "PERIOD CHANGES"),
    ...view.periods.map((period) =>
      `  ${String(period.days).padStart(2, " ")} ${localized(lang, "天", "DAYS")}  ${period.summary}`
    ),
    "",
    localized(lang, "世代对照", "GENERATION COMPARISON"),
    `  ${view.comparison.baseline.label} → ${view.comparison.current.label}`,
    `  ${view.comparison.summary}`,
    "",
    `${localized(lang, "病理星图", "PATHOLOGY CONSTELLATIONS")}  ${view.collectionSets.completed}/${view.collectionSets.total}`,
    ...setLines,
    `  ${localized(lang, "查看星图", "CONSTELLATION")}  anti-ai codex --set <set-id>`,
    "",
    localized(
      lang,
      "只读年鉴：套组仅解锁标题、印章和展示语料，不增加数值、次数或成长速度。",
      "READ-ONLY CHRONICLE: sets unlock presentation only—never stats, attempts, or growth speed.",
    ),
    "",
  ].join("\n");
}

export {
  presentMutationChronicle,
  renderMutationChronicle,
};
