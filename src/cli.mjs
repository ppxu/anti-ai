import { createRequire } from "node:module";

import { companionPeriodSummary } from "./companion.mjs";
import { creatureCodex, loadCreatureState } from "./creature.mjs";
import { deriveClinicReport } from "./clinic.mjs";
import { deriveClinicStudyHistory } from "./clinic-studies.mjs";
import { creatureArt } from "./renderers/creature-art.mjs";
import { creatureCasebook } from "./application/creature-casebook.mjs";
import { deriveHabitat } from "./habitat.mjs";
import { renderCommandHelp, renderTopLevelHelp } from "./help.mjs";
import {
  color,
  isValidDate,
  renderMonth,
  renderReceipt,
  renderWeek,
  shiftDate,
} from "./reporting.mjs";
import {
  COMMAND_IDS,
  FULL_SOURCE_COMMAND_IDS,
  FULL_SOURCE_SHARE_CARD_IDS,
  SHARE_CARD_IDS,
  SOURCE_IDS,
  TUI_AREA_IDS,
} from "./registry.mjs";
import {
  inspectLocalSources,
  localDate,
  reportsForDates,
  SourceScanError,
} from "./scanner.mjs";
import { localized } from "./shared.mjs";
import { StateConflictError } from "./state-store.mjs";
import { parseArgs } from "./cli/args.mjs";
import { runExplain } from "./cli/explain.mjs";
import {
  renderCodex,
  renderCompanionPeriod,
  renderCreatureAutopsy,
  renderCreatureCasebook,
  renderCreatureTodaySummary,
  renderHabitatPeriod,
} from "./cli/render.mjs";
import { runCreature } from "./commands/creature.mjs";
import { runEncounter } from "./commands/encounter.mjs";
import { runLaboratory } from "./commands/laboratory.mjs";
import { runExpedition } from "./commands/expedition.mjs";
import { runShare } from "./commands/share.mjs";
import { runTui } from "./commands/tui.mjs";
import { runClinic } from "./commands/clinic.mjs";
import { runDesktop } from "./commands/desktop.mjs";
import { renderClinicPeriod } from "./renderers/clinic.mjs";

const require = createRequire(import.meta.url);
const { version: VERSION } = require("../package.json");
async function runToday(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentDate = localDate(new Date(), timezone);
  const date = options.date ?? currentDate;

  if (options.json) {
    const [report] = await reportsForDates(options, [date], timezone);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    const dates = Array.from({ length: 31 }, (_, index) =>
      shiftDate(date, index - 30),
    );
    const reports = await reportsForDates(options, dates, timezone);
    const creatureContext =
      options.source === "all"
        ? await runCreature(
            {
              ...options,
              action: undefined,
              command: "creature",
              json: false,
            },
            "context",
          )
        : null;
    const creature = creatureContext?.result ?? null;
    const codex = creatureContext
      ? creatureCodex(creatureContext.state, creature.date)
      : null;
    const state = creatureContext?.state ?? await loadCreatureState();
    const studyHistory = deriveClinicStudyHistory(state, date);
    const clinic = deriveClinicReport(reports, date, {
      currentDate,
      study: studyHistory.active ?? studyHistory.records[0] ?? null,
    });
    const mutation = creature
      ? `${renderClinicPeriod(clinic, options.lang, "today")}${renderCreatureTodaySummary(creature, codex, options.lang)}${renderHabitatPeriod(
          deriveHabitat(
            creatureContext.state,
            creature,
            creature.date,
            creatureArt(creature),
          ),
          date,
          date,
          options.lang,
          "today",
        )}`
      : renderClinicPeriod(clinic, options.lang, "today");
    process.stdout.write(
      renderReceipt(
        reports.at(-1),
        reports.slice(-8, -1),
        options.lang,
        mutation,
      ),
    );
  }
}

async function runWeek(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentDate = localDate(new Date(), timezone);
  const endDate = options.date ?? currentDate;
  const scanDates = Array.from({ length: 31 }, (_, index) =>
    shiftDate(endDate, index - 30),
  );
  const scannedReports = await reportsForDates(options, scanDates, timezone);
  const reports = scannedReports.slice(-7);
  const dates = reports.map(({ date }) => date);
  const creatureContext =
    options.source === "all"
      ? await runCreature(
          {
            ...options,
            action: undefined,
            command: "creature",
            json: false,
          },
          "context",
        )
      : null;
  const casebook = creatureContext
    ? creatureCasebook(creatureContext.state, dates[0], endDate)
    : null;
  const companionPeriod = creatureContext
    ? companionPeriodSummary(creatureContext.state, dates[0], endDate)
    : null;
  const habitat = creatureContext
    ? deriveHabitat(
        creatureContext.state,
        creatureContext.result,
        endDate,
        creatureArt(creatureContext.result),
      )
    : null;
  const state = creatureContext?.state ?? await loadCreatureState();
  const studyHistory = deriveClinicStudyHistory(state, endDate);
  const clinic = deriveClinicReport(scannedReports, endDate, {
    currentDate,
    study: studyHistory.active ?? studyHistory.records[0] ?? null,
  });
  process.stdout.write(
    renderWeek(
      reports,
      options.lang,
      `${renderClinicPeriod(clinic, options.lang, "week")}${casebook ? renderCreatureCasebook(casebook, options.lang) : ""}${renderCompanionPeriod(companionPeriod, options.lang)}${renderHabitatPeriod(habitat, dates[0], endDate, options.lang, "week")}`,
    ),
  );
}

async function runMonth(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentDate = localDate(new Date(), timezone);
  const endDate = options.date ?? currentDate;
  const dayCount = Number(endDate.slice(8));
  const dates = Array.from({ length: dayCount }, (_, index) =>
    `${endDate.slice(0, 8)}${String(index + 1).padStart(2, "0")}`,
  );
  const scanDates = Array.from({ length: 31 }, (_, index) =>
    shiftDate(endDate, index - 30),
  );
  const scannedReports = await reportsForDates(options, scanDates, timezone);
  const reportsByDate = new Map(
    scannedReports.map((report) => [report.date, report]),
  );
  const reports = dates.map((date) => reportsByDate.get(date));
  const creatureContext =
    options.source === "all"
      ? await runCreature(
          {
            ...options,
            action: undefined,
            command: "creature",
            json: false,
          },
          "context",
        )
      : null;
  const autopsy = creatureContext
    ? creatureCasebook(creatureContext.state, dates[0], endDate)
    : null;
  const companionPeriod = creatureContext
    ? companionPeriodSummary(creatureContext.state, dates[0], endDate)
    : null;
  const habitat = creatureContext
    ? deriveHabitat(
        creatureContext.state,
        creatureContext.result,
        endDate,
        creatureArt(creatureContext.result),
      )
    : null;
  const state = creatureContext?.state ?? await loadCreatureState();
  const studyHistory = deriveClinicStudyHistory(state, endDate);
  const completedThisMonth = studyHistory.records.find(
    (study) =>
      study.status === "completed" &&
      study.endsAt >= dates[0] &&
      study.endsAt <= endDate,
  );
  const clinic = deriveClinicReport(scannedReports, endDate, {
    currentDate,
    study:
      completedThisMonth ??
      studyHistory.active ??
      studyHistory.records[0] ??
      null,
  });
  process.stdout.write(
    renderMonth(
      reports,
      options.lang,
      `${renderClinicPeriod(clinic, options.lang, "month")}${autopsy ? renderCreatureAutopsy(autopsy, options.lang) : ""}${renderCompanionPeriod(companionPeriod, options.lang)}${renderHabitatPeriod(habitat, dates[0], endDate, options.lang, "month")}`,
    ),
  );
}

async function runCodex(options) {
  const creatureContext = await runCreature(
    {
      ...options,
      action: undefined,
      command: "creature",
      json: false,
    },
    "snapshot-context",
  );
  if (!creatureContext) return;
  const codex = creatureCodex(
    creatureContext.state,
    creatureContext.result.date,
  );
  const focusedCollectionSet = options.set
    ? codex.collectionSets.find(({ id }) => id === options.set)
    : null;
  if (options.set && !focusedCollectionSet) {
    process.stderr.write(
      `${localized(options.lang, `未知病理套组：${options.set}`, `Unknown pathology set: ${options.set}`)}\n`,
    );
    process.exitCode = 2;
    return;
  }
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify({
        ...codex,
        ...(focusedCollectionSet ? { focusedCollectionSet } : {}),
      }, null, 2)}\n`,
    );
  } else {
    process.stdout.write(renderCodex(codex, options.lang, options.set));
  }
}

async function runDoctor(options) {
  const { lang } = options;
  const checks = await inspectLocalSources(options.source);

  const lines = [
    color("1;31", "LOCAL LOG CHECK"),
    "",
    ...checks.flatMap((check) => {
      const sqliteStatus = {
        driver: localized(
          lang,
          "SQLite 驱动不可用",
          "SQLite driver unavailable",
        ),
        unreadable: localized(
          lang,
          "SQLite 无法读取",
          "SQLite unreadable",
        ),
        missing: localized(lang, "未找到 SQLite", "SQLite not found"),
      };
      const status =
        check.kind === "sqlite"
          ? check.available
            ? localized(lang, "SQLite 可读", "SQLite readable")
            : sqliteStatus[check.issue]
          : `${check.count} ${localized(lang, "个 JSONL 文件", check.count === 1 ? "JSONL file" : "JSONL files")}`;
      return [
        `${check.label.padEnd(12)} ${check.available ? "✓" : "✗"}  ${status} · ${check.precision[lang]}`,
        color("2", `             ${check.root}`),
      ];
    }),
    "",
    localized(
      lang,
      "只保留时间、消息 ID、模型和 usage 元数据。",
      "Keeps only timestamps, message IDs, models, and usage metadata.",
    ),
    localized(
      lang,
      "不采集、不保存、不输出会话正文。",
      "Does not collect, store, or print conversation text.",
    ),
    "",
  ];
  process.stdout.write(lines.join("\n"));
  if (
    options.source !== "all" &&
    checks.some((check) => !check.available)
  ) {
    process.exitCode = 1;
  }
}

function runHelp(target, lang = "zh") {
  const output =
    target.length === 0
      ? renderTopLevelHelp(lang)
      : renderCommandHelp(target, lang);
  if (output === null) {
    process.stderr.write(
      `${localized(lang, `未知命令：${target.join(" ")}`, `Unknown command: ${target.join(" ")}`)}\n`,
    );
    process.exitCode = 2;
    return;
  }
  process.stdout.write(output);
}

const COMMAND_HANDLERS = {
  today: runToday,
  week: runWeek,
  month: runMonth,
  codex: runCodex,
  tui: runTui,
  desktop: runDesktop,
  share: runShare,
  creature: runCreature,
  encounter: runEncounter,
  lab: runLaboratory,
  expedition: runExpedition,
  doctor: runDoctor,
  clinic: runClinic,
  explain: (options) => runExplain(options.lang, options.topic),
};

async function main(rawArgs = process.argv.slice(2)) {
  try {
    const options = parseArgs(rawArgs);
    if (rawArgs.length === 0) {
      if (process.stdin.isTTY && process.stdout.isTTY) {
        await runTui(options);
      } else {
        runHelp([], options.lang);
      }
      return;
    }
    const helpAlias = options.command === "help";
    const helpTarget = helpAlias
      ? rawArgs
          .slice(1)
          .filter(
            (arg, index, args) =>
              !["--help", "-h", "--lang"].includes(arg) &&
              args[index - 1] !== "--lang",
          )
      : options.command && !options.command.startsWith("-")
        ? [
            options.command,
            ...(["creature", "lab", "expedition", "clinic", "encounter", "desktop"].includes(options.command) && options.action
              ? [options.action]
              : []),
          ]
        : [];
    const helpRequested =
      helpAlias ||
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
      runHelp(helpTarget, options.lang);
    } else if (versionRequested) {
      process.stdout.write(`anti-ai ${VERSION}\n`);
    } else if (options.missing) {
      process.stderr.write(
        `${localized(options.lang, `参数 ${options.missing} 缺少值`, `Option ${options.missing} requires a value`)}\n`,
      );
      process.exitCode = 2;
    } else if (options.unknown.length > 0) {
      process.stderr.write(
        `${localized(options.lang, `未知参数：${options.unknown[0]}`, `Unknown option: ${options.unknown[0]}`)}\n`,
      );
      process.exitCode = 2;
    } else if (!["zh", "en"].includes(options.lang)) {
      process.stderr.write(`不支持的语言：${options.lang}\n`);
      process.exitCode = 2;
    } else if (!["all", ...SOURCE_IDS].includes(options.source)) {
      process.stderr.write(
        `${localized(options.lang, `不支持的数据源：${options.source}`, `Unsupported data source: ${options.source}`)}\n`,
      );
      process.exitCode = 2;
    } else if (
      options.command === "tui" &&
      !TUI_AREA_IDS.includes(options.area)
    ) {
      process.stderr.write(
        `${localized(options.lang, `不支持的 TUI 区域：${options.area}`, `Unsupported TUI area: ${options.area}`)}\n`,
      );
      process.exitCode = 2;
    } else if (
      options.card !== undefined &&
      (options.command !== "share" ||
        !SHARE_CARD_IDS.includes(options.card))
    ) {
      process.stderr.write(
        `${localized(options.lang, `不支持的分享卡：${options.card}`, `Unsupported share card: ${options.card}`)}\n`,
      );
      process.exitCode = 2;
    } else if (
      options.command === "share" &&
      options.card === "encounter" &&
      !options.with
    ) {
      process.stderr.write(
        `${localized(options.lang, "遭遇分享卡需要 --with <污染编码>。", "Encounter cards require --with <pollution-code>.")}\n`,
      );
      process.exitCode = 2;
    } else if (
      options.command === "share" &&
      FULL_SOURCE_SHARE_CARD_IDS.includes(options.card) &&
      options.source !== "all"
    ) {
      process.stderr.write(
        `${localized(options.lang, "异变体收藏卡必须使用完整数据源；请移除 --source 过滤。", "Mutation collection cards require the complete data set; remove the --source filter.")}\n`,
      );
      process.exitCode = 2;
    } else if (options.command === "tui" && options.json) {
      process.stderr.write(
        `${localized(
          options.lang,
          "tui 不支持 --json；自动化和 Agent 请使用 anti-ai today --json 或 anti-ai codex --json。",
          "tui does not support --json; automation and Agents should use anti-ai today --json or anti-ai codex --json.",
        )}\n`,
      );
      process.exitCode = 2;
    } else if (
      FULL_SOURCE_COMMAND_IDS.includes(options.command) &&
      options.source !== "all"
    ) {
      process.stderr.write(
        `${localized(
          options.lang,
          `${options.command} 必须使用完整数据源；请移除 --source 过滤。`,
          `${options.command} requires the complete data set; remove the --source filter.`,
        )}\n`,
      );
      process.exitCode = 2;
    } else if (rawArgs.includes("--date") && !isValidDate(options.date)) {
      process.stderr.write(
        `${localized(options.lang, `无效日期：${options.date}`, `Invalid date: ${options.date}`)}\n`,
      );
      process.exitCode = 2;
    } else if (Object.hasOwn(COMMAND_HANDLERS, options.command)) {
      await COMMAND_HANDLERS[options.command](options);
    } else {
      process.stderr.write(
        `Usage: anti-ai <${COMMAND_IDS.filter((id) => id !== "help").join("|")}> [--date YYYY-MM-DD] [--source all|${SOURCE_IDS.join("|")}] [--lang zh|en] [--json]\n`,
      );
      process.exitCode = 1;
    }
  } catch (error) {
    const langIndex = rawArgs.indexOf("--lang");
    const lang = langIndex >= 0 ? rawArgs[langIndex + 1] : "zh";
    if (error instanceof SourceScanError) {
      process.stderr.write(
        `${localized(
          lang,
          `无法读取 ${error.source} 本地记录（${error.sourceCode}）。请运行 anti-ai doctor --source ${error.source}。`,
          `Unable to read local ${error.source} records (${error.sourceCode}). Run anti-ai doctor --source ${error.source}.`,
        )}\n`,
      );
      process.exitCode = 1;
      return;
    }
    if (!(error instanceof StateConflictError)) throw error;
    process.stderr.write(
      `${localized(
        lang,
        "异变体档案刚被另一个进程更新。为避免覆盖成长记录，本次写入已取消；请重试命令。",
        "Another process updated the mutation file. This write was cancelled to avoid losing growth; retry the command.",
      )}\n`,
    );
    process.exitCode = 1;
  }
}

export { main, parseArgs };
