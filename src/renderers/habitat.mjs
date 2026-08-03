import {
  habitatDecorationCopy,
  habitatDuoTitle,
  habitatEventCopy,
  habitatRelationshipCopy,
} from "../habitat.mjs";
import {
  color,
  padTerminal,
  terminalWidth,
} from "../reporting.mjs";
import { localized } from "../shared.mjs";

const ROUTE_COLORS = {
  pollution: "1;31",
  clarity: "1;36",
  paradox: "1;33",
  unformed: "2",
};

function truncateTerminal(value, width) {
  const source = String(value);
  if (terminalWidth(source) <= width) return source;
  let output = "";
  let visible = "";
  let hasAnsi = false;
  const tokens = source.match(/\u001B\[[0-9;]*m|./gu) ?? [];
  for (const token of tokens) {
    if (token.startsWith("\u001B[")) {
      output += token;
      hasAnsi = true;
      continue;
    }
    if (terminalWidth(`${visible}${token}…`) > width) break;
    output += token;
    visible += token;
  }
  return `${output}…${hasAnsi ? "\u001B[0m" : ""}`;
}

function wrapTerminal(value, width, lang) {
  if (terminalWidth(value) <= width) return [value];
  if (lang === "en") {
    const lines = [];
    let line = "";
    for (const word of String(value).split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (terminalWidth(candidate) <= width) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines.flatMap((entry) =>
      terminalWidth(entry) <= width
        ? [entry]
        : [truncateTerminal(entry, width)],
    );
  }
  const lines = [];
  let line = "";
  for (const character of Array.from(String(value))) {
    if (terminalWidth(`${line}${character}`) > width) {
      lines.push(line);
      line = character;
    } else {
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function joinArt(left, right, width) {
  const leftWidth = Math.min(
    40,
    Math.max(24, ...left.map((line) => terminalWidth(line))),
  );
  const rightWidth = Math.max(12, width - leftWidth - 3);
  return Array.from(
    { length: Math.max(left.length, right.length) },
    (_, index) => {
      const leftLine = truncateTerminal(left[index] ?? "", leftWidth);
      const rightLine = truncateTerminal(right[index] ?? "", rightWidth);
      return `${padTerminal(leftLine, leftWidth)} │ ${rightLine}`.trimEnd();
    },
  );
}

function cabinetEntryLabel(key, lang) {
  const separator = String(key).indexOf(":");
  const type = separator === -1 ? "collection" : String(key).slice(0, separator);
  const id = separator === -1 ? String(key) : String(key).slice(separator + 1);
  const labels = {
    form: ["形态", "FORM"],
    achievement: ["徽章", "BADGE"],
    chromaticAbility: ["异色", "CHROMATIC"],
    scar: ["伤痕", "SCAR"],
    habitatPhenomenon: ["现象", "PHENOMENON"],
    specimen: ["标本", "SPECIMEN"],
    foreignSpecimen: ["外来标本", "FOREIGN SPECIMEN"],
    caseSlice: ["病例切片", "CASE SLICE"],
    incidentReport: ["事故报告", "INCIDENT REPORT"],
    culture: ["培养物", "CULTURE"],
    companion: ["伴生", "COMPANION"],
    fossil: ["化石", "FOSSIL"],
  };
  return `${localized(lang, ...(labels[type] ?? ["收藏", "COLLECTION"]))} #${id}`;
}

function renderHabitat(habitat, labels, lang = "zh", options = {}) {
  const configuredWidth =
    Number(process.env.COLUMNS) || process.stdout.columns || 80;
  const outerWidth = Math.max(64, Math.min(80, configuredWidth || 80));
  const contentWidth = outerWidth - 4;
  const top = `╭${"─".repeat(outerWidth - 2)}╮`;
  const middle = `├${"─".repeat(outerWidth - 2)}┤`;
  const bottom = `╰${"─".repeat(outerWidth - 2)}╯`;
  const row = (line = "") =>
    `│ ${padTerminal(truncateTerminal(line, contentWidth), contentWidth)} │`;
  const rows = (lines) => lines.map(row);
  const routeColor =
    ROUTE_COLORS[habitat.relationship?.routeId ?? "unformed"];
  const nextEvent = localized(
    lang,
    `下次生态事件 ${habitat.cadence.daysUntilNext} 天后`,
    `NEXT ECOLOGICAL EVENT IN ${habitat.cadence.daysUntilNext} DAYS`,
  );
  const generation = localized(
    lang,
    `第 ${habitat.specimen.generation} 世代`,
    `GENERATION ${habitat.specimen.generation}`,
  );
  const experience = localized(
    lang,
    `阅历 ${habitat.specimen.experienceDays} 天`,
    `${habitat.specimen.experienceDays} EXPERIENCE DAYS`,
  );
  const companionArt = habitat.companion?.art ?? [
    localized(lang, "      [ 空置伴生位 ]", "      [ UNBONDED BAY ]"),
    "",
    "  anti-ai lab bond <culture-id>",
  ];
  const artHeaderLines = joinArt(
    [
      `${localized(lang, "标本", "SPECIMEN")} #${habitat.specimen.id} · ${labels.specimenStage}`,
    ],
    [
      habitat.companion
        ? `${localized(lang, "伴生", "COMPANION")} #${habitat.companion.cultureId} · ${labels.companionStage}`
        : localized(lang, "伴生位 · 未绑定", "COMPANION BAY · UNBONDED"),
    ],
    contentWidth,
  );
  const artLines = joinArt(
    habitat.specimen.art,
    companionArt,
    contentWidth,
  );
  const decorationLines =
    habitat.decorations.length === 0
      ? [
          color(
            "2",
            localized(
              lang,
              "尚无生态痕迹 · 舱内只有合规的空白",
              "NO ECOLOGICAL TRACES · ONLY COMPLIANT EMPTY SPACE",
            ),
          ),
        ]
      : habitat.decorations.map((decoration) => {
          const copy = habitatDecorationCopy(decoration.id, lang);
          return color(
            ROUTE_COLORS[decoration.routeId],
            `${copy.glyph} ${copy.name}`,
          );
        });
  const cabinetLines = Array.from({ length: 3 }, (_, index) => {
    const key = habitat.cabinet?.featured?.[index];
    return key
      ? `${index + 1}. ${cabinetEntryLabel(key, lang)}`
      : `${index + 1}. ${localized(lang, "空置", "VACANT")}`;
  });
  const latestEvent = habitat.events.at(-1);
  const latestCopy = latestEvent
    ? habitatEventCopy(latestEvent.id, lang)
    : null;
  const relationshipCopy = habitat.relationship
    ? habitatRelationshipCopy(habitat.relationship.id, lang)
    : null;
  const relationshipLines = habitat.relationship
    ? [
        `${localized(lang, "关系诊断", "RELATIONSHIP DIAGNOSIS")}  ${color(routeColor, relationshipCopy.name)} · ${localized(lang, `共居 ${habitat.relationship.cohabitationDays} 天`, `${habitat.relationship.cohabitationDays} DAYS COHABITING`)}`,
        `${localized(lang, "双体称号", "DUO EPITHET")}  ${color(routeColor, habitatDuoTitle(habitat.relationship.routeId, habitat.relationship.titleId, lang))}`,
        ...wrapTerminal(
          `${localized(lang, "联合症状", "JOINT SYMPTOM")}  ${relationshipCopy.symptom}`,
          contentWidth,
          lang,
        ),
      ]
    : [
        `${localized(lang, "关系诊断", "RELATIONSHIP DIAGNOSIS")}  ${localized(lang, "未建立伴生关系", "NO SYMBIOTIC BOND")}`,
        `${localized(lang, "查看培养架", "INSPECT SHELF")}  anti-ai lab shelf`,
      ];
  const recentLines = latestEvent
    ? [
        `${localized(lang, "最近事件", "LATEST EVENT")}  ${color(ROUTE_COLORS[latestEvent.routeId], latestCopy.name)} · ${latestEvent.discoveredAt}`,
        ...wrapTerminal(`  ${latestCopy.body}`, contentWidth, lang),
      ]
    : [
        `${localized(lang, "最近事件", "LATEST EVENT")}  ${localized(lang, "尚未达到第 7 个阅历日", "NOT YET AT EXPERIENCE DAY 7")}`,
      ];
  const fullEventLines = options.full
    ? [
        "",
        localized(lang, "已封存生态事件", "SEALED ECOLOGICAL EVENTS"),
        ...(habitat.events.length === 0
          ? [`  ${localized(lang, "尚无", "NONE")}`]
          : habitat.events.flatMap((event) => {
              const copy = habitatEventCopy(event.id, lang);
              return [
                `  ${event.discoveredAt} · ${localized(lang, `阅历 ${event.experienceDay}`, `EXPERIENCE ${event.experienceDay}`)} · ${color(ROUTE_COLORS[event.routeId], copy.name)}`,
                ...wrapTerminal(`    ${copy.body}`, contentWidth, lang),
              ];
            })),
      ]
    : [];
  const footerLines = options.full
    ? [
        localized(
          lang,
          "只读生态档案：不保存对话、路径、模型名、精确 Token 或查看次数。",
          "READ-ONLY HABITAT: no chats, paths, model names, exact tokens, or view counts.",
        ),
        `${localized(lang, "分享", "SHARE")}  anti-ai share --card habitat > habitat.svg`,
      ]
    : [
        `${localized(lang, "完整生态档案", "FULL HABITAT FILE")}  anti-ai creature habitat --full`,
        `${localized(lang, "分享", "SHARE")}  anti-ai share --card habitat > habitat.svg`,
      ];

  return [
    color(
      routeColor,
      `${localized(lang, "收容生态舱", "CONTAINMENT HABITAT")} · ${habitat.date}`,
    ),
    top,
    row(`${generation} · ${experience} · ${nextEvent}`),
    middle,
    ...rows(artHeaderLines),
    ...rows([""]),
    ...rows(artLines),
    middle,
    row(localized(lang, "后果陈列柜", "CONSEQUENCE CABINET")),
    ...rows(cabinetLines),
    middle,
    row(localized(lang, "生态痕迹", "ECOLOGICAL TRACES")),
    ...rows(decorationLines),
    middle,
    ...rows(relationshipLines),
    middle,
    ...rows(recentLines),
    ...rows(fullEventLines),
    middle,
    ...rows(footerLines),
    bottom,
    "",
  ].join("\n");
}

export { renderHabitat };
