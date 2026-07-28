import { localized } from "./shared.mjs";

const SOURCE_OPTION =
  "--source <all|codex|claude|opencode|openclaw|hermes|pi>";

const COMMANDS = [
  ["today", "打印指定日期的 AI 资源账单", "Print one day's AI resource receipt"],
  ["week", "打印截至指定日期的 7 天趋势", "Print the seven-day trend ending on a date"],
  ["month", "打印本月至指定日期的用量日历", "Print the monthly calendar through a date"],
  ["codex", "查看本地病理图鉴", "Inspect the private pathology codex"],
  ["share", "输出隐私安全的 SVG 分享卡", "Print a privacy-safe SVG share card"],
  ["creature", "查看和管理异变体档案", "Inspect and manage the mutation file"],
  ["doctor", "检查本地记录来源", "Check local record sources"],
  ["explain", "解释统计、资源换算和隐私边界", "Explain accounting, estimates, and privacy"],
  ["help", "查看具体命令帮助", "Show help for one command"],
];

const COMMAND_HELP = {
  today: {
    usage: "anti-ai today [options]",
    summary: ["打印指定日期的本地 AI 资源账单。", "Print a local AI resource receipt for one date."],
    output: [
      "Token、模型、公开资源参照、5 条小型生活翻译、个人基线、今日罪名和异变体摘要。",
      "Tokens, models, named public resource references, five small everyday comparisons, baseline, charge, and mutation summary.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "指定日期（默认今天）", "Select date (default: today)"],
      [SOURCE_OPTION, "过滤本地来源（默认 all）", "Filter local source (default: all)"],
      ["--json", "输出语言无关的机器可读用量", "Print language-neutral machine-readable usage"],
    ],
    examples: [
      "anti-ai today",
      "anti-ai today --date 2026-07-23",
      "anti-ai today --source opencode --lang en",
      "anti-ai today --json",
    ],
    note: [
      "资源值是公开场景参照，不是对本地模型的实际测量。",
      "Resource values are public-case references, not measurements of your local models.",
    ],
    related: ["week", "month", "explain", "creature"],
  },
  week: {
    usage: "anti-ai week [options]",
    summary: ["打印截至指定日期的七日趋势。", "Print the seven-day trend ending on a selected date."],
    output: [
      "每日 Token 条形图、模型合计、公开资源参照、5 条中型生活翻译和活体病历。",
      "Daily token bars, model totals, public references, five medium comparisons, and the living casebook.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "指定结束日期（默认今天）", "Select end date (default: today)"],
      [SOURCE_OPTION, "过滤本地来源（默认 all）", "Filter local source (default: all)"],
    ],
    examples: [
      "anti-ai week",
      "anti-ai week --date 2026-07-23",
      "anti-ai week --source openclaw --lang en",
    ],
    note: [
      "带来源过滤时只显示用量，不改写完整异变体成长史。",
      "Source-filtered reports show usage only and do not rewrite the complete creature history.",
    ],
    related: ["today", "month", "creature"],
  },
  month: {
    usage: "anti-ai month [options]",
    summary: ["打印本月至指定日期的用量日历热力图。", "Print a monthly calendar heatmap through a selected date."],
    output: [
      "月历、AI 清醒日、峰值、模型合计、5 条大型生活翻译和月度复诊。",
      "Calendar heatmap, AI-free days, peak, model totals, five large comparisons, and monthly follow-up.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "指定月度截止日（默认今天）", "Select month cutoff (default: today)"],
      [SOURCE_OPTION, "过滤本地来源（默认 all）", "Filter local source (default: all)"],
    ],
    examples: [
      "anti-ai month",
      "anti-ai month --date 2026-07-23",
      "anti-ai month --source pi --lang en",
    ],
    note: [
      "缺失来源按零用量处理；不会读取或打印会话正文。",
      "Missing sources count as zero; conversation text is never read or printed.",
    ],
    related: ["week", "today", "creature"],
  },
  codex: {
    usage: "anti-ai codex [options]",
    summary: ["查看由本地成长史派生的私人病理图鉴。", "Inspect the private pathology codex derived from local growth history."],
    output: [
      "形态、徽章、异色能力、伤痕、标本、化石及其稀有度。",
      "Forms, badges, chromatic abilities, scars, specimens, fossils, and rarity.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "查看指定日期状态", "Inspect state at a date"],
      ["--json", "输出稳定 ID 和发现状态", "Print stable IDs and discovery state"],
    ],
    examples: ["anti-ai codex", "anti-ai codex --json", "NO_COLOR=1 anti-ai codex"],
    note: [
      "图鉴只接受完整来源；锁定条目在人类输出中保持 ???。",
      "The codex requires complete sources; locked human entries remain ???.",
    ],
    related: ["creature", "share"],
  },
  share: {
    usage: "anti-ai share [options]",
    summary: ["将账单或收藏输出为 1200×630 SVG。", "Print a receipt or collection card as a 1200×630 SVG."],
    output: [
      "SVG 只写入标准输出，不上传；不包含对话、路径、模型名或精确 Token。",
      "SVG is written to stdout only; it omits chats, paths, model names, and exact tokens.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "指定卡片日期", "Select card date"],
      ["--card <receipt|pathology|specimen|wanted|fossil>", "选择卡片类型", "Select card type"],
      [SOURCE_OPTION, "receipt 卡可过滤来源", "Receipt cards may filter sources"],
    ],
    examples: [
      "anti-ai share > receipt.svg",
      "anti-ai share --card pathology > pathology.svg",
      "anti-ai share --card wanted --lang en > wanted.svg",
    ],
    note: [
      "异变体收藏卡必须使用完整来源。",
      "Mutation collection cards require the complete source set.",
    ],
    related: ["today", "codex", "creature"],
  },
  creature: {
    usage: "anti-ai creature [options]",
    summary: ["查看由长期 AI 使用方式塑造的异变体档案。", "Inspect the mutation shaped by long-term AI usage."],
    output: [
      "默认显示紧凑档案；--full 展示完整病历、能力、收藏和事件。",
      "Shows a compact file by default; --full reveals the complete casebook, abilities, collections, and events.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "结算并查看指定日期", "Settle and inspect a date"],
      ["--full", "显示完整纵向档案", "Show the complete vertical file"],
      ["--json", "输出机器可读成长状态", "Print machine-readable growth state"],
    ],
    examples: [
      "anti-ai creature",
      "anti-ai creature --full",
      "anti-ai creature evolve 2",
      "anti-ai creature reset",
    ],
    note: [
      "creature 必须使用完整来源；reset 会永久删除本地成长档案。",
      "creature requires complete sources; reset permanently deletes the local growth file.",
    ],
    related: ["creature evolve", "creature reset", "codex", "today"],
  },
  doctor: {
    usage: "anti-ai doctor [options]",
    summary: ["检查各本地 Agent 记录是否可读取。", "Check whether each local Agent record source is readable."],
    output: [
      "逐来源显示发现状态、归因精度和诊断，不打印会话正文。",
      "Shows discovery state, attribution precision, and diagnostics without conversation text.",
    ],
    options: [
      [SOURCE_OPTION, "只检查一个来源（默认 all）", "Check one source only (default: all)"],
    ],
    examples: ["anti-ai doctor", "anti-ai doctor --source hermes", "anti-ai doctor --lang en"],
    note: [
      "Hermes 缺少逐请求时间时会明确标为会话级近似。",
      "Hermes is explicitly marked session-level approximate when per-request time is unavailable.",
    ],
    related: ["today", "explain sources", "explain privacy"],
  },
  explain: {
    usage: "anti-ai explain [resources|comparisons|sources|creature|privacy]",
    summary: ["解释工具的计算依据和边界。", "Explain the tool's methods and boundaries."],
    output: [
      "省略主题时显示全部；指定主题可只看资源、生活换算、来源、成长或隐私。",
      "Omit the topic for everything, or focus on resources, comparisons, sources, creature, or privacy.",
    ],
    options: [],
    examples: [
      "anti-ai explain resources",
      "anti-ai explain comparisons --lang en",
      "anti-ai explain sources",
    ],
    note: [
      "公开案例来自不同边界，不会被包装成模型级真实测量。",
      "Public cases have different boundaries and are never presented as model-level measurement.",
    ],
    related: ["today", "doctor"],
  },
};

const ACTION_HELP = {
  "creature evolve": {
    usage: "anti-ai creature evolve <1|2|3>",
    summary: ["显式封存本代进化选择。", "Explicitly seal the current generation's evolution choice."],
    output: [
      "显示污染、清醒、悖论三条路线的收益、代价和触发率。",
      "Shows pollution, clarity, and paradox choices with benefits, costs, and proc rates.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "选择要结算的日期", "Select the date to settle"],
      ["--json", "输出机器可读进化结果", "Print the machine-readable evolution result"],
    ],
    examples: ["anti-ai creature evolve", "anti-ai creature evolve 2"],
    note: [
      "已封存的世代不能改选；不选择不会阻断普通账单。",
      "A sealed generation cannot be rewritten; leaving it pending does not block reports.",
    ],
    related: ["creature", "creature reset"],
  },
  "creature reset": {
    usage: "anti-ai creature reset",
    summary: ["永久删除本地异变体档案。", "Permanently deletes the local mutation file."],
    output: [
      "删除 ~/.anti-ai/creature.json；下一次结算会重新孵化。",
      "Deletes ~/.anti-ai/creature.json; the next settlement hatches a new file.",
    ],
    options: [["--json", "输出 {\"reset\":true}", "Print {\"reset\":true}"]],
    examples: ["anti-ai creature reset"],
    note: [
      "这是不可撤销操作，不会删除任何 Agent 原始记录。",
      "This cannot be undone. It never deletes original Agent records.",
    ],
    related: ["creature"],
  },
};

function optionLines(options, lang) {
  return [
    localized(lang, "Options:", "Options:"),
    ...options.map(
      ([flag, zh, en]) =>
        `  ${flag.padEnd(62)} ${localized(lang, zh, en)}`,
    ),
    "  --lang <zh|en>".padEnd(64) +
      localized(lang, "选择输出语言（默认 zh）", "Select output language (default: zh)"),
    "  -h, --help".padEnd(64) +
      localized(lang, "显示本帮助", "Show this help"),
  ];
}

function renderCommandHelp(target, lang = "zh") {
  const normalized = Array.isArray(target)
    ? target.filter(Boolean).join(" ")
    : String(target ?? "").trim();
  const help = ACTION_HELP[normalized] ?? COMMAND_HELP[normalized];
  if (!help) return null;

  return [
    `Usage: ${help.usage}`,
    "",
    localized(lang, help.summary[0], help.summary[1]),
    "",
    localized(lang, "输出：", "Output:"),
    `  ${localized(lang, help.output[0], help.output[1])}`,
    "",
    ...optionLines(help.options, lang),
    "",
    localized(lang, "Examples:", "Examples:"),
    ...help.examples.map((example) => `  ${example}`),
    "",
    localized(lang, "说明：", "Note:"),
    `  ${localized(lang, help.note[0], help.note[1])}`,
    "",
    `${localized(lang, "相关命令", "Related commands")}  ${help.related.join(" · ")}`,
    "",
  ].join("\n");
}

function renderTopLevelHelp(lang = "zh") {
  return [
    "Usage: anti-ai <command> [options]",
    "",
    localized(
      lang,
      "把本地 AI Token 变成一张不太令人愉快的资源账单。",
      "Turn local AI tokens into an uncomfortable resource bill.",
    ),
    "",
    localized(lang, "Commands:", "Commands:"),
    ...COMMANDS.map(
      ([command, zh, en]) =>
        `  ${command.padEnd(12)} ${localized(lang, zh, en)}`,
    ),
    "",
    localized(lang, "Global options:", "Global options:"),
    `  ${"--lang <zh|en>".padEnd(22)} ${localized(lang, "选择输出语言（默认 zh）", "Select output language (default: zh)")}`,
    `  ${"-v, --version".padEnd(22)} ${localized(lang, "显示版本", "Show version")}`,
    `  ${"-h, --help".padEnd(22)} ${localized(lang, "显示顶层帮助", "Show top-level help")}`,
    "",
    localized(lang, "Examples:", "Examples:"),
    "  anti-ai today",
    "  anti-ai creature",
    "  anti-ai help today",
    "",
    `${localized(lang, "具体命令帮助", "Command help")}  anti-ai help <command>`,
    "",
  ].join("\n");
}

export { renderCommandHelp, renderTopLevelHelp };
