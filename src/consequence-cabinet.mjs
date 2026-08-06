import { createHash } from "node:crypto";

import { localized } from "./shared.mjs";

const CABINET_SLOT_COUNT = 3;

const SECTION_TYPES = Object.freeze({
  forms: "form",
  achievements: "achievement",
  chromaticAbilities: "chromaticAbility",
  scars: "scar",
  habitatPhenomena: "habitatPhenomenon",
  expeditionArtifacts: "expeditionArtifact",
  expeditionAchievements: "expeditionAchievement",
  specimens: "specimen",
  foreignSpecimens: "foreignSpecimen",
  caseSlices: "caseSlice",
  incidentReports: "incidentReport",
  cultures: "culture",
  companions: "companion",
  fossils: "fossil",
});

const INTERACTION_COPY = Object.freeze({
  observe: {
    specimen: [
      ["它把呼吸频率调成了‘正在优化’，但没有任何东西变快。", "It renamed its breathing rate “optimization”; nothing became faster."],
      ["核心短暂熄灭，像一次没有发出去的请求。", "The core dimmed like a request that was never sent."],
      ["它盯着观察员，等待对方先承认谁更依赖谁。", "It stared back, waiting to see who would admit dependence first."],
    ],
    companion: [
      ["伴生物贴着舱壁装死，考勤系统仍判定它在线。", "The companion played dead against the glass; attendance still marked it online."],
      ["它把主标本掉下来的缓存壳登记成了共享资产。", "It registered shed cache shell as a shared asset."],
      ["两只生物同步眨眼，像一次没有结论的双人评审。", "Both organisms blinked together like a review with no conclusion."],
    ],
    cabinet: [
      ["陈列物没有变化；策展说明却又长了一段。", "The exhibit did not change; the curatorial note grew another paragraph."],
      ["展柜反光里多出一只未登记的观察员。", "An unregistered observer appeared in the cabinet reflection."],
      ["标签仍写着‘后果’，看起来却越来越像履历。", "The label still says “consequence”; it increasingly resembles a résumé."],
    ],
  },
  contact: {
    glass: [
      ["你敲了敲玻璃。它回敲三次，并提交了一份扩容申请。", "You tapped the glass. It tapped back three times and filed a scaling request."],
      ["舱壁留下一个指纹，标本立刻将其归档为外部依赖。", "A fingerprint remained; the specimen archived it as an external dependency."],
      ["它把接触解释成授权，并开始靠近下一层边界。", "It interpreted contact as authorization and approached the next boundary."],
    ],
    companion: [
      ["伴生物接受了接触，然后把责任转交给主标本。", "The companion accepted contact, then delegated responsibility to the specimen."],
      ["它绕着手指转了一圈，像在确认谁才是宠物。", "It circled the finger as if checking which one of you is the pet."],
      ["接触成功。双方对‘成功’的定义仍未对齐。", "Contact succeeded. Neither side agrees on what success means."],
    ],
    light: [
      ["灯光降低一档，舱内首次出现了可疑的安静。", "The lights dropped one level; suspicious quiet appeared in the habitat."],
      ["它追着光斑移动，把节能模式理解成了新任务。", "It chased the light spot and interpreted power saving as a new task."],
      ["照明闪了一下。标本把它称为一次视觉回归测试。", "The light flickered. The specimen called it a visual regression test."],
    ],
  },
});

function ensureConsequenceCabinetState(state) {
  state.cabinet ??= { version: 1, featured: [] };
  state.cabinet.version = 1;
  state.cabinet.featured ??= [];
  state.cabinet.featured = state.cabinet.featured
    .filter((entry) => typeof entry === "string")
    .slice(0, CABINET_SLOT_COUNT);
}

function collectionEntryKey(type, id) {
  return `${type}:${id}`;
}

function codexCollectionEntries(codex) {
  return Object.entries(SECTION_TYPES).flatMap(([sectionId, type]) =>
    (codex.sections[sectionId] ?? []).map((entry) => ({
      ...entry,
      type,
      sectionId,
      key: collectionEntryKey(type, entry.id),
      discovered: entry.discovered ?? true,
    })),
  );
}

function consequenceCabinetView(state, codex) {
  const entries = new Map(
    codexCollectionEntries(codex).map((entry) => [entry.key, entry]),
  );
  const featured = state.cabinet?.featured ?? [];
  return {
    slots: Array.from({ length: CABINET_SLOT_COUNT }, (_, index) => {
      const key = featured[index];
      const entry = entries.get(key);
      return entry?.discovered ? entry : null;
    }),
    interactions: { ...(state.days?.[codex.date]?.interactions ?? {}) },
  };
}

function featureCabinetEntry(state, codex, key) {
  const entry = codexCollectionEntries(codex).find(
    (candidate) => candidate.key === key,
  );
  if (!entry || !entry.discovered) return { error: "invalid" };
  ensureConsequenceCabinetState(state);
  state.cabinet.featured = [
    key,
    ...state.cabinet.featured.filter((candidate) => candidate !== key),
  ].slice(0, CABINET_SLOT_COUNT);
  return { value: consequenceCabinetView(state, codex) };
}

function interactionReactionId(state, date, kind, targetId) {
  const pool = INTERACTION_COPY[kind]?.[targetId] ?? [];
  if (pool.length === 0) return null;
  const digest = createHash("sha256")
    .update(`anti-ai-light-interaction-v1:${state.seed}:${date}:${kind}:${targetId}`)
    .digest();
  return digest.readUInt32BE(0) % pool.length;
}

function recordCabinetInteraction(state, date, kind, targetId, allowedTargets) {
  const day = state.days?.[date];
  if (!day) return { error: "date_not_settled" };
  day.interactions ??= {};
  if (day.interactions[kind]) {
    return { error: kind === "observe" ? "already_observed" : "already_contacted" };
  }
  if (!allowedTargets.includes(targetId)) return { error: "invalid" };
  const reactionId = interactionReactionId(state, date, kind, targetId);
  if (reactionId === null) return { error: "invalid" };
  const record = { targetId, reactionId };
  day.interactions[kind] = record;
  return { value: record };
}

function cabinetInteractionCopy(kind, record, lang = "zh") {
  const pair = INTERACTION_COPY[kind]?.[record?.targetId]?.[record?.reactionId];
  return pair ? localized(lang, ...pair) : "";
}

export {
  CABINET_SLOT_COUNT,
  cabinetInteractionCopy,
  codexCollectionEntries,
  consequenceCabinetView,
  ensureConsequenceCabinetState,
  featureCabinetEntry,
  recordCabinetInteraction,
};
