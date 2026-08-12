import {
  selectCreatureIntervention,
} from "../casebook.mjs";
import { bondLaboratoryCompanion, laboratoryCompanion } from "../companion.mjs";
import {
  codexCollectionEntries,
  featureCabinetEntry,
  recordCabinetInteraction,
} from "../consequence-cabinet.mjs";
import {
  creatureCodex,
  deriveCreature,
  loadCreatureState,
  saveCreatureState,
  selectCreatureEvolution,
} from "../creature.mjs";
import {
  abandonExpedition,
  advanceExpedition,
  chooseExpedition,
  startExpedition,
} from "../expedition.mjs";
import { selectCreatureIncident } from "../incidents.mjs";
import { startClinicStudy } from "../clinic-studies.mjs";
import {
  incubateLaboratoryCulture,
  laboratoryView,
} from "../laboratory.mjs";
import { deriveContainmentActions } from "./action-catalog.mjs";

function availableInteractionTargets(state, date, kind) {
  const hasCompanion = laboratoryCompanion(state, date).companion !== null;
  if (kind === "observe") {
    return [
      "specimen",
      ...(hasCompanion ? ["companion"] : []),
      ...((state.cabinet?.featured?.length ?? 0) > 0 ? ["cabinet"] : []),
    ];
  }
  return ["glass", ...(hasCompanion ? ["companion"] : []), "light"];
}

function applyContainmentAction(state, date, actionId, choice) {
  const creature = deriveCreature(state, date);
  if (actionId === "start_expedition") {
    return startExpedition(state, creature, date, choice);
  }
  if (actionId === "start_study") {
    return startClinicStudy(state, date, choice);
  }
  if (actionId === "advance_expedition") {
    return advanceExpedition(state, creature, date);
  }
  if (actionId === "choose_expedition") {
    return chooseExpedition(state, date, choice);
  }
  if (actionId === "abandon_expedition") {
    return abandonExpedition(state, date);
  }
  if (actionId === "choose_intervention") {
    return selectCreatureIntervention(
      state,
      date,
      choice,
      creature.experienceDays,
    );
  }
  if (actionId === "choose_evolution") {
    return selectCreatureEvolution(state, date, choice);
  }
  if (actionId === "resolve_incident") {
    return selectCreatureIncident(
      state,
      date,
      choice,
      creature.experienceDays,
    );
  }
  if (actionId === "incubate") {
    return incubateLaboratoryCulture(state, date, choice);
  }
  if (actionId === "bond") {
    return bondLaboratoryCompanion(state, date, choice);
  }
  if (actionId === "curate_display") {
    return featureCabinetEntry(state, creatureCodex(state, date), choice);
  }
  if (actionId === "observe_specimen") {
    return recordCabinetInteraction(
      state,
      date,
      "observe",
      choice,
      availableInteractionTargets(state, date, "observe"),
    );
  }
  if (actionId === "contact_specimen") {
    return recordCabinetInteraction(
      state,
      date,
      "contact",
      choice,
      availableInteractionTargets(state, date, "contact"),
    );
  }
  return { error: "unknown_action" };
}

function actionAvailability(state, date, actionId, lang) {
  const creature = deriveCreature(state, date);
  const laboratory = laboratoryView(state, date);
  return deriveContainmentActions(
    state,
    date,
    creature,
    laboratory,
    lang,
  ).find(({ id }) => id === actionId);
}

async function executeContainmentMutation(actionId, options = {}, session = {}) {
  const state = session.state ?? await loadCreatureState();
  const action = actionAvailability(
    state,
    options.date,
    actionId,
    options.lang ?? "zh",
  );
  if (!action?.available) {
    return {
      id: actionId,
      status: "unavailable",
      reason: action?.reason ?? "unknown_action",
      state,
    };
  }

  const selected = applyContainmentAction(
    state,
    options.date,
    actionId,
    options.choice,
  );
  if (selected.error) {
    return {
      id: actionId,
      status: "unavailable",
      reason: selected.error === "invalid" ? "invalid_choice" : selected.error,
      state,
    };
  }

  await saveCreatureState(state);
  return {
    id: actionId,
    status: "completed",
    result: selected.value,
    state,
  };
}

export {
  applyContainmentAction,
  availableInteractionTargets,
  executeContainmentMutation,
};
