#!/usr/bin/env node

import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
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
    json: false,
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
    } else if (!["--help", "-h", "--version", "-v"].includes(arg)) {
      options.unknown.push(arg);
    }
  }

  return options;
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

function addUsage(target, usage) {
  for (const key of Object.keys(target)) {
    target[key] += usage[key] ?? 0;
  }
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

function formatDurationRange(hours) {
  const high = hours[1];
  if (high < 1 / 60) return formatScaledRange(hours, 3_600, "秒");
  if (high < 1) return formatScaledRange(hours, 60, "分钟");
  if (high < 48) return formatRange(hours, "小时");
  if (high < 24 * 730) return formatScaledRange(hours, 1 / 24, "天");
  return formatScaledRange(hours, 1 / (24 * 365), "年");
}

function everydayComparisons(resources) {
  const ledHours = resources.energyWh.map((value) => value / 10);
  const bottleCounts = resources.waterMl.map((value) => value / 550);
  const vehicleGramsPerKm = 400 / 1.609344;
  const drivingKm = resources.carbonGrams.map(
    (value) => value / vehicleGramsPerKm,
  );
  const treeAbsorptionHours = resources.carbonGrams.map(
    (value) => (value / 60_000) * 365 * 24,
  );

  return {
    led: formatDurationRange(ledHours),
    water:
      bottleCounts[1] < 1
        ? `一瓶的 ${formatPercentageRange(bottleCounts)}`
        : formatRange(bottleCounts, "瓶"),
    driving:
      drivingKm[1] < 1
        ? formatScaledRange(drivingKm, 1_000, "米")
        : formatRange(drivingKm, "公里"),
    tree: formatDurationRange(treeAbsorptionHours),
  };
}

function formatTokens(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function color(code, value) {
  if (!process.stdout.isTTY || process.env.NO_COLOR) return value;
  return `\u001B[${code}m${value}\u001B[0m`;
}

function renderReceipt(report) {
  const { date, sources, totals } = report;
  const resources = estimateResources(totals);
  const comparisons = everydayComparisons(resources);
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
    `  ${color("1", `${formatTokens(totals.totalTokens)} tokens`)} · ${totals.requests} 次模型请求`,
    "",
    `  Codex       ${formatTokens(sources.codex?.totalTokens ?? 0)}`,
    `  Claude Code ${formatTokens(sources.claude?.totalTokens ?? 0)}`,
    "",
    `  新鲜输入    ${formatTokens(uncachedInputTokens)}`,
    `  缓存读取    ${formatTokens(totals.cachedInputTokens)}`,
    `  缓存写入    ${formatTokens(totals.cacheWriteInputTokens)}`,
    `  模型输出    ${formatTokens(totals.outputTokens)}`,
    "",
    `  ${color("33", "公开代理跨度（不是电表）")}`,
    `  ⚡  ${formatRange(resources.energyWh, "Wh")}`,
    `  💧  ${formatRange(resources.waterMl, "mL")}`,
    `  ☁️  ${formatRange(resources.carbonGrams, "gCO₂e")}`,
    "",
    `  ${color("33", "生活翻译（终于像人话了）")}`,
    `  💡  10W LED 灯       ${comparisons.led}`,
    `  🚰  550mL 矿泉水     ${comparisons.water}`,
    `  🚗  平均燃油车        ${comparisons.driving}`,
    `  🌳  1 棵城市树        加班 ${comparisons.tree}才能吸回来`,
    "",
    `  置信度：${color("1;31", "低")} · 运行 anti-ai explain 查看口径`,
    "",
    `  ${color("2", `机器开了 ${totals.requests} 张小票，地球只收到一段估算。`)}`,
    color("2", "└──────────────────────────────────────────────┘"),
    "",
  ];
  return lines.join("\n");
}

function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return false;
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function renderWeek(dailyReports) {
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

  return [
    color("2", "┌──────────────────────────────────────────────┐"),
    `  ${color("1;31", `YOUR AI HANGOVER · ${firstDate} → ${lastDate}`)}`,
    color("2", "├──────────────────────────────────────────────┤"),
    "",
    ...rows,
    "",
    `  ${color("1", `7 日合计  ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} 次模型请求`)}`,
    "",
    `  ${color("2", "七天过去了。代码也许能跑，账单肯定能。")}`,
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

function usageByDate(dates) {
  return new Map(dates.map((date) => [date, emptyUsage()]));
}

function earliestLocalMidnight(dates) {
  return new Date(`${dates[0]}T00:00:00`).getTime();
}

async function scanCodex(root, dates, timezone) {
  const results = usageByDate(dates);

  for await (const file of jsonlFiles(root, earliestLocalMidnight(dates))) {
    const lines = readline.createInterface({
      input: createReadStream(file),
      crlfDelay: Infinity,
    });

    for await (const line of lines) {
      if (!line.includes('"type":"token_count"')) continue;
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }

      const usage = record?.payload?.info?.last_token_usage;
      if (record?.payload?.type !== "token_count" || !usage) continue;
      const date = localDate(record.timestamp, timezone);
      const result = results.get(date);
      if (!result) continue;

      const inputTokens = Number(usage.input_tokens ?? 0);
      const outputTokens = Number(usage.output_tokens ?? 0);
      addUsage(result, {
        requests: 1,
        inputTokens,
        cachedInputTokens: Number(usage.cached_input_tokens ?? 0),
        cacheWriteInputTokens: Number(usage.cache_write_input_tokens ?? 0),
        outputTokens,
        reasoningOutputTokens: Number(usage.reasoning_output_tokens ?? 0),
        totalTokens: Number(usage.total_tokens ?? inputTokens + outputTokens),
      });
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

  const results = usageByDate(dates);
  for (const snapshot of snapshots.values()) {
    const result = results.get(localDate(snapshot.timestamp, timezone));
    if (result) addUsage(result, snapshot.usage);
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
    for (const [source, results] of Object.entries(sourceResults)) {
      sources[source] = results.get(date);
    }
    const totals = emptyUsage();
    for (const usage of Object.values(sources)) addUsage(totals, usage);
    return { date, timezone, sources, totals };
  });
}

async function runToday(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = options.date ?? localDate(new Date(), timezone);
  const [report] = await reportsForDates(options, [date], timezone);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(renderReceipt(report));
  }
}

async function runWeek(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const endDate = options.date ?? localDate(new Date(), timezone);
  const dates = Array.from({ length: 7 }, (_, index) =>
    shiftDate(endDate, index - 6),
  );
  const reports = await reportsForDates(options, dates, timezone);
  process.stdout.write(renderWeek(reports));
}

async function countJsonl(root) {
  let count = 0;
  for await (const _file of jsonlFiles(root)) count += 1;
  return count;
}

async function runDoctor(options) {
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
      `${check.label.padEnd(12)} ${check.count > 0 ? "✓" : "✗"}  ${check.count} 个 JSONL 文件`,
      color("2", `             ${check.root}`),
    ]),
    "",
    "只保留时间、消息 ID、模型和 usage 元数据。",
    "不采集、不保存、不输出会话正文。",
    "",
  ];
  process.stdout.write(lines.join("\n"));
  if (checks.some((check) => check.count === 0)) process.exitCode = 1;
}

function runExplain() {
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
    color("1", "生活化对照"),
    "  10W LED 灯：电力 Wh ÷ 10W = 点灯小时数",
    "  550mL 矿泉水：水耗 mL ÷ 550 = 瓶数",
    "  上述功率和瓶装水容量是展示假设，不是环境测量标准。",
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
    "这些值不是统计置信区间，只是不可直接比较的公开案例跨度。",
    `置信度：${color("1;31", "低")}`,
    "",
    color("2", "AI 很擅长生成答案，厂商还不太擅长生成电费单。"),
    "",
  ];
  process.stdout.write(lines.join("\n"));
}

function runHelp() {
  process.stdout.write(`Usage: anti-ai <command> [options]

把本地 AI Token 变成一张不太令人愉快的资源账单。

Commands:
  today    打印今天的 AI 资源账单
  week     打印最近 7 天趋势
  doctor   检查本地日志
  explain  解释资源代理口径

Options:
  --date <YYYY-MM-DD>             指定 today 日期或 week 结束日期
  --source <all|codex|claude>     过滤日志来源（默认 all）
  --json                          today 输出机器可读的精确 Token 统计
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
  runHelp();
} else if (versionRequested) {
  process.stdout.write(`anti-ai ${VERSION}\n`);
} else if (options.missing) {
  process.stderr.write(`参数 ${options.missing} 缺少值\n`);
  process.exitCode = 2;
} else if (options.unknown.length > 0) {
  process.stderr.write(`未知参数：${options.unknown[0]}\n`);
  process.exitCode = 2;
} else if (!["all", "codex", "claude"].includes(options.source)) {
  process.stderr.write(`不支持的数据源：${options.source}\n`);
  process.exitCode = 2;
} else if (rawArgs.includes("--date") && !isValidDate(options.date)) {
  process.stderr.write(`无效日期：${options.date}\n`);
  process.exitCode = 2;
} else if (options.command === "today") {
  await runToday(options);
} else if (options.command === "week") {
  await runWeek(options);
} else if (options.command === "doctor") {
  await runDoctor(options);
} else if (options.command === "explain") {
  runExplain();
} else {
  process.stderr.write(
    "Usage: anti-ai <today|week|doctor|explain> [--date YYYY-MM-DD] [--source all|codex|claude] [--json]\n",
  );
  process.exitCode = 1;
}
