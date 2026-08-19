import { localized } from "../shared.mjs";

function keyChange(day, lang) {
  if (!day) {
    return {
      kind: "awaiting",
      label: localized(lang, "等待结算", "AWAITING SETTLEMENT"),
      detail: localized(
        lang,
        "今天的后果尚未写入档案。没有数据时，收容所拒绝编造病情。",
        "Today's aftermath is not sealed. Without evidence, containment refuses to invent symptoms.",
      ),
      target: "overview",
    };
  }
  const pathology = day.pathologyChanges[0];
  if (pathology) {
    return {
      kind: "pathology",
      label: localized(lang, "病理变化", "PATHOLOGY CHANGE"),
      detail: pathology.label,
      target: "overview",
    };
  }
  const activity = day.activities[0];
  if (activity) {
    return {
      kind: "record",
      label: localized(lang, "档案变化", "FILE CHANGE"),
      detail: activity.label,
      target: activity.type === "laboratory" ? "laboratory" : "codex",
    };
  }
  const ecology = day.ecologyGains;
  if (ecology.pollution > 0 || ecology.clarity > 0) {
    return {
      kind: "ecology",
      label: localized(lang, "生态漂移", "ECOLOGY DRIFT"),
      detail: localized(
        lang,
        `相较昨日 · 污染 +${ecology.pollution} · 清醒 +${ecology.clarity}`,
        `vs yesterday · pollution +${ecology.pollution} · clarity +${ecology.clarity}`,
      ),
      target: "habitat",
    };
  }
  if (day.discoveries.length > 0) {
    return {
      kind: "quiet",
      label: localized(
        lang,
        "无其他显著变化",
        "NO OTHER MATERIAL CHANGE",
      ),
      detail: localized(
        lang,
        "除下方收藏更新外，今天没有值得追加页码的病理变化。",
        "Beyond the collection update below, no pathology justified another page today.",
      ),
      target: "overview",
    };
  }
  return {
    kind: "quiet",
    label: localized(lang, "无显著变化", "NO MATERIAL CHANGE"),
    detail: localized(
      lang,
      "今天没有值得追加页码的病理变化。档案员被迫准时下班。",
      "No pathology justified another page today. The archivist was forced to leave on time.",
    ),
    target: "overview",
  };
}

function collectionChange(day, lang) {
  if (!day || day.discoveries.length === 0) {
    return {
      count: 0,
      label: localized(lang, "收藏更新", "COLLECTION UPDATE"),
      detail: localized(
        lang,
        "无新增条目 · 图鉴今天没有趁你不注意自行膨胀。",
        "No new entries · the Codex did not expand while you were looking away.",
      ),
      target: "codex",
    };
  }
  return {
    count: day.discoveries.length,
    label: localized(lang, "收藏更新", "COLLECTION UPDATE"),
    detail: localized(
      lang,
      `新增 ${day.discoveries.length} 项 · ${day.discoveries.slice(0, 2).map(({ label }) => label).join(" · ")}`,
      `${day.discoveries.length} new · ${day.discoveries.slice(0, 2).map(({ label }) => label).join(" · ")}`,
    ),
    target: "codex",
  };
}

function deriveDailyBriefing({
  date,
  status,
  statusLabel,
  day,
  diagnosis,
  habitat,
  recommendation,
  lang = "zh",
}) {
  const briefingStatus = status === "unhatched"
    ? "unhatched"
    : day
      ? "settled"
      : "unsettled";
  const change = keyChange(day, lang);
  const collection = collectionChange(day, lang);
  const systemDetail = day
    ? `${day.usageBandLabel} · ${day.summary}`
    : localized(
        lang,
        "当前日期尚未结算；浏览仍保持只读。",
        "The view date is not settled; browsing remains read-only.",
      );
  return {
    version: 1,
    date,
    status: briefingStatus,
    sections: [
      {
        id: "system",
        kind: "system",
        label: localized(lang, "系统状态", "SYSTEM STATUS"),
        detail: `${statusLabel} · ${systemDetail}`,
        target: "overview",
      },
      {
        id: "diagnosis",
        kind: "diagnosis",
        label: localized(lang, "当前诊断", "CURRENT DIAGNOSIS"),
        detail: diagnosis,
        target: "overview",
      },
      {
        id: "change",
        ...change,
      },
      {
        id: "collection",
        kind: "collection",
        ...collection,
      },
      {
        id: "habitat",
        kind: "narrative",
        label: localized(lang, "生态舱反应", "HABITAT REACTION"),
        detail: `${habitat.name} · ${habitat.bulletin}`,
        target: "habitat",
      },
    ],
    recommendation: recommendation
      ? {
          id: recommendation.id,
          label: recommendation.label,
          target: recommendation.target,
          execution: recommendation.execution,
          command: recommendation.command,
          key: "Enter",
        }
      : null,
    links: {
      details: {
        key: "e",
        target: "overview",
        label: localized(lang, "展开完整档案", "EXPAND FULL FILE"),
      },
      habitat: {
        key: "2",
        target: "habitat",
        label: localized(lang, "查看生态舱", "OPEN HABITAT"),
      },
      codex: {
        key: "5",
        target: "codex",
        label: localized(lang, "查看图鉴", "OPEN CODEX"),
      },
    },
  };
}

export { deriveDailyBriefing };
