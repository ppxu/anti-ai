import {
  expeditionArtifact,
  expeditionDestination,
  expeditionEventCopy,
} from "./content.mjs";
import { localized } from "../shared.mjs";

function expeditionRail(record) {
  const cursor = Math.max(1, record.step);
  return Array.from({ length: record.totalSteps }, (_, index) => {
    const cell = index + 1;
    if (record.status === "completed" || cell < cursor) return "[✓]";
    if (cell === cursor) return "[@]";
    return "[?]";
  }).join("─");
}

function expeditionShareView(record, lang = "zh") {
  const destination = expeditionDestination(record.destinationId);
  const latestEvent = record.events.at(-1) ?? null;
  const eventCopy = latestEvent ? expeditionEventCopy(latestEvent, lang) : null;
  const endedAt = record.completedAt ?? record.abandonedAt ?? record.startedAt;
  return {
    date: endedAt,
    expeditionId: record.id,
    destination: destination.name[lang],
    destinationDescription: destination.description[lang],
    status: {
      active: localized(lang, "进行中", "ACTIVE"),
      completed: localized(lang, "已返航", "RETURNED"),
      abandoned: localized(lang, "提前返航", "ABANDONED"),
    }[record.status],
    step: record.step,
    totalSteps: record.totalSteps,
    rail: expeditionRail(record),
    latestEvent: eventCopy
      ? { type: latestEvent.type, ...eventCopy }
      : {
          type: "empty",
          title: localized(lang, "尚未进入", "NOT ENTERED"),
          body: localized(
            lang,
            "第一格仍在等待成为既成事实。",
            "Cell one is still waiting to become documented fact.",
          ),
        },
    eventLog: record.events.slice(-5).map((event) => ({
      step: event.step,
      ...expeditionEventCopy(event, lang),
    })),
    temporaryEffects: record.temporaryEffects.length,
    permanentEffect: record.permanentEffect,
    artifacts: record.artifactIds.map((id) => expeditionArtifact(id)?.name[lang] ?? id),
    achievements: record.achievementIds.length,
  };
}

export { expeditionRail, expeditionShareView };
