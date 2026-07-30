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
const CREATURE_KAIJU_GLYPHS = {
  eyes: {
    eyes_01: "◉   ◉",
    eyes_02: "●   ●",
    eyes_03: "◆   ◆",
    eyes_04: "×   ×",
    eyes_05: "+   +",
    eyes_06: "◌ ◉ ◌",
    eyes_07: "0 0 0",
    eyes_08: "▣   ▣",
  },
  jaws: {
    mouth_01: "╲═══╱",
    mouth_02: "╲≡≡≡╱",
    mouth_03: "╲███╱",
    mouth_04: "╲▼▼▼╱",
    mouth_05: "╲WWW╱",
    mouth_06: "╲───╱",
    mouth_07: "╲[_]╱",
    mouth_08: "╲}{ ╱",
  },
  cores: {
    core_01: "@",
    core_02: "0",
    core_03: "*",
    core_04: "#",
    core_05: "+",
    core_06: "-",
  },
  armor: {
    body_01: "▓",
    body_02: "█",
    body_03: "▒",
    body_04: "▦",
    body_05: "#",
    body_06: "≋",
  },
  legs: {
    limbs_01: "█",
    limbs_02: "▓",
    limbs_03: "▒",
    limbs_04: "║",
    limbs_05: "╳",
    limbs_06: "▦",
  },
  feet: {
    limbs_01: "═╩═         ═╩═",
    limbs_02: "╙─╜         ╙─╜",
    limbs_03: "╱_╲         ╱_╲",
    limbs_04: "┻━┻         ┻━┻",
    limbs_05: "╰┳╯         ╰┳╯",
    limbs_06: "▰▰▰         ▰▰▰",
  },
  tails: {
    tail_01: "━━>",
    tail_02: "══>",
    tail_03: "~~>",
    tail_04: "──>",
    tail_05: "::>",
    tail_06: "##>",
  },
  completeCores: {
    core_01: "[●X●]",
    core_02: "[◉X◉]",
    core_03: "[@X@]",
    core_04: "[◆X◆]",
    core_05: "[+X+]",
    core_06: "[-X-]",
  },
  patterns: {
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

const CREATURE_ABILITY_MAX = 255;
const CREATURE_MALIGNANCY_EVOLUTION_BONUS = 2;
const CREATURE_MALIGNANCY_TITLE_IDS = {
  appetite: "famine_tumor",
  memory: "recursive_cancer",
  shell: "cache_osteosarcoma",
  mouths: "request_hyperplasia",
  glow: "isotope_sarcoma",
  instability: "probability_deterioration",
  withdrawal: "withdrawal_necrosis",
};
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
    { id: "token_landfill", threshold: 60 },
    { id: "budget_event_horizon", threshold: 120 },
    { id: "planetary_feedlot", threshold: 220 },
  ],
  memory: [
    { id: "appendix_gills", threshold: 5 },
    { id: "recursive_cortex", threshold: 15 },
    { id: "dossier_hive", threshold: 30 },
    { id: "appendix_lung", threshold: 60 },
    { id: "context_graveyard", threshold: 120 },
    { id: "infinite_review_board", threshold: 220 },
  ],
  shell: [
    { id: "cache_scab", threshold: 5 },
    { id: "fossil_carapace", threshold: 15 },
    { id: "yesterday_immortal", threshold: 30 },
    { id: "cache_coffin", threshold: 60 },
    { id: "legacy_strata", threshold: 120 },
    { id: "rollback_continent", threshold: 220 },
  ],
  mouths: [
    { id: "reply_teeth", threshold: 5 },
    { id: "parallel_dentition", threshold: 15 },
    { id: "api_choir", threshold: 30 },
    { id: "followup_larynx", threshold: 60 },
    { id: "webhook_hydra", threshold: 120 },
    { id: "api_weather_system", threshold: 220 },
  ],
  glow: [
    { id: "nightlight_thorax", threshold: 5 },
    { id: "private_reactor", threshold: 15 },
    { id: "meltdown_countdown", threshold: 30 },
    { id: "rack_fever", threshold: 60 },
    { id: "datacenter_sunburn", threshold: 120 },
    { id: "private_heat_death", threshold: 220 },
  ],
  instability: [
    { id: "dice_organ", threshold: 5 },
    { id: "bad_luck_field", threshold: 15 },
    { id: "probability_leak", threshold: 30 },
    { id: "edge_case_weather", threshold: 60 },
    { id: "rollback_prophecy", threshold: 120 },
    { id: "production_poltergeist", threshold: 220 },
  ],
  withdrawal: [
    { id: "cold_sweat", threshold: 5 },
    { id: "offline_tinnitus", threshold: 15 },
    { id: "ai_intolerance", threshold: 30 },
    { id: "airplane_mode_rash", threshold: 60 },
    { id: "manual_thought_allergy", threshold: 120 },
    { id: "offline_organ_failure", threshold: 220 },
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
  malignancyTitles: {
    famine_tumor: { zh: "饥荒肿瘤", en: "FAMINE TUMOR" },
    recursive_cancer: { zh: "递归脑癌", en: "RECURSIVE CANCER" },
    cache_osteosarcoma: { zh: "缓存骨肉瘤", en: "CACHE OSTEOSARCOMA" },
    request_hyperplasia: { zh: "请求增生", en: "REQUEST HYPERPLASIA" },
    isotope_sarcoma: { zh: "核素肉瘤", en: "ISOTOPE SARCOMA" },
    probability_deterioration: {
      zh: "概率恶化",
      en: "PROBABILITY DETERIORATION",
    },
    withdrawal_necrosis: { zh: "戒断坏死", en: "WITHDRAWAL NECROSIS" },
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

export {
  CREATURE_STAGES,
  CREATURE_FORMS,
  CREATURE_APPEARANCE_GENE_POOLS,
  CREATURE_KAIJU_GLYPHS,
  CREATURE_BRANCH_PARTS,
  CREATURE_ECOLOGY_PARTS,
  CREATURE_ECOLOGY_FORM_IDS,
  CREATURE_ACHIEVEMENT_DEFINITIONS,
  CREATURE_ACHIEVEMENT_BY_ID,
  CREATURE_ACHIEVEMENT_TIER_THRESHOLDS,
  CREATURE_CLINICAL_NOTES,
  COMMON_CREATURE_EVENTS,
  RARE_CREATURE_EVENTS,
  CREATURE_ABILITY_KEYS,
  CREATURE_ABILITY_MAX,
  CREATURE_MALIGNANCY_EVOLUTION_BONUS,
  CREATURE_MALIGNANCY_TITLE_IDS,
  CREATURE_RARE_ABILITY_MAX,
  CREATURE_GENERATION_LENGTH,
  CREATURE_INHERITANCE_BONUS,
  CREATURE_RARE_ABILITY_CHANCES,
  CREATURE_RARE_ABILITY_POOLS,
  CREATURE_RARE_ABILITY_RANKS,
  CREATURE_RARE_ABILITY_DEFINITIONS,
  CREATURE_BRANCH_ABILITIES,
  CREATURE_EVOLUTION_DEFINITIONS,
  CREATURE_EVOLUTION_POOLS,
  CREATURE_SCARS,
  CREATURE_TALENTS,
  CREATURE_TEMPERAMENTS,
  CREATURE_EPITHETS,
  CREATURE_COPY,
};
