const SOURCE_REGISTRY = Object.freeze([
  {
    id: "codex",
    label: "Codex",
    kind: "jsonl",
    environment: "ANTI_AI_CODEX_DIR",
    homePath: [".codex", "sessions"],
    precision: { zh: "逐消息精确", en: "message exact" },
  },
  {
    id: "claude",
    label: "Claude Code",
    kind: "jsonl",
    environment: "ANTI_AI_CLAUDE_DIR",
    homePath: [".claude", "projects"],
    precision: { zh: "逐消息精确", en: "message exact" },
  },
  {
    id: "opencode",
    label: "OpenCode",
    kind: "sqlite",
    environment: "ANTI_AI_OPENCODE_DB",
    homePath: [".local", "share", "opencode", "opencode.db"],
    precision: { zh: "逐消息精确", en: "message exact" },
  },
  {
    id: "openclaw",
    label: "OpenClaw",
    kind: "jsonl",
    environment: "ANTI_AI_OPENCLAW_DIR",
    homePath: [".openclaw", "agents"],
    precision: { zh: "逐消息精确", en: "message exact" },
  },
  {
    id: "hermes",
    label: "Hermes",
    kind: "sqlite",
    environment: "ANTI_AI_HERMES_DB",
    homePath: [".hermes", "state.db"],
    precision: { zh: "会话级近似", en: "session approximate" },
  },
  {
    id: "pi",
    label: "Pi",
    kind: "jsonl",
    environment: "ANTI_AI_PI_DIR",
    homePath: [".pi", "agent", "sessions"],
    precision: { zh: "逐条目精确", en: "entry exact" },
  },
]);

const COMMAND_REGISTRY = Object.freeze([
  {
    id: "today",
    summary: {
      zh: "打印指定日期的 AI 资源账单",
      en: "Print one day's AI resource receipt",
    },
  },
  {
    id: "week",
    summary: {
      zh: "打印截至指定日期的 7 天趋势",
      en: "Print the seven-day trend ending on a date",
    },
  },
  {
    id: "month",
    summary: {
      zh: "打印本月至指定日期的用量日历",
      en: "Print the monthly calendar through a date",
    },
  },
  {
    id: "codex",
    summary: {
      zh: "查看本地病理图鉴",
      en: "Inspect the private pathology codex",
    },
  },
  {
    id: "tui",
    summary: {
      zh: "打开受控交互式收容控制台",
      en: "Open the controlled interactive containment console",
    },
  },
  {
    id: "share",
    summary: {
      zh: "输出隐私安全的 SVG 分享卡",
      en: "Print a privacy-safe SVG share card",
    },
  },
  {
    id: "creature",
    summary: {
      zh: "查看和管理异变体档案",
      en: "Inspect and manage the mutation file",
    },
  },
  {
    id: "encounter",
    summary: {
      zh: "让两只异变体在本地发生接触事故",
      en: "Run a local contact accident between two mutations",
    },
  },
  {
    id: "lab",
    summary: {
      zh: "查看和管理污染实验室",
      en: "Inspect and manage the pollution laboratory",
    },
  },
  {
    id: "doctor",
    summary: {
      zh: "检查本地记录来源",
      en: "Check local record sources",
    },
  },
  {
    id: "explain",
    summary: {
      zh: "解释统计、资源换算和隐私边界",
      en: "Explain accounting, estimates, and privacy",
    },
  },
  {
    id: "help",
    summary: {
      zh: "查看具体命令帮助",
      en: "Show help for one command",
    },
  },
]);

const SHARE_CARD_IDS = Object.freeze([
  "receipt",
  "pathology",
  "specimen",
  "wanted",
  "fossil",
  "encounter",
  "prognosis",
  "culture",
  "companion",
  "habitat",
]);

const CREATURE_ACTION_IDS = Object.freeze([
  "reset",
  "evolve",
  "export",
  "habitat",
  "history",
  "intervene",
  "prognosis",
]);

const LAB_ACTION_IDS = Object.freeze([
  "incubate",
  "shelf",
  "inspect",
  "bond",
  "companion",
]);

const EXPLAIN_TOPIC_IDS = Object.freeze([
  "resources",
  "comparisons",
  "sources",
  "creature",
  "privacy",
]);

const FULL_SOURCE_COMMAND_IDS = Object.freeze([
  "creature",
  "encounter",
  "lab",
  "codex",
  "tui",
]);

const FULL_SOURCE_SHARE_CARD_IDS = Object.freeze(
  SHARE_CARD_IDS.filter((id) => id !== "receipt"),
);

const SOURCE_IDS = Object.freeze(SOURCE_REGISTRY.map(({ id }) => id));
const COMMAND_IDS = Object.freeze(COMMAND_REGISTRY.map(({ id }) => id));

const COMMAND_STATE_BEHAVIOR = Object.freeze({
  today: {
    zh: "完整来源的人类可读账单会结算成长；--json 或来源过滤只读。",
    en: "A human-readable all-source receipt settles growth; --json and source filters are read-only.",
  },
  week: {
    zh: "完整来源会结算成长；来源过滤只读。",
    en: "The complete source set settles growth; source-filtered reports are read-only.",
  },
  month: {
    zh: "完整来源会结算成长；来源过滤只读。",
    en: "The complete source set settles growth; source-filtered reports are read-only.",
  },
  codex: {
    zh: "只读快照，不会创建、迁移或推进异变体档案。",
    en: "Read-only snapshot; it does not create, migrate, or advance the mutation file.",
  },
  tui: {
    zh: "浏览和取消保持只读；影响预览可能扫描元数据，明确确认后才执行现有本地动作。",
    en: "Browsing and cancellation stay read-only; impact preview may scan metadata, and only explicit confirmation runs an existing local action.",
  },
  share: {
    zh: "只读快照；所有卡片都不会推进成长或培养物。",
    en: "Read-only snapshot; no card advances growth or cultures.",
  },
  creature: {
    zh: "结算并写入本地成长档案；reset 会删除该档案。",
    en: "Settles and writes the local growth file; reset deletes it.",
  },
  "creature habitat": {
    zh: "只读快照；不会创建、迁移、推进或改写成长档案。",
    en: "Read-only snapshot; it does not create, migrate, advance, or rewrite the growth file.",
  },
  encounter: {
    zh: "结算本地异变体；只有 --save 会额外收藏混种。",
    en: "Settles the local mutation; only --save additionally bottles the hybrid.",
  },
  lab: {
    zh: "查看配方和培养架只读；培养、绑定与伴生结算会写入档案。",
    en: "Formula and shelf inspection are read-only; incubation, bonding, and companion settlement write state.",
  },
  doctor: {
    zh: "只读诊断，不修改 Agent 记录或异变体档案。",
    en: "Read-only diagnostics; Agent records and mutation state are unchanged.",
  },
  explain: {
    zh: "只读说明。",
    en: "Read-only explanation.",
  },
});

export {
  COMMAND_IDS,
  COMMAND_REGISTRY,
  COMMAND_STATE_BEHAVIOR,
  CREATURE_ACTION_IDS,
  EXPLAIN_TOPIC_IDS,
  FULL_SOURCE_COMMAND_IDS,
  FULL_SOURCE_SHARE_CARD_IDS,
  LAB_ACTION_IDS,
  SHARE_CARD_IDS,
  SOURCE_IDS,
  SOURCE_REGISTRY,
};
