import { strict as assert } from "node:assert";
import test from "node:test";

import {
  COLLECTION_PHENOTYPE_MILESTONES,
  deriveCollectionPhenotype,
} from "../src/collection-phenotype.mjs";
import {
  creatureAppearanceCapacity,
  creatureAppearanceState,
  creatureArt,
  deriveCreatureAppearance,
} from "../src/creature/appearance.mjs";

const FIXED_SECTIONS = [
  "forms",
  "achievements",
  "chromaticAbilities",
  "scars",
  "habitatPhenomena",
  "expeditionArtifacts",
  "expeditionAchievements",
];

function codexWithDiscoveries(counts) {
  let sequence = 0;
  return {
    sections: Object.fromEntries(
      FIXED_SECTIONS.map((sectionId) => [
        sectionId,
        Array.from({ length: counts[sectionId] ?? 0 }, (_, index) => {
          sequence += 1;
          return {
            id: `${sectionId}-${index + 1}`,
            discovered: true,
            discoveredAt: `2026-01-${String(sequence).padStart(3, "0")}`,
          };
        }),
      ]),
    ),
  };
}

test("collection phenotype milestones require both fixed count and category breadth", () => {
  assert.deepEqual(
    COLLECTION_PHENOTYPE_MILESTONES.map(({ count, breadth }) => ({ count, breadth })),
    [
      { count: 34, breadth: 3 },
      { count: 67, breadth: 5 },
      { count: 101, breadth: 6 },
      { count: 134, breadth: 7 },
    ],
  );

  const narrow = deriveCollectionPhenotype(codexWithDiscoveries({ forms: 34 }), "polluted");
  assert.equal(narrow.tier, 0);
  assert.equal(narrow.discovered, 34);
  assert.equal(narrow.breadth, 1);

  const broad = deriveCollectionPhenotype(
    codexWithDiscoveries({
      forms: 10,
      achievements: 10,
      chromaticAbilities: 10,
      scars: 4,
      habitatPhenomena: 20,
      expeditionArtifacts: 13,
    }),
    "polluted",
  );
  assert.equal(broad.tier, 2);
  assert.equal(broad.milestone, 67);
  assert.equal(broad.breadthRequired, 5);
  assert.equal(broad.motifId, "expeditionArtifacts");
  assert.equal(broad.triggeredAt, "2026-01-067");
  assert.equal(broad.routeId, "pollution");
  assert.equal(broad.presentationOnly, true);
});

test("collection phenotype decorates display art without changing specimen identity", () => {
  const state = creatureAppearanceState("collection-phenotype-seed");
  const appearance = deriveCreatureAppearance(
    state,
    3,
    "polluted",
    "nuclear",
    [],
    {},
  );
  const creature = {
    appearance,
    collectionPhenotype: {
      tier: 2,
      motifId: "expeditionArtifacts",
      routeId: "pollution",
    },
  };
  const before = appearance.fingerprint;
  const art = creatureArt(creature);

  assert.match(art, /⌁◇⌁/);
  assert.equal(appearance.fingerprint, before);
  assert.equal(creature.appearance.partIds.some((id) => id.startsWith("collection_")), false);

  const capacity = creatureAppearanceCapacity();
  assert.equal(capacity.finalAsciiForms, 204_374_016);
  assert.equal(capacity.collectionPhenotypes, 29);
  assert.equal(
    capacity.displayedAsciiForms,
    capacity.finalAsciiForms * capacity.collectionPhenotypes,
  );
});
