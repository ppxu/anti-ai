import { everydayComparisons } from "./comparisons.mjs";
import {
  estimateResources,
  formatResource,
  referenceLabel,
} from "./methodology.mjs";
import { emptyUsage, localized } from "./shared.mjs";
import { inclusiveDateRange, isValidDate, shiftDate } from "./core/date.mjs";
import { addModelUsage, addUsage } from "./core/usage.mjs";
import { dailyVerdict, periodFooter, rotatingCopy } from "./reporting/verdict.mjs";

const DEFAULT_REPORT_COLUMNS = 80;
const MIN_REPORT_COLUMNS = 40;
const MAX_REPORT_COLUMNS = 80;
const ANSI_TOKEN_PATTERN = /\u001B\[[0-9;]*m|./gu;

function formatChange(current, baseline, lang = "zh") {
  if (baseline === 0) {
    return current === 0 ? "0.00%" : localized(lang, "首次记录", "first record");
  }
  const change = ((current - baseline) / baseline) * 100;
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${change.toFixed(2)}%`;
}

function terminalWidth(value) {
  const plain = String(value).replaceAll(/\u001B\[[0-9;]*m/g, "");
  return Array.from(plain).reduce(
    (total, character) =>
      total + (/\p{Script=Han}/u.test(character) ? 2 : 1),
    0,
  );
}

function padTerminal(value, width) {
  return `${value}${" ".repeat(Math.max(0, width - terminalWidth(value)))}`;
}

function reportColumns(columns = process.stdout.columns) {
  const value = Number(columns);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_REPORT_COLUMNS;
  return Math.max(
    MIN_REPORT_COLUMNS,
    Math.min(MAX_REPORT_COLUMNS, Math.floor(value)),
  );
}

function reportBorder(position, width) {
  const glyphs = {
    top: ["┌", "┐"],
    middle: ["├", "┤"],
    bottom: ["└", "┘"],
  }[position];
  return `${glyphs[0]}${"─".repeat(width - 2)}${glyphs[1]}`;
}

function splitTerminalChunk(value, width) {
  const chunks = [];
  let chunk = "";
  let chunkWidth = 0;
  for (const token of String(value).match(ANSI_TOKEN_PATTERN) ?? []) {
    const widthDelta = terminalWidth(token);
    if (widthDelta > 0 && chunkWidth + widthDelta > width && chunkWidth > 0) {
      chunks.push(chunk);
      chunk = "";
      chunkWidth = 0;
    }
    chunk += token;
    chunkWidth += widthDelta;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

function wrapTerminalLine(value, width) {
  const source = String(value);
  if (source === "" || terminalWidth(source) <= width) return [source];
  const leading = source.match(/^ */u)?.[0] ?? "";
  const body = source.slice(leading.length);
  const continuation = " ".repeat(
    Math.min(8, Math.max(4, terminalWidth(leading) + 2)),
  );
  const continuationWidth = terminalWidth(continuation);
  const lines = [];
  let line = leading;
  let pendingWhitespace = "";

  for (const unit of body.split(/(\s+)/u)) {
    if (!unit) continue;
    if (/^\s+$/u.test(unit)) {
      pendingWhitespace += unit;
      continue;
    }
    const candidate = `${line}${pendingWhitespace}${unit}`;
    if (terminalWidth(candidate) <= width) {
      line = candidate;
      pendingWhitespace = "";
      continue;
    }
    if (line.trim()) lines.push(line.trimEnd());
    pendingWhitespace = "";
    const chunks = splitTerminalChunk(
      unit,
      Math.max(1, width - continuationWidth),
    );
    for (const chunk of chunks.slice(0, -1)) {
      lines.push(`${continuation}${chunk}`);
    }
    line = `${continuation}${chunks.at(-1) ?? ""}`;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

function renderReportFrame(lines, columns = process.stdout.columns) {
  const width = reportColumns(columns);
  return lines
    .flatMap((line) => wrapTerminalLine(line, width))
    .join("\n");
}

function renderComparison(comparison) {
  return `  ${comparison.icon}  ${padTerminal(comparison.label, 18)} ${comparison.value}`;
}

function resourceBreakdownLines(
  totals,
  title,
  lang = "zh",
  period = "today",
) {
  const resources = estimateResources(totals);
  const comparisons = everydayComparisons(resources, period, lang);
  const lines = [
    `  ${color("33", `${title} · ${localized(lang, "公开高位参照", "named public high-side reference")}`)}`,
    `  ⚡  ${formatResource(resources.energyWh, "Wh")} · ${referenceLabel(resources.energyWh, lang)}`,
    `  💧  ${formatResource(resources.waterMl, "mL")} · ${referenceLabel(resources.waterMl, lang)}`,
    `  ☁️  ${formatResource(resources.carbonGrams, "gCO₂e")} · ${referenceLabel(resources.carbonGrams, lang)}`,
    "",
    `  ${color("33", localized(lang, "生活翻译（终于像人话了）", "Everyday translation"))}`,
    ...comparisons.map(renderComparison),
  ];
  return lines;
}

function sourceLabel(source) {
  return (
    {
      codex: "Codex",
      claude: "Claude Code",
      opencode: "OpenCode",
      openclaw: "OpenClaw",
      hermes: "Hermes",
      pi: "Pi",
    }[source] ?? source
  );
}

function sourceBreakdownLines(sources) {
  const entries = Object.entries(sources).filter(
    ([, usage]) => usage.totalTokens > 0,
  );
  const width = Math.max(
    0,
    ...entries.map(([source]) => terminalWidth(sourceLabel(source))),
  );
  return entries.map(
    ([source, usage]) =>
      `  ${padTerminal(sourceLabel(source), width)} ${formatTokens(usage.totalTokens)}`,
  );
}

function sourceWarningLines(reports, lang = "zh") {
  const failures = new Map();
  for (const report of reports) {
    for (const warning of report.warnings ?? []) {
      failures.set(warning.source, warning.code);
    }
  }
  if (failures.size === 0) return [];
  const lines = [
    color(
      "33",
      localized(
        lang,
        `  ⚠ 未计入：${[...failures]
          .map(([source, code]) => `${source} (${code})`)
          .join(" · ")}`,
        `  ⚠ Not counted: ${[...failures]
          .map(([source, code]) => `${source} (${code})`)
          .join(" · ")}`,
      ),
    ),
  ];
  return lines;
}

function displayModelName(model) {
  const sanitized = String(model).replace(/[\p{Cc}\p{Cf}]/gu, "�");
  const characters = Array.from(sanitized);
  return characters.length > 48
    ? `${characters.slice(0, 47).join("")}…`
    : sanitized;
}

function modelBreakdownLines(report, limit = 5, lang = "zh") {
  const entries = Object.entries(report.models ?? {})
    .flatMap(([source, models]) =>
      Object.entries(models).map(([model, usage]) => ({
        source,
        model,
        usage,
      })),
    )
    .filter((entry) => entry.usage.requests > 0)
    .sort((left, right) => right.usage.totalTokens - left.usage.totalTokens)
    .slice(0, limit);

  if (entries.length === 0) return [];
  return [
    `  ${color("33", localized(lang, "模型账单", "Model bill"))}`,
    ...entries.map((entry) => {
      const label = `${sourceLabel(entry.source)} · ${displayModelName(entry.model)}`;
      return `  ${padTerminal(label, 32)} ${formatTokens(entry.usage.totalTokens)} tokens · ${entry.usage.requests} ${localized(lang, "次", entry.usage.requests === 1 ? "request" : "requests")}`;
    }),
  ];
}

function combinedModelBreakdownLines(reports, limit = 5, lang = "zh") {
  const models = {};
  for (const report of reports) {
    for (const [source, sourceModels] of Object.entries(report.models ?? {})) {
      models[source] ??= {};
      for (const [model, usage] of Object.entries(sourceModels)) {
        addModelUsage(models[source], model, usage);
      }
    }
  }
  return modelBreakdownLines({ models }, limit, lang);
}

function formatTokens(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function color(code, value) {
  if (process.env.NO_COLOR) return value;
  if (!process.stdout.isTTY && !process.env.FORCE_COLOR) return value;
  return `\u001B[${code}m${value}\u001B[0m`;
}

function averageTotals(reports) {
  const totals = emptyUsage();
  for (const report of reports) addUsage(totals, report.totals);
  for (const key of Object.keys(totals)) totals[key] /= reports.length;
  return totals;
}

function embeddedSectionLines(section) {
  return section ? section.trimEnd().split("\n") : [];
}

function renderReceipt(
  report,
  historicalReports = [],
  lang = "zh",
  mutationSection = "",
) {
  const { date, sources, totals } = report;
  const baseline =
    historicalReports.length > 0 ? averageTotals(historicalReports) : undefined;
  const verdict = baseline
    ? dailyVerdict(totals, baseline, date, lang)
    : undefined;
  const modelLines = modelBreakdownLines(report, 5, lang);
  const sourceLines = sourceBreakdownLines(sources);
  const warningLines = sourceWarningLines([report], lang);
  const uncachedInputTokens = Math.max(
    0,
    totals.inputTokens -
      totals.cachedInputTokens -
      totals.cacheWriteInputTokens,
  );
  const lines = [
    color("2", reportBorder("top", reportColumns())),
    `  ${color("1;31", `YOUR AI RECEIPT · ${date}`)}`,
    color("2", reportBorder("middle", reportColumns())),
    "",
    `  ${color("1", `${formatTokens(totals.totalTokens)} tokens`)} · ${totals.requests} ${localized(lang, "次模型请求", totals.requests === 1 ? "model request" : "model requests")}`,
    "",
    ...sourceLines,
    ...(warningLines.length > 0 ? ["", ...warningLines] : []),
    ...(modelLines.length > 0 ? ["", ...modelLines] : []),
    "",
    `  ${localized(lang, "新鲜输入   ", "Fresh input  ")} ${formatTokens(uncachedInputTokens)}`,
    `  ${localized(lang, "缓存读取   ", "Cache read   ")} ${formatTokens(totals.cachedInputTokens)}`,
    `  ${localized(lang, "缓存写入   ", "Cache write  ")} ${formatTokens(totals.cacheWriteInputTokens)}`,
    `  ${localized(lang, "模型输出   ", "Model output ")} ${formatTokens(totals.outputTokens)}`,
    "",
    ...resourceBreakdownLines(
      totals,
      localized(
        lang,
        "资源消耗估算（参考公开数据）",
        "Estimated resource use (from public data)",
      ),
      lang,
    ),
    ...(baseline
      ? [
          "",
          `  ${color("33", localized(lang, "个人基线（过去 7 个自然日）", "Personal baseline (prior 7 calendar days)"))}`,
          `  Token     ${formatChange(totals.totalTokens, baseline.totalTokens, lang)}`,
          `  ${localized(lang, "请求      ", "Requests  ")} ${formatChange(totals.requests, baseline.requests, lang)}`,
          "",
          `  ${color("1;31", localized(lang, `今日罪名：${verdict.title}`, `Today's charge: ${verdict.title}`))}`,
          `  ${verdict.detail}`,
        ]
      : []),
    ...(mutationSection
      ? ["", ...embeddedSectionLines(mutationSection)]
      : []),
    "",
    `  ${localized(lang, "运行 anti-ai explain resources 查看参照边界", "Run anti-ai explain resources for reference boundaries")}`,
    "",
    `  ${color("2", periodFooter("today", date, lang))}`,
    color("2", reportBorder("bottom", reportColumns())),
    "",
  ];
  return renderReportFrame(lines);
}

function renderWeek(dailyReports, lang = "zh", mutationSection = "") {
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
  const modelLines = combinedModelBreakdownLines(dailyReports, 5, lang);
  const warningLines = sourceWarningLines(dailyReports, lang);

  const lines = [
    color("2", reportBorder("top", reportColumns())),
    `  ${color("1;31", `YOUR AI HANGOVER · ${firstDate} → ${lastDate}`)}`,
    color("2", reportBorder("middle", reportColumns())),
    "",
    ...rows,
    "",
    `  ${color("1", localized(lang, `7 日合计  ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} 次模型请求`, `7-day total  ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} ${totals.requests === 1 ? "model request" : "model requests"}`))}`,
    ...(modelLines.length > 0 ? ["", ...modelLines] : []),
    ...(warningLines.length > 0 ? ["", ...warningLines] : []),
    "",
    ...resourceBreakdownLines(
      totals,
      localized(lang, "7 日资源账单", "7-day resource bill"),
      lang,
      "week",
    ),
    ...(mutationSection
      ? ["", ...embeddedSectionLines(mutationSection)]
      : []),
    "",
    `  ${color("2", periodFooter("week", lastDate, lang))}`,
    color("2", reportBorder("bottom", reportColumns())),
    "",
  ];
  return renderReportFrame(lines);
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

function renderMonth(dailyReports, lang = "zh", mutationSection = "") {
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
  const cellWidth = 5;
  const cells = Array(firstWeekday).fill("");
  for (const report of dailyReports) {
    const day = report.date.slice(8);
    cells.push(`${day}${heatLevel(report.totals.totalTokens, maxTokens)}`);
  }
  while (cells.length % 7 !== 0) cells.push("");

  const rows = [];
  for (let index = 0; index < cells.length; index += 7) {
    rows.push(
      `  ${cells
        .slice(index, index + 7)
        .map((cell) => padTerminal(cell, cellWidth))
        .join("")}`.trimEnd(),
    );
  }
  const weekdayLabels =
    lang === "en"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["一", "二", "三", "四", "五", "六", "日"];
  const weekdayHeader = `  ${weekdayLabels
    .map((label) => padTerminal(label, cellWidth))
    .join("")}`.trimEnd();

  const quietDays = dailyReports.filter(
    (report) => report.totals.totalTokens === 0,
  ).length;
  const peak = dailyReports.reduce((currentPeak, report) =>
    report.totals.totalTokens > currentPeak.totals.totalTokens
      ? report
      : currentPeak,
  );
  const modelLines = combinedModelBreakdownLines(dailyReports, 5, lang);
  const warningLines = sourceWarningLines(dailyReports, lang);

  const lines = [
    color("2", reportBorder("top", reportColumns())),
    `  ${color("1;31", `YOUR AI CALENDAR · ${firstDate} → ${lastDate}`)}`,
    color("2", reportBorder("middle", reportColumns())),
    "",
    weekdayHeader,
    ...rows,
    "",
    localized(
      lang,
      "  · 无记录  ░ 少  ▒ 中  ▓ 多  █ 最重",
      "  · none  ░ low  ▒ medium  ▓ high  █ peak",
    ),
    "",
    `  ${color("1", localized(lang, `月度合计    ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} 次模型请求`, `Monthly total  ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} ${totals.requests === 1 ? "model request" : "model requests"}`))}`,
    localized(
      lang,
      `  AI 清醒日  ${quietDays} 天 / ${dailyReports.length} 天`,
      `  AI-free days  ${quietDays} ${quietDays === 1 ? "day" : "days"} / ${dailyReports.length} ${dailyReports.length === 1 ? "day" : "days"}`,
    ),
    localized(
      lang,
      `  最长清醒期 ${longestQuietStreak(dailyReports)} 天`,
      `  Longest break ${longestQuietStreak(dailyReports)} ${longestQuietStreak(dailyReports) === 1 ? "day" : "days"}`,
    ),
    localized(
      lang,
      `  最重一天    ${peak.date.slice(5)} · ${formatTokens(peak.totals.totalTokens)} tokens`,
      `  Peak day      ${peak.date.slice(5)} · ${formatTokens(peak.totals.totalTokens)} tokens`,
    ),
    ...(modelLines.length > 0 ? ["", ...modelLines] : []),
    ...(warningLines.length > 0 ? ["", ...warningLines] : []),
    "",
    ...resourceBreakdownLines(
      totals,
      localized(lang, "本月资源账单", "Monthly resource bill"),
      lang,
      "month",
    ),
    ...(mutationSection
      ? ["", ...embeddedSectionLines(mutationSection)]
      : []),
    "",
    `  ${color("2", periodFooter("month", lastDate, lang))}`,
    color("2", reportBorder("bottom", reportColumns())),
    "",
  ];
  return renderReportFrame(lines);
}

export {
  averageTotals,
  dailyVerdict,
  formatChange,
  rotatingCopy,
  addModelUsage,
  addUsage,
  color,
  formatTokens,
  inclusiveDateRange,
  isValidDate,
  padTerminal,
  renderMonth,
  renderReceipt,
  renderWeek,
  shiftDate,
  terminalWidth,
};
