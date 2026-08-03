import { currentCreatureIntervention } from "../casebook.mjs";
import { localized } from "../shared.mjs";

const ACTION_DEFINITIONS = Object.freeze([
  {
    id: "settle_today",
    actor: "specimen",
    target: "daily_record",
    command: ({ date }) => `anti-ai today --date ${date}`,
    label: ["结算今天的工作后遗症", "Settle today's work aftermath"],
  },
  {
    id: "choose_intervention",
    actor: "specimen",
    target: "casebook",
    command: () => "anti-ai creature intervene",
    label: ["处理待定转折病例", "Resolve the pending turning case"],
  },
  {
    id: "choose_evolution",
    actor: "specimen",
    target: "generation",
    command: () => "anti-ai creature evolve",
    label: ["处理待定世代进化", "Resolve the pending evolution"],
  },
  {
    id: "incubate",
    actor: "laboratory",
    target: "culture",
    command: () => "anti-ai lab incubate <1|2|3>",
    label: ["孵化污染培养物", "Incubate a pollution culture"],
  },
  {
    id: "bond",
    actor: "companion",
    target: "habitat",
    command: () => "anti-ai lab shelf",
    label: ["建立或切换伴生关系", "Bond or switch a companion"],
  },
]);

const REASON_COPY = Object.freeze({
  already_settled: ["本日已经结算", "This date is already settled"],
  no_pending_case: ["当前没有待处理病例", "No turning case is pending"],
  no_pending_evolution: ["当前没有待选择进化", "No evolution is pending"],
  no_material: ["实验室没有可用原料", "The laboratory has no usable material"],
  no_culture: ["培养架尚无封存标本", "The culture shelf is empty"],
});

function actionAvailability(id, state, date, creature, laboratory) {
  if (id === "settle_today") {
    return state.days?.[date]
      ? { available: false, reason: "already_settled" }
      : { available: true, reason: null };
  }
  if (id === "choose_intervention") {
    return currentCreatureIntervention(state, date)?.status === "pending"
      ? { available: true, reason: null }
      : { available: false, reason: "no_pending_case" };
  }
  if (id === "choose_evolution") {
    return creature.evolution?.status === "pending"
      ? { available: true, reason: null }
      : { available: false, reason: "no_pending_evolution" };
  }
  if (id === "incubate") {
    return laboratory.status === "ready"
      ? { available: true, reason: null }
      : { available: false, reason: "no_material" };
  }
  return laboratory.cultures > 0
    ? { available: true, reason: null }
    : { available: false, reason: "no_culture" };
}

function deriveContainmentActions(state, date, creature, laboratory, lang = "zh") {
  return ACTION_DEFINITIONS.map((definition) => {
    const availability = actionAvailability(
      definition.id,
      state,
      date,
      creature,
      laboratory,
    );
    return {
      id: definition.id,
      actor: definition.actor,
      target: definition.target,
      label: localized(lang, ...definition.label),
      command: definition.command({ date }),
      available: availability.available,
      reason: availability.reason,
      reasonLabel: availability.reason
        ? localized(lang, ...REASON_COPY[availability.reason])
        : null,
    };
  });
}

export { deriveContainmentActions };
