#!/usr/bin/env node

import { createReadStream } from "node:fs";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

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

function localized(lang, zh, en) {
  return lang === "en" ? en : zh;
}

function emptyUsage() {
  return {
    requests: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  };
}

const CREATURE_STAGES = [
  {
    id: "contaminated_embryo",
    threshold: 0,
    nextAt: 50,
  },
  {
    id: "mutated_juvenile",
    threshold: 50,
    nextAt: 150,
  },
  {
    id: "runaway_adult",
    threshold: 150,
    nextAt: 350,
  },
  {
    id: "catastrophe_complete",
    threshold: 350,
    nextAt: null,
  },
];

const CREATURE_FORMS = {
  context: [
    "context_polyp",
    "context_sarcoma",
    "memory_devourer",
    "infinite_dossier_matrix",
  ],
  cache: [
    "cache_moss",
    "cache_fossil_beast",
    "fossil_armor_tyrant",
    "archive_extinction",
  ],
  frenzy: [
    "request_spore",
    "request_hydra",
    "concurrency_centipede",
    "api_calamity",
  ],
  nuclear: [
    "compute_embryo",
    "reactor_hatchling",
    "nuclear_feeder",
    "compute_meltdown",
  ],
};

const COMMON_CREATURE_EVENTS = [
  {
    id: "misplaced_context",
    trait: "context",
    delta: 8,
  },
  {
    id: "cache_calcification",
    trait: "cache",
    delta: 8,
  },
  {
    id: "request_budding",
    trait: "frenzy",
    delta: 8,
  },
  {
    id: "reactor_leak",
    trait: "nuclear",
    delta: 8,
  },
];

const RARE_CREATURE_EVENTS = [
  {
    id: "infinite_appendix",
    trait: "context",
    delta: 20,
  },
  {
    id: "fossil_crown",
    trait: "cache",
    delta: 20,
  },
  {
    id: "second_mouth",
    trait: "frenzy",
    delta: 20,
  },
  {
    id: "black_core",
    trait: "nuclear",
    delta: 20,
  },
];

const CREATURE_COPY = {
  stages: {
    contaminated_embryo: {
      zh: "污染胚体 I",
      en: "CONTAMINATED EMBRYO I",
    },
    mutated_juvenile: {
      zh: "病变幼体 II",
      en: "MUTATED JUVENILE II",
    },
    runaway_adult: {
      zh: "失控成体 III",
      en: "RUNAWAY ADULT III",
    },
    catastrophe_complete: {
      zh: "灾变完全体 IV",
      en: "CATASTROPHE COMPLETE IV",
    },
  },
  branches: {
    context: {
      zh: "上下文病变系",
      en: "CONTEXT PATHOLOGY",
    },
    cache: {
      zh: "缓存化石系",
      en: "CACHE FOSSIL",
    },
    frenzy: {
      zh: "请求增殖系",
      en: "REQUEST PROLIFERATION",
    },
    nuclear: {
      zh: "核食系",
      en: "NUCLEAR FEEDER",
    },
  },
  forms: {
    context_polyp: { zh: "上下文息肉", en: "CONTEXT POLYP" },
    context_sarcoma: { zh: "上下文肉瘤", en: "CONTEXT SARCOMA" },
    memory_devourer: { zh: "记忆吞噬兽", en: "MEMORY DEVOURER" },
    infinite_dossier_matrix: {
      zh: "无限卷宗母体",
      en: "INFINITE DOSSIER MATRIX",
    },
    cache_moss: { zh: "缓存苔藓", en: "CACHE MOSS" },
    cache_fossil_beast: { zh: "缓存化石兽", en: "CACHE FOSSIL BEAST" },
    fossil_armor_tyrant: {
      zh: "化石甲暴君",
      en: "FOSSIL ARMOR TYRANT",
    },
    archive_extinction: { zh: "档案灭绝体", en: "ARCHIVE EXTINCTION" },
    request_spore: { zh: "请求孢子", en: "REQUEST SPORE" },
    request_hydra: { zh: "请求九头虫", en: "REQUEST HYDRA" },
    concurrency_centipede: {
      zh: "并发蜈蚣",
      en: "CONCURRENCY CENTIPEDE",
    },
    api_calamity: { zh: "API 天灾", en: "API CALAMITY" },
    compute_embryo: { zh: "算力胚胎", en: "COMPUTE EMBRYO" },
    reactor_hatchling: { zh: "反应堆幼兽", en: "REACTOR HATCHLING" },
    nuclear_feeder: { zh: "核食巨兽", en: "NUCLEAR FEEDER BEAST" },
    compute_meltdown: { zh: "算力熔毁体", en: "COMPUTE MELTDOWN" },
  },
  events: {
    misplaced_context: {
      name: { zh: "误食上下文", en: "MISPLACED CONTEXT" },
      body: {
        zh: "它在日志缝里捡到一段没人记得为什么还在的上下文。",
        en: "It found a context fragment nobody remembers keeping.",
      },
    },
    cache_calcification: {
      name: { zh: "缓存钙化", en: "CACHE CALCIFICATION" },
      body: {
        zh: "缓存残渣在背甲里钙化，敲一下能听见旧上下文的回声。",
        en: "Cached residue hardened into armor that echoes old context.",
      },
    },
    request_budding: {
      name: { zh: "请求出芽", en: "REQUEST BUDDING" },
      body: {
        zh: "一次普通调用从侧面长出了另一张等待回复的嘴。",
        en: "One ordinary call grew another mouth waiting for a reply.",
      },
    },
    reactor_leak: {
      name: { zh: "反应堆渗漏", en: "REACTOR LEAK" },
      body: {
        zh: "没有人承认那团荧光来自哪里，但它今晚更亮了。",
        en: "Nobody admits where the glow came from, but it is brighter tonight.",
      },
    },
    infinite_appendix: {
      name: { zh: "无限附录", en: "INFINITE APPENDIX" },
      body: {
        zh: "稀有突变：正文结束后，又长出了一个永远读不完的附录。",
        en: "Rare mutation: an appendix appeared after the ending and never stops.",
      },
    },
    fossil_crown: {
      name: { zh: "化石王冠", en: "FOSSIL CROWN" },
      body: {
        zh: "稀有突变：缓存碎片排列成王冠，统治的仍然是旧答案。",
        en: "Rare mutation: cache shards formed a crown over yesterday's answers.",
      },
    },
    second_mouth: {
      name: { zh: "第二张嘴", en: "SECOND MOUTH" },
      body: {
        zh: "稀有突变：第一张嘴还没收到回复，第二张已经开始追问。",
        en: "Rare mutation: the second mouth followed up before the first got an answer.",
      },
    },
    black_core: {
      name: { zh: "黑色核心", en: "BLACK CORE" },
      body: {
        zh: "稀有突变：胸腔里出现一个不在任何资源账单上的小型核心。",
        en: "Rare mutation: a small unmetered core appeared in its chest.",
      },
    },
  },
};

function creatureEvent(seed, date) {
  const digest = createHash("sha256").update(`${seed}:${date}`).digest();
  const rare = digest.readUInt32BE(0) % 100 < 8;
  const pool = rare ? RARE_CREATURE_EVENTS : COMMON_CREATURE_EVENTS;
  const event = pool[digest.readUInt32BE(4) % pool.length];
  return {
    ...event,
    rarity: rare ? "rare" : "common",
  };
}

function creatureLabel(group, id, lang) {
  return CREATURE_COPY[group][id][lang];
}

function creatureArt(branch) {
  const art = {
    context: [
      "          _________",
      "      ___/  ◉   ◉  \\___",
      "    <[[[     ∞      ]]]>",
      "       \\___|||||___/",
      "          /_/ \\_\\",
    ],
    cache: [
      "        .#########.",
      "      _/ []  []  []\\_",
      "     /___  ◉__◉  ___\\",
      "         \\_||||_/",
      "          /_||_\\",
    ],
    frenzy: [
      "       (◉) (◉) (◉)",
      "        \\___|___/",
      "     (◉)-{|||||}-(◉)",
      "          / | \\",
      "         /_/ \\_\\",
    ],
    nuclear: [
      "          /\\  /\\",
      "      ___/  \\/  \\___",
      "     /   ◉   ☢   ◉   \\",
      "    <       ___       >",
      "     \\__/_/   \\_\\__/",
    ],
  };
  return art[branch].map((line) => color("1;31", line)).join("\n");
}

function roundCreature(value) {
  return Number(value.toFixed(2));
}

function pollutionDose(totalTokens) {
  if (totalTokens <= 0) return 0;
  return Math.min(100, Math.max(1, Math.round(Math.log10(totalTokens + 1) * 12)));
}

function dailyCreatureRecord(report) {
  const { totals } = report;
  const dose = pollutionDose(totals.totalTokens);
  if (dose === 0) {
    return {
      pollutionDose: 0,
      active: false,
      traits: {
        context: 0,
        cache: 0,
        frenzy: 0,
        nuclear: 0,
      },
    };
  }

  const requests = Math.max(1, totals.requests);
  const uncachedInput = Math.max(
    0,
    totals.inputTokens -
      totals.cachedInputTokens -
      totals.cacheWriteInputTokens,
  );
  const averageInput = uncachedInput / requests;
  const contextIntensity = Math.min(1, averageInput / 100_000);
  const cacheIntensity =
    totals.inputTokens === 0
      ? 0
      : Math.min(1, totals.cachedInputTokens / totals.inputTokens);
  const frenzyIntensity = Math.min(1, totals.requests / 50);
  const dominantIntensity = Math.max(
    contextIntensity,
    cacheIntensity,
    frenzyIntensity,
  );

  return {
    pollutionDose: dose,
    active: true,
    traits: {
      context: roundCreature(dose * contextIntensity),
      cache: roundCreature(dose * cacheIntensity),
      frenzy: roundCreature(dose * frenzyIntensity),
      nuclear: roundCreature(dose * (1 - dominantIntensity * 0.6)),
    },
  };
}

function creatureStatePath() {
  return path.join(os.homedir(), ".anti-ai", "creature.json");
}

async function loadCreatureState() {
  try {
    const contents = await readFile(creatureStatePath(), "utf8");
    const state = JSON.parse(contents);
    if (state?.schemaVersion === 1 && state.days) {
      state.seed ??=
        process.env.ANTI_AI_CREATURE_SEED ?? randomBytes(8).toString("hex");
      return state;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return {
    schemaVersion: 1,
    seed:
      process.env.ANTI_AI_CREATURE_SEED ?? randomBytes(8).toString("hex"),
    days: {},
  };
}

async function saveCreatureState(state) {
  const target = creatureStatePath();
  const directory = path.dirname(target);
  const temporary = path.join(directory, `.creature-${process.pid}.tmp`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporary, target);
}

function deriveCreature(state, date) {
  const entries = Object.entries(state.days)
    .filter(([entryDate]) => entryDate <= date)
    .sort(([left], [right]) => left.localeCompare(right));
  const traits = {
    context: 0,
    cache: 0,
    frenzy: 0,
    nuclear: 0,
  };
  let exposure = 0;
  let activeDays = 0;
  let quietStreakDays = 0;

  for (const [, day] of entries) {
    if (day.active) {
      exposure += day.pollutionDose;
      activeDays += 1;
      quietStreakDays = 0;
      for (const key of Object.keys(traits)) traits[key] += day.traits[key];
    } else if (activeDays > 0) {
      exposure = Math.max(0, exposure - 2);
      quietStreakDays += 1;
    }
  }

  for (const key of Object.keys(traits)) traits[key] = roundCreature(traits[key]);
  const branch = Object.entries(traits).sort(
    ([leftKey, left], [rightKey, right]) =>
      right - left || leftKey.localeCompare(rightKey),
  )[0][0];
  const resolvedBranch = activeDays === 0 ? "nuclear" : branch;
  const stageIndex = CREATURE_STAGES.findLastIndex(
    (stage) => exposure >= stage.threshold,
  );
  const stage = CREATURE_STAGES[stageIndex];
  const progressPercent =
    stage.nextAt === null
      ? 100
      : Math.min(
          100,
          Math.round(
            ((exposure - stage.threshold) / (stage.nextAt - stage.threshold)) *
              100,
          ),
        );

  return {
    stage: stage.id,
    branch: resolvedBranch,
    form: CREATURE_FORMS[resolvedBranch][stageIndex],
    exposure,
    nextStageAt: stage.nextAt,
    progressPercent,
    quietStreakDays,
    observedDays: entries.length,
    activeDays,
    traits,
  };
}

function addUsage(target, usage) {
  for (const key of Object.keys(target)) {
    target[key] += usage[key] ?? 0;
  }
}

function addModelUsage(target, model, usage) {
  const name = String(model ?? "").trim() || "unknown";
  target[name] ??= emptyUsage();
  addUsage(target[name], usage);
}

function estimateResources(usage) {
  const energyCandidates = [
    usage.requests * 0.24,
    usage.requests * 0.34,
  ];
  const waterCandidates = [
    usage.requests * 0.26,
    usage.requests * 0.32176,
    (usage.outputTokens / 400) * 45,
  ];
  const carbonCandidates = [
    usage.requests * 0.03,
    (usage.outputTokens / 400) * 1.14,
  ];

  return {
    energyWh: [
      Math.min(...energyCandidates),
      Math.max(...energyCandidates),
    ],
    waterMl: [
      Math.min(...waterCandidates),
      Math.max(...waterCandidates),
    ],
    carbonGrams: [
      Math.min(...carbonCandidates),
      Math.max(...carbonCandidates),
    ],
  };
}

function formatRange([low, high], unit) {
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatter.format(low)}–${formatter.format(high)} ${unit}`;
}

function formatScaledRange([low, high], scale, unit) {
  return formatRange([low * scale, high * scale], unit);
}

function formatPercentageRange([low, high]) {
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatter.format(low * 100)}%–${formatter.format(high * 100)}%`;
}

function formatChange(current, baseline, lang = "zh") {
  if (baseline === 0) {
    return current === 0 ? "0.00%" : localized(lang, "首次记录", "first record");
  }
  const change = ((current - baseline) / baseline) * 100;
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${change.toFixed(2)}%`;
}

function formatDurationRange(hours, lang = "zh") {
  const high = hours[1];
  if (high < 1 / 60) {
    return formatScaledRange(hours, 3_600, localized(lang, "秒", "seconds"));
  }
  if (high < 1) {
    return formatScaledRange(hours, 60, localized(lang, "分钟", "minutes"));
  }
  if (high < 48) return formatRange(hours, localized(lang, "小时", "hours"));
  if (high < 24 * 730) {
    return formatScaledRange(hours, 1 / 24, localized(lang, "天", "days"));
  }
  return formatScaledRange(
    hours,
    1 / (24 * 365),
    localized(lang, "年", "years"),
  );
}

function everydayComparisons(resources, lang = "zh") {
  const ledHours = resources.energyWh.map((value) => value / 10);
  const phoneCharges = resources.energyWh.map((value) => value / 15);
  const kettleBoils = resources.energyWh.map((value) => value / 100);
  const bottleCounts = resources.waterMl.map((value) => value / 550);
  const showerMinutes = resources.waterMl.map((value) => value / 8_000);
  const vehicleGramsPerKm = 400 / 1.609344;
  const drivingKm = resources.carbonGrams.map(
    (value) => value / vehicleGramsPerKm,
  );
  const treeAbsorptionHours = resources.carbonGrams.map(
    (value) => (value / 60_000) * 365 * 24,
  );

  return {
    energy:
      resources.energyWh[1] < 15
        ? {
            icon: "💡",
            label: localized(lang, "10W LED 灯", "10W LED light"),
            value: formatDurationRange(ledHours, lang),
          }
        : resources.energyWh[1] < 1_500
          ? {
              icon: "📱",
              label: localized(lang, "15Wh 手机充电", "15Wh phone charge"),
              value: formatRange(
                phoneCharges,
                localized(lang, "次", "charges"),
              ),
            }
          : {
              icon: "🫖",
              label: localized(lang, "烧开 1L 水", "Boil 1L of water"),
              value: formatRange(kettleBoils, localized(lang, "壶", "times")),
            },
    water:
      bottleCounts[1] < 1
        ? {
            icon: "🚰",
            label: localized(
              lang,
              "550mL 矿泉水",
              "550mL water bottle",
            ),
            value: localized(
              lang,
              `一瓶的 ${formatPercentageRange(bottleCounts)}`,
              `${formatPercentageRange(bottleCounts)} of one bottle`,
            ),
          }
        : resources.waterMl[1] < 8_000
          ? {
              icon: "🚰",
              label: localized(
                lang,
                "550mL 矿泉水",
                "550mL water bottle",
              ),
              value: formatRange(
                bottleCounts,
                localized(lang, "瓶", "bottles"),
              ),
            }
          : {
              icon: "🚿",
              label: localized(lang, "8L/min 淋浴", "8L/min shower"),
              value: formatRange(
                showerMinutes,
                localized(lang, "分钟", "minutes"),
              ),
            },
    driving: {
      icon: "🚗",
      label: localized(lang, "平均燃油车", "Average gas car"),
      value:
        drivingKm[1] < 1
          ? formatScaledRange(
              drivingKm,
              1_000,
              localized(lang, "米", "meters"),
            )
          : formatRange(drivingKm, localized(lang, "公里", "km")),
    },
    tree: {
      icon: "🌳",
      label: localized(lang, "1 棵城市树", "One urban tree"),
      value: localized(
        lang,
        `加班 ${formatDurationRange(treeAbsorptionHours, lang)}才能吸回来`,
        `needs ${formatDurationRange(treeAbsorptionHours, lang)} to absorb it`,
      ),
    },
  };
}

function padTerminal(value, width) {
  const displayWidth = Array.from(value).reduce(
    (total, character) =>
      total + (/\p{Script=Han}/u.test(character) ? 2 : 1),
    0,
  );
  return `${value}${" ".repeat(Math.max(0, width - displayWidth))}`;
}

function renderComparison(comparison) {
  return `  ${comparison.icon}  ${padTerminal(comparison.label, 18)} ${comparison.value}`;
}

function resourceBreakdownLines(totals, title, lang = "zh") {
  const resources = estimateResources(totals);
  const comparisons = everydayComparisons(resources, lang);
  return [
    `  ${color("33", title)}`,
    `  ⚡  ${formatRange(resources.energyWh, "Wh")}`,
    `  💧  ${formatRange(resources.waterMl, "mL")}`,
    `  ☁️  ${formatRange(resources.carbonGrams, "gCO₂e")}`,
    "",
    `  ${color("33", localized(lang, "生活翻译（终于像人话了）", "Everyday translation"))}`,
    renderComparison(comparisons.energy),
    renderComparison(comparisons.water),
    renderComparison(comparisons.driving),
    renderComparison(comparisons.tree),
  ];
}

function sourceLabel(source) {
  return source === "codex" ? "Codex" : "Claude Code";
}

function displayModelName(model) {
  const sanitized = String(model).replace(/[\p{Cc}\p{Cf}]/gu, "�");
  const characters = Array.from(sanitized);
  return characters.length > 48
    ? `${characters.slice(0, 47).join("")}…`
    : sanitized;
}

function modelBreakdownLines(report, limit = 5, lang = "zh") {
  const entries = Object.entries(report.models ?? {})
    .flatMap(([source, models]) =>
      Object.entries(models).map(([model, usage]) => ({
        source,
        model,
        usage,
      })),
    )
    .filter((entry) => entry.usage.requests > 0)
    .sort((left, right) => right.usage.totalTokens - left.usage.totalTokens)
    .slice(0, limit);

  if (entries.length === 0) return [];
  return [
    `  ${color("33", localized(lang, "模型账单", "Model bill"))}`,
    ...entries.map((entry) => {
      const label = `${sourceLabel(entry.source)} · ${displayModelName(entry.model)}`;
      return `  ${padTerminal(label, 32)} ${formatTokens(entry.usage.totalTokens)} tokens · ${entry.usage.requests} ${localized(lang, "次", entry.usage.requests === 1 ? "request" : "requests")}`;
    }),
  ];
}

function combinedModelBreakdownLines(reports, limit = 5, lang = "zh") {
  const models = {};
  for (const report of reports) {
    for (const [source, sourceModels] of Object.entries(report.models ?? {})) {
      models[source] ??= {};
      for (const [model, usage] of Object.entries(sourceModels)) {
        addModelUsage(models[source], model, usage);
      }
    }
  }
  return modelBreakdownLines({ models }, limit, lang);
}

function formatTokens(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function color(code, value) {
  if (!process.stdout.isTTY || process.env.NO_COLOR) return value;
  return `\u001B[${code}m${value}\u001B[0m`;
}

function averageTotals(reports) {
  const totals = emptyUsage();
  for (const report of reports) addUsage(totals, report.totals);
  for (const key of Object.keys(totals)) totals[key] /= reports.length;
  return totals;
}

function rotatingCopy(date, choices) {
  const day = Number(date.slice(-2));
  return choices[(day - 1) % choices.length];
}

function rotatingLocalizedCopy(date, lang, zhChoices, enChoices) {
  return rotatingCopy(date, lang === "en" ? enChoices : zhChoices);
}

function dailyVerdict(totals, baseline, date, lang = "zh") {
  if (totals.requests === 0) {
    return {
      title: localized(lang, "拒绝营业", "NO SERVICE"),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          "今天没有模型请求。显卡风扇第一次听见了鸟叫。",
          "零 Token，零借口。数据中心暂时把你移出了通讯录。",
          "今天没有模型请求。数据中心暂时失去了你的关心。",
          "硅基同事空等一天，终于体验了一次人类的无效会议。",
          "今日算力消耗为零：不是进步，可能只是忘了上班。",
        ],
        [
          "No model requests today. A GPU fan heard birdsong for the first time.",
          "Zero tokens, zero excuses. The data center removed you from its contacts.",
          "No model requests today. The data center briefly stopped feeling needed.",
          "Your silicon coworker waited all day and finally experienced a human meeting.",
          "Today's compute use is zero. Progress—or perhaps you forgot to work.",
        ],
      ),
    };
  }
  if (baseline.requests === 0 || baseline.totalTokens === 0) {
    return {
      title: localized(lang, "初犯记录", "FIRST OFFENSE"),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          "历史一片空白，今天这张账单算是开业剪彩。",
          "过去七天查无此人，今天突然来给 GPU 冲业绩。",
          "过去 7 天没有可比记录，今天先把小票钉在墙上。",
          "没有基线不代表没有代价，只代表以前没抓到。",
          "第一次留下脚印。放心，数据中心已经替你裱起来了。",
        ],
        [
          "History is blank, so today's receipt gets to cut the opening ribbon.",
          "Missing for seven days, then suddenly back to hit the GPU's quota.",
          "No comparable history. Pin today's receipt to the wall for now.",
          "No baseline does not mean no cost. It means you were not caught before.",
          "Your first footprint. The data center has already framed it.",
        ],
      ),
    };
  }

  const requestRatio = totals.requests / baseline.requests;
  const tokensPerRequest = totals.totalTokens / totals.requests;
  const baselineTokensPerRequest = baseline.totalTokens / baseline.requests;
  const tokensPerRequestRatio = tokensPerRequest / baselineTokensPerRequest;
  const cacheRatio =
    totals.inputTokens === 0
      ? 0
      : totals.cachedInputTokens / totals.inputTokens;

  if (requestRatio <= 1.2 && tokensPerRequestRatio >= 1.8) {
    return {
      title: localized(lang, "上下文囤积", "CONTEXT HOARDING"),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          `单次请求是平时的 ${tokensPerRequestRatio.toFixed(2)} 倍。你把上下文窗口当成了储物间。`,
          "请求次数很克制，附件体积很诚实：少问，不代表少塞。",
          `请求没多，单次 Token 用量却膨胀到 ${tokensPerRequestRatio.toFixed(2)} 倍。`,
          "模型没有被频繁打扰，只是每次都收到一整本附件。",
          "今天走的是少量多餐的反面：少问几次，每次喂到撑。",
        ],
        [
          `Each request was ${tokensPerRequestRatio.toFixed(2)}× normal. You used the context window as a storage unit.`,
          "Very restrained request count. Very honest attachment size.",
          `Requests stayed flat while tokens per request inflated to ${tokensPerRequestRatio.toFixed(2)}×.`,
          "The model was not interrupted often. It just received a whole book each time.",
          "The opposite of small frequent meals: ask less, feed until full.",
        ],
      ),
    };
  }
  if (requestRatio >= 2) {
    return {
      title: localized(lang, "请求连发", "REQUEST BARRAGE"),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          `请求量冲到平时的 ${requestRatio.toFixed(2)} 倍，模型的在线状态被你理解成了劳动合同。`,
          "一句话能问完的事，被你拆成了连续剧。",
          `模型被叫了平时的 ${requestRatio.toFixed(2)} 倍，像个没有下班按钮的实习生。`,
          "你没有在提问，你在对数据中心进行消息轰炸。",
          "今日快捷键不是撤销，是再次发送。",
        ],
        [
          `Requests hit ${requestRatio.toFixed(2)}× normal. You mistook “online” for a labor contract.`,
          "A one-line question became a limited series.",
          `You summoned the model ${requestRatio.toFixed(2)}× as often, like an intern without a logout button.`,
          "This was not prompting. It was a denial-of-peace attack on a data center.",
          "Today's favorite shortcut was not undo. It was send again.",
        ],
      ),
    };
  }
  if (cacheRatio >= 0.7) {
    return {
      title: localized(lang, "缓存考古学家", "CACHE ARCHAEOLOGIST"),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          `缓存占比 ${(cacheRatio * 100).toFixed(2)}%，新问题没有多少，旧上下文倒是盘得包浆。`,
          "今天的主要工作：把昨天的 Token 再热一遍。",
          `${(cacheRatio * 100).toFixed(2)}% 的输入来自缓存，今天主要在翻旧账。`,
          "模型记性好不好不知道，你是真的舍不得删聊天记录。",
          "上下文没有过期，只是逐渐有了历史文物的气质。",
        ],
        [
          `${(cacheRatio * 100).toFixed(2)}% cache: few new questions, beautifully polished old context.`,
          "Today's main task was reheating yesterday's tokens.",
          `${(cacheRatio * 100).toFixed(2)}% of input came from cache. Mostly digging through old tabs.`,
          "The model's memory is debatable. Your refusal to delete chats is not.",
          "The context is not stale. It is acquiring archaeological value.",
        ],
      ),
    };
  }
  if (totals.totalTokens <= baseline.totalTokens * 0.3) {
    return {
      title: localized(lang, "电子戒断", "DIGITAL DETOX"),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          "今天的 Token 少得像预算审批后的团建。",
          "用量骤降，显卡怀疑自己是不是被优化了。",
          "用量不到平时三成，硅基同事开始担心失业。",
          "你短暂摆脱了补全按钮，生产力是否一同消失仍待观察。",
          "数据中心今天省下的电，够你的自制力亮一会儿。",
        ],
        [
          "Today's token count looks like a team event after budget review.",
          "Usage collapsed. The GPU is wondering whether it was restructured.",
          "Usage fell below 30% of normal. Your silicon coworker fears unemployment.",
          "You escaped autocomplete briefly. Whether productivity escaped too is unclear.",
          "The power saved today could keep your self-control lit for a moment.",
        ],
      ),
    };
  }
  if (totals.totalTokens >= baseline.totalTokens * 1.5) {
    const totalRatio = totals.totalTokens / baseline.totalTokens;
    return {
      title: localized(lang, "算力暴食", "COMPUTE BINGE"),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          `Token 吃到平时的 ${totalRatio.toFixed(2)} 倍，建议账单也开启上下文压缩。`,
          "今天不是在用 AI，是在给数据中心做压力测试。",
          `Token 总量达到平时的 ${totalRatio.toFixed(2)} 倍。`,
          "你负责灵感喷涌，机房负责电表狂奔。",
          "上下文窗口被你当成了自助餐盘，而且拒绝少拿多次。",
        ],
        [
          `Tokens reached ${totalRatio.toFixed(2)}× normal. The receipt may need context compaction.`,
          "You were not using AI today. You were load-testing a data center.",
          `Total tokens reached ${totalRatio.toFixed(2)}× your baseline.`,
          "You supplied the inspiration. The server room supplied the sprinting meter.",
          "You treated the context window like an all-you-can-eat plate.",
        ],
      ),
    };
  }
  return {
    title: localized(lang, "稳定消耗", "STEADY BURN"),
    detail: rotatingLocalizedCopy(
      date,
      lang,
      [
        "用量平稳得像心电图直线——这句是否吉利由你判断。",
        "今天没有异常，只是照常把瓦时兑换成 Markdown。",
        "没有暴走，也没有戒断。只是稳定地把电变成文字。",
        "稳定发挥：你产出代码，数据中心产出热量。",
        "平平无奇的一天，除了又有一批电子经过长途跋涉变成文字。",
      ],
      [
        "Usage was as flat as a heart monitor. You decide whether that sounds healthy.",
        "Nothing unusual today. Just converting watt-hours into Markdown as usual.",
        "No binge, no detox. Just steadily turning electricity into text.",
        "Consistent performance: you produced code; the data center produced heat.",
        "An ordinary day, except more electrons completed a long trip into prose.",
      ],
    ),
  };
}

function renderReceipt(report, historicalReports = [], lang = "zh") {
  const { date, sources, totals } = report;
  const baseline =
    historicalReports.length > 0 ? averageTotals(historicalReports) : undefined;
  const verdict = baseline
    ? dailyVerdict(totals, baseline, date, lang)
    : undefined;
  const modelLines = modelBreakdownLines(report, 5, lang);
  const uncachedInputTokens = Math.max(
    0,
    totals.inputTokens -
      totals.cachedInputTokens -
      totals.cacheWriteInputTokens,
  );
  const lines = [
    color("2", "┌──────────────────────────────────────────────┐"),
    `  ${color("1;31", `YOUR AI RECEIPT · ${date}`)}`,
    color("2", "├──────────────────────────────────────────────┤"),
    "",
    `  ${color("1", `${formatTokens(totals.totalTokens)} tokens`)} · ${totals.requests} ${localized(lang, "次模型请求", totals.requests === 1 ? "model request" : "model requests")}`,
    "",
    `  Codex       ${formatTokens(sources.codex?.totalTokens ?? 0)}`,
    `  Claude Code ${formatTokens(sources.claude?.totalTokens ?? 0)}`,
    ...(modelLines.length > 0 ? ["", ...modelLines] : []),
    "",
    `  ${localized(lang, "新鲜输入   ", "Fresh input  ")} ${formatTokens(uncachedInputTokens)}`,
    `  ${localized(lang, "缓存读取   ", "Cache read   ")} ${formatTokens(totals.cachedInputTokens)}`,
    `  ${localized(lang, "缓存写入   ", "Cache write  ")} ${formatTokens(totals.cacheWriteInputTokens)}`,
    `  ${localized(lang, "模型输出   ", "Model output ")} ${formatTokens(totals.outputTokens)}`,
    "",
    ...resourceBreakdownLines(
      totals,
      localized(
        lang,
        "公开代理跨度（不是电表）",
        "Published proxy range (not a power meter)",
      ),
      lang,
    ),
    ...(baseline
      ? [
          "",
          `  ${color("33", localized(lang, "个人基线（过去 7 个自然日）", "Personal baseline (prior 7 calendar days)"))}`,
          `  Token     ${formatChange(totals.totalTokens, baseline.totalTokens, lang)}`,
          `  ${localized(lang, "请求      ", "Requests  ")} ${formatChange(totals.requests, baseline.requests, lang)}`,
          "",
          `  ${color("1;31", localized(lang, `今日罪名：${verdict.title}`, `Today's charge: ${verdict.title}`))}`,
          `  ${verdict.detail}`,
        ]
      : []),
    "",
    `  ${localized(lang, `置信度：${color("1;31", "低")} · 运行 anti-ai explain 查看口径`, `Confidence: ${color("1;31", "LOW")} · run anti-ai explain for methodology`)}`,
    "",
    `  ${color("2", localized(lang, `机器开了 ${totals.requests} 张小票，地球只收到一段估算。`, `The machine printed ${totals.requests} ${totals.requests === 1 ? "receipt" : "receipts"}. Earth got an estimate.`))}`,
    color("2", "└──────────────────────────────────────────────┘"),
    "",
  ];
  return lines.join("\n");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderShareSvg(report, historicalReports = [], lang = "zh") {
  const { date, totals } = report;
  const resources = estimateResources(totals);
  const comparisons = everydayComparisons(resources, lang);
  const baseline =
    historicalReports.length > 0 ? averageTotals(historicalReports) : emptyUsage();
  const verdict = dailyVerdict(totals, baseline, date, lang);
  const title = localized(
    lang,
    `今日罪名：${verdict.title}`,
    `TODAY'S CHARGE: ${verdict.title}`,
  );
  const privacy = localized(
    lang,
    "隐私模式：未包含对话、路径、模型名和精确 Token",
    "PRIVACY MODE: no chats, paths, model names, or exact tokens",
  );
  const methodology = localized(
    lang,
    "公开代理跨度 · 置信度低 · 不是电表",
    "Published proxy range · low confidence · not a power meter",
  );
  const tokenChange = formatChange(
    totals.totalTokens,
    baseline.totalTokens,
    lang,
  );
  const requestChange = formatChange(
    totals.requests,
    baseline.requests,
    lang,
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(`YOUR AI RECEIPT · ${date}`)}</title>
  <desc id="desc">${escapeXml(privacy)}</desc>
  <rect width="1200" height="630" rx="28" fill="#0b0b0c"/>
  <rect x="24" y="24" width="1152" height="582" rx="20" fill="none" stroke="#343438" stroke-width="2"/>
  <rect x="24" y="24" width="12" height="582" rx="6" fill="#ff4d4f"/>
  <style>
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .muted { fill: #8c8c94; }
    .body { fill: #f4f4f5; }
    .accent { fill: #ff5c5e; }
    .warn { fill: #f5b942; }
  </style>
  <text x="72" y="84" class="mono accent" font-size="34" font-weight="800">YOUR AI RECEIPT</text>
  <text x="1128" y="84" class="mono muted" font-size="22" text-anchor="end">${escapeXml(date)}</text>
  <line x1="72" y1="116" x2="1128" y2="116" stroke="#343438" stroke-width="2"/>

  <text x="72" y="164" class="mono warn" font-size="19">${escapeXml(localized(lang, "公开代理跨度", "PUBLISHED PROXY RANGE"))}</text>
  <text x="72" y="214" class="mono body" font-size="28">⚡ ${escapeXml(formatRange(resources.energyWh, "Wh"))}</text>
  <text x="72" y="264" class="mono body" font-size="28">💧 ${escapeXml(formatRange(resources.waterMl, "mL"))}</text>
  <text x="72" y="314" class="mono body" font-size="28">☁️ ${escapeXml(formatRange(resources.carbonGrams, "gCO₂e"))}</text>

  <text x="620" y="164" class="mono warn" font-size="19">${escapeXml(localized(lang, "生活翻译", "EVERYDAY TRANSLATION"))}</text>
  <text x="620" y="214" class="mono body" font-size="18">${escapeXml(`${comparisons.energy.icon} ${comparisons.energy.label}`)}</text>
  <text x="1128" y="214" class="mono body" font-size="18" text-anchor="end">${escapeXml(comparisons.energy.value)}</text>
  <text x="620" y="264" class="mono body" font-size="18">${escapeXml(`${comparisons.water.icon} ${comparisons.water.label}`)}</text>
  <text x="1128" y="264" class="mono body" font-size="18" text-anchor="end">${escapeXml(comparisons.water.value)}</text>
  <text x="620" y="314" class="mono body" font-size="18">${escapeXml(`${comparisons.driving.icon} ${comparisons.driving.label}`)}</text>
  <text x="1128" y="314" class="mono body" font-size="18" text-anchor="end">${escapeXml(comparisons.driving.value)}</text>

  <line x1="72" y1="354" x2="1128" y2="354" stroke="#343438" stroke-width="2"/>
  <text x="72" y="404" class="mono accent" font-size="30" font-weight="800">${escapeXml(title)}</text>
  <text x="72" y="448" class="mono body" font-size="20">${escapeXml(verdict.detail)}</text>
  <text x="72" y="492" class="mono muted" font-size="19">${escapeXml(localized(lang, `相对 7 日基线：Token ${tokenChange} · 请求 ${requestChange}`, `VS 7-DAY BASELINE: tokens ${tokenChange} · requests ${requestChange}`))}</text>

  <line x1="72" y1="526" x2="1128" y2="526" stroke="#343438" stroke-width="2"/>
  <text x="72" y="556" class="mono muted" font-size="15">${escapeXml(privacy)}</text>
  <text x="72" y="580" class="mono muted" font-size="15">${escapeXml(methodology)}</text>
  <text x="1128" y="600" class="mono muted" font-size="14" text-anchor="end">anti-ai · github.com/ppxu/anti-ai</text>
</svg>
`;
  return svg;
}

function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function inclusiveDateRange(startDate, endDate) {
  const dates = [];
  for (
    let current = startDate;
    current <= endDate;
    current = shiftDate(current, 1)
  ) {
    dates.push(current);
  }
  return dates;
}

function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return false;
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function renderWeek(dailyReports, lang = "zh") {
  const firstDate = dailyReports[0].date;
  const lastDate = dailyReports.at(-1).date;
  const totals = emptyUsage();
  for (const report of dailyReports) addUsage(totals, report.totals);
  const maxTokens = Math.max(
    0,
    ...dailyReports.map((report) => report.totals.totalTokens),
  );
  const rows = dailyReports.map((report) => {
    const tokens = report.totals.totalTokens;
    const barLength =
      tokens === 0 ? 0 : Math.max(1, Math.round((tokens / maxTokens) * 20));
    const bar = barLength === 0 ? "·" : "█".repeat(barLength);
    return `  ${report.date.slice(5)}  ${bar.padEnd(20)}  ${formatTokens(tokens)}`;
  });
  const modelLines = combinedModelBreakdownLines(dailyReports, 5, lang);

  return [
    color("2", "┌──────────────────────────────────────────────┐"),
    `  ${color("1;31", `YOUR AI HANGOVER · ${firstDate} → ${lastDate}`)}`,
    color("2", "├──────────────────────────────────────────────┤"),
    "",
    ...rows,
    "",
    `  ${color("1", localized(lang, `7 日合计  ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} 次模型请求`, `7-day total  ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} ${totals.requests === 1 ? "model request" : "model requests"}`))}`,
    ...(modelLines.length > 0 ? ["", ...modelLines] : []),
    "",
    ...resourceBreakdownLines(
      totals,
      localized(lang, "7 日资源账单", "7-day resource bill"),
      lang,
    ),
    "",
    `  ${color("2", localized(lang, "七天过去了。代码也许能跑，账单肯定能。", "Seven days passed. The code might run; the bill definitely does."))}`,
    color("2", "└──────────────────────────────────────────────┘"),
    "",
  ].join("\n");
}

function heatLevel(tokens, maxTokens) {
  if (tokens === 0 || maxTokens === 0) return "·";
  const ratio = tokens / maxTokens;
  if (ratio <= 0.25) return "░";
  if (ratio <= 0.5) return "▒";
  if (ratio <= 0.75) return "▓";
  return "█";
}

function longestQuietStreak(dailyReports) {
  let longest = 0;
  let current = 0;
  for (const report of dailyReports) {
    if (report.totals.totalTokens === 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function renderMonth(dailyReports, lang = "zh") {
  const firstDate = dailyReports[0].date;
  const lastDate = dailyReports.at(-1).date;
  const totals = emptyUsage();
  for (const report of dailyReports) addUsage(totals, report.totals);

  const maxTokens = Math.max(
    0,
    ...dailyReports.map((report) => report.totals.totalTokens),
  );
  const firstWeekday =
    (new Date(`${firstDate}T12:00:00.000Z`).getUTCDay() + 6) % 7;
  const cells = Array(firstWeekday).fill("   ");
  for (const report of dailyReports) {
    const day = report.date.slice(8);
    cells.push(`${day}${heatLevel(report.totals.totalTokens, maxTokens)}`);
  }
  while (cells.length % 7 !== 0) cells.push("   ");

  const rows = [];
  for (let index = 0; index < cells.length; index += 7) {
    rows.push(`  ${cells.slice(index, index + 7).join("  ")}`);
  }

  const quietDays = dailyReports.filter(
    (report) => report.totals.totalTokens === 0,
  ).length;
  const peak = dailyReports.reduce((currentPeak, report) =>
    report.totals.totalTokens > currentPeak.totals.totalTokens
      ? report
      : currentPeak,
  );
  const modelLines = combinedModelBreakdownLines(dailyReports, 5, lang);

  return [
    color("2", "┌──────────────────────────────────────────────┐"),
    `  ${color("1;31", `YOUR AI CALENDAR · ${firstDate} → ${lastDate}`)}`,
    color("2", "├──────────────────────────────────────────────┤"),
    "",
    localized(
      lang,
      "  一    二    三    四    五    六    日",
      "  Mon  Tue  Wed  Thu  Fri  Sat  Sun",
    ),
    ...rows,
    "",
    localized(
      lang,
      "  · 无记录  ░ 少  ▒ 中  ▓ 多  █ 最重",
      "  · none  ░ low  ▒ medium  ▓ high  █ peak",
    ),
    "",
    `  ${color("1", localized(lang, `月度合计    ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} 次模型请求`, `Monthly total  ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} ${totals.requests === 1 ? "model request" : "model requests"}`))}`,
    localized(
      lang,
      `  AI 清醒日  ${quietDays} 天 / ${dailyReports.length} 天`,
      `  AI-free days  ${quietDays} ${quietDays === 1 ? "day" : "days"} / ${dailyReports.length} ${dailyReports.length === 1 ? "day" : "days"}`,
    ),
    localized(
      lang,
      `  最长清醒期 ${longestQuietStreak(dailyReports)} 天`,
      `  Longest break ${longestQuietStreak(dailyReports)} ${longestQuietStreak(dailyReports) === 1 ? "day" : "days"}`,
    ),
    localized(
      lang,
      `  最重一天    ${peak.date.slice(5)} · ${formatTokens(peak.totals.totalTokens)} tokens`,
      `  Peak day      ${peak.date.slice(5)} · ${formatTokens(peak.totals.totalTokens)} tokens`,
    ),
    ...(modelLines.length > 0 ? ["", ...modelLines] : []),
    "",
    ...resourceBreakdownLines(
      totals,
      localized(lang, "本月资源账单", "Monthly resource bill"),
      lang,
    ),
    "",
    `  ${color("2", localized(lang, "这个月还没结束，数据中心已经替你记住了。", "The month is not over. The data center already remembers it."))}`,
    color("2", "└──────────────────────────────────────────────┘"),
    "",
  ].join("\n");
}

function localDate(timestamp, timezone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

async function* jsonlFiles(root, modifiedSince = undefined) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      yield* jsonlFiles(entryPath, modifiedSince);
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      if (modifiedSince !== undefined) {
        let fileStat;
        try {
          fileStat = await stat(entryPath);
        } catch (error) {
          if (error.code === "ENOENT") continue;
          throw error;
        }
        if (fileStat.mtimeMs < modifiedSince) continue;
      }
      yield entryPath;
    }
  }
}

function sourceUsageByDate(dates) {
  return new Map(
    dates.map((date) => [
      date,
      {
        usage: emptyUsage(),
        models: {},
      },
    ]),
  );
}

function earliestLocalMidnight(dates) {
  return new Date(`${dates[0]}T00:00:00`).getTime();
}

async function scanCodex(root, dates, timezone) {
  const results = sourceUsageByDate(dates);

  for await (const file of jsonlFiles(root, earliestLocalMidnight(dates))) {
    let currentModel = "unknown";
    const lines = readline.createInterface({
      input: createReadStream(file),
      crlfDelay: Infinity,
    });

    for await (const line of lines) {
      if (
        !line.includes('"type":"token_count"') &&
        !line.includes('"type":"turn_context"')
      ) {
        continue;
      }
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }

      if (record?.type === "turn_context") {
        currentModel = record?.payload?.model ?? currentModel;
        continue;
      }

      const usage = record?.payload?.info?.last_token_usage;
      if (record?.payload?.type !== "token_count" || !usage) continue;
      const date = localDate(record.timestamp, timezone);
      const result = results.get(date);
      if (!result) continue;

      const inputTokens = Number(usage.input_tokens ?? 0);
      const outputTokens = Number(usage.output_tokens ?? 0);
      const delta = {
        requests: 1,
        inputTokens,
        cachedInputTokens: Number(usage.cached_input_tokens ?? 0),
        cacheWriteInputTokens: Number(usage.cache_write_input_tokens ?? 0),
        outputTokens,
        reasoningOutputTokens: Number(usage.reasoning_output_tokens ?? 0),
        totalTokens: Number(usage.total_tokens ?? inputTokens + outputTokens),
      };
      addUsage(result.usage, delta);
      addModelUsage(result.models, currentModel, delta);
    }
  }

  return results;
}

async function scanClaude(root, dates, timezone) {
  const snapshots = new Map();

  for await (const file of jsonlFiles(root, earliestLocalMidnight(dates))) {
    const lines = readline.createInterface({
      input: createReadStream(file),
      crlfDelay: Infinity,
    });

    for await (const line of lines) {
      if (!line.includes('"usage"') || !line.includes('"type":"assistant"')) {
        continue;
      }
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }

      const message = record?.message;
      const usage = message?.usage;
      const messageId = message?.id ?? record?.uuid;
      if (record?.type !== "assistant" || !usage || !messageId) continue;

      const uncachedInputTokens = Number(usage.input_tokens ?? 0);
      const cachedInputTokens = Number(usage.cache_read_input_tokens ?? 0);
      const cacheWriteInputTokens = Number(
        usage.cache_creation_input_tokens ?? 0,
      );
      const inputTokens =
        uncachedInputTokens + cachedInputTokens + cacheWriteInputTokens;
      const outputTokens = Number(usage.output_tokens ?? 0);
      const snapshot = {
        timestamp: record.timestamp,
        model: message.model,
        usage: {
          requests: 1,
          inputTokens,
          cachedInputTokens,
          cacheWriteInputTokens,
          outputTokens,
          reasoningOutputTokens: 0,
          totalTokens: inputTokens + outputTokens,
        },
      };
      const previous = snapshots.get(messageId);

      if (
        !previous ||
        snapshot.usage.totalTokens > previous.usage.totalTokens ||
        (snapshot.usage.totalTokens === previous.usage.totalTokens &&
          snapshot.timestamp > previous.timestamp)
      ) {
        snapshots.set(messageId, snapshot);
      }
    }
  }

  const results = sourceUsageByDate(dates);
  for (const snapshot of snapshots.values()) {
    const result = results.get(localDate(snapshot.timestamp, timezone));
    if (result) {
      addUsage(result.usage, snapshot.usage);
      addModelUsage(result.models, snapshot.model, snapshot.usage);
    }
  }
  return results;
}

function sourceRoots() {
  return {
    codex:
      process.env.ANTI_AI_CODEX_DIR ??
      path.join(os.homedir(), ".codex", "sessions"),
    claude:
      process.env.ANTI_AI_CLAUDE_DIR ??
      path.join(os.homedir(), ".claude", "projects"),
  };
}

async function reportsForDates(options, dates, timezone) {
  const roots = sourceRoots();
  const sourceResults = {};

  if (options.source === "all" || options.source === "codex") {
    sourceResults.codex = await scanCodex(roots.codex, dates, timezone);
  }
  if (options.source === "all" || options.source === "claude") {
    sourceResults.claude = await scanClaude(roots.claude, dates, timezone);
  }

  return dates.map((date) => {
    const sources = {};
    const models = {};
    for (const [source, results] of Object.entries(sourceResults)) {
      const sourceResult = results.get(date);
      sources[source] = sourceResult.usage;
      models[source] = sourceResult.models;
    }
    const totals = emptyUsage();
    for (const usage of Object.values(sources)) addUsage(totals, usage);
    return { date, timezone, sources, models, totals };
  });
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
    const record = dailyCreatureRecord(report);
    if (record.active) {
      const event = creatureEvent(state.seed, report.date);
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
    state.days[report.date] = record;
  }
  await saveCreatureState(state);

  const creature = deriveCreature(state, date);
  const today = state.days[date];
  const result = {
    date,
    status: today.active ? "active" : "dormant",
    ...creature,
    today: {
      pollutionDose: today.pollutionDose,
      event: today.event,
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
      `${localized(lang, "累积污染", "ACCUMULATED EXPOSURE")}  ${result.exposure}${result.nextStageAt === null ? "" : ` / ${result.nextStageAt}`}`,
      "",
      ...eventLines,
      "",
      localized(
        lang,
        "隐私档案：只保存污染剂量、性状和事件；不保存对话、路径、模型名或精确 Token。",
        "PRIVACY FILE: stores dose, traits, and events; stores no chats, paths, model names, or exact tokens.",
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
      "Published proxy range, not a measurement.",
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
      "  CACHE ARCHAEOLOGIST: cached reads are at least 70% of input",
      "  DIGITAL DETOX: total tokens ≤ 30% of baseline",
      "  COMPUTE BINGE: total tokens ≥ 1.5× baseline",
      "  Otherwise show STEADY BURN; zero usage and missing history have dedicated verdicts.",
      "  Verdicts are generated by fixed local rules; copy rotates deterministically by date.",
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
      "  One event is selected with SHA-256(local seed + date); 8% are rare mutations.",
      "  A common event adds 8 to one trait; a rare event adds 20.",
      "  After the first active day, each AI-free day reduces exposure by 2",
      "  without clearing historical traits.",
      "  State: ~/.anti-ai/creature.json",
      "  It stores only dose, traits, events, and a local seed—not chats, paths,",
      "  model names, exact tokens, or per-request timestamps.",
      "  anti-ai creature reset explicitly destroys this file.",
      "",
      color("1", "Everyday comparisons"),
      "  10W LED light: electricity Wh ÷ 10W = hours lit",
      "  15Wh phone charge: electricity Wh ÷ 15Wh = charges",
      "  Boil 1L of water: electricity Wh ÷ 100Wh = boils",
      "  550mL water bottle: water mL ÷ 550 = bottles",
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
      "  anti-ai share uses the same proxy formulas and fixed local verdict rules.",
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
    "公开代理跨度，不是测量值。",
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
    "  缓存考古学家：缓存读取占输入至少 70%",
    "  电子戒断：Token 总量不高于基线 30%",
    "  算力暴食：Token 总量不低于基线 1.5 倍",
    "  其余情况显示“稳定消耗”；无请求或无历史时使用专用判词。",
    "  判词由本地固定规则生成，不调用模型；文案按日期固定轮换。",
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
    "  每日事件由 SHA-256（本地 seed + 日期）确定，其中 8% 进入稀有突变池。",
    "  普通事件给一个性状 +8，稀有事件 +20。",
    "  首个活跃日之后，每个 AI 清醒日污染 -2，但不会清除历史性状。",
    "  状态文件：~/.anti-ai/creature.json",
    "  只保存污染剂量、性状、事件和本地 seed；不保存对话、路径、模型名、精确 Token 或逐请求时间。",
    "  anti-ai creature reset 会显式销毁档案。",
    "",
    color("1", "生活化对照"),
    "  10W LED 灯：电力 Wh ÷ 10W = 点灯小时数",
    "  15Wh 手机充电：电力 Wh ÷ 15Wh = 充电次数",
    "  烧开 1L 水：电力 Wh ÷ 100Wh = 烧水壶数",
    "  550mL 矿泉水：水耗 mL ÷ 550 = 瓶数",
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
    "  anti-ai share 使用相同的资源代理公式和本地固定判词。",
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
  explain           Explain resource proxy methodology

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
  explain           解释资源代理口径

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
