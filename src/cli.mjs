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
  creatureEvent,
  creatureEvolutionEffect,
  creatureEvolutionSummary,
  creatureLabel,
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
  renderMonth,
  renderPathologyShareSvg,
  renderReceipt,
  renderShareSvg,
  renderWeek,
  shiftDate,
  terminalWidth,
} from "./reporting.mjs";
import {
  jsonlFiles,
  localDate,
  reportsForDates,
  sourceRoots,
} from "./scanner.mjs";
import { localized } from "./shared.mjs";

const require = createRequire(import.meta.url);
const { version: VERSION } = require("../package.json");
const ACHIEVEMENT_CATEGORY_COLORS = {
  offense: "1;31",
  sobriety: "1;36",
  paradox: "1;33",
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
    card: undefined,
    action: undefined,
    choice: undefined,
    unknown: [],
    missing: undefined,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--json") {
      options.json = true;
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
    } else if (
      command === "creature" &&
      ["reset", "evolve"].includes(arg) &&
      options.action === undefined
    ) {
      options.action = arg;
    } else if (
      command === "creature" &&
      options.action === "evolve" &&
      options.choice === undefined &&
      !arg.startsWith("-")
    ) {
      options.choice = arg;
    } else if (!["--help", "-h", "--version", "-v"].includes(arg)) {
      options.unknown.push(arg);
    }
  }

  return options;
}

function renderCreatureTodaySummary(creature, lang) {
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
  return `${localized(lang, "异变体", "MUTATION")}  ${gains || localized(lang, "惯常波动", "habitual drift")} · ${localized(lang, `仍为「${form}」`, `still “${form}”`)} · ${localized(lang, "今日成就", "today's achievements")} ${achievements || localized(lang, "无", "none")}${milestones.length > 0 ? ` · ${milestones.join(" · ")}` : ""}\n`;
}

function renderCreatureCasebook(casebook, lang) {
  const achievements = casebook.achievementIds
    .map((id) => creatureLabel("achievements", id, lang))
    .join(" · ");
  return [
    localized(
      lang,
      `活体病历 · ${casebook.startDate.slice(5)} → ${casebook.endDate.slice(5)}`,
      `LIVING CASEBOOK · ${casebook.startDate.slice(5)} → ${casebook.endDate.slice(5)}`,
    ),
    `${localized(lang, "本周主症状", "PRIMARY SYMPTOM")}  ${creatureLabel("clinicalSymptoms", casebook.primarySymptom, lang)} · ${casebook.symptomDays} ${localized(lang, "天", casebook.symptomDays === 1 ? "day" : "days")}`,
    `${localized(lang, "生态变化", "ECOLOGY CHANGE")}  ${localized(lang, `污染 +${casebook.ecology.pollutionDelta} · 清醒 +${casebook.ecology.clarityDelta}`, `pollution +${casebook.ecology.pollutionDelta} · clarity +${casebook.ecology.clarityDelta}`)}`,
    `${localized(lang, "成长记录", "GROWTH RECORD")}  ${localized(lang, `阅历 +${casebook.growth.experienceDelta}`, `experience +${casebook.growth.experienceDelta}`)} · ${creatureLabel("stages", casebook.growth.stageFrom, lang)} → ${creatureLabel("stages", casebook.growth.stageTo, lang)}`,
    `${localized(lang, "世代", "GENERATION")}  ${generationLabel(casebook.growth.generationFrom, lang)} → ${generationLabel(casebook.growth.generationTo, lang)} · ${localized(lang, "永久化石", "PERMANENT FOSSILS")} +${casebook.growth.fossilsSealed}`,
    `${localized(lang, "新增徽章", "NEW BADGES")}  ${achievements || localized(lang, "无", "NONE")}`,
    `${localized(lang, "主治意见", "ATTENDING NOTE")}  ${creatureClinicalNote(casebook, lang, "week")}`,
    "",
  ].join("\n");
}

function renderCreatureAutopsy(casebook, lang) {
  const achievements = casebook.achievementIds
    .map((id) => creatureLabel("achievements", id, lang))
    .join(" · ");
  const dayUnit = (count) =>
    localized(lang, `${count} 天`, `${count} ${count === 1 ? "day" : "days"}`);
  return [
    localized(
      lang,
      `月度尸检 · ${casebook.endDate.slice(0, 7)}`,
      `MONTHLY AUTOPSY · ${casebook.endDate.slice(0, 7)}`,
    ),
    `${localized(lang, "有效观察", "VALID OBSERVATION")}  ${dayUnit(casebook.observedDays)} · ${localized(lang, `${casebook.activeDays} 天活跃`, `${casebook.activeDays} active`)} · ${localized(lang, `${casebook.quietDays} 天清醒`, `${casebook.quietDays} AI-free`)}`,
    `${localized(lang, "主症状", "PRIMARY SYMPTOM")}  ${creatureLabel("clinicalSymptoms", casebook.primarySymptom, lang)} · ${dayUnit(casebook.symptomDays)}`,
    `${localized(lang, "生态人格", "ECOLOGY")}  ${creatureLabel("ecologies", casebook.ecology.from, lang)} → ${creatureLabel("ecologies", casebook.ecology.to, lang)} · ${localized(lang, `污染 +${casebook.ecology.pollutionDelta} · 清醒 +${casebook.ecology.clarityDelta}`, `pollution +${casebook.ecology.pollutionDelta} · clarity +${casebook.ecology.clarityDelta}`)}`,
    `${localized(lang, "成长回顾", "GROWTH REVIEW")}  ${localized(lang, `阅历 +${casebook.growth.experienceDelta}`, `experience +${casebook.growth.experienceDelta}`)} · ${creatureLabel("stages", casebook.growth.stageFrom, lang)} → ${creatureLabel("stages", casebook.growth.stageTo, lang)}`,
    `${localized(lang, "世代", "GENERATION")}  ${generationLabel(casebook.growth.generationFrom, lang)} → ${generationLabel(casebook.growth.generationTo, lang)} · ${localized(lang, "永久化石", "PERMANENT FOSSILS")} +${casebook.growth.fossilsSealed}`,
    `${localized(lang, "成就回顾", "ACHIEVEMENT REVIEW")}  [${casebook.achievementIds.length}] ${achievements || localized(lang, "无", "NONE")}`,
    `${localized(lang, "尸检结论", "AUTOPSY CONCLUSION")}  ${creatureClinicalNote(casebook, lang, "month")}`,
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
    const receipt = renderReceipt(
      reports.at(-1),
      reports.slice(0, -1),
      options.lang,
    );
    const creature =
      options.source === "all"
        ? await runCreature(
            {
              ...options,
              action: undefined,
              command: "creature",
              json: false,
            },
            "result",
          )
        : null;
    process.stdout.write(
      `${receipt}${creature ? `\n${renderCreatureTodaySummary(creature, options.lang)}` : ""}`,
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
    `${renderWeek(reports, options.lang)}${casebook ? `\n${renderCreatureCasebook(casebook, options.lang)}` : ""}`,
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
    `${renderMonth(reports, options.lang)}${autopsy ? `\n${renderCreatureAutopsy(autopsy, options.lang)}` : ""}`,
  );
}

async function runShare(options) {
  if (options.card === "pathology") {
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
        `${localized(options.lang, "病理报告无法读取异变体档案。运行 anti-ai creature reset 后可重新孵化。", "The pathology card cannot read the mutation file. Run anti-ai creature reset to hatch again.")}\n`,
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
    process.stdout.write(
      renderPathologyShareSvg(
        {
          date: creature.date,
          specimenId: creature.appearance.specimenId,
          art: creatureArt(creature),
          ecology: creatureLabel(
            "ecologies",
            creature.ecology.type,
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
        },
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
        previousCreature.abilities.instability,
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
  await saveCreatureState(state);

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
  };

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
  const abilityLabelWidth = Math.max(
    ...CREATURE_ABILITY_KEYS.map((ability) =>
      terminalWidth(creatureLabel("abilities", ability, lang)),
    ),
  );
  const abilityLines = CREATURE_ABILITY_KEYS.map((ability) => {
    const label = padTerminal(
      creatureLabel("abilities", ability, lang),
      abilityLabelWidth,
    );
    return `  ${label}  ${creatureAbilityBar(result.abilities[ability])} ${String(result.abilities[ability]).padStart(3, " ")} / ${CREATURE_ABILITY_MAX}`;
  });
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
  const fossilLines = fossilPreview
    ? [
        `  #${fossilPreview.id} · ${generationLabel(fossilPreview.generation, lang)} · ${creatureLabel("ecologies", fossilPreview.ecologyId, lang)} · ${creatureLabel("abilities", fossilPreview.inheritanceAbilityId, lang)} · ${creatureLabel("scars", fossilPreview.scarId, lang)}`,
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

  process.stdout.write(
    [
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
      `${localized(lang, "徽章", "BADGES")}  [${result.achievements.unlocked.length}] ${achievementPreview || localized(lang, "尚未解锁", "LOCKED")}`,
      `${localized(lang, "今日成就", "TODAY'S ACHIEVEMENTS")}  ${recentAchievementPreview || localized(lang, "无", "NONE")}`,
      "",
      `${localized(lang, `能力值 · Lv.${result.level}`, `ABILITIES · LV.${result.level}`)}  (${result.abilityPoints} pts)`,
      ...abilityLines,
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
    ].join("\n"),
  );
}

async function countJsonl(root) {
  let count = 0;
  for await (const _file of jsonlFiles(root)) count += 1;
  return count;
}

async function runDoctor(options) {
  const { lang } = options;
  const roots = sourceRoots();
  const checks = [];

  if (options.source === "all" || options.source === "codex") {
    checks.push({
      label: "Codex",
      root: roots.codex,
      count: await countJsonl(roots.codex),
    });
  }
  if (options.source === "all" || options.source === "claude") {
    checks.push({
      label: "Claude Code",
      root: roots.claude,
      count: await countJsonl(roots.claude),
    });
  }

  const lines = [
    color("1;31", "LOCAL LOG CHECK"),
    "",
    ...checks.flatMap((check) => [
      `${check.label.padEnd(12)} ${check.count > 0 ? "✓" : "✗"}  ${check.count} ${localized(lang, "个 JSONL 文件", check.count === 1 ? "JSONL file" : "JSONL files")}`,
      color("2", `             ${check.root}`),
    ]),
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
  if (checks.some((check) => check.count === 0)) process.exitCode = 1;
}

function runExplain(lang = "zh") {
  if (lang === "en") {
    const lines = [
      color("1;31", "HOW MUCH PLANET DID YOU AUTOCOMPLETE?"),
      "",
      "Estimated resource use, not a measurement.",
      "Codex and Claude Code do not expose measured per-request resource bills.",
      "This tool uses published text-inference examples as references; it cannot",
      "prove that your actual consumption falls inside the displayed range.",
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
      "  Electricity range = requests × [0.24, 0.34] Wh",
      "  Water references = requests × 0.26 / 0.32176 mL,",
      "                     and output tokens ÷ 400 × 45 mL; show min/max",
      "  Carbon references = requests × 0.03 gCO₂e,",
      "                      and output tokens ÷ 400 × 1.14 gCO₂e; show min/max",
      "",
      color("1", "Model attribution"),
      "  Codex: attribute token_count to the latest turn_context.payload.model",
      "         in the same session.",
      "  Claude Code: deduplicate messages by ID, then read assistant message.model.",
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
      "  Each category combines 7 charge titles with 5 detail lines, producing",
      "  35 deterministic combinations before an identical pair repeats.",
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
      "  Appearance fingerprints are stored idempotently as private specimen records for a future codex.",
      "  Seven abilities grow: TOKEN APPETITE, PARASITIC MEMORY, CACHE CARAPACE,",
      "  REQUEST MAWS, CORE GLOW, INSTABILITY, and WITHDRAWAL.",
      "  Ability values cap at 999: active days add 1–2 APPETITE, 1 point to the",
      "  dominant usage ability, a 25% seeded random bonus, and 1 event-linked point.",
      "  INSTABILITY adds 1 percentage point to the rare-mutation chance per 10 points,",
      "  starting at 8% rare mutation chance and capped at 20%.",
      "  Ability values unlock mutation talents at 5, 15, 30, 100, 300, and 700.",
      "  Chromatic abilities awaken independently on active days: R 0.50%, SR 0.10%,",
      "  and SSR 0.02%. Drawing the same one again grows it, up to level 9.",
      "  One event is selected with SHA-256(local seed + date); a base 8% enters the rare pool.",
      "  A common event adds 8 to one trait; a rare event adds 20.",
      "  After the first active day, each AI-free day reduces exposure by 2",
      "  and adds 1 WITHDRAWAL without clearing historical traits.",
      "  Every 90 experience days seal one permanent fossil. The next generation",
      "  restarts its four life stages while inheriting one ability and one scar.",
      "  Each new generation offers one POLLUTION, one CLARITY, and one PARADOX choice.",
      "  anti-ai creature evolve <1|2|3> seals the choice; ignoring it never blocks reports.",
      "  Proc chance = min(35%, 5% + floor(ability ÷ 25) + 2% per unlocked talent).",
      "  Higher talent tiers amplify both the benefit and its cost; there is no free upgrade.",
      "  State: ~/.anti-ai/creature.json (schema v5)",
      "  It stores only usage bands, derived ecology points, genes/part IDs, achievements,",
      "  fossils, evolution choices, dose, traits, ability/chromatic gains, events, and a",
      "  local seed—not chats, paths, model names, exact tokens, or per-request timestamps.",
      "  anti-ai creature reset explicitly destroys this file.",
      "",
      color("1", "Living casebook"),
      "  Complete-source human week reports settle creature history and append the",
      "  primary symptom, Ecology change, stage growth, new badges, and an attending note.",
      "  Complete-source human month reports append a monthly autopsy with post-hatch",
      "  observation totals, Ecology transition, growth, achievements, and a conclusion.",
      "  Source-filtered week/month reports stay usage-only and do not alter creature history.",
      "",
      color("1", "Everyday comparisons"),
      "  10W LED light: electricity Wh ÷ 10W = hours lit",
      "  50W laptop: electricity Wh ÷ 50W = hours running",
      "  15Wh phone charge: electricity Wh ÷ 15Wh = charges",
      "  Boil 1L of water: electricity Wh ÷ 100Wh = boils",
      "  250mL cup of water: water mL ÷ 250 = cups",
      "  550mL water bottle: water mL ÷ 550 = bottles",
      "  6L toilet flush: water mL ÷ 6,000 = flushes",
      "  8L/min shower: water mL ÷ 8,000 = shower minutes",
      "  Electricity uses the range upper bound: <15 Wh LED, <1,500 Wh phone, otherwise boiling.",
      "  Water uses the range upper bound: <550 mL bottle share, <8,000 mL bottles, otherwise shower.",
      "  These power, capacity, and flow values are display assumptions, not measurement standards.",
      "",
      "  Average gas car: US EPA estimate of about 400 g CO₂/mile, or 248.55 g CO₂/km",
      "  Driving distance = carbon gCO₂e ÷ 248.55",
      "  https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle",
      "",
      "  Urban tree: US EPA estimate of about 60 kg CO₂/year",
      "  Tree time = carbon gCO₂e ÷ 60,000 × 365 days",
      "  Species, age, and what happens after felling vary too much, so this tool",
      "  reports sequestration time instead of claiming a number of trees cut down.",
      "  https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references",
      "",
      color("1", "Share card"),
      "  anti-ai share uses the same estimate formulas and fixed local verdict rules.",
      "  anti-ai share --card pathology creates a complete-source mutation pathology card.",
      "  The share card omits chats, paths, model names, and exact token counts.",
      "  Both card types also omit source names and request counts.",
      "  The SVG is written to stdout and is not uploaded anywhere.",
      "",
      "These values are not statistical confidence intervals; they span public cases",
      "that are not directly comparable.",
      `Confidence: ${color("1;31", "LOW")}`,
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
    "Codex 和 Claude Code 没有公开逐请求资源账单，本工具只能拿其他",
    "厂商披露的文本推理口径做参照，不能证明你的实际消耗落在区间内。",
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
    "  电力跨度 = 请求数 × [0.24, 0.34] Wh",
    "  水耗参照 = 请求数 × 0.26 / 0.32176 mL，",
    "             以及输出 tokens ÷ 400 × 45 mL，取公开口径最小/最大值",
    "  碳排参照 = 请求数 × 0.03 gCO₂e，",
    "             以及输出 tokens ÷ 400 × 1.14 gCO₂e，取最小/最大值",
    "",
    color("1", "模型统计"),
    "  Codex：将 token_count 归属到同一会话中最近的 turn_context.payload.model",
    "  Claude Code：消息按 ID 去重后，读取 assistant message.model",
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
    "  每类判词由 7 个罪名标题与 5 条详情组合，完整组合至少有 35 种后才会原样重复。",
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
    "  不使用精确 Token 作为等级条件。外观指纹会幂等保存为个人标本，为未来图鉴预留数据。",
    "  7 个能力值：吞噬欲、赘生脑回、化石甲、请求口器、核素亮度、失控指数、戒断反应。",
    "  能力上限 999：活跃日获得 1–2 点吞噬欲、1 点主使用能力、25% 确定性随机加点和 1 点事件关联能力。",
    "  失控指数每 10 点让稀有突变率增加 1 个百分点，基础 8%，上限 20%。",
    "  能力值达到 5、15、30、100、300、700 时解锁对应的畸变天赋。",
    "  异色能力在活跃日独立觉醒：R 0.50%、SR 0.10%、SSR 0.02%；重复觉醒同一能力会升级，最高 9 级。",
    "  每日事件由 SHA-256（本地 seed + 日期）确定，基础 8% 进入稀有突变池。",
    "  普通事件给一个性状 +8，稀有事件 +20。",
    "  首个活跃日之后，每个 AI 清醒日污染 -2、戒断反应 +1，但不会清除历史性状。",
    "  每 90 个阅历日封存一枚永久化石；下一代重新经历四个生命阶段，继承上一代的一项能力和一道伤疤。",
    "  每代提供污染、清醒、悖论三选一；运行 anti-ai creature evolve <1|2|3> 显式确认，不选择也不会阻断账单。",
    "  触发概率 = min(35%, 5% + floor(对应能力值 ÷ 25) + 每项已解锁天赋 2%)。",
    "  高阶天赋会同时放大收益与代价，不存在无成本的最优进化。",
    "  状态文件：~/.anti-ai/creature.json（schema v5）",
    "  只保存用量带、派生生态点、基因/部件 ID、成就、化石、进化选择、污染剂量、性状、能力与异色加点、事件和本地 seed；",
    "  不保存精确 Token、模型名、路径、对话或逐请求时间。",
    "  anti-ai creature reset 会显式销毁档案。",
    "",
    color("1", "活体病历"),
    "  完整来源的 week 会结算成长史，追加主症状、生态变化、阶段成长、新徽章和主治意见。",
    "  完整来源的 month 会追加月度尸检，汇总孵化后的有效观察、生态迁移、成长、成就和结论。",
    "  带来源过滤的 week/month 只展示用量，不改动完整成长史。",
    "",
    color("1", "生活化对照"),
    "  10W LED 灯：电力 Wh ÷ 10W = 点灯小时数",
    "  50W 笔记本电脑：电力 Wh ÷ 50W = 使用小时数",
    "  15Wh 手机充电：电力 Wh ÷ 15Wh = 充电次数",
    "  烧开 1L 水：电力 Wh ÷ 100Wh = 烧水壶数",
    "  250mL 水杯：水耗 mL ÷ 250 = 杯数",
    "  550mL 矿泉水：水耗 mL ÷ 550 = 瓶数",
    "  6L 节水马桶：水耗 mL ÷ 6,000 = 冲水次数",
    "  8L/min 淋浴：水耗 mL ÷ 8,000 = 淋浴分钟数",
    "  电力对照按区间上界选择：< 15 Wh 用 LED，< 1,500 Wh 用手机，否则用烧水",
    "  水耗对照按区间上界选择：< 550 mL 显示一瓶比例，< 8,000 mL 显示瓶数，否则用淋浴",
    "  上述功率、容量和流量都是展示假设，不是环境测量标准。",
    "",
    "  平均燃油车：EPA 约 400 g CO₂/英里，即 248.55 g CO₂/公里",
    "  驾车距离 = 碳排 gCO₂e ÷ 248.55",
    "  https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle",
    "",
    "  城市树：EPA 约 60 kg CO₂/年",
    "  树木时间 = 碳排 gCO₂e ÷ 60,000 × 365 天",
    "  树种、树龄和砍伐后的碳去向差异很大，因此不换算成“砍了几棵树”。",
    "  https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references",
    "",
    color("1", "分享卡片"),
    "  anti-ai share 使用相同的资源估算公式和本地固定判词。",
    "  anti-ai share --card pathology 使用完整成长史生成异变体病理报告。",
    "  两类卡片都不包含对话、路径、模型名或精确 Token，也不会包含来源名和请求数；SVG 只写入标准输出，不会上传。",
    "",
    "这些值不是统计置信区间，只是不可直接比较的公开案例跨度。",
    `置信度：${color("1;31", "低")}`,
    "",
    color("2", "AI 很擅长生成答案，厂商还不太擅长生成电费单。"),
    "",
  ];
  process.stdout.write(lines.join("\n"));
}

function runHelp(lang = "zh") {
  if (lang === "en") {
    process.stdout.write(`Usage: anti-ai <command> [options]

Turn local AI tokens into an uncomfortable resource bill.

Commands:
  today             Print today's AI resource receipt
  week              Print the latest seven-day trend
  month             Print this month's usage heatmap through a selected date
  share             Print a privacy-safe SVG share card
  creature [reset|evolve]  Inspect, evolve, or reset your mutation file
  doctor            Check local log sources
  explain           Explain resource estimate methodology

Options:
  --date <YYYY-MM-DD>             Select today date or week/month end date
  --source <all|codex|claude>     Filter log source (default: all)
  --lang <zh|en>                  Select human-readable output language (default: zh)
  --card <receipt|pathology>      Select the share card type (default: receipt)
  --json                          Print machine-readable today or creature data
  -v, --version                   Show version
  -h, --help                      Show help
`);
    return;
  }

  process.stdout.write(`Usage: anti-ai <command> [options]

把本地 AI Token 变成一张不太令人愉快的资源账单。

Commands:
  today             打印今天的 AI 资源账单
  week              打印最近 7 天趋势
  month             打印本月至指定日期的用量热力图
  share             输出隐私安全的 SVG 分享卡片
  creature [reset|evolve]  查看、进化或重置异变体档案
  doctor            检查本地日志
  explain           解释资源估算口径

Options:
  --date <YYYY-MM-DD>             指定 today 日期，或 week/month 结束日期
  --source <all|codex|claude>     过滤日志来源（默认 all）
  --lang <zh|en>                  选择人类可读输出语言（默认 zh）
  --card <receipt|pathology>      选择分享卡类型（默认 receipt）
  --json                          today 或 creature 输出机器可读数据
  -v, --version                   显示版本
  -h, --help                      显示帮助
`);
}

const rawArgs = process.argv.slice(2);
const options = parseArgs(rawArgs);
const helpRequested =
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
  runHelp(options.lang);
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
} else if (!["all", "codex", "claude"].includes(options.source)) {
  process.stderr.write(
    `${localized(options.lang, `不支持的数据源：${options.source}`, `Unsupported data source: ${options.source}`)}\n`,
  );
  process.exitCode = 2;
} else if (
  options.card !== undefined &&
  (options.command !== "share" ||
    !["receipt", "pathology"].includes(options.card))
) {
  process.stderr.write(
    `${localized(options.lang, `不支持的分享卡：${options.card}`, `Unsupported share card: ${options.card}`)}\n`,
  );
  process.exitCode = 2;
} else if (
  options.command === "share" &&
  options.card === "pathology" &&
  options.source !== "all"
) {
  process.stderr.write(
    `${localized(options.lang, "病理报告必须使用完整数据源；请移除 --source 过滤。", "Pathology cards require the complete data set; remove the --source filter.")}\n`,
  );
  process.exitCode = 2;
} else if (options.command === "creature" && options.source !== "all") {
  process.stderr.write(
    `${localized(options.lang, "creature 必须使用完整数据源；请移除 --source 过滤。", "creature requires the complete data set; remove the --source filter.")}\n`,
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
} else if (options.command === "share") {
  await runShare(options);
} else if (options.command === "creature") {
  await runCreature(options);
} else if (options.command === "doctor") {
  await runDoctor(options);
} else if (options.command === "explain") {
  runExplain(options.lang);
} else {
  process.stderr.write(
    `Usage: anti-ai <today|week|month|share|creature|doctor|explain> [--date YYYY-MM-DD] [--source all|codex|claude] [--lang zh|en] [--json]\n`,
  );
  process.exitCode = 1;
}
