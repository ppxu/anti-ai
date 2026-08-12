import {
  deriveVisitorArchive,
  hostVisitor,
  releaseVisitor,
} from "../visitation.mjs";
import {
  SpecimenCodeError,
  createSpecimenEncounter,
  decodeSpecimenCode,
  encounterLabel,
  saveEncounterSpecimen,
} from "../encounter.mjs";
import {
  creatureLabel,
  deriveCreature,
  loadCreatureState,
  saveCreatureState,
} from "../creature.mjs";
import { localized } from "../shared.mjs";

function applyVisitationMutation(state, action, date, foreignSpecimenId) {
  if (action === "host") return hostVisitor(state, foreignSpecimenId, date);
  if (action === "release") return releaseVisitor(state, date);
  return { error: "unknown_action" };
}

async function executeVisitationMutation(action, options = {}, session = {}) {
  const state = session.state ?? await loadCreatureState();
  const selected = applyVisitationMutation(
    state,
    action,
    options.date,
    options.foreignSpecimenId,
  );
  if (selected.error) return selected;
  if (selected.changed) await saveCreatureState(state);
  return {
    version: 1,
    action,
    date: options.date,
    changed: selected.changed,
    activeStay: action === "release" ? null : selected.stay,
    archive: deriveVisitorArchive(state, options.date),
    state,
  };
}

function visitorIntakeErrorMessage(error, lang = "zh") {
  const messages = {
    missing: ["请粘贴一份污染编码。", "Paste a pollution code."],
    too_long: ["污染编码超过 2,048 字符，已拒绝。", "The pollution code exceeds 2,048 characters and was rejected."],
    malformed: ["污染编码格式无效。", "The pollution code format is invalid."],
    version: ["污染编码版本不受支持。", "The pollution code version is unsupported."],
    checksum: ["污染编码校验失败；它可能被截断或篡改。", "The pollution code checksum failed; it may be truncated or altered."],
    payload: ["污染编码中的标本资料无效。", "The pollution code contains an invalid specimen."],
    self: ["不能接待自己的污染编码。", "The Habitat cannot receive its own pollution code."],
  };
  return localized(lang, ...(messages[error.code] ?? messages.malformed));
}

function previewVisitorIntake(code, options = {}, session = {}) {
  const state = session.state;
  try {
    const visitor = decodeSpecimenCode(code);
    const creature = deriveCreature(state, options.date);
    const encounter = createSpecimenEncounter(creature, visitor, options.date);
    const alreadyCollected = (state.foreignSpecimens ?? []).some(
      ({ id }) => id === encounter.encounterId,
    );
    return {
      available: true,
      code: String(code).trim(),
      title: localized(options.lang, "访客接待预览", "VISITOR INTAKE PREVIEW"),
      summary: localized(
        options.lang,
        `外来标本 #${visitor.specimenId} 将生成接触事故 #${encounter.encounterId}。`,
        `Foreign specimen #${visitor.specimenId} creates contact incident #${encounter.encounterId}.`,
      ),
      warning: alreadyCollected
        ? localized(options.lang, "该事故已经入档；确认不会增加重复收藏。", "This incident is already archived; confirmation adds no duplicate collectible.")
        : localized(options.lang, "确认后只保存派生外观与稳定事故 ID，不保存污染码。", "Confirmation stores only derived appearance and stable incident IDs, never the pollution code."),
      encounter: {
        id: encounter.encounterId,
        typeId: encounter.type.id,
        typeLabel: encounterLabel("type", encounter.type.id, options.lang),
        visitorId: visitor.specimenId,
        visitorForm: creatureLabel("ecologyForms", visitor.formId, options.lang),
        hybridId: encounter.hybrid.fingerprint,
        hybridForm: creatureLabel("ecologyForms", encounter.hybrid.formId, options.lang),
      },
      alreadyCollected,
    };
  } catch (error) {
    if (!(error instanceof SpecimenCodeError)) throw error;
    return {
      available: false,
      reason: error.code,
      reasonLabel: visitorIntakeErrorMessage(error, options.lang),
    };
  }
}

async function executeVisitorIntake(preview, options = {}, session = {}) {
  const state = session.state;
  const visitor = decodeSpecimenCode(preview.code);
  const creature = deriveCreature(state, options.date);
  const encounter = createSpecimenEncounter(creature, visitor, options.date);
  if (encounter.encounterId !== preview.encounter.id) {
    return { status: "unavailable", reason: "preview_mismatch" };
  }
  const collected = saveEncounterSpecimen(state, encounter);
  if (collected) await saveCreatureState(state);
  return {
    status: "completed",
    changed: collected,
    encounterId: encounter.encounterId,
    message: collected
      ? localized(options.lang, "外来标本已进入访客档案。", "The foreign specimen entered the visitor archive.")
      : localized(options.lang, "这位访客已经入档；没有制造重复库存。", "This visitor is already archived; no duplicate inventory was created."),
    state,
  };
}

export {
  applyVisitationMutation,
  executeVisitationMutation,
  executeVisitorIntake,
  previewVisitorIntake,
  visitorIntakeErrorMessage,
};
