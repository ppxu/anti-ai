import { localized } from "./shared.mjs";
import {
  COMMAND_REGISTRY,
  COMMAND_STATE_BEHAVIOR,
  SOURCE_IDS,
} from "./registry.mjs";

const SOURCE_OPTION =
  `--source <all|${SOURCE_IDS.join("|")}>`;

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
      "形态、徽章、异色能力、伤痕、标本、病例、培养物、伴生异物、化石及其稀有度。",
      "Forms, badges, chromatic abilities, scars, specimens, cases, cultures, companions, fossils, and rarity.",
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
    related: ["creature", "lab", "share"],
  },
  tui: {
    usage: "anti-ai tui [options]",
    summary: [
      "打开受控交互式收容控制台。",
      "Open the controlled interactive containment console.",
    ],
    output: [
      "在四个区域中浏览，并通过行动中心预览、确认和执行结算、事故响应、干预、进化、孵化或缔结。",
      "Browse four areas, then preview, confirm, and run settlement, incident response, intervention, evolution, incubation, or bonding from the action center.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "查看指定日期的已结算档案", "Inspect the settled file at a date"],
      ["--no-motion", "以完全静态模式启动", "Start in fully static mode"],
    ],
    examples: [
      "anti-ai tui",
      "anti-ai tui --lang en",
      "anti-ai tui --no-motion",
    ],
    note: [
      "浏览与取消不扫描、不写入；结算预览可能扫描用量元数据，只有明确确认才写入。Agent 应使用显式命令及 --json。",
      "Browsing and cancellation do not scan or write; settlement preview may scan usage metadata, and only explicit confirmation writes. Agents should use explicit commands and --json.",
    ],
    related: ["today", "creature habitat", "lab", "codex"],
  },
  share: {
    usage: "anti-ai share [options]",
    summary: ["将账单或收藏输出为 1200×630 SVG。", "Print a receipt or collection card as a 1200×630 SVG."],
    output: [
      "SVG 只写入标准输出，不上传；不包含对话、路径、模型名或精确 Token。",
      "SVG is written to stdout only; all cards, including growing companion cards, omit chats, paths, model names, and exact tokens.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "指定卡片日期", "Select card date"],
      ["--card <receipt|pathology|specimen|wanted|fossil|encounter|prognosis|culture|companion|habitat>", "选择卡片类型", "Select card type"],
      ["--with <pollution-code>", "为 encounter 卡提供外来污染编码", "Provide a visitor pollution code for an encounter card"],
      ["--id <culture-id>", "指定 culture 卡的培养物", "Select the culture for a culture card"],
      [SOURCE_OPTION, "receipt 卡可过滤来源", "Receipt cards may filter sources"],
    ],
    examples: [
      "anti-ai share > receipt.svg",
      "anti-ai share --card pathology > pathology.svg",
      "anti-ai share --card wanted --lang en > wanted.svg",
      "anti-ai share --card encounter --with <pollution-code> > encounter.svg",
      "anti-ai share --card prognosis > prognosis.svg",
      "anti-ai share --card culture --id <culture-id> > culture.svg",
      "anti-ai share --card companion > companion.svg",
      "anti-ai share --card habitat > habitat.svg",
    ],
    note: [
      "异变体收藏卡必须使用完整来源。",
      "Mutation collection cards require the complete source set.",
    ],
    related: ["today", "codex", "creature", "lab"],
  },
  creature: {
    usage: "anti-ai creature [options]",
    summary: ["查看由长期 AI 使用方式塑造的异变体档案。", "Inspect the mutation shaped by long-term AI usage."],
    output: [
      "默认显示紧凑档案与活动伴生异物；--full 展示完整病历、能力、收藏和事件。",
      "Shows a compact file and active companion by default; --full reveals the complete casebook, abilities, collections, and events.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "结算并查看指定日期", "Settle and inspect a date"],
      ["--full", "显示完整纵向档案", "Show the complete vertical file"],
      ["--json", "输出机器可读成长状态", "Print machine-readable growth state"],
    ],
    examples: [
      "anti-ai creature",
      "anti-ai creature --full",
      "anti-ai creature history",
      "anti-ai creature habitat",
      "anti-ai creature intervene",
      "anti-ai creature incident",
      "anti-ai creature prognosis",
      "anti-ai creature evolve 2",
      "anti-ai creature reset",
    ],
    note: [
      "creature 必须使用完整来源；reset 会永久删除本地成长档案。",
      "creature requires complete sources; reset permanently deletes the local growth file.",
    ],
    related: ["creature habitat", "creature history", "creature intervene", "creature incident", "creature prognosis", "creature evolve", "creature export", "creature reset", "codex", "today"],
  },
  encounter: {
    usage: "anti-ai encounter <pollution-code> [options]",
    summary: ["让本地异变体与一份外来污染编码发生确定性接触事故。", "Run a deterministic local contact accident with a visitor pollution code."],
    output: [
      "显示算力天气、接触类型、混种 ASCII 和隐私安全的事故编号。",
      "Shows compute weather, contact type, hybrid ASCII, and a privacy-safe incident ID.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "指定事故日期（默认今天）", "Select incident date (default: today)"],
      ["--save", "将混种加入本地外来标本柜", "Bottle the hybrid in the local foreign-specimen cabinet"],
      ["--json", "输出稳定机器可读事故数据", "Print stable machine-readable incident data"],
    ],
    examples: [
      "anti-ai creature export",
      "anti-ai encounter <pollution-code>",
      "anti-ai encounter <pollution-code> --save",
    ],
    note: [
      "遭遇完全在本地演算；污染编码不包含精确 Token、模型、路径或对话。",
      "Encounters are computed locally; pollution codes contain no exact tokens, models, paths, or chats.",
    ],
    related: ["creature export", "codex", "share"],
  },
  lab: {
    usage: "anti-ai lab [options]",
    summary: [
      "查看由本地派生收藏驱动的污染实验室。",
      "Inspect the pollution laboratory driven by local derived collections.",
    ],
    output: [
      "显示外来标本、化石和病例切片库存，以及三个稳定的本地培养方案。",
      "Shows material inventory and three stable local formulas from foreign specimens, fossils, and case slices.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "查看指定日期可用的派生原料", "Inspect derived material available on a date"],
      ["--json", "输出稳定机器可读配方", "Print stable machine-readable formulas"],
    ],
    examples: [
      "anti-ai lab",
      "anti-ai lab --json",
      "anti-ai lab incubate 1",
      "anti-ai lab shelf",
      "anti-ai lab bond <culture-id>",
      "anti-ai lab companion",
    ],
    note: [
      "配方完全在本地确定；培养物不增加阅历、能力、战力或 Token 收益。",
      "Formulas are fully local; cultures add no experience, abilities, combat power, or Token rewards.",
    ],
    related: ["lab incubate", "lab shelf", "lab inspect", "lab bond", "lab companion", "codex", "encounter"],
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
  "creature habitat": {
    usage: "anti-ai creature habitat [options]",
    summary: [
      "查看异变体、伴生物与收藏共同形成的只读收容场景。",
      "Inspect the read-only containment scene formed by the mutation, companion, and collections.",
    ],
    output: [
      "以单屏 ASCII 生态舱展示双体关系、生态痕迹、七日事件和联合症状。",
      "Shows a one-screen ASCII habitat with the duo relationship, ecological traces, seven-day events, and joint symptom.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "查看指定日期的生态舱", "Inspect the habitat on a date"],
      ["--full", "展开已封存生态事件", "Expand sealed ecological events"],
      ["--json", "输出稳定机器可读生态快照", "Print the stable machine-readable habitat snapshot"],
    ],
    examples: [
      "anti-ai creature habitat",
      "anti-ai creature habitat --full",
      "anti-ai creature habitat --json",
      "anti-ai share --card habitat > habitat.svg",
    ],
    note: [
      "查看生态舱不会写入档案；事件每 7 个阅历日确定一次，Token 量不能重抽或加速。",
      "Viewing is read-only; one event is derived per seven experience days and Token volume cannot reroll or accelerate it.",
    ],
    related: ["creature", "lab companion", "codex", "share"],
  },
  "lab incubate": {
    usage: "anti-ai lab incubate <1|2|3> [options]",
    summary: [
      "从当前稳定批次中封存一份污染培养物。",
      "Seal one pollution culture from the current stable batch.",
    ],
    output: [
      "追加培养物 ASCII、配方、稀有度、并发症和副作用，并推进到下一批次。",
      "Appends culture ASCII, recipe, rarity, complication, and side effect, then advances the batch.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "指定封存日期", "Select sealed date"],
      ["--json", "输出机器可读培养结果", "Print the machine-readable culture result"],
    ],
    examples: ["anti-ai lab incubate 1", "anti-ai lab incubate 3 --json"],
    note: [
      "原料不会消耗，另外两个方案随批次结束；培养不会改变主异变体属性。",
      "Materials are not consumed; the other formulas expire with the batch and incubation never changes the main creature.",
    ],
    related: ["lab", "lab shelf", "lab inspect", "codex"],
  },
  "lab shelf": {
    usage: "anti-ai lab shelf [options]",
    summary: [
      "查看本地封存的污染培养架。",
      "Inspect the locally sealed pollution culture shelf.",
    ],
    output: [
      "默认显示最近六份培养物；--full 展示完整培养记录。",
      "Shows the six most recent cultures by default; --full reveals the complete shelf.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "查看截至指定日期的培养物", "Inspect cultures through a date"],
      ["--full", "显示完整培养架", "Show the complete shelf"],
      ["--json", "输出全部机器可读培养物", "Print every machine-readable culture"],
    ],
    examples: ["anti-ai lab shelf", "anti-ai lab shelf --full", "anti-ai lab shelf --json"],
    note: [
      "培养架只读取派生实验记录，不扫描 Agent 原始日志。",
      "The shelf reads derived experiment records only and never scans raw Agent logs.",
    ],
    related: ["lab", "lab incubate", "lab inspect", "codex"],
  },
  "lab inspect": {
    usage: "anti-ai lab inspect <culture-id> [options]",
    summary: [
      "查看一份污染培养物的完整诊断。",
      "Inspect the complete diagnosis for one pollution culture.",
    ],
    output: [
      "显示培养皿 ASCII、原料、生态、病灶、并发症和副作用。",
      "Shows dish ASCII, materials, Ecology, pathology, complication, and side effect.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "查看指定日期前的培养物", "Inspect a culture available by a date"],
      ["--json", "输出稳定机器可读培养物", "Print the stable machine-readable culture"],
    ],
    examples: [
      "anti-ai lab inspect <culture-id>",
      "anti-ai lab inspect <culture-id> --json",
      "anti-ai share --card culture --id <culture-id>",
    ],
    note: [
      "培养物是收藏与叙事结果，不提供战力、加成或稀有率提升。",
      "A culture is a collection and narrative outcome, with no combat power, bonuses, or rarity boost.",
    ],
    related: ["lab", "lab shelf", "share", "codex"],
  },
  "lab bond": {
    usage: "anti-ai lab bond <culture-id> [options]",
    summary: [
      "将一份已封存培养物设为当前伴生异物，建立伴生关系。",
      "Establish a symbiotic bond with one sealed culture.",
    ],
    output: [
      "保存当前伴生培养物和首次绑定日期；切换时保留旧伴生体已有成长。",
      "Stores the active culture and first bond date; switching preserves prior companion growth.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "指定建立伴生关系的日期", "Select the bond date"],
      ["--json", "输出机器可读伴生结果", "Print the machine-readable bond result"],
    ],
    examples: [
      "anti-ai lab shelf",
      "anti-ai lab bond <culture-id>",
      "anti-ai lab bond <culture-id> --json",
    ],
    note: [
      "同一天最多形成一个印记；切换、重复绑定或重复运行命令都不能复制成长。",
      "At most one imprint exists per day; switching, rebonding, or rerunning commands cannot duplicate growth.",
    ],
    related: ["lab shelf", "lab companion", "creature", "codex"],
  },
  "lab companion": {
    usage: "anti-ai lab companion [options]",
    summary: [
      "查看当前伴生异物的成长档案。",
      "Inspect the active symbiotic companion growth file.",
    ],
    output: [
      "显示寄生幼体、共生异形和共犯器官阶段，以及路线、行为印记、异常和动态 ASCII。",
      "Shows parasitic hatchling, symbiotic aberration, and accomplice organ stages with route, imprints, anomalies, and dynamic ASCII.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "查看指定日期的伴生状态", "Inspect companion state on a date"],
      ["--full", "显示完整伴生档案与隐私护栏", "Show the full companion file and privacy guardrail"],
      ["--json", "输出稳定机器可读伴生状态", "Print stable machine-readable companion state"],
    ],
    examples: [
      "anti-ai lab companion",
      "anti-ai lab companion --full",
      "anti-ai lab companion --json",
      "anti-ai share --card companion > companion.svg",
    ],
    note: [
      "每个观察日只增加一个印记；高消耗、低消耗和 AI 清醒日等速成长，只塑造不同路线。",
      "One imprint per observed day; heavy, restrained, and AI-free days grow equally and only shape different routes.",
    ],
    related: ["lab bond", "creature", "codex", "share"],
  },
  "creature history": {
    usage: "anti-ai creature history [options]",
    summary: [
      "查看压缩后的关键病程时间线。",
      "Inspect the compressed key-event case history.",
    ],
    output: [
      "默认只显示孵化、阶段、稀有突变、徽章、化石、进化、病例与事故；--full 才展开每日派生记录。",
      "Shows hatch, stage, rare mutation, badge, fossil, evolution, case, and incident events; --full alone expands daily derived records.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "查看截至指定日期的病程", "Inspect history through a selected date"],
      ["--full", "附加每日隐私安全记录", "Append privacy-safe daily records"],
      ["--json", "输出稳定机器可读时间线", "Print the stable machine-readable timeline"],
    ],
    examples: [
      "anti-ai creature history",
      "anti-ai creature history --full",
      "anti-ai creature history --json",
    ],
    note: [
      "时间线只使用派生成长状态，不包含精确 Token、模型、路径或对话。",
      "The timeline uses derived growth state only; it contains no exact tokens, models, paths, or chats.",
    ],
    related: ["creature", "creature intervene", "creature incident", "creature prognosis"],
  },
  "creature intervene": {
    usage: "anti-ai creature intervene [<1|2|3>] [options]",
    summary: [
      "查看或封存一个带代价的转折病例选择。",
      "Inspect or seal one costly turning-point case choice.",
    ],
    output: [
      "显示污染、清醒和悖论三条治疗路线；选择会留下本地后遗症。",
      "Shows pollution, clarity, and paradox treatments; a choice leaves a local aftereffect.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "结算并处理指定日期", "Settle and handle a selected date"],
      ["--json", "输出机器可读病例结果", "Print the machine-readable case result"],
    ],
    examples: [
      "anti-ai creature intervene",
      "anti-ai creature intervene 2",
      "anti-ai share --card prognosis > prognosis.svg",
    ],
    note: [
      "病例不设过期或签到；已封存选择不能改写，也不会按 Token 体量加速。",
      "Cases have no expiry or check-in; sealed choices cannot be rewritten and never accelerate with Token volume.",
    ],
    related: ["creature history", "creature prognosis", "codex", "share"],
  },
  "creature incident": {
    usage: "anti-ai creature incident [<1|2|3>] [options]",
    summary: [
      "查看或封存一场带延迟后果的收容事故响应。",
      "Inspect or seal a containment-incident response with delayed aftermath.",
    ],
    output: [
      "显示紧急隔离、继续观察和允许共振三种响应；后果会在 3 个阅历日后揭晓。",
      "Shows quarantine, observation, and resonance responses; the aftermath appears three experience days later.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "结算并处理指定日期", "Settle and handle a selected date"],
      ["--json", "输出机器可读事故状态", "Print the machine-readable incident state"],
    ],
    examples: [
      "anti-ai creature incident",
      "anti-ai creature incident 2",
      "anti-ai creature history",
    ],
    note: [
      "每 7 个阅历日最多出现一场事故；高消耗、低消耗和 AI 清醒日等速触发，响应不会增加能力、阅历或 Token 奖励。",
      "At most one incident appears per seven experience days; heavy, restrained, and AI-free days advance equally, and responses grant no abilities, experience, or Token rewards.",
    ],
    related: ["creature", "creature history", "codex", "tui"],
  },
  "creature prognosis": {
    usage: "anti-ai creature prognosis [options]",
    summary: [
      "预演未来 14–30 个阅历日的三条可能病程。",
      "Preview three possible courses across the next 14–30 experience days.",
    ],
    output: [
      "用主导、可能、潜伏三级方向和可解释因素展示未来，不给出伪精确概率。",
      "Shows leading, possible, and latent directions with explainable drivers instead of fake precision.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "基于指定日期预演", "Preview from a selected date"],
      ["--json", "输出稳定机器可读预演", "Print the stable machine-readable prognosis"],
    ],
    examples: [
      "anti-ai creature prognosis",
      "anti-ai creature prognosis --json",
      "anti-ai share --card prognosis > prognosis.svg",
    ],
    note: [
      "预演不是任务、奖励承诺或精确预测，不要求增加或减少 Token。",
      "A prognosis is not a task, reward promise, or precise prediction and never asks for more or fewer Tokens.",
    ],
    related: ["creature history", "creature intervene", "share"],
  },
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
      "删除 ~/.anti-ai/creature.json 及迁移备份；下一次结算会重新孵化。",
      "Deletes ~/.anti-ai/creature.json and migration backups; the next settlement hatches a new file.",
    ],
    options: [["--json", "输出 {\"reset\":true}", "Print {\"reset\":true}"]],
    examples: ["anti-ai creature reset"],
    note: [
      "这是不可撤销操作，不会删除任何 Agent 原始记录。",
      "This cannot be undone. It never deletes original Agent records.",
    ],
    related: ["creature"],
  },
  "creature export": {
    usage: "anti-ai creature export [options]",
    summary: ["导出一份可交换的隐私安全污染编码。", "Export a shareable privacy-safe pollution code."],
    output: [
      "输出协议版本、标本编号、外观指纹和带校验的污染编码。",
      "Prints the protocol version, specimen ID, appearance fingerprint, and checksummed pollution code.",
    ],
    options: [
      ["--date <YYYY-MM-DD>", "导出指定日期的形态", "Export the form at a selected date"],
      ["--json", "输出稳定机器可读编码", "Print stable machine-readable code data"],
    ],
    examples: [
      "anti-ai creature export",
      "anti-ai creature export --json",
      "anti-ai encounter <pollution-code>",
    ],
    note: [
      "编码只含离散外观状态，不含精确 Token、模型、路径或对话。",
      "The code contains derived appearance state, never exact tokens, models, paths, or chats.",
    ],
    related: ["encounter", "share", "creature"],
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
  const stateBehavior =
    COMMAND_STATE_BEHAVIOR[normalized] ??
    COMMAND_STATE_BEHAVIOR[normalized.split(" ")[0]];

  return [
    `Usage: ${help.usage}`,
    "",
    localized(lang, help.summary[0], help.summary[1]),
    "",
    localized(lang, "输出：", "Output:"),
    `  ${localized(lang, help.output[0], help.output[1])}`,
    ...(stateBehavior
      ? [
          "",
          localized(lang, "状态行为：", "State behavior:"),
          `  ${localized(lang, stateBehavior.zh, stateBehavior.en)}`,
        ]
      : []),
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
    ...COMMAND_REGISTRY.map(
      ({ id, summary }) =>
        `  ${id.padEnd(12)} ${localized(lang, summary.zh, summary.en)}`,
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
    "  anti-ai lab",
    "  anti-ai help today",
    "",
    `${localized(lang, "具体命令帮助", "Command help")}  anti-ai help <command>`,
    "",
  ].join("\n");
}

export { renderCommandHelp, renderTopLevelHelp };
