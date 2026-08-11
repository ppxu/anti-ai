const FIXED_COLLECTION_SECTIONS = Object.freeze([
  "forms",
  "achievements",
  "chromaticAbilities",
  "scars",
  "habitatPhenomena",
  "expeditionArtifacts",
  "expeditionAchievements",
]);

const COLLECTION_PHENOTYPE_MILESTONES = Object.freeze([
  { tier: 1, count: 34, breadth: 3 },
  { tier: 2, count: 67, breadth: 5 },
  { tier: 3, count: 101, breadth: 6 },
  { tier: 4, count: 134, breadth: 7 },
]);

const COLLECTION_PHENOTYPE_GLYPHS = Object.freeze({
  forms: ["◇", "◇─◇", "◇═◇═◇", "╱◇═◇═◇╲"],
  achievements: ["◆", "◆·◆", "◆╪◆╪◆", "╭◆╪◆╪◆╮"],
  chromaticAbilities: ["✦", "✦⋆✦", "✦※✦※✦", "⟪✦※✦※✦⟫"],
  scars: ["╳", "╳╱╳", "╳╱╳╲╳", "╱╳╳╪╳╳╲"],
  habitatPhenomena: ["❀", "❀⌇❀", "❀⌇❀⌇❀", "⌇❀⌇❀⌇❀⌇"],
  expeditionArtifacts: ["⌁", "⌁◇⌁", "⌁◇⌁◇⌁", "╰⌁◇⌁◇⌁╯"],
  expeditionAchievements: ["★", "★─★", "★═★═★", "╭★═★═★╮"],
});

const COLLECTION_PHENOTYPE_COPY = Object.freeze({
  forms: { zh: "形态骨冠", en: "FORM OSSICLE CROWN" },
  achievements: { zh: "罪证勋环", en: "EVIDENCE MEDAL RING" },
  chromaticAbilities: { zh: "异色星簇", en: "CHROMATIC STAR CLUSTER" },
  scars: { zh: "世代缝合冠", en: "GENERATION SUTURE CROWN" },
  habitatPhenomena: { zh: "生态寄生冠", en: "ECOLOGICAL PARASITE CROWN" },
  expeditionArtifacts: { zh: "遗物骨架", en: "RELIC EXOSKELETON" },
  expeditionAchievements: { zh: "返航病勋", en: "RETURN-SICKNESS MEDAL" },
});

function routeIdForEcology(ecologyId) {
  return {
    polluted: "pollution",
    lucid: "clarity",
    paradox: "paradox",
  }[ecologyId] ?? "unformed";
}

function fixedDiscoveryEvents(codex) {
  return FIXED_COLLECTION_SECTIONS.flatMap((sectionId, sectionIndex) =>
    (codex.sections?.[sectionId] ?? [])
      .filter((entry) => entry.discovered && entry.discoveredAt)
      .map((entry) => ({
        sectionId,
        sectionIndex,
        id: entry.id,
        discoveredAt: entry.discoveredAt,
      })),
  ).sort(
    (left, right) =>
      left.discoveredAt.localeCompare(right.discoveredAt) ||
      left.sectionIndex - right.sectionIndex ||
      String(left.id).localeCompare(String(right.id)),
  );
}

function milestoneTrigger(events, milestone) {
  const categories = new Set();
  for (let index = 0; index < events.length; index += 1) {
    categories.add(events[index].sectionId);
    if (
      index + 1 >= milestone.count &&
      categories.size >= milestone.breadth
    ) {
      return events[index];
    }
  }
  return null;
}

function deriveCollectionPhenotype(codex, ecologyId = "unformed") {
  const events = fixedDiscoveryEvents(codex);
  const breadth = new Set(events.map(({ sectionId }) => sectionId)).size;
  const achieved = COLLECTION_PHENOTYPE_MILESTONES.map((milestone) => ({
    ...milestone,
    trigger: milestoneTrigger(events, milestone),
  })).filter(({ trigger }) => trigger !== null);
  const current = achieved.at(-1) ?? null;
  return {
    version: 1,
    presentationOnly: true,
    discovered: events.length,
    total: 134,
    breadth,
    totalCategories: FIXED_COLLECTION_SECTIONS.length,
    tier: current?.tier ?? 0,
    milestone: current?.count ?? 0,
    breadthRequired: current?.breadth ?? 0,
    motifId: current?.trigger.sectionId ?? null,
    triggeredAt: current?.trigger.discoveredAt ?? null,
    routeId: routeIdForEcology(ecologyId),
    variantId: current
      ? `collection_${current.trigger.sectionId}_tier_${current.tier}`
      : null,
    next: COLLECTION_PHENOTYPE_MILESTONES.find(
      ({ tier }) => tier === (current?.tier ?? 0) + 1,
    ) ?? null,
  };
}

function collectionPhenotypeGlyph(phenotype) {
  if (!phenotype?.motifId || phenotype.tier < 1) return null;
  return COLLECTION_PHENOTYPE_GLYPHS[phenotype.motifId]?.[
    phenotype.tier - 1
  ] ?? null;
}

function collectionPhenotypeCopy(phenotype, lang = "zh") {
  if (!phenotype?.motifId || phenotype.tier < 1) return null;
  return {
    name: COLLECTION_PHENOTYPE_COPY[phenotype.motifId]?.[lang] ?? phenotype.motifId,
    tier: phenotype.tier,
  };
}

export {
  COLLECTION_PHENOTYPE_GLYPHS,
  COLLECTION_PHENOTYPE_MILESTONES,
  FIXED_COLLECTION_SECTIONS,
  collectionPhenotypeCopy,
  collectionPhenotypeGlyph,
  deriveCollectionPhenotype,
};
