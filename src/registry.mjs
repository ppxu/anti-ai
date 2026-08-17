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
    id: "desktop",
    summary: {
      zh: "关联和刷新 macOS 桌面伴生体",
      en: "Link and refresh the macOS desktop companion",
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
    id: "expedition",
    summary: {
      zh: "开启或继续十格收容远征",
      en: "Start or continue a ten-cell containment expedition",
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
    id: "clinic",
    summary: {
      zh: "查看 Token 代谢诊断与被动研究",
      en: "Inspect Token metabolism and passive studies",
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
  "briefing",
  "dossier",
  "pathology",
  "specimen",
  "wanted",
  "fossil",
  "encounter",
  "prognosis",
  "culture",
  "companion",
  "habitat",
  "expedition",
]);

const CREATURE_ACTION_IDS = Object.freeze([
  "reset",
  "chronicle",
  "evolve",
  "export",
  "habitat",
  "history",
  "incident",
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

const EXPEDITION_ACTION_IDS = Object.freeze([
  "start",
  "next",
  "choose",
  "history",
  "abandon",
]);

const CLINIC_ACTION_IDS = Object.freeze(["start", "history"]);

const ENCOUNTER_ACTION_IDS = Object.freeze(["visitors", "host", "release"]);

const DESKTOP_ACTION_IDS = Object.freeze(["link", "status", "refresh"]);
const TUI_AREA_IDS = Object.freeze([
  "overview",
  "habitat",
  "expedition",
  "laboratory",
  "codex",
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
  "expedition",
  "desktop",
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
    zh: "浏览和取消保持只读；影响预览可能扫描元数据，陈列或每日叙事动作仅在明确确认后写入稳定 ID。",
    en: "Browsing and cancellation stay read-only; impact preview may scan metadata, and displays or daily narrative actions write stable IDs only after explicit confirmation.",
  },
  desktop: {
    zh: "status 只读；link 和 refresh 会显式扫描用量、结算到今天，并原子更新隐私安全快照。",
    en: "status is read-only; link and refresh explicitly scan usage, settle through today, and atomically update the privacy-safe snapshot.",
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
  "creature chronicle": {
    zh: "只读派生年鉴，不会创建、迁移、推进或改写成长档案。",
    en: "Read-only derived chronicle; it does not create, migrate, advance, or rewrite the growth file.",
  },
  encounter: {
    zh: "遭遇会结算本地异变体；--save 收藏混种，visitors 只读，host/release 仅写访客入住记录。",
    en: "An encounter settles the local mutation; --save bottles the hybrid, visitors is read-only, and host/release write only stay records.",
  },
  lab: {
    zh: "查看配方和培养架只读；培养、绑定与伴生结算会写入档案。",
    en: "Formula and shelf inspection are read-only; incubation, bonding, and companion settlement write state.",
  },
  expedition: {
    zh: "状态与历史查询只读；开始、推进、选择和放弃会写入档案。",
    en: "Status and history are read-only; start, advance, choose, and abandon write state.",
  },
  doctor: {
    zh: "只读诊断，不修改 Agent 记录或异变体档案。",
    en: "Read-only diagnostics; Agent records and mutation state are unchanged.",
  },
  clinic: {
    zh: "门诊和历史只读；只有 clinic start 会写入一个本地研究协议。",
    en: "Clinic and history views are read-only; only clinic start writes one local study protocol.",
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
  CLINIC_ACTION_IDS,
  CREATURE_ACTION_IDS,
  DESKTOP_ACTION_IDS,
  ENCOUNTER_ACTION_IDS,
  EXPEDITION_ACTION_IDS,
  EXPLAIN_TOPIC_IDS,
  FULL_SOURCE_COMMAND_IDS,
  FULL_SOURCE_SHARE_CARD_IDS,
  LAB_ACTION_IDS,
  SHARE_CARD_IDS,
  SOURCE_IDS,
  SOURCE_REGISTRY,
  TUI_AREA_IDS,
};
