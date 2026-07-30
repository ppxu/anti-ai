import { createHash } from "node:crypto";

const LABORATORY_SCHEMA_VERSION = 1;
const CULTURE_TYPE_IDS = [
  "recursive_mold",
  "fossil_broth",
  "scar_orchid",
  "cache_lichen",
  "request_amoeba",
  "abstinence_slime",
];
const CULTURE_COMPLICATION_IDS = [
  "context_echo",
  "cache_allergy",
  "request_mitosis",
  "reactor_sweat",
  "ethical_necrosis",
  "quiet_tremor",
];
const CULTURE_SIDE_EFFECT_IDS = [
  "forgets_the_question",
  "archives_the_fever",
  "retries_when_observed",
  "glows_during_review",
  "rejects_productivity",
  "whispers_in_airplane_mode",
];
const CULTURE_ECOLOGY_IDS = ["polluted", "lucid", "paradox"];
const CULTURE_PATHOLOGY_IDS = ["context", "cache", "frenzy", "nuclear"];
const LABORATORY_COPY = {
  types: {
    recursive_mold: { zh: "递归霉菌", en: "RECURSIVE MOLD" },
    fossil_broth: { zh: "化石浓汤", en: "FOSSIL BROTH" },
    scar_orchid: { zh: "伤痕兰", en: "SCAR ORCHID" },
    cache_lichen: { zh: "缓存地衣", en: "CACHE LICHEN" },
    request_amoeba: { zh: "请求变形虫", en: "REQUEST AMOEBA" },
    abstinence_slime: { zh: "戒断黏液", en: "ABSTINENCE SLIME" },
  },
  complications: {
    context_echo: { zh: "上下文回声", en: "CONTEXT ECHO" },
    cache_allergy: { zh: "缓存过敏", en: "CACHE ALLERGY" },
    request_mitosis: { zh: "请求有丝分裂", en: "REQUEST MITOSIS" },
    reactor_sweat: { zh: "反应堆盗汗", en: "REACTOR SWEAT" },
    ethical_necrosis: { zh: "伦理坏死", en: "ETHICAL NECROSIS" },
    quiet_tremor: { zh: "清醒震颤", en: "QUIET TREMOR" },
  },
  sideEffects: {
    forgets_the_question: { zh: "忘记最初的问题", en: "FORGETS THE QUESTION" },
    archives_the_fever: { zh: "把发烧归档", en: "ARCHIVES THE FEVER" },
    retries_when_observed: { zh: "一被观察就重试", en: "RETRIES WHEN OBSERVED" },
    glows_during_review: { zh: "评审时自行发光", en: "GLOWS DURING REVIEW" },
    rejects_productivity: { zh: "排斥生产力", en: "REJECTS PRODUCTIVITY" },
    whispers_in_airplane_mode: {
      zh: "飞行模式下低语",
      en: "WHISPERS IN AIRPLANE MODE",
    },
  },
  ingredients: {
    foreignSpecimen: { zh: "外来标本", en: "FOREIGN SPECIMEN" },
    fossil: { zh: "永久化石", en: "PERMANENT FOSSIL" },
    caseSlice: { zh: "病例切片", en: "CASE SLICE" },
    selfTissue: { zh: "本体组织", en: "SELF TISSUE" },
  },
};

function laboratoryDigest(...parts) {
  return createHash("sha256").update(parts.join(":")).digest();
}

function digestChoice(values, digest, offset) {
  return values[digest.readUInt8(offset % digest.length) % values.length];
}

function cultureIngredients(state, date) {
  const foreignSpecimens = (state.foreignSpecimens ?? [])
    .filter((entry) => entry.collectedAt <= date)
    .map((entry) => ({
      type: "foreignSpecimen",
      id: entry.id,
      discoveredAt: entry.collectedAt,
      ecologyId: entry.hybrid?.ecology ?? null,
      pathologyId: entry.hybrid?.pathology ?? null,
    }));
  const fossils = (state.generations?.fossils ?? [])
    .filter((entry) => entry.sealedAt <= date)
    .map((entry) => ({
      type: "fossil",
      id: entry.id,
      discoveredAt: entry.sealedAt,
      ecologyId: entry.ecologyId ?? null,
      pathologyId: entry.pathologyId ?? null,
    }));
  const caseSlices = (state.casebook?.cases ?? [])
    .filter(
      (entry) =>
        entry.status === "selected" &&
        entry.selectedAt !== null &&
        entry.selectedAt <= date,
    )
    .map((entry) => ({
      type: "caseSlice",
      id: entry.id,
      discoveredAt: entry.selectedAt,
      ecologyId: ["polluted", "lucid", "paradox"][entry.selectedSlot - 1],
      pathologyId: entry.trigger?.pathologyId ?? null,
    }));
  return { foreignSpecimens, fossils, caseSlices };
}

function selectedIngredient(entries, digest, offset) {
  return entries[digest.readUInt8(offset % digest.length) % entries.length];
}

function proposalIngredients(inventory, state, batch, slot) {
  const pools = [
    inventory.foreignSpecimens,
    inventory.fossils,
    inventory.caseSlices,
  ].filter((entries) => entries.length > 0);
  const digest = laboratoryDigest(
    "anti-ai-laboratory-ingredients-v1",
    state.seed,
    batch,
    slot,
  );
  if (pools.length === 1) {
    return [
      selectedIngredient(pools[0], digest, slot),
      {
        type: "selfTissue",
        id: state.appearance?.specimenId ?? "unhatched",
        discoveredAt: null,
        ecologyId: null,
        pathologyId: null,
      },
    ];
  }
  if (pools.length === 3 && slot === 3) {
    return pools.map((entries, index) =>
      selectedIngredient(entries, digest, slot + index * 7),
    );
  }
  const leftIndex = (slot - 1) % pools.length;
  const rightIndex = slot % pools.length;
  return [
    selectedIngredient(pools[leftIndex], digest, slot),
    selectedIngredient(pools[rightIndex], digest, slot + 7),
  ];
}

function cultureRarity(ingredients, digest) {
  const diversity = new Set(
    ingredients
      .map(({ type }) => type)
      .filter((type) => type !== "selfTissue"),
  ).size;
  const roll = digest.readUInt8(9);
  if (diversity >= 3) return roll < 18 ? "mythic" : "epic";
  if (diversity === 2) return roll < 32 ? "epic" : "rare";
  return roll < 48 ? "rare" : roll < 144 ? "uncommon" : "common";
}

function cultureProposal(state, batch, slot, ingredients) {
  const ingredientKey = ingredients
    .map(({ type, id }) => `${type}:${id}`)
    .sort()
    .join("|");
  const digest = laboratoryDigest(
    "anti-ai-laboratory-culture-v1",
    state.seed,
    batch,
    slot,
    ingredientKey,
  );
  const ecologyCandidates = ingredients
    .map(({ ecologyId }) => ecologyId)
    .filter(Boolean);
  const pathologyCandidates = ingredients
    .map(({ pathologyId }) => pathologyId)
    .filter(Boolean);
  return {
    slot,
    id: digest.toString("hex").slice(0, 10),
    ingredients: ingredients.map(({ type, id }) => ({ type, id })),
    typeId: digestChoice(CULTURE_TYPE_IDS, digest, 1),
    ecologyId: digestChoice(
      ecologyCandidates.length > 0
        ? [...new Set(ecologyCandidates)]
        : CULTURE_ECOLOGY_IDS,
      digest,
      3,
    ),
    pathologyId: digestChoice(
      pathologyCandidates.length > 0
        ? [...new Set(pathologyCandidates)]
        : CULTURE_PATHOLOGY_IDS,
      digest,
      5,
    ),
    complicationId: digestChoice(CULTURE_COMPLICATION_IDS, digest, 7),
    sideEffectId: digestChoice(CULTURE_SIDE_EFFECT_IDS, digest, 11),
    rarity: cultureRarity(ingredients, digest),
  };
}

function laboratoryCultureAppearance(proposal) {
  const digest = laboratoryDigest(
    "anti-ai-laboratory-appearance-v1",
    proposal.id,
    proposal.typeId,
    proposal.complicationId,
  );
  const motes = ["o", "*", "+", "x"];
  const membranes = ["~", "=", "-", "."];
  const left = digestChoice(motes, digest, 1);
  const middle = digestChoice(motes, digest, 3);
  const right = digestChoice(motes, digest, 5);
  const membrane = digestChoice(membranes, digest, 7);
  const core = digestChoice(["@", "#", "%", "&"], digest, 9);
  return {
    version: 1,
    fingerprint: digest.toString("hex").slice(0, 12),
    lines: [
      "       .-~~~~~~~~~-.",
      `     .'  ${left}  ${middle}  ${right}   '.`,
      `    /   ${membrane}${membrane}${core}${membrane}${membrane}     \\`,
      `   |   ${left}  [${core}]  ${right}    |`,
      "    \\   ._____.   /",
      "     '._/_____\\_.'",
    ],
  };
}

function laboratoryView(state, date) {
  const inventory = cultureIngredients(state, date);
  const cultures = (state.laboratory?.cultures ?? []).filter(
    (culture) => culture.createdAt <= date,
  );
  const batch = state.laboratory?.nextBatch ?? cultures.length + 1;
  const counts = {
    foreignSpecimens: inventory.foreignSpecimens.length,
    fossils: inventory.fossils.length,
    caseSlices: inventory.caseSlices.length,
  };
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return {
    date,
    status: total === 0 ? "locked" : "ready",
    batch,
    inventory: { ...counts, total },
    cultures: cultures.length,
    proposals:
      total === 0
        ? []
        : [1, 2, 3].map((slot) =>
            cultureProposal(
              state,
              batch,
              slot,
              proposalIngredients(inventory, state, batch, slot),
            ),
          ),
  };
}

function incubateLaboratoryCulture(state, date, choice) {
  const view = laboratoryView(state, date);
  if (view.status !== "ready") return { error: "unavailable" };
  const slot = Number(choice);
  if (!Number.isInteger(slot) || slot < 1 || slot > 3) {
    return { error: "invalid" };
  }
  const proposal = view.proposals[slot - 1];
  const culture = {
    ...proposal,
    batch: view.batch,
    createdAt: date,
    appearance: laboratoryCultureAppearance(proposal),
  };
  state.laboratory ??= {
    version: LABORATORY_SCHEMA_VERSION,
    nextBatch: 1,
    cultures: [],
  };
  state.laboratory.cultures ??= [];
  state.laboratory.cultures.push(culture);
  state.laboratory.nextBatch = view.batch + 1;
  return { value: { status: "incubated", culture } };
}

function laboratoryShelf(state, date) {
  const cultures = (state.laboratory?.cultures ?? [])
    .filter((culture) => culture.createdAt <= date)
    .sort(
      (left, right) =>
        left.createdAt.localeCompare(right.createdAt) ||
        left.batch - right.batch ||
        left.id.localeCompare(right.id),
    );
  return { date, total: cultures.length, cultures };
}

function laboratoryCulture(state, date, id) {
  return (state.laboratory?.cultures ?? []).find(
    (culture) => culture.id === id && culture.createdAt <= date,
  );
}

function laboratoryLabel(section, id, lang = "zh") {
  return LABORATORY_COPY[section]?.[id]?.[lang] ?? id;
}

export {
  CULTURE_COMPLICATION_IDS,
  CULTURE_SIDE_EFFECT_IDS,
  CULTURE_TYPE_IDS,
  LABORATORY_SCHEMA_VERSION,
  incubateLaboratoryCulture,
  laboratoryCulture,
  laboratoryLabel,
  laboratoryShelf,
  laboratoryView,
};
