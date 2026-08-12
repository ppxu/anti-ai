import { deriveClinicReport } from "../clinic.mjs";
import {
  clinicProtocol,
  deriveClinicStudyHistory,
} from "../clinic-studies.mjs";
import { inclusiveDateRange, shiftDate } from "../core/date.mjs";
import { loadCreatureState } from "../creature.mjs";
import { executeClinicStudyStart } from "../application/clinic.mjs";
import { renderClinic, STUDY_RESULTS } from "../renderers/clinic.mjs";
import { localDate, reportsForDates } from "../scanner.mjs";
import { localized } from "../shared.mjs";

function studyError(reason, options) {
  const messages = {
    invalid_protocol: [
      `未知研究协议：${options.choice ?? ""}`,
      `Unknown study protocol: ${options.choice ?? ""}`,
    ],
    study_active: [
      "已有研究正在进行；自然结束后才能启动下一项。",
      "A study is already active; start another after it ends naturally.",
    ],
  };
  return localized(
    options.lang,
    ...(messages[reason] ?? [
      "研究协议当前不可用。",
      "The study protocol is currently unavailable.",
    ]),
  );
}

function renderStudyHistory(history, lang) {
  const statusLabel = {
    active: localized(lang, "进行中", "ACTIVE"),
    completed: localized(lang, "已完成", "COMPLETED"),
    upcoming: localized(lang, "未开始", "UPCOMING"),
  };
  return [
    localized(lang, "TOKEN 代谢研究档案", "TOKEN METABOLIC STUDY FILE"),
    "",
    ...(history.records.length === 0
      ? [localized(lang, "  尚无研究记录。", "  NO STUDIES SEALED.")]
      : history.records.map((record) => {
          const protocol = clinicProtocol(record.protocolId);
          const protocolLabel = localized(lang, ...protocol.labels);
          const resultLabel = record.resultId
            ? localized(lang, ...STUDY_RESULTS[record.resultId])
            : null;
          return localized(
            lang,
            `  ${record.startedAt}  ${protocolLabel} · ${statusLabel[record.status]} · ${record.progress.elapsedDays} / ${record.durationDays} 天 · 样本 ${record.progress.observableDays}${resultLabel ? ` · ${resultLabel}` : ""}`,
            `  ${record.startedAt}  ${protocolLabel} · ${statusLabel[record.status]} · ${record.progress.elapsedDays} / ${record.durationDays} days · samples ${record.progress.observableDays}${resultLabel ? ` · ${resultLabel}` : ""}`,
          );
        })),
    "",
  ].join("\n");
}

async function runClinic(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentDate = localDate(new Date(), timezone);
  const date = options.date ?? currentDate;
  if (options.action === "start") {
    const execution = await executeClinicStudyStart({
      date,
      protocol: options.choice,
    });
    if (execution.status !== "completed") {
      process.stderr.write(`${studyError(execution.reason, options)}\n`);
      process.exitCode = 2;
      return;
    }
    process.stdout.write(
      options.json
        ? `${JSON.stringify(execution.result, null, 2)}\n`
        : renderStudyHistory(execution.result, options.lang),
    );
    return;
  }
  const state = await loadCreatureState();
  const studyHistory = deriveClinicStudyHistory(state, date);
  if (options.action === "history") {
    process.stdout.write(
      options.json
        ? `${JSON.stringify(studyHistory, null, 2)}\n`
        : renderStudyHistory(studyHistory, options.lang),
    );
    return;
  }
  const dates = inclusiveDateRange(shiftDate(date, -30), date);
  const reports = await reportsForDates(options, dates, timezone);
  const clinic = deriveClinicReport(reports, date, {
    currentDate,
    study: studyHistory.active ?? studyHistory.records[0] ?? null,
  });
  process.stdout.write(
    options.json
      ? `${JSON.stringify(clinic, null, 2)}\n`
      : renderClinic(clinic, options.lang),
  );
}

export { runClinic };
