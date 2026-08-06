import { createHash } from "node:crypto";
import { EXPEDITION_ACHIEVEMENT_DEFINITIONS } from "./expedition/content.mjs";

const EXPEDITION_VERSION = 1;
const EXPEDITION_STEPS = 10;

const EXPEDITION_DESTINATIONS = Object.freeze([
  { id: "context_mine" },
  { id: "cache_swamp" },
  { id: "request_nest" },
  { id: "reactor_graveyard" },
]);

function ensureExpeditionState(state) {
  state.expeditions ??= {
    version: EXPEDITION_VERSION,
    nextSequence: 1,
    lastStartedExperienceDay: 0,
    active: null,
    history: [],
    artifactIds: [],
    achievementIds: [],
    artifactRecords: [],
    achievementRecords: [],
  };
  state.expeditions.version = EXPEDITION_VERSION;
  state.expeditions.nextSequence ??= 1;
  state.expeditions.lastStartedExperienceDay ??= 0;
  state.expeditions.active ??= null;
  state.expeditions.history ??= [];
  state.expeditions.artifactIds ??= [];
  state.expeditions.achievementIds ??= [];
  state.expeditions.artifactRecords ??= [];
  state.expeditions.achievementRecords ??= [];
  return state.expeditions;
}

function expeditionStartedOnOrBefore(expedition, date) {
  return date === undefined || expedition.startedAt <= date;
}

function expeditionEndedOnOrBefore(expedition, date) {
  const endedAt = expedition.completedAt ?? expedition.abandonedAt;
  return endedAt !== undefined && (date === undefined || endedAt <= date);
}

function settledExperienceDays(state) {
  let hatched = false;
  let experienceDays = 0;
  for (const [, day] of Object.entries(state.days ?? {}).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    if (!hatched && !day.active) continue;
    if (day.active) hatched = true;
    experienceDays += 1;
  }
  return experienceDays;
}

function expeditionEligibility(state, creature, date) {
  const expeditions = ensureExpeditionState(state);
  const experienceDays = creature.experienceDays ?? 0;
  const visibleRuns = [
    ...expeditions.history,
    ...(expeditions.active ? [expeditions.active] : []),
  ].filter((expedition) => expeditionStartedOnOrBefore(expedition, date));
  const active = expeditions.active && expeditionStartedOnOrBefore(
    expeditions.active,
    date,
  )
    ? expeditions.active
    : null;
  const lastStartedExperienceDay = date === undefined
    ? expeditions.lastStartedExperienceDay
    : visibleRuns.reduce(
        (latest, expedition) =>
          Math.max(latest, expedition.sourceExperienceDay ?? 0),
        0,
      );
  let reason = null;
  if (active !== null) reason = "active";
  else if (experienceDays === 0) reason = "unhatched";
  else if (experienceDays < settledExperienceDays(state)) reason = "expired";
  else if (experienceDays <= lastStartedExperienceDay) {
    reason = "used";
  }
  return {
    available: reason === null,
    reason,
    experienceDays,
    lastStartedExperienceDay,
  };
}

function expeditionStatus(state, creature, date) {
  const expeditions = ensureExpeditionState(state);
  const visibleStarted = [
    ...expeditions.history,
    ...(expeditions.active ? [expeditions.active] : []),
  ].filter((expedition) => expeditionStartedOnOrBefore(expedition, date));
  const visibleHistory = expeditions.history.filter((expedition) =>
    expeditionEndedOnOrBefore(expedition, date),
  );
  const active = expeditions.active && expeditionStartedOnOrBefore(
    expeditions.active,
    date,
  )
    ? expeditions.active
    : null;
  return {
    version: EXPEDITION_VERSION,
    date,
    eligibility: expeditionEligibility(state, creature, date),
    active: publicExpedition(active),
    latest: publicExpedition(visibleHistory.at(-1) ?? null),
    totals: {
      started: visibleStarted.length,
      completed: visibleHistory.filter(
        ({ status }) => status === "completed",
      ).length,
      abandoned: visibleHistory.filter(
        ({ status }) => status === "abandoned",
      ).length,
    },
  };
}

function digestInt(value, offset = 0) {
  const digest = createHash("sha256").update(value).digest();
  return digest.readUInt32BE(offset % 28);
}

function buildEventPlan(planSeed) {
  const kinds = [
    "empty",
    "empty",
    "observation",
    "observation",
    "condition",
    "condition",
    "ability",
    "choice",
    "wildcard",
    "wildcard",
  ];
  return kinds
    .map((kind, index) => ({
      id: `${kind}:${digestInt(`${planSeed}:variant:${index}`) % 8}:${index + 1}`,
      order: digestInt(`${planSeed}:order:${index}`),
    }))
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map(({ id }) => id);
}

function publicExpedition(expedition) {
  if (!expedition) return null;
  return {
    id: expedition.id,
    version: expedition.version,
    destinationId: expedition.destinationId,
    status: expedition.status,
    startedAt: expedition.startedAt,
    sourceExperienceDay: expedition.sourceExperienceDay,
    step: expedition.step,
    totalSteps: EXPEDITION_STEPS,
    pendingChoice: expedition.pendingChoice,
    events: expedition.events,
    temporaryEffects: expedition.temporaryEffects,
    permanentEffect: expedition.permanentEffect,
    artifactIds: expedition.artifactIds,
    achievementIds: expedition.achievementIds,
    ...(expedition.completedAt ? { completedAt: expedition.completedAt } : {}),
    ...(expedition.abandonedAt ? { abandonedAt: expedition.abandonedAt } : {}),
  };
}

function expeditionLastActionAt(expedition) {
  return expedition?.lastActionAt
    ?? expedition?.completedAt
    ?? expedition?.abandonedAt
    ?? expedition?.startedAt
    ?? null;
}

function expeditionDateIsBeforeLastAction(expedition, date) {
  const lastActionAt = expeditionLastActionAt(expedition);
  return lastActionAt !== null && date < lastActionAt;
}

function startExpedition(state, creature, date, destinationId) {
  const expeditions = ensureExpeditionState(state);
  if (!EXPEDITION_DESTINATIONS.some(({ id }) => id === destinationId)) {
    return { error: "invalid_destination" };
  }
  const eligibility = expeditionEligibility(state, creature, date);
  if (!eligibility.available) return { error: eligibility.reason };
  const sequence = expeditions.nextSequence;
  const planSeed = createHash("sha256")
    .update(
      [
        state.seed,
        sequence,
        destinationId,
        creature.generation?.number ?? 0,
        EXPEDITION_VERSION,
      ].join(":"),
    )
    .digest("hex");
  expeditions.active = {
    id: `exp-${String(sequence).padStart(4, "0")}`,
    version: EXPEDITION_VERSION,
    destinationId,
    status: "active",
    startedAt: date,
    lastActionAt: date,
    sourceExperienceDay: creature.experienceDays,
    step: 0,
    planSeed,
    eventPlan: buildEventPlan(planSeed),
    pendingChoice: null,
    events: [],
    temporaryEffects: [],
    permanentEffect: null,
    artifactIds: [],
    achievementIds: [],
  };
  expeditions.nextSequence += 1;
  expeditions.lastStartedExperienceDay = creature.experienceDays;
  return { value: publicExpedition(expeditions.active) };
}

function parsePlanEntry(entry) {
  const [kind, variantText] = entry.split(":");
  return { kind, variant: Number(variantText) };
}

function eventAbility(active, creature, step, suffix = "ability") {
  const abilityIds = Object.keys(creature.abilityTotals ?? creature.abilities ?? {});
  return abilityIds[
    digestInt(`${active.planSeed}:${step}:${suffix}`) % abilityIds.length
  ];
}

function eventIdentity(active, step, type, variant) {
  return `${active.destinationId}:${type}:${variant}:${step}`;
}

function resolveWildcard(active, step, variant, hasCompanion) {
  const roll = digestInt(`${active.planSeed}:${step}:wildcard`) % 100;
  if (roll < 20) return "artifact";
  if (roll < 25) return "anomaly";
  if (roll < 50) return "empty";
  if (hasCompanion && roll < 65) return "companion";
  return "observation";
}

function createExpeditionEvent(active, creature, step, date, companionId) {
  const { kind, variant } = parsePlanEntry(active.eventPlan[step - 1]);
  const type = kind === "wildcard"
    ? resolveWildcard(active, step, variant, companionId !== null)
    : kind;
  const event = {
    id: eventIdentity(active, step, type, variant),
    step,
    type,
    titleId: `${active.destinationId}_${type}_${variant}`,
    bodyId: `${active.destinationId}_${type}_${variant}`,
  };
  if (type === "condition" || type === "anomaly") {
    const abilityId = eventAbility(active, creature, step, type);
    const magnitude = 1 + (digestInt(`${active.planSeed}:${step}:magnitude`) % 3);
    const delta = digestInt(`${active.planSeed}:${step}:direction`) % 2 === 0
      ? magnitude
      : -magnitude;
    const effect = { abilityId, delta, eventId: event.id, step };
    active.temporaryEffects.push(effect);
    event.effect = { duration: "expedition", ...effect };
  } else if (type === "ability") {
    const abilityId = eventAbility(active, creature, step);
    const rare = digestInt(`${active.planSeed}:rare-ability`) % 100 === 0;
    const magnitude = rare ? 2 : 1;
    const delta = digestInt(`${active.planSeed}:ability-direction`) % 2 === 0
      ? magnitude
      : -magnitude;
    const effect = {
      abilityId,
      delta,
      named: rare,
      appliedAt: date,
      appliedExperienceDay: creature.experienceDays,
      eventId: event.id,
      step,
    };
    active.permanentEffect = effect;
    event.effect = { duration: "permanent", ...effect };
  } else if (type === "artifact") {
    const artifactId = `${active.destinationId}_artifact_${(variant % 6) + 1}`;
    if (!active.artifactIds.includes(artifactId)) {
      active.artifactIds.push(artifactId);
    }
    event.artifactId = artifactId;
  } else if (type === "choice") {
    const abilityId = eventAbility(active, creature, step, "choice");
    event.resolved = false;
    event.options = [-2, 0, 2].map((delta, index) => ({
      slot: String(index + 1),
      choiceId: `${active.destinationId}_choice_${variant}_${index + 1}`,
      effect: { abilityId, delta, duration: "expedition" },
    }));
    active.pendingChoice = {
      eventId: event.id,
      step,
      options: event.options,
    };
  } else if (type === "companion") {
    event.companionId = companionId;
  }
  return event;
}

function completeExpedition(expeditions, active, date) {
  active.status = "completed";
  active.completedAt = date;
  expeditions.history.push(active);
  syncExpeditionArtifacts(expeditions, active, date);
  syncExpeditionAchievements(expeditions, active, date);
  expeditions.active = null;
  return active;
}

function advanceExpedition(state, creature, date) {
  const expeditions = ensureExpeditionState(state);
  const active = expeditions.active;
  if (!active) return { error: "no_active" };
  if (expeditionDateIsBeforeLastAction(active, date)) {
    return { error: "date_before_last_action" };
  }
  if (active.pendingChoice) return { error: "choice_required" };
  if (active.step >= EXPEDITION_STEPS) return { error: "complete" };
  active.step += 1;
  const companionId = state.laboratory?.activeCultureId ?? null;
  active.events.push(
    createExpeditionEvent(
      active,
      creature,
      active.step,
      date,
      companionId,
    ),
  );
  active.lastActionAt = date;
  syncExpeditionArtifacts(expeditions, active, date);
  if (active.step === EXPEDITION_STEPS && !active.pendingChoice) {
    completeExpedition(expeditions, active, date);
  }
  return { value: publicExpedition(expeditions.active ?? active) };
}

function chooseExpedition(state, date, slot) {
  const expeditions = ensureExpeditionState(state);
  const active = expeditions.active;
  if (!active) return { error: "no_active" };
  if (expeditionDateIsBeforeLastAction(active, date)) {
    return { error: "date_before_last_action" };
  }
  if (!active.pendingChoice) return { error: "no_choice" };
  const option = active.pendingChoice.options.find(
    (candidate) => candidate.slot === String(slot),
  );
  if (!option) return { error: "invalid_choice" };
  const event = active.events.find(
    (candidate) => candidate.id === active.pendingChoice.eventId,
  );
  event.resolved = true;
  event.choice = {
    slot: option.slot,
    choiceId: option.choiceId,
    effect: option.effect,
  };
  if (option.effect.delta !== 0) {
    active.temporaryEffects.push({
      abilityId: option.effect.abilityId,
      delta: option.effect.delta,
      eventId: event.id,
      step: event.step,
    });
  }
  active.pendingChoice = null;
  active.lastActionAt = date;
  if (active.step === EXPEDITION_STEPS) {
    completeExpedition(expeditions, active, date);
  }
  return { value: publicExpedition(expeditions.active ?? active) };
}

function abandonExpedition(state, date) {
  const expeditions = ensureExpeditionState(state);
  const active = expeditions.active;
  if (!active) return { error: "no_active" };
  if (expeditionDateIsBeforeLastAction(active, date)) {
    return { error: "date_before_last_action" };
  }
  active.status = "abandoned";
  active.abandonedAt = date;
  active.lastActionAt = date;
  active.pendingChoice = null;
  expeditions.history.push(active);
  syncExpeditionArtifacts(expeditions, active, date);
  expeditions.active = null;
  return { value: publicExpedition(active) };
}

function syncExpeditionArtifacts(expeditions, active, date) {
  for (const artifactId of active.artifactIds) {
    if (!expeditions.artifactIds.includes(artifactId)) {
      expeditions.artifactIds.push(artifactId);
    }
    if (
      !expeditions.artifactRecords.some(({ id }) => id === artifactId)
    ) {
      expeditions.artifactRecords.push({
        id: artifactId,
        discoveredAt: date,
        expeditionId: active.id,
      });
    }
  }
}

function expeditionAchievementMatches(id, active, expeditions) {
  const completed = expeditions.history.filter(
    ({ status }) => status === "completed",
  );
  const completedDestinations = new Set(
    completed.map(({ destinationId }) => destinationId),
  );
  const sameDestination = completed.filter(
    ({ destinationId }) => destinationId === active.destinationId,
  ).length;
  const deltas = active.temporaryEffects.map(({ delta }) => delta);
  return {
    first_return: completed.length >= 1,
    empty_handed: active.artifactIds.length === 0,
    branch_clerk: active.events.some(({ choice }) => choice),
    condition_stack: active.temporaryEffects.length >= 3,
    permanent_increase: active.permanentEffect?.delta > 0,
    permanent_decrease: active.permanentEffect?.delta < 0,
    named_adjustment: active.permanentEffect?.named === true,
    all_destinations: completedDestinations.size === EXPEDITION_DESTINATIONS.length,
    destination_regular: sameDestination >= 5,
    artifact_triplet: expeditions.artifactIds.length >= 3,
    ten_returns: completed.length >= 10,
    paradox_return:
      deltas.some((delta) => delta > 0) && deltas.some((delta) => delta < 0),
  }[id];
}

function syncExpeditionAchievements(expeditions, active, date) {
  if (active.status !== "completed") return;
  const unlocked = EXPEDITION_ACHIEVEMENT_DEFINITIONS.filter(
    ({ id }) =>
      !expeditions.achievementIds.includes(id) &&
      expeditionAchievementMatches(id, active, expeditions),
  );
  active.achievementIds = unlocked.map(({ id }) => id);
  for (const { id } of unlocked) {
    expeditions.achievementIds.push(id);
    expeditions.achievementRecords.push({
      id,
      discoveredAt: date,
      expeditionId: active.id,
    });
  }
}

function expeditionHistory(state, date) {
  const expeditions = ensureExpeditionState(state);
  return {
    version: EXPEDITION_VERSION,
    date,
    records: expeditions.history
      .filter((expedition) => expeditionEndedOnOrBefore(expedition, date))
      .map(publicExpedition),
  };
}

export {
  EXPEDITION_DESTINATIONS,
  EXPEDITION_STEPS,
  EXPEDITION_VERSION,
  ensureExpeditionState,
  abandonExpedition,
  advanceExpedition,
  chooseExpedition,
  expeditionEligibility,
  expeditionHistory,
  expeditionLastActionAt,
  expeditionStatus,
  publicExpedition,
  startExpedition,
};
