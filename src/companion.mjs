import { createHash } from "node:crypto";

const COMPANION_STAGE_THRESHOLDS = {
  culture: 0,
  parasite: 1,
  symbiote: 7,
  accomplice: 21,
};
const COMPANION_ANOMALY_POOLS = {
  pollution: [
    "reactor_drool",
    "request_mitosis",
    "cache_hives",
    "carbon_breath",
    "hot_reload_fever",
    "invoice_whiskers",
    "instruction_drool",
    "retry_scales",
    "gpu_hiccups",
  ],
  clarity: [
    "withdrawal_halo",
    "airplane_whiskers",
    "sleepwalking_shell",
    "manual_override",
    "decaf_membrane",
    "unsent_purr",
    "analog_antenna",
    "quiet_paws",
    "weekend_molt",
  ],
  paradox: [
    "recursive_purr",
    "split_shadow",
    "double_booking",
    "mirror_molt",
    "schrodinger_tail",
    "compliance_fangs",
    "dual_reality_eyes",
    "rollback_prophecy",
    "synchronized_absence",
  ],
};
const COMPANION_COPY = {
  stages: {
    culture: { zh: "培养物", en: "POLLUTION CULTURE" },
    parasite: { zh: "寄生幼体", en: "PARASITIC HATCHLING" },
    symbiote: { zh: "共生异形", en: "SYMBIOTIC ABERRATION" },
    accomplice: { zh: "共犯器官", en: "ACCOMPLICE ORGAN" },
  },
  routes: {
    unformed: { zh: "未分化", en: "UNFORMED" },
    pollution: { zh: "污染寄生", en: "POLLUTION PARASITE" },
    clarity: { zh: "清醒寄生", en: "CLARITY PARASITE" },
    paradox: { zh: "悖论共生", en: "PARADOX SYMBIOSIS" },
  },
  anomalies: {
    reactor_drool: { zh: "反应堆流涎", en: "REACTOR DROOL" },
    request_mitosis: { zh: "请求有丝分裂", en: "REQUEST MITOSIS" },
    cache_hives: { zh: "缓存荨麻疹", en: "CACHE HIVES" },
    carbon_breath: { zh: "碳排口臭", en: "CARBON BREATH" },
    hot_reload_fever: { zh: "热更新高烧", en: "HOT-RELOAD FEVER" },
    invoice_whiskers: { zh: "账单胡须", en: "INVOICE WHISKERS" },
    instruction_drool: { zh: "指令流涎", en: "INSTRUCTION DROOL" },
    retry_scales: { zh: "重试鳞", en: "RETRY SCALES" },
    gpu_hiccups: { zh: "GPU 打嗝", en: "GPU HICCUPS" },
    withdrawal_halo: { zh: "戒断光环", en: "WITHDRAWAL HALO" },
    airplane_whiskers: { zh: "飞行模式触须", en: "AIRPLANE-MODE WHISKERS" },
    sleepwalking_shell: { zh: "梦游甲壳", en: "SLEEPWALKING SHELL" },
    manual_override: { zh: "人工接管反射", en: "MANUAL-OVERRIDE REFLEX" },
    decaf_membrane: { zh: "低因膜", en: "DECAF MEMBRANE" },
    unsent_purr: { zh: "未发送呼噜", en: "UNSENT PURR" },
    analog_antenna: { zh: "模拟触角", en: "ANALOG ANTENNA" },
    quiet_paws: { zh: "安静爪", en: "QUIET PAWS" },
    weekend_molt: { zh: "周末蜕皮", en: "WEEKEND MOLT" },
    recursive_purr: { zh: "递归呼噜", en: "RECURSIVE PURR" },
    split_shadow: { zh: "分裂影子", en: "SPLIT SHADOW" },
    double_booking: { zh: "双重占用症", en: "DOUBLE BOOKING" },
    mirror_molt: { zh: "镜像蜕皮", en: "MIRROR MOLT" },
    schrodinger_tail: { zh: "薛定谔尾巴", en: "SCHRODINGER TAIL" },
    compliance_fangs: { zh: "合规獠牙", en: "COMPLIANCE FANGS" },
    dual_reality_eyes: { zh: "双现实复眼", en: "DUAL-REALITY EYES" },
    rollback_prophecy: { zh: "回滚预言", en: "ROLLBACK PROPHECY" },
    synchronized_absence: { zh: "同步缺席", en: "SYNCHRONIZED ABSENCE" },
  },
};

function companionLabel(section, id, lang = "zh") {
  return COMPANION_COPY[section]?.[id]?.[lang] ?? id;
}

function companionStage(imprintDays) {
  if (imprintDays >= COMPANION_STAGE_THRESHOLDS.accomplice) {
    return "accomplice";
  }
  if (imprintDays >= COMPANION_STAGE_THRESHOLDS.symbiote) {
    return "symbiote";
  }
  if (imprintDays >= COMPANION_STAGE_THRESHOLDS.parasite) {
    return "parasite";
  }
  return "culture";
}

function nextCompanionStageAt(stageId) {
  if (stageId === "culture") return COMPANION_STAGE_THRESHOLDS.parasite;
  if (stageId === "parasite") return COMPANION_STAGE_THRESHOLDS.symbiote;
  if (stageId === "symbiote") return COMPANION_STAGE_THRESHOLDS.accomplice;
  return null;
}

function companionImprintCounts(companion) {
  const counts = {
    pollution: 0,
    clarity: 0,
    neutral: 0,
    total: 0,
  };
  for (const imprint of Object.values(companion.imprints ?? {})) {
    if (Object.hasOwn(counts, imprint)) counts[imprint] += 1;
    counts.total += 1;
  }
  return counts;
}

function companionRoute(counts) {
  if (counts.total === 0) return "unformed";
  if (counts.pollution >= counts.clarity + 3) return "pollution";
  if (counts.clarity >= counts.pollution + 3) return "clarity";
  return "paradox";
}

function companionAnomaly(culture, threshold, routeId, existing) {
  const pool = COMPANION_ANOMALY_POOLS[routeId];
  const digest = createHash("sha256")
    .update(`${culture.id}:${threshold}:${routeId}:companion-anomaly-v1`)
    .digest();
  const start = digest.readUInt32BE(0) % pool.length;
  for (let offset = 0; offset < pool.length; offset += 1) {
    const candidate = pool[(start + offset) % pool.length];
    if (!existing.includes(candidate)) return candidate;
  }
  return pool[start];
}

function companionAppearance(culture, stageId, routeId, anomalyIds) {
  if (stageId === "culture") return culture.appearance;
  const digest = createHash("sha256")
    .update(
      `${culture.id}:${stageId}:${routeId}:${anomalyIds.join(",")}:companion-appearance-v1`,
    )
    .digest();
  const eyes = ["o", "@", "x", "0"][digest.readUInt8(0) % 4];
  const routeGlyph = {
    pollution: "#",
    clarity: "~",
    paradox: "%",
    unformed: "?",
  }[routeId];
  const core = ["*", "+", "¤", "◉"][digest.readUInt8(1) % 4];
  const tail = ["/", "\\", "~", "="][digest.readUInt8(2) % 4];
  const lines =
    stageId === "parasite"
      ? [
          "    .---.",
          `  _/${eyes} ${eyes}\\_`,
          ` /  ${routeGlyph}  \\`,
          " \\__^__/",
          `   /${tail}\\`,
        ]
      : stageId === "symbiote"
        ? [
            "      .-^-.",
            `   __/${eyes} ${eyes}\\__`,
            `  / ${routeGlyph}\\___/${routeGlyph} \\`,
            ` <___/${core}\\___>`,
            `    /|${tail}|\\`,
            `   /_${tail}_${tail}_\\`,
          ]
        : [
            `       .-${routeGlyph}-${routeGlyph}-.`,
            `   ___/${eyes}   ${eyes}\\___`,
            ` _/ ${routeGlyph}\\__${core}__/${routeGlyph} \\_`,
            "/___/  /___\\  \\___\\",
            `\\  \\__\\_${core}_/__/  /`,
            ` \\___/|${tail}|\\___/`,
            `   _/${tail}_${tail}_${tail}\\_`,
            `  /__/${routeGlyph}\\__\\`,
          ];
  return {
    version: 2,
    fingerprint: createHash("sha256")
      .update(lines.join("\n"))
      .digest("hex")
      .slice(0, 12),
    lines,
  };
}

function companionImprint(day) {
  const pollution = day.ecologyGains?.pollution ?? 0;
  const clarity = day.ecologyGains?.clarity ?? 0;
  if (pollution > 0 && clarity === 0) return "pollution";
  if (clarity > 0 && pollution === 0) return "clarity";
  return "neutral";
}

function companionCulture(state, cultureId, date) {
  return (state.laboratory?.cultures ?? []).find(
    (candidate) =>
      candidate.id === cultureId &&
      candidate.createdAt <= date &&
      candidate.companion?.bondedAt <= date,
  );
}

function activeCompanionIdAt(state, date) {
  return [...(state.laboratory?.bondHistory ?? [])]
    .filter((entry) => entry.bondedAt <= date)
    .sort(
      (left, right) =>
        left.bondedAt.localeCompare(right.bondedAt) ||
        left.cultureId.localeCompare(right.cultureId),
    )
    .at(-1)?.cultureId;
}

function syncLaboratoryCompanion(state, date) {
  const laboratory = state.laboratory;
  if (!laboratory?.activeCultureId) return { changed: false, added: 0 };
  laboratory.bondHistory ??= [];
  laboratory.imprintAssignments ??= {};
  let added = 0;
  for (const [entryDate, day] of Object.entries(state.days ?? {})
    .filter(([entryDate]) => entryDate <= date)
    .sort(([left], [right]) => left.localeCompare(right))) {
    if (laboratory.imprintAssignments[entryDate]) continue;
    const cultureId = activeCompanionIdAt(state, entryDate);
    if (!cultureId) continue;
    const culture = companionCulture(state, cultureId, entryDate);
    if (!culture) continue;
    const imprint = companionImprint(day);
    culture.companion.imprints ??= {};
    culture.companion.imprints[entryDate] = imprint;
    laboratory.imprintAssignments[entryDate] = culture.id;
    const counts = companionImprintCounts(culture.companion);
    if ([7, 21].includes(counts.total)) {
      culture.companion.anomalyIds ??= [];
      const anomalyId = companionAnomaly(
        culture,
        counts.total,
        companionRoute(counts),
        culture.companion.anomalyIds,
      );
      if (!culture.companion.anomalyIds.includes(anomalyId)) {
        culture.companion.anomalyIds.push(anomalyId);
      }
    }
    added += 1;
  }
  return { changed: added > 0, added };
}

function companionView(culture, date) {
  const companion = culture.companion;
  const visibleImprints = Object.fromEntries(
    Object.entries(companion.imprints ?? {}).filter(
      ([entryDate]) => entryDate <= date,
    ),
  );
  const imprintCounts = companionImprintCounts({ imprints: visibleImprints });
  const stageId = companionStage(imprintCounts.total);
  const routeId = companionRoute(imprintCounts);
  const anomalyCount = [7, 21].filter(
    (threshold) => imprintCounts.total >= threshold,
  ).length;
  const anomalyIds = (companion.anomalyIds ?? []).slice(0, anomalyCount);
  return {
    cultureId: culture.id,
    bondedAt: companion.bondedAt,
    stageId,
    nextStageAt: nextCompanionStageAt(stageId),
    routeId,
    imprintCounts,
    todayImprint: visibleImprints[date] ?? null,
    anomalyIds,
    typeId: culture.typeId,
    rarity: culture.rarity,
    appearance: companionAppearance(
      culture,
      stageId,
      routeId,
      anomalyIds,
    ),
  };
}

function laboratoryCompanion(state, date) {
  const culture = companionCulture(state, activeCompanionIdAt(state, date), date);
  return {
    date,
    status: culture ? "active" : "unbound",
    companion: culture ? companionView(culture, date) : null,
  };
}

function companionPeriodSummary(state, startDate, endDate) {
  const culture = companionCulture(
    state,
    activeCompanionIdAt(state, endDate),
    endDate,
  );
  if (!culture) return null;
  const entries = Object.entries(culture.companion.imprints ?? {});
  const countsThrough = (date) =>
    companionImprintCounts({
      imprints: Object.fromEntries(
        entries.filter(([entryDate]) => entryDate <= date),
      ),
    });
  const beforeDate = new Date(`${startDate}T12:00:00.000Z`);
  beforeDate.setUTCDate(beforeDate.getUTCDate() - 1);
  const before = countsThrough(beforeDate.toISOString().slice(0, 10));
  const after = countsThrough(endDate);
  const period = companionImprintCounts({
    imprints: Object.fromEntries(
      entries.filter(
        ([entryDate]) => entryDate >= startDate && entryDate <= endDate,
      ),
    ),
  });
  return {
    cultureId: culture.id,
    startDate,
    endDate,
    imprintCounts: period,
    stageFrom: companionStage(before.total),
    stageTo: companionStage(after.total),
    routeFrom: companionRoute(before),
    routeTo: companionRoute(after),
    anomaliesSealed:
      [7, 21].filter(
        (threshold) => before.total < threshold && after.total >= threshold,
      ).length,
  };
}

function bondLaboratoryCompanion(state, date, cultureId) {
  const culture = (state.laboratory?.cultures ?? []).find(
    (candidate) => candidate.id === cultureId && candidate.createdAt <= date,
  );
  if (!culture) return { error: "not_found" };
  syncLaboratoryCompanion(state, date);
  state.laboratory.version = 2;
  state.laboratory.bondHistory ??= [];
  state.laboratory.imprintAssignments ??= {};
  culture.companion ??= {
    bondedAt: date,
    imprints: {},
    anomalyIds: [],
  };
  if (state.laboratory.activeCultureId !== culture.id) {
    const sameDay = state.laboratory.bondHistory.findIndex(
      (entry) => entry.bondedAt === date,
    );
    const bond = { cultureId: culture.id, bondedAt: date };
    if (sameDay === -1) state.laboratory.bondHistory.push(bond);
    else state.laboratory.bondHistory[sameDay] = bond;
    state.laboratory.activeCultureId = culture.id;
  } else if (state.laboratory.bondHistory.length === 0) {
    state.laboratory.bondHistory.push({
      cultureId: culture.id,
      bondedAt: culture.companion.bondedAt,
    });
  }
  syncLaboratoryCompanion(state, date);
  return {
    value: {
      status: "bonded",
      companion: companionView(culture, date),
    },
  };
}

export {
  COMPANION_COPY,
  COMPANION_STAGE_THRESHOLDS,
  bondLaboratoryCompanion,
  companionLabel,
  companionPeriodSummary,
  companionView,
  laboratoryCompanion,
  syncLaboratoryCompanion,
};
