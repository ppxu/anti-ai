import { createHash } from "node:crypto";

import { color } from "../reporting.mjs";
import {
  CREATURE_ABILITY_MAX,
  CREATURE_ACHIEVEMENT_BY_ID,
  CREATURE_ACHIEVEMENT_DEFINITIONS,
  CREATURE_APPEARANCE_GENE_POOLS,
  CREATURE_BRANCH_PARTS,
  CREATURE_COPY,
  CREATURE_ECOLOGY_FORM_IDS,
  CREATURE_ECOLOGY_PARTS,
  CREATURE_EVOLUTION_DEFINITIONS,
  CREATURE_KAIJU_GLYPHS,
  CREATURE_RARE_ABILITY_DEFINITIONS,
  CREATURE_RARE_ABILITY_RANKS,
  CREATURE_SCARS,
} from "./content.mjs";
import {
  V2_ACHIEVEMENT_DEFINITIONS,
  V2_RARE_ABILITY_POOLS,
} from "./content-v2.mjs";
import {
  COLLECTION_PHENOTYPE_GLYPHS,
  COLLECTION_PHENOTYPE_MILESTONES,
  collectionPhenotypeGlyph,
} from "../collection-phenotype.mjs";

const V2_ACHIEVEMENT_IDS = new Set(
  V2_ACHIEVEMENT_DEFINITIONS.map(({ id }) => id),
);
const V2_RARE_ABILITY_IDS = new Set(
  Object.values(V2_RARE_ABILITY_POOLS).flat(),
);
const CREATURE_GRAFT_MARKS = {
  bottomless_graft: "{v∞v}",
  recursive_lobe: "{[[∞]]}",
  chorus_jaw: "{≡≡≡}",
  reactor_bladder: "{☢o☢}",
  abstinence_sac: "{○-○}",
  loaded_nerve: "{?x?}",
};
const CREATURE_ACHIEVEMENT_MARKS = {
  legacy: {
    offense: "!!x!!",
    sobriety: "--X--",
    paradox: "!X?X!",
  },
  v2: {
    offense: "!!+!!",
    sobriety: "--+--",
    paradox: "!+?+!",
  },
};
const CREATURE_CHROMATIC_OVERLAYS = {
  legacy: {
    rare: "@R@R@",
    epic: "@S@S@",
    mythic: "@X@X@",
  },
  v2: {
    rare: "@N@N@",
    epic: "@Q@Q@",
    mythic: "@Z@Z@",
  },
};

function creatureLabel(group, id, lang) {
  return CREATURE_COPY[group][id][lang];
}

function creatureTitle(creature, lang) {
  const modifier = creatureLabel(
    "titleModifiers",
    creature.title.modifierId,
    lang,
  );
  const core = creatureLabel("ecologyForms", creature.title.coreId, lang);
  const achievement = creature.title.achievementId
    ? creatureLabel("achievements", creature.title.achievementId, lang)
    : null;
  const base = lang === "zh" ? `${modifier}${core}` : `${modifier} ${core}`;
  return achievement ? `${base} · ${achievement}` : base;
}

function centeredCreatureText(value, width) {
  const left = Math.max(0, Math.floor((width - value.length) / 2));
  return `${" ".repeat(left)}${value}`;
}

function centeredCreatureToken(value, width) {
  const padding = Math.max(0, width - value.length);
  const left = Math.floor(padding / 2);
  return `${" ".repeat(left)}${value}${" ".repeat(padding - left)}`;
}

function creatureArt(creature) {
  const { appearance } = creature;
  const { geneIds } = appearance;
  const armor = CREATURE_KAIJU_GLYPHS.armor[geneIds.body];
  const leg = CREATURE_KAIJU_GLYPHS.legs[geneIds.limbs];
  const eyes = centeredCreatureToken(
    CREATURE_KAIJU_GLYPHS.eyes[geneIds.eyes],
    5,
  );
  const jaw = CREATURE_KAIJU_GLYPHS.jaws[geneIds.mouth];
  const core = `[${CREATURE_KAIJU_GLYPHS.cores[geneIds.core]}]`;
  const stageWidths = [15, 25, 34, 39];
  const width = stageWidths[appearance.stageIndex];
  const branchCrests = {
    context: "╱╲[[ ]]╱╲",
    cache: "▟▙▟▙▟▙",
    frenzy: "╱◉╲╱◉╲╱◉╲",
    nuclear: "╱╲╱╲╱╲",
  };
  const ecologyMarks = {
    unformed: "·····",
    polluted: "!!~!!",
    lucid: "--○--",
    paradox: "!X!X!",
  };
  const scarMarks = {
    blank_suture: "--//--",
    carbonized_spine: "##/##",
    sterile_halo: "oo/oo",
    split_shadow: "//\\\\//",
  };
  const rarePattern = appearance.rareAbilityId
    ? CREATURE_CHROMATIC_OVERLAYS[
        V2_RARE_ABILITY_IDS.has(appearance.rareAbilityId) ? "v2" : "legacy"
      ][CREATURE_RARE_ABILITY_DEFINITIONS[appearance.rareAbilityId].rarity]
    : null;
  const achievementPattern = appearance.achievementCategory
    ? CREATURE_ACHIEVEMENT_MARKS[
        V2_ACHIEVEMENT_IDS.has(appearance.achievementId) ? "v2" : "legacy"
      ][appearance.achievementCategory]
    : null;
  const pattern =
    rarePattern ??
    (appearance.stageIndex >= 3
      ? achievementPattern ??
        scarMarks[appearance.scarId] ??
        CREATURE_KAIJU_GLYPHS.patterns[geneIds.pattern]
      : scarMarks[appearance.scarId] ?? ecologyMarks[appearance.ecology]);
  const center = (value) => centeredCreatureText(value, width);
  const crest =
    appearance.pathology === "nuclear" && appearance.stageIndex === 1
      ? "╱╲╱╲"
      : appearance.pathology === "nuclear" && appearance.stageIndex === 3
        ? "╱╲╱╲╱╲╱╲"
        : branchCrests[appearance.pathology];
  let lines;
  if (appearance.stageIndex === 0) {
    lines = [
      center("╱╲"),
      center(`╭╱${armor.repeat(2)}╲╮`),
      center(`│ ${eyes} │`),
      center(`│ ${jaw} │`),
      center("│  [●]  │"),
      center(`│ ${pattern} │`),
      center("╰────╯"),
      center("╰──╯"),
    ];
  } else if (appearance.stageIndex === 1) {
    lines = [
      center(crest),
      center(`╭──╱${eyes}╲──╮`),
      center(`╭─╯ ${armor.repeat(2)} ╲▲╱ ${armor.repeat(2)} ╰─╮`),
      center(`╱ ${armor.repeat(3)} ${jaw} ${armor.repeat(3)} ╲`),
      center("│    ╭[●]╮    │"),
      center(`╲__╭─╯${pattern}╰─╮__╱`),
      center("╲╱  ╱  ╲  ╲╱"),
      center(`╱${leg}╲  ╱${leg}╲`),
      center(CREATURE_KAIJU_GLYPHS.feet[geneIds.limbs]),
    ];
  } else if (appearance.stageIndex === 2) {
    lines = [
      center(crest),
      center(`╭───╱${eyes}╲───╮`),
      center(`╭──╯ ${armor.repeat(2)} ╲ ▲ ╱ ${armor.repeat(2)} ╰──╮`),
      center(`╱ ${armor.repeat(4)} ${jaw} ${armor.repeat(4)} ╲`),
      center(`│ ╭────╯ ${core} ╰────╮ │`),
      center(`╲╭╯ ╱${pattern}╲ ╰╮╱`),
      center(`╰━╯ ╲__╱${leg.repeat(2)}╱   ╲${leg.repeat(2)}╲__╱ ╰━╯━━`),
      center(`╱${leg.repeat(2)}╱     ╲${leg.repeat(2)}╲`),
      center(CREATURE_KAIJU_GLYPHS.feet[geneIds.limbs]),
    ];
  } else {
    lines = [
      center(crest),
      center(`╭───╱ ${eyes} ╲───╮`),
      center(`╭──╯${armor.repeat(3)} ╲  ▲  ╱${armor.repeat(3)}╰──╮`),
      center(`╭─╯ ${armor.repeat(5)} ${jaw} ${armor.repeat(5)} ╰─╮`),
      center(
        `╱  ╭──────╯ ${CREATURE_KAIJU_GLYPHS.completeCores[geneIds.core]} ╰──────╮  ╲`,
      ),
      center(
        `│╭─╯${ecologyMarks[appearance.ecology]} ╲${pattern}╱ ╰─╮│`,
      ),
      center(
        `╲━╯   ╱${leg.repeat(4)}╱   ╲${leg.repeat(4)}╲   ╰━━╯${CREATURE_KAIJU_GLYPHS.tails[geneIds.tail]}`,
      ),
      center(`╲___╱${leg.repeat(3)}╱     ╲${leg.repeat(3)}╲___╱`),
      center(`╱${leg.repeat(2)}╱         ╲${leg.repeat(2)}╲`),
      center(CREATURE_KAIJU_GLYPHS.feet[geneIds.limbs]),
    ];
  }
  if (appearance.evolutionId) {
    lines.splice(-1, 0, center(CREATURE_GRAFT_MARKS[appearance.evolutionId]));
  }
  const collectionGlyph = collectionPhenotypeGlyph(
    creature.collectionPhenotype,
  );
  if (collectionGlyph) {
    lines.unshift(center(collectionGlyph));
    if (creature.collectionPhenotype.tier >= 3) {
      lines.splice(-1, 0, center(collectionGlyph));
    }
  }
  const colorCode = appearance.rareAbilityId
    ? CREATURE_RARE_ABILITY_RANKS[
        CREATURE_RARE_ABILITY_DEFINITIONS[appearance.rareAbilityId].rarity
      ].color
    : {
        unformed: "2",
        polluted: "1;31",
        lucid: "1;36",
        paradox: "1;35",
      }[appearance.ecology];
  return lines.map((line) => color(colorCode, line)).join("\n");
}

function creatureAbilityBar(value, maximum = CREATURE_ABILITY_MAX) {
  const filled =
    value === 0 ? 0 : Math.min(10, Math.ceil((value / maximum) * 10));
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)}`;
}

function creatureAbilityProgress(totalPoints) {
  const normalized = Math.max(0, Math.floor(totalPoints));
  if (normalized === 0) {
    return {
      value: 0,
      totalPoints: 0,
      malignancyRank: 0,
      nextMalignancyAt: CREATURE_ABILITY_MAX + 1,
    };
  }
  const malignancyRank = Math.floor(
    (normalized - 1) / CREATURE_ABILITY_MAX,
  );
  return {
    value: ((normalized - 1) % CREATURE_ABILITY_MAX) + 1,
    totalPoints: normalized,
    malignancyRank,
    nextMalignancyAt:
      (malignancyRank + 1) * CREATURE_ABILITY_MAX + 1,
  };
}

function creatureMalignancyRankLabel(rank) {
  const values = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let remaining = Math.max(0, Math.floor(rank));
  let output = "";
  for (const [value, glyph] of values) {
    while (remaining >= value) {
      output += glyph;
      remaining -= value;
    }
  }
  return output || "0";
}

function roundCreature(value) {
  return Number(value.toFixed(2));
}

function creatureAppearanceState(seed) {
  const digest = createHash("sha256")
    .update(`${seed}:appearance-v1`)
    .digest();
  const genes = Object.fromEntries(
    Object.entries(CREATURE_APPEARANCE_GENE_POOLS).map(
      ([gene, pool], index) => [
        gene,
        pool[digest.readUInt8(index) % pool.length],
      ],
    ),
  );
  return {
    version: 1,
    specimenId: createHash("sha256")
      .update(`${seed}:public-specimen`)
      .digest("hex")
      .slice(0, 8),
    genes,
    unlockedPartIds: [],
  };
}

function deriveCreatureAppearance(
  appearanceState,
  stageIndex,
  ecology,
  pathology,
  achievements,
  rareAbilities,
  scarId = null,
  evolutionId = null,
) {
  const partIds = [
    appearanceState.genes.body,
    appearanceState.genes.eyes,
    appearanceState.genes.mouth,
  ];
  if (stageIndex >= 1) {
    partIds.push(
      CREATURE_BRANCH_PARTS[pathology],
      CREATURE_ECOLOGY_PARTS[ecology],
    );
  }
  if (stageIndex >= 2) {
    partIds.push(appearanceState.genes.core, appearanceState.genes.limbs);
  }
  if (scarId) {
    partIds.push(`scar_${scarId}`);
  }
  if (evolutionId) {
    partIds.push(`evolution_${evolutionId}`);
  }
  const latestAchievement = [...achievements].sort(
    (left, right) =>
      left.tier - right.tier ||
      left.unlockedAt.localeCompare(right.unlockedAt) ||
      left.id.localeCompare(right.id),
  ).at(-1);
  const latestRareAbilityId = Object.keys(rareAbilities).at(-1);
  if (stageIndex >= 3) {
    partIds.push(
      appearanceState.genes.tail,
      latestRareAbilityId
        ? `chromatic_${latestRareAbilityId}`
        : latestAchievement
          ? `achievement_${latestAchievement.id}`
          : appearanceState.genes.pattern,
    );
  }
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        version: appearanceState.version,
        genes: appearanceState.genes,
        stageIndex,
        ecology,
        pathology,
        partIds,
        rareAbilityId: latestRareAbilityId,
        ...(scarId ? { scarId } : {}),
        ...(evolutionId ? { evolutionId } : {}),
      }),
    )
    .digest("hex")
    .slice(0, 12);
  return {
    version: appearanceState.version,
    specimenId: appearanceState.specimenId,
    geneIds: { ...appearanceState.genes },
    partIds,
    fingerprint,
    stageIndex,
    ecology,
    pathology,
    formId: CREATURE_ECOLOGY_FORM_IDS[ecology][pathology],
    achievementId: latestAchievement?.id ?? null,
    achievementCategory: latestAchievement?.category ?? null,
    rareAbilityId: latestRareAbilityId ?? null,
    scarId,
    ...(evolutionId ? { evolutionId } : {}),
  };
}

function creatureSpecimenSnapshot(creature) {
  const appearance = creature.appearance;
  return {
    version: appearance.version,
    specimenId: appearance.specimenId,
    fingerprint: appearance.fingerprint,
    stageIndex: appearance.stageIndex,
    ecology: appearance.ecology,
    pathology: appearance.pathology,
    formId: appearance.formId,
    geneIds: { ...appearance.geneIds },
    achievementId: appearance.achievementId,
    achievementCategory: appearance.achievementCategory,
    rareAbilityId: appearance.rareAbilityId,
    scarId: appearance.scarId,
    ...(appearance.evolutionId
      ? { evolutionId: appearance.evolutionId }
      : {}),
  };
}

function isCreatureSpecimenSnapshot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  if (
    value.version !== 1 ||
    !/^[a-f0-9]{8}$/.test(value.specimenId ?? "") ||
    !/^[a-f0-9]{12}$/.test(value.fingerprint ?? "") ||
    !Number.isInteger(value.stageIndex) ||
    value.stageIndex < 0 ||
    value.stageIndex > 3
  ) {
    return false;
  }
  if (
    !Object.hasOwn(CREATURE_ECOLOGY_FORM_IDS, value.ecology) ||
    !Object.hasOwn(
      CREATURE_ECOLOGY_FORM_IDS[value.ecology],
      value.pathology,
    ) ||
    CREATURE_ECOLOGY_FORM_IDS[value.ecology][value.pathology] !==
      value.formId
  ) {
    return false;
  }
  if (
    !value.geneIds ||
    typeof value.geneIds !== "object" ||
    Array.isArray(value.geneIds) ||
    Object.keys(value.geneIds).length !==
      Object.keys(CREATURE_APPEARANCE_GENE_POOLS).length ||
    !Object.entries(CREATURE_APPEARANCE_GENE_POOLS).every(
      ([gene, pool]) => pool.includes(value.geneIds[gene]),
    )
  ) {
    return false;
  }
  const achievement = value.achievementId
    ? CREATURE_ACHIEVEMENT_BY_ID[value.achievementId]
    : null;
  if (
    (value.achievementId === null &&
      value.achievementCategory !== null) ||
    (value.achievementId !== null &&
      (!achievement ||
        achievement.category !== value.achievementCategory))
  ) {
    return false;
  }
  if (
    value.rareAbilityId !== null &&
    !Object.hasOwn(
      CREATURE_RARE_ABILITY_DEFINITIONS,
      value.rareAbilityId,
    )
  ) {
    return false;
  }
  if (
    value.scarId !== null &&
    !Object.values(CREATURE_SCARS).includes(value.scarId)
  ) {
    return false;
  }
  const evolutionId = value.evolutionId ?? null;
  if (
    evolutionId !== null &&
    !Object.hasOwn(CREATURE_EVOLUTION_DEFINITIONS, evolutionId)
  ) {
    return false;
  }
  const derived = deriveCreatureAppearance(
    {
      version: value.version,
      specimenId: value.specimenId,
      genes: value.geneIds,
      unlockedPartIds: [],
    },
    value.stageIndex,
    value.ecology,
    value.pathology,
    achievement
      ? [
          {
            ...achievement,
            tier: 1,
            unlockedAt: "specimen-code",
          },
        ]
      : [],
    value.rareAbilityId
      ? { [value.rareAbilityId]: { level: 1 } }
      : {},
    value.scarId,
    evolutionId,
  );
  return derived.fingerprint === value.fingerprint;
}

function creatureAppearanceContentStats() {
  return {
    basePartIds: new Set([
      ...Object.values(CREATURE_APPEARANCE_GENE_POOLS).flat(),
      ...Object.values(CREATURE_BRANCH_PARTS),
      ...Object.values(CREATURE_ECOLOGY_PARTS),
    ]).size,
    formFamilies: Object.values(CREATURE_ECOLOGY_FORM_IDS).reduce(
      (total, forms) => total + Object.keys(forms).length,
      0,
    ),
    achievements: CREATURE_ACHIEVEMENT_DEFINITIONS.length,
  };
}

function creatureAppearanceCapacity() {
  const structuralForms = Object.entries(CREATURE_APPEARANCE_GENE_POOLS)
    .filter(([gene]) => gene !== "pattern")
    .reduce((total, [, pool]) => total * pool.length, 1);
  const chestVariants =
    CREATURE_APPEARANCE_GENE_POOLS.pattern.length +
    new Set(Object.values(CREATURE_SCARS)).size +
    new Set(
      Object.values(CREATURE_ACHIEVEMENT_MARKS).flatMap(Object.values),
    ).size +
    new Set(
      Object.values(CREATURE_CHROMATIC_OVERLAYS).flatMap(Object.values),
    ).size;
  const graftVariants = Object.keys(CREATURE_GRAFT_MARKS).length + 1;
  const growthVariants =
    Object.keys(CREATURE_BRANCH_PARTS).length *
    Object.keys(CREATURE_ECOLOGY_PARTS).length *
    chestVariants *
    graftVariants;
  const finalAsciiForms = structuralForms * growthVariants;
  const collectionPhenotypes =
    1 +
    Object.keys(COLLECTION_PHENOTYPE_GLYPHS).length *
      COLLECTION_PHENOTYPE_MILESTONES.length;
  return {
    structuralForms,
    growthVariants,
    finalAsciiForms,
    baseSpecimenForms: finalAsciiForms,
    collectionPhenotypes,
    displayedAsciiForms: finalAsciiForms * collectionPhenotypes,
  };
}

export {
  creatureAbilityBar,
  creatureAbilityProgress,
  creatureAppearanceCapacity,
  creatureAppearanceContentStats,
  creatureAppearanceState,
  creatureArt,
  creatureLabel,
  creatureMalignancyRankLabel,
  creatureSpecimenSnapshot,
  creatureTitle,
  deriveCreatureAppearance,
  isCreatureSpecimenSnapshot,
  roundCreature,
};
