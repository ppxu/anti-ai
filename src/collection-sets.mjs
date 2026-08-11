const COLLECTION_SET_DEFINITIONS = Object.freeze([
  {
    id: "set_licensed_overfeed",
    routeId: "pollution",
    rarity: "rare",
    stampId: "approved_appetite",
    name: { zh: "持证暴食", en: "LICENSED OVERFEED" },
    description: {
      zh: "污染形态、进食证据、舱内后果和墓场遗物终于互相出具了合规证明。",
      en: "A polluted form, feeding evidence, habitat damage, and graveyard relic finally certified one another.",
    },
    stamp: { zh: "食欲已批准", en: "APPETITE APPROVED" },
    requirements: [
      ["polluted_form", "pollutedForm"],
      ["offense_badge", "offenseBadge"],
      ["pollution_phenomenon", "pollutionPhenomenon"],
      ["reactor_relic", "reactorRelic"],
    ],
  },
  {
    id: "set_cache_afterlife",
    routeId: "pollution",
    rarity: "epic",
    stampId: "legacy_residency",
    name: { zh: "缓存来世", en: "CACHE AFTERLIFE" },
    description: {
      zh: "旧答案在形态、徽章、沼泽和培养皿里分别获得了一次永久居留。",
      en: "An old answer obtained permanent residency in a form, badge, swamp, and culture dish.",
    },
    stamp: { zh: "遗留已入籍", en: "LEGACY NATURALIZED" },
    requirements: [
      ["cache_form", "cacheForm"],
      ["cache_badge", "cacheBadge"],
      ["cache_relic", "cacheRelic"],
      ["cache_culture", "cacheCulture"],
    ],
  },
  {
    id: "set_manual_override",
    routeId: "clarity",
    rarity: "rare",
    stampId: "human_present",
    name: { zh: "人工接管", en: "MANUAL OVERRIDE" },
    description: {
      zh: "清醒形态、克制证据和生态舱里的人工开关共同证明人类仍偶尔在线。",
      en: "A lucid form, restraint evidence, and a manual habitat switch prove a human is occasionally still present.",
    },
    stamp: { zh: "人类仍在场", en: "HUMAN STILL PRESENT" },
    requirements: [
      ["lucid_form", "lucidForm"],
      ["sobriety_badge", "sobrietyBadge"],
      ["clarity_phenomenon", "clarityPhenomenon"],
    ],
  },
  {
    id: "set_quiet_inheritance",
    routeId: "clarity",
    rarity: "epic",
    stampId: "silence_inherited",
    name: { zh: "安静遗传", en: "QUIET INHERITANCE" },
    description: {
      zh: "一次克制选择终于活过了病例、远征和世代封存，成为可遗传的沉默。",
      en: "One restrained choice survived a case, expedition, and generation seal to become inherited silence.",
    },
    stamp: { zh: "沉默可遗传", en: "SILENCE INHERITED" },
    requirements: [
      ["lucid_scar", "lucidScar"],
      ["clarity_case", "clarityCase"],
      ["clarity_companion", "clarityCompanion"],
      ["negative_adjustment", "negativeAdjustment"],
    ],
  },
  {
    id: "set_compliant_contradiction",
    routeId: "paradox",
    rarity: "rare",
    stampId: "conflict_approved",
    name: { zh: "合规矛盾", en: "COMPLIANT CONTRADICTION" },
    description: {
      zh: "相反结论在形态、徽章和舱内记录中同时成立，因此顺利通过验收。",
      en: "Opposite conclusions became true across form, badge, and habitat record, then passed acceptance.",
    },
    stamp: { zh: "冲突已验收", en: "CONFLICT ACCEPTED" },
    requirements: [
      ["paradox_form", "paradoxForm"],
      ["paradox_badge", "paradoxBadge"],
      ["paradox_phenomenon", "paradoxPhenomenon"],
    ],
  },
  {
    id: "set_mutual_misdiagnosis",
    routeId: "paradox",
    rarity: "epic",
    stampId: "both_correct",
    name: { zh: "相互误诊", en: "MUTUAL MISDIAGNOSIS" },
    description: {
      zh: "病例、事故、伴生关系和远征报告各自证明另一份记录才是病因。",
      en: "A case, incident, companion bond, and expedition report each prove another record caused the condition.",
    },
    stamp: { zh: "双方均正确", en: "BOTH SIDES CORRECT" },
    requirements: [
      ["paradox_case", "paradoxCase"],
      ["resonant_incident", "resonantIncident"],
      ["paradox_companion", "paradoxCompanion"],
      ["paradox_return", "paradoxReturn"],
    ],
  },
]);

const REQUIREMENT_COPY = Object.freeze({
  polluted_form: { zh: "发现一种污染形态", en: "Discover a polluted form" },
  offense_badge: { zh: "封存一项进食罪证", en: "Seal one offense badge" },
  pollution_phenomenon: { zh: "记录一次污染生态现象", en: "Record a Pollution phenomenon" },
  reactor_relic: { zh: "从反应堆墓场带回遗物", en: "Return a Reactor Graveyard relic" },
  cache_form: { zh: "发现缓存病变形态", en: "Discover a Cache pathology form" },
  cache_badge: { zh: "封存缓存相关罪证", en: "Seal cache-related evidence" },
  cache_relic: { zh: "从缓存沼泽带回遗物", en: "Return a Cache Swamp relic" },
  cache_culture: { zh: "培养一份缓存病变标本", en: "Culture a Cache pathology specimen" },
  lucid_form: { zh: "发现一种清醒形态", en: "Discover a Lucid form" },
  sobriety_badge: { zh: "封存一项克制证据", en: "Seal one Sobriety badge" },
  clarity_phenomenon: { zh: "记录一次清醒生态现象", en: "Record a Clarity phenomenon" },
  lucid_scar: { zh: "封存清醒世代伤痕", en: "Seal a Lucid generation scar" },
  clarity_case: { zh: "选择一次清醒病例路线", en: "Choose a Clarity case route" },
  clarity_companion: { zh: "养成清醒路线伴生物", en: "Raise a Clarity companion" },
  negative_adjustment: { zh: "远征中让一项指标回落", en: "Return with a negative adjustment" },
  paradox_form: { zh: "发现一种悖论形态", en: "Discover a Paradox form" },
  paradox_badge: { zh: "封存一项悖论证据", en: "Seal one Paradox badge" },
  paradox_phenomenon: { zh: "记录一次悖论生态现象", en: "Record a Paradox phenomenon" },
  paradox_case: { zh: "选择一次悖论病例路线", en: "Choose a Paradox case route" },
  resonant_incident: { zh: "封存一次允许共振的事故", en: "Seal one Resonance incident" },
  paradox_companion: { zh: "养成悖论路线伴生物", en: "Raise a Paradox companion" },
  paradox_return: { zh: "完成一次正负同舱返航", en: "Complete a mixed-sign return" },
});

function discoveredEntries(codex, section) {
  return (codex.sections?.[section] ?? []).filter(
    (entry) => entry.discovered ?? true,
  );
}

function firstMatch(codex, matcher) {
  const matches = matcher(codex).filter(Boolean);
  return matches.sort((left, right) =>
    String(left.discoveredAt ?? "9999").localeCompare(
      String(right.discoveredAt ?? "9999"),
    )
  )[0] ?? null;
}

const REQUIREMENT_MATCHERS = Object.freeze({
  pollutedForm: (codex) => discoveredEntries(codex, "forms").filter(({ ecologyId }) => ecologyId === "polluted"),
  offenseBadge: (codex) => discoveredEntries(codex, "achievements").filter(({ category }) => category === "offense"),
  pollutionPhenomenon: (codex) => discoveredEntries(codex, "habitatPhenomena").filter(({ routeId }) => routeId === "pollution"),
  reactorRelic: (codex) => discoveredEntries(codex, "expeditionArtifacts").filter(({ destinationId }) => destinationId === "reactor_graveyard"),
  cacheForm: (codex) => discoveredEntries(codex, "forms").filter(({ pathologyId }) => pathologyId === "cache"),
  cacheBadge: (codex) => discoveredEntries(codex, "achievements").filter(({ id }) => ["cache_excavation_team", "cache_afterlife", "cache_saint"].includes(id)),
  cacheRelic: (codex) => discoveredEntries(codex, "expeditionArtifacts").filter(({ destinationId }) => destinationId === "cache_swamp"),
  cacheCulture: (codex) => discoveredEntries(codex, "cultures").filter(({ pathologyId }) => pathologyId === "cache"),
  lucidForm: (codex) => discoveredEntries(codex, "forms").filter(({ ecologyId }) => ecologyId === "lucid"),
  sobrietyBadge: (codex) => discoveredEntries(codex, "achievements").filter(({ category }) => category === "sobriety"),
  clarityPhenomenon: (codex) => discoveredEntries(codex, "habitatPhenomena").filter(({ routeId }) => routeId === "clarity"),
  lucidScar: (codex) => discoveredEntries(codex, "scars").filter(({ id }) => id === "sterile_halo"),
  clarityCase: (codex) => discoveredEntries(codex, "caseSlices").filter(({ routeId }) => routeId === "clarity"),
  clarityCompanion: (codex) => discoveredEntries(codex, "companions").filter(({ routeId }) => routeId === "clarity"),
  negativeAdjustment: (codex) => discoveredEntries(codex, "expeditionAchievements").filter(({ id }) => id === "permanent_decrease"),
  paradoxForm: (codex) => discoveredEntries(codex, "forms").filter(({ ecologyId }) => ecologyId === "paradox"),
  paradoxBadge: (codex) => discoveredEntries(codex, "achievements").filter(({ category }) => category === "paradox"),
  paradoxPhenomenon: (codex) => discoveredEntries(codex, "habitatPhenomena").filter(({ routeId }) => routeId === "paradox"),
  paradoxCase: (codex) => discoveredEntries(codex, "caseSlices").filter(({ routeId }) => routeId === "paradox"),
  resonantIncident: (codex) => discoveredEntries(codex, "incidentReports").filter(({ stanceId }) => stanceId === "resonate"),
  paradoxCompanion: (codex) => discoveredEntries(codex, "companions").filter(({ routeId }) => routeId === "paradox"),
  paradoxReturn: (codex) => discoveredEntries(codex, "expeditionAchievements").filter(({ id }) => id === "paradox_return"),
});

function deriveCollectionSets(codex) {
  return COLLECTION_SET_DEFINITIONS.map((definition) => {
    const requirements = definition.requirements.map(([id, matcherId]) => {
      const evidence = firstMatch(codex, REQUIREMENT_MATCHERS[matcherId]);
      return {
        id,
        completed: evidence !== null,
        discoveredAt: evidence?.discoveredAt ?? null,
      };
    });
    const completedCount = requirements.filter(({ completed }) => completed).length;
    const completed = completedCount === requirements.length;
    const discoveredAt = completed
      ? requirements
          .map((entry) => entry.discoveredAt)
          .filter(Boolean)
          .sort()
          .at(-1) ?? null
      : null;
    return {
      id: definition.id,
      routeId: definition.routeId,
      rarity: definition.rarity,
      stampId: definition.stampId,
      presentationOnly: true,
      completed,
      discoveredAt,
      progress: {
        completed: completedCount,
        total: requirements.length,
        percent: Math.round((completedCount / requirements.length) * 100),
      },
      requirements,
    };
  });
}

function collectionSetCopy(id, lang = "zh") {
  const definition = COLLECTION_SET_DEFINITIONS.find((entry) => entry.id === id);
  if (!definition) return null;
  return {
    name: definition.name[lang],
    description: definition.description[lang],
    stamp: definition.stamp[lang],
  };
}

function collectionSetRequirementCopy(id, lang = "zh") {
  return REQUIREMENT_COPY[id]?.[lang] ?? id;
}

export {
  COLLECTION_SET_DEFINITIONS,
  collectionSetCopy,
  collectionSetRequirementCopy,
  deriveCollectionSets,
};
