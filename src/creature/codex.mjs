import { companionView } from "../companion.mjs";
import { deriveCollectionPhenotype } from "../collection-phenotype.mjs";
import { deriveCollectionSets } from "../collection-sets.mjs";
import { EXPEDITION_ACHIEVEMENT_DEFINITIONS, EXPEDITION_ARTIFACT_DEFINITIONS } from "../expedition/content.mjs";
import { HABITAT_COPY, habitatEvents } from "../habitat.mjs";
import { creatureAppearanceCapacity } from "./appearance.mjs";
import {
  CREATURE_ACHIEVEMENT_DEFINITIONS,
  CREATURE_ECOLOGY_FORM_IDS,
  CREATURE_RARE_ABILITY_DEFINITIONS,
  CREATURE_SCARS,
} from "./content.mjs";
function deriveCreatureCodex(state, date, creature) {
  const specimens = (state.specimens ?? [])
    .filter((specimen) => specimen.recordedAt <= date)
    .map((specimen) => ({
      id: specimen.fingerprint,
      discoveredAt: specimen.recordedAt,
      experienceDays: specimen.experienceDays,
      stageId: specimen.stageId,
      ecologyId: specimen.ecologyId,
      pathologyId: specimen.pathologyId,
      formId:
        CREATURE_ECOLOGY_FORM_IDS[specimen.ecologyId]?.[
          specimen.pathologyId
        ] ?? null,
      achievementId: specimen.achievementId,
      rareAbilityId: specimen.rareAbilityId,
      evolutionId: specimen.evolutionId ?? null,
    }));
  const foreignSpecimens = (state.foreignSpecimens ?? [])
    .filter((specimen) => specimen.collectedAt <= date)
    .map((specimen) => ({
      id: specimen.id,
      discoveredAt: specimen.collectedAt,
      typeId: specimen.typeId,
      weatherId: specimen.weatherId,
      localSpecimenId: specimen.local.specimenId,
      visitorSpecimenId: specimen.visitor.specimenId,
      localFormId: specimen.local.formId,
      visitorFormId: specimen.visitor.formId,
      hybridFingerprint: specimen.hybrid.fingerprint,
      hybridFormId: specimen.hybrid.formId,
    }));
  const caseSlices = (state.casebook?.cases ?? [])
    .filter(
      (entry) =>
        entry.status === "selected" &&
        entry.selectedAt !== null &&
        entry.selectedAt <= date,
    )
    .map((entry) => ({
      id: entry.id,
      caseId: entry.caseId,
      offeredAt: entry.offeredAt,
      discoveredAt: entry.selectedAt,
      routeId: ["pollution", "clarity", "paradox"][
        entry.selectedSlot - 1
      ],
      markId: ["pollution", "clarity", "paradox"][
        entry.selectedSlot - 1
      ],
      trigger: { ...entry.trigger },
    }));
  const incidentReports = (state.incidents?.records ?? [])
    .filter(
      (entry) =>
        entry.status === "resolved" &&
        entry.aftermath?.resolvedAt !== null &&
        entry.aftermath.resolvedAt <= date,
    )
    .map((entry) => ({
      id: entry.id,
      incidentId: entry.incidentId,
      offeredAt: entry.offeredAt,
      discoveredAt: entry.aftermath.resolvedAt,
      stanceId: ["quarantine", "observe", "resonate"][
        entry.selectedSlot - 1
      ],
      outcomeId: entry.aftermath.outcomeId,
      chainId: entry.chainId,
      chainDepth: entry.chainDepth ?? 1,
      parentIncidentId: entry.parentIncidentId ?? null,
    }));
  const collectionCultures = (state.laboratory?.cultures ?? [])
    .filter((entry) => entry.createdAt <= date)
    .map((entry) => ({
      id: entry.id,
      discoveredAt: entry.createdAt,
      typeId: entry.typeId,
      rarity: entry.rarity,
      ecologyId: entry.ecologyId,
      pathologyId: entry.pathologyId,
      fingerprint: entry.appearance.fingerprint,
      ingredientTypes: entry.ingredients.map(({ type }) => type),
      ...(entry.companion?.bondedAt <= date
        ? { companion: companionView(entry, date) }
        : {}),
    }));
  const cultures = collectionCultures.map(({
    ecologyId: _ecologyId,
    pathologyId: _pathologyId,
    ...entry
  }) => entry);
  const companions = collectionCultures
    .filter((entry) => entry.companion)
    .map((entry) => ({
      id: entry.id,
      discoveredAt: entry.companion.bondedAt,
      stageId: entry.companion.stageId,
      routeId: entry.companion.routeId,
      rarity: entry.rarity,
      anomalyIds: entry.companion.anomalyIds,
      fingerprint: entry.companion.appearance.fingerprint,
    }));
  const formDiscoveries = new Map();
  for (const specimen of specimens) {
    if (
      specimen.formId &&
      (!formDiscoveries.has(specimen.formId) ||
        specimen.discoveredAt < formDiscoveries.get(specimen.formId))
    ) {
      formDiscoveries.set(specimen.formId, specimen.discoveredAt);
    }
  }
  const forms = Object.entries(CREATURE_ECOLOGY_FORM_IDS).flatMap(
    ([ecologyId, pathologies]) =>
      Object.entries(pathologies).map(([pathologyId, id]) => ({
        id,
        ecologyId,
        pathologyId,
        discovered: formDiscoveries.has(id),
        discoveredAt: formDiscoveries.get(id) ?? null,
      })),
  );

  const unlockedAchievements = new Map(
    creature.achievements.unlocked.map((achievement) => [
      achievement.id,
      achievement,
    ]),
  );
  const achievements = CREATURE_ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const unlocked = unlockedAchievements.get(definition.id);
    return {
      id: definition.id,
      category: definition.category,
      rarity: definition.rarity,
      discovered: unlocked !== undefined,
      discoveredAt: unlocked?.unlockedAt ?? null,
    };
  });

  const rareAbilityDiscoveries = new Map();
  for (const [entryDate, day] of Object.entries(state.days)
    .filter(([entryDate]) => entryDate <= date)
    .sort(([left], [right]) => left.localeCompare(right))) {
    const abilityId = day.rareAbilityGain?.id;
    if (abilityId && !rareAbilityDiscoveries.has(abilityId)) {
      rareAbilityDiscoveries.set(abilityId, entryDate);
    }
  }
  const chromaticAbilities = Object.entries(
    CREATURE_RARE_ABILITY_DEFINITIONS,
  ).map(([id, definition]) => ({
    id,
    rarity: definition.rarity,
    discovered: creature.rareAbilities[id] !== undefined,
    discoveredAt: rareAbilityDiscoveries.get(id) ?? null,
    level: creature.rareAbilities[id]?.level ?? 0,
  }));

  const fossils = creature.fossils.map((fossil) => ({
    ...fossil,
    discoveredAt: fossil.sealedAt,
  }));
  const scarDiscoveries = new Map();
  for (const fossil of fossils) {
    if (
      !scarDiscoveries.has(fossil.scarId) ||
      fossil.discoveredAt < scarDiscoveries.get(fossil.scarId)
    ) {
      scarDiscoveries.set(fossil.scarId, fossil.discoveredAt);
    }
  }
  const scars = Object.values(CREATURE_SCARS).map((id) => ({
    id,
    discovered: scarDiscoveries.has(id),
    discoveredAt: scarDiscoveries.get(id) ?? null,
  }));
  const phenomenonDiscoveries = new Map();
  for (const event of habitatEvents(state, date)) {
    if (!phenomenonDiscoveries.has(event.id)) {
      phenomenonDiscoveries.set(event.id, event.discoveredAt);
    }
  }
  const habitatPhenomena = Object.entries(HABITAT_COPY.events).map(
    ([id, event]) => ({
      id,
      routeId: event.route,
      decorationId: event.decorationId,
      discovered: phenomenonDiscoveries.has(id),
      discoveredAt: phenomenonDiscoveries.get(id) ?? null,
    }),
  );
  const expeditionArtifactDiscoveries = new Map(
    (state.expeditions?.artifactRecords ?? [])
      .filter(({ discoveredAt }) => discoveredAt <= date)
      .map((record) => [record.id, record]),
  );
  const expeditionArtifacts = EXPEDITION_ARTIFACT_DEFINITIONS.map(
    (definition) => {
      const record = expeditionArtifactDiscoveries.get(definition.id);
      return {
        id: definition.id,
        destinationId: definition.destinationId,
        rarity: definition.rarity,
        discovered: record !== undefined,
        discoveredAt: record?.discoveredAt ?? null,
        expeditionId: record?.expeditionId ?? null,
      };
    },
  );
  const expeditionAchievementDiscoveries = new Map(
    (state.expeditions?.achievementRecords ?? [])
      .filter(({ discoveredAt }) => discoveredAt <= date)
      .map((record) => [record.id, record]),
  );
  const expeditionAchievements = EXPEDITION_ACHIEVEMENT_DEFINITIONS.map(
    (definition) => {
      const record = expeditionAchievementDiscoveries.get(definition.id);
      return {
        id: definition.id,
        rarity: definition.rarity,
        discovered: record !== undefined,
        discoveredAt: record?.discoveredAt ?? null,
        expeditionId: record?.expeditionId ?? null,
      };
    },
  );
  const provenance = (entry, sourceType, sourceId, relatedId = null) => ({
    firstDiscoveredAt: entry.discoveredAt,
    sourceType,
    sourceId,
    relatedId,
  });
  for (const entry of forms) {
    const source = specimens.find((specimen) => specimen.formId === entry.id);
    entry.provenance = entry.discovered
      ? provenance(entry, "specimen_record", source?.id ?? null, entry.id)
      : null;
  }
  for (const entry of achievements) {
    entry.provenance = entry.discovered
      ? provenance(
          entry,
          "behavioral_evidence",
          entry.discoveredAt,
          state.days?.[entry.discoveredAt]?.event?.id ?? entry.id,
        )
      : null;
  }
  for (const entry of chromaticAbilities) {
    entry.provenance = entry.discovered
      ? provenance(entry, "chromatic_mutation", entry.discoveredAt, entry.id)
      : null;
  }
  for (const entry of scars) {
    const source = fossils.find((fossil) => fossil.scarId === entry.id);
    entry.provenance = entry.discovered
      ? provenance(entry, "generation_seal", source?.id ?? null, entry.id)
      : null;
  }
  for (const entry of habitatPhenomena) {
    entry.provenance = entry.discovered
      ? provenance(entry, "habitat_event", entry.id, entry.decorationId)
      : null;
  }
  for (const entry of expeditionArtifacts) {
    entry.provenance = entry.discovered
      ? provenance(
          entry,
          "expedition_artifact",
          entry.expeditionId,
          entry.destinationId,
        )
      : null;
  }
  for (const entry of expeditionAchievements) {
    entry.provenance = entry.discovered
      ? provenance(
          entry,
          "expedition_return",
          entry.expeditionId,
          entry.id,
        )
      : null;
  }
  for (const entry of specimens) {
    entry.provenance = provenance(entry, "specimen_record", entry.id, entry.formId);
  }
  for (const entry of foreignSpecimens) {
    entry.provenance = provenance(entry, "encounter", entry.id, entry.typeId);
  }
  for (const entry of caseSlices) {
    entry.provenance = provenance(entry, "case_choice", entry.id, entry.caseId);
  }
  for (const entry of incidentReports) {
    entry.provenance = provenance(
      entry,
      "incident_aftermath",
      entry.id,
      entry.incidentId,
    );
  }
  for (const entry of cultures) {
    entry.provenance = provenance(entry, "laboratory_culture", entry.id, entry.typeId);
  }
  for (const entry of companions) {
    entry.provenance = provenance(entry, "companion_bond", entry.id, entry.routeId);
  }
  for (const entry of fossils) {
    entry.provenance = provenance(entry, "generation_seal", entry.id, entry.scarId);
  }
  const fixedCollections = [
    ...forms,
    ...achievements,
    ...chromaticAbilities,
    ...scars,
    ...habitatPhenomena,
    ...expeditionArtifacts,
    ...expeditionAchievements,
  ];
  const fixedDiscovered = fixedCollections.filter(
    (entry) => entry.discovered,
  ).length;
  const recent = [
    ...forms.map((entry) => ({ type: "form", ...entry })),
    ...achievements.map((entry) => ({ type: "achievement", ...entry })),
    ...chromaticAbilities.map((entry) => ({
      type: "chromaticAbility",
      ...entry,
    })),
    ...scars.map((entry) => ({ type: "scar", ...entry })),
    ...habitatPhenomena.map((entry) => ({
      type: "habitatPhenomenon",
      ...entry,
    })),
    ...expeditionArtifacts.map((entry) => ({
      type: "expeditionArtifact",
      ...entry,
    })),
    ...expeditionAchievements.map((entry) => ({
      type: "expeditionAchievement",
      ...entry,
    })),
    ...specimens.map((entry) => ({
      type: "specimen",
      id: entry.id,
      discovered: true,
      discoveredAt: entry.discoveredAt,
    })),
    ...foreignSpecimens.map((entry) => ({
      type: "foreignSpecimen",
      id: entry.id,
      discovered: true,
      discoveredAt: entry.discoveredAt,
    })),
    ...caseSlices.map((entry) => ({
      type: "caseSlice",
      id: entry.id,
      discovered: true,
      discoveredAt: entry.discoveredAt,
    })),
    ...incidentReports.map((entry) => ({
      type: "incidentReport",
      id: entry.id,
      discovered: true,
      discoveredAt: entry.discoveredAt,
    })),
    ...cultures.map((entry) => ({
      type: "culture",
      id: entry.id,
      discovered: true,
      discoveredAt: entry.discoveredAt,
    })),
    ...companions.map((entry) => ({
      type: "companion",
      id: entry.id,
      discovered: true,
      discoveredAt: entry.discoveredAt,
    })),
    ...fossils.map((entry) => ({
      type: "fossil",
      id: entry.id,
      discovered: true,
      discoveredAt: entry.discoveredAt,
    })),
  ]
    .filter((entry) => entry.discovered && entry.discoveredAt === date)
    .map(({ type, id, discoveredAt }) => ({ type, id, discoveredAt }));

  const sections = {
    forms,
    achievements,
    chromaticAbilities,
    scars,
    habitatPhenomena,
    expeditionArtifacts,
    expeditionAchievements,
    specimens,
    foreignSpecimens,
    caseSlices,
    incidentReports,
    cultures,
    companions,
    fossils,
  };
  const collectionSets = deriveCollectionSets({
    sections: { ...sections, cultures: collectionCultures },
  });
  const collectionPhenotype = deriveCollectionPhenotype(
    { sections },
    creature.ecology.type,
  );

  return {
    date,
    specimenId: creature.appearance.specimenId,
    cabinet: {
      featured: [...(state.cabinet?.featured ?? [])].slice(0, 3),
    },
    capacity: creatureAppearanceCapacity(),
    summary: {
      fixed: {
        discovered: fixedDiscovered,
        total: fixedCollections.length,
        percent: Math.round(
          (fixedDiscovered / fixedCollections.length) * 100,
        ),
      },
      forms: {
        discovered: forms.filter((entry) => entry.discovered).length,
        total: forms.length,
      },
      achievements: {
        discovered: achievements.filter((entry) => entry.discovered).length,
        total: achievements.length,
      },
      chromaticAbilities: {
        discovered: chromaticAbilities.filter((entry) => entry.discovered)
          .length,
        total: chromaticAbilities.length,
      },
      scars: {
        discovered: scars.filter((entry) => entry.discovered).length,
        total: scars.length,
      },
      habitatPhenomena: {
        discovered: habitatPhenomena.filter((entry) => entry.discovered)
          .length,
        total: habitatPhenomena.length,
      },
      expeditionArtifacts: {
        discovered: expeditionArtifacts.filter((entry) => entry.discovered)
          .length,
        total: expeditionArtifacts.length,
      },
      expeditionAchievements: {
        discovered: expeditionAchievements.filter(
          (entry) => entry.discovered,
        ).length,
        total: expeditionAchievements.length,
      },
      specimens: { discovered: specimens.length },
      foreignSpecimens: { discovered: foreignSpecimens.length },
      caseSlices: { discovered: caseSlices.length },
      incidentReports: { discovered: incidentReports.length },
      cultures: { discovered: cultures.length },
      companions: { discovered: companions.length },
      fossils: { discovered: fossils.length },
    },
    sections,
    collectionSets,
    collectionPhenotype,
    recent,
  };
}

export { deriveCreatureCodex };
