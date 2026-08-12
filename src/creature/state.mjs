import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";

import { ensureConsequenceCabinetState } from "../consequence-cabinet.mjs";
import { validateCreatureStateEnvelope } from "../core/creature-state.mjs";
import { ensureExpeditionState } from "../expedition.mjs";
import { ensureIncidentState } from "../incidents.mjs";
import {
  loadJsonState,
  resetJsonState,
  saveJsonState,
} from "../state-store.mjs";
import { creatureAppearanceState } from "./appearance.mjs";
import { CREATURE_CONTENT_VERSION } from "./content.mjs";

const CREATURE_STATE_SCHEMA_VERSION = 14;

function ensureAppearanceState(state) {
  state.appearance ??= creatureAppearanceState(state.seed);
  state.appearance.unlockedPartIds ??= [];
}

function ensureCollectionState(state) {
  state.achievements ??= {};
  state.specimens ??= [];
}

function ensureEncounterState(state) {
  state.foreignSpecimens ??= [];
}

function ensureGenerationState(state) {
  state.generations ??= { fossils: [], evolutions: {} };
}

function ensureCasebookState(state) {
  state.casebook ??= {
    cases: [],
    nextAtExperience: 14,
  };
  state.casebook.cases ??= [];
  state.casebook.nextAtExperience ??= 14;
}

function ensureLaboratoryState(state) {
  state.laboratory ??= {
    version: 2,
    nextBatch: 1,
    cultures: [],
    activeCultureId: null,
    bondHistory: [],
    imprintAssignments: {},
  };
  state.laboratory.version = 2;
  state.laboratory.nextBatch ??= (state.laboratory.cultures?.length ?? 0) + 1;
  state.laboratory.cultures ??= [];
  state.laboratory.activeCultureId ??= null;
  state.laboratory.bondHistory ??= [];
  state.laboratory.imprintAssignments ??= {};
}

function ensureCompanionState(state) {
  ensureLaboratoryState(state);
  for (const culture of state.laboratory.cultures) {
    if (!culture.companion) continue;
    culture.companion.imprints ??= {};
    culture.companion.anomalyIds ??= [];
  }
}

function ensureDailyGrowthState(state, growth) {
  let hasHatched = false;
  for (const [date, day] of Object.entries(state.days).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    day.usageBand ??= day.active ? "calibrating" : "sober";
    day.ecologyGains ??= day.active
      ? { pollution: 1, clarity: 0 }
      : {
          pollution: 0,
          clarity: hasHatched ? 3 : 0,
        };
    day.abilityGains ??= growth.creatureAbilityGains(
      state.seed,
      date,
      day,
      day.event,
      hasHatched,
    );
    day.rareAbilityGain ??= growth.creatureRareAbilityGain(
      state.seed,
      date,
      day.active,
      day.contentVersion,
    );
    if (day.active) hasHatched = true;
  }
}

function ensureCreatureContentVersion(state) {
  for (const day of Object.values(state.days)) {
    day.contentVersion ??= 1;
  }
  for (const evolution of Object.values(state.generations?.evolutions ?? {})) {
    evolution.contentVersion ??= 1;
  }
}

const CREATURE_STATE_MIGRATIONS = new Map([
  [1, ensureAppearanceState],
  [2, ensureCollectionState],
  [3, () => {}],
  [4, () => {}],
  [5, ensureGenerationState],
  [6, ensureEncounterState],
  [7, ensureCasebookState],
  [8, ensureLaboratoryState],
  [9, ensureCompanionState],
  [10, ensureIncidentState],
  [11, ensureConsequenceCabinetState],
  [12, ensureCreatureContentVersion],
  [13, ensureExpeditionState],
]);

function migrateCreatureState(state, growth) {
  while (state.schemaVersion < CREATURE_STATE_SCHEMA_VERSION) {
    const migrate = CREATURE_STATE_MIGRATIONS.get(state.schemaVersion);
    if (!migrate) {
      throw new Error(
        `Missing creature state migration for v${state.schemaVersion}`,
      );
    }
    migrate(state);
    state.schemaVersion += 1;
  }

  // Current-version normalization makes partially written legacy files
  // recoverable without inventing history or changing recorded growth.
  ensureAppearanceState(state);
  ensureCollectionState(state);
  ensureEncounterState(state);
  ensureGenerationState(state);
  ensureCasebookState(state);
  ensureLaboratoryState(state);
  ensureCompanionState(state);
  ensureIncidentState(state);
  ensureConsequenceCabinetState(state);
  ensureCreatureContentVersion(state);
  ensureExpeditionState(state);
  ensureDailyGrowthState(state, growth);
  return state;
}

function creatureStatePath() {
  return path.join(os.homedir(), ".anti-ai", "creature.json");
}

function validateCreatureState(state) {
  return validateCreatureStateEnvelope(
    state,
    CREATURE_STATE_SCHEMA_VERSION,
  );
}

async function loadCreatureState(growth) {
  return loadJsonState({
    target: creatureStatePath(),
    create: () => ({
      schemaVersion: CREATURE_STATE_SCHEMA_VERSION,
      seed:
        process.env.ANTI_AI_CREATURE_SEED ?? randomBytes(8).toString("hex"),
      days: {},
    }),
    validate: (state) => {
      validateCreatureState(state);
      state.seed ??=
        process.env.ANTI_AI_CREATURE_SEED ?? randomBytes(8).toString("hex");
      return state;
    },
    migrate: (state) => migrateCreatureState(state, growth),
  });
}

async function saveCreatureState(state) {
  await saveJsonState({
    target: creatureStatePath(),
    state,
    currentVersion: CREATURE_STATE_SCHEMA_VERSION,
  });
}

async function resetCreatureState() {
  await resetJsonState({ target: creatureStatePath() });
}

export {
  creatureStatePath,
  loadCreatureState,
  resetCreatureState,
  saveCreatureState,
};
