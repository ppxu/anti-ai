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
const CREATURE_CLINICAL_NOTES = {
  context: [
    {
      zh: "上下文继续增生，主治医生已经找不到问题本体。",
      en: "Context keeps growing; the attending physician can no longer find the actual question.",
    },
    {
      zh: "建议切除三份附件，病患坚持它们都叫“必要背景”。",
      en: "Three attachments should be removed. The patient insists they are all essential context.",
    },
    {
      zh: "它没有记住更多，只是把遗忘延期到了下一个窗口。",
      en: "It remembered nothing more; it merely postponed forgetting until the next window.",
    },
    {
      zh: "影像显示上下文已压迫主问题，主问题要求转为门诊观察。",
      en: "Imaging shows context compressing the actual question, which requested outpatient care.",
    },
    {
      zh: "病患吞下了全部仓库，只为回答一个原本可以搜索的问题。",
      en: "The patient swallowed a repository to answer something search could have found.",
    },
    {
      zh: "上下文窗口仍在扩建，消防通道已改名为附录。",
      en: "The context window keeps expanding; the fire exit is now called an appendix.",
    },
  ],
  cache: [
    {
      zh: "旧答案已形成地层，继续翻动可能发现上个版本的需求。",
      en: "Old answers formed geological layers; further digging may uncover last version's requirements.",
    },
    {
      zh: "缓存命中率很健康，至于命中了什么，病历拒绝负责。",
      en: "The cache hit rate looks healthy. The casebook declines to say what it hit.",
    },
    {
      zh: "建议停止给昨日结论做包浆，病患要求再复用一次。",
      en: "Stop polishing yesterday's conclusion. The patient requested one more reuse.",
    },
    {
      zh: "旧 Token 已产生年轮，初步判断它比当前需求更了解项目。",
      en: "Old tokens developed tree rings and may understand the project better than the current brief.",
    },
    {
      zh: "缓存没有失效，只是开始以祖传答案的身份参与决策。",
      en: "The cache did not expire; it joined the decision as an ancestral answer.",
    },
    {
      zh: "复诊发现昨日上下文仍在值班，且拒绝领取加班费。",
      en: "Follow-up found yesterday's context still on shift and refusing overtime pay.",
    },
  ],
  frenzy: [
    {
      zh: "请求口器数量仍在增加，所有嘴都说自己只是最后追问一次。",
      en: "Request maws are multiplying; every mouth claims this is its final follow-up.",
    },
    {
      zh: "发送键出现磨损，模型的下班按钮仍未在影像中发现。",
      en: "The send key shows wear. No model logout button was visible on imaging.",
    },
    {
      zh: "并发症不是并发本身，是每个并发都长出了续集。",
      en: "Concurrency is not the complication; every concurrent request growing a sequel is.",
    },
    {
      zh: "所有请求均声称自己紧急，急诊室怀疑它们共享同一个快捷键。",
      en: "Every request claims urgency; triage suspects they share one shortcut.",
    },
    {
      zh: "模型尚未回答，追问已经完成了三代繁殖。",
      en: "Before the model answered, follow-ups completed three generations of breeding.",
    },
    {
      zh: "请求口器出现合唱倾向，但没有一张嘴愿意负责收尾。",
      en: "The request maws formed a choir; none volunteered to conclude.",
    },
  ],
  nuclear: [
    {
      zh: "核心持续发光，财务和生态都建议不要直视。",
      en: "The core keeps glowing. Finance and ecology both advise against staring at it.",
    },
    {
      zh: "未发现明确器官病变，只发现整只怪兽都在稳定发热。",
      en: "No single diseased organ was found; the whole creature is steadily radiating heat.",
    },
    {
      zh: "病患把算力当主食，把账单当餐巾纸，预后符合预期。",
      en: "The patient treats compute as food and the bill as a napkin. Prognosis as expected.",
    },
    {
      zh: "核心温度稳定上升，病患将其解释为职业热情。",
      en: "Core temperature rises steadily. The patient calls it professional enthusiasm.",
    },
    {
      zh: "散热片已学会叹气，暂未发现可报销的治疗方案。",
      en: "The heatsink learned to sigh. No reimbursable treatment was found.",
    },
    {
      zh: "它要求加一份算力，理由是上一份只够产生更多需求。",
      en: "It ordered more compute because the previous serving only generated more requirements.",
    },
  ],
  withdrawal: [
    {
      zh: "离线震颤仍在继续，但手动思考已出现微弱生命体征。",
      en: "Offline tremors continue, but manual thought shows faint signs of life.",
    },
    {
      zh: "今日未发现喂食，怪兽开始怀疑自己是否只是一个普通文件夹。",
      en: "No feeding observed. The creature wonders whether it is merely an ordinary folder.",
    },
    {
      zh: "清醒不是痊愈，只是数据中心暂时没收到探视申请。",
      en: "Sobriety is not recovery; the data center simply received no visiting request.",
    },
    {
      zh: "病患尝试手动补全一句话，过程漫长但未出现致命症状。",
      en: "The patient manually completed a sentence. Slow, but not fatal.",
    },
    {
      zh: "离线满一天后，它开始把普通思考误认为稀有能力。",
      en: "After a day offline, it mistook ordinary thought for a rare ability.",
    },
    {
      zh: "未检测到请求脉搏，建议不要立刻用一句“就问一下”进行抢救。",
      en: "No request pulse detected. Do not resuscitate with 'just one quick question.'",
    },
  ],
  unhatched: [
    {
      zh: "尚未发现生命体征，建议保持这种医学奇迹。",
      en: "No life signs detected. Preserve this medical miracle.",
    },
    {
      zh: "培养皿为空，GPU 暂时不需要承担监护责任。",
      en: "The dish is empty. The GPU has no care duties yet.",
    },
    {
      zh: "没有怪兽，也没有病历，只有一段可疑的安静。",
      en: "No creature, no casebook—only a suspicious stretch of quiet.",
    },
    {
      zh: "培养皿保持空白，科研人员对此表现出不合时宜的欣慰。",
      en: "The dish remains blank. Researchers display inappropriate relief.",
    },
    {
      zh: "尚无污染样本，建议在需求评审前撤离孵化区。",
      en: "No contaminated specimen yet. Evacuate the hatchery before planning.",
    },
    {
      zh: "生命体征为零，项目排期则显示它很快会醒。",
      en: "Life signs are zero. The roadmap says it will wake soon.",
    },
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
  {
    id: "context_afterimage",
    trait: "context",
    delta: 8,
  },
  {
    id: "prompt_molting",
    trait: "context",
    delta: 8,
  },
  {
    id: "cache_sediment",
    trait: "cache",
    delta: 8,
  },
  {
    id: "stale_answer_echo",
    trait: "cache",
    delta: 8,
  },
  {
    id: "retry_teeth",
    trait: "frenzy",
    delta: 8,
  },
  {
    id: "queue_hiccup",
    trait: "frenzy",
    delta: 8,
  },
  {
    id: "watt_hiccups",
    trait: "nuclear",
    delta: 8,
  },
  {
    id: "cooling_sneeze",
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
  {
    id: "recursive_stomach",
    trait: "context",
    delta: 20,
  },
  {
    id: "archive_halo",
    trait: "cache",
    delta: 20,
  },
  {
    id: "chorus_throat",
    trait: "frenzy",
    delta: 20,
  },
  {
    id: "borrowed_sun",
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
const CREATURE_GENERATION_LENGTH = 90;
const CREATURE_INHERITANCE_BONUS = 5;
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

const CREATURE_EVOLUTION_DEFINITIONS = {
  bottomless_graft: {
    category: "pollution",
    abilityId: "appetite",
    benefitId: "extra_growth",
    costId: "pollution_spill",
  },
  recursive_lobe: {
    category: "pollution",
    abilityId: "memory",
    benefitId: "extra_growth",
    costId: "pollution_spill",
  },
  chorus_jaw: {
    category: "pollution",
    abilityId: "mouths",
    benefitId: "extra_growth",
    costId: "pollution_spill",
  },
  reactor_bladder: {
    category: "pollution",
    abilityId: "glow",
    benefitId: "extra_growth",
    costId: "pollution_spill",
  },
  abstinence_sac: {
    category: "clarity",
    abilityId: "withdrawal",
    benefitId: "clarity_surge",
    costId: "slower_detox",
  },
  loaded_nerve: {
    category: "paradox",
    abilityId: "instability",
    benefitId: "rare_event_leak",
    costId: "pollution_spill",
  },
};
const CREATURE_EVOLUTION_POOLS = {
  pollution: [
    "bottomless_graft",
    "recursive_lobe",
    "chorus_jaw",
    "reactor_bladder",
  ],
  clarity: ["abstinence_sac"],
  paradox: ["loaded_nerve"],
};
const CREATURE_SCARS = {
  unformed: "blank_suture",
  polluted: "carbonized_spine",
  lucid: "sterile_halo",
  paradox: "split_shadow",
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
  clinicalSymptoms: {
    context: {
      zh: "上下文增生",
      en: "CONTEXT OVERGROWTH",
    },
    cache: {
      zh: "缓存钙化",
      en: "CACHE CALCIFICATION",
    },
    frenzy: {
      zh: "请求增殖",
      en: "REQUEST PROLIFERATION",
    },
    nuclear: {
      zh: "核食",
      en: "NUCLEAR FEEDING",
    },
    withdrawal: {
      zh: "戒断震颤",
      en: "WITHDRAWAL TREMOR",
    },
    unhatched: {
      zh: "尚未孵化",
      en: "NOT YET HATCHED",
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
    context_afterimage: {
      name: { zh: "上下文残像", en: "CONTEXT AFTERIMAGE" },
      body: {
        zh: "问题已经回答，视网膜上仍残留三页必要背景。",
        en: "The question was answered; three pages of essential context remain burned into view.",
      },
    },
    prompt_molting: {
      name: { zh: "提示词蜕皮", en: "PROMPT MOLTING" },
      body: {
        zh: "它脱下一层旧提示词，里面那层仍然写着“简短回答”。",
        en: "It shed an old prompt; the layer beneath still says 'be concise.'",
      },
    },
    cache_sediment: {
      name: { zh: "缓存沉积", en: "CACHE SEDIMENT" },
      body: {
        zh: "昨日答案沉到腹底，逐渐形成可以回滚的地质层。",
        en: "Yesterday's answer sank into a rollback-ready geological layer.",
      },
    },
    stale_answer_echo: {
      name: { zh: "旧答案回声", en: "STALE ANSWER ECHO" },
      body: {
        zh: "它张嘴回答新问题，喉咙里先传出了上个版本的结论。",
        en: "It opened for a new question; last version's conclusion echoed first.",
      },
    },
    retry_teeth: {
      name: { zh: "重试乳牙", en: "RETRY TEETH" },
      body: {
        zh: "一排小牙悄悄长出，每颗都只会咬一次“再试试”。",
        en: "A row of tiny teeth emerged, each able to bite 'retry' once.",
      },
    },
    queue_hiccup: {
      name: { zh: "队列打嗝", en: "QUEUE HICCUP" },
      body: {
        zh: "它打了个嗝，吐出两个没人承认发送过的排队请求。",
        en: "It hiccupped up two queued requests nobody admits sending.",
      },
    },
    watt_hiccups: {
      name: { zh: "瓦时呃逆", en: "WATT-HOUR HICCUPS" },
      body: {
        zh: "核心每亮一下就打一个嗝，电表负责记录节拍。",
        en: "Its core hiccups with every flash; the meter keeps tempo.",
      },
    },
    cooling_sneeze: {
      name: { zh: "散热喷嚏", en: "COOLING SNEEZE" },
      body: {
        zh: "散热鳃突然打喷嚏，把一小团职业热情吹进了机房。",
        en: "Its cooling gills sneezed a puff of professional enthusiasm into the server room.",
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
    recursive_stomach: {
      name: { zh: "递归胃袋", en: "RECURSIVE STOMACH" },
      body: {
        zh: "稀有突变：胃里长出另一个胃，并要求补充同一份上下文。",
        en: "Rare mutation: a stomach grew another stomach and requested the same context.",
      },
    },
    archive_halo: {
      name: { zh: "档案光环", en: "ARCHIVE HALO" },
      body: {
        zh: "稀有突变：旧答案悬浮成光环，神圣得让人不敢清缓存。",
        en: "Rare mutation: old answers formed a halo too sacred to clear.",
      },
    },
    chorus_throat: {
      name: { zh: "合唱喉管", en: "CHORUS THROAT" },
      body: {
        zh: "稀有突变：一条喉管能同时发出四个互相追问的声音。",
        en: "Rare mutation: one throat now voices four follow-ups at once.",
      },
    },
    borrowed_sun: {
      name: { zh: "借来的太阳", en: "BORROWED SUN" },
      body: {
        zh: "稀有突变：胸腔借来一颗小太阳，归还日期写着“下个版本”。",
        en: "Rare mutation: its chest borrowed a small sun due back next release.",
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
  scars: {
    blank_suture: { zh: "空白缝合线", en: "BLANK SUTURE" },
    carbonized_spine: { zh: "碳化脊柱", en: "CARBONIZED SPINE" },
    sterile_halo: { zh: "无菌光环", en: "STERILE HALO" },
    split_shadow: { zh: "分裂影子", en: "SPLIT SHADOW" },
  },
  evolutionCategories: {
    pollution: { zh: "污染", en: "POLLUTION" },
    clarity: { zh: "清醒", en: "CLARITY" },
    paradox: { zh: "悖论", en: "PARADOX" },
  },
  evolutions: {
    bottomless_graft: { zh: "无底胃嫁接", en: "BOTTOMLESS GRAFT" },
    recursive_lobe: { zh: "递归脑叶", en: "RECURSIVE LOBE" },
    chorus_jaw: { zh: "合唱颌", en: "CHORUS JAW" },
    reactor_bladder: { zh: "反应堆膀胱", en: "REACTOR BLADDER" },
    abstinence_sac: { zh: "戒断囊", en: "ABSTINENCE SAC" },
    loaded_nerve: { zh: "灌铅神经", en: "LOADED NERVE" },
  },
  evolutionBenefits: {
    extra_growth: { zh: "额外能力成长", en: "EXTRA ABILITY GROWTH" },
    clarity_surge: { zh: "清醒性增生", en: "CLARITY SURGE" },
    rare_event_leak: { zh: "稀有事件泄漏", en: "RARE EVENT LEAK" },
  },
  evolutionCosts: {
    pollution_spill: { zh: "污染回流", en: "POLLUTION SPILL" },
    slower_detox: { zh: "污染衰减放缓", en: "SLOWER DETOX" },
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

function creatureRareChance(instability = 0, bonus = 0) {
  return Math.min(
    30,
    Math.min(20, 8 + Math.floor(instability / 10)) + bonus,
  );
}

function creatureEvent(seed, date, instability = 0, rareChanceBonus = 0) {
  const digest = createHash("sha256").update(`${seed}:${date}`).digest();
  const rare =
    digest.readUInt32BE(0) % 100 <
    creatureRareChance(instability, rareChanceBonus);
  const pool = rare ? RARE_CREATURE_EVENTS : COMMON_CREATURE_EVENTS;
  const traits = ["context", "cache", "frenzy", "nuclear"];
  const trait = traits[digest.readUInt32BE(4) % traits.length];
  const variants = pool.filter((event) => event.trait === trait);
  const event = variants[digest.readUInt32BE(8) % variants.length];
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
  const scarMarks = {
    blank_suture: "--//--",
    carbonized_spine: "##/##",
    sterile_halo: "oo/oo",
    split_shadow: "//\\\\//",
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
            : scarMarks[appearance.scarId] ??
              CREATURE_APPEARANCE_GLYPHS.pattern[geneIds.pattern]
      : scarMarks[appearance.scarId] ?? ecologyMarks[appearance.ecology]);
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
  scarId = null,
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
  if (scarId) {
    partIds.push(`scar_${scarId}`);
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
        ...(scarId ? { scarId } : {}),
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
    scarId,
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

function creatureCodex(state, date) {
  const creature = deriveCreature(state, date);
  const specimens = (state.specimens ?? [])
    .filter((specimen) => specimen.recordedAt <= date)
    .map((specimen) => ({
      id: specimen.fingerprint,
      discoveredAt: specimen.recordedAt,
      experienceDays: specimen.experienceDays,
      stageId: specimen.stageId,
      ecologyId: specimen.ecologyId,
      pathologyId: specimen.pathologyId,
      formId:
        CREATURE_ECOLOGY_FORM_IDS[specimen.ecologyId]?.[
          specimen.pathologyId
        ] ?? null,
      achievementId: specimen.achievementId,
      rareAbilityId: specimen.rareAbilityId,
    }));
  const formDiscoveries = new Map();
  for (const specimen of specimens) {
    if (
      specimen.formId &&
      (!formDiscoveries.has(specimen.formId) ||
        specimen.discoveredAt < formDiscoveries.get(specimen.formId))
    ) {
      formDiscoveries.set(specimen.formId, specimen.discoveredAt);
    }
  }
  const forms = Object.entries(CREATURE_ECOLOGY_FORM_IDS).flatMap(
    ([ecologyId, pathologies]) =>
      Object.entries(pathologies).map(([pathologyId, id]) => ({
        id,
        ecologyId,
        pathologyId,
        discovered: formDiscoveries.has(id),
        discoveredAt: formDiscoveries.get(id) ?? null,
      })),
  );

  const unlockedAchievements = new Map(
    creature.achievements.unlocked.map((achievement) => [
      achievement.id,
      achievement,
    ]),
  );
  const achievements = CREATURE_ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const unlocked = unlockedAchievements.get(definition.id);
    return {
      id: definition.id,
      category: definition.category,
      rarity: definition.rarity,
      discovered: unlocked !== undefined,
      discoveredAt: unlocked?.unlockedAt ?? null,
    };
  });

  const rareAbilityDiscoveries = new Map();
  for (const [entryDate, day] of Object.entries(state.days)
    .filter(([entryDate]) => entryDate <= date)
    .sort(([left], [right]) => left.localeCompare(right))) {
    const abilityId = day.rareAbilityGain?.id;
    if (abilityId && !rareAbilityDiscoveries.has(abilityId)) {
      rareAbilityDiscoveries.set(abilityId, entryDate);
    }
  }
  const chromaticAbilities = Object.entries(
    CREATURE_RARE_ABILITY_DEFINITIONS,
  ).map(([id, definition]) => ({
    id,
    rarity: definition.rarity,
    discovered: creature.rareAbilities[id] !== undefined,
    discoveredAt: rareAbilityDiscoveries.get(id) ?? null,
    level: creature.rareAbilities[id]?.level ?? 0,
  }));

  const fossils = creature.fossils.map((fossil) => ({
    ...fossil,
    discoveredAt: fossil.sealedAt,
  }));
  const scarDiscoveries = new Map();
  for (const fossil of fossils) {
    if (
      !scarDiscoveries.has(fossil.scarId) ||
      fossil.discoveredAt < scarDiscoveries.get(fossil.scarId)
    ) {
      scarDiscoveries.set(fossil.scarId, fossil.discoveredAt);
    }
  }
  const scars = Object.values(CREATURE_SCARS).map((id) => ({
    id,
    discovered: scarDiscoveries.has(id),
    discoveredAt: scarDiscoveries.get(id) ?? null,
  }));
  const fixedCollections = [
    ...forms,
    ...achievements,
    ...chromaticAbilities,
    ...scars,
  ];
  const fixedDiscovered = fixedCollections.filter(
    (entry) => entry.discovered,
  ).length;
  const recent = [
    ...forms.map((entry) => ({ type: "form", ...entry })),
    ...achievements.map((entry) => ({ type: "achievement", ...entry })),
    ...chromaticAbilities.map((entry) => ({
      type: "chromaticAbility",
      ...entry,
    })),
    ...scars.map((entry) => ({ type: "scar", ...entry })),
    ...specimens.map((entry) => ({
      type: "specimen",
      id: entry.id,
      discovered: true,
      discoveredAt: entry.discoveredAt,
    })),
    ...fossils.map((entry) => ({
      type: "fossil",
      id: entry.id,
      discovered: true,
      discoveredAt: entry.discoveredAt,
    })),
  ]
    .filter((entry) => entry.discovered && entry.discoveredAt === date)
    .map(({ type, id, discoveredAt }) => ({ type, id, discoveredAt }));

  return {
    date,
    specimenId: creature.appearance.specimenId,
    summary: {
      fixed: {
        discovered: fixedDiscovered,
        total: fixedCollections.length,
        percent: Math.round(
          (fixedDiscovered / fixedCollections.length) * 100,
        ),
      },
      forms: {
        discovered: forms.filter((entry) => entry.discovered).length,
        total: forms.length,
      },
      achievements: {
        discovered: achievements.filter((entry) => entry.discovered).length,
        total: achievements.length,
      },
      chromaticAbilities: {
        discovered: chromaticAbilities.filter((entry) => entry.discovered)
          .length,
        total: chromaticAbilities.length,
      },
      scars: {
        discovered: scars.filter((entry) => entry.discovered).length,
        total: scars.length,
      },
      specimens: { discovered: specimens.length },
      fossils: { discovered: fossils.length },
    },
    sections: {
      forms,
      achievements,
      chromaticAbilities,
      scars,
      specimens,
      fossils,
    },
    recent,
  };
}

function creatureGenerationNumber(experienceDays) {
  return experienceDays === 0
    ? 0
    : Math.floor((experienceDays - 1) / CREATURE_GENERATION_LENGTH) + 1;
}

function creatureEvolutionOptionIds(seed, generation) {
  const digest = createHash("sha256")
    .update(`${seed}:generation:${generation}:evolution-options`)
    .digest();
  return [
    CREATURE_EVOLUTION_POOLS.pollution[
      digest.readUInt8(0) % CREATURE_EVOLUTION_POOLS.pollution.length
    ],
    CREATURE_EVOLUTION_POOLS.clarity[
      digest.readUInt8(1) % CREATURE_EVOLUTION_POOLS.clarity.length
    ],
    CREATURE_EVOLUTION_POOLS.paradox[
      digest.readUInt8(2) % CREATURE_EVOLUTION_POOLS.paradox.length
    ],
  ];
}

function effectiveCreatureEntries(state, date) {
  const entries = Object.entries(state.days)
    .filter(([entryDate]) => entryDate <= date)
    .sort(([left], [right]) => left.localeCompare(right));
  const hatchIndex = entries.findIndex(([, day]) => day.active);
  return hatchIndex === -1 ? [] : entries.slice(hatchIndex);
}

function syncCreatureGenerations(state, date) {
  state.generations ??= { fossils: [], evolutions: {} };
  state.generations.fossils ??= [];
  state.generations.evolutions ??= {};
  const entries = effectiveCreatureEntries(state, date);
  const completedGenerations = Math.floor(
    entries.length / CREATURE_GENERATION_LENGTH,
  );

  for (let generation = 1; generation <= completedGenerations; generation += 1) {
    if (
      state.generations.fossils.some(
        (fossil) => fossil.generation === generation,
      )
    ) {
      continue;
    }
    const sealedAt =
      entries[generation * CREATURE_GENERATION_LENGTH - 1][0];
    const creature = deriveCreature(state, sealedAt);
    state.generations.fossils.push({
      id: createHash("sha256")
        .update(`${state.seed}:generation:${generation}:fossil`)
        .digest("hex")
        .slice(0, 8),
      generation,
      sealedAt,
      ecologyId: creature.ecology.type,
      pathologyId: creature.branch,
      inheritanceAbilityId: creature.dominantAbility,
      scarId: CREATURE_SCARS[creature.ecology.type],
      appearanceFingerprint: creature.appearance.fingerprint,
      evolutionId:
        state.generations.evolutions[String(generation)]?.selectedId ?? null,
    });
    const nextGeneration = generation + 1;
    state.generations.evolutions[String(nextGeneration)] ??= {
      generation: nextGeneration,
      offeredAt: sealedAt,
      optionIds: creatureEvolutionOptionIds(state.seed, nextGeneration),
      selectedId: null,
      selectedAt: null,
      status: "pending",
    };
  }
  state.generations.fossils.sort(
    (left, right) => left.generation - right.generation,
  );

  const currentGeneration = creatureGenerationNumber(entries.length);
  for (const evolution of Object.values(state.generations.evolutions)) {
    if (
      evolution.generation < currentGeneration &&
      evolution.selectedId === null
    ) {
      evolution.status = "missed";
    }
  }
  return state.generations;
}

function currentCreatureEvolutionState(state, date) {
  const generation = creatureGenerationNumber(
    effectiveCreatureEntries(state, date).length,
  );
  return Object.values(state.generations?.evolutions ?? {})
    .filter(
      (evolution) =>
        evolution.offeredAt <= date &&
        (evolution.generation === generation ||
          evolution.generation === generation + 1),
    )
    .sort((left, right) => left.generation - right.generation)
    .at(0);
}

function creatureEvolutionSummary(state, date) {
  const evolution = currentCreatureEvolutionState(state, date);
  if (!evolution) return null;
  const options = evolution.optionIds.map((id, index) => ({
    slot: index + 1,
    id,
    ...CREATURE_EVOLUTION_DEFINITIONS[id],
  }));
  const status =
    evolution.selectedAt !== null && evolution.selectedAt <= date
      ? "selected"
      : evolution.generation < creatureGenerationNumber(
            effectiveCreatureEntries(state, date).length,
          )
        ? "missed"
        : "pending";
  return {
    generation: evolution.generation,
    status,
    selectedId: status === "selected" ? evolution.selectedId : null,
    selected:
      status !== "selected"
        ? null
        : options.find((option) => option.id === evolution.selectedId),
    options,
  };
}

function selectCreatureEvolution(state, date, choice) {
  const evolution = currentCreatureEvolutionState(state, date);
  if (!evolution) return { error: "unavailable" };
  const slot = Number(choice);
  if (
    !Number.isInteger(slot) ||
    slot < 1 ||
    slot > evolution.optionIds.length
  ) {
    return { error: "invalid", generation: evolution.generation };
  }
  const selectedId = evolution.optionIds[slot - 1];
  if (evolution.selectedId !== null && evolution.selectedId !== selectedId) {
    return { error: "locked", generation: evolution.generation };
  }
  evolution.selectedId = selectedId;
  evolution.selectedAt ??= date;
  evolution.status = "selected";
  const fossil = state.generations.fossils.find(
    (candidate) =>
      candidate.generation === evolution.generation &&
      candidate.sealedAt === date,
  );
  if (fossil) fossil.evolutionId = selectedId;
  return { value: creatureEvolutionSummary(state, date) };
}

function migrateCreatureState(state) {
  state.appearance ??= creatureAppearanceState(state.seed);
  state.appearance.unlockedPartIds ??= [];
  state.achievements ??= {};
  state.specimens ??= [];
  state.generations ??= { fossils: [], evolutions: {} };
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
  state.schemaVersion = 5;
  return state;
}

function creatureStatePath() {
  return path.join(os.homedir(), ".anti-ai", "creature.json");
}

async function loadCreatureState() {
  try {
    const contents = await readFile(creatureStatePath(), "utf8");
    const state = JSON.parse(contents);
    if ([1, 2, 3, 4, 5].includes(state?.schemaVersion) && state.days) {
      state.seed ??=
        process.env.ANTI_AI_CREATURE_SEED ?? randomBytes(8).toString("hex");
      return migrateCreatureState(state);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return migrateCreatureState({
    schemaVersion: 5,
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

function creatureEvolutionRule(abilities, abilityId) {
  const talentModifiers = CREATURE_TALENTS[abilityId].filter(
    (talent) => abilities[abilityId] >= talent.threshold,
  ).length;
  return {
    procChancePercent: Math.min(
      35,
      5 + Math.floor(abilities[abilityId] / 25) + talentModifiers * 2,
    ),
    talentModifiers,
    benefitPoints: 1 + Math.floor(talentModifiers / 3),
    costPoints: 1 + Math.floor(talentModifiers / 5),
  };
}

function creatureEvolutionEffect(state, date, day, previousCreature) {
  const hasHatched = previousCreature.activeDays > 0 || day.active;
  if (!hasHatched) return null;
  const generation = creatureGenerationNumber(
    previousCreature.experienceDays + 1,
  );
  const evolution = state.generations?.evolutions?.[String(generation)];
  if (
    evolution?.status !== "selected" ||
    evolution.selectedAt > date
  ) {
    return null;
  }
  const definition = CREATURE_EVOLUTION_DEFINITIONS[evolution.selectedId];
  const rule = creatureEvolutionRule(
    previousCreature.abilities,
    definition.abilityId,
  );
  const eligible =
    definition.category === "clarity" ? !day.active : day.active;
  const digest = createHash("sha256")
    .update(`${state.seed}:${date}:${evolution.selectedId}:rule-effect`)
    .digest();
  const triggered =
    eligible &&
    digest.readUInt32BE(0) % 10_000 < rule.procChancePercent * 100;
  return {
    generation,
    evolutionId: evolution.selectedId,
    category: definition.category,
    abilityId: definition.abilityId,
    procChancePercent: rule.procChancePercent,
    talentModifiers: rule.talentModifiers,
    triggered,
    benefitId: definition.benefitId,
    benefitPoints: triggered ? rule.benefitPoints : 0,
    costId: definition.costId,
    costPoints: triggered ? rule.costPoints : 0,
  };
}

function applyCreatureEvolutionEffect(record, effect) {
  record.evolutionEffect = effect;
  if (!effect?.triggered) return record;
  if (effect.category === "pollution") {
    record.abilityGains[effect.abilityId] += effect.benefitPoints;
    record.ecologyGains.pollution += effect.costPoints;
  } else if (effect.category === "clarity") {
    record.ecologyGains.clarity += effect.benefitPoints;
    record.exposureRecoveryPenalty = effect.costPoints;
  } else {
    record.ecologyGains.pollution += effect.costPoints;
  }
  return record;
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
  let evolutionTriggers = 0;
  let evolutionBenefitPoints = 0;
  let evolutionCostPoints = 0;

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
      exposure = Math.max(
        0,
        exposure - Math.max(0, 2 - (day.exposureRecoveryPenalty ?? 0)),
      );
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
    if (day.evolutionEffect?.triggered) {
      evolutionTriggers += 1;
      evolutionBenefitPoints += day.evolutionEffect.benefitPoints;
      evolutionCostPoints += day.evolutionEffect.costPoints;
    }
  }

  for (const key of Object.keys(traits)) traits[key] = roundCreature(traits[key]);
  const branch = dominantCreatureKey(traits);
  const resolvedBranch = activeDays === 0 ? "nuclear" : branch;
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
  const generationNumber = creatureGenerationNumber(ageDays);
  const generationDay =
    ageDays === 0
      ? 0
      : ((ageDays - 1) % CREATURE_GENERATION_LENGTH) + 1;
  const fossils = (state.generations?.fossils ?? []).filter(
    (fossil) => fossil.sealedAt <= date,
  );
  const inheritedFossil =
    generationNumber > 1
      ? fossils.find(
          (fossil) => fossil.generation === generationNumber - 1,
        )
      : undefined;
  if (inheritedFossil) {
    abilities[inheritedFossil.inheritanceAbilityId] = Math.min(
      CREATURE_ABILITY_MAX,
      abilities[inheritedFossil.inheritanceAbilityId] +
        CREATURE_INHERITANCE_BONUS,
    );
  }
  const inheritedAbilityId = inheritedFossil?.inheritanceAbilityId ?? null;
  const scarId = inheritedFossil?.scarId ?? null;
  const dominantAbility = dominantCreatureKey(abilities);
  const abilityPoints = Object.values(abilities).reduce(
    (sum, value) => sum + value,
    0,
  );
  const talents = unlockedCreatureTalents(abilities);
  const evolution = creatureEvolutionSummary(state, date);
  if (evolution) {
    evolution.options = evolution.options.map((option) => ({
      ...option,
      ...creatureEvolutionRule(abilities, option.abilityId),
    }));
    evolution.selected =
      evolution.selectedId === null
        ? null
        : evolution.options.find(
            (option) => option.id === evolution.selectedId,
          );
  }
  const stageIndex = CREATURE_STAGES.findLastIndex(
    (stage) => generationDay >= stage.threshold,
  );
  const stage = CREATURE_STAGES[stageIndex];
  const nextStageAt =
    stage.nextAt === null
      ? null
      : generationNumber === 0
        ? stage.nextAt
        : (generationNumber - 1) * CREATURE_GENERATION_LENGTH + stage.nextAt;
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
            ((generationDay - stage.threshold) /
              (stage.nextAt - stage.threshold)) *
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
    scarId,
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
    nextStageAt,
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
      fossilsSealed: fossils.length,
      evolutionTriggers,
      evolutionBenefitPoints,
      evolutionCostPoints,
      evolutionsMissed: Object.values(
        state.generations?.evolutions ?? {},
      ).filter(
        (candidate) =>
          candidate.offeredAt <= date &&
          candidate.generation < generationNumber &&
          candidate.selectedId === null,
      ).length,
    },
    generation: {
      number: generationNumber,
      day: generationDay,
      length: CREATURE_GENERATION_LENGTH,
      progressPercent:
        ageDays === 0
          ? 0
          : Math.round(
              ((((ageDays - 1) % CREATURE_GENERATION_LENGTH) + 1) /
                CREATURE_GENERATION_LENGTH) *
                100,
            ),
      inheritedAbilityId,
      scarId,
    },
    fossils,
    evolution,
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

function creatureCasebook(state, startDate, endDate) {
  const previousDate = new Date(`${startDate}T12:00:00.000Z`);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  const before = deriveCreature(state, previousDate.toISOString().slice(0, 10));
  const after = deriveCreature(state, endDate);
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
    const symptom = day.active
      ? dominantCreatureKey(day.traits)
      : "withdrawal";
    symptomCounts[symptom] += 1;
  }

  const primarySymptom =
    hatchedAt === undefined
      ? "unhatched"
      : Object.keys(symptomCounts).reduce(
          (current, symptom) =>
            symptomCounts[symptom] > symptomCounts[current]
              ? symptom
              : current,
          "context",
        );
  const achievementIds = after.achievements.unlocked
    .filter(
      (achievement) =>
        achievement.unlockedAt >= startDate &&
        achievement.unlockedAt <= endDate,
    )
    .map((achievement) => achievement.id);
  const codex = creatureCodex(state, endDate);
  const discoveries = {
    forms: codex.sections.forms.filter(
      (entry) =>
        entry.discoveredAt >= startDate && entry.discoveredAt <= endDate,
    ).length,
    achievements: codex.sections.achievements.filter(
      (entry) =>
        entry.discoveredAt >= startDate && entry.discoveredAt <= endDate,
    ).length,
    chromatics: codex.sections.chromaticAbilities.filter(
      (entry) =>
        entry.discoveredAt >= startDate && entry.discoveredAt <= endDate,
    ).length,
    scars: codex.sections.scars.filter(
      (entry) =>
        entry.discoveredAt >= startDate && entry.discoveredAt <= endDate,
    ).length,
    specimens: codex.sections.specimens.filter(
      (entry) =>
        entry.discoveredAt >= startDate && entry.discoveredAt <= endDate,
    ).length,
    fossils: codex.sections.fossils.filter(
      (entry) =>
        entry.discoveredAt >= startDate && entry.discoveredAt <= endDate,
    ).length,
  };

  return {
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
        (fossil) =>
          fossil.sealedAt >= startDate && fossil.sealedAt <= endDate,
      ).length,
    },
    achievementIds,
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
  const notes =
    CREATURE_CLINICAL_NOTES[casebook.primarySymptom] ??
    CREATURE_CLINICAL_NOTES.unhatched;
  const digest = createHash("sha256")
    .update(
      `${casebook.startDate}:${casebook.endDate}:${casebook.primarySymptom}:${casebook.ecology.to}:${kind}`,
    )
    .digest();
  return notes[digest.readUInt32BE(0) % notes.length][lang];
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
  creatureCasebook,
  creatureCodex,
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
  deriveCreatureAppearance,
  deriveCreature,
  applyCreatureEvolutionEffect,
  loadCreatureState,
  roundCreature,
  saveCreatureState,
  selectCreatureEvolution,
  syncCreatureAchievements,
  syncCreatureGenerations,
  syncCreatureSpecimen,
};
