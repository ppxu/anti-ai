import { createHash, timingSafeEqual } from "node:crypto";

import {
  creatureSpecimenSnapshot,
  deriveCreatureAppearance,
  isCreatureSpecimenSnapshot,
} from "./creature.mjs";

const SPECIMEN_PROTOCOL_VERSION = 1;
const SPECIMEN_CODE_MAX_LENGTH = 2048;
const ENCOUNTER_WEATHER_IDS = [
  "context_acid_rain",
  "cache_fog",
  "request_hail",
  "nuclear_heat",
  "withdrawal_front",
];
const ENCOUNTER_TYPE_IDS = [
  "failed_symbiosis",
  "cache_rejection",
  "mutual_withdrawal",
  "context_parasitism",
  "request_cannibalism",
  "reactor_courtship",
];
const ENCOUNTER_COPY = {
  weather: {
    context_acid_rain: { zh: "上下文酸雨", en: "CONTEXT ACID RAIN" },
    cache_fog: { zh: "缓存浓雾", en: "CACHE FOG" },
    request_hail: { zh: "请求冰雹", en: "REQUEST HAIL" },
    nuclear_heat: { zh: "核算力高温", en: "NUCLEAR COMPUTE HEAT" },
    withdrawal_front: { zh: "戒断冷锋", en: "WITHDRAWAL FRONT" },
  },
  type: {
    failed_symbiosis: { zh: "失败共生", en: "FAILED SYMBIOSIS" },
    cache_rejection: { zh: "缓存排异", en: "CACHE REJECTION" },
    mutual_withdrawal: { zh: "双向戒断", en: "MUTUAL WITHDRAWAL" },
    context_parasitism: { zh: "上下文寄生", en: "CONTEXT PARASITISM" },
    request_cannibalism: { zh: "请求同类相食", en: "REQUEST CANNIBALISM" },
    reactor_courtship: { zh: "反应堆求偶", en: "REACTOR COURTSHIP" },
  },
  detail: {
    failed_symbiosis: {
      zh: "双方短暂交换了器官，随后一致否认这次架构设计。",
      en: "Both specimens briefly exchanged organs, then denied the architecture review.",
    },
    cache_rejection: {
      zh: "旧缓存把新来者识别成了需要永久保存的过敏原。",
      en: "The old cache classified the visitor as an allergen worth preserving forever.",
    },
    mutual_withdrawal: {
      zh: "一方想继续进食，另一方拔掉插头，现场形成了道德真空。",
      en: "One wanted another feeding; the other pulled the plug. A moral vacuum followed.",
    },
    context_parasitism: {
      zh: "两份上下文互相引用，直到谁也记不起最初的问题。",
      en: "Two contexts cited each other until neither remembered the original question.",
    },
    request_cannibalism: {
      zh: "并发口器误把同类当成了重试队列。",
      en: "Concurrent maws mistook their own species for a retry queue.",
    },
    reactor_courtship: {
      zh: "两枚核心交换了散热方案，并把热失控称作浪漫。",
      en: "Two cores exchanged cooling plans and called thermal runaway romance.",
    },
  },
};

class SpecimenCodeError extends Error {
  constructor(code) {
    super(code);
    this.name = "SpecimenCodeError";
    this.code = code;
  }
}

function specimenPayload(creature) {
  const appearance = creatureSpecimenSnapshot(creature);
  return {
    v: SPECIMEN_PROTOCOL_VERSION,
    i: appearance.specimenId,
    f: appearance.fingerprint,
    x: appearance.stageIndex,
    e: appearance.ecology,
    p: appearance.pathology,
    o: appearance.formId,
    g: appearance.geneIds,
    a: appearance.achievementId,
    c: appearance.achievementCategory,
    r: appearance.rareAbilityId,
    s: appearance.scarId,
  };
}

function specimenChecksum(body) {
  return createHash("sha256")
    .update(`anti-ai-specimen-v${SPECIMEN_PROTOCOL_VERSION}:${body}`)
    .digest("base64url")
    .slice(0, 10);
}

function encodeSpecimenPayload(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `AA${SPECIMEN_PROTOCOL_VERSION}.${body}.${specimenChecksum(body)}`;
}

function exportSpecimenCode(creature) {
  const payload = specimenPayload(creature);
  return {
    protocolVersion: SPECIMEN_PROTOCOL_VERSION,
    specimenId: payload.i,
    fingerprint: payload.f,
    code: encodeSpecimenPayload(payload),
  };
}

function decodeSpecimenCode(input) {
  const code = typeof input === "string" ? input.trim() : "";
  if (!code) throw new SpecimenCodeError("missing");
  if (code.length > SPECIMEN_CODE_MAX_LENGTH) {
    throw new SpecimenCodeError("too_long");
  }
  const match = /^AA(\d+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(code);
  if (!match) throw new SpecimenCodeError("malformed");
  const [, version, body, suppliedChecksum] = match;
  if (Number(version) !== SPECIMEN_PROTOCOL_VERSION) {
    throw new SpecimenCodeError("version");
  }
  const expectedChecksum = specimenChecksum(body);
  const supplied = Buffer.from(suppliedChecksum);
  const expected = Buffer.from(expectedChecksum);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    throw new SpecimenCodeError("checksum");
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new SpecimenCodeError("payload");
  }
  const specimen = {
    version: payload?.v,
    specimenId: payload?.i,
    fingerprint: payload?.f,
    stageIndex: payload?.x,
    ecology: payload?.e,
    pathology: payload?.p,
    formId: payload?.o,
    geneIds: payload?.g,
    achievementId: payload?.a,
    achievementCategory: payload?.c,
    rareAbilityId: payload?.r,
    scarId: payload?.s,
  };
  if (!isCreatureSpecimenSnapshot(specimen)) {
    throw new SpecimenCodeError("payload");
  }
  return specimen;
}

function digestFor(...parts) {
  return createHash("sha256").update(parts.join(":")).digest();
}

function digestChoice(values, digest, offset) {
  return values[digest.readUInt8(offset % digest.length) % values.length];
}

function mixedEcology(left, right, digest) {
  if (left === right) return left;
  if (left === "paradox" || right === "paradox") return "paradox";
  if (
    (left === "polluted" && right === "lucid") ||
    (left === "lucid" && right === "polluted")
  ) {
    return "paradox";
  }
  if (left === "unformed") return right;
  if (right === "unformed") return left;
  return digestChoice(["polluted", "lucid", "paradox"], digest, 7);
}

function mixedOptional(left, right, digest, offset) {
  const values = [left, right].filter((value) => value !== null);
  return values.length === 0 ? null : digestChoice(values, digest, offset);
}

function encounterTypeId(left, right, digest) {
  if (
    [left.ecology, right.ecology].includes("polluted") &&
    [left.ecology, right.ecology].includes("lucid")
  ) {
    return "mutual_withdrawal";
  }
  if (left.pathology === right.pathology) {
    return {
      context: "context_parasitism",
      cache: "cache_rejection",
      frenzy: "request_cannibalism",
      nuclear: "reactor_courtship",
    }[left.pathology];
  }
  return digestChoice(ENCOUNTER_TYPE_IDS, digest, 19);
}

function createSpecimenEncounter(localCreature, visitor, date) {
  const local = creatureSpecimenSnapshot(localCreature);
  if (local.fingerprint === visitor.fingerprint) {
    throw new SpecimenCodeError("self");
  }
  const parents = [local, visitor].sort((left, right) =>
    left.fingerprint.localeCompare(right.fingerprint),
  );
  const digest = digestFor(
    "anti-ai-encounter-v1",
    parents[0].fingerprint,
    parents[1].fingerprint,
  );
  const geneIds = Object.fromEntries(
    Object.keys(parents[0].geneIds).map((gene, index) => [
      gene,
      digest.readUInt8(index) % 2 === 0
        ? parents[0].geneIds[gene]
        : parents[1].geneIds[gene],
    ]),
  );
  const ecology = mixedEcology(
    parents[0].ecology,
    parents[1].ecology,
    digest,
  );
  const pathology = digestChoice(
    [parents[0].pathology, parents[1].pathology],
    digest,
    11,
  );
  const achievementId = mixedOptional(
    parents[0].achievementId,
    parents[1].achievementId,
    digest,
    13,
  );
  const achievementCategory = achievementId
    ? parents.find((parent) => parent.achievementId === achievementId)
        .achievementCategory
    : null;
  const rareAbilityId = mixedOptional(
    parents[0].rareAbilityId,
    parents[1].rareAbilityId,
    digest,
    15,
  );
  const scarId = mixedOptional(
    parents[0].scarId,
    parents[1].scarId,
    digest,
    17,
  );
  const specimenId = digest.toString("hex").slice(0, 8);
  const hybrid = deriveCreatureAppearance(
    {
      version: SPECIMEN_PROTOCOL_VERSION,
      specimenId,
      genes: geneIds,
      unlockedPartIds: [],
    },
    Math.max(parents[0].stageIndex, parents[1].stageIndex),
    ecology,
    pathology,
    achievementId
      ? [
          {
            id: achievementId,
            category: achievementCategory,
            tier: 1,
            unlockedAt: date,
          },
        ]
      : [],
    rareAbilityId ? { [rareAbilityId]: { level: 1 } } : {},
    scarId,
  );
  const weatherDigest = digestFor("anti-ai-compute-weather-v1", date);
  const weatherId = digestChoice(
    ENCOUNTER_WEATHER_IDS,
    weatherDigest,
    0,
  );
  const typeId = encounterTypeId(parents[0], parents[1], digest);
  return {
    protocolVersion: SPECIMEN_PROTOCOL_VERSION,
    encounterId: digest.toString("hex").slice(0, 12),
    date,
    saved: false,
    weather: { id: weatherId },
    type: { id: typeId },
    local,
    visitor,
    hybrid,
  };
}

function encounterLabel(section, id, lang = "zh") {
  return ENCOUNTER_COPY[section]?.[id]?.[lang] ?? id;
}

function saveEncounterSpecimen(state, encounter) {
  state.foreignSpecimens ??= [];
  if (
    state.foreignSpecimens.some(
      (specimen) => specimen.id === encounter.encounterId,
    )
  ) {
    return false;
  }
  state.foreignSpecimens.push({
    id: encounter.encounterId,
    collectedAt: encounter.date,
    typeId: encounter.type.id,
    weatherId: encounter.weather.id,
    local: {
      specimenId: encounter.local.specimenId,
      formId: encounter.local.formId,
    },
    visitor: {
      specimenId: encounter.visitor.specimenId,
      fingerprint: encounter.visitor.fingerprint,
      formId: encounter.visitor.formId,
    },
    hybrid: {
      specimenId: encounter.hybrid.specimenId,
      fingerprint: encounter.hybrid.fingerprint,
      formId: encounter.hybrid.formId,
      stageIndex: encounter.hybrid.stageIndex,
      ecology: encounter.hybrid.ecology,
      pathology: encounter.hybrid.pathology,
      geneIds: { ...encounter.hybrid.geneIds },
      achievementId: encounter.hybrid.achievementId,
      achievementCategory: encounter.hybrid.achievementCategory,
      rareAbilityId: encounter.hybrid.rareAbilityId,
      scarId: encounter.hybrid.scarId,
    },
  });
  state.foreignSpecimens.sort(
    (left, right) =>
      left.collectedAt.localeCompare(right.collectedAt) ||
      left.id.localeCompare(right.id),
  );
  return true;
}

export {
  ENCOUNTER_TYPE_IDS,
  ENCOUNTER_WEATHER_IDS,
  SPECIMEN_CODE_MAX_LENGTH,
  SPECIMEN_PROTOCOL_VERSION,
  SpecimenCodeError,
  createSpecimenEncounter,
  decodeSpecimenCode,
  encounterLabel,
  exportSpecimenCode,
  saveEncounterSpecimen,
};
