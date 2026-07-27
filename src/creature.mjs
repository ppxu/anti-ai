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
    nextAt: 7,
  },
  {
    id: "mutated_juvenile",
    threshold: 7,
    nextAt: 30,
  },
  {
    id: "runaway_adult",
    threshold: 30,
    nextAt: 90,
  },
  {
    id: "catastrophe_complete",
    threshold: 90,
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

const CREATURE_APPEARANCE_GENE_POOLS = {
  body: ["body_01", "body_02", "body_03", "body_04", "body_05", "body_06"],
  eyes: [
    "eyes_01",
    "eyes_02",
    "eyes_03",
    "eyes_04",
    "eyes_05",
    "eyes_06",
    "eyes_07",
    "eyes_08",
  ],
  mouth: [
    "mouth_01",
    "mouth_02",
    "mouth_03",
    "mouth_04",
    "mouth_05",
    "mouth_06",
    "mouth_07",
    "mouth_08",
  ],
  core: ["core_01", "core_02", "core_03", "core_04", "core_05", "core_06"],
  limbs: [
    "limbs_01",
    "limbs_02",
    "limbs_03",
    "limbs_04",
    "limbs_05",
    "limbs_06",
  ],
  tail: ["tail_01", "tail_02", "tail_03", "tail_04", "tail_05", "tail_06"],
  pattern: [
    "pattern_01",
    "pattern_02",
    "pattern_03",
    "pattern_04",
    "pattern_05",
    "pattern_06",
  ],
};
const CREATURE_APPEARANCE_GLYPHS = {
  body: {
    body_01: { top: "_", left: "/", right: "\\", lower: "_" },
    body_02: { top: "=", left: "{", right: "}", lower: "-" },
    body_03: { top: "~", left: "(", right: ")", lower: "~" },
    body_04: { top: "#", left: "[", right: "]", lower: "=" },
    body_05: { top: ".", left: "<", right: ">", lower: "." },
    body_06: { top: "-", left: "/", right: "\\", lower: "^" },
  },
  eyes: {
    eyes_01: "o   o",
    eyes_02: "O   O",
    eyes_03: "@   @",
    eyes_04: "x   x",
    eyes_05: "+   +",
    eyes_06: "* o *",
    eyes_07: "0 0 0",
    eyes_08: "#   #",
  },
  mouth: {
    mouth_01: " ___ ",
    mouth_02: " === ",
    mouth_03: " ||| ",
    mouth_04: " vvv ",
    mouth_05: " www ",
    mouth_06: " --- ",
    mouth_07: " [_] ",
    mouth_08: " }{ ",
  },
  core: {
    core_01: "@",
    core_02: "0",
    core_03: "*",
    core_04: "#",
    core_05: "+",
    core_06: "-",
  },
  limbs: {
    limbs_01: "/|\\",
    limbs_02: "/_\\",
    limbs_03: "v v",
    limbs_04: "|| ||",
    limbs_05: "/Y\\",
    limbs_06: "_/\\_",
  },
  tail: {
    tail_01: "~>",
    tail_02: "==",
    tail_03: "~~",
    tail_04: "->",
    tail_05: "::",
    tail_06: "##",
  },
  pattern: {
    pattern_01: ". . .",
    pattern_02: "x-x-x",
    pattern_03: ":::::",
    pattern_04: "+-+-+",
    pattern_05: "[=*=]",
    pattern_06: "o-o-o",
  },
};
const CREATURE_BRANCH_PARTS = {
  context: "organ_context_folio",
  cache: "organ_cache_strata",
  frenzy: "organ_request_buds",
  nuclear: "organ_nuclear_fins",
};
const CREATURE_ECOLOGY_PARTS = {
  unformed: "ecology_blank_membrane",
  polluted: "ecology_pollution_thorns",
  lucid: "ecology_clarity_seal",
  paradox: "ecology_paradox_bindings",
};
const CREATURE_ECOLOGY_FORM_IDS = {
  unformed: {
    context: "blank_dossier_embryo",
    cache: "standby_moss",
    frenzy: "unsent_spore",
    nuclear: "extinguished_core",
  },
  polluted: {
    context: "dossier_devourer",
    cache: "fossil_armor_tyrant",
    frenzy: "request_hydra",
    nuclear: "nuclear_calamity",
  },
  lucid: {
    context: "sealed_page_sentinel",
    cache: "empty_cache_monk",
    frenzy: "sealed_mouth_abstainer",
    nuclear: "cold_core_silent",
  },
  paradox: {
    context: "self_bound_dossier_matrix",
    cache: "cache_holy_remains",
    frenzy: "sealed_request_hydra",
    nuclear: "withdrawal_reactor",
  },
};
const CREATURE_ACHIEVEMENT_DEFINITIONS = [
  ["baseline_arsonist", "offense", "uncommon"],
  ["context_hamster", "offense", "uncommon"],
  ["cache_excavation_team", "offense", "uncommon"],
  ["request_hydra", "offense", "uncommon"],
  ["desk_reactor", "offense", "uncommon"],
  ["seven_day_feeding", "offense", "common"],
  ["one_day_calamity", "offense", "rare"],
  ["stable_relapse", "offense", "rare"],
  ["first_supply_cut", "sobriety", "common"],
  ["three_day_seal", "sobriety", "common"],
  ["seven_day_silence", "sobriety", "uncommon"],
  ["below_baseline_survivor", "sobriety", "uncommon"],
  ["half_price_brain", "sobriety", "uncommon"],
  ["human_mode_reboot", "sobriety", "rare"],
  ["fourteen_day_diet", "sobriety", "rare"],
  ["sober_and_alive", "sobriety", "rare"],
  ["refill_withdrawal", "paradox", "uncommon"],
  ["calm_after_fire", "paradox", "rare"],
  ["ecological_ping_pong", "paradox", "rare"],
  ["cache_saint", "paradox", "rare"],
  ["sealed_hydra", "paradox", "rare"],
  ["withdrawal_reactor", "paradox", "rare"],
  ["double_sided_record", "paradox", "rare"],
  ["ecological_paradox", "paradox", "mythic"],
].map(([id, category, rarity]) => ({ id, category, rarity }));
const CREATURE_ACHIEVEMENT_BY_ID = Object.fromEntries(
  CREATURE_ACHIEVEMENT_DEFINITIONS.map((achievement) => [
    achievement.id,
    achievement,
  ]),
);
const CREATURE_ACHIEVEMENT_TIER_THRESHOLDS = {
  baseline_arsonist: [3, 10, 30],
  context_hamster: [5, 20, 60],
  cache_excavation_team: [5, 20, 60],
  request_hydra: [5, 20, 60],
  desk_reactor: [5, 20, 60],
  seven_day_feeding: [7, 30, 100],
  three_day_seal: [3, 7, 30],
  below_baseline_survivor: [5, 20, 60],
  half_price_brain: [3, 10, 30],
  human_mode_reboot: [3, 7, 14],
  double_sided_record: [60, 120, 240],
  ecological_paradox: [120, 240, 500],
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
      zh: "异常胚体 I",
      en: "ANOMALOUS EMBRYO I",
    },
    mutated_juvenile: {
      zh: "分化幼体 II",
      en: "DIFFERENTIATING JUVENILE II",
    },
    runaway_adult: {
      zh: "定型成体 III",
      en: "FORMED ADULT III",
    },
    catastrophe_complete: {
      zh: "生态完全体 IV",
      en: "ECOLOGICAL COMPLETE IV",
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
  ecologies: {
    unformed: { zh: "未定型", en: "UNFORMED" },
    polluted: { zh: "污染型", en: "POLLUTED" },
    lucid: { zh: "清醒型", en: "LUCID" },
    paradox: { zh: "矛盾型", en: "PARADOX" },
  },
  ecologyForms: {
    blank_dossier_embryo: { zh: "空白卷宗胚", en: "BLANK DOSSIER EMBRYO" },
    standby_moss: { zh: "待机苔藓", en: "STANDBY MOSS" },
    unsent_spore: { zh: "未发送孢子", en: "UNSENT SPORE" },
    extinguished_core: { zh: "熄火幼核", en: "EXTINGUISHED CORE" },
    dossier_devourer: { zh: "卷宗吞噬兽", en: "DOSSIER DEVOURER" },
    fossil_armor_tyrant: {
      zh: "化石甲暴君",
      en: "FOSSIL ARMOR TYRANT",
    },
    request_hydra: { zh: "请求九头虫", en: "REQUEST HYDRA" },
    nuclear_calamity: { zh: "核食灾兽", en: "NUCLEAR CALAMITY" },
    sealed_page_sentinel: {
      zh: "封页守望兽",
      en: "SEALED-PAGE SENTINEL",
    },
    empty_cache_monk: { zh: "空缓存修士", en: "EMPTY-CACHE MONK" },
    sealed_mouth_abstainer: {
      zh: "缄口节制兽",
      en: "SEALED-MOUTH ABSTAINER",
    },
    cold_core_silent: { zh: "冷核静默体", en: "COLD-CORE SILENT" },
    self_bound_dossier_matrix: {
      zh: "自缚卷宗母体",
      en: "SELF-BOUND DOSSIER MATRIX",
    },
    cache_holy_remains: { zh: "缓存圣骸", en: "CACHE HOLY REMAINS" },
    sealed_request_hydra: {
      zh: "闭口九头兽",
      en: "SEALED REQUEST HYDRA",
    },
    withdrawal_reactor: { zh: "戒断反应堆", en: "WITHDRAWAL REACTOR" },
  },
  titleModifiers: {
    awaiting_shape: { zh: "等待被工作塑形的", en: "AWAITING WORK-SHAPED" },
    scheduled_relapse: { zh: "每晚准时复发的", en: "NIGHTLY RELAPSING" },
    practicing_restraint: { zh: "认真戒断的", en: "PRACTICING RESTRAINT" },
    silent_for_seven_days: {
      zh: "七日未开口的",
      en: "SILENT FOR SEVEN DAYS",
    },
    withdrawing_while_refilling: {
      zh: "一边戒断一边续杯的",
      en: "WITHDRAWING WHILE REFILLING",
    },
  },
  achievements: {
    baseline_arsonist: { zh: "基线纵火犯", en: "BASELINE ARSONIST" },
    context_hamster: { zh: "上下文仓鼠", en: "CONTEXT HAMSTER" },
    cache_excavation_team: {
      zh: "缓存考古队",
      en: "CACHE EXCAVATION TEAM",
    },
    request_hydra: { zh: "请求九头蛇", en: "REQUEST HYDRA" },
    desk_reactor: { zh: "桌面反应堆", en: "DESK REACTOR" },
    seven_day_feeding: { zh: "七日连喂", en: "SEVEN-DAY FEEDING" },
    one_day_calamity: { zh: "单日灾变", en: "ONE-DAY CALAMITY" },
    stable_relapse: { zh: "稳定复发", en: "STABLE RELAPSE" },
    first_supply_cut: { zh: "第一次断供", en: "FIRST SUPPLY CUT" },
    three_day_seal: { zh: "三日封口", en: "THREE-DAY SEAL" },
    seven_day_silence: { zh: "七日未开口", en: "SEVEN-DAY SILENCE" },
    below_baseline_survivor: {
      zh: "基线以下生存者",
      en: "BELOW-BASELINE SURVIVOR",
    },
    half_price_brain: { zh: "半价大脑", en: "HALF-PRICE BRAIN" },
    human_mode_reboot: { zh: "人类模式复健", en: "HUMAN-MODE REBOOT" },
    fourteen_day_diet: { zh: "十四日节食", en: "FOURTEEN-DAY DIET" },
    sober_and_alive: { zh: "清醒而未死", en: "SOBER AND ALIVE" },
    refill_withdrawal: { zh: "续杯戒断者", en: "REFILL WITHDRAWAL" },
    calm_after_fire: { zh: "浴火冷静", en: "CALM AFTER FIRE" },
    ecological_ping_pong: { zh: "生态横跳", en: "ECOLOGICAL PING-PONG" },
    cache_saint: { zh: "缓存圣徒", en: "CACHE SAINT" },
    sealed_hydra: { zh: "闭口九头兽", en: "SEALED HYDRA" },
    withdrawal_reactor: { zh: "戒断反应堆", en: "WITHDRAWAL REACTOR" },
    double_sided_record: { zh: "双面病历", en: "DOUBLE-SIDED RECORD" },
    ecological_paradox: { zh: "生态悖论", en: "ECOLOGICAL PARADOX" },
  },
  achievementTiers: {
    offense_1: { zh: "记录", en: "RECORDED" },
    offense_2: { zh: "定罪", en: "CONVICTED" },
    offense_3: { zh: "惯犯", en: "HABITUAL OFFENDER" },
    sobriety_1: { zh: "迹象", en: "SIGN" },
    sobriety_2: { zh: "自律", en: "DISCIPLINE" },
    sobriety_3: { zh: "圣徒", en: "SAINT" },
    paradox_1: { zh: "异常", en: "ANOMALY" },
    paradox_2: { zh: "矛盾", en: "CONTRADICTION" },
    paradox_3: { zh: "不可解释", en: "INEXPLICABLE" },
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

function creatureTitle(creature, lang) {
  const modifier = creatureLabel(
    "titleModifiers",
    creature.title.modifierId,
    lang,
  );
  const core = creatureLabel("ecologyForms", creature.title.coreId, lang);
  const achievement = creature.title.achievementId
    ? creatureLabel("achievements", creature.title.achievementId, lang)
    : null;
  const base = lang === "zh" ? `${modifier}${core}` : `${modifier} ${core}`;
  return achievement ? `${base} · ${achievement}` : base;
}

function centeredCreatureText(value, width) {
  const left = Math.max(0, Math.floor((width - value.length) / 2));
  return `${" ".repeat(left)}${value}`;
}

function creatureArt(creature) {
  const { appearance } = creature;
  const geneIds = appearance.geneIds;
  const body = CREATURE_APPEARANCE_GLYPHS.body[geneIds.body];
  const stageWidths = [23, 27, 33, 39];
  const width = stageWidths[appearance.stageIndex];
  const insideWidth = width - 2;
  const branchCrests = {
    context: "[[[...]]]",
    cache: "###=###",
    frenzy: "(o)(o)(o)",
    nuclear: "/\\/\\/\\",
  };
  const ecologyMarks = {
    unformed: ".....",
    polluted: "!!~!!",
    lucid: "--X--",
    paradox: "!X!X!",
  };
  const centerInside = (value) => {
    const padding = Math.max(0, insideWidth - value.length);
    const left = Math.floor(padding / 2);
    return `${" ".repeat(left)}${value}${" ".repeat(padding - left)}`;
  };
  const mouthAndCore =
    appearance.stageIndex >= 2
      ? `${CREATURE_APPEARANCE_GLYPHS.mouth[geneIds.mouth]}  ${CREATURE_APPEARANCE_GLYPHS.core[geneIds.core]}`
      : CREATURE_APPEARANCE_GLYPHS.mouth[geneIds.mouth];
  const rarePattern = appearance.rareAbilityId
    ? {
        rare: "@R@R@",
        epic: "@S@S@",
        mythic: "@X@X@",
      }[CREATURE_RARE_ABILITY_DEFINITIONS[appearance.rareAbilityId].rarity]
    : null;
  const pattern =
    rarePattern ??
    (appearance.stageIndex >= 3
      ? appearance.achievementCategory === "offense"
        ? "!!x!!"
        : appearance.achievementCategory === "sobriety"
          ? "--X--"
          : appearance.achievementCategory === "paradox"
            ? "!X?X!"
            : CREATURE_APPEARANCE_GLYPHS.pattern[geneIds.pattern]
      : ecologyMarks[appearance.ecology]);
  const limbs =
    appearance.stageIndex >= 1
      ? CREATURE_APPEARANCE_GLYPHS.limbs[geneIds.limbs]
      : "/\\";
  const tail =
    appearance.stageIndex >= 3
      ? ` ${CREATURE_APPEARANCE_GLYPHS.tail[geneIds.tail]}`
      : "";
  const lines = [
    centeredCreatureText(
      appearance.stageIndex >= 1
        ? branchCrests[appearance.pathology]
        : ecologyMarks[appearance.ecology],
      width,
    ),
    `${body.left}${body.top.repeat(insideWidth)}${body.right}`,
    `${body.left}${centerInside(
      CREATURE_APPEARANCE_GLYPHS.eyes[geneIds.eyes],
    )}${body.right}`,
    `${body.left}${centerInside(mouthAndCore)}${body.right}`,
    `${body.left}${centerInside(pattern)}${body.right}`,
    `${body.right}${body.lower.repeat(insideWidth)}${body.left}`,
    centeredCreatureText(`${limbs}${tail}`, width),
  ];
  const colorCode = appearance.rareAbilityId
    ? CREATURE_RARE_ABILITY_RANKS[
        CREATURE_RARE_ABILITY_DEFINITIONS[appearance.rareAbilityId].rarity
      ].color
    : {
        unformed: "2",
        polluted: "1;31",
        lucid: "1;36",
        paradox: "1;35",
      }[appearance.ecology];
  return lines.map((line) => color(colorCode, line)).join("\n");
}

function creatureAbilityBar(value, maximum = CREATURE_ABILITY_MAX) {
  const filled =
    value === 0 ? 0 : Math.min(10, Math.ceil((value / maximum) * 10));
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)}`;
}

function roundCreature(value) {
  return Number(value.toFixed(2));
}

function creatureAppearanceState(seed) {
  const digest = createHash("sha256")
    .update(`${seed}:appearance-v1`)
    .digest();
  const genes = Object.fromEntries(
    Object.entries(CREATURE_APPEARANCE_GENE_POOLS).map(
      ([gene, pool], index) => [
        gene,
        pool[digest.readUInt8(index) % pool.length],
      ],
    ),
  );
  return {
    version: 1,
    specimenId: createHash("sha256")
      .update(`${seed}:public-specimen`)
      .digest("hex")
      .slice(0, 8),
    genes,
    unlockedPartIds: [],
  };
}

function deriveCreatureAppearance(
  appearanceState,
  stageIndex,
  ecology,
  pathology,
  achievements,
  rareAbilities,
) {
  const partIds = [
    appearanceState.genes.body,
    appearanceState.genes.eyes,
    appearanceState.genes.mouth,
  ];
  if (stageIndex >= 1) {
    partIds.push(
      CREATURE_BRANCH_PARTS[pathology],
      CREATURE_ECOLOGY_PARTS[ecology],
    );
  }
  if (stageIndex >= 2) {
    partIds.push(appearanceState.genes.core, appearanceState.genes.limbs);
  }
  const latestAchievement = [...achievements].sort(
    (left, right) =>
      left.tier - right.tier ||
      left.unlockedAt.localeCompare(right.unlockedAt) ||
      left.id.localeCompare(right.id),
  ).at(-1);
  const latestRareAbilityId = Object.keys(rareAbilities).at(-1);
  if (stageIndex >= 3) {
    partIds.push(
      appearanceState.genes.tail,
      latestRareAbilityId
        ? `chromatic_${latestRareAbilityId}`
        : latestAchievement
          ? `achievement_${latestAchievement.id}`
          : appearanceState.genes.pattern,
    );
  }
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        version: appearanceState.version,
        genes: appearanceState.genes,
        stageIndex,
        ecology,
        pathology,
        partIds,
        rareAbilityId: latestRareAbilityId,
      }),
    )
    .digest("hex")
    .slice(0, 12);
  return {
    version: appearanceState.version,
    specimenId: appearanceState.specimenId,
    geneIds: { ...appearanceState.genes },
    partIds,
    fingerprint,
    stageIndex,
    ecology,
    pathology,
    formId: CREATURE_ECOLOGY_FORM_IDS[ecology][pathology],
    achievementId: latestAchievement?.id ?? null,
    achievementCategory: latestAchievement?.category ?? null,
    rareAbilityId: latestRareAbilityId ?? null,
  };
}

function creatureAppearanceContentStats() {
  return {
    basePartIds: new Set([
      ...Object.values(CREATURE_APPEARANCE_GENE_POOLS).flat(),
      ...Object.values(CREATURE_BRANCH_PARTS),
      ...Object.values(CREATURE_ECOLOGY_PARTS),
    ]).size,
    formFamilies: Object.values(CREATURE_ECOLOGY_FORM_IDS).reduce(
      (total, forms) => total + Object.keys(forms).length,
      0,
    ),
    achievements: CREATURE_ACHIEVEMENT_DEFINITIONS.length,
  };
}

function pollutionDose(totalTokens) {
  if (totalTokens <= 0) return 0;
  return Math.min(100, Math.max(1, Math.round(Math.log10(totalTokens + 1) * 12)));
}

function dailyCreatureRecord(report, historicalReports = []) {
  const { totals } = report;
  const dose = pollutionDose(totals.totalTokens);
  if (dose === 0) {
    return {
      pollutionDose: 0,
      active: false,
      usageBand: "sober",
      ecologyGains: {
        pollution: 0,
        clarity: 3,
      },
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
  const baselineTokens =
    historicalReports.length === 0
      ? 0
      : historicalReports.reduce(
          (sum, historicalReport) =>
            sum + historicalReport.totals.totalTokens,
          0,
        ) / historicalReports.length;
  const ratio = baselineTokens === 0 ? null : totals.totalTokens / baselineTokens;
  const [usageBand, ecologyGains] =
    ratio === null
      ? ["calibrating", { pollution: 1, clarity: 0 }]
      : ratio <= 0.3
        ? ["restrained", { pollution: 0, clarity: 2 }]
        : ratio <= 0.7
          ? ["light", { pollution: 0, clarity: 1 }]
          : ratio <= 1.5
            ? ["habitual", { pollution: 0, clarity: 0 }]
            : ratio <= 3
              ? ["heavy", { pollution: 1, clarity: 0 }]
              : ratio <= 6
                ? ["binge", { pollution: 2, clarity: 0 }]
                : ["meltdown", { pollution: 3, clarity: 0 }];

  return {
    pollutionDose: dose,
    active: true,
    usageBand,
    ecologyGains,
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

function deriveCreatureAchievements(state, date) {
  const entries = Object.entries(state.days)
    .filter(([entryDate]) => entryDate <= date)
    .sort(([left], [right]) => left.localeCompare(right));
  const unlocked = new Map();
  const unlock = (id, unlockedAt, progress = null) => {
    const definition = CREATURE_ACHIEVEMENT_BY_ID[id];
    const thresholds = CREATURE_ACHIEVEMENT_TIER_THRESHOLDS[id] ?? null;
    const existing = unlocked.get(id);
    const bestProgress =
      progress === null
        ? null
        : Math.max(existing?.progress ?? 0, progress);
    const tier =
      thresholds === null
        ? 1
        : thresholds.filter((threshold) => bestProgress >= threshold).length;
    unlocked.set(id, {
      id,
      category: definition.category,
      rarity: definition.rarity,
      tier,
      maxTier: thresholds?.length ?? 1,
      progress: bestProgress,
      nextTierAt: thresholds?.[tier] ?? null,
      unlockedAt: existing?.unlockedAt ?? unlockedAt,
    });
  };
  const branchCounts = { context: 0, cache: 0, frenzy: 0, nuclear: 0 };
  const branchStreaks = { context: 0, cache: 0, frenzy: 0, nuclear: 0 };
  const cumulativeTraits = { context: 0, cache: 0, frenzy: 0, nuclear: 0 };
  const recentDirections = [];
  let hasHatched = false;
  let experienceDays = 0;
  let activeStreak = 0;
  let quietStreak = 0;
  let heavyDays = 0;
  let restrainedDays = 0;
  let pollutionDays = 0;
  let clarityDays = 0;
  let ecologyPollution = 0;
  let ecologyClarity = 0;
  let ecologyType = "unformed";
  let pendingEcologyType = null;
  let pendingEcologyDays = 0;
  let clarityAfterHeavy = 0;
  let previousUsageBand = null;

  for (const [entryDate, day] of entries) {
    const priorQuietStreak = quietStreak;
    if (!hasHatched && !day.active) continue;
    if (day.active) hasHatched = true;
    experienceDays += 1;

    if (day.active) {
      activeStreak += 1;
      quietStreak = 0;
      if (priorQuietStreak >= 3) unlock("refill_withdrawal", entryDate);
      const branch = dominantCreatureKey(day.traits);
      for (const key of Object.keys(branchStreaks)) {
        branchStreaks[key] = key === branch ? branchStreaks[key] + 1 : 0;
      }
      branchCounts[branch] += 1;
      for (const key of Object.keys(cumulativeTraits)) {
        cumulativeTraits[key] += day.traits[key];
      }
    } else {
      activeStreak = 0;
      quietStreak += 1;
      if (quietStreak === 1) unlock("first_supply_cut", entryDate);
    }

    const pollutionGain = day.ecologyGains?.pollution ?? 0;
    const clarityGain = day.ecologyGains?.clarity ?? 0;
    ecologyPollution += pollutionGain;
    ecologyClarity += clarityGain;
    if (pollutionGain > 0) pollutionDays += 1;
    if (clarityGain > 0) clarityDays += 1;
    recentDirections.push(
      pollutionGain > 0 ? "pollution" : clarityGain > 0 ? "clarity" : "neutral",
    );
    if (recentDirections.length > 14) recentDirections.shift();

    const candidateEcologyType = classifyCreatureEcology(
      ecologyPollution,
      ecologyClarity,
      experienceDays,
    );
    if (candidateEcologyType === ecologyType) {
      pendingEcologyType = null;
      pendingEcologyDays = 0;
    } else {
      if (candidateEcologyType === pendingEcologyType) {
        pendingEcologyDays += 1;
      } else {
        pendingEcologyType = candidateEcologyType;
        pendingEcologyDays = 1;
      }
      if (pendingEcologyDays >= 3) {
        ecologyType = candidateEcologyType;
        pendingEcologyType = null;
        pendingEcologyDays = 0;
      }
    }

    if (["heavy", "binge", "meltdown"].includes(day.usageBand)) {
      heavyDays += 1;
      clarityAfterHeavy = 0;
    } else if (clarityGain > 0 && heavyDays > 0) {
      clarityAfterHeavy += 1;
    } else if (pollutionGain > 0) {
      clarityAfterHeavy = 0;
    }
    if (day.usageBand === "restrained") restrainedDays += 1;

    if (heavyDays >= 3) {
      unlock("baseline_arsonist", entryDate, heavyDays);
    }
    if (branchStreaks.context >= 5) {
      unlock("context_hamster", entryDate, branchStreaks.context);
    }
    if (branchCounts.cache >= 5) {
      unlock("cache_excavation_team", entryDate, branchCounts.cache);
    }
    if (branchCounts.frenzy >= 5) {
      unlock("request_hydra", entryDate, branchCounts.frenzy);
    }
    if (branchCounts.nuclear >= 5) {
      unlock("desk_reactor", entryDate, branchCounts.nuclear);
    }
    if (activeStreak >= 7) {
      unlock("seven_day_feeding", entryDate, activeStreak);
    }
    if (pollutionGain >= 3) unlock("one_day_calamity", entryDate);
    if (
      recentDirections.length === 14 &&
      recentDirections.filter((direction) => direction === "pollution").length >=
        10
    ) {
      unlock("stable_relapse", entryDate);
    }

    if (quietStreak >= 3) {
      unlock("three_day_seal", entryDate, quietStreak);
    }
    if (quietStreak >= 7) unlock("seven_day_silence", entryDate);
    if (clarityDays >= 5) {
      unlock("below_baseline_survivor", entryDate, clarityDays);
    }
    if (restrainedDays >= 3) {
      unlock("half_price_brain", entryDate, restrainedDays);
    }
    if (clarityAfterHeavy >= 3) {
      unlock("human_mode_reboot", entryDate, clarityAfterHeavy);
    }
    if (
      recentDirections.length === 14 &&
      recentDirections.filter((direction) => direction === "clarity").length >=
        10
    ) {
      unlock("fourteen_day_diet", entryDate);
    }
    if (experienceDays >= 90 && ecologyType === "lucid") {
      unlock("sober_and_alive", entryDate);
    }

    if (previousUsageBand === "meltdown" && day.usageBand === "sober") {
      unlock("calm_after_fire", entryDate);
    }
    const lastTenDirections = recentDirections
      .slice(-10)
      .filter((direction) => direction !== "neutral");
    const directionChanges = lastTenDirections
      .slice(1)
      .filter(
        (direction, index) => direction !== lastTenDirections[index],
      ).length;
    if (directionChanges >= 6) unlock("ecological_ping_pong", entryDate);

    const cumulativeBranch = dominantCreatureKey(cumulativeTraits);
    if (cumulativeBranch === "cache" && ecologyType === "lucid") {
      unlock("cache_saint", entryDate);
    }
    if (cumulativeBranch === "frenzy" && quietStreak >= 7) {
      unlock("sealed_hydra", entryDate);
    }
    if (
      cumulativeBranch === "nuclear" &&
      ecologyPollution > 0 &&
      ecologyClarity >= ecologyPollution
    ) {
      unlock("withdrawal_reactor", entryDate);
    }
    if (ecologyPollution >= 60 && ecologyClarity >= 60) {
      unlock(
        "double_sided_record",
        entryDate,
        Math.min(ecologyPollution, ecologyClarity),
      );
    }
    if (
      ecologyPollution >= 120 &&
      ecologyClarity >= 120 &&
      Math.abs(ecologyPollution - ecologyClarity) <= 10
    ) {
      unlock(
        "ecological_paradox",
        entryDate,
        Math.min(ecologyPollution, ecologyClarity),
      );
    }
    previousUsageBand = day.usageBand;
  }

  const records = [...unlocked.values()].sort(
    (left, right) =>
      left.unlockedAt.localeCompare(right.unlockedAt) ||
      left.id.localeCompare(right.id),
  );
  return {
    unlocked: records,
    recent: records.filter((achievement) => achievement.unlockedAt === date),
    total: CREATURE_ACHIEVEMENT_DEFINITIONS.length,
  };
}

function syncCreatureAchievements(state, date) {
  const achievements = deriveCreatureAchievements(state, date);
  state.achievements = Object.fromEntries(
    achievements.unlocked.map((achievement) => [
      achievement.id,
      achievement,
    ]),
  );
  for (const day of Object.values(state.days)) {
    day.achievementUnlockIds = [];
  }
  for (const achievement of achievements.unlocked) {
    state.days[achievement.unlockedAt]?.achievementUnlockIds.push(
      achievement.id,
    );
  }
  state.appearance.unlockedPartIds = [
    ...new Set([
      ...state.appearance.unlockedPartIds,
      ...achievements.unlocked.map(
        (achievement) => `achievement_${achievement.id}`,
      ),
    ]),
  ];
  return achievements;
}

function syncCreatureSpecimen(state, creature, date) {
  state.specimens ??= [];
  if (
    state.specimens.some(
      (specimen) => specimen.fingerprint === creature.appearance.fingerprint,
    )
  ) {
    return false;
  }
  const previous = state.specimens.at(-1);
  const appearanceChanged =
    previous === undefined ||
    previous.stageId !== creature.stage ||
    previous.ecologyId !== creature.ecology.type ||
    previous.achievementId !== creature.appearance.achievementId ||
    (creature.appearance.rareAbilityId !== null &&
      previous.rareAbilityId !== creature.appearance.rareAbilityId);
  if (!appearanceChanged) return false;
  state.specimens.push({
    fingerprint: creature.appearance.fingerprint,
    renderVersion: creature.appearance.version,
    recordedAt: date,
    experienceDays: creature.experienceDays,
    stageId: creature.stage,
    ecologyId: creature.ecology.type,
    pathologyId: creature.branch,
    achievementId: creature.appearance.achievementId,
    rareAbilityId: creature.appearance.rareAbilityId,
    partIds: [...creature.appearance.partIds],
  });
  return true;
}

function migrateCreatureState(state) {
  state.appearance ??= creatureAppearanceState(state.seed);
  state.appearance.unlockedPartIds ??= [];
  state.achievements ??= {};
  state.specimens ??= [];
  let hasHatched = false;
  for (const [date, day] of Object.entries(state.days).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    day.usageBand ??= day.active ? "calibrating" : "sober";
    day.ecologyGains ??= day.active
      ? { pollution: 1, clarity: 0 }
      : {
          pollution: 0,
          clarity: hasHatched ? 3 : 0,
        };
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
  state.schemaVersion = 4;
  return state;
}

function creatureStatePath() {
  return path.join(os.homedir(), ".anti-ai", "creature.json");
}

async function loadCreatureState() {
  try {
    const contents = await readFile(creatureStatePath(), "utf8");
    const state = JSON.parse(contents);
    if ([1, 2, 3, 4].includes(state?.schemaVersion) && state.days) {
      state.seed ??=
        process.env.ANTI_AI_CREATURE_SEED ?? randomBytes(8).toString("hex");
      return migrateCreatureState(state);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return migrateCreatureState({
    schemaVersion: 4,
    seed:
      process.env.ANTI_AI_CREATURE_SEED ?? randomBytes(8).toString("hex"),
    days: {},
  });
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

function classifyCreatureEcology(pollution, clarity, experienceDays) {
  if (experienceDays === 0) return "unformed";
  const pollutionRate = pollution / experienceDays;
  const clarityRate = clarity / experienceDays;
  if (pollutionRate >= 0.6 && clarityRate >= 0.6) return "paradox";
  if (pollutionRate >= 0.6) return "polluted";
  if (clarityRate >= 0.6) return "lucid";
  return "unformed";
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
  let ecologyPollution = 0;
  let ecologyClarity = 0;
  let ecologyType = "unformed";
  let pendingEcologyType = null;
  let pendingEcologyDays = 0;

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
    if (activeDays > 0) {
      ecologyPollution += day.ecologyGains?.pollution ?? 0;
      ecologyClarity += day.ecologyGains?.clarity ?? 0;
      const candidateEcologyType = classifyCreatureEcology(
        ecologyPollution,
        ecologyClarity,
        ageDays,
      );
      if (candidateEcologyType === ecologyType) {
        pendingEcologyType = null;
        pendingEcologyDays = 0;
      } else {
        if (candidateEcologyType === pendingEcologyType) {
          pendingEcologyDays += 1;
        } else {
          pendingEcologyType = candidateEcologyType;
          pendingEcologyDays = 1;
        }
        if (pendingEcologyDays >= 3) {
          ecologyType = candidateEcologyType;
          pendingEcologyType = null;
          pendingEcologyDays = 0;
        }
      }
    }
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
    (stage) => ageDays >= stage.threshold,
  );
  const stage = CREATURE_STAGES[stageIndex];
  const pollutionRate = roundCreature(
    ecologyPollution / Math.max(1, ageDays),
  );
  const clarityRate = roundCreature(ecologyClarity / Math.max(1, ageDays));
  const progressPercent =
    stage.nextAt === null
      ? 100
      : Math.min(
          100,
          Math.round(
            ((ageDays - stage.threshold) / (stage.nextAt - stage.threshold)) *
              100,
          ),
        );
  const achievements = deriveCreatureAchievements(state, date);
  const appearance = deriveCreatureAppearance(
    state.appearance,
    stageIndex,
    ecologyType,
    resolvedBranch,
    achievements.unlocked,
    rareAbilities,
  );
  const titleModifierId =
    ecologyType === "polluted"
      ? "scheduled_relapse"
      : ecologyType === "lucid"
        ? quietStreakDays >= 7
          ? "silent_for_seven_days"
          : "practicing_restraint"
        : ecologyType === "paradox"
          ? "withdrawing_while_refilling"
          : "awaiting_shape";

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
    experienceDays: ageDays,
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
      achievementsUnlocked: achievements.unlocked.length,
      formsUnlocked: new Set([
        appearance.formId,
        ...(state.specimens ?? []).map(
          (specimen) =>
            CREATURE_ECOLOGY_FORM_IDS[specimen.ecologyId]?.[
              specimen.pathologyId
            ],
        ),
      ]).size,
      appearancePartsUnlocked: new Set([
        ...appearance.partIds,
        ...state.appearance.unlockedPartIds,
      ]).size,
      specimensCollected: state.specimens?.length ?? 0,
    },
    ecology: {
      pollution: ecologyPollution,
      clarity: ecologyClarity,
      pollutionRate,
      clarityRate,
      type: ecologyType,
      pendingType: pendingEcologyType,
      pendingDays: pendingEcologyDays,
    },
    ecologyForm: appearance.formId,
    appearance,
    achievements,
    title: {
      modifierId: titleModifierId,
      coreId: appearance.formId,
      achievementId: appearance.achievementId,
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
  creatureAppearanceContentStats,
  creatureAppearanceState,
  creatureArt,
  creatureEvent,
  creatureLabel,
  creatureMood,
  creatureRareAbilityGain,
  creatureStatePath,
  creatureTitle,
  dailyCreatureRecord,
  deriveCreatureAppearance,
  deriveCreature,
  loadCreatureState,
  roundCreature,
  saveCreatureState,
  syncCreatureAchievements,
  syncCreatureSpecimen,
};
