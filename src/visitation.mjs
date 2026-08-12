function ensureVisitationState(state) {
  state.visitation ??= {
    version: 1,
    activeStayId: null,
    stays: [],
  };
  state.visitation.version = 1;
  state.visitation.activeStayId ??= null;
  state.visitation.stays ??= [];
  return state.visitation;
}

function activeStayAt(state, date) {
  return [...(state.visitation?.stays ?? [])]
    .filter(
      (stay) =>
        stay.admittedAt <= date &&
        (stay.releasedAt === null || stay.releasedAt > date),
    )
    .sort(
      (left, right) =>
        right.admittedAt.localeCompare(left.admittedAt) ||
        right.id.localeCompare(left.id),
    )
    .at(0) ?? null;
}

function deriveVisitorArchive(state, date) {
  const active = activeStayAt(state, date);
  return {
    version: 1,
    date,
    activeStayId: active?.id ?? null,
    visitors: [...(state.foreignSpecimens ?? [])]
      .filter(({ collectedAt }) => collectedAt <= date)
      .sort(
        (left, right) =>
          right.collectedAt.localeCompare(left.collectedAt) ||
          left.id.localeCompare(right.id),
      )
      .map((specimen) => {
        const stay = active?.foreignSpecimenId === specimen.id ? active : null;
        return {
          id: specimen.id,
          collectedAt: specimen.collectedAt,
          specimenId: specimen.hybrid.specimenId,
          fingerprint: specimen.hybrid.fingerprint,
          formId: specimen.hybrid.formId,
          ecology: specimen.hybrid.ecology,
          pathology: specimen.hybrid.pathology,
          status: stay ? "active" : "archived",
          admittedAt: stay?.admittedAt ?? null,
        };
      }),
  };
}

function currentOpenStay(state) {
  const activeStayId = state.visitation?.activeStayId;
  if (!activeStayId) return null;
  return state.visitation.stays.find(({ id }) => id === activeStayId) ?? null;
}

function latestVisitationDate(state) {
  return (state.visitation?.stays ?? []).reduce(
    (latest, stay) =>
      [stay.admittedAt, stay.releasedAt]
        .filter(Boolean)
        .reduce(
          (candidate, value) =>
            candidate === null || value > candidate ? value : candidate,
          latest,
        ),
    null,
  );
}

function hostVisitor(state, foreignSpecimenId, date) {
  const visitation = ensureVisitationState(state);
  const specimen = (state.foreignSpecimens ?? []).find(
    ({ id, collectedAt }) => id === foreignSpecimenId && collectedAt <= date,
  );
  if (!specimen) throw new VisitationError("visitor_not_found");
  const latestDate = latestVisitationDate(state);
  if (latestDate && date < latestDate) {
    throw new VisitationError("date_before_last_stay");
  }
  const active = currentOpenStay(state);
  if (active?.foreignSpecimenId === foreignSpecimenId) {
    return { changed: false, stay: active };
  }
  if (active && date < active.admittedAt) {
    throw new VisitationError("date_before_active_stay");
  }
  if (active) active.releasedAt = date;

  const id = `stay-${foreignSpecimenId}-${date}`;
  let stay = visitation.stays.find((entry) => entry.id === id);
  if (stay) {
    stay.releasedAt = null;
  } else {
    stay = {
      id,
      foreignSpecimenId,
      admittedAt: date,
      releasedAt: null,
    };
    visitation.stays.push(stay);
    visitation.stays.sort(
      (left, right) =>
        left.admittedAt.localeCompare(right.admittedAt) ||
        left.id.localeCompare(right.id),
    );
  }
  visitation.activeStayId = stay.id;
  return { changed: true, stay };
}

function releaseVisitor(state, date) {
  const visitation = ensureVisitationState(state);
  const active = currentOpenStay(state);
  if (!active) return { changed: false, stay: null };
  if (date < active.admittedAt) {
    throw new VisitationError("date_before_active_stay");
  }
  active.releasedAt = date;
  visitation.activeStayId = null;
  return { changed: true, stay: active };
}

function dateDistance(start, end) {
  const toUtc = (value) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.floor((toUtc(end) - toUtc(start)) / 86_400_000) + 1;
}

function visitorRoute(creature, appearance) {
  const local = creature.ecology.type;
  const foreign = appearance.ecology;
  if (local === "polluted" && foreign === "polluted") return "pollution";
  if (local === "lucid" && foreign === "lucid") return "clarity";
  return "paradox";
}

function contentIndex(values, ...parts) {
  const digest = createHash("sha256").update(parts.join(":"), "utf8").digest();
  return digest.readUInt32BE(0) % values.length;
}

function deriveVisitorCohabitation(state, creature, date) {
  const stay = activeStayAt(state, date);
  if (!stay) return null;
  const specimen = (state.foreignSpecimens ?? []).find(
    ({ id }) => id === stay.foreignSpecimenId,
  );
  if (!specimen) return null;
  const cohabitationDays = dateDistance(stay.admittedAt, date);
  const stageId = cohabitationDays >= 7
    ? "resident"
    : cohabitationDays >= 3
      ? "settled"
      : "intake";
  const stageIndex = { intake: 0, settled: 1, resident: 2 }[stageId];
  const routeId = visitorRoute(creature, specimen.hybrid);
  const content = VISITOR_CONTENT[routeId];
  const relationshipOffset = contentIndex(
    content.relationships,
    "anti-ai-visitor-relationship-v1",
    state.seed,
    creature.appearance.fingerprint,
    specimen.hybrid.fingerprint,
    routeId,
  );
  const relationship = content.relationships[
    (relationshipOffset + stageIndex) % content.relationships.length
  ];
  const bulletin = content.bulletins[contentIndex(
    content.bulletins,
    "anti-ai-visitor-bulletin-v1",
    state.seed,
    stay.id,
    date,
    routeId,
  )];
  const exhibit = content.exhibits[contentIndex(
    content.exhibits,
    "anti-ai-visitor-exhibit-v1",
    creature.appearance.specimenId,
    specimen.hybrid.specimenId,
    routeId,
    stageId,
  )];
  return {
    version: 1,
    stayId: stay.id,
    foreignSpecimenId: stay.foreignSpecimenId,
    admittedAt: stay.admittedAt,
    cohabitationDays,
    stageId,
    routeId,
    relationshipId: relationship.id,
    bulletinId: bulletin.id,
    exhibit: { id: exhibit.id, glyph: exhibit.glyph },
    appearance: { ...specimen.hybrid, geneIds: { ...specimen.hybrid.geneIds } },
  };
}

export {
  VisitationError,
  activeStayAt,
  deriveVisitorArchive,
  deriveVisitorCohabitation,
  ensureVisitationState,
  hostVisitor,
  releaseVisitor,
};
class VisitationError extends Error {
  constructor(code) {
    super(code);
    this.name = "VisitationError";
    this.code = code;
  }
}
import { createHash } from "node:crypto";

import { VISITOR_CONTENT } from "./visitation-content.mjs";
