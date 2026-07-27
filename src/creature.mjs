import { createHash, randomBytes } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { color } from "./reporting.mjs";

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

const CREATURE_ABILITY_KEYS = [
  "appetite",
  "memory",
  "shell",
  "mouths",
  "glow",
  "instability",
  "withdrawal",
];

const CREATURE_ABILITY_MAX = 999;
const CREATURE_RARE_ABILITY_MAX = 9;
const CREATURE_RARE_ABILITY_CHANCES = {
  rare: 0.5,
  epic: 0.1,
  mythic: 0.02,
};
const CREATURE_RARE_ABILITY_POOLS = {
  rare: [
    "deadline_scent",
    "phantom_cache",
    "rubber_duck_necromancy",
  ],
  epic: ["prompt_telepathy", "hallucination_antibodies"],
  mythic: ["token_transmutation"],
};
const CREATURE_RARE_ABILITY_RANKS = {
  rare: { badge: "R", color: "1;36" },
  epic: { badge: "SR", color: "1;35" },
  mythic: { badge: "SSR", color: "1;33" },
};
const CREATURE_RARE_ABILITY_DEFINITIONS = Object.fromEntries(
  Object.entries(CREATURE_RARE_ABILITY_POOLS).flatMap(([rarity, abilities]) =>
    abilities.map((ability) => [ability, { rarity }]),
  ),
);

const CREATURE_BRANCH_ABILITIES = {
  context: "memory",
  cache: "shell",
  frenzy: "mouths",
  nuclear: "glow",
};

const CREATURE_TALENTS = {
  appetite: [
    { id: "bottomless_stomach", threshold: 5 },
    { id: "throughput_singularity", threshold: 15 },
    { id: "invoice_devourer", threshold: 30 },
    { id: "token_landfill", threshold: 100 },
    { id: "budget_event_horizon", threshold: 300 },
    { id: "planetary_feedlot", threshold: 700 },
  ],
  memory: [
    { id: "appendix_gills", threshold: 5 },
    { id: "recursive_cortex", threshold: 15 },
    { id: "dossier_hive", threshold: 30 },
    { id: "appendix_lung", threshold: 100 },
    { id: "context_graveyard", threshold: 300 },
    { id: "infinite_review_board", threshold: 700 },
  ],
  shell: [
    { id: "cache_scab", threshold: 5 },
    { id: "fossil_carapace", threshold: 15 },
    { id: "yesterday_immortal", threshold: 30 },
    { id: "cache_coffin", threshold: 100 },
    { id: "legacy_strata", threshold: 300 },
    { id: "rollback_continent", threshold: 700 },
  ],
  mouths: [
    { id: "reply_teeth", threshold: 5 },
    { id: "parallel_dentition", threshold: 15 },
    { id: "api_choir", threshold: 30 },
    { id: "followup_larynx", threshold: 100 },
    { id: "webhook_hydra", threshold: 300 },
    { id: "api_weather_system", threshold: 700 },
  ],
  glow: [
    { id: "nightlight_thorax", threshold: 5 },
    { id: "private_reactor", threshold: 15 },
    { id: "meltdown_countdown", threshold: 30 },
    { id: "rack_fever", threshold: 100 },
    { id: "datacenter_sunburn", threshold: 300 },
    { id: "private_heat_death", threshold: 700 },
  ],
  instability: [
    { id: "dice_organ", threshold: 5 },
    { id: "bad_luck_field", threshold: 15 },
    { id: "probability_leak", threshold: 30 },
    { id: "edge_case_weather", threshold: 100 },
    { id: "rollback_prophecy", threshold: 300 },
    { id: "production_poltergeist", threshold: 700 },
  ],
  withdrawal: [
    { id: "cold_sweat", threshold: 5 },
    { id: "offline_tinnitus", threshold: 15 },
    { id: "ai_intolerance", threshold: 30 },
    { id: "airplane_mode_rash", threshold: 100 },
    { id: "manual_thought_allergy", threshold: 300 },
    { id: "offline_organ_failure", threshold: 700 },
  ],
};

const CREATURE_TEMPERAMENTS = {
  appetite: "voracious",
  memory: "ruminating",
  shell: "fossilized",
  mouths: "clamorous",
  glow: "self_igniting",
  instability: "dice_brained",
  withdrawal: "withdrawing",
};

const CREATURE_EPITHETS = {
  appetite: "token_sink",
  memory: "appendix_hoarder",
  shell: "cache_mummy",
  mouths: "api_choir",
  glow: "desk_reactor",
  instability: "loaded_dice",
  withdrawal: "offline_hallucinator",
};

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
  abilities: {
    appetite: { zh: "吞噬欲", en: "TOKEN APPETITE" },
    memory: { zh: "赘生脑回", en: "PARASITIC MEMORY" },
    shell: { zh: "化石甲", en: "CACHE CARAPACE" },
    mouths: { zh: "请求口器", en: "REQUEST MAWS" },
    glow: { zh: "核素亮度", en: "CORE GLOW" },
    instability: { zh: "失控指数", en: "INSTABILITY" },
    withdrawal: { zh: "戒断反应", en: "WITHDRAWAL" },
  },
  rareAbilities: {
    deadline_scent: { zh: "截止日嗅觉", en: "DEADLINE SCENT" },
    phantom_cache: { zh: "幽灵缓存", en: "PHANTOM CACHE" },
    rubber_duck_necromancy: {
      zh: "黄鸭招魂术",
      en: "RUBBER-DUCK NECROMANCY",
    },
    prompt_telepathy: { zh: "提示词读心术", en: "PROMPT TELEPATHY" },
    hallucination_antibodies: {
      zh: "幻觉抗体",
      en: "HALLUCINATION ANTIBODIES",
    },
    token_transmutation: { zh: "Token 炼金术", en: "TOKEN TRANSMUTATION" },
  },
  rareAbilityDescriptions: {
    deadline_scent: {
      zh: "闻到截止日期时，会自动分泌更多请求。",
      en: "Smells a deadline and secretes more requests.",
    },
    phantom_cache: {
      zh: "缓存已经清空，精神上仍然命中。",
      en: "The cache is empty, but spiritually it still hits.",
    },
    rubber_duck_necromancy: {
      zh: "能让被删掉的调试日志重新开口。",
      en: "Makes deleted debug logs speak again.",
    },
    prompt_telepathy: {
      zh: "在你写完之前，就提前误解了需求。",
      en: "Misreads the request before you finish typing it.",
    },
    hallucination_antibodies: {
      zh: "每当事实靠近，身体就产生排异反应。",
      en: "Rejects facts as soon as they approach.",
    },
    token_transmutation: {
      zh: "把预算直接炼成上下文，没有中间商。",
      en: "Transmutes budget directly into context.",
    },
  },
  talents: {
    bottomless_stomach: { zh: "无底胃袋", en: "BOTTOMLESS STOMACH" },
    throughput_singularity: { zh: "吞吐奇点", en: "THROUGHPUT SINGULARITY" },
    invoice_devourer: { zh: "账单吞噬者", en: "INVOICE DEVOURER" },
    token_landfill: { zh: "Token 填埋场", en: "TOKEN LANDFILL" },
    budget_event_horizon: { zh: "预算事件视界", en: "BUDGET EVENT HORIZON" },
    planetary_feedlot: { zh: "行星饲料场", en: "PLANETARY FEEDLOT" },
    appendix_gills: { zh: "附录鳃", en: "APPENDIX GILLS" },
    recursive_cortex: { zh: "递归脑叶", en: "RECURSIVE CORTEX" },
    dossier_hive: { zh: "卷宗蜂巢", en: "DOSSIER HIVE" },
    appendix_lung: { zh: "附录肺", en: "APPENDIX LUNG" },
    context_graveyard: { zh: "上下文墓园", en: "CONTEXT GRAVEYARD" },
    infinite_review_board: {
      zh: "无限评审委员会",
      en: "INFINITE REVIEW BOARD",
    },
    cache_scab: { zh: "缓存结痂", en: "CACHE SCAB" },
    fossil_carapace: { zh: "化石背甲", en: "FOSSIL CARAPACE" },
    yesterday_immortal: { zh: "昨日永生", en: "YESTERDAY IMMORTAL" },
    cache_coffin: { zh: "缓存棺", en: "CACHE COFFIN" },
    legacy_strata: { zh: "遗留地层", en: "LEGACY STRATA" },
    rollback_continent: { zh: "回滚大陆", en: "ROLLBACK CONTINENT" },
    reply_teeth: { zh: "回复齿", en: "REPLY TEETH" },
    parallel_dentition: { zh: "并发牙列", en: "PARALLEL DENTITION" },
    api_choir: { zh: "API 合唱团", en: "API CHOIR" },
    followup_larynx: { zh: "追问喉", en: "FOLLOW-UP LARYNX" },
    webhook_hydra: { zh: "Webhook 九头蛇", en: "WEBHOOK HYDRA" },
    api_weather_system: { zh: "API 气候系统", en: "API WEATHER SYSTEM" },
    nightlight_thorax: { zh: "夜光胸腔", en: "NIGHTLIGHT THORAX" },
    private_reactor: { zh: "私有反应堆", en: "PRIVATE REACTOR" },
    meltdown_countdown: { zh: "熔毁倒计时", en: "MELTDOWN COUNTDOWN" },
    rack_fever: { zh: "机架高烧", en: "RACK FEVER" },
    datacenter_sunburn: { zh: "数据中心晒伤", en: "DATACENTER SUNBURN" },
    private_heat_death: { zh: "私有热寂", en: "PRIVATE HEAT DEATH" },
    dice_organ: { zh: "骰子器官", en: "DICE ORGAN" },
    bad_luck_field: { zh: "坏运磁场", en: "BAD-LUCK FIELD" },
    probability_leak: { zh: "概率泄漏", en: "PROBABILITY LEAK" },
    edge_case_weather: { zh: "边界天气", en: "EDGE-CASE WEATHER" },
    rollback_prophecy: { zh: "回滚预言", en: "ROLLBACK PROPHECY" },
    production_poltergeist: {
      zh: "生产环境闹鬼",
      en: "PRODUCTION POLTERGEIST",
    },
    cold_sweat: { zh: "戒断冷汗", en: "WITHDRAWAL SWEATS" },
    offline_tinnitus: { zh: "离线耳鸣", en: "OFFLINE TINNITUS" },
    ai_intolerance: { zh: "AI 不耐受", en: "AI INTOLERANCE" },
    airplane_mode_rash: { zh: "飞行模式皮疹", en: "AIRPLANE-MODE RASH" },
    manual_thought_allergy: {
      zh: "手动思考过敏",
      en: "MANUAL-THOUGHT ALLERGY",
    },
    offline_organ_failure: {
      zh: "离线器官衰竭",
      en: "OFFLINE ORGAN FAILURE",
    },
  },
  temperaments: {
    voracious: { zh: "暴食型", en: "VORACIOUS" },
    ruminating: { zh: "过度思考型", en: "RUMINATING" },
    fossilized: { zh: "怀旧固化型", en: "FOSSILIZED" },
    clamorous: { zh: "多嘴合唱型", en: "CLAMOROUS" },
    self_igniting: { zh: "自燃型", en: "SELF-IGNITING" },
    dice_brained: { zh: "骰脑型", en: "DICE-BRAINED" },
    withdrawing: { zh: "戒断型", en: "WITHDRAWING" },
  },
  moods: {
    unhatched: { zh: "尚未污染", en: "UNCONTAMINATED" },
    token_chewing: { zh: "嚼 Token", en: "CHEWING TOKENS" },
    critical_overfeed: { zh: "过量发光", en: "CRITICALLY OVERFED" },
    mutation_high: { zh: "突变上头", en: "MUTATION HIGH" },
    withdrawal_tremor: { zh: "戒断手抖", en: "WITHDRAWAL TREMOR" },
    withdrawal_delirium: { zh: "离线幻听", en: "OFFLINE DELIRIUM" },
  },
  epithets: {
    unlicensed_specimen: { zh: "无证污染物", en: "UNLICENSED SPECIMEN" },
    token_sink: { zh: "Token 下水道", en: "TOKEN SINK" },
    appendix_hoarder: { zh: "附录囤积犯", en: "APPENDIX HOARDER" },
    cache_mummy: { zh: "缓存木乃伊", en: "CACHE MUMMY" },
    api_choir: { zh: "API 唱诗班", en: "API CHOIR" },
    desk_reactor: { zh: "桌面反应堆", en: "DESK REACTOR" },
    loaded_dice: { zh: "灌铅骰子", en: "LOADED DICE" },
    offline_hallucinator: { zh: "离线幻听者", en: "OFFLINE HALLUCINATOR" },
  },
};

function emptyCreatureAbilities() {
  return Object.fromEntries(CREATURE_ABILITY_KEYS.map((key) => [key, 0]));
}

function creatureRareChance(instability = 0) {
  return Math.min(20, 8 + Math.floor(instability / 10));
}

function creatureEvent(seed, date, instability = 0) {
  const digest = createHash("sha256").update(`${seed}:${date}`).digest();
  const rare =
    digest.readUInt32BE(0) % 100 < creatureRareChance(instability);
  const pool = rare ? RARE_CREATURE_EVENTS : COMMON_CREATURE_EVENTS;
  const event = pool[digest.readUInt32BE(4) % pool.length];
  return {
    ...event,
    rarity: rare ? "rare" : "common",
  };
}

function creatureRareAbilityGain(seed, date, active) {
  if (!active) return null;
  const digest = createHash("sha256")
    .update(`${seed}:${date}:rare-ability`)
    .digest();
  const roll = digest.readUInt32BE(0) % 100_000;
  const rarity =
    roll < 20
      ? "mythic"
      : roll < 120
        ? "epic"
        : roll < 620
          ? "rare"
          : null;
  if (!rarity) return null;
  const pool = CREATURE_RARE_ABILITY_POOLS[rarity];
  return {
    id: pool[digest.readUInt32BE(4) % pool.length],
    rarity,
    points: 1,
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

function creatureAbilityBar(value, maximum = CREATURE_ABILITY_MAX) {
  const filled =
    value === 0 ? 0 : Math.min(10, Math.ceil((value / maximum) * 10));
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)}`;
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

function dominantCreatureKey(values) {
  return Object.entries(values).sort(
    ([leftKey, left], [rightKey, right]) =>
      right - left || leftKey.localeCompare(rightKey),
  )[0][0];
}

function creatureAbilityGains(seed, date, day, event, hasHatched) {
  const gains = emptyCreatureAbilities();
  if (!day.active) {
    if (hasHatched) gains.withdrawal = 1;
    return gains;
  }

  const digest = createHash("sha256")
    .update(`${seed}:${date}:ability`)
    .digest();
  const branch = dominantCreatureKey(day.traits);
  const branchAbility = CREATURE_BRANCH_ABILITIES[branch];
  const randomPool = ["memory", "shell", "mouths", "glow", "instability"];
  const randomAbility = randomPool[digest.readUInt32BE(0) % randomPool.length];

  gains.appetite = day.pollutionDose >= 75 ? 2 : 1;
  gains[branchAbility] += 1;
  if (digest.readUInt8(4) % 4 === 0) gains[randomAbility] += 1;

  if (event) {
    const eventDefinition = [...COMMON_CREATURE_EVENTS, ...RARE_CREATURE_EVENTS]
      .find((candidate) => candidate.id === event.id);
    const eventAbility = CREATURE_BRANCH_ABILITIES[
      event.trait ?? eventDefinition?.trait
    ];
    if (eventAbility) {
      gains[eventAbility] += 1;
    }
    if (event.rarity === "rare") gains.instability += 1;
  }

  return gains;
}

function migrateCreatureState(state) {
  let hasHatched = false;
  for (const [date, day] of Object.entries(state.days).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    day.abilityGains ??= creatureAbilityGains(
      state.seed,
      date,
      day,
      day.event,
      hasHatched,
    );
    day.rareAbilityGain ??= creatureRareAbilityGain(
      state.seed,
      date,
      day.active,
    );
    if (day.active) hasHatched = true;
  }
  state.schemaVersion = 3;
  return state;
}

function creatureStatePath() {
  return path.join(os.homedir(), ".anti-ai", "creature.json");
}

async function loadCreatureState() {
  try {
    const contents = await readFile(creatureStatePath(), "utf8");
    const state = JSON.parse(contents);
    if ([1, 2, 3].includes(state?.schemaVersion) && state.days) {
      state.seed ??=
        process.env.ANTI_AI_CREATURE_SEED ?? randomBytes(8).toString("hex");
      return migrateCreatureState(state);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return {
    schemaVersion: 3,
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

function unlockedCreatureTalents(abilities) {
  return CREATURE_ABILITY_KEYS.flatMap((ability) =>
    CREATURE_TALENTS[ability]
      .filter((talent) => abilities[ability] >= talent.threshold)
      .map((talent) => talent.id),
  );
}

function creatureMood(creature, today) {
  if (creature.activeDays === 0) return "unhatched";
  if (!today.active) {
    return creature.quietStreakDays >= 3
      ? "withdrawal_delirium"
      : "withdrawal_tremor";
  }
  if (today.event?.rarity === "rare") return "mutation_high";
  if (today.pollutionDose >= 75) return "critical_overfeed";
  return "token_chewing";
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
  const abilities = emptyCreatureAbilities();
  const rareAbilityLevels = {};
  let exposure = 0;
  let activeDays = 0;
  let activeStreakDays = 0;
  let quietStreakDays = 0;
  let ageDays = 0;
  let mutationEvents = 0;
  let rareMutations = 0;

  for (const [, day] of entries) {
    if (day.active) {
      exposure += day.pollutionDose;
      activeDays += 1;
      activeStreakDays += 1;
      quietStreakDays = 0;
      for (const key of Object.keys(traits)) traits[key] += day.traits[key];
      mutationEvents += 1;
      if (day.event?.rarity === "rare") rareMutations += 1;
    } else if (activeDays > 0) {
      exposure = Math.max(0, exposure - 2);
      activeStreakDays = 0;
      quietStreakDays += 1;
    }
    if (activeDays > 0) ageDays += 1;
    for (const key of CREATURE_ABILITY_KEYS) {
      abilities[key] = Math.min(
        CREATURE_ABILITY_MAX,
        abilities[key] + (day.abilityGains?.[key] ?? 0),
      );
    }
    if (day.rareAbilityGain) {
      const { id, points } = day.rareAbilityGain;
      rareAbilityLevels[id] = Math.min(
        CREATURE_RARE_ABILITY_MAX,
        (rareAbilityLevels[id] ?? 0) + points,
      );
    }
  }

  for (const key of Object.keys(traits)) traits[key] = roundCreature(traits[key]);
  const branch = dominantCreatureKey(traits);
  const resolvedBranch = activeDays === 0 ? "nuclear" : branch;
  const dominantAbility = dominantCreatureKey(abilities);
  const abilityPoints = Object.values(abilities).reduce(
    (sum, value) => sum + value,
    0,
  );
  const talents = unlockedCreatureTalents(abilities);
  const rareAbilities = Object.fromEntries(
    Object.entries(CREATURE_RARE_ABILITY_DEFINITIONS)
      .filter(([id]) => rareAbilityLevels[id] > 0)
      .map(([id, definition]) => [
        id,
        {
          rarity: definition.rarity,
          level: rareAbilityLevels[id],
        },
      ]),
  );
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
    activeStreakDays,
    ageDays,
    observedDays: entries.length,
    activeDays,
    traits,
    level: 1 + Math.floor(abilityPoints / 10),
    abilities,
    abilityPoints,
    dominantAbility,
    temperament: CREATURE_TEMPERAMENTS[dominantAbility],
    epithet:
      activeDays === 0
        ? "unlicensed_specimen"
        : CREATURE_EPITHETS[dominantAbility],
    talents,
    rareChancePercent: creatureRareChance(abilities.instability),
    rareAbilities,
    rareAbilityChancesPercent: { ...CREATURE_RARE_ABILITY_CHANCES },
    collections: {
      mutationEvents,
      rareMutations,
      talentsUnlocked: talents.length,
      rareAbilitiesUnlocked: Object.keys(rareAbilities).length,
    },
  };
}

export {
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
};
