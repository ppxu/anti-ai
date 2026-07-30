import { casebookLabel } from "../casebook.mjs";
import { companionLabel } from "../companion.mjs";
import {
  CREATURE_RARE_ABILITY_RANKS,
  creatureClinicalNote,
  creatureLabel,
} from "../creature.mjs";
import { encounterLabel } from "../encounter.mjs";
import { laboratoryLabel } from "../laboratory.mjs";
import { color, formatTokens } from "../reporting.mjs";
import { localized } from "../shared.mjs";

const ACHIEVEMENT_CATEGORY_COLORS = {
  offense: "1;31",
  sobriety: "1;36",
  paradox: "1;33",
};
const CODEX_RARITY_COLORS = {
  common: "37",
  uncommon: "36",
  rare: "35",
  epic: CREATURE_RARE_ABILITY_RANKS.epic.color,
  mythic: CREATURE_RARE_ABILITY_RANKS.mythic.color,
};

function achievementLabel(achievement, lang) {
  const tierProgress =
    achievement.maxTier > 1
      ? ` [${creatureLabel(
          "achievementTiers",
          `${achievement.category}_${achievement.tier}`,
          lang,
        )} ${
          achievement.nextTierAt === null
            ? "MAX"
            : `${achievement.progress}/${achievement.nextTierAt}`
        }]`
      : "";
  return color(
    ACHIEVEMENT_CATEGORY_COLORS[achievement.category],
    `${creatureLabel("achievements", achievement.id, lang)}${tierProgress}`,
  );
}

function generationLabel(generation, lang) {
  return lang === "zh" ? `第 ${generation} 代` : `GEN ${generation}`;
}

function renderEvolutionOptions(evolution, lang) {
  return evolution.options.flatMap((option) => [
    `  ${option.slot}. [${creatureLabel("evolutionCategories", option.category, lang)}] ${creatureLabel("evolutions", option.id, lang)} · ${creatureLabel("abilities", option.abilityId, lang)} · ${localized(lang, "触发", "PROC")} ${option.procChancePercent}%`,
    `     ${localized(lang, "收益", "BENEFIT")} ${creatureLabel("evolutionBenefits", option.benefitId, lang)} +${option.benefitPoints} · ${localized(lang, "代价", "COST")} ${creatureLabel("evolutionCosts", option.costId, lang)} +${option.costPoints}`,
  ]);
}

function renderCreatureTodaySummary(creature, codex, lang) {
  const gains = [
    creature.today.ecologyGains.pollution > 0
      ? `${localized(lang, "污染性", "pollution")} +${creature.today.ecologyGains.pollution}`
      : null,
    creature.today.ecologyGains.clarity > 0
      ? `${localized(lang, "清醒性", "clarity")} +${creature.today.ecologyGains.clarity}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const achievements = creature.achievements.recent
    .map((achievement) => achievementLabel(achievement, lang))
    .join(" · ");
  const form = creatureLabel("ecologyForms", creature.ecologyForm, lang);
  const fossil = creature.fossils.find(
    (candidate) => candidate.sealedAt === creature.date,
  );
  const milestones = [
    fossil
      ? localized(
          lang,
          `永久化石 #${fossil.id} 已封存`,
          `permanent fossil #${fossil.id} sealed`,
        )
      : null,
    creature.evolution?.status === "pending"
      ? localized(
          lang,
          `第 ${creature.evolution.generation} 代进化待选择（anti-ai creature evolve）`,
          `generation ${creature.evolution.generation} evolution pending (anti-ai creature evolve)`,
        )
      : null,
  ].filter(Boolean);
  const discoveries = codex.recent
    .map((discovery) => codexDiscoveryLabel(discovery, lang))
    .join(" · ");
  const companionImprint = {
    pollution: localized(lang, "污染印记", "pollution imprint"),
    clarity: localized(lang, "清醒印记", "clarity imprint"),
    neutral: localized(lang, "常态印记", "neutral imprint"),
  }[creature.companion?.todayImprint];
  return [
    `  ${color("33", localized(lang, "今日异变体", "TODAY'S MUTATION FILE"))}`,
    `  ${localized(lang, "生态切片", "ECOLOGY SLICE")}  ${gains || localized(lang, "惯常波动", "habitual drift")} · ${localized(lang, `仍为「${form}」`, `still “${form}”`)}`,
    `  ${localized(lang, "今日成就", "TODAY'S ACHIEVEMENTS")}  ${achievements || localized(lang, "无", "none")}${milestones.length > 0 ? ` · ${milestones.join(" · ")}` : ""}`,
    ...(codex.recent.length > 0
      ? [
          `  ${localized(lang, "图鉴入库", "CODEX INTAKE")}  +${codex.recent.length} · ${discoveries}`,
        ]
      : []),
    ...(creature.companion
      ? [
          `  ${localized(lang, "伴生观察", "COMPANION WATCH")}  ${companionImprint ?? localized(lang, "今日尚无印记", "no imprint today")} · ${companionLabel("stages", creature.companion.stageId, lang)} · ${companionLabel("routes", creature.companion.routeId, lang)}`,
        ]
      : []),
    `  ${localized(lang, "查看完整档案", "FULL FILE")}  anti-ai creature`,
    `  ${localized(lang, "查看图鉴", "CODEX")}      anti-ai codex`,
    "",
  ].join("\n");
}

function renderCompanionPeriod(period, lang) {
  if (period === null) return "";
  return [
    `  ${localized(lang, "伴生病程", "COMPANION COURSE")}  ${localized(lang, `${period.imprintCounts.total} 个印记`, `${period.imprintCounts.total} IMPRINTS`)} · ${companionLabel("stages", period.stageFrom, lang)} → ${companionLabel("stages", period.stageTo, lang)} · ${companionLabel("routes", period.routeTo, lang)}`,
    `  ${localized(lang, "印记构成", "IMPRINT MIX")}  ${localized(lang, `污染 ${period.imprintCounts.pollution} · 清醒 ${period.imprintCounts.clarity} · 常态 ${period.imprintCounts.neutral}`, `pollution ${period.imprintCounts.pollution} · clarity ${period.imprintCounts.clarity} · neutral ${period.imprintCounts.neutral}`)}${period.anomaliesSealed > 0 ? localized(lang, ` · 新异常 ${period.anomaliesSealed}`, ` · NEW ANOMALIES ${period.anomaliesSealed}`) : ""}`,
    "",
  ].join("\n");
}

function renderCreatureCasebook(casebook, lang) {
  const achievements = casebook.achievements
    .map((achievement) =>
      color(
        ACHIEVEMENT_CATEGORY_COLORS[achievement.category],
        creatureLabel("achievements", achievement.id, lang),
      ),
    )
    .join(" · ");
  return [
    `  ${color("33", localized(
      lang,
      `异变体周报 · ${casebook.startDate.slice(5)} → ${casebook.endDate.slice(5)}`,
      `MUTATION WEEKLY · ${casebook.startDate.slice(5)} → ${casebook.endDate.slice(5)}`,
    ))}`,
    `  ${localized(lang, "本周主症状", "PRIMARY SYMPTOM")}  ${creatureLabel("clinicalSymptoms", casebook.primarySymptom, lang)} · ${casebook.symptomDays} ${localized(lang, "天", casebook.symptomDays === 1 ? "day" : "days")}`,
    `  ${localized(lang, "生态变化", "ECOLOGY CHANGE")}  ${localized(lang, `污染 +${casebook.ecology.pollutionDelta} · 清醒 +${casebook.ecology.clarityDelta}`, `pollution +${casebook.ecology.pollutionDelta} · clarity +${casebook.ecology.clarityDelta}`)}`,
    `  ${localized(lang, "成长记录", "GROWTH RECORD")}  ${localized(lang, `阅历 +${casebook.growth.experienceDelta}`, `experience +${casebook.growth.experienceDelta}`)} · ${creatureLabel("stages", casebook.growth.stageFrom, lang)} → ${creatureLabel("stages", casebook.growth.stageTo, lang)}`,
    `  ${localized(lang, "世代", "GENERATION")}  ${generationLabel(casebook.growth.generationFrom, lang)} → ${generationLabel(casebook.growth.generationTo, lang)} · ${localized(lang, "永久化石", "PERMANENT FOSSILS")} +${casebook.growth.fossilsSealed}`,
    `  ${localized(lang, "新增徽章", "NEW BADGES")}  ${achievements || localized(lang, "无", "NONE")}`,
    `  ${localized(lang, "新增收藏", "NEW COLLECTIONS")}  ${casebook.discoveries.total} · ${localized(lang, `形态 ${casebook.discoveries.forms} · 成就 ${casebook.discoveries.achievements} · 异色 ${casebook.discoveries.chromatics} · 伤痕 ${casebook.discoveries.scars} · 标本 ${casebook.discoveries.specimens} · 外来 ${casebook.discoveries.foreignSpecimens} · 化石 ${casebook.discoveries.fossils} · 病例 ${casebook.discoveries.caseSlices} · 培养 ${casebook.discoveries.cultures} · 伴生 ${casebook.discoveries.companions}`, `forms ${casebook.discoveries.forms} · achievements ${casebook.discoveries.achievements} · chromatics ${casebook.discoveries.chromatics} · scars ${casebook.discoveries.scars} · specimens ${casebook.discoveries.specimens} · foreign ${casebook.discoveries.foreignSpecimens} · fossils ${casebook.discoveries.fossils} · cases ${casebook.discoveries.caseSlices} · cultures ${casebook.discoveries.cultures} · companions ${casebook.discoveries.companions}`)}`,
    `  ${localized(lang, "主治意见", "ATTENDING NOTE")}  ${creatureClinicalNote(casebook, lang, "week")}`,
    `  ${localized(lang, "查看完整档案", "FULL FILE")}  anti-ai creature`,
    `  ${localized(lang, "查看图鉴", "CODEX")}      anti-ai codex`,
    "",
  ].join("\n");
}

function renderCreatureAutopsy(casebook, lang) {
  const achievements = casebook.achievements
    .map((achievement) =>
      color(
        ACHIEVEMENT_CATEGORY_COLORS[achievement.category],
        creatureLabel("achievements", achievement.id, lang),
      ),
    )
    .join(" · ");
  const dayUnit = (count) =>
    localized(lang, `${count} 天`, `${count} ${count === 1 ? "day" : "days"}`);
  return [
    `  ${color("33", localized(
      lang,
      `月度复诊 · ${casebook.endDate.slice(0, 7)}`,
      `MONTHLY FOLLOW-UP · ${casebook.endDate.slice(0, 7)}`,
    ))}`,
    `  ${localized(lang, "有效观察", "VALID OBSERVATION")}  ${dayUnit(casebook.observedDays)} · ${localized(lang, `${casebook.activeDays} 天活跃`, `${casebook.activeDays} active`)} · ${localized(lang, `${casebook.quietDays} 天清醒`, `${casebook.quietDays} AI-free`)}`,
    `  ${localized(lang, "主症状", "PRIMARY SYMPTOM")}  ${creatureLabel("clinicalSymptoms", casebook.primarySymptom, lang)} · ${dayUnit(casebook.symptomDays)}`,
    `  ${localized(lang, "生态人格", "ECOLOGY")}  ${creatureLabel("ecologies", casebook.ecology.from, lang)} → ${creatureLabel("ecologies", casebook.ecology.to, lang)} · ${localized(lang, `污染 +${casebook.ecology.pollutionDelta} · 清醒 +${casebook.ecology.clarityDelta}`, `pollution +${casebook.ecology.pollutionDelta} · clarity +${casebook.ecology.clarityDelta}`)}`,
    `  ${localized(lang, "成长回顾", "GROWTH REVIEW")}  ${localized(lang, `阅历 +${casebook.growth.experienceDelta}`, `experience +${casebook.growth.experienceDelta}`)} · ${creatureLabel("stages", casebook.growth.stageFrom, lang)} → ${creatureLabel("stages", casebook.growth.stageTo, lang)}`,
    `  ${localized(lang, "世代", "GENERATION")}  ${generationLabel(casebook.growth.generationFrom, lang)} → ${generationLabel(casebook.growth.generationTo, lang)} · ${localized(lang, "永久化石", "PERMANENT FOSSILS")} +${casebook.growth.fossilsSealed}`,
    `  ${localized(lang, "成就回顾", "ACHIEVEMENT REVIEW")}  [${casebook.achievementIds.length}] ${achievements || localized(lang, "无", "NONE")}`,
    `  ${localized(lang, "新增收藏", "NEW COLLECTIONS")}  ${casebook.discoveries.total} · ${localized(lang, `形态 ${casebook.discoveries.forms} · 成就 ${casebook.discoveries.achievements} · 异色 ${casebook.discoveries.chromatics} · 伤痕 ${casebook.discoveries.scars} · 标本 ${casebook.discoveries.specimens} · 外来 ${casebook.discoveries.foreignSpecimens} · 化石 ${casebook.discoveries.fossils} · 病例 ${casebook.discoveries.caseSlices} · 培养 ${casebook.discoveries.cultures} · 伴生 ${casebook.discoveries.companions}`, `forms ${casebook.discoveries.forms} · achievements ${casebook.discoveries.achievements} · chromatics ${casebook.discoveries.chromatics} · scars ${casebook.discoveries.scars} · specimens ${casebook.discoveries.specimens} · foreign ${casebook.discoveries.foreignSpecimens} · fossils ${casebook.discoveries.fossils} · cases ${casebook.discoveries.caseSlices} · cultures ${casebook.discoveries.cultures} · companions ${casebook.discoveries.companions}`)}`,
    `  ${localized(lang, "复诊意见", "FOLLOW-UP NOTE")}  ${creatureClinicalNote(casebook, lang, "month")}`,
    `  ${localized(lang, "查看完整档案", "FULL FILE")}  anti-ai creature`,
    `  ${localized(lang, "查看图鉴", "CODEX")}      anti-ai codex`,
    "",
  ].join("\n");
}

function codexDiscoveryLabel(discovery, lang) {
  if (discovery.type === "form") {
    return creatureLabel("ecologyForms", discovery.id, lang);
  }
  if (discovery.type === "achievement") {
    return creatureLabel("achievements", discovery.id, lang);
  }
  if (discovery.type === "chromaticAbility") {
    return creatureLabel("rareAbilities", discovery.id, lang);
  }
  if (discovery.type === "scar") {
    return creatureLabel("scars", discovery.id, lang);
  }
  if (discovery.type === "specimen") {
    return localized(
      lang,
      `动态标本 #${discovery.id}`,
      `DYNAMIC SPECIMEN #${discovery.id}`,
    );
  }
  if (discovery.type === "foreignSpecimen") {
    return localized(
      lang,
      `外来标本 #${discovery.id}`,
      `FOREIGN SPECIMEN #${discovery.id}`,
    );
  }
  if (discovery.type === "caseSlice") {
    return localized(
      lang,
      `病例切片 #${discovery.id}`,
      `CASE SLICE #${discovery.id}`,
    );
  }
  if (discovery.type === "culture") {
    return localized(
      lang,
      `污染培养物 #${discovery.id}`,
      `POLLUTION CULTURE #${discovery.id}`,
    );
  }
  if (discovery.type === "companion") {
    return localized(
      lang,
      `伴生异物 #${discovery.id}`,
      `SYMBIOTIC COMPANION #${discovery.id}`,
    );
  }
  return localized(
    lang,
    `永久化石 #${discovery.id}`,
    `PERMANENT FOSSIL #${discovery.id}`,
  );
}

function renderCodex(codex, lang) {
  const fixedSection = (
    title,
    entries,
    label,
    lineColor = (entry) => CODEX_RARITY_COLORS[entry.rarity],
  ) => {
    const discovered = entries.filter((entry) => entry.discovered);
    const locked = entries.length - discovered.length;
    return [
      `${title}  [${discovered.length} / ${entries.length}]`,
      ...discovered.map((entry) => {
        const line = `✓ ${label(entry)}`;
        const colorCode = lineColor?.(entry);
        return `  ${colorCode ? color(colorCode, line) : line}`;
      }),
      ...(locked > 0 ? [`  ? ??? × ${locked}`] : []),
      "",
    ];
  };
  const specimenLines = codex.sections.specimens.slice(-5).map(
    (specimen) =>
      `  #${specimen.id} · ${creatureLabel("ecologyForms", specimen.formId, lang)} · ${specimen.discoveredAt}`,
  );
  const fossilLines = codex.sections.fossils.slice(-5).map(
    (fossil) =>
      `  #${fossil.id} · ${generationLabel(fossil.generation, lang)} · ${creatureLabel("scars", fossil.scarId, lang)} · ${fossil.discoveredAt}`,
  );
  const foreignSpecimenLines = codex.sections.foreignSpecimens
    .slice(-5)
    .map(
      (specimen) =>
        `  #${specimen.id} · ${creatureLabel("ecologyForms", specimen.localFormId, lang)} × ${creatureLabel("ecologyForms", specimen.visitorFormId, lang)} · ${encounterLabel("type", specimen.typeId, lang)} · ${specimen.discoveredAt}`,
    );
  const caseSliceLines = codex.sections.caseSlices.slice(-5).map(
    (entry) =>
      `  #${entry.id} · ${casebookLabel("cases", entry.caseId, lang)} · ${casebookLabel("routes", entry.routeId, lang)} · ${casebookLabel("marks", entry.markId, lang)} · ${entry.discoveredAt}`,
  );
  const cultureLines = codex.sections.cultures.slice(-5).map(
    (entry) =>
      `  ${color(CODEX_RARITY_COLORS[entry.rarity], `#${entry.id} · ${laboratoryLabel("types", entry.typeId, lang)} · ${entry.rarity.toUpperCase()}`)} · ${entry.discoveredAt}`,
  );
  const companionLines = codex.sections.companions.slice(-5).map(
    (entry) =>
      `  ${color(
        {
          pollution: "1;31",
          clarity: "1;36",
          paradox: "1;33",
          unformed: "2",
        }[entry.routeId],
        `#${entry.id} · ${companionLabel("stages", entry.stageId, lang)} · ${companionLabel("routes", entry.routeId, lang)} · ${localized(lang, "异常", "ANOMALIES")} ${entry.anomalyIds.length}`,
      )} · ${entry.discoveredAt}`,
  );
  const recentLines = codex.recent.map(
    (discovery) =>
      `  + ${codexDiscoveryLabel(discovery, lang)}`,
  );

  return [
    color("2", "┌────────────────────────────────────────────────────────┐"),
    `  ${color("1;35", localized(lang, `病理图鉴 · ${codex.date}`, `PATHOLOGY CODEX · ${codex.date}`))}`,
    color("2", "├────────────────────────────────────────────────────────┤"),
    `  ${localized(lang, "标本编号", "SPECIMEN ID")}  ${codex.specimenId}`,
    `  ${localized(lang, "理论物种容量", "THEORETICAL SPECIES CAPACITY")}  ${formatTokens(codex.capacity.finalAsciiForms)} · ${localized(lang, "去重后的最终 ASCII 形象", "DEDUPLICATED FINAL ASCII FORMS")}`,
    `  ${localized(lang, "固定收藏", "FIXED COLLECTION")}  ${codex.summary.fixed.discovered} / ${codex.summary.fixed.total} · ${codex.summary.fixed.percent}%`,
    "",
    ...fixedSection(
      localized(lang, "形态家族", "FORM FAMILIES"),
      codex.sections.forms,
      (entry) =>
        `${creatureLabel("ecologyForms", entry.id, lang)} · ${creatureLabel("ecologies", entry.ecologyId, lang)} / ${creatureLabel("branches", entry.pathologyId, lang)}`,
    ),
    ...fixedSection(
      localized(lang, "成就徽章", "ACHIEVEMENT BADGES"),
      codex.sections.achievements,
      (entry) =>
        `${color(
          ACHIEVEMENT_CATEGORY_COLORS[entry.category],
          `${creatureLabel("achievements", entry.id, lang)} · ${entry.category.toUpperCase()}`,
        )} / ${color(
          CODEX_RARITY_COLORS[entry.rarity],
          entry.rarity.toUpperCase(),
        )}`,
      null,
    ),
    ...fixedSection(
      localized(lang, "异色能力", "CHROMATIC ABILITIES"),
      codex.sections.chromaticAbilities,
      (entry) =>
        `[${CREATURE_RARE_ABILITY_RANKS[entry.rarity].badge}] ${creatureLabel("rareAbilities", entry.id, lang)} · Lv.${entry.level}`,
      (entry) => CREATURE_RARE_ABILITY_RANKS[entry.rarity].color,
    ),
    ...fixedSection(
      localized(lang, "世代伤痕", "GENERATION SCARS"),
      codex.sections.scars,
      (entry) => creatureLabel("scars", entry.id, lang),
    ),
    `${localized(lang, "动态标本", "DYNAMIC SPECIMENS")}  [${codex.summary.specimens.discovered}]`,
    ...(specimenLines.length > 0
      ? specimenLines
      : [`  ${localized(lang, "尚无", "NONE")}`]),
    "",
    `${localized(lang, "外来标本", "FOREIGN SPECIMENS")}  [${codex.summary.foreignSpecimens.discovered}]`,
    ...(foreignSpecimenLines.length > 0
      ? foreignSpecimenLines
      : [`  ${localized(lang, "尚无 · 暂未发生跨机器排异。", "NONE · no cross-machine rejection yet.")}`]),
    "",
    `${localized(lang, "病例切片", "CASE SLICES")}  [${codex.summary.caseSlices.discovered}]`,
    ...(caseSliceLines.length > 0
      ? caseSliceLines
      : [
          `  ${localized(lang, "尚无 · 它还没有接受任何不可靠治疗。", "NONE · no unreliable treatment has been accepted yet.")}`,
        ]),
    "",
    `${localized(lang, "污染培养物", "POLLUTION CULTURES")}  [${codex.summary.cultures.discovered}]`,
    ...(cultureLines.length > 0
      ? cultureLines
      : [
          `  ${localized(lang, "尚无 · 培养皿目前只含有职业焦虑。", "NONE · the dishes currently contain professional anxiety only.")}`,
        ]),
    "",
    `${localized(lang, "伴生异物", "SYMBIOTIC COMPANIONS")}  [${codex.summary.companions.discovered}]`,
    ...(companionLines.length > 0
      ? companionLines
      : [
          `  ${localized(lang, "尚无 · 所有培养物仍拒绝建立劳动关系。", "NONE · every culture still refuses an employment relationship.")}`,
        ]),
    "",
    `${localized(lang, "永久化石", "PERMANENT FOSSILS")}  [${codex.summary.fossils.discovered}]`,
    ...(fossilLines.length > 0
      ? fossilLines
      : [`  ${localized(lang, "尚无", "NONE")}`]),
    "",
    `${localized(lang, "今日发现", "TODAY'S DISCOVERIES")}  [${codex.recent.length}]`,
    ...(recentLines.length > 0
      ? recentLines
      : [`  ${localized(lang, "无 · 今天只是在重复昨天的病理。", "NONE · today merely repeated yesterday's pathology.")}`]),
    "",
    `  ${color("2", localized(lang, "隐私图鉴：只保存离散成长结果，不保存对话、路径、模型名或精确 Token", "PRIVATE CODEX: stores derived growth outcomes only; no chats, paths, model names, or exact tokens"))}`,
    color("2", "└────────────────────────────────────────────────────────┘"),
    "",
  ].join("\n");
}

export {
  ACHIEVEMENT_CATEGORY_COLORS,
  CODEX_RARITY_COLORS,
  achievementLabel,
  generationLabel,
  renderCodex,
  renderCompanionPeriod,
  renderCreatureAutopsy,
  renderCreatureCasebook,
  renderCreatureTodaySummary,
  renderEvolutionOptions,
};
