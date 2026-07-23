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

function formatChange(current, baseline) {
  if (baseline === 0) return current === 0 ? "0.00%" : "首次记录";
  const change = ((current - baseline) / baseline) * 100;
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${change.toFixed(2)}%`;
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
            label: "10W LED 灯",
            value: formatDurationRange(ledHours),
          }
        : resources.energyWh[1] < 1_500
          ? {
              icon: "📱",
              label: "15Wh 手机充电",
              value: formatRange(phoneCharges, "次"),
            }
          : {
              icon: "🫖",
              label: "烧开 1L 水",
              value: formatRange(kettleBoils, "壶"),
            },
    water:
      bottleCounts[1] < 1
        ? {
            icon: "🚰",
            label: "550mL 矿泉水",
            value: `一瓶的 ${formatPercentageRange(bottleCounts)}`,
          }
        : resources.waterMl[1] < 8_000
          ? {
              icon: "🚰",
              label: "550mL 矿泉水",
              value: formatRange(bottleCounts, "瓶"),
            }
          : {
              icon: "🚿",
              label: "8L/min 淋浴",
              value: formatRange(showerMinutes, "分钟"),
            },
    driving: {
      icon: "🚗",
      label: "平均燃油车",
      value:
        drivingKm[1] < 1
          ? formatScaledRange(drivingKm, 1_000, "米")
          : formatRange(drivingKm, "公里"),
    },
    tree: {
      icon: "🌳",
      label: "1 棵城市树",
      value: `加班 ${formatDurationRange(treeAbsorptionHours)}才能吸回来`,
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

function dailyVerdict(totals, baseline) {
  if (totals.requests === 0) {
    return {
      title: "拒绝营业",
      detail: "今天没有模型请求。数据中心暂时失去了你的关心。",
    };
  }
  if (baseline.requests === 0 || baseline.totalTokens === 0) {
    return {
      title: "初犯记录",
      detail: "过去 7 天没有可比记录，今天先把小票钉在墙上。",
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
      title: "上下文囤积",
      detail: `请求没多，单次 Token 用量却膨胀到 ${tokensPerRequestRatio.toFixed(2)} 倍。`,
    };
  }
  if (requestRatio >= 2) {
    return {
      title: "请求连发",
      detail: `模型被叫了平时的 ${requestRatio.toFixed(2)} 倍，像个没有下班按钮的实习生。`,
    };
  }
  if (cacheRatio >= 0.7) {
    return {
      title: "缓存考古学家",
      detail: `${(cacheRatio * 100).toFixed(2)}% 的输入来自缓存，今天主要在翻旧账。`,
    };
  }
  if (totals.totalTokens <= baseline.totalTokens * 0.3) {
    return {
      title: "电子戒断",
      detail: "用量不到平时三成，硅基同事开始担心失业。",
    };
  }
  if (totals.totalTokens >= baseline.totalTokens * 1.5) {
    return {
      title: "算力暴食",
      detail: `Token 总量达到平时的 ${(totals.totalTokens / baseline.totalTokens).toFixed(2)} 倍。`,
    };
  }
  return {
    title: "稳定消耗",
    detail: "没有暴走，也没有戒断。只是稳定地把电变成文字。",
  };
}

function renderReceipt(report, historicalReports = []) {
  const { date, sources, totals } = report;
  const resources = estimateResources(totals);
  const comparisons = everydayComparisons(resources);
  const baseline =
    historicalReports.length > 0 ? averageTotals(historicalReports) : undefined;
  const verdict = baseline ? dailyVerdict(totals, baseline) : undefined;
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
    renderComparison(comparisons.energy),
    renderComparison(comparisons.water),
    renderComparison(comparisons.driving),
    renderComparison(comparisons.tree),
    ...(baseline
      ? [
          "",
          `  ${color("33", "个人基线（过去 7 个自然日）")}`,
          `  Token  ${formatChange(totals.totalTokens, baseline.totalTokens)}`,
          `  请求   ${formatChange(totals.requests, baseline.requests)}`,
          "",
          `  ${color("1;31", `今日罪名：${verdict.title}`)}`,
          `  ${verdict.detail}`,
        ]
      : []),
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

function renderMonth(dailyReports) {
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

  return [
    color("2", "┌──────────────────────────────────────────────┐"),
    `  ${color("1;31", `YOUR AI CALENDAR · ${firstDate} → ${lastDate}`)}`,
    color("2", "├──────────────────────────────────────────────┤"),
    "",
    "  一    二    三    四    五    六    日",
    ...rows,
    "",
    "  · 无记录  ░ 少  ▒ 中  ▓ 多  █ 最重",
    "",
    `  ${color("1", `月度合计    ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} 次模型请求`)}`,
    `  AI 清醒日  ${quietDays}/${dailyReports.length}`,
    `  最长清醒期 ${longestQuietStreak(dailyReports)} 天`,
    `  最重一天    ${peak.date.slice(5)} · ${formatTokens(peak.totals.totalTokens)} tokens`,
    "",
    `  ${color("2", "这个月还没结束，数据中心已经替你记住了。")}`,
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

  if (options.json) {
    const [report] = await reportsForDates(options, [date], timezone);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    const dates = Array.from({ length: 8 }, (_, index) =>
      shiftDate(date, index - 7),
    );
    const reports = await reportsForDates(options, dates, timezone);
    process.stdout.write(renderReceipt(reports.at(-1), reports.slice(0, -1)));
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

async function runMonth(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const endDate = options.date ?? localDate(new Date(), timezone);
  const dayCount = Number(endDate.slice(8));
  const dates = Array.from({ length: dayCount }, (_, index) =>
    `${endDate.slice(0, 8)}${String(index + 1).padStart(2, "0")}`,
  );
  const reports = await reportsForDates(options, dates, timezone);
  process.stdout.write(renderMonth(reports));
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
    color("1", "个人基线与判词"),
    "  基线 = 过去 7 个自然日总量 ÷ 7，包含无记录日",
    "  判词按以下顺序命中第一条：",
    "  上下文囤积：请求数不高于基线 1.2 倍，且单次 Token 不低于 1.8 倍",
    "  请求连发：请求数不低于基线 2 倍",
    "  缓存考古学家：缓存读取占输入至少 70%",
    "  电子戒断：Token 总量不高于基线 30%",
    "  算力暴食：Token 总量不低于基线 1.5 倍",
    "  其余情况显示“稳定消耗”；无请求或无历史时使用专用判词。",
    "  判词由本地固定规则生成，不调用模型。",
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
  month    打印本月至指定日期的用量热力图
  doctor   检查本地日志
  explain  解释资源代理口径

Options:
  --date <YYYY-MM-DD>             指定 today 日期，或 week/month 结束日期
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
} else if (options.command === "month") {
  await runMonth(options);
} else if (options.command === "doctor") {
  await runDoctor(options);
} else if (options.command === "explain") {
  runExplain();
} else {
  process.stderr.write(
    "Usage: anti-ai <today|week|month|doctor|explain> [--date YYYY-MM-DD] [--source all|codex|claude] [--json]\n",
  );
  process.exitCode = 1;
}
