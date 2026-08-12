import { createHash } from "node:crypto";

import { deriveCreatureCodex } from "./creature/codex.mjs";
import {
  CREATURE_STAGES,
  CREATURE_CONTENT_VERSION,
  CREATURE_FORMS,
  CREATURE_APPEARANCE_GENE_POOLS,
  CREATURE_KAIJU_GLYPHS,
  CREATURE_BRANCH_PARTS,
  CREATURE_ECOLOGY_PARTS,
  CREATURE_ECOLOGY_FORM_IDS,
  CREATURE_ACHIEVEMENT_DEFINITIONS,
  CREATURE_ACHIEVEMENT_BY_ID,
  CREATURE_ACHIEVEMENT_TIER_THRESHOLDS,
  COMMON_CREATURE_EVENTS,
  RARE_CREATURE_EVENTS,
  CREATURE_ABILITY_KEYS,
  CREATURE_ABILITY_MAX,
  CREATURE_MALIGNANCY_EVOLUTION_BONUS,
  CREATURE_MALIGNANCY_TITLE_IDS,
  CREATURE_RARE_ABILITY_MAX,
  CREATURE_GENERATION_LENGTH,
  CREATURE_INHERITANCE_BONUS,
  CREATURE_RARE_ABILITY_CHANCES,
  CREATURE_RARE_ABILITY_POOLS,
  CREATURE_RARE_ABILITY_RANKS,
  CREATURE_RARE_ABILITY_DEFINITIONS,
  CREATURE_BRANCH_ABILITIES,
  CREATURE_EVOLUTION_DEFINITIONS,
  CREATURE_EVOLUTION_POOLS,
  CREATURE_SCARS,
  CREATURE_TALENTS,
  CREATURE_TEMPERAMENTS,
  CREATURE_EPITHETS,
  CREATURE_COPY,
} from "./creature/content.mjs";
import {
  CREATURE_BALANCE_VERSION,
  CREATURE_ECOLOGY_WINDOW,
  classifyCreatureEcologyWindow,
  creatureEcologyGainsForDose,
  creatureEcologyWindow,
  creatureUsageBand,
  creatureUsageBaseline,
} from "./creature/balance.mjs";
import {
  creatureAbilityBar,
  creatureAbilityProgress,
  creatureAppearanceContentStats,
  creatureAppearanceState,
  creatureLabel,
  creatureMalignancyRankLabel,
  creatureSpecimenSnapshot,
  creatureTitle,
  deriveCreatureAppearance,
  isCreatureSpecimenSnapshot,
  roundCreature,
} from "./creature/appearance.mjs";
import {
  creatureStatePath,
  loadCreatureState as loadCreatureStateFile,
  resetCreatureState,
  saveCreatureState,
} from "./creature/state.mjs";

const LEGACY_COMMON_CREATURE_EVENTS = COMMON_CREATURE_EVENTS.slice(0, 12);
const LEGACY_RARE_CREATURE_EVENTS = RARE_CREATURE_EVENTS.slice(0, 8);
const LEGACY_RARE_ABILITY_POOLS = {
  rare: CREATURE_RARE_ABILITY_POOLS.rare.slice(0, 3),
  epic: CREATURE_RARE_ABILITY_POOLS.epic.slice(0, 2),
  mythic: CREATURE_RARE_ABILITY_POOLS.mythic.slice(0, 1),
};

function emptyCreatureAbilities() {
  return Object.fromEntries(CREATURE_ABILITY_KEYS.map((key) => [key, 0]));
}

function creatureRareChance(instability = 0, bonus = 0) {
  return Math.min(
    30,
    Math.min(20, 8 + Math.floor(instability / 10)) + bonus,
  );
}

function creatureEvent(
  seed,
  date,
  instability = 0,
  rareChanceBonus = 0,
  contentVersion = CREATURE_CONTENT_VERSION,
) {
  const digest = createHash("sha256").update(`${seed}:${date}`).digest();
  const rare =
    digest.readUInt32BE(0) % 100 <
    creatureRareChance(instability, rareChanceBonus);
  const pool = contentVersion >= 2
    ? rare ? RARE_CREATURE_EVENTS : COMMON_CREATURE_EVENTS
    : rare ? LEGACY_RARE_CREATURE_EVENTS : LEGACY_COMMON_CREATURE_EVENTS;
  const traits = ["context", "cache", "frenzy", "nuclear"];
  const trait = traits[digest.readUInt32BE(4) % traits.length];
  const variants = pool.filter((event) => event.trait === trait);
  const event = variants[digest.readUInt32BE(8) % variants.length];
  return {
    ...event,
    rarity: rare ? "rare" : "common",
  };
}

function creatureRareAbilityGain(
  seed,
  date,
  active,
  contentVersion = CREATURE_CONTENT_VERSION,
) {
  if (!active) return null;
  const digest = createHash("sha256")
    .update(`${seed}:${date}:rare-ability`)
    .digest();
  const roll = digest.readUInt32BE(0) % 100_000;
  const rarity =
    roll < 20
      ? "mythic"
      : roll < 120
        ? "epic"
        : roll < 620
          ? "rare"
          : null;
  if (!rarity) return null;
  const pool = contentVersion >= 2
    ? CREATURE_RARE_ABILITY_POOLS[rarity]
    : LEGACY_RARE_ABILITY_POOLS[rarity];
  return {
    id: pool[digest.readUInt32BE(4) % pool.length],
    rarity,
    points: 1,
  };
}

function pollutionDose(totalTokens) {
  if (totalTokens <= 0) return 0;
  return Math.min(100, Math.max(1, Math.round(Math.log10(totalTokens + 1) * 12)));
}

function dailyCreatureRecord(report, historicalReports = []) {
  const { totals } = report;
  const dose = pollutionDose(totals.totalTokens);
  if (dose === 0) {
    return {
      contentVersion: CREATURE_CONTENT_VERSION,
      balanceVersion: CREATURE_BALANCE_VERSION,
      pollutionDose: 0,
      active: false,
      usageBand: "sober",
      ecologyGains: {
        pollution: 0,
        clarity: 3,
      },
      traits: {
        context: 0,
        cache: 0,
        frenzy: 0,
        nuclear: 0,
      },
    };
  }

  const requests = Math.max(1, totals.requests);
  const uncachedInput = Math.max(
    0,
    totals.inputTokens -
      totals.cachedInputTokens -
      totals.cacheWriteInputTokens,
  );
  const averageInput = uncachedInput / requests;
  const contextIntensity = Math.min(1, averageInput / 100_000);
  const cacheIntensity =
    totals.inputTokens === 0
      ? 0
      : Math.min(1, totals.cachedInputTokens / totals.inputTokens);
  const frenzyIntensity = Math.min(1, totals.requests / 50);
  const dominantIntensity = Math.max(
    contextIntensity,
    cacheIntensity,
    frenzyIntensity,
  );
  const baselineTokens = creatureUsageBaseline(historicalReports);
  const usage = creatureUsageBand(totals.totalTokens, baselineTokens);
  const ecologyGains = creatureEcologyGainsForDose(usage, dose);

  return {
    contentVersion: CREATURE_CONTENT_VERSION,
    balanceVersion: CREATURE_BALANCE_VERSION,
    pollutionDose: dose,
    active: true,
    usageBand: usage.id,
    ecologyGains,
    traits: {
      context: roundCreature(dose * contextIntensity),
      cache: roundCreature(dose * cacheIntensity),
      frenzy: roundCreature(dose * frenzyIntensity),
      nuclear: roundCreature(dose * (1 - dominantIntensity * 0.6)),
    },
  };
}

function dominantCreatureKey(values) {
  return Object.entries(values).sort(
    ([leftKey, left], [rightKey, right]) =>
      right - left || leftKey.localeCompare(rightKey),
  )[0][0];
}

function creatureAbilityGains(seed, date, day, event, hasHatched) {
  const gains = emptyCreatureAbilities();
  if (!day.active) {
    if (hasHatched) gains.withdrawal = 1;
    return gains;
  }

  const digest = createHash("sha256")
    .update(`${seed}:${date}:ability`)
    .digest();
  const branch = dominantCreatureKey(day.traits);
  const branchAbility = CREATURE_BRANCH_ABILITIES[branch];
  const randomPool = ["memory", "shell", "mouths", "glow", "instability"];
  const randomAbility = randomPool[digest.readUInt32BE(0) % randomPool.length];

  gains.appetite = 1;
  gains[branchAbility] += 1;
  if (digest.readUInt8(4) % 4 === 0) gains[randomAbility] += 1;

  if (event) {
    const eventDefinition = [...COMMON_CREATURE_EVENTS, ...RARE_CREATURE_EVENTS]
      .find((candidate) => candidate.id === event.id);
    const eventAbility = CREATURE_BRANCH_ABILITIES[
      event.trait ?? eventDefinition?.trait
    ];
    if (eventAbility) {
      gains[eventAbility] += 1;
    }
    if (event.rarity === "rare") gains.instability += 1;
  }

  return gains;
}

function deriveCreatureAchievements(state, date) {
  const entries = Object.entries(state.days)
    .filter(([entryDate]) => entryDate <= date)
    .sort(([left], [right]) => left.localeCompare(right));
  const unlocked = new Map();
  const unlock = (id, unlockedAt, progress = null) => {
    const definition = CREATURE_ACHIEVEMENT_BY_ID[id];
    const thresholds = CREATURE_ACHIEVEMENT_TIER_THRESHOLDS[id] ?? null;
    const existing = unlocked.get(id);
    const bestProgress =
      progress === null
        ? null
        : Math.max(existing?.progress ?? 0, progress);
    const tier =
      thresholds === null
        ? 1
        : thresholds.filter((threshold) => bestProgress >= threshold).length;
    unlocked.set(id, {
      id,
      category: definition.category,
      rarity: definition.rarity,
      tier,
      maxTier: thresholds?.length ?? 1,
      progress: bestProgress,
      nextTierAt: thresholds?.[tier] ?? null,
      unlockedAt: existing?.unlockedAt ?? unlockedAt,
    });
  };
  const branchCounts = { context: 0, cache: 0, frenzy: 0, nuclear: 0 };
  const branchStreaks = { context: 0, cache: 0, frenzy: 0, nuclear: 0 };
  const cumulativeTraits = { context: 0, cache: 0, frenzy: 0, nuclear: 0 };
  const recentDirections = [];
  const recentEcologyGains = [];
  let hasHatched = false;
  let experienceDays = 0;
  let activeStreak = 0;
  let quietStreak = 0;
  let heavyDays = 0;
  let restrainedDays = 0;
  let pollutionDays = 0;
  let clarityDays = 0;
  let ecologyPollution = 0;
  let ecologyClarity = 0;
  let ecologyType = "unformed";
  let pendingEcologyType = null;
  let pendingEcologyDays = 0;
  let clarityAfterHeavy = 0;
  let previousUsageBand = null;
  let previousDirection = null;
  let directionChanges = 0;
  let detoxCycles = 0;

  for (const [entryDate, day] of entries) {
    const priorQuietStreak = quietStreak;
    if (!hasHatched && !day.active) continue;
    if (day.active) hasHatched = true;
    experienceDays += 1;

    if (day.active) {
      activeStreak += 1;
      quietStreak = 0;
      if (priorQuietStreak >= 3) unlock("refill_withdrawal", entryDate);
      const branch = dominantCreatureKey(day.traits);
      for (const key of Object.keys(branchStreaks)) {
        branchStreaks[key] = key === branch ? branchStreaks[key] + 1 : 0;
      }
      branchCounts[branch] += 1;
      for (const key of Object.keys(cumulativeTraits)) {
        cumulativeTraits[key] += day.traits[key];
      }
    } else {
      activeStreak = 0;
      quietStreak += 1;
      if (quietStreak === 1) unlock("first_supply_cut", entryDate);
    }

    const pollutionGain = day.ecologyGains?.pollution ?? 0;
    const clarityGain = day.ecologyGains?.clarity ?? 0;
    ecologyPollution += pollutionGain;
    ecologyClarity += clarityGain;
    recentEcologyGains.push({ pollution: pollutionGain, clarity: clarityGain });
    if (recentEcologyGains.length > CREATURE_ECOLOGY_WINDOW) {
      recentEcologyGains.shift();
    }
    if (pollutionGain > 0) pollutionDays += 1;
    if (clarityGain > 0) clarityDays += 1;
    recentDirections.push(
      pollutionGain > 0 ? "pollution" : clarityGain > 0 ? "clarity" : "neutral",
    );
    const currentDirection = recentDirections.at(-1);
    if (
      previousDirection !== null &&
      currentDirection !== "neutral" &&
      previousDirection !== currentDirection
    ) {
      directionChanges += 1;
    }
    if (currentDirection !== "neutral") previousDirection = currentDirection;
    if (recentDirections.length > 14) recentDirections.shift();

    const candidateEcologyType = classifyCreatureEcologyWindow(
      recentEcologyGains,
    ).type;
    if (candidateEcologyType === ecologyType) {
      pendingEcologyType = null;
      pendingEcologyDays = 0;
    } else {
      if (candidateEcologyType === pendingEcologyType) {
        pendingEcologyDays += 1;
      } else {
        pendingEcologyType = candidateEcologyType;
        pendingEcologyDays = 1;
      }
      if (pendingEcologyDays >= 3) {
        ecologyType = candidateEcologyType;
        pendingEcologyType = null;
        pendingEcologyDays = 0;
      }
    }

    if (["heavy", "binge", "meltdown"].includes(day.usageBand)) {
      heavyDays += 1;
      clarityAfterHeavy = 0;
    } else if (clarityGain > 0 && heavyDays > 0) {
      clarityAfterHeavy += 1;
    } else if (pollutionGain > 0) {
      clarityAfterHeavy = 0;
    }
    if (day.usageBand === "restrained") restrainedDays += 1;

    if (heavyDays >= 3) {
      unlock("baseline_arsonist", entryDate, heavyDays);
    }
    if (branchStreaks.context >= 5) {
      unlock("context_hamster", entryDate, branchStreaks.context);
    }
    if (branchCounts.cache >= 5) {
      unlock("cache_excavation_team", entryDate, branchCounts.cache);
    }
    if (branchCounts.frenzy >= 5) {
      unlock("request_hydra", entryDate, branchCounts.frenzy);
    }
    if (branchCounts.nuclear >= 5) {
      unlock("desk_reactor", entryDate, branchCounts.nuclear);
    }
    if (activeStreak >= 7) {
      unlock("seven_day_feeding", entryDate, activeStreak);
    }
    if (pollutionGain >= 3) unlock("one_day_calamity", entryDate);
    if (
      recentDirections.length === 14 &&
      recentDirections.filter((direction) => direction === "pollution").length >=
        10
    ) {
      unlock("stable_relapse", entryDate);
    }

    if (quietStreak >= 3) {
      unlock("three_day_seal", entryDate, quietStreak);
    }
    if (quietStreak >= 7) unlock("seven_day_silence", entryDate);
    if (clarityDays >= 5) {
      unlock("below_baseline_survivor", entryDate, clarityDays);
    }
    if (restrainedDays >= 3) {
      unlock("half_price_brain", entryDate, restrainedDays);
    }
    if (clarityAfterHeavy >= 3) {
      unlock("human_mode_reboot", entryDate, clarityAfterHeavy);
    }
    if (
      recentDirections.length === 14 &&
      recentDirections.filter((direction) => direction === "clarity").length >=
        10
    ) {
      unlock("fourteen_day_diet", entryDate);
    }
    if (experienceDays >= 90 && ecologyType === "lucid") {
      unlock("sober_and_alive", entryDate);
    }
    if (previousUsageBand === "meltdown" && day.usageBand === "sober") {
      unlock("calm_after_fire", entryDate);
    }
    if (
      previousUsageBand !== null &&
      previousUsageBand !== "sober" &&
      day.usageBand === "sober"
    ) {
      detoxCycles += 1;
    }
    const lastTenDirections = recentDirections
      .slice(-10)
      .filter((direction) => direction !== "neutral");
    const recentDirectionChanges = lastTenDirections
      .slice(1)
      .filter(
        (direction, index) => direction !== lastTenDirections[index],
      ).length;
    if (recentDirectionChanges >= 6) unlock("ecological_ping_pong", entryDate);

    const cumulativeBranch = dominantCreatureKey(cumulativeTraits);
    if (cumulativeBranch === "cache" && ecologyType === "lucid") {
      unlock("cache_saint", entryDate);
    }
    if (cumulativeBranch === "frenzy" && quietStreak >= 7) {
      unlock("sealed_hydra", entryDate);
    }
    if (
      cumulativeBranch === "nuclear" &&
      ecologyPollution > 0 &&
      ecologyClarity >= ecologyPollution
    ) {
      unlock("withdrawal_reactor", entryDate);
    }
    if (ecologyPollution >= 60 && ecologyClarity >= 60) {
      unlock(
        "double_sided_record",
        entryDate,
        Math.min(ecologyPollution, ecologyClarity),
      );
    }
    if (
      ecologyPollution >= 120 &&
      ecologyClarity >= 120 &&
      Math.abs(ecologyPollution - ecologyClarity) <= 10
    ) {
      unlock(
        "ecological_paradox",
        entryDate,
        Math.min(ecologyPollution, ecologyClarity),
      );
    }
    if ((day.contentVersion ?? 1) >= 2) {
      if (branchCounts.context >= 15) {
        unlock("context_landfill", entryDate, branchCounts.context);
      }
      if (branchCounts.cache >= 15) {
        unlock("cache_afterlife", entryDate, branchCounts.cache);
      }
      if (branchCounts.frenzy >= 15) {
        unlock("request_swarm", entryDate, branchCounts.frenzy);
      }
      if (branchCounts.nuclear >= 15) {
        unlock("heat_budget", entryDate, branchCounts.nuclear);
      }
      if (quietStreak >= 2) {
        unlock("weekend_human", entryDate, Math.floor(quietStreak / 2));
      }
      if (clarityDays >= 10) unlock("manual_thought", entryDate, clarityDays);
      if (quietStreak >= 14) unlock("quiet_month", entryDate, quietStreak);
      if (clarityDays >= 15) {
        unlock("low_power_custodian", entryDate, clarityDays);
      }
      if (detoxCycles >= 3) {
        unlock("scheduled_detox", entryDate, detoxCycles);
      }
      if (directionChanges >= 4) {
        unlock("bilingual_relapse", entryDate, directionChanges);
      }
      if (ecologyPollution >= 90 && ecologyClarity >= 90) {
        unlock(
          "balanced_damage",
          entryDate,
          Math.min(ecologyPollution, ecologyClarity),
        );
      }
      if (
        ecologyPollution >= 180 &&
        ecologyClarity >= 180 &&
        Math.abs(ecologyPollution - ecologyClarity) <= 15
      ) {
        unlock(
          "compliance_meltdown",
          entryDate,
          Math.min(ecologyPollution, ecologyClarity),
        );
      }
    }
    previousUsageBand = day.usageBand;
  }

  const records = [...unlocked.values()].sort(
    (left, right) =>
      left.unlockedAt.localeCompare(right.unlockedAt) ||
      left.id.localeCompare(right.id),
  );
  return {
    unlocked: records,
    recent: records.filter((achievement) => achievement.unlockedAt === date),
    total: CREATURE_ACHIEVEMENT_DEFINITIONS.length,
  };
}

function syncCreatureAchievements(state, date) {
  const achievements = deriveCreatureAchievements(state, date);
  state.achievements = Object.fromEntries(
    achievements.unlocked.map((achievement) => [
      achievement.id,
      achievement,
    ]),
  );
  for (const day of Object.values(state.days)) {
    day.achievementUnlockIds = [];
  }
  for (const achievement of achievements.unlocked) {
    state.days[achievement.unlockedAt]?.achievementUnlockIds.push(
      achievement.id,
    );
  }
  state.appearance.unlockedPartIds = [
    ...new Set([
      ...state.appearance.unlockedPartIds,
      ...achievements.unlocked.map(
        (achievement) => `achievement_${achievement.id}`,
      ),
    ]),
  ];
  return achievements;
}

function syncCreatureSpecimen(state, creature, date) {
  state.specimens ??= [];
  if (
    state.specimens.some(
      (specimen) => specimen.fingerprint === creature.appearance.fingerprint,
    )
  ) {
    return false;
  }
  const previous = state.specimens.at(-1);
  const appearanceChanged =
    previous === undefined ||
    previous.stageId !== creature.stage ||
    previous.ecologyId !== creature.ecology.type ||
    previous.achievementId !== creature.appearance.achievementId ||
    (previous.evolutionId ?? null) !==
      (creature.appearance.evolutionId ?? null) ||
    (creature.appearance.rareAbilityId !== null &&
      previous.rareAbilityId !== creature.appearance.rareAbilityId);
  if (!appearanceChanged) return false;
  state.specimens.push({
    fingerprint: creature.appearance.fingerprint,
    renderVersion: creature.appearance.version,
    recordedAt: date,
    experienceDays: creature.experienceDays,
    stageId: creature.stage,
    ecologyId: creature.ecology.type,
    pathologyId: creature.branch,
    achievementId: creature.appearance.achievementId,
    rareAbilityId: creature.appearance.rareAbilityId,
    evolutionId: creature.appearance.evolutionId ?? null,
    partIds: [...creature.appearance.partIds],
  });
  return true;
}

function creatureCodex(state, date) {
  return deriveCreatureCodex(state, date, deriveCreature(state, date));
}

function creatureGenerationNumber(experienceDays) {
  return experienceDays === 0
    ? 0
    : Math.floor((experienceDays - 1) / CREATURE_GENERATION_LENGTH) + 1;
}

function creatureEvolutionOptionIds(seed, generation) {
  const digest = createHash("sha256")
    .update(`${seed}:generation:${generation}:evolution-options`)
    .digest();
  return [
    CREATURE_EVOLUTION_POOLS.pollution[
      digest.readUInt8(0) % CREATURE_EVOLUTION_POOLS.pollution.length
    ],
    CREATURE_EVOLUTION_POOLS.clarity[
      digest.readUInt8(1) % CREATURE_EVOLUTION_POOLS.clarity.length
    ],
    CREATURE_EVOLUTION_POOLS.paradox[
      digest.readUInt8(2) % CREATURE_EVOLUTION_POOLS.paradox.length
    ],
  ];
}

function effectiveCreatureEntries(state, date) {
  const entries = Object.entries(state.days)
    .filter(([entryDate]) => entryDate <= date)
    .sort(([left], [right]) => left.localeCompare(right));
  const hatchIndex = entries.findIndex(([, day]) => day.active);
  return hatchIndex === -1 ? [] : entries.slice(hatchIndex);
}

function syncCreatureGenerations(state, date) {
  state.generations ??= { fossils: [], evolutions: {} };
  state.generations.fossils ??= [];
  state.generations.evolutions ??= {};
  const entries = effectiveCreatureEntries(state, date);
  const completedGenerations = Math.floor(
    entries.length / CREATURE_GENERATION_LENGTH,
  );

  for (let generation = 1; generation <= completedGenerations; generation += 1) {
    const sealedAt =
      entries[generation * CREATURE_GENERATION_LENGTH - 1][0];
    const creature = deriveCreature(state, sealedAt);
    const generationEntries = entries.slice(
      (generation - 1) * CREATURE_GENERATION_LENGTH,
      generation * CREATURE_GENERATION_LENGTH,
    );
    const abilityGains = Object.fromEntries(
      CREATURE_ABILITY_KEYS.map((ability) => [
        ability,
        generationEntries.reduce(
          (total, [, day]) =>
            total + (day.abilityGains?.[ability] ?? 0),
          0,
        ),
      ]),
    );
    const previousFossil = state.generations.fossils.find(
      (fossil) => fossil.generation === generation - 1,
    );
    const malignancyGains = Object.fromEntries(
      CREATURE_ABILITY_KEYS.map((ability) => [
        ability,
        Math.max(
          0,
          creature.malignancyRanks[ability] -
            (previousFossil?.abilitySnapshot?.[ability]?.malignancyRank ?? 0),
        ),
      ]),
    );
    const fossilDetails = {
      generation,
      sealedAt,
      ecologyId: creature.ecology.type,
      pathologyId: creature.branch,
      inheritanceAbilityId: creature.dominantAbility,
      scarId: CREATURE_SCARS[creature.ecology.type],
      appearanceFingerprint: creature.appearance.fingerprint,
      abilityGains,
      abilitySnapshot: creature.abilityProgress,
      malignancyGains,
    };
    const existingFossil = state.generations.fossils.find(
      (fossil) => fossil.generation === generation,
    );
    if (existingFossil) {
      Object.assign(existingFossil, fossilDetails);
    } else {
      state.generations.fossils.push({
        id: createHash("sha256")
          .update(`${state.seed}:generation:${generation}:fossil`)
          .digest("hex")
          .slice(0, 8),
        ...fossilDetails,
        evolutionId:
          state.generations.evolutions[String(generation)]?.selectedId ?? null,
      });
    }
    const nextGeneration = generation + 1;
    state.generations.evolutions[String(nextGeneration)] ??= {
      contentVersion: CREATURE_CONTENT_VERSION,
      generation: nextGeneration,
      offeredAt: sealedAt,
      optionIds: creatureEvolutionOptionIds(state.seed, nextGeneration),
      selectedId: null,
      selectedAt: null,
      status: "pending",
    };
  }
  state.generations.fossils.sort(
    (left, right) => left.generation - right.generation,
  );

  const currentGeneration = creatureGenerationNumber(entries.length);
  for (const evolution of Object.values(state.generations.evolutions)) {
    if (
      evolution.generation < currentGeneration &&
      evolution.selectedId === null
    ) {
      evolution.status = "missed";
    }
  }
  return state.generations;
}

function currentCreatureEvolutionState(state, date) {
  const generation = creatureGenerationNumber(
    effectiveCreatureEntries(state, date).length,
  );
  return Object.values(state.generations?.evolutions ?? {})
    .filter(
      (evolution) =>
        evolution.offeredAt <= date &&
        (evolution.generation === generation ||
          evolution.generation === generation + 1),
    )
    .sort((left, right) => left.generation - right.generation)
    .at(0);
}

function creatureEvolutionSummary(state, date) {
  const evolution = currentCreatureEvolutionState(state, date);
  if (!evolution) return null;
  const options = evolution.optionIds.map((id, index) => ({
    slot: index + 1,
    id,
    ...CREATURE_EVOLUTION_DEFINITIONS[id],
  }));
  const status =
    evolution.selectedAt !== null && evolution.selectedAt <= date
      ? "selected"
      : evolution.generation < creatureGenerationNumber(
            effectiveCreatureEntries(state, date).length,
          )
        ? "missed"
        : "pending";
  return {
    contentVersion: evolution.contentVersion ?? 1,
    generation: evolution.generation,
    status,
    selectedId: status === "selected" ? evolution.selectedId : null,
    selected:
      status !== "selected"
        ? null
        : options.find((option) => option.id === evolution.selectedId),
    options,
  };
}

function selectCreatureEvolution(state, date, choice) {
  const evolution = currentCreatureEvolutionState(state, date);
  if (!evolution) return { error: "unavailable" };
  const slot = Number(choice);
  if (
    !Number.isInteger(slot) ||
    slot < 1 ||
    slot > evolution.optionIds.length
  ) {
    return { error: "invalid", generation: evolution.generation };
  }
  const selectedId = evolution.optionIds[slot - 1];
  if (evolution.selectedId !== null && evolution.selectedId !== selectedId) {
    return { error: "locked", generation: evolution.generation };
  }
  const isNewSelection = evolution.selectedId === null;
  evolution.selectedId = selectedId;
  if (isNewSelection) evolution.contentVersion = CREATURE_CONTENT_VERSION;
  evolution.selectedAt ??= date;
  evolution.status = "selected";
  const fossil = state.generations.fossils.find(
    (candidate) =>
      candidate.generation === evolution.generation &&
      candidate.sealedAt === date,
  );
  if (fossil) fossil.evolutionId = selectedId;
  return { value: creatureEvolutionSummary(state, date) };
}

async function loadCreatureState() {
  return loadCreatureStateFile({
    creatureAbilityGains,
    creatureRareAbilityGain,
  });
}

function unlockedCreatureTalents(abilities) {
  return CREATURE_ABILITY_KEYS.flatMap((ability) =>
    CREATURE_TALENTS[ability]
      .filter((talent) => abilities[ability] >= talent.threshold)
      .map((talent) => talent.id),
  );
}

function creatureEvolutionRule(abilityTotals, abilityId) {
  const talentModifiers = CREATURE_TALENTS[abilityId].filter(
    (talent) => abilityTotals[abilityId] >= talent.threshold,
  ).length;
  const progress = creatureAbilityProgress(abilityTotals[abilityId]);
  const malignancyModifiers =
    progress.malignancyRank * CREATURE_MALIGNANCY_EVOLUTION_BONUS;
  return {
    procChancePercent: Math.min(
      35,
      5 +
        Math.min(10, Math.floor(abilityTotals[abilityId] / 25)) +
        talentModifiers * 2 +
        malignancyModifiers,
    ),
    talentModifiers,
    malignancyModifiers,
    benefitPoints: 1 + Math.floor(talentModifiers / 3),
    costPoints: 1 + Math.floor(talentModifiers / 5),
  };
}

function creatureEvolutionEffect(state, date, day, previousCreature) {
  const hasHatched = previousCreature.activeDays > 0 || day.active;
  if (!hasHatched) return null;
  const generation = creatureGenerationNumber(
    previousCreature.experienceDays + 1,
  );
  const evolution = state.generations?.evolutions?.[String(generation)];
  if (
    evolution?.status !== "selected" ||
    evolution.selectedAt > date
  ) {
    return null;
  }
  const definition = CREATURE_EVOLUTION_DEFINITIONS[evolution.selectedId];
  const rule = creatureEvolutionRule(
    previousCreature.abilityTotals,
    definition.abilityId,
  );
  const eligible =
    definition.category === "clarity" ? !day.active : day.active;
  const digest = createHash("sha256")
    .update(`${state.seed}:${date}:${evolution.selectedId}:rule-effect`)
    .digest();
  const triggered =
    eligible &&
    digest.readUInt32BE(0) % 10_000 < rule.procChancePercent * 100;
  return {
    generation,
    evolutionId: evolution.selectedId,
    category: definition.category,
    abilityId: definition.abilityId,
    procChancePercent: rule.procChancePercent,
    talentModifiers: rule.talentModifiers,
    malignancyModifiers: rule.malignancyModifiers,
    triggered,
    benefitId: definition.benefitId,
    benefitPoints: triggered ? rule.benefitPoints : 0,
    costId: definition.costId,
    costPoints: triggered ? rule.costPoints : 0,
  };
}

function applyCreatureEvolutionEffect(record, effect) {
  record.evolutionEffect = effect;
  if (!effect?.triggered) return record;
  if (effect.category === "pollution") {
    record.abilityGains[effect.abilityId] += effect.benefitPoints;
    record.ecologyGains.pollution += effect.costPoints;
  } else if (effect.category === "clarity") {
    record.ecologyGains.clarity += effect.benefitPoints;
    record.exposureRecoveryPenalty = effect.costPoints;
  } else {
    record.ecologyGains.pollution += effect.costPoints;
  }
  return record;
}

function creatureMood(creature, today) {
  if (creature.activeDays === 0) return "unhatched";
  if (!today.active) {
    return creature.quietStreakDays >= 3
      ? "withdrawal_delirium"
      : "withdrawal_tremor";
  }
  if (today.event?.rarity === "rare") return "mutation_high";
  if (today.pollutionDose >= 75) return "critical_overfeed";
  return "token_chewing";
}

function deriveCreature(state, date) {
  const entries = Object.entries(state.days)
    .filter(([entryDate]) => entryDate <= date)
    .sort(([left], [right]) => left.localeCompare(right));
  const traits = {
    context: 0,
    cache: 0,
    frenzy: 0,
    nuclear: 0,
  };
  const abilityTotals = emptyCreatureAbilities();
  const expeditionEffects = [
    ...(state.expeditions?.history ?? []),
    ...(state.expeditions?.active ? [state.expeditions.active] : []),
  ]
    .map((expedition) => ({
      id: expedition.id,
      ...expedition.permanentEffect,
    }))
    .filter(
      (effect) =>
        effect.abilityId &&
        effect.appliedAt &&
        effect.appliedAt <= date &&
        Number.isFinite(effect.delta),
    )
    .sort(
      (left, right) =>
        left.appliedAt.localeCompare(right.appliedAt) ||
        (left.appliedExperienceDay ?? Number.MAX_SAFE_INTEGER) -
          (right.appliedExperienceDay ?? Number.MAX_SAFE_INTEGER) ||
        left.id.localeCompare(right.id),
    );
  let expeditionEffectIndex = 0;
  const applyExpeditionEffectsThrough = (
    throughDate,
    experienceDays,
    inclusiveDate,
  ) => {
    while (expeditionEffectIndex < expeditionEffects.length) {
      const effect = expeditionEffects[expeditionEffectIndex];
      const withinBoundary = Number.isInteger(effect.appliedExperienceDay)
        ? effect.appliedExperienceDay <= experienceDays
        : inclusiveDate
          ? effect.appliedAt <= throughDate
          : effect.appliedAt < throughDate;
      if (!withinBoundary) break;
      expeditionEffectIndex += 1;
      if (!Object.hasOwn(abilityTotals, effect.abilityId)) continue;
      abilityTotals[effect.abilityId] = Math.max(
        0,
        abilityTotals[effect.abilityId] + effect.delta,
      );
    }
  };
  const rareAbilityLevels = {};
  let exposure = 0;
  let activeDays = 0;
  let activeStreakDays = 0;
  let quietStreakDays = 0;
  let ageDays = 0;
  let mutationEvents = 0;
  let rareMutations = 0;
  let ecologyPollution = 0;
  let ecologyClarity = 0;
  let ecologyType = "unformed";
  let pendingEcologyType = null;
  let pendingEcologyDays = 0;
  const recentEcologyGains = [];
  let evolutionTriggers = 0;
  let evolutionBenefitPoints = 0;
  let evolutionCostPoints = 0;

  for (const [entryDate, day] of entries) {
    applyExpeditionEffectsThrough(entryDate, ageDays, false);
    if (day.active) {
      exposure += day.pollutionDose;
      activeDays += 1;
      activeStreakDays += 1;
      quietStreakDays = 0;
      for (const key of Object.keys(traits)) traits[key] += day.traits[key];
      mutationEvents += 1;
      if (day.event?.rarity === "rare") rareMutations += 1;
    } else if (activeDays > 0) {
      exposure = Math.max(
        0,
        exposure - Math.max(0, 2 - (day.exposureRecoveryPenalty ?? 0)),
      );
      activeStreakDays = 0;
      quietStreakDays += 1;
    }
    if (activeDays > 0) ageDays += 1;
    if (activeDays > 0) {
      ecologyPollution += day.ecologyGains?.pollution ?? 0;
      ecologyClarity += day.ecologyGains?.clarity ?? 0;
      recentEcologyGains.push(day.ecologyGains ?? {});
      if (recentEcologyGains.length > CREATURE_ECOLOGY_WINDOW) {
        recentEcologyGains.shift();
      }
      const candidateEcologyType = classifyCreatureEcologyWindow(
        recentEcologyGains,
      ).type;
      if (candidateEcologyType === ecologyType) {
        pendingEcologyType = null;
        pendingEcologyDays = 0;
      } else {
        if (candidateEcologyType === pendingEcologyType) {
          pendingEcologyDays += 1;
        } else {
          pendingEcologyType = candidateEcologyType;
          pendingEcologyDays = 1;
        }
        if (pendingEcologyDays >= 3) {
          ecologyType = candidateEcologyType;
          pendingEcologyType = null;
          pendingEcologyDays = 0;
        }
      }
    }
    for (const key of CREATURE_ABILITY_KEYS) {
      abilityTotals[key] += day.abilityGains?.[key] ?? 0;
    }
    if (day.rareAbilityGain) {
      const { id, points } = day.rareAbilityGain;
      rareAbilityLevels[id] = Math.min(
        CREATURE_RARE_ABILITY_MAX,
        (rareAbilityLevels[id] ?? 0) + points,
      );
    }
    if (day.evolutionEffect?.triggered) {
      evolutionTriggers += 1;
      evolutionBenefitPoints += day.evolutionEffect.benefitPoints;
      evolutionCostPoints += day.evolutionEffect.costPoints;
    }
    applyExpeditionEffectsThrough(entryDate, ageDays, true);
  }
  applyExpeditionEffectsThrough(date, ageDays, true);

  for (const key of Object.keys(traits)) traits[key] = roundCreature(traits[key]);
  const branch = dominantCreatureKey(traits);
  const resolvedBranch = activeDays === 0 ? "nuclear" : branch;
  const rareAbilities = Object.fromEntries(
    Object.entries(CREATURE_RARE_ABILITY_DEFINITIONS)
      .filter(([id]) => rareAbilityLevels[id] > 0)
      .map(([id, definition]) => [
        id,
        {
          rarity: definition.rarity,
          level: rareAbilityLevels[id],
        },
      ]),
  );
  const generationNumber = creatureGenerationNumber(ageDays);
  const generationDay =
    ageDays === 0
      ? 0
      : ((ageDays - 1) % CREATURE_GENERATION_LENGTH) + 1;
  const fossils = (state.generations?.fossils ?? []).filter(
    (fossil) => fossil.sealedAt <= date,
  );
  const inheritedFossil =
    generationNumber > 1
      ? fossils.find(
          (fossil) => fossil.generation === generationNumber - 1,
        )
      : undefined;
  if (inheritedFossil) {
    abilityTotals[inheritedFossil.inheritanceAbilityId] +=
      CREATURE_INHERITANCE_BONUS;
  }
  const abilityProgress = Object.fromEntries(
    CREATURE_ABILITY_KEYS.map((ability) => [
      ability,
      creatureAbilityProgress(abilityTotals[ability]),
    ]),
  );
  const abilities = Object.fromEntries(
    CREATURE_ABILITY_KEYS.map((ability) => [
      ability,
      abilityProgress[ability].value,
    ]),
  );
  const malignancyRanks = Object.fromEntries(
    CREATURE_ABILITY_KEYS.map((ability) => [
      ability,
      abilityProgress[ability].malignancyRank,
    ]),
  );
  const malignancies = CREATURE_ABILITY_KEYS
    .filter((ability) => malignancyRanks[ability] > 0)
    .map((ability) => ({
      abilityId: ability,
      rank: malignancyRanks[ability],
      titleId: CREATURE_MALIGNANCY_TITLE_IDS[ability],
      evolutionChanceBonusPercent:
        malignancyRanks[ability] * CREATURE_MALIGNANCY_EVOLUTION_BONUS,
    }));
  const inheritedAbilityId = inheritedFossil?.inheritanceAbilityId ?? null;
  const scarId = inheritedFossil?.scarId ?? null;
  const dominantAbility = dominantCreatureKey(abilityTotals);
  const abilityPoints = Object.values(abilityTotals).reduce(
    (sum, value) => sum + value,
    0,
  );
  const talents = unlockedCreatureTalents(abilityTotals);
  const evolution = creatureEvolutionSummary(state, date);
  if (evolution) {
    evolution.options = evolution.options.map((option) => ({
      ...option,
      ...creatureEvolutionRule(abilityTotals, option.abilityId),
    }));
    evolution.selected =
      evolution.selectedId === null
        ? null
        : evolution.options.find(
            (option) => option.id === evolution.selectedId,
          );
  }
  const stageIndex = CREATURE_STAGES.findLastIndex(
    (stage) => generationDay >= stage.threshold,
  );
  const stage = CREATURE_STAGES[stageIndex];
  const nextStageAt =
    stage.nextAt === null
      ? null
      : generationNumber === 0
        ? stage.nextAt
        : (generationNumber - 1) * CREATURE_GENERATION_LENGTH + stage.nextAt;
  const ecologyWindow = creatureEcologyWindow(recentEcologyGains);
  const pollutionRate = roundCreature(ecologyWindow.pollutionRate);
  const clarityRate = roundCreature(ecologyWindow.clarityRate);
  const progressPercent =
    stage.nextAt === null
      ? 100
      : Math.min(
          100,
          Math.round(
            ((generationDay - stage.threshold) /
              (stage.nextAt - stage.threshold)) *
              100,
          ),
        );
  const achievements = deriveCreatureAchievements(state, date);
  const appearance = deriveCreatureAppearance(
    state.appearance,
    stageIndex,
    ecologyType,
    resolvedBranch,
    achievements.unlocked,
    rareAbilities,
    scarId,
    evolution?.status === "selected" && evolution.contentVersion >= 2
      ? evolution.selectedId
      : null,
  );
  const titleModifierId =
    ecologyType === "polluted"
      ? "scheduled_relapse"
      : ecologyType === "lucid"
        ? quietStreakDays >= 7
          ? "silent_for_seven_days"
          : "practicing_restraint"
        : ecologyType === "paradox"
          ? "withdrawing_while_refilling"
          : "awaiting_shape";

  return {
    stage: stage.id,
    branch: resolvedBranch,
    form: CREATURE_FORMS[resolvedBranch][stageIndex],
    exposure,
    nextStageAt,
    progressPercent,
    quietStreakDays,
    activeStreakDays,
    ageDays,
    experienceDays: ageDays,
    observedDays: entries.length,
    activeDays,
    traits,
    level: 1 + Math.floor(abilityPoints / 10),
    abilities,
    abilityTotals,
    abilityProgress,
    malignancyRanks,
    malignancies,
    abilityPoints,
    dominantAbility,
    temperament: CREATURE_TEMPERAMENTS[dominantAbility],
    epithet:
      activeDays === 0
        ? "unlicensed_specimen"
        : CREATURE_EPITHETS[dominantAbility],
    talents,
    rareChancePercent: creatureRareChance(abilityTotals.instability),
    rareAbilities,
    rareAbilityChancesPercent: { ...CREATURE_RARE_ABILITY_CHANCES },
    collections: {
      mutationEvents,
      rareMutations,
      talentsUnlocked: talents.length,
      rareAbilitiesUnlocked: Object.keys(rareAbilities).length,
      achievementsUnlocked: achievements.unlocked.length,
      formsUnlocked: new Set([
        appearance.formId,
        ...(state.specimens ?? []).map(
          (specimen) =>
            CREATURE_ECOLOGY_FORM_IDS[specimen.ecologyId]?.[
              specimen.pathologyId
            ],
        ),
      ]).size,
      appearancePartsUnlocked: new Set([
        ...appearance.partIds,
        ...state.appearance.unlockedPartIds,
      ]).size,
      specimensCollected: state.specimens?.length ?? 0,
      fossilsSealed: fossils.length,
      evolutionTriggers,
      evolutionBenefitPoints,
      evolutionCostPoints,
      evolutionsMissed: Object.values(
        state.generations?.evolutions ?? {},
      ).filter(
        (candidate) =>
          candidate.offeredAt <= date &&
          candidate.generation < generationNumber &&
          candidate.selectedId === null,
      ).length,
    },
    generation: {
      number: generationNumber,
      day: generationDay,
      length: CREATURE_GENERATION_LENGTH,
      progressPercent:
        ageDays === 0
          ? 0
          : Math.round(
              ((((ageDays - 1) % CREATURE_GENERATION_LENGTH) + 1) /
                CREATURE_GENERATION_LENGTH) *
                100,
            ),
      inheritedAbilityId,
      scarId,
    },
    fossils,
    evolution,
    ecology: {
      balanceVersion: CREATURE_BALANCE_VERSION,
      pollution: ecologyPollution,
      clarity: ecologyClarity,
      pollutionRate,
      clarityRate,
      windowDays: ecologyWindow.days,
      windowPollution: ecologyWindow.pollution,
      windowClarity: ecologyWindow.clarity,
      type: ecologyType,
      pendingType: pendingEcologyType,
      pendingDays: pendingEcologyDays,
    },
    ecologyForm: appearance.formId,
    appearance,
    achievements,
    title: {
      modifierId: titleModifierId,
      coreId: appearance.formId,
      achievementId: appearance.achievementId,
    },
  };
}

export {
  CREATURE_ABILITY_KEYS,
  CREATURE_ABILITY_MAX,
  CREATURE_COPY,
  CREATURE_RARE_ABILITY_CHANCES,
  CREATURE_RARE_ABILITY_MAX,
  CREATURE_RARE_ABILITY_RANKS,
  creatureAbilityBar,
  creatureAbilityGains,
  creatureAbilityProgress,
  creatureAppearanceContentStats,
  creatureAppearanceState,
  creatureCodex,
  creatureEvent,
  creatureEvolutionEffect,
  creatureEvolutionSummary,
  creatureLabel,
  creatureMood,
  creatureMalignancyRankLabel,
  creatureRareAbilityGain,
  creatureSpecimenSnapshot,
  creatureStatePath,
  creatureTitle,
  dailyCreatureRecord,
  deriveCreatureAppearance,
  deriveCreature,
  isCreatureSpecimenSnapshot,
  applyCreatureEvolutionEffect,
  loadCreatureState,
  roundCreature,
  resetCreatureState,
  saveCreatureState,
  selectCreatureEvolution,
  syncCreatureAchievements,
  syncCreatureGenerations,
  syncCreatureSpecimen,
};
