import { rm } from "node:fs/promises";
import { createRequire } from "node:module";

import {
  applyCreatureEvolutionEffect,
  CREATURE_ABILITY_KEYS,
  CREATURE_ABILITY_MAX,
  CREATURE_COPY,
  CREATURE_RARE_ABILITY_CHANCES,
  CREATURE_RARE_ABILITY_MAX,
  CREATURE_RARE_ABILITY_RANKS,
  creatureAbilityBar,
  creatureAbilityGains,
  creatureArt,
  creatureCasebook,
  creatureClinicalNote,
  creatureCodex,
  creatureEvent,
  creatureEvolutionEffect,
  creatureEvolutionSummary,
  creatureLabel,
  creatureMalignancyRankLabel,
  creatureMood,
  creatureRareAbilityGain,
  creatureStatePath,
  creatureTitle,
  dailyCreatureRecord,
  deriveCreature,
  loadCreatureState,
  roundCreature,
  saveCreatureState,
  selectCreatureEvolution,
  syncCreatureAchievements,
  syncCreatureGenerations,
  syncCreatureSpecimen,
} from "./creature.mjs";
import {
  color,
  formatTokens,
  inclusiveDateRange,
  isValidDate,
  padTerminal,
  renderCultureShareSvg,
  renderCreatureCollectionShareSvg,
  renderEncounterShareSvg,
  renderMonth,
  renderPathologyShareSvg,
  renderPrognosisShareSvg,
  renderReceipt,
  renderShareSvg,
  renderWeek,
  shiftDate,
  terminalWidth,
} from "./reporting.mjs";
import {
  inspectLocalSources,
  localDate,
  reportsForDates,
} from "./scanner.mjs";
import { renderCommandHelp, renderTopLevelHelp } from "./help.mjs";
import {
  SpecimenCodeError,
  createSpecimenEncounter,
  decodeSpecimenCode,
  encounterLabel,
  exportSpecimenCode,
  saveEncounterSpecimen,
} from "./encounter.mjs";
import { localized } from "./shared.mjs";
import {
  casebookLabel,
  creatureHistory,
  creaturePrognosis,
  currentCreatureIntervention,
  selectCreatureIntervention,
  syncCreatureInterventions,
} from "./casebook.mjs";
import {
  incubateLaboratoryCulture,
  laboratoryCulture,
  laboratoryLabel,
  laboratoryShelf,
  laboratoryView,
} from "./laboratory.mjs";

const require = createRequire(import.meta.url);
const { version: VERSION } = require("../package.json");
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

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {
    command,
    date: undefined,
    source: "all",
    lang: "zh",
    json: false,
    full: false,
    save: false,
    card: undefined,
    code: undefined,
    with: undefined,
    action: undefined,
    choice: undefined,
    id: undefined,
    topic: undefined,
    unknown: [],
    missing: undefined,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--full") {
      options.full = true;
    } else if (arg === "--save") {
      options.save = true;
    } else if (arg === "--date") {
      if (rest[index + 1] === undefined || rest[index + 1].startsWith("-")) {
        options.missing ??= arg;
      } else {
        options.date = rest[++index];
      }
    } else if (arg === "--source") {
      if (rest[index + 1] === undefined || rest[index + 1].startsWith("-")) {
        options.missing ??= arg;
      } else {
        options.source = rest[++index];
      }
    } else if (arg === "--lang") {
      if (rest[index + 1] === undefined || rest[index + 1].startsWith("-")) {
        options.missing ??= arg;
      } else {
        options.lang = rest[++index];
      }
    } else if (arg === "--card") {
      if (rest[index + 1] === undefined || rest[index + 1].startsWith("-")) {
        options.missing ??= arg;
      } else {
        options.card = rest[++index];
      }
    } else if (arg === "--id") {
      if (rest[index + 1] === undefined || rest[index + 1].startsWith("-")) {
        options.missing ??= arg;
      } else {
        options.id = rest[++index];
      }
    } else if (arg === "--with") {
      if (rest[index + 1] === undefined || rest[index + 1].startsWith("-")) {
        options.missing ??= arg;
      } else {
        options.with = rest[++index];
      }
    } else if (
      command === "encounter" &&
      options.code === undefined &&
      !arg.startsWith("-")
    ) {
      options.code = arg;
    } else if (
      command === "creature" &&
      [
        "reset",
        "evolve",
        "export",
        "history",
        "intervene",
        "prognosis",
      ].includes(arg) &&
      options.action === undefined
    ) {
      options.action = arg;
    } else if (
      command === "creature" &&
      ["evolve", "intervene"].includes(options.action) &&
      options.choice === undefined &&
      !arg.startsWith("-")
    ) {
      options.choice = arg;
    } else if (
      command === "lab" &&
      ["incubate", "shelf", "inspect"].includes(arg) &&
      options.action === undefined
    ) {
      options.action = arg;
    } else if (
      command === "lab" &&
      options.action === "incubate" &&
      options.choice === undefined &&
      !arg.startsWith("-")
    ) {
      options.choice = arg;
    } else if (
      command === "lab" &&
      options.action === "inspect" &&
      options.id === undefined &&
      !arg.startsWith("-")
    ) {
      options.id = arg;
    } else if (
      command === "explain" &&
      ["resources", "comparisons", "sources", "creature", "privacy"].includes(
        arg,
      ) &&
      options.topic === undefined
    ) {
      options.topic = arg;
    } else if (!["--help", "-h", "--version", "-v"].includes(arg)) {
      options.unknown.push(arg);
    }
  }

  return options;
}

async function runLaboratory(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = options.date ?? localDate(new Date(), timezone);
  const state = await loadCreatureState();
  if (options.action === "shelf") {
    const shelf = laboratoryShelf(state, date);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(shelf, null, 2)}\n`);
      return;
    }
    const shown = options.full
      ? shelf.cultures
      : shelf.cultures.slice(-6);
    process.stdout.write(
      [
        color(
          "1;35",
          localized(
            options.lang,
            `污染培养架 · ${shelf.total}`,
            `POLLUTION CULTURE SHELF · ${shelf.total}`,
          ),
        ),
        "",
        ...(shown.length === 0
          ? [
              localized(
                options.lang,
                "  尚无培养物。实验室仍在认真培养空气。",
                "  NONE. The laboratory is still culturing air.",
              ),
            ]
          : shown.map(
              (culture) =>
                `  ${color(
                  CODEX_RARITY_COLORS[culture.rarity],
                  `#${culture.id} · ${laboratoryLabel("types", culture.typeId, options.lang)} · ${culture.rarity.toUpperCase()}`,
                )} · ${culture.createdAt}`,
            )),
        ...(shelf.total > shown.length
          ? [
              localized(
                options.lang,
                `  另有 ${shelf.total - shown.length} 份封存记录 · anti-ai lab shelf --full`,
                `  ${shelf.total - shown.length} more sealed records · anti-ai lab shelf --full`,
              ),
            ]
          : []),
        "",
      ].join("\n"),
    );
    return;
  }
  if (options.action === "inspect") {
    const culture = laboratoryCulture(state, date, options.id);
    if (!culture) {
      process.stderr.write(
        `${localized(options.lang, `未找到培养物：${options.id ?? ""}`, `Culture not found: ${options.id ?? ""}`)}\n`,
      );
      process.exitCode = 2;
      return;
    }
    if (options.json) {
      process.stdout.write(`${JSON.stringify(culture, null, 2)}\n`);
      return;
    }
    const material = culture.ingredients
      .map(
        ({ type, id }) =>
          `${laboratoryLabel("ingredients", type, options.lang)} #${id}`,
      )
      .join(" × ");
    process.stdout.write(
      [
        color(
          "1;35",
          localized(
            options.lang,
            `污染培养标本 · #${culture.id}`,
            `POLLUTION CULTURE SPECIMEN · #${culture.id}`,
          ),
        ),
        "",
        ...culture.appearance.lines.map((line) => `  ${line}`),
        "",
        `  ${localized(options.lang, "类型", "TYPE")}  ${color(
          CODEX_RARITY_COLORS[culture.rarity],
          `${laboratoryLabel("types", culture.typeId, options.lang)} · ${culture.rarity.toUpperCase()}`,
        )}`,
        `  ${localized(options.lang, "原料", "MATERIALS")}  ${material}`,
        `  ${localized(options.lang, "并发症", "COMPLICATION")}  ${laboratoryLabel("complications", culture.complicationId, options.lang)}`,
        `  ${localized(options.lang, "副作用", "SIDE EFFECT")}  ${laboratoryLabel("sideEffects", culture.sideEffectId, options.lang)}`,
        "",
      ].join("\n"),
    );
    return;
  }
  if (options.action === "incubate") {
    const selection = incubateLaboratoryCulture(
      state,
      date,
      options.choice,
    );
    if (selection.error === "unavailable") {
      process.stderr.write(
        `${localized(options.lang, "当前没有可培养的派生原料。", "No derived material is available for incubation.")}\n`,
      );
      process.exitCode = 2;
      return;
    }
    if (selection.error === "invalid") {
      process.stderr.write(
        `${localized(options.lang, "培养方案必须是 1、2 或 3。", "Culture choice must be 1, 2, or 3.")}\n`,
      );
      process.exitCode = 2;
      return;
    }
    await saveCreatureState(state);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(selection.value, null, 2)}\n`);
      return;
    }
    process.stdout.write(
      [
        color(
          "1;35",
          localized(options.lang, "培养事故已封存", "INCUBATION ACCIDENT SEALED"),
        ),
        "",
        `  ${color(
          CODEX_RARITY_COLORS[selection.value.culture.rarity],
          `#${selection.value.culture.id} · ${laboratoryLabel("types", selection.value.culture.typeId, options.lang)} · ${selection.value.culture.rarity.toUpperCase()}`,
        )}`,
        ...selection.value.culture.appearance.lines.map((line) => `  ${line}`),
        "",
        `  ${localized(options.lang, "查看标本", "INSPECT")}  anti-ai lab inspect ${selection.value.culture.id}`,
        "",
      ].join("\n"),
    );
    return;
  }
  const view = laboratoryView(state, date);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(view, null, 2)}\n`);
    return;
  }
  const lines = [
    color("1;35", localized(options.lang, "污染实验室", "POLLUTION LABORATORY")),
    "",
    localized(
      options.lang,
      `原料：外来标本 ${view.inventory.foreignSpecimens} · 永久化石 ${view.inventory.fossils} · 病例切片 ${view.inventory.caseSlices}`,
      `MATERIALS: foreign ${view.inventory.foreignSpecimens} · fossils ${view.inventory.fossils} · case slices ${view.inventory.caseSlices}`,
    ),
    localized(
      options.lang,
      `培养架：${view.cultures} · 当前批次 #${view.batch}`,
      `SHELF: ${view.cultures} · CURRENT BATCH #${view.batch}`,
    ),
    "",
    ...(view.status === "locked"
      ? [
          localized(
            options.lang,
            "尚无可用原料。保存一次遭遇、封存一枚化石或处理一个转折病例后再来。",
            "No derived material is available. Save an encounter, seal a fossil, or treat a turning case first.",
          ),
        ]
      : view.proposals.flatMap((proposal) => {
          const material = proposal.ingredients
            .map(
              ({ type, id }) =>
                `${laboratoryLabel("ingredients", type, options.lang)} #${id}`,
            )
            .join(" × ");
          return [
            `  ${color(
              CODEX_RARITY_COLORS[proposal.rarity],
              localized(
                options.lang,
                `方案 ${proposal.slot} · #${proposal.id} · ${laboratoryLabel("types", proposal.typeId, options.lang)} · ${proposal.rarity.toUpperCase()}`,
                `FORMULA ${proposal.slot} · #${proposal.id} · ${laboratoryLabel("types", proposal.typeId, options.lang)} · ${proposal.rarity.toUpperCase()}`,
              ),
            )}`,
            `    ${localized(options.lang, "原料", "MATERIALS")}  ${material}`,
            `    ${localized(options.lang, "诊断", "DIAGNOSIS")}  ${creatureLabel("ecologies", proposal.ecologyId, options.lang)} / ${creatureLabel("branches", proposal.pathologyId, options.lang)} · ${laboratoryLabel("complications", proposal.complicationId, options.lang)}`,
            `    ${localized(options.lang, "副作用", "SIDE EFFECT")}  ${laboratoryLabel("sideEffects", proposal.sideEffectId, options.lang)}`,
            `    ${localized(options.lang, "培养", "INCUBATE")}  anti-ai lab incubate ${proposal.slot}`,
            "",
          ];
        })),
    "",
  ];
  process.stdout.write(lines.join("\n"));
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
  return [
    `  ${color("33", localized(lang, "今日异变体", "TODAY'S MUTATION FILE"))}`,
    `  ${localized(lang, "生态切片", "ECOLOGY SLICE")}  ${gains || localized(lang, "惯常波动", "habitual drift")} · ${localized(lang, `仍为「${form}」`, `still “${form}”`)}`,
    `  ${localized(lang, "今日成就", "TODAY'S ACHIEVEMENTS")}  ${achievements || localized(lang, "无", "none")}${milestones.length > 0 ? ` · ${milestones.join(" · ")}` : ""}`,
    ...(codex.recent.length > 0
      ? [
          `  ${localized(lang, "图鉴入库", "CODEX INTAKE")}  +${codex.recent.length} · ${discoveries}`,
        ]
      : []),
    `  ${localized(lang, "查看完整档案", "FULL FILE")}  anti-ai creature`,
    `  ${localized(lang, "查看图鉴", "CODEX")}      anti-ai codex`,
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
    `  ${localized(lang, "新增收藏", "NEW COLLECTIONS")}  ${casebook.discoveries.total} · ${localized(lang, `形态 ${casebook.discoveries.forms} · 成就 ${casebook.discoveries.achievements} · 异色 ${casebook.discoveries.chromatics} · 伤痕 ${casebook.discoveries.scars} · 标本 ${casebook.discoveries.specimens} · 外来 ${casebook.discoveries.foreignSpecimens} · 化石 ${casebook.discoveries.fossils} · 病例 ${casebook.discoveries.caseSlices} · 培养 ${casebook.discoveries.cultures}`, `forms ${casebook.discoveries.forms} · achievements ${casebook.discoveries.achievements} · chromatics ${casebook.discoveries.chromatics} · scars ${casebook.discoveries.scars} · specimens ${casebook.discoveries.specimens} · foreign ${casebook.discoveries.foreignSpecimens} · fossils ${casebook.discoveries.fossils} · cases ${casebook.discoveries.caseSlices} · cultures ${casebook.discoveries.cultures}`)}`,
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
    `  ${localized(lang, "新增收藏", "NEW COLLECTIONS")}  ${casebook.discoveries.total} · ${localized(lang, `形态 ${casebook.discoveries.forms} · 成就 ${casebook.discoveries.achievements} · 异色 ${casebook.discoveries.chromatics} · 伤痕 ${casebook.discoveries.scars} · 标本 ${casebook.discoveries.specimens} · 外来 ${casebook.discoveries.foreignSpecimens} · 化石 ${casebook.discoveries.fossils} · 病例 ${casebook.discoveries.caseSlices} · 培养 ${casebook.discoveries.cultures}`, `forms ${casebook.discoveries.forms} · achievements ${casebook.discoveries.achievements} · chromatics ${casebook.discoveries.chromatics} · scars ${casebook.discoveries.scars} · specimens ${casebook.discoveries.specimens} · foreign ${casebook.discoveries.foreignSpecimens} · fossils ${casebook.discoveries.fossils} · cases ${casebook.discoveries.caseSlices} · cultures ${casebook.discoveries.cultures}`)}`,
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

async function runToday(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = options.date ?? localDate(new Date(), timezone);

  if (options.json) {
    const [report] = await reportsForDates(options, [date], timezone);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    const dates = Array.from({ length: 8 }, (_, index) =>
      shiftDate(date, index - 7),
    );
    const reports = await reportsForDates(options, dates, timezone);
    const creatureContext =
      options.source === "all"
        ? await runCreature(
            {
              ...options,
              action: undefined,
              command: "creature",
              json: false,
            },
            "context",
          )
        : null;
    const creature = creatureContext?.result ?? null;
    const codex = creatureContext
      ? creatureCodex(creatureContext.state, creature.date)
      : null;
    const mutation = creature
      ? renderCreatureTodaySummary(creature, codex, options.lang)
      : "";
    process.stdout.write(
      renderReceipt(
        reports.at(-1),
        reports.slice(0, -1),
        options.lang,
        mutation,
      ),
    );
  }
}

async function runWeek(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const endDate = options.date ?? localDate(new Date(), timezone);
  const dates = Array.from({ length: 7 }, (_, index) =>
    shiftDate(endDate, index - 6),
  );
  const reports = await reportsForDates(options, dates, timezone);
  const creatureContext =
    options.source === "all"
      ? await runCreature(
          {
            ...options,
            action: undefined,
            command: "creature",
            json: false,
          },
          "context",
        )
      : null;
  const casebook = creatureContext
    ? creatureCasebook(creatureContext.state, dates[0], endDate)
    : null;
  process.stdout.write(
    renderWeek(
      reports,
      options.lang,
      casebook ? renderCreatureCasebook(casebook, options.lang) : "",
    ),
  );
}

async function runMonth(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const endDate = options.date ?? localDate(new Date(), timezone);
  const dayCount = Number(endDate.slice(8));
  const dates = Array.from({ length: dayCount }, (_, index) =>
    `${endDate.slice(0, 8)}${String(index + 1).padStart(2, "0")}`,
  );
  const reports = await reportsForDates(options, dates, timezone);
  const creatureContext =
    options.source === "all"
      ? await runCreature(
          {
            ...options,
            action: undefined,
            command: "creature",
            json: false,
          },
          "context",
        )
      : null;
  const autopsy = creatureContext
    ? creatureCasebook(creatureContext.state, dates[0], endDate)
    : null;
  process.stdout.write(
    renderMonth(
      reports,
      options.lang,
      autopsy ? renderCreatureAutopsy(autopsy, options.lang) : "",
    ),
  );
}

async function runCodex(options) {
  const creatureContext = await runCreature(
    {
      ...options,
      action: undefined,
      command: "creature",
      json: false,
    },
    "context",
  );
  if (!creatureContext) return;
  const codex = creatureCodex(
    creatureContext.state,
    creatureContext.result.date,
  );
  if (options.json) {
    process.stdout.write(`${JSON.stringify(codex, null, 2)}\n`);
  } else {
    process.stdout.write(renderCodex(codex, options.lang));
  }
}

async function runShare(options) {
  if (options.card === "culture") {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = options.date ?? localDate(new Date(), timezone);
    let state;
    try {
      state = await loadCreatureState();
    } catch {
      process.stderr.write(
        `${localized(options.lang, "培养物分享卡无法读取异变体档案。", "The culture card cannot read the mutation file.")}\n`,
      );
      process.exitCode = 1;
      return;
    }
    const shelf = laboratoryShelf(state, date);
    const culture = options.id
      ? laboratoryCulture(state, date, options.id)
      : shelf.cultures.at(-1);
    if (!culture) {
      process.stderr.write(
        `${localized(options.lang, "当前没有可分享的污染培养物。", "No pollution culture is available to share.")}\n`,
      );
      process.exitCode = 2;
      return;
    }
    process.stdout.write(
      renderCultureShareSvg(
        {
          date: culture.createdAt,
          batch: culture.batch,
          cultureId: culture.id,
          art: culture.appearance.lines,
          type: laboratoryLabel("types", culture.typeId, options.lang),
          rarity: culture.rarity.toUpperCase(),
          materials: culture.ingredients
            .map(
              ({ type, id }) =>
                `${laboratoryLabel("ingredients", type, options.lang)} #${id}`,
            )
            .join(" × "),
          ecology: creatureLabel(
            "ecologies",
            culture.ecologyId,
            options.lang,
          ),
          pathology: creatureLabel(
            "branches",
            culture.pathologyId,
            options.lang,
          ),
          complication: laboratoryLabel(
            "complications",
            culture.complicationId,
            options.lang,
          ),
          sideEffect: laboratoryLabel(
            "sideEffects",
            culture.sideEffectId,
            options.lang,
          ),
        },
        options.lang,
      ),
    );
    return;
  }
  if (options.card === "prognosis") {
    const context = await runCreature(
      {
        ...options,
        action: undefined,
        command: "creature",
        json: false,
      },
      "context",
    );
    if (!context) return;
    const intervention = currentCreatureIntervention(
      context.state,
      context.result.date,
    );
    if (!intervention || intervention.status !== "pending") {
      process.stderr.write(
        `${localized(options.lang, "当前没有可分享的待处理转折病例。", "No pending turning-point case is available to share.")}\n`,
      );
      process.exitCode = 2;
      return;
    }
    process.stdout.write(
      renderPrognosisShareSvg(
        {
          date: context.result.date,
          specimenId: context.result.appearance.specimenId,
          art: creatureArt(context.result),
          caseId: intervention.id,
          caseLabel: casebookLabel(
            "cases",
            intervention.caseId,
            options.lang,
          ),
          options: intervention.options.map((option) => ({
            slot: option.slot,
            label: casebookLabel("routes", option.route, options.lang),
            benefit: casebookLabel(
              "benefits",
              option.benefitId,
              options.lang,
            ),
            cost: casebookLabel("costs", option.costId, options.lang),
          })),
        },
        options.lang,
      ),
    );
    return;
  }
  if (options.card === "encounter") {
    let context;
    try {
      context = await encounterContext({
        ...options,
        code: options.with,
      });
    } catch (error) {
      if (!(error instanceof SpecimenCodeError)) throw error;
      process.stderr.write(`${encounterErrorMessage(error, options.lang)}\n`);
      process.exitCode = 2;
      return;
    }
    if (!context) return;
    const { encounter } = context;
    process.stdout.write(
      renderEncounterShareSvg(
        {
          date: encounter.date,
          encounterId: encounter.encounterId,
          art: creatureArt({ appearance: encounter.hybrid }),
          weather: encounterLabel(
            "weather",
            encounter.weather.id,
            options.lang,
          ),
          type: encounterLabel("type", encounter.type.id, options.lang),
          detail: encounterLabel("detail", encounter.type.id, options.lang),
          localForm: creatureLabel(
            "ecologyForms",
            encounter.local.formId,
            options.lang,
          ),
          visitorForm: creatureLabel(
            "ecologyForms",
            encounter.visitor.formId,
            options.lang,
          ),
          hybridForm: creatureLabel(
            "ecologyForms",
            encounter.hybrid.formId,
            options.lang,
          ),
          hybridFingerprint: encounter.hybrid.fingerprint,
        },
        options.lang,
      ),
    );
    return;
  }
  if (
    ["pathology", "specimen", "wanted", "fossil"].includes(options.card)
  ) {
    const creature = await runCreature(
      {
        ...options,
        action: undefined,
        command: "creature",
        json: false,
      },
      "result",
    );
    if (!creature) {
      process.stderr.write(
        `${options.card === "pathology"
          ? localized(options.lang, "病理报告无法读取异变体档案。运行 anti-ai creature reset 后可重新孵化。", "The pathology card cannot read the mutation file. Run anti-ai creature reset to hatch again.")
          : localized(options.lang, "收藏卡无法读取异变体档案。运行 anti-ai creature reset 后可重新孵化。", "The collection card cannot read the mutation file. Run anti-ai creature reset to hatch again.")}\n`,
      );
      process.exitCode = 1;
      return;
    }
    const ecologyGain = [
      creature.today.ecologyGains.pollution > 0
        ? localized(
            options.lang,
            `污染 +${creature.today.ecologyGains.pollution}`,
            `pollution +${creature.today.ecologyGains.pollution}`,
          )
        : null,
      creature.today.ecologyGains.clarity > 0
        ? localized(
            options.lang,
            `清醒 +${creature.today.ecologyGains.clarity}`,
            `clarity +${creature.today.ecologyGains.clarity}`,
          )
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const view = {
      date: creature.date,
      specimenId: creature.appearance.specimenId,
      art: creatureArt(creature),
      ecology: creatureLabel(
        "ecologies",
        creature.ecology.type,
        options.lang,
      ),
      pathology: creatureLabel(
        "branches",
        creature.branch,
        options.lang,
      ),
      form: creatureLabel(
        "ecologyForms",
        creature.ecologyForm,
        options.lang,
      ),
      stage: creatureLabel("stages", creature.stage, options.lang),
      experience: localized(
        options.lang,
        `阅历 ${creature.experienceDays} 天`,
        `${creature.experienceDays} experience days`,
      ),
      epithet: creatureTitle(creature, options.lang),
      ecologyGain:
        ecologyGain || localized(options.lang, "惯常波动", "habitual drift"),
    };
    if (options.card === "pathology") {
      process.stdout.write(
        renderPathologyShareSvg(view, options.lang),
      );
      return;
    }
    if (options.card === "fossil") {
      const fossil = creature.fossils.at(-1);
      if (!fossil) {
        process.stderr.write(
          `${localized(options.lang, "当前没有永久化石可生成证书。第 90 个阅历日后再来。", "No permanent fossil is available for certification. Return after experience day 90.")}\n`,
        );
        process.exitCode = 2;
        return;
      }
      view.fossil = {
        ...fossil,
        discoveredAt: fossil.sealedAt,
      };
      view.ecology = creatureLabel(
        "ecologies",
        fossil.ecologyId,
        options.lang,
      );
      view.pathology = creatureLabel(
        "branches",
        fossil.pathologyId,
        options.lang,
      );
      view.inheritance = creatureLabel(
        "abilities",
        fossil.inheritanceAbilityId,
        options.lang,
      );
      view.scar = creatureLabel("scars", fossil.scarId, options.lang);
      delete view.art;
    }
    process.stdout.write(
      renderCreatureCollectionShareSvg(
        view,
        options.card,
        options.lang,
      ),
    );
    return;
  }
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = options.date ?? localDate(new Date(), timezone);
  const dates = Array.from({ length: 8 }, (_, index) =>
    shiftDate(date, index - 7),
  );
  const reports = await reportsForDates(options, dates, timezone);
  process.stdout.write(
    renderShareSvg(reports.at(-1), reports.slice(0, -1), options.lang),
  );
}

async function runCreature(options, mode = "render") {
  if (options.action === "reset") {
    await rm(creatureStatePath(), { force: true });
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ reset: true })}\n`);
    } else {
      process.stdout.write(
        `${localized(options.lang, "异变体档案已销毁。下一枚 Token 会重新孵化它。", "Mutation file destroyed. The next token will hatch it again.")}\n`,
      );
    }
    return;
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = options.date ?? localDate(new Date(), timezone);
  let state;
  try {
    state = await loadCreatureState();
  } catch {
    if (mode === "result") return null;
    process.stderr.write(
      `${localized(options.lang, "异变体档案无法读取。运行 anti-ai creature reset 后可重新孵化。", "The mutation file cannot be read. Run anti-ai creature reset to hatch again.")}\n`,
    );
    process.exitCode = 1;
    return;
  }
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
  const reports = dates.map((entryDate) => reportsByDate.get(entryDate));

  for (const report of reports) {
    const previousCreature = deriveCreature(
      state,
      shiftDate(report.date, -1),
    );
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
        evolutionEffect?.triggered &&
          evolutionEffect.category === "paradox"
          ? evolutionEffect.benefitPoints * 2
          : 0,
      );
      record.traits[event.trait] = roundCreature(
        record.traits[event.trait] + event.delta,
      );
      record.event = {
        id: event.id,
        rarity: event.rarity,
      };
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
  let evolutionAction = null;
  if (options.action === "evolve") {
    if (options.choice === undefined) {
      const evolution = creatureEvolutionSummary(state, date);
      evolutionAction =
        evolution === null
          ? { error: "unavailable" }
          : { value: evolution };
    } else {
      evolutionAction = selectCreatureEvolution(
        state,
        date,
        options.choice,
      );
    }
    if (evolutionAction.error) {
      const generation = evolutionAction.generation;
      const message =
        evolutionAction.error === "locked"
          ? localized(
              options.lang,
              `第 ${generation} 代进化已经封存，不能改选。`,
              `Generation ${generation} evolution is sealed and cannot be changed.`,
            )
          : evolutionAction.error === "invalid"
            ? localized(
                options.lang,
                "进化选项必须是 1、2 或 3。",
                "Evolution choice must be 1, 2, or 3.",
              )
            : localized(
                options.lang,
                "当前没有可选择的进化。",
                "No evolution choice is currently available.",
              );
      process.stderr.write(`${message}\n`);
      process.exitCode = 2;
      return;
    }
    creature = deriveCreature(state, date);
    evolutionAction.value = creature.evolution;
  }
  let interventionAction = null;
  if (options.action === "intervene") {
    if (options.choice === undefined) {
      const intervention = currentCreatureIntervention(state, date);
      interventionAction =
        intervention === null
          ? { error: "unavailable" }
          : { value: intervention };
    } else {
      interventionAction = selectCreatureIntervention(
        state,
        date,
        options.choice,
        creature.experienceDays,
      );
    }
    if (interventionAction.error) {
      const message =
        interventionAction.error === "locked"
          ? localized(
              options.lang,
              "病例已封存，不能改选治疗方案。",
              "The case is sealed and its treatment cannot be changed.",
            )
          : interventionAction.error === "invalid"
            ? localized(
                options.lang,
                "治疗方案必须是 1、2 或 3。",
                "Treatment choice must be 1, 2, or 3.",
              )
            : localized(
                options.lang,
                "当前没有可干预的转折病例。",
                "No turning-point case is currently available.",
              );
      process.stderr.write(`${message}\n`);
      process.exitCode = 2;
      return;
    }
  }
  await saveCreatureState(state);

  if (options.action === "intervene") {
    const intervention = interventionAction.value;
    if (options.json) {
      process.stdout.write(`${JSON.stringify(intervention, null, 2)}\n`);
      return;
    }
    const optionLines = intervention.options.flatMap((option) => [
      `  ${option.slot}. ${casebookLabel("routes", option.route, options.lang)}`,
      `     ${localized(options.lang, "作用", "EFFECT")}  ${casebookLabel("benefits", option.benefitId, options.lang)}`,
      `     ${localized(options.lang, "代价", "COST")}  ${casebookLabel("costs", option.costId, options.lang)}`,
    ]);
    process.stdout.write(
      [
        localized(options.lang, "分叉病历 · 转折病例", "FORKED CASEBOOK · TURNING CASE"),
        `${localized(options.lang, "病例", "CASE")} #${intervention.id} · ${casebookLabel("cases", intervention.caseId, options.lang)}`,
        `${localized(options.lang, "状态", "STATUS")}  ${localized(options.lang, intervention.status === "pending" ? "待处理" : "已封存", intervention.status.toUpperCase())}`,
        "",
        ...(intervention.status === "pending"
          ? optionLines
          : [
              `${localized(options.lang, "已选择", "SELECTED")}  ${intervention.selected.slot}. ${casebookLabel("routes", intervention.selected.route, options.lang)}`,
              `${localized(options.lang, "后遗症", "AFTEREFFECT")}  ${casebookLabel("marks", intervention.selected.markId, options.lang)}`,
            ]),
        "",
        ...(intervention.status === "pending"
          ? [
              localized(
                options.lang,
                "运行 anti-ai creature intervene <1|2|3> 封存选择。",
                "Run anti-ai creature intervene <1|2|3> to seal a choice.",
              ),
            ]
          : []),
        "",
      ].join("\n"),
    );
    return;
  }

  if (options.action === "history") {
    const history = creatureHistory(state, date, { full: options.full });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(history, null, 2)}\n`);
      return;
    }
    const eventLines = history.events.map((event) => {
      let label;
      if (event.type === "hatch") {
        label = localized(options.lang, "首次孵化", "INITIAL HATCH");
      } else if (event.type === "stage") {
        label = creatureLabel("stages", event.id, options.lang);
      } else if (event.type === "rare_mutation") {
        label = `${localized(options.lang, "稀有突变", "RARE MUTATION")} · ${CREATURE_COPY.events[event.id].name[options.lang]}`;
      } else if (event.type === "chromatic") {
        label = `${localized(options.lang, "异色觉醒", "CHROMATIC AWAKENING")} · ${creatureLabel("rareAbilities", event.id, options.lang)} +${event.levelGain}`;
      } else if (event.type === "achievement") {
        label = `${localized(options.lang, "徽章解锁", "BADGE UNLOCKED")} · ${creatureLabel("achievements", event.id, options.lang)}`;
      } else if (event.type === "fossil") {
        label = `${localized(options.lang, "永久化石", "PERMANENT FOSSIL")} · #${event.id} · ${generationLabel(event.generation, options.lang)}`;
      } else if (event.type === "evolution_selected") {
        label = `${localized(options.lang, "进化封存", "EVOLUTION SEALED")} · ${generationLabel(event.generation, options.lang)} · ${creatureLabel("evolutions", event.evolutionId, options.lang)}`;
      } else if (event.type === "case_offered") {
        label = `${localized(options.lang, "转折病例", "TURNING CASE")} · ${casebookLabel("cases", event.caseId, options.lang)}`;
      } else {
        label = `${localized(options.lang, "选择封存", "SEALED CHOICE")} · ${casebookLabel("routes", event.routeId, options.lang)} · ${casebookLabel("marks", event.markId, options.lang)}`;
      }
      return `  ${event.date}  ${label}`;
    });
    const usageBandLabels = {
      sober: ["AI 清醒", "AI-FREE"],
      calibrating: ["校准污染", "CALIBRATING"],
      restrained: ["节制使用", "RESTRAINED"],
      light: ["轻量使用", "LIGHT"],
      habitual: ["惯常使用", "HABITUAL"],
      heavy: ["重度使用", "HEAVY"],
      binge: ["暴食使用", "BINGE"],
      meltdown: ["熔毁使用", "MELTDOWN"],
    };
    const dailyLines = (history.daily ?? []).map((day) => {
      const band =
        usageBandLabels[day.usageBand]?.[options.lang === "zh" ? 0 : 1] ??
        day.usageBand.toUpperCase();
      return `  ${day.date}  ${localized(options.lang, `阅历 ${day.experienceDay} · ${day.status === "active" ? "活跃" : "休眠"} · ${band}`, `EXPERIENCE ${day.experienceDay} · ${day.status.toUpperCase()} · ${band}`)}`;
    });
    process.stdout.write(
      [
        localized(options.lang, "分叉病历 · 关键病程", "FORKED CASEBOOK · KEY HISTORY"),
        `${localized(options.lang, "观察", "OBSERVED")}  ${history.observedDays} ${localized(options.lang, "天", "DAYS")} · ${localized(options.lang, "关键节点", "KEY EVENTS")} ${history.totalEvents}`,
        "",
        ...(eventLines.length > 0
          ? eventLines
          : [
              `  ${localized(options.lang, "尚未孵化", "NOT YET HATCHED")}`,
            ]),
        ...(dailyLines.length > 0
          ? [
              "",
              localized(options.lang, "逐日病程", "DAILY COURSE"),
              ...dailyLines,
            ]
          : []),
        "",
      ].join("\n"),
    );
    return;
  }

  if (options.action === "prognosis") {
    const prognosis = creaturePrognosis(state, date, creature);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(prognosis, null, 2)}\n`);
      return;
    }
    const routeLines = prognosis.routes.flatMap((route) => [
      `  [${casebookLabel("likelihoods", route.likelihood, options.lang)}] ${casebookLabel("routes", route.route, options.lang)}`,
      `    ${localized(options.lang, "可能病例", "POSSIBLE CASE")}  ${casebookLabel("cases", route.previewCaseId, options.lang)}`,
      ...route.driverIds.map(
        (driverId) =>
          `    · ${casebookLabel("drivers", driverId, options.lang)}`,
      ),
    ]);
    process.stdout.write(
      [
        localized(options.lang, "分叉病历 · 三路预演", "FORKED CASEBOOK · THREE-WAY PROGNOSIS"),
        `${localized(options.lang, "观察窗口", "WINDOW")}  ${prognosis.window.minDays}–${prognosis.window.maxDays} ${localized(options.lang, "个阅历日", "EXPERIENCE DAYS")}`,
        "",
        ...routeLines,
        "",
        localized(
          options.lang,
          "这是可解释的方向预演，不是精确概率、任务或奖励承诺。",
          "This is an explainable directional preview, not a precise probability, task, or reward promise.",
        ),
        "",
      ].join("\n"),
    );
    return;
  }

  if (options.action === "evolve") {
    const evolution = evolutionAction.value;
    if (options.json) {
      process.stdout.write(`${JSON.stringify(evolution, null, 2)}\n`);
      return;
    }
    process.stdout.write(
      [
        localized(
          options.lang,
          `第 ${evolution.generation} 代进化 · ${evolution.status === "pending" ? "待选择" : "已封存"}`,
          `GENERATION ${evolution.generation} EVOLUTION · ${evolution.status.toUpperCase()}`,
        ),
        "",
        ...(evolution.status === "pending"
          ? renderEvolutionOptions(evolution, options.lang)
          : [
              `${localized(options.lang, "已选择", "SELECTED")}  [${creatureLabel("evolutionCategories", evolution.selected.category, options.lang)}] ${creatureLabel("evolutions", evolution.selected.id, options.lang)}`,
            ]),
        "",
        ...(evolution.status === "pending"
          ? [
              localized(
                options.lang,
                "运行 anti-ai creature evolve <1|2|3> 确认选择。",
                "Run anti-ai creature evolve <1|2|3> to seal a choice.",
              ),
            ]
          : []),
        "",
      ].join("\n"),
    );
    return;
  }

  const previousCreature = deriveCreature(state, shiftDate(date, -1));
  const today = state.days[date];
  const newTalents = creature.talents.filter(
    (talent) => !previousCreature.talents.includes(talent),
  );
  const result = {
    date,
    status: today.active ? "active" : "dormant",
    ...creature,
    mood: creatureMood(creature, today),
    today: {
      pollutionDose: today.pollutionDose,
      usageBand: today.usageBand,
      ecologyGains: today.ecologyGains,
      event: today.event,
      abilityGains: today.abilityGains,
      rareAbilityGain: today.rareAbilityGain,
      achievementUnlockIds: today.achievementUnlockIds,
      newTalents,
      evolutionEffect: today.evolutionEffect ?? null,
    },
    casebook: {
      current: currentCreatureIntervention(state, date),
      selectedCount: (state.casebook?.cases ?? []).filter(
        (entry) =>
          entry.status === "selected" &&
          entry.selectedAt !== null &&
          entry.selectedAt <= date,
      ).length,
    },
  };

  if (options.action === "export") {
    const exported = exportSpecimenCode(result);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(exported, null, 2)}\n`);
    } else {
      process.stdout.write(
        [
          localized(
            options.lang,
            "异变体污染编码",
            "MUTATION POLLUTION CODE",
          ),
          "",
          `${localized(options.lang, "污染编码", "POLLUTION CODE")}  ${exported.code}`,
          `${localized(options.lang, "标本编号", "SPECIMEN ID")}  ${exported.specimenId}`,
          `${localized(options.lang, "外观指纹", "APPEARANCE FINGERPRINT")}  ${exported.fingerprint}`,
          "",
          localized(
            options.lang,
            "隐私编码：不包含精确 Token、模型、路径或对话。",
            "PRIVATE CODE: contains no exact tokens, models, paths, or chats.",
          ),
          "",
        ].join("\n"),
      );
    }
    return;
  }

  if (mode === "context") return { result, state };
  if (mode === "result") return result;
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const lang = options.lang;
  const eventCopy = today.event
    ? CREATURE_COPY.events[today.event.id]
    : undefined;
  const rarity = today.event
    ? localized(
        lang,
        today.event.rarity === "rare" ? "稀有" : "普通",
        today.event.rarity.toUpperCase(),
      )
    : undefined;
  const statusLine =
    result.status === "dormant"
      ? `${localized(lang, "状态", "STATUS")}  ${localized(lang, `休眠 · 连续 ${result.quietStreakDays} 个 AI 清醒日`, `DORMANT · ${result.quietStreakDays} AI-free days`)}`
      : `${localized(lang, "状态", "STATUS")}  ${localized(lang, "正在进食", "FEEDING")}`;
  const eventLines = eventCopy
    ? [
        `${localized(lang, "今日突变", "TODAY'S MUTATION")}  [${rarity}] ${eventCopy.name[lang]}`,
        `  ${eventCopy.body[lang]}`,
      ]
    : [
        `${localized(lang, "今日突变", "TODAY'S MUTATION")}  ${localized(lang, "无 · 今日未进食，污染 -2", "NONE · no feeding today, exposure -2")}`,
      ];
  const abilityDisplayLabels = Object.fromEntries(
    CREATURE_ABILITY_KEYS.map((ability) => {
      const rank = result.malignancyRanks[ability];
      const suffix =
        rank === 0
          ? ""
          : localized(
              lang,
              ` · 恶性 ${creatureMalignancyRankLabel(rank)}`,
              ` · MALIGNANT ${creatureMalignancyRankLabel(rank)}`,
            );
      return [ability, `${creatureLabel("abilities", ability, lang)}${suffix}`];
    }),
  );
  const abilityLabelWidth = Math.max(
    ...Object.values(abilityDisplayLabels).map((label) =>
      terminalWidth(label),
    ),
  );
  const abilityLines = CREATURE_ABILITY_KEYS.map((ability) => {
    const rank = result.malignancyRanks[ability];
    const malignancyColor =
      rank >= 3 ? "1;33" : rank === 2 ? "1;35" : "1;31";
    const label = padTerminal(abilityDisplayLabels[ability], abilityLabelWidth);
    const renderedLabel = rank === 0 ? label : color(malignancyColor, label);
    return `  ${renderedLabel}  ${creatureAbilityBar(result.abilities[ability])} ${String(result.abilities[ability]).padStart(3, " ")} / ${CREATURE_ABILITY_MAX}`;
  });
  const malignancyPreview = result.malignancies
    .map(
      (entry) =>
        `${creatureLabel("malignancyTitles", entry.titleId, lang)} ${creatureMalignancyRankLabel(entry.rank)}`,
    )
    .join(" · ");
  const malignancyLine = `${localized(lang, "恶性增殖", "MALIGNANT GROWTH")}  [${result.malignancies.length}] ${malignancyPreview || localized(lang, "尚未越界", "CONTAINED")}`;
  const growth = CREATURE_ABILITY_KEYS.filter(
    (ability) => today.abilityGains[ability] > 0,
  )
    .map(
      (ability) =>
        `${creatureLabel("abilities", ability, lang)} +${today.abilityGains[ability]}`,
    )
    .join(" · ");
  const talentPreview = result.talents
    .slice(-4)
    .map((talent) => creatureLabel("talents", talent, lang))
    .join(" · ");
  const newTalentPreview = result.today.newTalents
    .map((talent) => creatureLabel("talents", talent, lang))
    .join(" · ");
  const rareAbilityEntries = Object.entries(result.rareAbilities);
  const rareAbilityLabelWidth = Math.max(
    0,
    ...rareAbilityEntries.map(([ability, details]) => {
      const rank = CREATURE_RARE_ABILITY_RANKS[details.rarity];
      return terminalWidth(
        `[${rank.badge}] ${creatureLabel("rareAbilities", ability, lang)}`,
      );
    }),
  );
  const rareAbilityLines =
    rareAbilityEntries.length === 0
      ? [`  ${localized(lang, "尚未觉醒 · 它目前只是普通地失控", "LOCKED · currently failing in ordinary ways")}`]
      : rareAbilityEntries.flatMap(([ability, details]) => {
          const rank = CREATURE_RARE_ABILITY_RANKS[details.rarity];
          const label = padTerminal(
            `[${rank.badge}] ${creatureLabel("rareAbilities", ability, lang)}`,
            rareAbilityLabelWidth,
          );
          const bar = `${"◆".repeat(details.level)}${"◇".repeat(CREATURE_RARE_ABILITY_MAX - details.level)}`;
          return [
            `  ${color(rank.color, label)}  ${bar} ${details.level} / ${CREATURE_RARE_ABILITY_MAX}`,
            `      ${color("2", creatureLabel("rareAbilityDescriptions", ability, lang))}`,
          ];
        });
  const rareAbilityGain = today.rareAbilityGain
    ? (() => {
        const rank =
          CREATURE_RARE_ABILITY_RANKS[today.rareAbilityGain.rarity];
        const label = `[${rank.badge}] ${creatureLabel("rareAbilities", today.rareAbilityGain.id, lang)} +${today.rareAbilityGain.points}`;
        return color(rank.color, label);
      })()
    : localized(lang, "无", "NONE");
  const rareAbilityOdds = Object.entries(CREATURE_RARE_ABILITY_CHANCES)
    .map(([rarityId, chance]) => {
      const rank = CREATURE_RARE_ABILITY_RANKS[rarityId];
      return color(rank.color, `${rank.badge} ${chance.toFixed(2)}%`);
    })
    .join(" · ");
  const achievementPreview = result.achievements.unlocked
    .slice(-4)
    .map((achievement) => achievementLabel(achievement, lang))
    .join(" · ");
  const recentAchievementPreview = result.achievements.recent
    .map((achievement) => achievementLabel(achievement, lang))
    .join(" · ");
  const ecologyGain = [
    today.ecologyGains.pollution > 0
      ? `${localized(lang, "污染性", "POLLUTION")} +${today.ecologyGains.pollution}`
      : null,
    today.ecologyGains.clarity > 0
      ? `${localized(lang, "清醒性", "CLARITY")} +${today.ecologyGains.clarity}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const fossilPreview = result.fossils.at(-1);
  const fossilMalignancyGain = Object.values(
    fossilPreview?.malignancyGains ?? {},
  ).reduce((total, value) => total + value, 0);
  const fossilLines = fossilPreview
    ? [
        `  #${fossilPreview.id} · ${generationLabel(fossilPreview.generation, lang)} · ${creatureLabel("ecologies", fossilPreview.ecologyId, lang)} · ${creatureLabel("abilities", fossilPreview.inheritanceAbilityId, lang)} · ${creatureLabel("scars", fossilPreview.scarId, lang)}${fossilMalignancyGain > 0 ? localized(lang, ` · 恶性阶 +${fossilMalignancyGain}`, ` · MALIGNANCY +${fossilMalignancyGain}`) : ""}`,
      ]
    : [`  ${localized(lang, "尚未形成 · 90 天后再来考古", "NONE · archaeology begins after day 90")}`];
  const evolutionLines = result.evolution
    ? [
        `${localized(lang, "下一代进化", "NEXT EVOLUTION")}  ${generationLabel(result.evolution.generation, lang)} · ${localized(lang, result.evolution.status === "pending" ? "待选择" : "已封存", result.evolution.status.toUpperCase())}`,
        ...(result.evolution.status === "pending"
          ? renderEvolutionOptions(result.evolution, lang)
          : [
              `${localized(lang, "进化规则", "EVOLUTION RULE")}  [${creatureLabel("evolutionCategories", result.evolution.selected.category, lang)}] ${creatureLabel("evolutions", result.evolution.selected.id, lang)} · ${localized(lang, "触发", "PROC")} ${result.evolution.selected.procChancePercent}% · ${localized(lang, `累计发作 ${result.collections.evolutionTriggers} 次`, `${result.collections.evolutionTriggers} LIFETIME PROCS`)}`,
              `  ${localized(lang, `累计收益 ${result.collections.evolutionBenefitPoints} · 累计代价 ${result.collections.evolutionCostPoints}`, `LIFETIME BENEFIT ${result.collections.evolutionBenefitPoints} · LIFETIME COST ${result.collections.evolutionCostPoints}`)}`,
            ]),
        ...(result.evolution.status === "pending"
          ? [
              `  ${localized(lang, "运行", "RUN")} anti-ai creature evolve <1|2|3>`,
            ]
          : []),
      ]
    : [];
  const casebookLines =
    result.casebook.current === null
      ? []
      : result.casebook.current.status === "pending"
        ? [
            `${localized(lang, "转折病例", "TURNING CASE")}  ${localized(lang, "待处理", "PENDING")} · ${casebookLabel("cases", result.casebook.current.caseId, lang)}`,
            `${localized(lang, "病例处置", "CASE ACTION")}  anti-ai creature intervene`,
          ]
        : [
            `${localized(lang, "病例后遗症", "CASE AFTEREFFECT")}  ${casebookLabel("marks", result.casebook.current.selected.markId, lang)}`,
          ];

  const fullLines = [
      `TOKEN MUTATION FILE · ${date}`,
      "",
      creatureArt(result),
      "",
      `${localized(lang, "标本编号", "SPECIMEN ID")}  ${result.appearance.specimenId}`,
      `☢ ${localized(lang, "今日污染剂量", "TODAY'S POLLUTION DOSE")}  +${today.pollutionDose}`,
      statusLine,
      `${localized(lang, "阶段", "STAGE")}  ${creatureLabel("stages", result.stage, lang)} · ${result.progressPercent}%`,
      `${localized(lang, "进化分支", "EVOLUTION BRANCH")}  ${creatureLabel("branches", result.branch, lang)}`,
      `${localized(lang, "生态人格", "ECOLOGY")}  ${creatureLabel("ecologies", result.ecology.type, lang)} · ${localized(lang, `污染 ${result.ecology.pollution} / 清醒 ${result.ecology.clarity}`, `pollution ${result.ecology.pollution} / clarity ${result.ecology.clarity}`)}`,
      `${localized(lang, "今日生态", "TODAY'S ECOLOGY")}  ${ecologyGain || localized(lang, "惯常波动", "HABITUAL DRIFT")}`,
      `${localized(lang, "形态", "FORM")}  ${creatureLabel("ecologyForms", result.ecologyForm, lang)}`,
      `${localized(lang, "称号", "EPITHET")}  ${creatureTitle(result, lang)}`,
      `${localized(lang, "性格", "TEMPERAMENT")}  ${creatureLabel("temperaments", result.temperament, lang)} · ${localized(lang, "心情", "MOOD")}  ${creatureLabel("moods", result.mood, lang)}`,
      `${localized(lang, "阅历", "EXPERIENCE")}  ${result.experienceDays}${result.nextStageAt === null ? localized(lang, " 天", " days") : localized(lang, ` / ${result.nextStageAt} 天`, ` / ${result.nextStageAt} days`)}`,
      `${localized(lang, "累积污染", "ACCUMULATED EXPOSURE")}  ${result.exposure}`,
      `${localized(lang, "个体记录", "SPECIMEN LOG")}  ${localized(lang, `孵化 ${result.ageDays} 天 · 活跃连击 ${result.activeStreakDays} 天`, `age ${result.ageDays} days · active streak ${result.activeStreakDays} days`)}`,
      `${localized(lang, "世代", "GENERATION")}  ${generationLabel(result.generation.number, lang)} · ${result.generation.day} / ${result.generation.length} ${localized(lang, "天", "DAYS")}`,
      `${localized(lang, "遗传", "INHERITANCE")}  ${result.generation.inheritedAbilityId ? creatureLabel("abilities", result.generation.inheritedAbilityId, lang) : localized(lang, "无", "NONE")} · ${localized(lang, "伤疤", "SCAR")}  ${result.generation.scarId ? creatureLabel("scars", result.generation.scarId, lang) : localized(lang, "无", "NONE")}`,
      `${localized(lang, "永久化石", "PERMANENT FOSSILS")}  [${result.fossils.length}]`,
      ...fossilLines,
      ...evolutionLines,
      ...casebookLines,
      `${localized(lang, "徽章", "BADGES")}  [${result.achievements.unlocked.length}] ${achievementPreview || localized(lang, "尚未解锁", "LOCKED")}`,
      `${localized(lang, "今日成就", "TODAY'S ACHIEVEMENTS")}  ${recentAchievementPreview || localized(lang, "无", "NONE")}`,
      "",
      `${localized(lang, `能力值 · Lv.${result.level}`, `ABILITIES · LV.${result.level}`)}  (${result.abilityPoints} pts)`,
      ...abilityLines,
      malignancyLine,
      `${localized(lang, "今日加点", "TODAY'S GROWTH")}  ${growth || localized(lang, "无", "NONE")}`,
      `${localized(lang, "稀有突变率", "RARE MUTATION CHANCE")}  ${result.rareChancePercent}%`,
      `${localized(lang, "畸变天赋", "MUTATION TALENTS")}  [${result.talents.length}] ${talentPreview || localized(lang, "尚未解锁", "LOCKED")}`,
      `${localized(lang, "今日解锁", "TODAY'S UNLOCKS")}  ${newTalentPreview || localized(lang, "无", "NONE")}`,
      "",
      `${localized(lang, "异色能力", "CHROMATIC ABILITIES")}  [${rareAbilityEntries.length}]`,
      ...rareAbilityLines,
      `${localized(lang, "今日异色", "TODAY'S CHROMATIC GAIN")}  ${rareAbilityGain}`,
      `${localized(lang, "每日觉醒率", "DAILY AWAKENING ODDS")}  ${rareAbilityOdds}`,
      "",
      ...eventLines,
      "",
      localized(
        lang,
        "隐私档案：只保存用量带、派生生态点、基因/部件 ID、成就、化石、进化选择、污染剂量、性状、能力与事件；不保存对话、路径、模型名或精确 Token。",
        "PRIVACY FILE: stores usage bands, derived ecology, gene/part IDs, achievements, fossils, evolution choices, dose, traits, ability gains, and events; stores no chats, paths, model names, or exact tokens.",
      ),
      "",
    ];
  const configuredWidth =
    Number(process.env.COLUMNS) || process.stdout.columns || 0;
  if (options.full || configuredWidth === 0) {
    process.stdout.write(fullLines.join("\n"));
    return;
  }

  const truncateLine = (value, width) => {
    const source = String(value);
    if (terminalWidth(source) <= width) return source;
    let output = "";
    let visible = "";
    let hasAnsi = false;
    const tokens = source.match(/\u001B\[[0-9;]*m|./gu) ?? [];
    for (const token of tokens) {
      if (token.startsWith("\u001B[")) {
        output += token;
        hasAnsi = true;
        continue;
      }
      if (terminalWidth(`${visible}${token}…`) > width) break;
      output += token;
      visible += token;
    }
    return `${output}…${hasAnsi ? "\u001B[0m" : ""}`;
  };
  const joinColumns = (left, right, leftWidth, totalWidth) => {
    const count = Math.max(left.length, right.length);
    return Array.from({ length: count }, (_, index) => {
      const leftLine = truncateLine(left[index] ?? "", leftWidth);
      const rightWidth = Math.max(10, totalWidth - leftWidth - 3);
      const rightLine = truncateLine(right[index] ?? "", rightWidth);
      return `${padTerminal(leftLine, leftWidth)} │ ${rightLine}`.trimEnd();
    });
  };
  const artLines = creatureArt(result).split("\n").filter(Boolean);
  const overviewLines = [
    `${localized(lang, "标本编号", "SPECIMEN ID")}  ${result.appearance.specimenId}`,
    `☢ ${localized(lang, "今日污染剂量", "TODAY'S POLLUTION DOSE")}  +${today.pollutionDose}`,
    statusLine,
    `${localized(lang, "阶段", "STAGE")}  ${creatureLabel("stages", result.stage, lang)} · ${result.progressPercent}%`,
    `${localized(lang, "进化分支", "EVOLUTION BRANCH")}  ${creatureLabel("branches", result.branch, lang)}`,
    `${localized(lang, "生态人格", "ECOLOGY")}  ${creatureLabel("ecologies", result.ecology.type, lang)} · ${localized(lang, `污染 ${result.ecology.pollution} / 清醒 ${result.ecology.clarity}`, `pollution ${result.ecology.pollution} / clarity ${result.ecology.clarity}`)}`,
    `${localized(lang, "形态", "FORM")}  ${creatureLabel("ecologyForms", result.ecologyForm, lang)}`,
  ];
  const stateLines = [
    `${localized(lang, "称号", "EPITHET")}  ${creatureTitle(result, lang)}`,
    `${localized(lang, "性格", "TEMPERAMENT")}  ${creatureLabel("temperaments", result.temperament, lang)} · ${localized(lang, "心情", "MOOD")} ${creatureLabel("moods", result.mood, lang)}`,
    `${localized(lang, "阅历", "EXPERIENCE")}  ${result.experienceDays}${result.nextStageAt === null ? localized(lang, " 天", " days") : localized(lang, ` / ${result.nextStageAt} 天`, ` / ${result.nextStageAt} days`)}`,
    `${localized(lang, "世代", "GENERATION")}  ${generationLabel(result.generation.number, lang)} · ${result.generation.day} / ${result.generation.length}`,
    `${localized(lang, "累积污染", "EXPOSURE")}  ${result.exposure}`,
    `${localized(lang, "徽章", "BADGES")}  [${result.achievements.unlocked.length}] ${achievementPreview || localized(lang, "尚未解锁", "LOCKED")}`,
    `${localized(lang, "畸变天赋", "MUTATION TALENTS")}  [${result.talents.length}] ${talentPreview || localized(lang, "尚未解锁", "LOCKED")}`,
  ];
  const abilityColumnWidth = Math.min(
    Math.max(43, ...abilityLines.map((line) => terminalWidth(line))),
    Math.max(43, configuredWidth - 33),
  );
  const compactLines = [
    `TOKEN MUTATION FILE · ${date}`,
    "",
    ...(configuredWidth >= 100
      ? joinColumns(artLines, overviewLines, 39, configuredWidth)
      : [...artLines, "", ...overviewLines]),
    "",
    `${localized(lang, `能力值 · Lv.${result.level}`, `ABILITIES · LV.${result.level}`)}  (${result.abilityPoints} pts)`,
    ...(configuredWidth >= 100
      ? joinColumns(
          abilityLines,
          stateLines,
          abilityColumnWidth,
          configuredWidth,
        )
      : [...abilityLines, "", ...stateLines]),
    malignancyLine,
    `${localized(lang, "今日加点", "TODAY'S GROWTH")}  ${growth || localized(lang, "无", "NONE")}`,
    `${localized(lang, "稀有突变率", "RARE MUTATION CHANCE")}  ${result.rareChancePercent}% · ${localized(lang, "每日觉醒率", "DAILY AWAKENING ODDS")} ${rareAbilityOdds}`,
    `${localized(lang, "异色能力", "CHROMATIC ABILITIES")}  [${rareAbilityEntries.length}] · ${localized(lang, "今日", "TODAY")} ${rareAbilityGain}`,
    ...eventLines,
    ...casebookLines,
    `${localized(lang, "完整病历", "FULL CASEBOOK")}  anti-ai creature --full`,
    localized(
      lang,
      "隐私档案：只保存派生成长状态；不保存对话、路径、模型名或精确 Token。",
      "PRIVACY FILE: derived growth only; no chats, paths, model names, or exact tokens.",
    ),
    "",
  ].map((line) => truncateLine(line, configuredWidth));
  process.stdout.write(compactLines.join("\n"));
}

function encounterErrorMessage(error, lang) {
  const messages = {
    missing: localized(
      lang,
      "缺少污染编码。先运行 anti-ai creature export 获取一份。",
      "Missing pollution code. Run anti-ai creature export to obtain one.",
    ),
    too_long: localized(
      lang,
      "污染编码过长，已拒绝解析。",
      "Pollution code is too long and was rejected.",
    ),
    malformed: localized(
      lang,
      "污染编码格式无效。",
      "Invalid pollution code format.",
    ),
    version: localized(
      lang,
      "污染编码版本不受支持。",
      "Unsupported pollution code version.",
    ),
    checksum: localized(
      lang,
      "污染编码校验失败；它可能被截断或篡改。",
      "Pollution code checksum failed; it may be truncated or altered.",
    ),
    payload: localized(
      lang,
      "污染编码中的标本资料无效。",
      "The pollution code contains an invalid specimen.",
    ),
    self: localized(
      lang,
      "不能让异变体和自己的污染编码发生遭遇。",
      "A mutation cannot encounter its own pollution code.",
    ),
  };
  return messages[error.code] ?? messages.malformed;
}

async function encounterContext(options) {
  const visitor = decodeSpecimenCode(options.code);
  const localContext = await runCreature(
    {
      ...options,
      action: undefined,
      command: "creature",
      json: false,
      save: false,
    },
    "context",
  );
  if (!localContext) return null;
  return {
    encounter: createSpecimenEncounter(
      localContext.result,
      visitor,
      localContext.result.date,
    ),
    state: localContext.state,
  };
}

async function runEncounter(options) {
  let context;
  try {
    context = await encounterContext(options);
  } catch (error) {
    if (!(error instanceof SpecimenCodeError)) throw error;
    process.stderr.write(`${encounterErrorMessage(error, options.lang)}\n`);
    process.exitCode = 2;
    return;
  }
  if (!context) return;
  const { encounter, state } = context;
  if (options.save) {
    const collected = saveEncounterSpecimen(state, encounter);
    await saveCreatureState(state);
    encounter.saved = true;
    encounter.alreadyCollected = !collected;
  }
  if (options.json) {
    process.stdout.write(`${JSON.stringify(encounter, null, 2)}\n`);
    return;
  }

  const lang = options.lang;
  process.stdout.write(
    [
      color(
        "1;35",
        localized(lang, "异变体接触事故", "MUTATION CONTACT INCIDENT"),
      ),
      "",
      `${localized(lang, "算力天气", "COMPUTE WEATHER")}  ${encounterLabel("weather", encounter.weather.id, lang)}`,
      `${localized(lang, "接触类型", "CONTACT TYPE")}  ${encounterLabel("type", encounter.type.id, lang)}`,
      "",
      `${localized(lang, "本地标本", "LOCAL SPECIMEN")}  #${encounter.local.specimenId} · ${creatureLabel("ecologyForms", encounter.local.formId, lang)}`,
      `${localized(lang, "外来标本", "VISITOR SPECIMEN")}  #${encounter.visitor.specimenId} · ${creatureLabel("ecologyForms", encounter.visitor.formId, lang)}`,
      "",
      creatureArt({ appearance: encounter.hybrid }),
      `${localized(lang, "混种标本", "HYBRID SPECIMEN")}  #${encounter.hybrid.fingerprint} · ${creatureLabel("ecologyForms", encounter.hybrid.formId, lang)}`,
      `  ${encounterLabel("detail", encounter.type.id, lang)}`,
      "",
      options.save
        ? encounter.alreadyCollected
          ? localized(
              lang,
              "这只混种早已入柜；本地管理员拒绝制造重复库存。",
              "This hybrid was already bottled; the local curator refused duplicate inventory.",
            )
          : localized(
              lang,
              "外来标本已入柜。它现在属于你的本地病理图鉴。",
              "Foreign specimen bottled. It now belongs to your local pathology codex.",
            )
        : localized(
            lang,
            `这次事故尚未入柜。运行 anti-ai encounter ${options.code} --save`,
            `This accident is not bottled yet. Run anti-ai encounter ${options.code} --save`,
          ),
      localized(
        lang,
        "本地演算：污染编码不包含精确 Token、模型、路径或对话。",
        "LOCAL SIMULATION: pollution codes contain no exact tokens, models, paths, or chats.",
      ),
      "",
    ].join("\n"),
  );
}

async function runDoctor(options) {
  const { lang } = options;
  const checks = await inspectLocalSources(options.source);

  const lines = [
    color("1;31", "LOCAL LOG CHECK"),
    "",
    ...checks.flatMap((check) => {
      const status =
        check.kind === "sqlite"
          ? localized(
              lang,
              check.available ? "SQLite 可读" : "未找到 SQLite",
              check.available ? "SQLite readable" : "SQLite not found",
            )
          : `${check.count} ${localized(lang, "个 JSONL 文件", check.count === 1 ? "JSONL file" : "JSONL files")}`;
      return [
        `${check.label.padEnd(12)} ${check.available ? "✓" : "✗"}  ${status} · ${check.precision[lang]}`,
        color("2", `             ${check.root}`),
      ];
    }),
    "",
    localized(
      lang,
      "只保留时间、消息 ID、模型和 usage 元数据。",
      "Keeps only timestamps, message IDs, models, and usage metadata.",
    ),
    localized(
      lang,
      "不采集、不保存、不输出会话正文。",
      "Does not collect, store, or print conversation text.",
    ),
    "",
  ];
  process.stdout.write(lines.join("\n"));
  if (
    options.source !== "all" &&
    checks.some((check) => !check.available)
  ) {
    process.exitCode = 1;
  }
}

function focusedExplain(topic, lang = "zh") {
  const sections = {
    resources: {
      zh: [
        color("1;31", "资源估算 · 公开高位参照"),
        "",
        "这些值不是实际测量，也不是统计置信区间。",
        "不同厂商案例分别计算，主账单只展示数值最高的具名案例，不把口径拼成范围。",
        "",
        color("1", "Google · 请求级生产测量"),
        "  0.24 Wh · 0.26 mL 水 · 0.03 gCO₂e / 中位文本请求",
        "  包含活跃加速器、主机、空闲容量和数据中心开销。",
        "  https://services.google.com/fh/files/misc/measuring_the_environmental_impact_of_delivering_ai_at_google_scale.pdf",
        "",
        color("1", "OpenAI · 请求级公开平均"),
        "  0.34 Wh · 0.32176 mL 水 / 平均 ChatGPT 查询",
        "  未公开模型、请求长度和完整测量边界。",
        "  https://blog.samaltman.com/the-gentle-singularity",
        "",
        color("1", "Mistral · 生命周期高位"),
        "  400 输出 tokens · 45 mL 水 · 1.14 gCO₂e",
        "  包含服务器制造等上游影响，不包含用户终端。",
        "  https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/",
        "",
        "选择逻辑：",
        "  电力 = max(请求数 × Google 0.24, 请求数 × OpenAI 0.34)",
        "  水耗 = max(请求级案例, 输出 tokens ÷ 400 × Mistral 45)",
        "  碳排 = max(请求数 × Google 0.03, 输出 tokens ÷ 400 × Mistral 1.14)",
        "",
      ],
      en: [
        color("1;31", "RESOURCE ESTIMATE · NAMED PUBLIC HIGH-SIDE REFERENCE"),
        "",
        "These values are neither measurements nor statistical confidence intervals.",
        "Each vendor case is calculated separately; the receipt shows the highest named case.",
        "",
        color("1", "Google · request-level production measurement"),
        "  0.24 Wh · 0.26 mL water · 0.03 gCO₂e / median text prompt",
        "  Includes active accelerators, hosts, idle capacity, and data-center overhead.",
        "  https://services.google.com/fh/files/misc/measuring_the_environmental_impact_of_delivering_ai_at_google_scale.pdf",
        "",
        color("1", "OpenAI · published request-level average"),
        "  0.34 Wh · 0.32176 mL water / average ChatGPT query",
        "  Model, request length, and full measurement boundary were not published.",
        "  https://blog.samaltman.com/the-gentle-singularity",
        "",
        color("1", "Mistral · lifecycle high-side case"),
        "  400 output tokens · 45 mL water · 1.14 gCO₂e",
        "  Includes upstream server manufacturing and excludes user devices.",
        "  https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/",
        "",
        "Selection:",
        "  Energy = max(requests × Google 0.24, requests × OpenAI 0.34)",
        "  Water = max(request cases, output tokens ÷ 400 × Mistral 45)",
        "  Carbon = max(requests × Google 0.03, output tokens ÷ 400 × Mistral 1.14)",
        "",
      ],
    },
    comparisons: {
      zh: [
        color("1;31", "生活翻译 · 展示假设"),
        "",
        "today · 小事务（每次 5 条）",
        "  10W LED 灯 · 19Wh 手机充电 · 550mL 饮用水 · 0.05mL 一滴水 · 平均燃油车",
        "",
        "week · 中事务（每次 5 条）",
        "  烧开 1L 水约 100Wh · 50W 笔记本 · 1kW 微波炉",
        "  7.6L/min WaterSense 淋浴 · 12.1L ENERGY STAR 洗碗机",
        "",
        "month · 大事务（每次 5 条）",
        "  244.2 gCO₂e/km 平均燃油车 · 60kgCO₂/年城市树",
        "  2.5ML 标准泳池 · 33.4kWh 美国家庭日均用电 · 150L 一缸洗澡水",
        "",
        "不足 0.01 次的大事务显示“还差多少倍”，不会舍入成 0.00。",
        "LED、手机、饮用水、烧水、电脑、微波炉、泳池和浴缸采用透明的整值展示假设。",
        "",
        "官方换算参照：",
        "  EPA WaterSense：2.0 gal/min ≈ 7.6L/min",
        "  https://www.epa.gov/watersense/showerheads",
        "  ENERGY STAR 标准洗碗机：3.2 gal/cycle ≈ 12.1L/cycle",
        "  https://www.energystar.gov/products/dishwashers/key_product_criteria",
        "  EPA 平均燃油车：3.93×10⁻⁴ metric ton CO₂e/mile ≈ 244.2g/km",
        "  EPA 城市树：0.060 metric ton CO₂/year",
        "  EPA 美国家庭用电：12,194kWh/year ≈ 33.4kWh/day",
        "  https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references",
        "",
      ],
      en: [
        color("1;31", "EVERYDAY TRANSLATION · DISPLAY ASSUMPTIONS"),
        "",
        "today · small activities (five each time)",
        "  10W LED · 19Wh phone charge · 550mL drinking water · 0.05mL drop · gas car",
        "",
        "week · medium activities (five each time)",
        "  Boil 1L water at about 100Wh · 50W laptop · 1kW microwave",
        "  7.6L/min WaterSense shower · 12.1L ENERGY STAR dishwasher",
        "",
        "month · large activities (five each time)",
        "  Gas car at 244.2 gCO₂e/km · urban tree at 60kgCO₂/year",
        "  2.5ML competition pool · 33.4kWh U.S. household electricity day · 150L bathtub",
        "",
        'Large activities below 0.01 display "times short" instead of rounding to 0.00.',
        "LED, phone, bottle, kettle, laptop, microwave, pool, and bath use transparent rounded display assumptions.",
        "",
        "Official conversion references:",
        "  EPA WaterSense: 2.0 gal/min ≈ 7.6L/min",
        "  https://www.epa.gov/watersense/showerheads",
        "  ENERGY STAR standard dishwasher: 3.2 gal/cycle ≈ 12.1L/cycle",
        "  https://www.energystar.gov/products/dishwashers/key_product_criteria",
        "  EPA average gas car: 3.93×10⁻⁴ metric ton CO₂e/mile ≈ 244.2g/km",
        "  EPA urban tree: 0.060 metric ton CO₂/year",
        "  EPA U.S. home electricity: 12,194kWh/year ≈ 33.4kWh/day",
        "  https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references",
        "",
      ],
    },
    sources: {
      zh: [
        color("1;31", "本地来源统计"),
        "",
        "Codex、Claude Code、OpenCode、OpenClaw 与 Pi 按消息/条目时间精确归因并去重。",
        "Hermes 使用会话或逐模型汇总，按最后活动日归档，因此标为会话级近似。",
        "运行 anti-ai doctor 查看各来源的本地路径、可用性与统计精度。",
        "缺少模型字段统一记为 unknown；不读取或输出会话正文。",
        "",
      ],
      en: [
        color("1;31", "LOCAL SOURCE ACCOUNTING"),
        "",
        "Codex, Claude Code, OpenCode, OpenClaw, and Pi use exact message/entry dates with deduplication.",
        "Hermes uses session or per-model aggregates assigned to the last active day, so it is approximate.",
        "Run anti-ai doctor for each source path, availability, and accounting precision.",
        "Missing model fields become unknown; conversation text is never printed.",
        "",
      ],
    },
    creature: {
      zh: [
        color("1;31", "异变体成长 · 公平玩法"),
        "",
        "每个已结算自然日只增加 1 天阅历，高 Token 不能加速生命阶段。",
        "高用量增加污染性；低用量增加清醒性；AI 清醒日增加 3 点清醒性。",
        "污染与清醒分别保留，可形成污染型、清醒型或矛盾型生态人格。",
        "普通能力每 255 点发生一次恶性增殖；累计点数不会截断，恶性阶会增强对应进化的触发率。",
        "普通事件 12 种、稀有事件 8 种；事件文案变化不会改变原有病理性状选择。",
        "每 14 个阅历日最多出现一个转折病例；污染、清醒、悖论三条路线都有收益与代价。",
        "history 压缩关键节点，prognosis 只给可解释方向，不伪造精确概率。",
        "完整档案使用全部来源；带 --source 的报告不会改写成长史。",
        "状态文件 ~/.anti-ai/creature.json 只保存派生状态和可选外来标本，不保存精确 Token 或对话。",
        "",
      ],
      en: [
        color("1;31", "CREATURE GROWTH · FAIR PLAY"),
        "",
        "Each settled calendar day adds exactly one experience day; Token volume cannot accelerate stages.",
        "High use adds Pollution, low use adds Clarity, and an AI-free day adds 3 Clarity.",
        "Pollution and Clarity persist separately, creating Polluted, Lucid, or Paradox ecologies.",
        "Regular abilities undergo malignant growth every 255 points; lifetime points are never truncated, and each rank strengthens its evolution proc chance.",
        "Twelve common and eight rare events vary the copy without changing the selected pathology trait.",
        "At most one turning-point case appears per 14 experience days; Pollution, Clarity, and Paradox routes each carry a benefit and a cost.",
        "history compresses key events, while prognosis shows explainable directions with no precise probabilities.",
        "The complete file uses all sources; --source reports never rewrite creature history.",
        "~/.anti-ai/creature.json stores derived state and optional foreign specimens, never exact tokens or conversation text.",
        "",
      ],
    },
    privacy: {
      zh: [
        color("1;31", "隐私边界"),
        "",
        "统计在本地完成，不上传原始记录。",
        "成长档案和污染编码只保存用量带/派生外观状态，不保存对话、路径、模型名、精确 Token 或逐请求时间。",
        "SVG 分享卡只写入标准输出。",
        "",
      ],
      en: [
        color("1;31", "PRIVACY BOUNDARY"),
        "",
        "Accounting stays local and raw records are never uploaded.",
        "The creature file and pollution codes store usage bands or derived appearance state, not chats, paths, model names, exact tokens, or request timestamps.",
        "SVG share cards are written to stdout only.",
        "",
      ],
    },
  };
  return sections[topic][lang].join("\n");
}

function runExplain(lang = "zh", topic = undefined) {
  if (topic) {
    process.stdout.write(focusedExplain(topic, lang));
    return;
  }
  if (lang === "en") {
    const lines = [
      color("1;31", "HOW MUCH PLANET DID YOU AUTOCOMPLETE?"),
      "",
      "Estimated resource use, not a measurement.",
      "Supported local agents do not expose measured per-request resource bills.",
      "This tool calculates named public text-inference cases separately and shows",
      "the highest case for each resource; it is not a statistical range.",
      "",
      color("1", "Google · median Gemini Apps text prompt (2025-05)"),
      "  0.24 Wh · 0.26 mL water · 0.03 gCO₂e / request",
      "  Full-stack production measurement including accelerators, hosts,",
      "  idle capacity, and data-center overhead.",
      "  https://services.google.com/fh/files/misc/measuring_the_environmental_impact_of_delivering_ai_at_google_scale.pdf",
      "",
      color("1", "OpenAI · average ChatGPT query (2025-06)"),
      "  0.34 Wh · 0.32176 mL water / request",
      "  Official statement without model, prompt-length, or measurement boundary details.",
      "  https://blog.samaltman.com/the-gentle-singularity",
      "",
      color("1", "Mistral · Le Chat / Large 2 lifecycle assessment (2025-07)"),
      "  400 output tokens · 45 mL water · 1.14 gCO₂e",
      "  Includes upstream impacts such as server manufacturing; excludes user devices.",
      "  https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/",
      "",
      color("1", "Calculations"),
      "  Electricity = max(requests × Google 0.24, requests × OpenAI 0.34)",
      "  Water = max(request-level cases, output tokens ÷ 400 × Mistral 45)",
      "  Carbon = max(requests × Google 0.03, output tokens ÷ 400 × Mistral 1.14)",
      "",
      color("1", "Model attribution"),
      "  Codex: attribute token_count to the latest turn_context.payload.model",
      "         in the same session.",
      "  Claude Code: deduplicate messages by ID, then read assistant message.model.",
      "  OpenCode: read assistant usage from message/session_message in SQLite.",
      "  OpenClaw: deduplicate assistant records across active and reset JSONL files.",
      "  Hermes: prefer per-model SQLite totals; session-level dates remain approximate.",
      "  Pi: count assistant, compaction, and branch-summary usage; deduplicate entry IDs.",
      "  Missing model fields are grouped under unknown. Conversation text is not read or printed.",
      "",
      color("1", "Personal baseline and verdicts"),
      "  Baseline = prior 7 calendar-day total ÷ 7, including days with no records",
      "  The first matching verdict wins:",
      "  CONTEXT HOARDING: requests ≤ 1.2× baseline and tokens/request ≥ 1.8×",
      "  REQUEST BARRAGE: requests ≥ 2× baseline",
      "  CACHE OFFENSE: cached reads are at least 70% of input and at least",
      "                 10 percentage points above the personal baseline",
      "  DIGITAL DETOX: total tokens ≤ 30% of baseline",
      "  COMPUTE BINGE: total tokens ≥ 1.5× baseline",
      "  Otherwise show STEADY BURN; zero usage and missing history have dedicated verdicts.",
      "  Verdicts are generated by fixed local rules; same-category titles and copy",
      "  rotate deterministically by date.",
      "  Each category combines 11 charge titles with 13 detail lines, producing",
      "  143 deterministic combinations before an identical pair repeats.",
      "  Rotation continues across month boundaries and does not reset on day one.",
      "",
      color("1", "Mutation system"),
      "  The first anti-ai creature run backfills the latest 30 calendar days.",
      "  Later runs fill the entire date gap since the previous visit.",
      "  Daily pollution dose = min(100, max(1, round(log10(daily tokens + 1) × 12))).",
      "  Days with no tokens have dose 0.",
      "  Experience grows by 1 for every settled calendar day; high Token use cannot",
      "  accelerate life stages. Stages begin at 1, 7, 30, and 90 experience days.",
      "  Relative to the prior seven-day baseline, high use adds 1–3 POLLUTION;",
      "  low use adds 1–2 CLARITY; an AI-free day adds 3 CLARITY.",
      "  POLLUTION and CLARITY are retained separately, forming UNFORMED, POLLUTED,",
      "  LUCID, or PARADOX ecology. A candidate must persist for 3 settled days",
      "  before the visible ecology changes.",
      "  Branch traits: CONTEXT uses uncached input per request; CACHE uses the",
      "  cached-read share of input; FRENZY uses request count; NUCLEAR is the",
      "  fallback when no specialized trait dominates.",
      "    context += dose × min(1, uncached input ÷ requests ÷ 100,000)",
      "    cache   += dose × min(1, cached reads ÷ total input)",
      "    frenzy  += dose × min(1, requests ÷ 50)",
      "    nuclear += dose × (1 - 0.6 × max(context, cache, frenzy intensity))",
      "  ASCII appearance combines a stable local genome, life stage, usage pathology,",
      "  ecology, achievement parts, and chromatic mutations. The same file is stable;",
      "  different local seeds produce different specimens.",
      "  Twenty-four achievements are split evenly across OFFENSE, SOBRIETY, and PARADOX badges;",
      "  repeatable badges grow through three behavior-based tiers without exact Token totals.",
      "  anti-ai codex derives 50 fixed entries plus private, foreign, fossil, selected case, and culture specimens from schema v9.",
      "  Locked human entries remain ???; JSON exposes stable IDs and discovery dates.",
      "  Seven abilities grow: TOKEN APPETITE, PARASITIC MEMORY, CACHE CARAPACE,",
      "  REQUEST MAWS, CORE GLOW, INSTABILITY, and WITHDRAWAL.",
      "  Visible ability values run from 1–255. Point 256 becomes MALIGNANT I · 1/255;",
      "  lifetime points remain lossless. Active days add 1–2 APPETITE, 1 point to the",
      "  dominant usage ability, a 25% seeded random bonus, and 1 event-linked point.",
      "  INSTABILITY adds 1 percentage point to the rare-mutation chance per 10 points,",
      "  starting at 8% rare mutation chance and capped at 20%.",
      "  Ability values unlock mutation talents at 5, 15, 30, 60, 120, and 220.",
      "  Chromatic abilities awaken independently on active days: R 0.50%, SR 0.10%,",
      "  and SSR 0.02%. Drawing the same one again grows it, up to level 9.",
      "  One event is selected with SHA-256(local seed + date); a base 8% enters the rare pool.",
      "  A common event adds 8 to one trait; a rare event adds 20.",
      "  After the first active day, each AI-free day reduces exposure by 2",
      "  and adds 1 WITHDRAWAL without clearing historical traits.",
      "  Every 90 experience days seal one permanent fossil with that generation's",
      "  ability gains, sealed snapshot, and new malignancy ranks. The next generation",
      "  restarts its four life stages while inheriting one ability and one scar.",
      "  Each new generation offers one POLLUTION, one CLARITY, and one PARADOX choice.",
      "  anti-ai creature evolve <1|2|3> seals the choice; ignoring it never blocks reports.",
      "  Proc chance = min(35%, 5% + min(10, floor(lifetime ability ÷ 25))",
      "  + 2% per unlocked talent + 2% per malignancy rank).",
      "  Higher talent tiers amplify both the benefit and its cost; there is no free upgrade.",
      "  Every 14 experience days may offer at most one turning-point case from 12",
      "  local case skeletons. POLLUTION, CLARITY, and PARADOX choices each seal one",
      "  benefit and one cost; an unanswered case does not build a choice backlog.",
      "  anti-ai creature history compresses stages, mutations, badges, and case choices;",
      "  --full expands privacy-safe daily bands. prognosis previews three explainable",
      "  directions with LEADING/POSSIBLE/LATENT labels, never precise probabilities.",
      "  State: ~/.anti-ai/creature.json (schema v9; schema v1-v8 migrate locally)",
      "  It stores only usage bands, derived ecology points, genes/part IDs, achievements,",
      "  fossils, evolution choices, turning-point cases, derived cultures and ingredient",
      "  references, dose, traits, ability/chromatic gains, events, and a",
      "  local seed—not chats, paths, model names, exact tokens, or per-request timestamps.",
      "  anti-ai creature reset explicitly destroys this file.",
      "",
      color("1", "Pollution laboratory"),
      "  The lab references saved foreign specimens, permanent fossils, and selected",
      "  case slices. It presents three deterministic formulas for the current batch.",
      "  Incubation does not consume materials and does not change growth, abilities, or ecology.",
      "  Cultures add private collection variety without creating a Token-powered shortcut.",
      "  Use anti-ai lab incubate <1|2|3> only after the user chooses a formula.",
      "",
      color("1", "Living casebook"),
      "  Complete-source human week reports settle creature history and append the",
      "  primary symptom, Ecology change, stage growth, new badges, and an attending note.",
      "  Complete-source human month reports append a monthly follow-up with post-hatch",
      "  observation totals, Ecology transition, growth, achievements, collections, and a conclusion.",
      "  Complete-source today/week/month reports surface collection discoveries.",
      "  Source-filtered week/month reports stay usage-only and do not alter creature history.",
      "",
      color("1", "Everyday comparisons"),
      "  10W LED light: electricity Wh ÷ 10W = hours lit",
      "  50W laptop: electricity Wh ÷ 50W = hours running",
      "  19Wh phone charge: electricity Wh ÷ 19Wh = charges",
      "  0.05mL water drop and 550mL bottle: water mL ÷ each capacity",
      "  Boil 1L water: electricity Wh ÷ 100Wh = boils",
      "  1kW microwave: electricity Wh ÷ 1,000W = hours running",
      "  WaterSense shower: water mL ÷ 7,600mL/min = minutes",
      "  ENERGY STAR dishwasher: water mL ÷ 12,100mL = cycles",
      "  Month scale also shows a 2.5ML pool, 33.4kWh U.S. household day, and 150L bath.",
      '  Values below 0.01 large activities display "times short" instead of 0.00.',
      "",
      "  Average gas car: US EPA equivalency factor of 244.2 g CO₂e/km",
      "  Driving distance = carbon gCO₂e ÷ 244.2",
      "  https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references",
      "",
      "  Urban tree: US EPA estimate of about 60 kg CO₂/year",
      "  Tree time = carbon gCO₂e ÷ 60,000 × 365 days",
      "  Species, age, and what happens after felling vary too much, so this tool",
      "  reports sequestration time instead of claiming a number of trees cut down.",
      "  https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references",
      "",
      "  U.S. household electricity: EPA 12,194kWh/year ÷ 365 ≈ 33.4kWh/day",
      "  https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references",
      "",
      color("1", "Share card"),
      "  anti-ai share uses the same estimate formulas and fixed local verdict rules.",
      "  anti-ai share --card pathology creates a complete-source mutation pathology card.",
      "  specimen, wanted, fossil, encounter, prognosis, and culture add privacy-safe collection cards.",
      "  creature export and encounter exchange only derived appearance IDs; all mixing stays local.",
      "  The share card omits chats, paths, model names, and exact token counts.",
      "  Every card also omits source names and request counts.",
      "  The SVG is written to stdout and is not uploaded anywhere.",
      "",
      "These named public cases are directional references, not local model telemetry.",
      "",
      color(
        "2",
        "AI is excellent at generating answers. Vendors are still working on utility bills.",
      ),
      "",
    ];
    process.stdout.write(lines.join("\n"));
    return;
  }

  const lines = [
    color("1;31", "HOW MUCH PLANET DID YOU AUTOCOMPLETE?"),
    "",
    "资源消耗估算，不是实际测量值。",
    "受支持的本地 Agent 都没有公开逐请求资源账单。本工具把具名公开案例",
    "分别计算，每项资源只展示数值最高的案例；这不是统计区间。",
    "",
    color("1", "Google · Gemini Apps 中位文本请求（2025-05）"),
    "  0.24 Wh · 0.26 mL 水 · 0.03 gCO₂e / 请求",
    "  生产环境全栈测量，包含加速器、主机、空闲容量和机房开销。",
    "  https://services.google.com/fh/files/misc/measuring_the_environmental_impact_of_delivering_ai_at_google_scale.pdf",
    "",
    color("1", "OpenAI · 平均 ChatGPT 查询（2025-06）"),
    "  0.34 Wh · 0.32176 mL 水 / 请求",
    "  官方声明，但没有公开模型、请求长度和测量边界。",
    "  https://blog.samaltman.com/the-gentle-singularity",
    "",
    color("1", "Mistral · Le Chat / Large 2 生命周期评估（2025-07）"),
    "  400 输出 tokens · 45 mL 水 · 1.14 gCO₂e",
    "  包含服务器制造等上游影响，不包含用户终端。",
    "  https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/",
    "",
    color("1", "计算"),
    "  电力 = max(请求数 × Google 0.24, 请求数 × OpenAI 0.34)",
    "  水耗 = max(请求级案例, 输出 tokens ÷ 400 × Mistral 45)",
    "  碳排 = max(请求数 × Google 0.03, 输出 tokens ÷ 400 × Mistral 1.14)",
    "",
    color("1", "模型统计"),
    "  Codex：将 token_count 归属到同一会话中最近的 turn_context.payload.model",
    "  Claude Code：消息按 ID 去重后，读取 assistant message.model",
    "  OpenCode：从 SQLite message/session_message 读取 assistant usage",
    "  OpenClaw：跨活动与 reset JSONL 按消息 ID 去重",
    "  Hermes：优先读取逐模型 SQLite 汇总；日期仍是会话级近似",
    "  Pi：统计 assistant、compaction、branch_summary，并按 entry ID 去重",
    "  缺少模型字段时统一显示 unknown；不读取或输出会话正文。",
    "",
    color("1", "个人基线与判词"),
    "  基线 = 过去 7 个自然日总量 ÷ 7，包含无记录日",
    "  判词按以下顺序命中第一条：",
    "  上下文囤积：请求数不高于基线 1.2 倍，且单次 Token 不低于 1.8 倍",
    "  请求连发：请求数不低于基线 2 倍",
    "  缓存类罪名：缓存读取占输入至少 70%，且高出个人基线至少 10 个百分点",
    "  电子戒断：Token 总量不高于基线 30%",
    "  算力暴食：Token 总量不低于基线 1.5 倍",
    "  其余情况显示“稳定消耗”；无请求或无历史时使用专用判词。",
    "  判词由本地固定规则生成，不调用模型；同类罪名标题和文案按日期固定轮换。",
    "  每类判词由 11 个罪名标题与 13 条详情组合，完整组合有 143 种后才会原样重复。",
    "  跨月轮换不会重置，会连续进入下一组组合。",
    "",
    color("1", "污染进化系统"),
    "  首次运行回看最近 30 个自然日。",
    "  后续运行会补齐两次查看之间的全部日期空档。",
    "  污染剂量 = min(100, max(1, round(log10(当日 Token + 1) × 12)))，每日上限 100。",
    "  当日没有 Token 时污染剂量为 0。",
    "  阅历：每个已结算自然日 +1；高 Token 消耗不能加速生命阶段。",
    "  生命阶段从第 1、7、30、90 个阅历日开始。",
    "  相对过去 7 日基线，高用量增加 1–3 点污染性，低用量增加 1–2 点清醒性，",
    "  AI 清醒日增加 3 点清醒性。",
    "  污染性和清醒性分别保留，形成未定型、污染型、清醒型、矛盾型；",
    "  候选状态需连续 3 个已结算日成立，才会正式改变生态人格。",
    "  上下文病变：非缓存输入的单次平均量；缓存化石：缓存读取占比；",
    "  请求增殖：请求数；核食：没有专门性状占优时的高剂量兜底。",
    "    上下文 += 污染剂量 × min(1, 非缓存输入 ÷ 请求数 ÷ 100,000)",
    "    缓存   += 污染剂量 × min(1, 缓存读取 ÷ 总输入)",
    "    请求   += 污染剂量 × min(1, 请求数 ÷ 50)",
    "    核食   += 污染剂量 × (1 - 0.6 × max(上下文、缓存、请求强度))",
    "  ASCII 外观由稳定本地基因、生命阶段、使用病型、生态人格、成就部件和异色突变共同拼装。",
    "  同一档案稳定生成同一标本，不同本地 seed 尽量生成不同个体。",
    "  首批 24 项成就平均分为罪证章、戒断章、悖论章三类；可重复成就按行为次数成长为三级，",
    "  不使用精确 Token 作为等级条件。anti-ai codex 从 schema v9 派生 50 项固定收藏、动态/外来标本、化石、已封存病例切片和培养物。",
    "  人类输出的锁定项保持 ???，JSON 提供稳定 ID 和发现日期。",
    "  7 个能力值：吞噬欲、赘生脑回、化石甲、请求口器、核素亮度、失控指数、戒断反应。",
    "  普通能力按 255 点循环：第 256 点显示为“恶性 I · 1/255”，累计点数不会截断。",
    "  活跃日获得 1–2 点吞噬欲、1 点主使用能力、25% 确定性随机加点和 1 点事件关联能力。",
    "  失控指数每 10 点让稀有突变率增加 1 个百分点，基础 8%，上限 20%。",
    "  能力值达到 5、15、30、60、120、220 时解锁对应的畸变天赋。",
    "  异色能力在活跃日独立觉醒：R 0.50%、SR 0.10%、SSR 0.02%；重复觉醒同一能力会升级，最高 9 级。",
    "  每日事件由 SHA-256（本地 seed + 日期）确定，基础 8% 进入稀有突变池。",
    "  普通事件给一个性状 +8，稀有事件 +20。",
    "  首个活跃日之后，每个 AI 清醒日污染 -2、戒断反应 +1，但不会清除历史性状。",
    "  每 90 个阅历日封存一枚永久化石，同时记录该代能力增量、封存快照和新增恶性阶；",
    "  下一代重新经历四个生命阶段，继承上一代的一项能力和一道伤疤。",
    "  每代提供污染、清醒、悖论三选一；运行 anti-ai creature evolve <1|2|3> 显式确认，不选择也不会阻断账单。",
    "  触发概率 = min(35%, 5% + min(10, floor(累计能力值 ÷ 25)) + 每项已解锁天赋 2% + 每个恶性阶 2%)。",
    "  高阶天赋会同时放大收益与代价，不存在无成本的最优进化。",
    "  每 14 个阅历日最多出现一个转折病例，从 12 个本地病例骨架中确定性选择。",
    "  污染、清醒、悖论三条路线各有收益与代价；未处理病例不会堆积成待办列表。",
    "  anti-ai creature history 压缩阶段、突变、徽章和病例选择；--full 展开隐私安全的逐日用量带。",
    "  prognosis 使用“主导/可能/潜伏”预演三条可解释方向，不伪造精确概率。",
    "  状态文件：~/.anti-ai/creature.json（schema v9；schema v1-v8 在本地幂等迁移）",
    "  只保存用量带、派生生态点、基因/部件 ID、成就、化石、进化选择、转折病例、培养物及素材引用、污染剂量、性状、能力与异色加点、事件和本地 seed；",
    "  不保存精确 Token、模型名、路径、对话或逐请求时间。",
    "  anti-ai creature reset 会显式销毁档案。",
    "",
    color("1", "污染实验室"),
    "  实验室只引用已保存的外来标本、永久化石和已选择的病例切片，",
    "  每批给出三份确定性配方。培养不会消耗素材，也不会改变成长、能力或生态。",
    "  培养物只增加私有收藏差异，不提供靠 Token 刷出的升级捷径。",
    "  用户选定配方后，再运行 anti-ai lab incubate <1|2|3>。",
    "",
    color("1", "活体病历"),
    "  完整来源的 week 会结算成长史，追加主症状、生态变化、阶段成长、新徽章和主治意见。",
    "  完整来源的 month 会追加月度复诊，汇总孵化后的有效观察、生态迁移、成长、成就、收藏和结论。",
    "  完整来源的 today/week/month 都会展示对应周期的新增收藏。",
    "  带来源过滤的 week/month 只展示用量，不改动完整成长史。",
    "",
    color("1", "生活化对照"),
    "  10W LED 灯：电力 Wh ÷ 10W = 点灯小时数",
    "  50W 笔记本电脑：电力 Wh ÷ 50W = 使用小时数",
    "  19Wh 手机充电：电力 Wh ÷ 19Wh = 充电次数",
    "  0.05mL 一滴水、550mL 饮用水：水耗 mL ÷ 对应容量",
    "  烧开 1L 水：电力 Wh ÷ 100Wh = 烧水壶数",
    "  1kW 微波炉：电力 Wh ÷ 1,000W = 运行小时数",
    "  WaterSense 淋浴：水耗 mL ÷ 7,600mL/min = 淋浴分钟数",
    "  ENERGY STAR 洗碗机：水耗 mL ÷ 12,100mL = 运行次数",
    "  月度还展示 250 万升泳池、33.4kWh 美国家庭日均用电和 150L 一缸洗澡水。",
    "  大事务不足 0.01 次时显示“还差多少倍”，不会舍入成 0.00。",
    "",
    "  平均燃油车：EPA 等效换算因子 244.2 g CO₂e/公里",
    "  驾车距离 = 碳排 gCO₂e ÷ 244.2",
    "  https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references",
    "",
    "  城市树：EPA 约 60 kg CO₂/年",
    "  树木时间 = 碳排 gCO₂e ÷ 60,000 × 365 天",
    "  树种、树龄和砍伐后的碳去向差异很大，因此不换算成“砍了几棵树”。",
    "  https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references",
    "",
    "  美国家庭用电：EPA 12,194kWh/年 ÷ 365 ≈ 33.4kWh/天",
    "  https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references",
    "",
    color("1", "分享卡片"),
    "  anti-ai share 使用相同的资源估算公式和本地固定判词。",
    "  anti-ai share --card pathology 使用完整成长史生成异变体病理报告。",
    "  specimen、wanted、fossil、encounter、prognosis、culture 提供隐私安全的收藏卡。",
    "  creature export 与 encounter 只交换派生外观 ID，全部混合都在本地完成。",
    "  所有卡片都不包含对话、路径、模型名或精确 Token，也不包含来源名和请求数；SVG 只写入标准输出，不会上传。",
    "",
    "这些具名公开案例只提供方向性参照，不是本地模型遥测。",
    "",
    color("2", "AI 很擅长生成答案，厂商还不太擅长生成电费单。"),
    "",
  ];
  process.stdout.write(lines.join("\n"));
}

function runHelp(target, lang = "zh") {
  const output =
    target.length === 0
      ? renderTopLevelHelp(lang)
      : renderCommandHelp(target, lang);
  if (output === null) {
    process.stderr.write(
      `${localized(lang, `未知命令：${target.join(" ")}`, `Unknown command: ${target.join(" ")}`)}\n`,
    );
    process.exitCode = 2;
    return;
  }
  process.stdout.write(output);
}

const rawArgs = process.argv.slice(2);
const options = parseArgs(rawArgs);
const helpAlias = options.command === "help";
const helpTarget = helpAlias
  ? rawArgs
      .slice(1)
      .filter(
        (arg, index, args) =>
          !["--help", "-h", "--lang"].includes(arg) &&
          args[index - 1] !== "--lang",
      )
  : options.command && !options.command.startsWith("-")
    ? [
        options.command,
        ...(["creature", "lab"].includes(options.command) && options.action
          ? [options.action]
          : []),
      ]
    : [];
const helpRequested =
  helpAlias ||
  options.command === "--help" ||
  options.command === "-h" ||
  rawArgs.includes("--help") ||
  rawArgs.includes("-h");
const versionRequested =
  options.command === "--version" ||
  options.command === "-v" ||
  rawArgs.includes("--version") ||
  rawArgs.includes("-v");

if (helpRequested) {
  runHelp(helpTarget, options.lang);
} else if (versionRequested) {
  process.stdout.write(`anti-ai ${VERSION}\n`);
} else if (options.missing) {
  process.stderr.write(
    `${localized(options.lang, `参数 ${options.missing} 缺少值`, `Option ${options.missing} requires a value`)}\n`,
  );
  process.exitCode = 2;
} else if (options.unknown.length > 0) {
  process.stderr.write(
    `${localized(options.lang, `未知参数：${options.unknown[0]}`, `Unknown option: ${options.unknown[0]}`)}\n`,
  );
  process.exitCode = 2;
} else if (!["zh", "en"].includes(options.lang)) {
  process.stderr.write(`不支持的语言：${options.lang}\n`);
  process.exitCode = 2;
} else if (
  ![
    "all",
    "codex",
    "claude",
    "opencode",
    "openclaw",
    "hermes",
    "pi",
  ].includes(options.source)
) {
  process.stderr.write(
    `${localized(options.lang, `不支持的数据源：${options.source}`, `Unsupported data source: ${options.source}`)}\n`,
  );
  process.exitCode = 2;
} else if (
  options.card !== undefined &&
  (options.command !== "share" ||
    ![
      "receipt",
      "pathology",
      "specimen",
      "wanted",
      "fossil",
      "encounter",
      "prognosis",
      "culture",
    ].includes(options.card))
) {
  process.stderr.write(
    `${localized(options.lang, `不支持的分享卡：${options.card}`, `Unsupported share card: ${options.card}`)}\n`,
  );
  process.exitCode = 2;
} else if (
  options.command === "share" &&
  options.card === "encounter" &&
  !options.with
) {
  process.stderr.write(
    `${localized(options.lang, "遭遇分享卡需要 --with <污染编码>。", "Encounter cards require --with <pollution-code>.")}\n`,
  );
  process.exitCode = 2;
} else if (
  options.command === "share" &&
  ["pathology", "specimen", "wanted", "fossil", "encounter", "prognosis", "culture"].includes(
    options.card,
  ) &&
  options.source !== "all"
) {
  process.stderr.write(
    `${localized(options.lang, "异变体收藏卡必须使用完整数据源；请移除 --source 过滤。", "Mutation collection cards require the complete data set; remove the --source filter.")}\n`,
  );
  process.exitCode = 2;
} else if (options.command === "creature" && options.source !== "all") {
  process.stderr.write(
    `${localized(options.lang, "creature 必须使用完整数据源；请移除 --source 过滤。", "creature requires the complete data set; remove the --source filter.")}\n`,
  );
  process.exitCode = 2;
} else if (options.command === "encounter" && options.source !== "all") {
  process.stderr.write(
    `${localized(options.lang, "encounter 必须使用完整数据源；请移除 --source 过滤。", "encounter requires the complete data set; remove the --source filter.")}\n`,
  );
  process.exitCode = 2;
} else if (options.command === "lab" && options.source !== "all") {
  process.stderr.write(
    `${localized(options.lang, "lab 必须使用完整数据源；请移除 --source 过滤。", "lab requires the complete data set; remove the --source filter.")}\n`,
  );
  process.exitCode = 2;
} else if (options.command === "codex" && options.source !== "all") {
  process.stderr.write(
    `${localized(options.lang, "codex 必须使用完整数据源；请移除 --source 过滤。", "codex requires the complete data set; remove the --source filter.")}\n`,
  );
  process.exitCode = 2;
} else if (rawArgs.includes("--date") && !isValidDate(options.date)) {
  process.stderr.write(
    `${localized(options.lang, `无效日期：${options.date}`, `Invalid date: ${options.date}`)}\n`,
  );
  process.exitCode = 2;
} else if (options.command === "today") {
  await runToday(options);
} else if (options.command === "week") {
  await runWeek(options);
} else if (options.command === "month") {
  await runMonth(options);
} else if (options.command === "codex") {
  await runCodex(options);
} else if (options.command === "share") {
  await runShare(options);
} else if (options.command === "creature") {
  await runCreature(options);
} else if (options.command === "encounter") {
  await runEncounter(options);
} else if (options.command === "lab") {
  await runLaboratory(options);
} else if (options.command === "doctor") {
  await runDoctor(options);
} else if (options.command === "explain") {
  runExplain(options.lang, options.topic);
} else {
  process.stderr.write(
    `Usage: anti-ai <today|week|month|codex|share|creature|encounter|lab|doctor|explain> [--date YYYY-MM-DD] [--source all|codex|claude|opencode|openclaw|hermes|pi] [--lang zh|en] [--json]\n`,
  );
  process.exitCode = 1;
}
