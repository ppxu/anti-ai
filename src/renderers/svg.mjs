import { everydayComparisons } from "../comparisons.mjs";
import { SHARE_METHODOLOGY } from "../content.mjs";
import {
  estimateResources,
  formatResource,
  referenceLabel,
} from "../methodology.mjs";
import { emptyUsage, localized } from "../shared.mjs";
import {
  averageTotals,
  dailyVerdict,
  formatChange,
  rotatingCopy,
} from "../reporting.mjs";
import {
  habitatDecorationCopy,
  habitatDuoTitle,
  habitatEventCopy,
  habitatRelationshipCopy,
} from "../habitat.mjs";
import { presentHabitatScene } from "../habitat-scenes.mjs";
import { collectionPhenotypeCopy } from "../collection-phenotype.mjs";

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapSvgText(value, maxChars, maxLines = 2) {
  const lines = [];
  let remaining = String(value).trim();
  while (remaining.length > 0 && lines.length < maxLines) {
    if (remaining.length <= maxChars) {
      lines.push(remaining);
      break;
    }
    if (lines.length === maxLines - 1) {
      lines.push(`${remaining.slice(0, maxChars - 1).trimEnd()}…`);
      break;
    }
    const candidate = remaining.slice(0, maxChars + 1);
    const lastSpace = candidate.lastIndexOf(" ");
    const splitAt = lastSpace >= Math.floor(maxChars * 0.6)
      ? lastSpace
      : maxChars;
    lines.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }
  return lines;
}

function svgTextTspans(value, x, maxChars, maxLines = 2, lineHeight = 22) {
  return wrapSvgText(value, maxChars, maxLines)
    .map(
      (line, index) =>
        `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");
}

function truncateSvgText(value, maxChars) {
  return wrapSvgText(value, maxChars, 1)[0] ?? "";
}

function renderShareSvg(report, historicalReports = [], lang = "zh") {
  const { date, totals } = report;
  const resources = estimateResources(totals);
  const comparisons = everydayComparisons(resources, "today", lang);
  const baseline =
    historicalReports.length > 0 ? averageTotals(historicalReports) : emptyUsage();
  const verdict = dailyVerdict(totals, baseline, date, lang);
  const title = localized(
    lang,
    `今日罪名：${verdict.title}`,
    `TODAY'S CHARGE: ${verdict.title}`,
  );
  const privacy = localized(
    lang,
    "隐私模式：未包含对话、路径、模型名和精确 Token",
    "PRIVACY MODE: no chats, paths, model names, or exact tokens",
  );
  const methodology = rotatingCopy(date, SHARE_METHODOLOGY[lang]);
  const tokenChange = formatChange(
    totals.totalTokens,
    baseline.totalTokens,
    lang,
  );
  const requestChange = formatChange(
    totals.requests,
    baseline.requests,
    lang,
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(`YOUR AI RECEIPT · ${date}`)}</title>
  <desc id="desc">${escapeXml(privacy)}</desc>
  <rect width="1200" height="630" rx="28" fill="#0b0b0c"/>
  <rect x="24" y="24" width="1152" height="582" rx="20" fill="none" stroke="#343438" stroke-width="2"/>
  <rect x="24" y="24" width="12" height="582" rx="6" fill="#ff4d4f"/>
  <style>
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .muted { fill: #8c8c94; }
    .body { fill: #f4f4f5; }
    .accent { fill: #ff5c5e; }
    .warn { fill: #f5b942; }
  </style>
  <text x="72" y="84" class="mono accent" font-size="34" font-weight="800">YOUR AI RECEIPT</text>
  <text x="1128" y="84" class="mono muted" font-size="22" text-anchor="end">${escapeXml(date)}</text>
  <line x1="72" y1="116" x2="1128" y2="116" stroke="#343438" stroke-width="2"/>

  <text x="72" y="164" class="mono warn" font-size="19">${escapeXml(localized(lang, "资源消耗估算", "RESOURCE USE ESTIMATE"))}</text>
  <text x="72" y="214" class="mono body" font-size="28">⚡ ${escapeXml(formatResource(resources.energyWh, "Wh"))}</text>
  <text x="72" y="264" class="mono body" font-size="28">💧 ${escapeXml(formatResource(resources.waterMl, "mL"))}</text>
  <text x="72" y="314" class="mono body" font-size="28">☁️ ${escapeXml(formatResource(resources.carbonGrams, "gCO₂e"))}</text>

  <text x="620" y="164" class="mono warn" font-size="19">${escapeXml(localized(lang, "生活翻译", "EVERYDAY TRANSLATION"))}</text>
  <text x="620" y="214" class="mono body" font-size="18">${escapeXml(`${comparisons[0].icon} ${comparisons[0].label}`)}</text>
  <text x="1128" y="214" class="mono body" font-size="18" text-anchor="end">${escapeXml(comparisons[0].value)}</text>
  <text x="620" y="264" class="mono body" font-size="18">${escapeXml(`${comparisons[2].icon} ${comparisons[2].label}`)}</text>
  <text x="1128" y="264" class="mono body" font-size="18" text-anchor="end">${escapeXml(comparisons[2].value)}</text>
  <text x="620" y="314" class="mono body" font-size="18">${escapeXml(`${comparisons[4].icon} ${comparisons[4].label}`)}</text>
  <text x="1128" y="314" class="mono body" font-size="18" text-anchor="end">${escapeXml(comparisons[4].value)}</text>

  <line x1="72" y1="354" x2="1128" y2="354" stroke="#343438" stroke-width="2"/>
  <text x="72" y="404" class="mono accent" font-size="30" font-weight="800">${escapeXml(title)}</text>
  <text x="72" y="448" class="mono body" font-size="20">${escapeXml(verdict.detail)}</text>
  <text x="72" y="492" class="mono muted" font-size="19">${escapeXml(localized(lang, `相对 7 日基线：Token ${tokenChange} · 请求 ${requestChange}`, `VS 7-DAY BASELINE: tokens ${tokenChange} · requests ${requestChange}`))}</text>

  <line x1="72" y1="526" x2="1128" y2="526" stroke="#343438" stroke-width="2"/>
  <text x="72" y="556" class="mono muted" font-size="15">${escapeXml(privacy)}</text>
  <text x="72" y="580" class="mono muted" font-size="15">${escapeXml(methodology)}</text>
  <text x="1128" y="600" class="mono muted" font-size="14" text-anchor="end">anti-ai · github.com/ppxu/anti-ai</text>
</svg>
`;
  return svg;
}

function renderPathologyShareSvg(view, lang = "zh") {
  const privacy = localized(
    lang,
    "隐私模式：无对话、路径、模型名或精确 Token",
    "PRIVACY MODE: no chats, paths, model names, or exact tokens",
  );
  const artLines = view.art
    .replaceAll(/\u001B\[[0-9;]*m/g, "")
    .split("\n")
    .filter(Boolean)
    .map(
      (line, index) =>
        `<tspan x="74" dy="${index === 0 ? 0 : 31}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(localized(lang, "异变体病理报告", "MUTATION PATHOLOGY REPORT"))}</title>
  <desc id="desc">${escapeXml(privacy)}</desc>
  <rect width="1200" height="630" rx="28" fill="#090d0c"/>
  <rect x="24" y="24" width="1152" height="582" rx="20" fill="none" stroke="#27433a" stroke-width="2"/>
  <rect x="24" y="24" width="12" height="582" rx="6" fill="#43d19e"/>
  <style>
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .muted { fill: #78958b; }
    .body { fill: #ecf7f3; }
    .accent { fill: #43d19e; }
    .warn { fill: #f3c969; }
  </style>
  <text x="72" y="82" class="mono accent" font-size="32" font-weight="800">${escapeXml(localized(lang, "异变体病理报告", "MUTATION PATHOLOGY REPORT"))}</text>
  <text x="1128" y="82" class="mono muted" font-size="20" text-anchor="end">${escapeXml(view.date)}</text>
  <line x1="72" y1="114" x2="1128" y2="114" stroke="#27433a" stroke-width="2"/>

  <text x="72" y="154" class="mono warn" font-size="18">${escapeXml(localized(lang, `标本编号 ${view.specimenId}`, `SPECIMEN ID ${view.specimenId}`))}</text>
  <text x="74" y="202" class="mono body" font-size="22" xml:space="preserve">${artLines}</text>

  <text x="610" y="164" class="mono muted" font-size="16">${escapeXml(localized(lang, "生态人格", "ECOLOGY"))}</text>
  <text x="610" y="198" class="mono body" font-size="24">${escapeXml(view.ecology)}</text>
  <text x="610" y="244" class="mono muted" font-size="16">${escapeXml(localized(lang, "当前形态", "CURRENT FORM"))}</text>
  <text x="610" y="278" class="mono body" font-size="24">${escapeXml(view.form)}</text>
  <text x="610" y="324" class="mono muted" font-size="16">${escapeXml(localized(lang, "生命阶段", "LIFE STAGE"))}</text>
  <text x="610" y="358" class="mono body" font-size="21">${escapeXml(`${view.stage} · ${view.experience}`)}</text>
  <text x="610" y="404" class="mono muted" font-size="16">${escapeXml(localized(lang, "病历称号", "CASEBOOK EPITHET"))}</text>
  <text x="610" y="438" class="mono warn" font-size="19">${escapeXml(view.epithet)}</text>
  <text x="610" y="484" class="mono muted" font-size="16">${escapeXml(localized(lang, "今日生态切片", "TODAY'S ECOLOGY SLICE"))}</text>
  <text x="610" y="516" class="mono body" font-size="18">${escapeXml(view.ecologyGain)}</text>

  <line x1="72" y1="544" x2="1128" y2="544" stroke="#27433a" stroke-width="2"/>
  <text x="72" y="574" class="mono muted" font-size="15">${escapeXml(privacy)}</text>
  <text x="1128" y="596" class="mono muted" font-size="14" text-anchor="end">anti-ai · github.com/ppxu/anti-ai</text>
</svg>
`;
}

function renderDossierShareSvg(view, lang = "zh") {
  const title = localized(
    lang,
    "异变体标本档案",
    "MUTATION DOSSIER",
  );
  const privacy = localized(
    lang,
    "隐私模式：无对话、路径、模型名或精确 Token",
    "PRIVACY MODE: no chats, paths, model names, or exact tokens",
  );
  const artLines = view.identity.art
    .map(
      (line, index) =>
        `<tspan x="72" dy="${index === 0 ? 0 : 24}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const companionLines = (view.identity.companion?.art ?? [])
    .slice(0, 6)
    .map(
      (line, index) =>
        `<tspan x="446" dy="${index === 0 ? 0 : 18}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const period = view.periods.find(({ days }) => days === 30) ?? view.periods[0];
  const completedSets = view.collectionSets.entries
    .filter(({ completed }) => completed)
    .map(({ stamp }) => stamp)
    .slice(0, 2)
    .join(" · ") || localized(lang, "尚无完整套组", "NO COMPLETE SET YET");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(privacy)}</desc>
  <rect width="1200" height="630" rx="28" fill="#090c12"/>
  <rect x="24" y="24" width="1152" height="582" rx="20" fill="none" stroke="#324052" stroke-width="2"/>
  <rect x="24" y="24" width="12" height="582" rx="6" fill="#58d6c7"/>
  <style>
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .muted { fill: #8391a5; }
    .body { fill: #eef6f5; }
    .accent { fill: #58d6c7; }
    .warn { fill: #f0c66d; }
    .rare { fill: #c49aff; }
  </style>
  <text x="72" y="80" class="mono accent" font-size="31" font-weight="800">${escapeXml(title)}</text>
  <text x="1128" y="80" class="mono muted" font-size="18" text-anchor="end">${escapeXml(view.date)}</text>
  <text x="72" y="108" class="mono muted" font-size="14">#${escapeXml(view.identity.specimenId)} · ${escapeXml(view.identity.formLabel)}</text>
  <line x1="72" y1="128" x2="1128" y2="128" stroke="#324052" stroke-width="2"/>

  <text x="72" y="166" class="mono warn" font-size="16">${escapeXml(localized(lang, "当前标本", "CURRENT SPECIMEN"))}</text>
  <text x="72" y="202" class="mono body" font-size="18" xml:space="preserve">${artLines}</text>
  ${companionLines ? `<text x="446" y="236" class="mono rare" font-size="13" xml:space="preserve">${companionLines}</text>` : ""}

  <text x="610" y="166" class="mono muted" font-size="15">${escapeXml(localized(lang, "档案身份", "DOSSIER IDENTITY"))}</text>
  <text x="610" y="198" class="mono body" font-size="21">${escapeXml(truncateSvgText(view.identity.title, 44))}</text>
  <text x="610" y="236" class="mono body" font-size="17">${escapeXml(`${view.identity.stageLabel} · ${view.identity.ecologyLabel}`)}</text>
  <text x="610" y="266" class="mono body" font-size="17">${escapeXml(`${view.identity.pathologyLabel} · ${view.identity.abilityLabel}`)}</text>
  <text x="610" y="294" class="mono rare" font-size="14">${escapeXml(localized(lang, `馆藏异变 · ${view.collectionPhenotype.copy ? `${view.collectionPhenotype.copy.name} · 阶段 ${view.collectionPhenotype.tier}` : "尚未诱发"}`, `COLLECTION MUTATION · ${view.collectionPhenotype.copy ? `${view.collectionPhenotype.copy.name} · TIER ${view.collectionPhenotype.tier}` : "NOT YET INDUCED"}`))}</text>
  <text x="610" y="320" class="mono muted" font-size="15">${escapeXml(localized(lang, "当前诊断", "CURRENT DIAGNOSIS"))}</text>
  <text x="610" y="350" class="mono warn" font-size="16">${svgTextTspans(view.diagnosis, 610, 48, 2, 20)}</text>

  <line x1="72" y1="388" x2="1128" y2="388" stroke="#324052" stroke-width="2"/>
  <text x="72" y="420" class="mono accent" font-size="16">${escapeXml(localized(lang, "30 天病程", "30-DAY COURSE"))}</text>
  <text x="72" y="450" class="mono body" font-size="16">${escapeXml(truncateSvgText(period.summary, 108))}</text>
  <text x="72" y="488" class="mono accent" font-size="16">${escapeXml(localized(lang, "世代对照", "GENERATION COMPARISON"))}</text>
  <text x="72" y="518" class="mono body" font-size="16">${escapeXml(truncateSvgText(view.comparison.summary, 108))}</text>
  <text x="72" y="552" class="mono rare" font-size="15">${escapeXml(localized(lang, `星图 ${view.collectionSets.completed}/${view.collectionSets.total} · ${completedSets}`, `CONSTELLATIONS ${view.collectionSets.completed}/${view.collectionSets.total} · ${completedSets}`))}</text>
  <line x1="72" y1="568" x2="1128" y2="568" stroke="#324052" stroke-width="2"/>
  <text x="72" y="594" class="mono muted" font-size="14">${escapeXml(privacy)}</text>
  <text x="1128" y="594" class="mono muted" font-size="14" text-anchor="end">anti-ai · github.com/ppxu/anti-ai</text>
</svg>
`;
}

function renderDailyBriefingShareSvg(view, lang = "zh") {
  const title = localized(
    lang,
    "每日收容播报",
    "DAILY CONTAINMENT BROADCAST",
  );
  const privacy = localized(
    lang,
    "隐私模式：无对话、路径、模型名、来源名或精确 Token",
    "PRIVACY MODE: no chats, paths, model or source names, or exact tokens",
  );
  const section = (id) => view.sections.find((entry) => entry.id === id);
  const system = section("system");
  const diagnosis = section("diagnosis");
  const change = section("change");
  const collection = section("collection");
  const habitat = section("habitat");
  const artLines = view.art
    .slice(0, 9)
    .map(
      (line, index) =>
        `<tspan x="72" dy="${index === 0 ? 0 : 27}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const response = view.recommendation?.label
    ?? localized(lang, "无需处置 · 允许什么也不做", "NO RESPONSE REQUIRED · DOING NOTHING IS ALLOWED");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(privacy)}</desc>
  <rect width="1200" height="630" rx="28" fill="#080d0c"/>
  <rect x="24" y="24" width="1152" height="582" rx="20" fill="none" stroke="#29483f" stroke-width="2"/>
  <rect x="24" y="24" width="12" height="582" rx="6" fill="#55d6b0"/>
  <style>
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .muted { fill: #78958b; }
    .body { fill: #eff8f5; }
    .accent { fill: #55d6b0; }
    .warn { fill: #f2c66d; }
    .rare { fill: #cf91ff; }
  </style>
  <text x="72" y="80" class="mono accent" font-size="30" font-weight="800">${escapeXml(title)}</text>
  <text x="1128" y="80" class="mono muted" font-size="18" text-anchor="end">${escapeXml(view.date)}</text>
  <line x1="72" y1="112" x2="1128" y2="112" stroke="#29483f" stroke-width="2"/>

  <text x="72" y="150" class="mono warn" font-size="15">${escapeXml(localized(lang, `今日标本 #${view.specimenId}`, `TODAY'S SPECIMEN #${view.specimenId}`))}</text>
  <text x="72" y="182" class="mono body" font-size="18" xml:space="preserve">${artLines}</text>
  <text x="72" y="454" class="mono rare" font-size="16">${escapeXml(truncateSvgText(view.specimenTitle, 42))}</text>

  <text x="520" y="150" class="mono accent" font-size="14">${escapeXml(system.label)}</text>
  <text x="520" y="176" class="mono body" font-size="15">${escapeXml(truncateSvgText(system.detail, 72))}</text>
  <text x="520" y="218" class="mono rare" font-size="14">${escapeXml(diagnosis.label)}</text>
  <text x="520" y="244" class="mono body" font-size="15">${svgTextTspans(diagnosis.detail, 520, 66, 2, 20)}</text>
  <text x="520" y="304" class="mono warn" font-size="14">${escapeXml(change.label)}</text>
  <text x="520" y="330" class="mono body" font-size="15">${escapeXml(truncateSvgText(change.detail, 72))}</text>
  <text x="520" y="372" class="mono warn" font-size="14">${escapeXml(collection.label)}</text>
  <text x="520" y="398" class="mono body" font-size="15">${escapeXml(truncateSvgText(collection.detail, 72))}</text>
  <text x="520" y="440" class="mono accent" font-size="14">${escapeXml(habitat.label)}</text>
  <text x="520" y="466" class="mono body" font-size="15">${escapeXml(truncateSvgText(habitat.detail, 72))}</text>
  <text x="520" y="508" class="mono warn" font-size="14">${escapeXml(localized(lang, "建议处置", "RECOMMENDED RESPONSE"))}</text>
  <text x="520" y="536" class="mono body" font-size="17">${escapeXml(truncateSvgText(response, 64))}</text>

  <line x1="72" y1="558" x2="1128" y2="558" stroke="#29483f" stroke-width="2"/>
  <text x="72" y="586" class="mono muted" font-size="14">${escapeXml(privacy)}</text>
  <text x="1128" y="586" class="mono muted" font-size="14" text-anchor="end">anti-ai · github.com/ppxu/anti-ai</text>
</svg>
`;
}

function renderEncounterShareSvg(view, lang = "zh") {
  const title = localized(
    lang,
    "异变体接触事故",
    "MUTATION CONTACT INCIDENT",
  );
  const privacy = localized(
    lang,
    "隐私模式：无对话、路径、模型名、精确 Token 或污染编码",
    "PRIVACY MODE: no chats, paths, models, exact tokens, or pollution codes",
  );
  const artLines = view.art
    .replaceAll(/\u001B\[[0-9;]*m/g, "")
    .split("\n")
    .filter(Boolean)
    .map(
      (line, index) =>
        `<tspan x="72" dy="${index === 0 ? 0 : 24}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const detailLines = [];
  let remainingDetail = view.detail;
  while (remainingDetail.length > 0 && detailLines.length < 2) {
    if (remainingDetail.length <= 52) {
      detailLines.push(remainingDetail);
      break;
    }
    const candidate = remainingDetail.slice(0, 52);
    const splitAt =
      lang === "en" && candidate.includes(" ")
        ? candidate.lastIndexOf(" ")
        : 52;
    detailLines.push(remainingDetail.slice(0, splitAt));
    remainingDetail = remainingDetail.slice(splitAt).trimStart();
  }
  const detailTspans = detailLines
    .map(
      (line, index) =>
        `<tspan x="610" dy="${index === 0 ? 0 : 24}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(privacy)}</desc>
  <rect width="1200" height="630" rx="28" fill="#0d0912"/>
  <rect x="24" y="24" width="1152" height="582" rx="20" fill="none" stroke="#513069" stroke-width="2"/>
  <rect x="24" y="24" width="12" height="582" rx="6" fill="#bd68ff"/>
  <style>
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .muted { fill: #927da3; }
    .body { fill: #f5eff9; }
    .accent { fill: #d991ff; }
    .warn { fill: #ffca6b; }
  </style>
  <text x="72" y="82" class="mono accent" font-size="32" font-weight="800">${escapeXml(title)}</text>
  <text x="1128" y="82" class="mono muted" font-size="18" text-anchor="end">${escapeXml(view.date)} · INCIDENT #${escapeXml(view.encounterId)}</text>
  <line x1="72" y1="114" x2="1128" y2="114" stroke="#513069" stroke-width="2"/>

  <text x="72" y="154" class="mono warn" font-size="17">${escapeXml(localized(lang, `混种标本 #${view.hybridFingerprint}`, `HYBRID SPECIMEN #${view.hybridFingerprint}`))}</text>
  <text x="72" y="190" class="mono body" font-size="17" xml:space="preserve">${artLines}</text>

  <text x="610" y="158" class="mono muted" font-size="15">${escapeXml(localized(lang, "算力天气", "COMPUTE WEATHER"))}</text>
  <text x="610" y="190" class="mono warn" font-size="20">${escapeXml(view.weather)}</text>
  <text x="610" y="230" class="mono muted" font-size="15">${escapeXml(localized(lang, "接触类型", "CONTACT TYPE"))}</text>
  <text x="610" y="262" class="mono accent" font-size="20">${escapeXml(view.type)}</text>
  <text x="610" y="302" class="mono muted" font-size="15">${escapeXml(localized(lang, "亲本形态", "PARENT FORMS"))}</text>
  <text x="610" y="334" class="mono body" font-size="16">${escapeXml(`${view.localForm} × ${view.visitorForm}`)}</text>
  <text x="610" y="374" class="mono muted" font-size="15">${escapeXml(localized(lang, "事故产物", "ACCIDENT PRODUCT"))}</text>
  <text x="610" y="406" class="mono body" font-size="18">${escapeXml(view.hybridForm)}</text>
  <text x="610" y="452" class="mono body" font-size="15">${detailTspans}</text>

  <line x1="72" y1="544" x2="1128" y2="544" stroke="#513069" stroke-width="2"/>
  <text x="72" y="574" class="mono muted" font-size="14">${escapeXml(privacy)}</text>
  <text x="1128" y="596" class="mono muted" font-size="14" text-anchor="end">anti-ai · github.com/ppxu/anti-ai</text>
</svg>
`;
}

function renderPrognosisShareSvg(view, lang = "zh") {
  const title = localized(
    lang,
    "分叉病历预演",
    "FORKED CASEBOOK PROGNOSIS",
  );
  const privacy = localized(
    lang,
    "隐私模式：无对话、路径、模型名或精确 Token",
    "PRIVACY MODE: no chats, paths, model names, or exact tokens",
  );
  const prompt = localized(
    lang,
    "替它选一个无法善终的未来",
    "PICK ONE UNTENABLE FUTURE",
  );
  const artLines = view.art
    .replaceAll(/\u001B\[[0-9;]*m/g, "")
    .split("\n")
    .filter(Boolean)
    .map(
      (line, index) =>
        `<tspan x="72" dy="${index === 0 ? 0 : 25}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const optionLines = view.options
    .map(
      (option, index) => `
  <text x="592" y="${236 + index * 108}" class="mono accent" font-size="21" font-weight="700">${escapeXml(`${option.slot} · ${option.label}`)}</text>
  <text x="618" y="${270 + index * 108}" class="mono body" font-size="15">${escapeXml(option.benefit)}</text>
  <text x="618" y="${296 + index * 108}" class="mono warn" font-size="15">${escapeXml(`${localized(lang, "代价", "COST")}: ${option.cost}`)}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(privacy)}</desc>
  <rect width="1200" height="630" rx="28" fill="#0e0a0d"/>
  <rect x="24" y="24" width="1152" height="582" rx="20" fill="none" stroke="#5b3147" stroke-width="2"/>
  <rect x="24" y="24" width="12" height="582" rx="6" fill="#ff5e8a"/>
  <style>
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .muted { fill: #a08391; }
    .body { fill: #f8eef3; }
    .accent { fill: #ff7ba1; }
    .warn { fill: #f1bc61; }
  </style>
  <text x="72" y="82" class="mono accent" font-size="31" font-weight="800">${escapeXml(title)}</text>
  <text x="1128" y="82" class="mono muted" font-size="18" text-anchor="end">${escapeXml(view.date)}</text>
  <line x1="72" y1="114" x2="1128" y2="114" stroke="#5b3147" stroke-width="2"/>

  <text x="72" y="154" class="mono warn" font-size="17">${escapeXml(`${localized(lang, "病例", "CASE")} #${view.caseId}`)}</text>
  <text x="72" y="188" class="mono body" font-size="22">${escapeXml(view.caseLabel)}</text>
  <text x="72" y="232" class="mono muted" font-size="15">${escapeXml(`${localized(lang, "标本编号", "SPECIMEN ID")} ${view.specimenId}`)}</text>
  <text x="72" y="276" class="mono body" font-size="17" xml:space="preserve">${artLines}</text>

  <text x="592" y="174" class="mono warn" font-size="18">${escapeXml(prompt)}</text>${optionLines}

  <line x1="72" y1="544" x2="1128" y2="544" stroke="#5b3147" stroke-width="2"/>
  <text x="72" y="574" class="mono muted" font-size="14">${escapeXml(privacy)}</text>
  <text x="1128" y="596" class="mono muted" font-size="14" text-anchor="end">anti-ai · github.com/ppxu/anti-ai</text>
</svg>
`;
}

function renderCreatureCollectionShareSvg(view, kind, lang = "zh") {
  const privacy = localized(
    lang,
    "隐私模式：无对话、路径、模型名或精确 Token",
    "PRIVACY MODE: no chats, paths, model names, or exact tokens",
  );
  const titles = {
    specimen: localized(lang, "异变标本卡", "MUTATION SPECIMEN CARD"),
    wanted: localized(lang, "异变悬赏", "MUTATION WANTED"),
    fossil: localized(
      lang,
      "永久化石证书",
      "PERMANENT FOSSIL CERTIFICATE",
    ),
  };
  const palettes = {
    specimen: {
      background: "#0a0d12",
      border: "#27415f",
      accent: "#5aa9ff",
      muted: "#7f94ac",
      body: "#edf6ff",
      warn: "#c58cff",
    },
    wanted: {
      background: "#120b08",
      border: "#613e2b",
      accent: "#ff8a42",
      muted: "#a98d7b",
      body: "#fff3e8",
      warn: "#ffd166",
    },
    fossil: {
      background: "#100e09",
      border: "#5d5134",
      accent: "#d8bc72",
      muted: "#9b9070",
      body: "#f5edd5",
      warn: "#e48962",
    },
  };
  const palette = palettes[kind];
  const art = view.art ?? [
    "       _______",
    "    .-' FOSSIL '-.",
    "   /_______________\\",
    "      ||       ||",
  ].join("\n");
  const artLines = art
    .replaceAll(/\u001B\[[0-9;]*m/g, "")
    .split("\n")
    .filter(Boolean)
    .map(
      (line, index) =>
        `<tspan x="74" dy="${index === 0 ? 0 : 31}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const headerRight =
    kind === "fossil"
      ? localized(
          lang,
          `化石编号 ${view.fossil.id}`,
          `FOSSIL ID ${view.fossil.id}`,
        )
      : localized(
          lang,
          `标本编号 ${view.specimenId}`,
          `SPECIMEN ID ${view.specimenId}`,
        );
  const fields =
    kind === "fossil"
      ? [
          [
            localized(lang, "世代", "GENERATION"),
            String(view.fossil.generation),
          ],
          [
            localized(lang, "封存日期", "SEALED"),
            view.fossil.discoveredAt,
          ],
          [
            localized(lang, "生态 / 病理", "ECOLOGY / PATHOLOGY"),
            `${view.ecology} / ${view.pathology}`,
          ],
          [
            localized(lang, "遗传 / 伤痕", "INHERITANCE / SCAR"),
            `${view.inheritance} / ${view.scar}`,
          ],
        ]
      : [
          [
            localized(lang, "当前形态", "CURRENT FORM"),
            view.form,
          ],
          [
            localized(lang, "生态 / 病理", "ECOLOGY / PATHOLOGY"),
            `${view.ecology} / ${view.pathology}`,
          ],
          [
            localized(lang, "生命阶段", "LIFE STAGE"),
            `${view.stage} · ${view.experience}`,
          ],
          [
            localized(lang, "病历称号", "CASEBOOK EPITHET"),
            view.epithet,
          ],
        ];
  const reward =
    kind === "wanted"
      ? localized(
          lang,
          "悬赏：一次手动思考",
          "REWARD: ONE MANUAL THOUGHT",
        )
      : null;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(titles[kind])}</title>
  <desc id="desc">${escapeXml(privacy)}</desc>
  <rect width="1200" height="630" rx="28" fill="${palette.background}"/>
  <rect x="24" y="24" width="1152" height="582" rx="20" fill="none" stroke="${palette.border}" stroke-width="2"/>
  <rect x="24" y="24" width="12" height="582" rx="6" fill="${palette.accent}"/>
  <style>
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .muted { fill: ${palette.muted}; }
    .body { fill: ${palette.body}; }
    .accent { fill: ${palette.accent}; }
    .warn { fill: ${palette.warn}; }
  </style>
  <text x="72" y="82" class="mono accent" font-size="32" font-weight="800">${escapeXml(titles[kind])}</text>
  <text x="1128" y="82" class="mono muted" font-size="18" text-anchor="end">${escapeXml(headerRight)}</text>
  <line x1="72" y1="114" x2="1128" y2="114" stroke="${palette.border}" stroke-width="2"/>

  <text x="74" y="174" class="mono body" font-size="22" xml:space="preserve">${artLines}</text>
  ${reward ? `<text x="72" y="482" class="mono warn" font-size="20" font-weight="800">${escapeXml(reward)}</text>` : ""}

  ${fields
    .map(
      ([label, value], index) => `<text x="610" y="${154 + index * 92}" class="mono muted" font-size="15" aria-label="${escapeXml(`${label} ${value}`)}">${escapeXml(label)}</text>
  <text x="610" y="${188 + index * 92}" class="mono ${index === 3 ? "warn" : "body"}" font-size="${index === 3 ? 18 : 21}">${escapeXml(value)}</text>`,
    )
    .join("\n  ")}

  <line x1="72" y1="544" x2="1128" y2="544" stroke="${palette.border}" stroke-width="2"/>
  <text x="72" y="574" class="mono muted" font-size="15">${escapeXml(privacy)}</text>
  <text x="1128" y="596" class="mono muted" font-size="14" text-anchor="end">anti-ai · github.com/ppxu/anti-ai</text>
</svg>
`;
}

function renderCultureShareSvg(view, lang = "zh") {
  const title = localized(
    lang,
    "污染培养事故",
    "POLLUTION CULTURE ACCIDENT",
  );
  const privacy = localized(
    lang,
    "本地模式：无对话、路径、模型名或精确 Token",
    "LOCAL-ONLY: no chats, paths, model names, or exact tokens",
  );
  const artLines = view.art
    .map(
      (line, index) =>
        `<tspan x="76" dy="${index === 0 ? 0 : 31}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const fields = [
    [localized(lang, "类型 / 稀有度", "TYPE / RARITY"), `${view.type} · ${view.rarity}`],
    [localized(lang, "原料", "MATERIALS"), view.materials],
    [localized(lang, "生态 / 病灶", "ECOLOGY / PATHOLOGY"), `${view.ecology} / ${view.pathology}`],
    [localized(lang, "并发症", "COMPLICATION"), view.complication],
    [localized(lang, "副作用", "SIDE EFFECT"), view.sideEffect],
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(privacy)}</desc>
  <rect width="1200" height="630" rx="28" fill="#09110d"/>
  <rect x="24" y="24" width="1152" height="582" rx="20" fill="none" stroke="#24533a" stroke-width="2"/>
  <rect x="24" y="24" width="12" height="582" rx="6" fill="#62ff9b"/>
  <style>
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .muted { fill: #729884; }
    .body { fill: #eefcf4; }
    .accent { fill: #62ff9b; }
    .warn { fill: #efbf65; }
  </style>
  <text x="72" y="82" class="mono accent" font-size="31" font-weight="800">${escapeXml(title)}</text>
  <text x="1128" y="82" class="mono muted" font-size="17" text-anchor="end">${escapeXml(`${view.date} · BATCH ${view.batch}`)}</text>
  <line x1="72" y1="114" x2="1128" y2="114" stroke="#24533a" stroke-width="2"/>

  <text x="72" y="154" class="mono warn" font-size="17">${escapeXml(`LOCAL-ONLY CULTURE #${view.cultureId}`)}</text>
  <text x="76" y="208" class="mono body" font-size="22" xml:space="preserve">${artLines}</text>
  <text x="72" y="454" class="mono muted" font-size="15">${escapeXml(localized(lang, "它没有战力，只有可追责性。", "It has no combat power, only auditability."))}</text>

  ${fields
    .map(
      ([label, value], index) => `<text x="590" y="${150 + index * 74}" class="mono muted" font-size="14">${escapeXml(label)}</text>
  <text x="590" y="${179 + index * 74}" class="mono ${index === 4 ? "warn" : "body"}" font-size="${index === 4 ? 17 : 18}">${escapeXml(value)}</text>`,
    )
    .join("\n  ")}

  <line x1="72" y1="544" x2="1128" y2="544" stroke="#24533a" stroke-width="2"/>
  <text x="72" y="574" class="mono muted" font-size="15">${escapeXml(privacy)}</text>
  <text x="1128" y="596" class="mono muted" font-size="14" text-anchor="end">anti-ai · github.com/ppxu/anti-ai</text>
</svg>
`;
}

function renderCompanionShareSvg(view, lang = "zh") {
  const title = localized(lang, "伴生异物档案", "SYMBIOTIC COMPANION");
  const privacy = localized(
    lang,
    "本地模式：无对话、路径、模型名或精确 Token",
    "LOCAL-ONLY: no chats, paths, model names, or exact tokens",
  );
  const artLines = view.art
    .map(
      (line, index) =>
        `<tspan x="76" dy="${index === 0 ? 0 : 31}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const fields = [
    [localized(lang, "类型 / 稀有度", "TYPE / RARITY"), `${view.type} · ${view.rarity}`],
    [localized(lang, "阶段", "STAGE"), view.stage],
    [localized(lang, "路线", "ROUTE"), view.route],
    [localized(lang, "行为印记", "IMPRINTS"), view.imprints],
    [localized(lang, "封存异常", "ANOMALIES"), view.anomalies],
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(privacy)}</desc>
  <rect width="1200" height="630" rx="28" fill="#0d0a12"/>
  <rect x="24" y="24" width="1152" height="582" rx="20" fill="none" stroke="#52325f" stroke-width="2"/>
  <rect x="24" y="24" width="12" height="582" rx="6" fill="#d37cff"/>
  <style>
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .muted { fill: #967fa0; }
    .body { fill: #fff4ff; }
    .accent { fill: #d37cff; }
    .warn { fill: #ffca6b; }
  </style>
  <text x="72" y="82" class="mono accent" font-size="31" font-weight="800">${escapeXml(title)}</text>
  <text x="1128" y="82" class="mono muted" font-size="17" text-anchor="end">${escapeXml(view.date)}</text>
  <line x1="72" y1="114" x2="1128" y2="114" stroke="#52325f" stroke-width="2"/>

  <text x="72" y="154" class="mono warn" font-size="17">${escapeXml(`LOCAL-ONLY COMPANION #${view.cultureId}`)}</text>
  <text x="76" y="208" class="mono body" font-size="22" xml:space="preserve">${artLines}</text>
  <text x="72" y="486" class="mono muted" font-size="15">${escapeXml(localized(lang, "它不加战力，只替你的工作方式作证。", "No combat bonus. It only testifies about how you work."))}</text>

  ${fields
    .map(
      ([label, value], index) => `<text x="590" y="${150 + index * 74}" class="mono muted" font-size="14">${escapeXml(label)}</text>
  <text x="590" y="${179 + index * 74}" class="mono ${index === 4 ? "warn" : "body"}" font-size="${index === 4 ? 17 : 18}">${escapeXml(value)}</text>`,
    )
    .join("\n  ")}

  <line x1="72" y1="544" x2="1128" y2="544" stroke="#52325f" stroke-width="2"/>
  <text x="72" y="574" class="mono muted" font-size="15">${escapeXml(privacy)}</text>
  <text x="1128" y="596" class="mono muted" font-size="14" text-anchor="end">anti-ai · github.com/ppxu/anti-ai</text>
</svg>
`;
}

function renderHabitatShareSvg(habitat, labels, lang = "zh") {
  const title = localized(lang, "今日生态快照", "LIVING HABITAT SNAPSHOT");
  const privacy = localized(
    lang,
    "只读模式：无对话、路径、模型名或精确 Token",
    "READ-ONLY: no chats, paths, model names, or exact tokens",
  );
  const scene = presentHabitatScene(habitat.scene, lang);
  const phenotype = collectionPhenotypeCopy(
    habitat.specimen.collectionPhenotype,
    lang,
  );
  const sceneArt = scene.art
    .map(
      (line, index) =>
        `<tspan x="72" dy="${index === 0 ? 0 : 19}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const specimenArt = habitat.specimen.art
    .map(
      (line, index) =>
        `<tspan x="72" dy="${index === 0 ? 0 : 18}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const companionLines = habitat.companion?.art ?? [
    localized(lang, "      [ 空置伴生位 ]", "      [ UNBONDED BAY ]"),
    "",
    "  anti-ai lab bond <culture-id>",
  ];
  const companionArt = companionLines
    .map(
      (line, index) =>
        `<tspan x="626" dy="${index === 0 ? 0 : 18}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const relationship = habitat.relationship
    ? habitatRelationshipCopy(habitat.relationship.id, lang)
    : null;
  const decorationText =
    habitat.decorations
      .map((entry) => {
        const copy = habitatDecorationCopy(entry.id, lang);
        return `${copy.glyph} ${copy.name}`;
      })
      .join("  ·  ") ||
    localized(lang, "尚无生态痕迹", "NO ECOLOGICAL TRACES");
  const cabinetText = (habitat.cabinet?.featured ?? [])
    .map((key, index) => `${index + 1}. ${String(key).replace(":", " #")}`)
    .join("  ·  ");
  const displayLabel = cabinetText
    ? localized(lang, "后果陈列柜", "CONSEQUENCE CABINET")
    : localized(lang, "生态痕迹", "ECOLOGICAL TRACES");
  const displayText = cabinetText || decorationText;
  const relationName =
    relationship?.name ??
    localized(lang, "未建立伴生关系", "NO SYMBIOTIC BOND");
  const relationDetail = relationship
    ? habitatDuoTitle(
        habitat.relationship.routeId,
        habitat.relationship.titleId,
        lang,
      )
    : "anti-ai lab bond <culture-id>";
  const traceText = scene.layers.trace
    ? `${scene.layers.trace.label} · ${scene.layers.trace.date}`
    : localized(lang, "尚无近期痕迹", "NO RECENT TRACE");
  const sceneColor = {
    pollution: "#ff7b72",
    clarity: "#6dd6e7",
    paradox: "#f1c66f",
  }[scene.routeId] ?? "#78e0aa";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(privacy)}</desc>
  <rect width="1200" height="630" rx="28" fill="#090d0c"/>
  <rect x="24" y="24" width="1152" height="582" rx="20" fill="none" stroke="#345247" stroke-width="2"/>
  <rect x="24" y="24" width="12" height="582" rx="6" fill="${sceneColor}"/>
  <style>
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .muted { fill: #7e9a90; }
    .body { fill: #edf8f4; }
    .accent { fill: #78e0aa; }
    .scene { fill: ${sceneColor}; }
    .warn { fill: #f1c66f; }
  </style>
  <text x="72" y="78" class="mono accent" font-size="31" font-weight="800">${escapeXml(title)}</text>
  <text x="1128" y="78" class="mono muted" font-size="17" text-anchor="end">${escapeXml(habitat.date)}</text>
  <text x="72" y="108" class="mono muted" font-size="15">${escapeXml(localized(lang, `第 ${habitat.specimen.generation} 世代 · 阅历 ${habitat.specimen.experienceDays} 天 · ${scene.cycle}`, `GENERATION ${habitat.specimen.generation} · ${habitat.specimen.experienceDays} EXPERIENCE DAYS · ${scene.cycle}`))}</text>
  <line x1="72" y1="122" x2="1128" y2="122" stroke="#345247" stroke-width="2"/>

  <text x="72" y="148" class="mono scene" font-size="16" font-weight="700">${escapeXml(`${localized(lang, "活体场景", "LIVING SCENE")} · ${scene.name} · ${scene.climate}`)}</text>
  <text x="72" y="174" class="mono scene" font-size="14" xml:space="preserve">${sceneArt}</text>
  <text x="626" y="148" class="mono muted" font-size="14">${escapeXml(localized(lang, "生态短讯", "HABITAT BULLETIN"))}</text>
  <text x="626" y="174" class="mono body" font-size="15">${svgTextTspans(scene.bulletin, 626, 55, 2, 21)}</text>
  <text x="626" y="224" class="mono muted" font-size="13">${escapeXml(`${displayLabel} · ${truncateSvgText(displayText, 62)}`)}</text>
  <line x1="72" y1="250" x2="1128" y2="250" stroke="#345247" stroke-width="2"/>

  <text x="72" y="278" class="mono warn" font-size="14">${escapeXml(truncateSvgText(`${localized(lang, "标本", "SPECIMEN")} #${habitat.specimen.id} · ${labels.specimenStage}${phenotype ? ` · ${phenotype.name} T${phenotype.tier}` : ""}`, 64))}</text>
  <text x="72" y="306" class="mono body" font-size="13" xml:space="preserve">${specimenArt}</text>

  <text x="626" y="278" class="mono warn" font-size="14">${escapeXml(`${localized(lang, "伴生位", "COMPANION BAY")} · ${labels.companionStage}`)}</text>
  <text x="626" y="306" class="mono body" font-size="13" xml:space="preserve">${companionArt}</text>

  <line x1="72" y1="466" x2="1128" y2="466" stroke="#345247" stroke-width="2"/>
  <text x="72" y="494" class="mono muted" font-size="13">${escapeXml(localized(lang, "关系诊断", "RELATIONSHIP DIAGNOSIS"))}</text>
  <text x="72" y="520" class="mono warn" font-size="15">${escapeXml(truncateSvgText(`${relationName} · ${relationDetail}`, 64))}</text>
  <text x="626" y="494" class="mono muted" font-size="13">${escapeXml(localized(lang, "近期痕迹", "RECENT TRACE"))}</text>
  <text x="626" y="520" class="mono scene" font-size="15">${escapeXml(traceText)}</text>

  <line x1="72" y1="552" x2="1128" y2="552" stroke="#345247" stroke-width="2"/>
  <text x="72" y="580" class="mono muted" font-size="14">${escapeXml(privacy)}</text>
  <text x="1128" y="580" class="mono muted" font-size="14" text-anchor="end">anti-ai · github.com/ppxu/anti-ai</text>
</svg>
`;
}

function renderExpeditionShareSvg(view, lang = "zh") {
  const title = localized(
    lang,
    "收容远征返航单",
    "CONTAINMENT EXPEDITION",
  );
  const privacy = localized(
    lang,
    "隐私模式：无对话、路径、模型名或精确 Token",
    "PRIVACY MODE: no chats, paths, model names, or exact tokens",
  );
  const eventLines = view.eventLog
    .slice(-3)
    .map(
      (event, index) =>
        `<text x="72" y="${420 + index * 28}" class="mono body" font-size="16">${escapeXml(truncateSvgText(`${String(event.step).padStart(2, "0")} · [${event.badge}] ${event.title} · ${event.body}`, 108))}</text>`,
    )
    .join("\n");
  const artifacts = view.artifacts.length > 0
    ? view.artifacts.join(" · ")
    : localized(lang, "空手返航", "EMPTY-HANDED");
  const destinationDescription = svgTextTspans(
    view.destinationDescription,
    72,
    48,
  );
  const latestEventBody = svgTextTspans(view.latestEvent.body, 620, 48);
  const diagnosisLabel = view.summary.endedAt
    ? localized(lang, "返航诊断", "RETURN DIAGNOSIS")
    : localized(lang, "远征诊断", "EXPEDITION DIAGNOSIS");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(privacy)}</desc>
  <rect width="1200" height="630" rx="28" fill="#090b12"/>
  <rect x="24" y="24" width="1152" height="582" rx="20" fill="none" stroke="#3d3863" stroke-width="2"/>
  <rect x="24" y="24" width="12" height="582" rx="6" fill="#a97cff"/>
  <style>
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .muted { fill: #8f8aa8; }
    .body { fill: #f4f0ff; }
    .accent { fill: #b995ff; }
    .warn { fill: #f0c66d; }
  </style>
  <text x="72" y="80" class="mono accent" font-size="31" font-weight="800">${escapeXml(title)}</text>
  <text x="1128" y="80" class="mono muted" font-size="18" text-anchor="end">${escapeXml(view.date)}</text>
  <text x="72" y="112" class="mono muted" font-size="15">#${escapeXml(view.expeditionId)} · ${escapeXml(view.status)}</text>
  <line x1="72" y1="132" x2="1128" y2="132" stroke="#3d3863" stroke-width="2"/>

  <text x="72" y="178" class="mono warn" font-size="22">${escapeXml(view.destination)}</text>
  <text x="72" y="210" class="mono muted" font-size="16">${destinationDescription}</text>
  <text x="72" y="264" class="mono accent" font-size="20">${escapeXml(view.rail)}</text>
  <text x="72" y="302" class="mono body" font-size="18">${escapeXml(localized(lang, `第 ${view.step} / ${view.totalSteps} 格`, `CELL ${view.step} / ${view.totalSteps}`))}</text>

  <text x="620" y="178" class="mono muted" font-size="15">${escapeXml(localized(lang, "最近事件", "LATEST EVENT"))}</text>
  <text x="620" y="210" class="mono warn" font-size="19">${escapeXml(`[${view.latestEvent.badge ?? ""}] ${view.latestEvent.title}`)}</text>
  <text x="620" y="242" class="mono body" font-size="16">${latestEventBody}</text>
  <text x="620" y="286" class="mono muted" font-size="15">${escapeXml(localized(lang, "返航清单", "RETURN MANIFEST"))}</text>
  <text x="620" y="316" class="mono body" font-size="16">${escapeXml(localized(lang, `临时状态 ${view.temporaryEffects} · 永久微调 ${view.permanentEffect ? 1 : 0} · 成就 ${view.achievements}`, `conditions ${view.temporaryEffects} · permanent ${view.permanentEffect ? 1 : 0} · achievements ${view.achievements}`))}</text>
  <text x="620" y="346" class="mono body" font-size="16">${escapeXml(truncateSvgText(artifacts, 48))}</text>

  <line x1="72" y1="364" x2="1128" y2="364" stroke="#3d3863" stroke-width="2"/>
  <text x="72" y="392" class="mono muted" font-size="15">${escapeXml(localized(lang, "事件轨迹", "EVENT TRAIL"))}</text>
  ${eventLines}
  <text x="72" y="520" class="mono muted" font-size="15">${escapeXml(diagnosisLabel)}</text>
  <text x="72" y="544" class="mono warn" font-size="15">${escapeXml(truncateSvgText(view.diagnosis, 116))}</text>
  <line x1="72" y1="558" x2="1128" y2="558" stroke="#3d3863" stroke-width="2"/>
  <text x="72" y="586" class="mono muted" font-size="14">${escapeXml(privacy)}</text>
  <text x="1128" y="586" class="mono muted" font-size="14" text-anchor="end">anti-ai · github.com/ppxu/anti-ai</text>
</svg>
`;
}

export {
  renderCompanionShareSvg,
  renderCultureShareSvg,
  renderCreatureCollectionShareSvg,
  renderDailyBriefingShareSvg,
  renderDossierShareSvg,
  renderEncounterShareSvg,
  renderExpeditionShareSvg,
  renderHabitatShareSvg,
  renderPathologyShareSvg,
  renderPrognosisShareSvg,
  renderShareSvg,
};
