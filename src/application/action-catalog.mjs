import { currentCreatureIntervention } from "../casebook.mjs";
import { currentCreatureIncident } from "../incidents.mjs";
import {
  expeditionEligibility,
  expeditionLastActionAt,
} from "../expedition.mjs";
import { deriveClinicStudyHistory } from "../clinic-studies.mjs";
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
    id: "resolve_incident",
    actor: "specimen",
    target: "incident_chain",
    command: () => "anti-ai creature incident",
    label: ["响应待定收容事故", "Respond to the pending incident"],
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
    id: "start_expedition",
    actor: "specimen",
    target: "expedition",
    execution: "direct",
    command: () => "anti-ai expedition start <destination>",
    label: ["开启今日收容远征", "Start today's containment expedition"],
  },
  {
    id: "advance_expedition",
    actor: "specimen",
    target: "expedition",
    execution: "direct",
    command: () => "anti-ai expedition next",
    label: ["进入远征下一格", "Enter the next expedition cell"],
  },
  {
    id: "choose_expedition",
    actor: "specimen",
    target: "expedition",
    execution: "select",
    command: () => "anti-ai expedition choose <1|2|3>",
    label: ["处理远征分叉", "Resolve the expedition branch"],
  },
  {
    id: "abandon_expedition",
    actor: "specimen",
    target: "expedition",
    command: () => "anti-ai expedition abandon",
    label: ["放弃当前远征", "Abandon the active expedition"],
  },
  {
    id: "start_study",
    actor: "observer",
    target: "clinic",
    execution: "select",
    command: () => "anti-ai clinic start <protocol>",
    label: ["启动一项代谢研究", "Start a metabolic study"],
  },
  {
    id: "observe_specimen",
    actor: "observer",
    target: "habitat",
    command: () => null,
    label: ["记录一次今日观察", "Record today's observation"],
  },
  {
    id: "contact_specimen",
    actor: "observer",
    target: "habitat",
    command: () => null,
    label: ["进行一次克制接触", "Make one restrained contact"],
  },
  {
    id: "curate_display",
    actor: "curator",
    target: "cabinet",
    command: () => null,
    label: ["调整后果陈列柜", "Curate the consequence cabinet"],
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
    command: () => "anti-ai lab bond <culture-id>",
    label: ["建立或切换伴生关系", "Bond or switch a companion"],
  },
]);

const REASON_COPY = Object.freeze({
  already_settled: ["本日已经结算", "This date is already settled"],
  no_pending_incident: ["当前没有待响应事故", "No incident is pending"],
  no_pending_case: ["当前没有待处理病例", "No turning case is pending"],
  no_pending_evolution: ["当前没有待选择进化", "No evolution is pending"],
  expedition_active: ["已有远征正在进行", "An expedition is already active"],
  expedition_used: ["今日远征机会已使用", "Today's expedition opportunity is used"],
  expedition_expired: ["所选日期的机会已过期", "The selected date's opportunity has expired"],
  no_active_expedition: ["当前没有进行中的远征", "No expedition is active"],
  study_active: ["已有代谢研究正在进行", "A metabolic study is active"],
  expedition_choice_required: ["必须先处理当前分叉", "Resolve the current branch first"],
  no_expedition_choice: ["当前没有待处理分叉", "No expedition branch is pending"],
  expedition_date_before_last_action: [
    "所选日期早于远征最近一次操作",
    "The selected date precedes the expedition's latest action",
  ],
  date_not_settled: ["请先结算当前日期", "Settle this date first"],
  unhatched: ["异变体尚未孵化", "The specimen has not hatched"],
  already_observed: ["今日观察已经记录", "Today's observation is already recorded"],
  already_contacted: ["今日接触已经记录", "Today's contact is already recorded"],
  no_collection: ["还没有可陈列的收藏", "No discovered collection can be displayed"],
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
  if (id === "resolve_incident") {
    return currentCreatureIncident(state, date)?.status === "pending"
      ? { available: true, reason: null }
      : { available: false, reason: "no_pending_incident" };
  }
  if (id === "choose_evolution") {
    return creature.evolution?.status === "pending"
      ? { available: true, reason: null }
      : { available: false, reason: "no_pending_evolution" };
  }
  if (id === "start_expedition") {
    const eligibility = expeditionEligibility(state, creature, date);
    const reason = {
      active: "expedition_active",
      used: "expedition_used",
      expired: "expedition_expired",
      unhatched: "unhatched",
    }[eligibility.reason];
    return eligibility.available
      ? { available: true, reason: null }
      : { available: false, reason };
  }
  if (id === "start_study") {
    return deriveClinicStudyHistory(state, date).active
      ? { available: false, reason: "study_active" }
      : { available: true, reason: null };
  }
  if (id === "advance_expedition") {
    if (!state.expeditions?.active) {
      return { available: false, reason: "no_active_expedition" };
    }
    if (date < expeditionLastActionAt(state.expeditions.active)) {
      return { available: false, reason: "expedition_date_before_last_action" };
    }
    return state.expeditions.active.pendingChoice
      ? { available: false, reason: "expedition_choice_required" }
      : { available: true, reason: null };
  }
  if (id === "choose_expedition") {
    if (
      state.expeditions?.active
      && date < expeditionLastActionAt(state.expeditions.active)
    ) {
      return { available: false, reason: "expedition_date_before_last_action" };
    }
    return state.expeditions?.active?.pendingChoice
      ? { available: true, reason: null }
      : { available: false, reason: "no_expedition_choice" };
  }
  if (id === "abandon_expedition") {
    if (
      state.expeditions?.active
      && date < expeditionLastActionAt(state.expeditions.active)
    ) {
      return { available: false, reason: "expedition_date_before_last_action" };
    }
    return state.expeditions?.active
      ? { available: true, reason: null }
      : { available: false, reason: "no_active_expedition" };
  }
  if (["observe_specimen", "contact_specimen"].includes(id)) {
    if (!state.days?.[date]) {
      return { available: false, reason: "date_not_settled" };
    }
    if (creature.activeDays === 0) {
      return { available: false, reason: "unhatched" };
    }
    const interaction = id === "observe_specimen" ? "observe" : "contact";
    const reason = interaction === "observe" ? "already_observed" : "already_contacted";
    return state.days[date].interactions?.[interaction]
      ? { available: false, reason }
      : { available: true, reason: null };
  }
  if (id === "curate_display") {
    const discovered = (state.specimens ?? []).some(
      (entry) => entry.recordedAt <= date,
    );
    return discovered
      ? { available: true, reason: null }
      : { available: false, reason: "no_collection" };
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
      execution: definition.execution ?? "confirm",
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
