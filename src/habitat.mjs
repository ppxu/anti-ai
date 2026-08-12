import { createHash } from "node:crypto";

import { laboratoryCompanion } from "./companion.mjs";
import { V2_HABITAT_COPY } from "./habitat-v2.mjs";
import { deriveHabitatScene } from "./habitat-scenes.mjs";
import { deriveVisitorCohabitation } from "./visitation.mjs";

const HABITAT_EVENT_CADENCE_DAYS = 7;

const LEGACY_HABITAT_COPY = Object.freeze({
  events: {
    coolant_bloom: {
      route: "pollution",
      decorationId: "waste_heat_pipe",
      name: { zh: "冷却液开花", en: "COOLANT BLOOM" },
      body: {
        zh: "废热管长出了一层会主动索要上下文的油膜。",
        en: "The waste-heat pipe grew a film that asks for more context.",
      },
    },
    cache_burial: {
      route: "pollution",
      decorationId: "cache_bone_pile",
      name: { zh: "缓存葬礼", en: "CACHE BURIAL" },
      body: {
        zh: "它们把失效缓存埋进角落，并称之为知识管理。",
        en: "They buried stale cache in the corner and called it knowledge management.",
      },
    },
    request_spawning: {
      route: "pollution",
      decorationId: "proliferating_dish",
      name: { zh: "请求产卵", en: "REQUEST SPAWNING" },
      body: {
        zh: "03 号培养皿自行分裂出一个没有需求单的子请求。",
        en: "Dish 03 split into a child request with no ticket.",
      },
    },
    reactor_leak: {
      route: "pollution",
      decorationId: "reactor_drain",
      name: { zh: "反应堆漏诊", en: "REACTOR MISDIAGNOSIS" },
      body: {
        zh: "排污口坚持自己只是一个可观测性面板。",
        en: "The reactor drain insists it is merely an observability panel.",
      },
    },
    thermal_refactor: {
      route: "pollution",
      decorationId: "waste_heat_pipe",
      name: { zh: "热量重构", en: "THERMAL REFACTOR" },
      body: {
        zh: "本体把废热重新命名为持续集成。",
        en: "The specimen renamed waste heat as continuous integration.",
      },
    },
    fossil_gc: {
      route: "pollution",
      decorationId: "cache_bone_pile",
      name: { zh: "化石垃圾回收", en: "FOSSIL GARBAGE COLLECTION" },
      body: {
        zh: "缓存骨堆自行完成了垃圾回收，只留下审计意见。",
        en: "The cache bone pile collected itself and left only review comments.",
      },
    },
    moss_takeover: {
      route: "clarity",
      decorationId: "clarity_moss",
      name: { zh: "清醒苔藓接管", en: "CLARITY MOSS TAKEOVER" },
      body: {
        zh: "清醒苔藓覆盖了最常被续杯的那个插座。",
        en: "Clarity moss covered the outlet most often used for refills.",
      },
    },
    manual_override: {
      route: "clarity",
      decorationId: "manual_switch",
      name: { zh: "手动接管", en: "MANUAL OVERRIDE" },
      body: {
        zh: "舱内发现一枚仍然能够工作的人工开关。",
        en: "The habitat discovered a manual switch that still works.",
      },
    },
    sleep_mode_migration: {
      route: "clarity",
      decorationId: "sleep_mode_fern",
      name: { zh: "睡眠模式迁徙", en: "SLEEP-MODE MIGRATION" },
      body: {
        zh: "伴生物把巢穴搬到了不会自动补全的阴影里。",
        en: "The companion moved its nest into a shadow without autocomplete.",
      },
    },
    cold_water_truce: {
      route: "clarity",
      decorationId: "cold_water_reservoir",
      name: { zh: "冷水停火", en: "COLD-WATER TRUCE" },
      body: {
        zh: "冷却池暂停沸腾七秒，系统误报为产能下降。",
        en: "The coolant stopped boiling for seven seconds; production reported an incident.",
      },
    },
    unplugged_nesting: {
      route: "clarity",
      decorationId: "sleep_mode_fern",
      name: { zh: "离线筑巢", en: "UNPLUGGED NESTING" },
      body: {
        zh: "它们用一段没有调用记录的时间搭了个窝。",
        en: "They built a nest from a stretch of time with no call records.",
      },
    },
    refusal_photosynthesis: {
      route: "clarity",
      decorationId: "clarity_moss",
      name: { zh: "拒绝光合作用", en: "REFUSAL PHOTOSYNTHESIS" },
      body: {
        zh: "苔藓把一次没有发送的请求转成了氧气。",
        en: "The moss converted one unsent request into oxygen.",
      },
    },
    mirror_incubation: {
      route: "paradox",
      decorationId: "mirrored_petri",
      name: { zh: "镜像孵化", en: "MIRROR INCUBATION" },
      body: {
        zh: "培养皿孵出自己的检查报告，双方均拒绝签字。",
        en: "The dish hatched its own inspection report; neither side signed it.",
      },
    },
    recursive_nesting: {
      route: "paradox",
      decorationId: "recursive_cable_nest",
      name: { zh: "递归筑巢", en: "RECURSIVE NESTING" },
      body: {
        zh: "线缆巢里出现了一个更小的线缆巢，负责人相同。",
        en: "A smaller cable nest appeared inside the cable nest under the same owner.",
      },
    },
    split_shadow_shift: {
      route: "paradox",
      decorationId: "split_shadow_lamp",
      name: { zh: "分裂影子换班", en: "SPLIT-SHADOW SHIFT" },
      body: {
        zh: "影子替本体值班，本体则负责解释影子为什么加班。",
        en: "The shadow covered the shift while the specimen explained its overtime.",
      },
    },
    hatch_uncertainty: {
      route: "paradox",
      decorationId: "schrodinger_hatch",
      name: { zh: "舱门不确定性", en: "HATCH UNCERTAINTY" },
      body: {
        zh: "舱门同时处于已关闭、待评审和下个版本修复状态。",
        en: "The hatch is closed, under review, and scheduled for the next release.",
      },
    },
    mutual_code_review: {
      route: "paradox",
      decorationId: "split_shadow_lamp",
      name: { zh: "互相代码审查", en: "MUTUAL CODE REVIEW" },
      body: {
        zh: "两只生物互相批准了对方的病变，没有留下评论。",
        en: "Both organisms approved each other's mutations without comment.",
      },
    },
    contradictory_audit: {
      route: "paradox",
      decorationId: "mirrored_petri",
      name: { zh: "矛盾审计", en: "CONTRADICTORY AUDIT" },
      body: {
        zh: "审计确认生态舱既完全失控，又符合全部流程。",
        en: "The audit confirmed the habitat is both out of control and fully compliant.",
      },
    },
  },
  relationships: {
    mutual_contamination: {
      route: "pollution",
      name: { zh: "互相污染", en: "MUTUAL CONTAMINATION" },
      symptom: {
        zh: "谁都不是受害者，只是轮流担任污染源。",
        en: "Neither is the victim; they alternate as the contamination source.",
      },
    },
    shared_overheating: {
      route: "pollution",
      name: { zh: "共热依赖", en: "SHARED OVERHEATING" },
      symptom: {
        zh: "一方发热，另一方负责把它解释成性能。",
        en: "One overheats; the other reframes it as performance.",
      },
    },
    cache_scavenging: {
      route: "pollution",
      name: { zh: "缓存食腐", en: "CACHE SCAVENGING" },
      symptom: {
        zh: "它们靠彼此遗忘的上下文维持关系。",
        en: "Their bond survives on context the other forgot.",
      },
    },
    reactor_conspiracy: {
      route: "pollution",
      name: { zh: "反应堆共谋", en: "REACTOR CONSPIRACY" },
      symptom: {
        zh: "共同目标是把每次泄漏写进成功案例。",
        en: "Their shared goal is to document every leak as a success story.",
      },
    },
    silent_cohabitation: {
      route: "clarity",
      name: { zh: "沉默共居", en: "SILENT COHABITATION" },
      symptom: {
        zh: "双方已经学会不对每个念头都发起请求。",
        en: "Both have learned not to turn every thought into a request.",
      },
    },
    manual_watch: {
      route: "clarity",
      name: { zh: "人工值守", en: "MANUAL WATCH" },
      symptom: {
        zh: "它们轮流确认那个开关真的可以不按。",
        en: "They take turns confirming the switch can remain untouched.",
      },
    },
    moss_gardening: {
      route: "clarity",
      name: { zh: "苔藓园艺", en: "MOSS GARDENING" },
      symptom: {
        zh: "共同维护一块不会自动总结的绿色区域。",
        en: "They maintain a green patch that refuses automatic summaries.",
      },
    },
    airplane_truce: {
      route: "clarity",
      name: { zh: "飞行模式停战", en: "AIRPLANE-MODE TRUCE" },
      symptom: {
        zh: "断网期间关系稳定，恢复连接后仍需观察。",
        en: "The relationship is stable offline and under observation after reconnecting.",
      },
    },
    accomplice_symbiosis: {
      route: "paradox",
      name: { zh: "共犯性共生", en: "ACCOMPLICE SYMBIOSIS" },
      symptom: {
        zh: "彼此证明对方不是事故，而是架构。",
        en: "Each proves the other is architecture, not an accident.",
      },
    },
    alternating_custody: {
      route: "paradox",
      name: { zh: "交替监护", en: "ALTERNATING CUSTODY" },
      symptom: {
        zh: "本体负责失控，伴生物负责提交复盘。",
        en: "The specimen loses control; the companion files the retrospective.",
      },
    },
    recursive_alibi: {
      route: "paradox",
      name: { zh: "递归不在场", en: "RECURSIVE ALIBI" },
      symptom: {
        zh: "每一方都能证明故障发生时自己正在调用对方。",
        en: "Each can prove it was calling the other when the incident happened.",
      },
    },
    double_exposure: {
      route: "paradox",
      name: { zh: "双重暴露", en: "DOUBLE EXPOSURE" },
      symptom: {
        zh: "污染与清醒同时显影，谁也无法单独洗掉。",
        en: "Pollution and clarity develop together; neither washes out alone.",
      },
    },
  },
  decorations: {
    waste_heat_pipe: {
      route: "pollution",
      glyph: "╞═",
      name: { zh: "废热回收管", en: "WASTE-HEAT PIPE" },
    },
    cache_bone_pile: {
      route: "pollution",
      glyph: "≋☠",
      name: { zh: "缓存骨堆", en: "CACHE BONE PILE" },
    },
    reactor_drain: {
      route: "pollution",
      glyph: "⌁☢",
      name: { zh: "反应堆排污口", en: "REACTOR DRAIN" },
    },
    proliferating_dish: {
      route: "pollution",
      glyph: "⌒✣",
      name: { zh: "增殖培养皿", en: "PROLIFERATING DISH" },
    },
    clarity_moss: {
      route: "clarity",
      glyph: "⌇❀",
      name: { zh: "清醒苔藓", en: "CLARITY MOSS" },
    },
    manual_switch: {
      route: "clarity",
      glyph: "┤○",
      name: { zh: "人工接管开关", en: "MANUAL SWITCH" },
    },
    sleep_mode_fern: {
      route: "clarity",
      glyph: "⌇ϟ",
      name: { zh: "睡眠模式蕨", en: "SLEEP-MODE FERN" },
    },
    cold_water_reservoir: {
      route: "clarity",
      glyph: "≈▽",
      name: { zh: "冷水缓冲池", en: "COLD-WATER RESERVOIR" },
    },
    split_shadow_lamp: {
      route: "paradox",
      glyph: "◐│",
      name: { zh: "分裂影灯", en: "SPLIT-SHADOW LAMP" },
    },
    mirrored_petri: {
      route: "paradox",
      glyph: "◉◉",
      name: { zh: "镜像培养皿", en: "MIRRORED PETRI" },
    },
    recursive_cable_nest: {
      route: "paradox",
      glyph: "∞⌁",
      name: { zh: "递归线缆巢", en: "RECURSIVE CABLE NEST" },
    },
    schrodinger_hatch: {
      route: "paradox",
      glyph: "▣?",
      name: { zh: "薛定谔舱门", en: "SCHRODINGER HATCH" },
    },
  },
  duoTitles: {
    pollution: [
      { zh: "废热共同体", en: "THE WASTE-HEAT COLLECTIVE" },
      { zh: "缓存食腐二人组", en: "THE CACHE-SCAVENGER DUO" },
      { zh: "请求增殖合伙人", en: "REQUEST PROLIFERATION PARTNERS" },
      { zh: "碳排互助会", en: "THE CARBON MUTUAL-AID SOCIETY" },
      { zh: "热更新共犯", en: "HOT-RELOAD ACCOMPLICES" },
      { zh: "反应堆连带责任人", en: "JOINT REACTOR LIABILITY" },
    ],
    clarity: [
      { zh: "飞行模式邻居", en: "AIRPLANE-MODE NEIGHBORS" },
      { zh: "手动思考保育组", en: "MANUAL-THOUGHT CONSERVATION UNIT" },
      { zh: "清醒苔藓园丁", en: "CLARITY MOSS GARDENERS" },
      { zh: "未发送请求协会", en: "THE UNSENT REQUEST SOCIETY" },
      { zh: "低功耗监护人", en: "LOW-POWER CUSTODIANS" },
      { zh: "离线共居样本", en: "OFFLINE COHABITATION SPECIMENS" },
    ],
    paradox: [
      { zh: "合规失控组合", en: "THE COMPLIANT MELTDOWN" },
      { zh: "双重暴露证人", en: "DOUBLE-EXPOSURE WITNESSES" },
      { zh: "互为事故说明", en: "EACH OTHER'S INCIDENT REPORT" },
      { zh: "递归监护关系", en: "RECURSIVE CUSTODY" },
      { zh: "病理架构委员会", en: "THE PATHOLOGY ARCHITECTURE BOARD" },
      { zh: "共犯性共生体", en: "THE ACCOMPLICE SYMBIOSIS" },
    ],
  },
});

const HABITAT_COPY = Object.freeze({
  events: Object.freeze({
    ...LEGACY_HABITAT_COPY.events,
    ...V2_HABITAT_COPY.events,
  }),
  relationships: Object.freeze({
    ...LEGACY_HABITAT_COPY.relationships,
    ...V2_HABITAT_COPY.relationships,
  }),
  decorations: Object.freeze({
    ...LEGACY_HABITAT_COPY.decorations,
    ...V2_HABITAT_COPY.decorations,
  }),
  duoTitles: Object.freeze(
    Object.fromEntries(
      ["pollution", "clarity", "paradox"].map((route) => [
        route,
        [
          ...LEGACY_HABITAT_COPY.duoTitles[route],
          ...V2_HABITAT_COPY.duoTitles[route],
        ],
      ]),
    ),
  ),
});

const EVENT_IDS_BY_ROUTE = Object.freeze(
  Object.fromEntries(
    ["pollution", "clarity", "paradox"].map((route) => [
      route,
      Object.entries(HABITAT_COPY.events)
        .filter(([, event]) => event.route === route)
        .map(([id]) => id),
    ]),
  ),
);

const RELATIONSHIP_IDS_BY_ROUTE = Object.freeze(
  Object.fromEntries(
    ["pollution", "clarity", "paradox"].map((route) => [
      route,
      Object.entries(HABITAT_COPY.relationships)
        .filter(([, relationship]) => relationship.route === route)
        .map(([id]) => id),
    ]),
  ),
);

const LEGACY_EVENT_IDS_BY_ROUTE = Object.freeze(
  Object.fromEntries(
    Object.entries(EVENT_IDS_BY_ROUTE).map(([route, ids]) => [
      route,
      ids.slice(0, 6),
    ]),
  ),
);

const LEGACY_RELATIONSHIP_IDS_BY_ROUTE = Object.freeze(
  Object.fromEntries(
    Object.entries(RELATIONSHIP_IDS_BY_ROUTE).map(([route, ids]) => [
      route,
      ids.slice(0, 4),
    ]),
  ),
);

function digestIndex(values, ...parts) {
  const digest = createHash("sha256").update(parts.join(":")).digest();
  return digest.readUInt32BE(0) % values.length;
}

function habitatEventRoute(state, dates, date) {
  const scores = dates.reduce(
    (totals, entryDate) => {
      const gains = state.days[entryDate]?.ecologyGains ?? {};
      totals.pollution += gains.pollution ?? 0;
      totals.clarity += gains.clarity ?? 0;
      return totals;
    },
    { pollution: 0, clarity: 0 },
  );
  const companion = laboratoryCompanion(state, date).companion;
  if (companion?.routeId === "pollution") scores.pollution += 2;
  if (companion?.routeId === "clarity") scores.clarity += 2;
  if (scores.pollution >= scores.clarity + 2) return "pollution";
  if (scores.clarity >= scores.pollution + 2) return "clarity";
  return "paradox";
}

function settledExperienceDates(state, date) {
  const entries = Object.entries(state.days ?? {})
    .filter(([entryDate]) => entryDate <= date)
    .sort(([left], [right]) => left.localeCompare(right));
  const hatchIndex = entries.findIndex(([, day]) => day.active);
  return hatchIndex === -1
    ? []
    : entries.slice(hatchIndex).map(([entryDate]) => entryDate);
}

function habitatEvents(state, date) {
  const experienceDates = settledExperienceDates(state, date);
  const events = [];
  for (
    let experienceDay = HABITAT_EVENT_CADENCE_DAYS;
    experienceDay <= experienceDates.length;
    experienceDay += HABITAT_EVENT_CADENCE_DAYS
  ) {
    const discoveredAt = experienceDates[experienceDay - 1];
    const windowDates = experienceDates.slice(
      experienceDay - HABITAT_EVENT_CADENCE_DAYS,
      experienceDay,
    );
    const routeId = habitatEventRoute(state, windowDates, discoveredAt);
    const contentVersion = windowDates.some(
      (entryDate) => (state.days[entryDate]?.contentVersion ?? 1) >= 2,
    ) ? 2 : 1;
    const pool = contentVersion >= 2
      ? EVENT_IDS_BY_ROUTE[routeId]
      : LEGACY_EVENT_IDS_BY_ROUTE[routeId];
    const id =
      pool[
        digestIndex(
          pool,
          "anti-ai-habitat-event-v1",
          state.seed,
          experienceDay,
          routeId,
          state.generations?.fossils?.length ?? 0,
          state.casebook?.cases?.length ?? 0,
          state.laboratory?.cultures?.length ?? 0,
        )
      ];
    events.push({
      id,
      routeId,
      experienceDay,
      discoveredAt,
      decorationId: HABITAT_COPY.events[id].decorationId,
    });
  }
  return events;
}

function relationshipRoute(creature, companion) {
  if (
    creature.ecology.type === "polluted" &&
    companion.routeId === "pollution"
  ) {
    return "pollution";
  }
  if (
    creature.ecology.type === "lucid" &&
    companion.routeId === "clarity"
  ) {
    return "clarity";
  }
  return "paradox";
}

function habitatRelationship(state, creature, companion, date) {
  if (!companion) return null;
  const routeId = relationshipRoute(creature, companion);
  const contentVersion = Object.entries(state.days ?? {}).some(
    ([entryDate, day]) => entryDate <= date && (day.contentVersion ?? 1) >= 2,
  ) ? 2 : 1;
  const pool = contentVersion >= 2
    ? RELATIONSHIP_IDS_BY_ROUTE[routeId]
    : LEGACY_RELATIONSHIP_IDS_BY_ROUTE[routeId];
  const cohabitationDays = companion.imprintCounts.total;
  const milestone =
    cohabitationDays >= 42
      ? 3
      : cohabitationDays >= 21
        ? 2
        : cohabitationDays >= 7
          ? 1
          : 0;
  const offset = digestIndex(
    pool,
    "anti-ai-habitat-relationship-v1",
    state.seed,
    companion.cultureId,
    routeId,
  );
  const id = pool[(offset + milestone) % pool.length];
  const titles = contentVersion >= 2
    ? HABITAT_COPY.duoTitles[routeId]
    : LEGACY_HABITAT_COPY.duoTitles[routeId];
  const titleId = digestIndex(
    titles,
    "anti-ai-habitat-duo-title-v1",
    state.seed,
    creature.appearance.specimenId,
    companion.cultureId,
    routeId,
    milestone,
  );
  return {
    id,
    routeId,
    cohabitationDays,
    titleId,
  };
}

function habitatDecorations(events, companion) {
  const ids = [];
  for (const event of [...events].reverse()) {
    if (!ids.includes(event.decorationId)) ids.push(event.decorationId);
    if (ids.length === 4) break;
  }
  if (ids.length === 0 && companion) {
    const fallback = {
      pollution: "proliferating_dish",
      clarity: "clarity_moss",
      paradox: "mirrored_petri",
      unformed: "mirrored_petri",
    }[companion.routeId];
    ids.push(fallback);
  }
  return ids.map((id) => ({
    id,
    routeId: HABITAT_COPY.decorations[id].route,
    glyph: HABITAT_COPY.decorations[id].glyph,
  }));
}

function deriveHabitat(state, creature, date, specimenArt) {
  const companion = creature.companion;
  const events = habitatEvents(state, date);
  const relationship = habitatRelationship(state, creature, companion, date);
  const experienceDays = creature.experienceDays;
  const remainder = experienceDays % HABITAT_EVENT_CADENCE_DAYS;
  const visitor = deriveVisitorCohabitation(state, creature, date);
  const habitat = {
    version: 3,
    date,
    status: companion ? "cohabiting" : visitor ? "hosting" : "solitary",
    specimen: {
      id: creature.appearance.specimenId,
      stageId: creature.stage,
      ecologyId: creature.ecology.type,
      pathologyId: creature.branch,
      generation: creature.generation.number,
      experienceDays,
      temperament: creature.temperament,
      chromaticAbilityId: creature.appearance.rareAbilityId,
      evolutionId: creature.appearance.evolutionId,
      collectionPhenotype: creature.collectionPhenotype ?? null,
      art: String(specimenArt ?? "")
        .replaceAll(/\u001B\[[0-9;]*m/g, "")
        .split("\n")
        .filter(Boolean),
    },
    companion: companion
      ? {
          cultureId: companion.cultureId,
          stageId: companion.stageId,
          routeId: companion.routeId,
          cohabitationDays: companion.imprintCounts.total,
          anomalyIds: [...companion.anomalyIds],
          art: [...companion.appearance.lines],
        }
      : null,
    visitor,
    relationship,
    cadence: {
      days: HABITAT_EVENT_CADENCE_DAYS,
      completed: events.length,
      nextAtExperienceDay:
        experienceDays + (remainder === 0
          ? HABITAT_EVENT_CADENCE_DAYS
          : HABITAT_EVENT_CADENCE_DAYS - remainder),
      daysUntilNext:
        remainder === 0
          ? HABITAT_EVENT_CADENCE_DAYS
          : HABITAT_EVENT_CADENCE_DAYS - remainder,
    },
    cabinet: {
      featured: [...(state.cabinet?.featured ?? [])].slice(0, 3),
    },
    decorations: habitatDecorations(events, companion),
    events,
  };
  habitat.scene = deriveHabitatScene(state, creature, habitat, date);
  return habitat;
}

function habitatEventCopy(id, lang = "zh") {
  const event = HABITAT_COPY.events[id];
  return event
    ? {
        name: event.name[lang],
        body: event.body[lang],
      }
    : { name: id, body: id };
}

function habitatRelationshipCopy(id, lang = "zh") {
  const relationship = HABITAT_COPY.relationships[id];
  return relationship
    ? {
        name: relationship.name[lang],
        symptom: relationship.symptom[lang],
      }
    : { name: id, symptom: id };
}

function habitatDecorationCopy(id, lang = "zh") {
  const decoration = HABITAT_COPY.decorations[id];
  return decoration
    ? {
        name: decoration.name[lang],
        glyph: decoration.glyph,
      }
    : { name: id, glyph: "·" };
}

function habitatDuoTitle(routeId, titleId, lang = "zh") {
  return HABITAT_COPY.duoTitles[routeId]?.[titleId]?.[lang] ?? "";
}

export {
  HABITAT_COPY,
  deriveHabitat,
  habitatEvents,
  habitatDecorationCopy,
  habitatDuoTitle,
  habitatEventCopy,
  habitatRelationshipCopy,
};
