import { deriveCreature } from "../creature.mjs";
import { DESKTOP_SNAPSHOT_VERSION } from "../infrastructure/desktop-store.mjs";
import { deriveTuiSnapshot } from "./tui.mjs";

const DISPLAY_POSES = Object.freeze(["idle", "overload", "clarity", "anomaly"]);
const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function localizedPair(chinese, english) {
  return { zh: chinese, en: english };
}

function mergeBriefing(chinese, english) {
  const englishSections = new Map(
    english.dailyBriefing.sections.map((section) => [section.id, section]),
  );
  return {
    status: chinese.dailyBriefing.status,
    sections: chinese.dailyBriefing.sections.map((section) => {
      const translated = englishSections.get(section.id);
      return {
        id: section.id,
        kind: section.kind,
        label: localizedPair(section.label, translated?.label ?? section.label),
        detail: localizedPair(section.detail, translated?.detail ?? section.detail),
        target: section.target,
      };
    }),
  };
}

function mergeRecommendation(chinese, english) {
  if (!chinese.primaryAction) return null;
  return {
    id: chinese.primaryAction.id,
    label: localizedPair(
      chinese.primaryAction.label,
      english.primaryAction?.label ?? chinese.primaryAction.label,
    ),
    target: chinese.primaryAction.target,
  };
}

function displayPose(creature) {
  if (
    creature.today?.event?.rarity === "rare" ||
    creature.today?.rareAbilityGain
  ) {
    return "anomaly";
  }
  if (creature.status === "dormant") return "clarity";
  if (["heavy", "binge", "meltdown"].includes(creature.today?.usageBand)) {
    return "overload";
  }
  return "idle";
}

function desktopCreature(creature) {
  const appearance = creature.appearance;
  const genes = appearance.geneIds;
  return {
    specimenId: appearance.specimenId,
    fingerprint: appearance.fingerprint,
    stageIndex: appearance.stageIndex,
    ecologyId: appearance.ecology,
    pathologyId: appearance.pathology,
    formId: appearance.formId,
    paletteId: appearance.rareAbilityId
      ? `chromatic_${appearance.rareAbilityId}`
      : `ecology_${appearance.ecology}`,
    poseId: displayPose(creature),
    bodyId: genes.body,
    eyesId: genes.eyes,
    mouthId: genes.mouth,
    coreId: genes.core,
    limbsId: genes.limbs,
    tailId: genes.tail,
    chromaticId: appearance.rareAbilityId,
    scarId: appearance.scarId,
    graftId: appearance.evolutionId ?? null,
  };
}

function deriveDesktopSnapshot(state, date, options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const chinese = deriveTuiSnapshot(state, date, "zh");
  const english = deriveTuiSnapshot(state, date, "en");
  const creature = deriveCreature(state, date);
  const scene = chinese.habitat.scene;
  const companion = chinese.habitat.companion;
  const visitor = chinese.habitat.visitor;
  return validateDesktopSnapshot({
    version: DESKTOP_SNAPSHOT_VERSION,
    generatedAt,
    date,
    language: "bilingual",
    status: chinese.overview.status,
    lastSettledDate: chinese.lastSettledDate,
    title: localizedPair(chinese.overview.title, english.overview.title),
    creature: desktopCreature({
      ...creature,
      status: state.days?.[date]?.active ? "active" : "dormant",
      today: state.days?.[date] ?? null,
    }),
    companion: companion
      ? {
          cultureId: companion.cultureId,
          stageId: companion.stageId,
          routeId: companion.routeId,
          anomalyIds: [...companion.anomalyIds],
        }
      : null,
    visitor: visitor
      ? {
          stayId: visitor.stayId,
          specimenId: visitor.appearance.specimenId,
          formId: visitor.appearance.formId,
          relationshipId: visitor.relationshipId,
        }
      : null,
    habitat: {
      sceneId: scene.archetypeId,
      cycleId: scene.cycleId,
      phenomenonId: chinese.habitat.events.at(-1)?.id ?? null,
    },
    briefing: mergeBriefing(chinese, english),
    clinic: {
      diagnosisId: chinese.clinic.diagnosis.id,
      evidenceState: state.days?.[date]?.metabolism ? "sealed" : "unsealed",
      label: localizedPair(
        chinese.clinic.diagnosis.label,
        english.clinic.diagnosis.label,
      ),
    },
    recommendation: mergeRecommendation(chinese, english),
    privacy: {
      containsExactTokens: false,
      containsModels: false,
      containsPaths: false,
      containsConversation: false,
    },
  });
}

function validateDesktopSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("Invalid desktop snapshot");
  }
  if (snapshot.version !== DESKTOP_SNAPSHOT_VERSION) {
    const error = new Error(`Unsupported desktop snapshot version: ${snapshot.version}`);
    error.code = "snapshot_incompatible";
    throw error;
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.date ?? "") ||
    Number.isNaN(Date.parse(snapshot.generatedAt ?? ""))
  ) {
    throw new Error("Invalid desktop snapshot timestamp");
  }
  const privacy = snapshot.privacy;
  if (
    !privacy ||
    privacy.containsExactTokens !== false ||
    privacy.containsModels !== false ||
    privacy.containsPaths !== false ||
    privacy.containsConversation !== false
  ) {
    throw new Error("Desktop snapshot exceeds its privacy boundary");
  }
  const creature = snapshot.creature;
  if (
    !creature ||
    !/^[a-f0-9]{8}$/.test(creature.specimenId ?? "") ||
    !/^[a-f0-9]{12}$/.test(creature.fingerprint ?? "") ||
    !Number.isInteger(creature.stageIndex) ||
    creature.stageIndex < 0 ||
    creature.stageIndex > 3 ||
    !DISPLAY_POSES.includes(creature.poseId)
  ) {
    throw new Error("Invalid desktop creature projection");
  }
  const identifiers = [
    creature.ecologyId,
    creature.pathologyId,
    creature.formId,
    creature.paletteId,
    creature.poseId,
    creature.bodyId,
    creature.eyesId,
    creature.mouthId,
    creature.coreId,
    creature.limbsId,
    creature.tailId,
    creature.chromaticId,
    creature.scarId,
    creature.graftId,
  ].filter(Boolean);
  if (identifiers.some((value) => !IDENTIFIER_PATTERN.test(value))) {
    throw new Error("Invalid desktop creature identifier");
  }
  return snapshot;
}

export {
  DISPLAY_POSES,
  deriveDesktopSnapshot,
  validateDesktopSnapshot,
};
