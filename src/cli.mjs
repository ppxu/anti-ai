import { rm } from "node:fs/promises";
import { createRequire } from "node:module";

import {
  CREATURE_ABILITY_KEYS,
  CREATURE_ABILITY_MAX,
  CREATURE_COPY,
  CREATURE_RARE_ABILITY_CHANCES,
  CREATURE_RARE_ABILITY_MAX,
  CREATURE_RARE_ABILITY_RANKS,
  creatureAbilityBar,
  creatureAbilityGains,
  creatureArt,
  creatureEvent,
  creatureLabel,
  creatureMood,
  creatureRareAbilityGain,
  creatureStatePath,
  dailyCreatureRecord,
  deriveCreature,
  loadCreatureState,
  roundCreature,
  saveCreatureState,
} from "./creature.mjs";
import {
  color,
  formatTokens,
  inclusiveDateRange,
  isValidDate,
  padTerminal,
  renderMonth,
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

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {
    command,
    date: undefined,
    source: "all",
    lang: "zh",
    json: false,
    action: undefined,
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
    } else if (
      command === "creature" &&
      arg === "reset" &&
      options.action === undefined
    ) {
      options.action = arg;
    } else if (!["--help", "-h", "--version", "-v"].includes(arg)) {
      options.unknown.push(arg);
    }
  }

  return options;
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
    process.stdout.write(
      renderReceipt(reports.at(-1), reports.slice(0, -1), options.lang),
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
  process.stdout.write(renderWeek(reports, options.lang));
}

async function runMonth(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const endDate = options.date ?? localDate(new Date(), timezone);
  const dayCount = Number(endDate.slice(8));
  const dates = Array.from({ length: dayCount }, (_, index) =>
    `${endDate.slice(0, 8)}${String(index + 1).padStart(2, "0")}`,
  );
  const reports = await reportsForDates(options, dates, timezone);
  process.stdout.write(renderMonth(reports, options.lang));
}

async function runShare(options) {
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

async function runCreature(options) {
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
  const reports = await reportsForDates(options, dates, timezone);

  for (const report of reports) {
    const previousCreature = deriveCreature(
      state,
      shiftDate(report.date, -1),
    );
    const record = dailyCreatureRecord(report);
    if (record.active) {
      const event = creatureEvent(
        state.seed,
        report.date,
        previousCreature.abilities.instability,
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
    record.rareAbilityGain = creatureRareAbilityGain(
      state.seed,
      report.date,
      record.active,
    );
    state.days[report.date] = record;
  }
  await saveCreatureState(state);

  const creature = deriveCreature(state, date);
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
      event: today.event,
      abilityGains: today.abilityGains,
      rareAbilityGain: today.rareAbilityGain,
      newTalents,
    },
  };

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

  process.stdout.write(
    [
      `TOKEN MUTATION FILE · ${date}`,
      "",
      creatureArt(result.branch),
      "",
      `☢ ${localized(lang, "今日污染剂量", "TODAY'S POLLUTION DOSE")}  +${today.pollutionDose}`,
      statusLine,
      `${localized(lang, "阶段", "STAGE")}  ${creatureLabel("stages", result.stage, lang)} · ${result.progressPercent}%`,
      `${localized(lang, "进化分支", "EVOLUTION BRANCH")}  ${creatureLabel("branches", result.branch, lang)}`,
      `${localized(lang, "形态", "FORM")}  ${creatureLabel("forms", result.form, lang)}`,
      `${localized(lang, "称号", "EPITHET")}  ${creatureLabel("epithets", result.epithet, lang)}`,
      `${localized(lang, "性格", "TEMPERAMENT")}  ${creatureLabel("temperaments", result.temperament, lang)} · ${localized(lang, "心情", "MOOD")}  ${creatureLabel("moods", result.mood, lang)}`,
      `${localized(lang, "累积污染", "ACCUMULATED EXPOSURE")}  ${result.exposure}${result.nextStageAt === null ? "" : ` / ${result.nextStageAt}`}`,
      `${localized(lang, "个体记录", "SPECIMEN LOG")}  ${localized(lang, `孵化 ${result.ageDays} 天 · 活跃连击 ${result.activeStreakDays} 天`, `age ${result.ageDays} days · active streak ${result.activeStreakDays} days`)}`,
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
        "隐私档案：只保存污染剂量、性状、能力与异色加点和事件；不保存对话、路径、模型名或精确 Token。",
        "PRIVACY FILE: stores dose, traits, ability/chromatic gains, and events; stores no chats, paths, model names, or exact tokens.",
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
      "",
      color("1", "Mutation system"),
      "  The first anti-ai creature run backfills the latest 30 calendar days.",
      "  Later runs fill the entire date gap since the previous visit.",
      "  Daily pollution dose = min(100, max(1, round(log10(daily tokens + 1) × 12))).",
      "  Days with no tokens have dose 0.",
      "  Branch traits: CONTEXT uses uncached input per request; CACHE uses the",
      "  cached-read share of input; FRENZY uses request count; NUCLEAR is the",
      "  fallback when no specialized trait dominates.",
      "    context += dose × min(1, uncached input ÷ requests ÷ 100,000)",
      "    cache   += dose × min(1, cached reads ÷ total input)",
      "    frenzy  += dose × min(1, requests ÷ 50)",
      "    nuclear += dose × (1 - 0.6 × max(context, cache, frenzy intensity))",
      "  Four stages begin at exposure 0, 50, 150, and 350.",
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
      "  State: ~/.anti-ai/creature.json",
      "  It stores only dose, traits, ability/chromatic gains, events, and a local seed—not chats, paths,",
      "  model names, exact tokens, or per-request timestamps.",
      "  anti-ai creature reset explicitly destroys this file.",
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
      "  It omits chats, paths, model names, and exact token counts.",
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
    "",
    color("1", "污染进化系统"),
    "  首次运行回看最近 30 个自然日。",
    "  后续运行会补齐两次查看之间的全部日期空档。",
    "  污染剂量 = min(100, max(1, round(log10(当日 Token + 1) × 12)))，每日上限 100。",
    "  当日没有 Token 时污染剂量为 0。",
    "  上下文病变：非缓存输入的单次平均量；缓存化石：缓存读取占比；",
    "  请求增殖：请求数；核食：没有专门性状占优时的高剂量兜底。",
    "    上下文 += 污染剂量 × min(1, 非缓存输入 ÷ 请求数 ÷ 100,000)",
    "    缓存   += 污染剂量 × min(1, 缓存读取 ÷ 总输入)",
    "    请求   += 污染剂量 × min(1, 请求数 ÷ 50)",
    "    核食   += 污染剂量 × (1 - 0.6 × max(上下文、缓存、请求强度))",
    "  4 个阶段的累计污染阈值分别是 0、50、150、350。",
    "  7 个能力值：吞噬欲、赘生脑回、化石甲、请求口器、核素亮度、失控指数、戒断反应。",
    "  能力上限 999：活跃日获得 1–2 点吞噬欲、1 点主使用能力、25% 确定性随机加点和 1 点事件关联能力。",
    "  失控指数每 10 点让稀有突变率增加 1 个百分点，基础 8%，上限 20%。",
    "  能力值达到 5、15、30、100、300、700 时解锁对应的畸变天赋。",
    "  异色能力在活跃日独立觉醒：R 0.50%、SR 0.10%、SSR 0.02%；重复觉醒同一能力会升级，最高 9 级。",
    "  每日事件由 SHA-256（本地 seed + 日期）确定，基础 8% 进入稀有突变池。",
    "  普通事件给一个性状 +8，稀有事件 +20。",
    "  首个活跃日之后，每个 AI 清醒日污染 -2、戒断反应 +1，但不会清除历史性状。",
    "  状态文件：~/.anti-ai/creature.json",
    "  只保存污染剂量、性状、能力与异色加点、事件和本地 seed；不保存对话、路径、模型名、精确 Token 或逐请求时间。",
    "  anti-ai creature reset 会显式销毁档案。",
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
    "  不包含对话、路径、模型名或精确 Token；SVG 只写入标准输出，不会上传。",
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
  creature [reset]  Inspect or reset your mutation file
  doctor            Check local log sources
  explain           Explain resource estimate methodology

Options:
  --date <YYYY-MM-DD>             Select today date or week/month end date
  --source <all|codex|claude>     Filter log source (default: all)
  --lang <zh|en>                  Select human-readable output language (default: zh)
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
  creature [reset]  查看或重置异变体档案
  doctor            检查本地日志
  explain           解释资源估算口径

Options:
  --date <YYYY-MM-DD>             指定 today 日期，或 week/month 结束日期
  --source <all|codex|claude>     过滤日志来源（默认 all）
  --lang <zh|en>                  选择人类可读输出语言（默认 zh）
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
