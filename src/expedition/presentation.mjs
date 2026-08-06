import {
  EXPEDITION_ACHIEVEMENT_DEFINITIONS,
  expeditionArtifact,
  expeditionDestination,
  expeditionEventCopy,
} from "./content.mjs";
import { creatureLabel } from "../creature.mjs";
import { localized } from "../shared.mjs";

const EVENT_PRESENTATION = Object.freeze({
  empty: {
    badge: ["静默格", "QUIET CELL"],
    category: "quiet",
    color: "gray",
  },
  observation: {
    badge: ["普通事件", "FIELD EVENT"],
    category: "field",
    color: "cyan",
  },
  condition: {
    badge: ["状态变动", "CONDITION SHIFT"],
    category: "mutation",
    color: "yellow",
  },
  ability: {
    badge: ["状态变动", "CONDITION SHIFT"],
    category: "mutation",
    color: "yellow",
  },
  choice: {
    badge: ["特殊事件", "SPECIAL EVENT"],
    category: "special",
    color: "magenta",
  },
  artifact: {
    badge: ["特殊事件", "SPECIAL EVENT"],
    category: "special",
    color: "magenta",
  },
  anomaly: {
    badge: ["特殊事件", "SPECIAL EVENT"],
    category: "special",
    color: "red",
  },
  companion: {
    badge: ["特殊事件", "SPECIAL EVENT"],
    category: "special",
    color: "magenta",
  },
});

const RETURN_DIAGNOSES = Object.freeze({
  active: [
    ["远征仍在继续；未知区域正在排队等待被误解。", "The run continues; the unknown is queuing to be misunderstood."],
    ["当前进度已封存，下一格仍保有制造麻烦的完整资格。", "Progress is sealed; the next cell retains full eligibility to cause trouble."],
    ["样本尚未返航，档案员已经提前建好了事故目录。", "The specimen has not returned; the archivist already created the incident folder."],
    ["远征暂停在一个可恢复、不可重抽的错误现场。", "The run is paused at a resumable, non-rerollable error scene."],
  ],
  abandoned: [
    ["样本主动终止了“再来一格”的企业文化。", "The specimen terminated the culture of JUST ONE MORE CELL."],
    ["远征提前结束，但放弃记录完成得非常完整。", "The run ended early; the abandonment paperwork is immaculate."],
    ["样本选择返航。未知区域对此表示遗憾，保险部门表示理解。", "The specimen returned. The unknown is disappointed; insurance understands."],
    ["这不是逃跑，是一次方向非常明确的风险重估。", "This was not retreat. It was highly directional risk reassessment."],
  ],
  artifacts: [
    ["返航舱的主要载荷是不必要、但已编号的证据。", "The return bay is loaded with unnecessary but properly numbered evidence."],
    ["它带回了污染样本，证明收藏癖也能穿实验服。", "It returned with contaminated samples, proving hoarding can wear a lab coat."],
    ["远征收获已入柜，生态舱继续把捡垃圾称作田野工作。", "The finds are catalogued; the habitat continues calling scavenging fieldwork."],
    ["行程产生了实物证据，因此所有错误突然显得更有学术价值。", "The run produced physical evidence, making every mistake look academic."],
  ],
  permanent: [
    ["地图没有改变，样本改变了；地图拒绝承担责任。", "The map is unchanged. The specimen is not. The map denies liability."],
    ["本次远征留下永久后遗症，已按“经验”归档。", "This run left a permanent aftereffect and filed it under EXPERIENCE."],
    ["十格路程结束，一项指标决定长期住下。", "Ten cells ended; one metric decided to move in permanently."],
    ["远征已返航，病理变化申请了无限期居留。", "The expedition returned; its pathology applied for indefinite residency."],
  ],
  routine: [
    ["十格均已封存。最稳定的收获仍然是流程本身。", "All ten cells are sealed. The most reliable reward remains the process itself."],
    ["没有英雄史诗，只有十条可以审计的后遗症。", "No heroic epic occurred, only ten auditable aftereffects."],
    ["样本完成了远征，并把随机事故整理成了工作经历。", "The specimen completed the run and converted random incidents into work experience."],
    ["返航成功。未知已被缩减为一份格式正确的记录。", "Return successful. The unknown has been reduced to a correctly formatted record."],
  ],
});

function expeditionStage(step, lang) {
  if (step <= 3) return localized(lang, "浅层采样", "SHALLOW SAMPLE");
  if (step <= 7) return localized(lang, "污染腹地", "CONTAMINATED INTERIOR");
  return localized(lang, "返航窗口", "RETURN WINDOW");
}

function effectView(effect, lang) {
  if (!effect) return null;
  return {
    abilityId: effect.abilityId,
    ability: creatureLabel("abilities", effect.abilityId, lang),
    delta: effect.delta,
    duration: effect.duration ?? "permanent",
    durationLabel: (effect.duration ?? "permanent") === "permanent"
      ? localized(lang, "永久", "PERMANENT")
      : localized(lang, "本局", "THIS RUN"),
    named: Boolean(effect.named),
  };
}

function expeditionEventView(record, event, lang = "zh") {
  const copy = expeditionEventCopy(event, lang);
  const presentation = EVENT_PRESENTATION[event.type] ?? EVENT_PRESENTATION.observation;
  const artifact = event.artifactId ? expeditionArtifact(event.artifactId) : null;
  return {
    step: event.step,
    type: event.type,
    badge: localized(lang, ...presentation.badge),
    category: presentation.category,
    color: presentation.color,
    special: presentation.category === "special",
    stage: expeditionStage(event.step, lang),
    title: copy.title,
    body: copy.body,
    system: localized(
      lang,
      `系统记录 · 第 ${event.step} 格 · ${expeditionStage(event.step, lang)} · 已封存`,
      `SYSTEM LOG · CELL ${event.step} · ${expeditionStage(event.step, lang)} · SEALED`,
    ),
    effect: effectView(event.effect, lang),
    artifact: artifact
      ? {
          id: artifact.id,
          name: artifact.name[lang],
          rarity: artifact.rarity,
        }
      : null,
    resolved: event.resolved ?? null,
  };
}

function deterministicDiagnosis(record, lang) {
  const category = record.status === "active"
    ? "active"
    : record.status === "abandoned"
    ? "abandoned"
    : record.artifactIds.length > 0
      ? "artifacts"
      : record.permanentEffect
        ? "permanent"
        : "routine";
  const candidates = RETURN_DIAGNOSES[category];
  const index = [...record.id].reduce(
    (total, character) => total + character.codePointAt(0),
    0,
  ) % candidates.length;
  return localized(lang, ...candidates[index]);
}

function temporaryEffectNote(record, lang) {
  const count = record.temporaryEffects.length;
  if (record.status === "active") {
    return count > 0
      ? localized(
          lang,
          `${count} 项临时状态仍在本局生效。`,
          `${count} temporary condition(s) remain active for this run.`,
        )
      : localized(
          lang,
          "当前没有临时状态。",
          "No temporary conditions are currently active.",
        );
  }
  return count > 0
    ? localized(
        lang,
        `${count} 项临时状态已在返航时失效。`,
        `${count} temporary condition(s) expired on return.`,
      )
    : localized(
        lang,
        "没有临时状态需要带回。",
        "No temporary conditions survived the paperwork.",
      );
}

function expeditionReturnSummary(record, lang = "zh") {
  const destination = expeditionDestination(record.destinationId);
  const eventViews = record.events.map((event) =>
    expeditionEventView(record, event, lang));
  const byType = Object.fromEntries(
    Object.keys(EVENT_PRESENTATION).map((type) => [
      type,
      record.events.filter((event) => event.type === type).length,
    ]),
  );
  const achievementsById = new Map(
    EXPEDITION_ACHIEVEMENT_DEFINITIONS.map((entry) => [entry.id, entry]),
  );
  return {
    id: record.id,
    destination: {
      id: destination.id,
      name: destination.name[lang],
      description: destination.description[lang],
    },
    status: {
      active: localized(lang, "进行中", "ACTIVE"),
      completed: localized(lang, "已返航", "RETURNED"),
      abandoned: localized(lang, "提前返航", "ABANDONED"),
    }[record.status],
    startedAt: record.startedAt,
    endedAt: record.completedAt ?? record.abandonedAt ?? null,
    step: record.step,
    totalSteps: record.totalSteps,
    rail: expeditionRail(record),
    events: {
      total: eventViews.length,
      special: eventViews.filter(({ special }) => special).length,
      mutations: eventViews.filter(({ category }) => category === "mutation").length,
      byType,
    },
    recentEvents: eventViews.slice(-3),
    keyEvents: eventViews.filter(({ category }) => category !== "quiet").slice(-5),
    temporaryEffects: record.temporaryEffects.map((effect) => effectView(
      { ...effect, duration: "expedition" },
      lang,
    )),
    temporaryEffectNote: temporaryEffectNote(record, lang),
    permanentEffect: effectView(record.permanentEffect, lang),
    artifacts: record.artifactIds.map((id) => {
      const artifact = expeditionArtifact(id);
      return artifact
        ? { id, name: artifact.name[lang], rarity: artifact.rarity }
        : { id, name: id, rarity: "unknown" };
    }),
    achievements: record.achievementIds.map((id) => {
      const achievement = achievementsById.get(id);
      return achievement
        ? { id, name: achievement.name[lang], rarity: achievement.rarity }
        : { id, name: id, rarity: "unknown" };
    }),
    diagnosis: deterministicDiagnosis(record, lang),
  };
}

function expeditionRail(record) {
  const cursor = Math.max(1, record.step);
  return Array.from({ length: record.totalSteps }, (_, index) => {
    const cell = index + 1;
    if (record.status === "completed" || cell < cursor) return "[✓]";
    if (cell === cursor) return "[@]";
    return "[?]";
  }).join("─");
}

function expeditionShareView(record, lang = "zh") {
  const summary = expeditionReturnSummary(record, lang);
  const destination = expeditionDestination(record.destinationId);
  const latestEvent = record.events.at(-1) ?? null;
  const latestEventView = latestEvent
    ? expeditionEventView(record, latestEvent, lang)
    : null;
  const endedAt = record.completedAt ?? record.abandonedAt ?? record.startedAt;
  return {
    date: endedAt,
    expeditionId: record.id,
    destination: destination.name[lang],
    destinationDescription: destination.description[lang],
    status: {
      active: localized(lang, "进行中", "ACTIVE"),
      completed: localized(lang, "已返航", "RETURNED"),
      abandoned: localized(lang, "提前返航", "ABANDONED"),
    }[record.status],
    step: record.step,
    totalSteps: record.totalSteps,
    rail: expeditionRail(record),
    latestEvent: latestEventView
      ? latestEventView
      : {
          type: "empty",
          badge: localized(lang, "静默格", "QUIET CELL"),
          title: localized(lang, "尚未进入", "NOT ENTERED"),
          body: localized(
            lang,
            "第一格仍在等待成为既成事实。",
            "Cell one is still waiting to become documented fact.",
          ),
        },
    eventLog: record.events.slice(-5).map((event) =>
      expeditionEventView(record, event, lang)),
    temporaryEffects: record.temporaryEffects.length,
    permanentEffect: record.permanentEffect,
    artifacts: record.artifactIds.map((id) => expeditionArtifact(id)?.name[lang] ?? id),
    achievements: record.achievementIds.length,
    achievementNames: summary.achievements.map(({ name }) => name),
    diagnosis: summary.diagnosis,
    summary,
  };
}

export {
  expeditionEventView,
  expeditionRail,
  expeditionReturnSummary,
  expeditionShareView,
};
