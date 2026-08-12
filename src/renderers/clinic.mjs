import { color } from "../reporting.mjs";
import { localized } from "../shared.mjs";
import { clinicProtocol } from "../clinic-studies.mjs";

const DIAGNOSIS_CONTENT = Object.freeze({
  burst_overload: {
    label: ["算力暴食症", "COMPUTE BINGE"],
    copy: [
      ["今日摄入突然突破历史胃容量，散热片已申请工伤。", "Today's intake exceeded its historical stomach capacity. The heatsink filed an incident report."],
      ["Token 曲线突然站起来了，并声称这不是冲动消费。", "The Token curve stood upright and denied this was an impulse purchase."],
      ["今天的上下文被端上了自助餐台，模型没有拒绝续盘。", "Context reached the buffet. The model did not decline another plate."],
    ],
  },
  cache_imbalance: {
    label: ["缓存胃酸倒流", "CACHE REFLUX"],
    copy: [
      ["缓存写入很勤快，命中率却像请假了。", "Cache writes worked overtime while reuse called in sick."],
      ["大量上下文被冷藏，几乎没有一份被重新端上桌。", "Plenty of context was refrigerated; very little returned to the table."],
      ["缓存正在囤货，不确定是否知道自己是用来复用的。", "The cache is stockpiling and may have forgotten it was built for reuse."],
    ],
  },
  context_bloat: {
    label: ["上下文脂肪肝", "CONTEXT BLOAT"],
    copy: [
      ["单次请求的新鲜上下文显著增厚，窗口开始需要弹力腰带。", "Fresh context per request expanded enough to require an elastic waistband."],
      ["每次开口都带着更多历史，像一个拒绝删聊天记录的模型。", "Every request carries more history, like a model that refuses to delete old chats."],
      ["上下文没有丢失，它只是把所有东西都带来了。", "Nothing was lost from context. It simply brought everything."],
    ],
  },
  request_fragmentation: {
    label: ["请求电子生鱼片", "REQUEST SASHIMI"],
    copy: [
      ["同样的 Token 被切成更多小份，回车键获得了计件工资。", "The same Tokens were sliced into smaller servings. Enter is now paid per piece."],
      ["请求数量翻倍，单份内容缩水，流水线对此表示满意。", "Requests multiplied while each serving shrank. The assembly line approves."],
      ["工作没有变多，只是被切成了更多需要握手的碎片。", "The work did not grow; it was divided into more fragments requiring handshakes."],
    ],
  },
  model_migration: {
    label: ["模型候鸟症", "MODEL MIGRATION"],
    copy: [
      ["主导模型完成迁徙，未留下转组申请。", "The dominant model migrated without filing a transfer request."],
      ["算力栖息地换了主人，账单仍留在原地。", "The compute habitat changed occupants. The receipt stayed behind."],
      ["主导模型已经换班，终端只收到了一张无名交接单。", "The dominant model changed shifts, leaving the terminal an anonymous handoff note."],
    ],
  },
  restrained_recovery: {
    label: ["克制性缓解", "RESTRAINED RECOVERY"],
    copy: [
      ["摄入下降没有让标本饿死，只让散热片重新听见了自己。", "Lower intake did not starve the specimen; it let the heatsink hear itself again."],
      ["今天少烧了一些 Token，异变体改吃安静。", "Fewer Tokens burned today. The creature fed on silence instead."],
      ["负载退潮，留下几块仍然温热的提示词礁石。", "The load receded, leaving a few warm prompt reefs behind."],
    ],
  },
  stable_metabolism: {
    label: ["代谢暂稳", "METABOLISM STABLE"],
    copy: [
      ["没有显著异变。门诊被迫承认今天只是普通地使用了 AI。", "No material mutation. The clinic reluctantly admits this was ordinary AI use."],
      ["曲线暂时规整，病历室找不到值得加粗的器官。", "The curve is temporarily orderly; pathology found nothing worth bolding."],
      ["代谢维持原样，连讽刺都缺少新的化验单。", "Metabolism held steady. Even the satire lacks a new lab result."],
    ],
  },
  insufficient_evidence: {
    label: ["标本不足", "SPECIMEN INSUFFICIENT"],
    copy: [
      ["样本太少，门诊拒绝靠想象开药。", "Too few samples. The clinic refuses to prescribe from imagination."],
      ["化验单还没攒够三天，诊断室暂时只供应白开水。", "The lab has fewer than three baseline days. The clinic is serving water."],
      ["证据不足不是一种病，尽管很多仪表盘坚持这样写。", "Insufficient evidence is not a disease, despite what many dashboards imply."],
    ],
  },
});

function contentFor(report, lang) {
  const content = DIAGNOSIS_CONTENT[report.diagnosis.id];
  const key = `${report.date}:${report.diagnosis.id}`;
  const index = Array.from(key).reduce(
    (sum, character) => sum + character.codePointAt(0),
    0,
  ) % content.copy.length;
  return {
    label: localized(lang, ...content.label),
    copy: localized(lang, ...content.copy[index]),
  };
}

function list(values, fallback) {
  return values.length > 0 ? values.join(" · ") : fallback;
}

const FIELD_LABELS = Object.freeze({
  inputTokens: ["输入", "input"],
  cachedInputTokens: ["缓存读", "cache read"],
  cacheWriteInputTokens: ["缓存写", "cache write"],
  requests: ["请求", "requests"],
  totalTokens: ["总量", "total"],
  "models.totalTokens": ["模型分布", "model mix"],
});

function fieldLabels(fields, lang) {
  return fields.map((field) =>
    FIELD_LABELS[field] ? localized(lang, ...FIELD_LABELS[field]) : field,
  );
}

function characterLength(value) {
  return [...value].length;
}

function wrappedList(label, values, fallback, maxWidth = 80) {
  const items = values.length > 0 ? values : [fallback];
  const prefix = `  ${label}  `;
  const continuation = "    ";
  const lines = [];
  let line = prefix;
  for (const item of items) {
    const separator = line === prefix ? "" : " · ";
    if (
      line !== prefix &&
      characterLength(`${line}${separator}${item}`) > maxWidth
    ) {
      lines.push(line);
      line = `${continuation}${item}`;
    } else {
      line += `${separator}${item}`;
    }
  }
  lines.push(line);
  return lines;
}

function evidenceLines(report, lang) {
  const none = localized(lang, "暂无", "none");
  const excluded = report.evidence.excludedSources.map(
    ({ id, reason }) => `${id} (${reason})`,
  );
  return [
    ...wrappedList(
      localized(lang, "字段", "FIELDS"),
      fieldLabels(report.evidence.fieldsUsed, lang),
      none,
    ),
    ...wrappedList(
      localized(lang, "来源", "SOURCES"),
      report.evidence.sourcesUsed,
      none,
    ),
    localized(
      lang,
      `  基准  ${report.evidence.baselineActiveDays} 个活跃日`,
      `  BASELINE  ${report.evidence.baselineActiveDays} active days`,
    ),
    ...(excluded.length > 0
      ? wrappedList(localized(lang, "排除", "EXCLUDED"), excluded, none)
      : []),
  ];
}

function trendLine(trend, days, lang) {
  const direction = {
    increasing: localized(lang, "信号增加", "signals increasing"),
    decreasing: localized(lang, "信号减少", "signals decreasing"),
    stable: localized(lang, "基本持平", "mostly stable"),
    insufficient: localized(lang, "样本不足", "insufficient sample"),
  }[trend.direction];
  return localized(
    lang,
    `${days} 天趋势  ${trend.observableDays} 天可判断 · ${trend.signalDays} 天出现信号 · ${trend.soberDays} 天清醒 · ${direction}`,
    `${days}-DAY TREND  ${trend.observableDays} observable · ${trend.signalDays} signal days · ${trend.soberDays} AI-free · ${direction}`,
  );
}

function renderClinic(report, lang = "zh") {
  const content = contentFor(report, lang);
  return [
    color("1;31", localized(lang, `TOKEN 代谢门诊 · ${report.date}`, `TOKEN METABOLIC CLINIC · ${report.date}`)),
    "",
    `  ${color("33", localized(lang, "主诊断", "PRIMARY DIAGNOSIS"))}  ${content.label}${report.provisional ? localized(lang, " · 今日观察中", " · provisional") : ""}`,
    `  ${content.copy}`,
    "",
    `  ${color("33", localized(lang, "证据范围", "EVIDENCE SCOPE"))}`,
    ...evidenceLines(report, lang),
    "",
    `  ${trendLine(report.trends.days7, 7, lang)}`,
    `  ${trendLine(report.trends.days30, 30, lang)}`,
    "",
    `  ${studyLine(report.study, lang)}`,
    "",
    `  ${color("2", localized(lang, "仅为相关性观察，不评价生产力、因果关系、健康或个人能力。", "Correlation only; not productivity, causality, health, or personal ability."))}`,
    "",
  ].join("\n");
}

const STUDY_RESULTS = Object.freeze({
  insufficient_evidence: ["证据不足", "INSUFFICIENT EVIDENCE"],
  cache_stable: ["缓存趋稳", "CACHE STABILIZED"],
  write_relapse: ["写入反复", "WRITE RELAPSE"],
  context_stable: ["上下文收束", "CONTEXT STABILIZED"],
  context_swelling: ["持续膨胀", "CONTEXT SWELLING"],
  fragmented: ["请求碎片化", "REQUEST FRAGMENTATION"],
  load_recovered: ["负载恢复", "LOAD RECOVERED"],
  overload_relapse: ["过载反复", "OVERLOAD RELAPSE"],
  load_oscillating: ["负载震荡", "LOAD OSCILLATING"],
});

function studyLine(study, lang) {
  if (!study) {
    return localized(
      lang,
      "研究课题  未启动 · anti-ai clinic start <protocol>",
      "STUDY  none active · anti-ai clinic start <protocol>",
    );
  }
  const protocol = clinicProtocol(study.protocolId);
  const label = localized(lang, ...protocol.labels);
  if (study.status === "completed") {
    return localized(
      lang,
      `研究印章  ${label} · ${localized(lang, ...STUDY_RESULTS[study.resultId])} · 样本 ${study.progress.observableDays}`,
      `STUDY SEAL  ${label} · ${localized(lang, ...STUDY_RESULTS[study.resultId])} · ${study.progress.observableDays} samples`,
    );
  }
  return localized(
    lang,
    `研究课题  ${label} · ${study.progress.elapsedDays} / ${study.durationDays} 天 · 样本 ${study.progress.observableDays}`,
    `STUDY  ${label} · ${study.progress.elapsedDays} / ${study.durationDays} days · ${study.progress.observableDays} samples`,
  );
}

function renderClinicPeriod(report, lang = "zh", period = "today") {
  const content = contentFor(report, lang);
  const trend = period === "month"
    ? report.trends.days30
    : report.trends.days7;
  const header = {
    today: localized(lang, "代谢门诊", "METABOLIC CLINIC"),
    week: localized(lang, "代谢门诊 · 7 天复查", "METABOLIC CLINIC · 7-DAY REVIEW"),
    month: localized(lang, "代谢门诊 · 30 天复查", "METABOLIC CLINIC · 30-DAY REVIEW"),
  }[period];
  return [
    `  ${color("33", header)}`,
    ...(period === "today"
      ? [
          `  ${localized(lang, "主诊断", "PRIMARY DIAGNOSIS")}  ${content.label}${report.provisional ? localized(lang, " · 今日观察中", " · provisional") : ""}`,
          `  ${localized(lang, "证据范围", "EVIDENCE SCOPE")}`,
          ...evidenceLines(report, lang).map((line) => `  ${line}`),
        ]
      : [
          `  ${trendLine(trend, period === "month" ? 30 : 7, lang)}`,
          `  ${localized(lang, "当前主诊断", "CURRENT DIAGNOSIS")}  ${content.label}`,
        ]),
    `  ${studyLine(report.study, lang)}`,
    `  ${localized(lang, "查看完整门诊", "FULL CLINIC")}  anti-ai clinic`,
    "",
  ].join("\n");
}

export {
  DIAGNOSIS_CONTENT,
  STUDY_RESULTS,
  renderClinic,
  renderClinicPeriod,
};
