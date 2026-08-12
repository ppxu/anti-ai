import React from "react";
import { Box, Text } from "ink";

import { deriveCompanionFrame, deriveHabitatSceneFrame, deriveSpecimenFrame } from "../../application/tui-motion.mjs";
import { Panel } from "../panel.jsx";
import { CabinetSlots, ProgressBar } from "./chrome.jsx";

function DailyBriefingScreen({ snapshot, lang, frame, motion, glitch, compact }) {
  const { overview, dailyBriefing } = snapshot;
  const zh = lang === "zh";
  const ecologyColor = {
    polluted: "red",
    lucid: "cyan",
    paradox: "yellow",
    unformed: "gray",
  }[overview.ecology.id];
  const statusColor = {
    settled: overview.status === "quiet" ? "cyan" : "red",
    unsettled: "yellow",
    unhatched: "gray",
  }[dailyBriefing.status];
  const pose = glitch
    ? "mutation"
    : overview.status === "active"
      ? frame % 8 >= 4 ? "feeding" : "idle"
      : overview.status === "quiet"
        ? "withdrawal"
        : "dormant";
  const habitat = dailyBriefing.sections.find(({ id }) => id === "habitat");
  const sections = dailyBriefing.sections.filter(({ id }) => id !== "habitat");
  const colors = {
    system: statusColor,
    diagnosis: "magenta",
    pathology: "magenta",
    collection: "yellow",
    record: "cyan",
    ecology: ecologyColor,
    awaiting: "yellow",
    quiet: "gray",
  };
  return (
    <Box flexDirection="column">
      <Box gap={1} flexDirection={compact ? "column" : "row"}>
        <Panel
          title={zh ? "今日标本" : "TODAY'S SPECIMEN"}
          color={ecologyColor}
          width={compact ? undefined : "40%"}
        >
          <Text color={glitch ? "magenta" : ecologyColor}>
            {deriveSpecimenFrame(overview.art, frame, motion, {
              glitch,
              pose,
              temperament: overview.temperament,
              chromaticAbilityId: overview.chromaticAbilityId,
            }).join("\n")}
          </Text>
          <Text dimColor>#{overview.specimenId} · {overview.title}</Text>
        </Panel>
        <Panel
          title={`${zh ? "每日收容播报" : "DAILY CONTAINMENT BROADCAST"} · ${dailyBriefing.date}`}
          color="cyan"
          flexGrow={1}
        >
          {sections.map((section) => (
            <Box key={section.id} flexDirection="column" marginBottom={1}>
              <Text bold color={colors[section.kind] ?? "white"}>
                {section.label}
              </Text>
              <Text>{section.detail}</Text>
            </Box>
          ))}
        </Panel>
      </Box>
      <Panel title={habitat.label} color="green" marginTop={1}>
        <Text>{habitat.detail}</Text>
        <Text dimColor>{zh ? "2 查看完整生态舱" : "2 opens the full Habitat"}</Text>
      </Panel>
      <Panel
        title={zh ? "建议处置" : "RECOMMENDED RESPONSE"}
        color="yellow"
        marginTop={1}
      >
        {dailyBriefing.recommendation ? (
          <>
            <Text bold color="yellow">
              Enter · {dailyBriefing.recommendation.label}
            </Text>
            <Text dimColor>
              {zh
                ? "只推荐这一项；a 可查看完整行动中心。"
                : "Only this action is recommended; a opens the full action center."}
            </Text>
          </>
        ) : (
          <Text dimColor>
            {zh
              ? "当前无需处置。允许标本什么也不做。"
              : "No response is required. The specimen may do nothing."}
          </Text>
        )}
        <Text dimColor>
          {zh ? "e 完整档案 · 2 生态舱 · 5 图鉴" : "e full file · 2 Habitat · 5 Codex"}
        </Text>
      </Panel>
    </Box>
  );
}

function OverviewDetailsScreen({ snapshot, lang, frame, motion, glitch, compact }) {
  const { overview } = snapshot;
  const zh = lang === "zh";
  const ecologyColor = {
    polluted: "red",
    lucid: "cyan",
    paradox: "yellow",
    unformed: "gray",
  }[overview.ecology.id];
  const statusColor = {
    active: "red",
    quiet: "cyan",
    awaiting: "yellow",
    unhatched: "gray",
  }[overview.status];
  const pose = glitch
    ? "mutation"
    : overview.status === "active"
      ? frame % 8 >= 4 ? "feeding" : "idle"
      : overview.status === "quiet"
        ? "withdrawal"
        : "dormant";
  return (
    <Box flexDirection="column">
      <Box gap={1} flexDirection={compact ? "column" : "row"}>
        <Panel
          title={zh ? "当前异变体" : "CURRENT SPECIMEN"}
          color={ecologyColor}
          width={compact ? undefined : "48%"}
        >
          <Text color={glitch ? "magenta" : ecologyColor}>
            {deriveSpecimenFrame(overview.art, frame, motion, {
              glitch,
              pose,
              temperament: overview.temperament,
              chromaticAbilityId: overview.chromaticAbilityId,
            }).join("\n")}
          </Text>
          <Text dimColor>#{overview.specimenId}</Text>
          <Text color="magenta">
            {zh ? "馆藏异变" : "COLLECTION MUTATION"} · {overview.collectionPhenotype.name
              ? `${overview.collectionPhenotype.name} · ${zh ? "阶段" : "TIER"} ${overview.collectionPhenotype.tier}`
              : zh ? "尚未诱发" : "NOT YET INDUCED"}
          </Text>
        </Panel>
        <Panel
          title={zh ? "病理摘要" : "PATHOLOGY SUMMARY"}
          color="magenta"
          flexGrow={1}
        >
          <Text bold color={statusColor}>
            {overview.statusLabel}
          </Text>
          <Text>{overview.title}</Text>
          <Text>
            {zh ? "阶段" : "STAGE"}　{overview.stage.label}
          </Text>
          <Text>
            {zh ? "分支" : "BRANCH"}　{overview.branch.label}
          </Text>
          <Text color={ecologyColor}>
            {zh ? "生态" : "ECOLOGY"}　{overview.ecology.label}
          </Text>
          <Text>
            {zh ? "世代" : "GEN"}　G{overview.generation.number || 0} ·{" "}
            {overview.generation.day}/{overview.generation.length}
          </Text>
          <ProgressBar
            value={overview.generation.progressPercent}
            color={ecologyColor}
          />
          <Text dimColor>
            {zh ? "污染 / 清醒" : "Pollution / Clarity"}{"  "}
            {overview.ecology.pollution} / {overview.ecology.clarity}
          </Text>
        </Panel>
      </Box>
      <Panel
        title={zh ? "今日收容简报" : "TODAY'S CONTAINMENT BRIEF"}
        color="cyan"
        marginTop={1}
      >
        {overview.brief.day ? (
          <>
            <Text bold color={statusColor}>
              {overview.brief.day.statusLabel} · {overview.brief.day.usageBandLabel}
            </Text>
            <Text>{overview.brief.day.summary}</Text>
            {overview.brief.day.pathologyChanges.slice(0, 1).map((change) => (
              <Text key={`${change.type}-${change.to}`} color="magenta">
                {change.label}
              </Text>
            ))}
          </>
        ) : (
          <Text dimColor>
            {zh ? "当前日期尚未结算。档案员正在等你制造或避免后果。" : "This date is unsettled. The archivist awaits consequences—or restraint."}
          </Text>
        )}
        <Text color="yellow">{overview.brief.nextMilestone.label}</Text>
      </Panel>
      <Panel
        title={zh ? "异变年鉴" : "MUTATION CHRONICLE"}
        color="magenta"
        marginTop={1}
      >
        <Text color="magenta">{overview.chronicle.diagnosis}</Text>
        <Text dimColor>
          {zh ? "最近变化" : "LATEST"} · {overview.chronicle.latestChangeLabel}
        </Text>
        <Box gap={compact ? 0 : 2} flexDirection={compact ? "column" : "row"}>
          {overview.chronicle.periods.map((period) => (
            <Text key={period.days}>
              <Text bold color="cyan">{period.days}{zh ? "天" : "D"}</Text>{" "}
              {period.summary}
            </Text>
          ))}
        </Box>
        <Text color="yellow">
          {zh ? "世代" : "GEN"} · {overview.chronicle.comparison.baselineLabel} → {overview.chronicle.comparison.currentLabel}
        </Text>
        <Text dimColor>{overview.chronicle.comparison.summary}</Text>
        <Text color="green">
          {zh ? "病理星图" : "PATHOLOGY CONSTELLATIONS"} · {overview.chronicle.collectionSets.completed}/{overview.chronicle.collectionSets.total}
        </Text>
      </Panel>
      <Panel
        title={zh ? "今天可做" : "AVAILABLE TODAY"}
        color="yellow"
        marginTop={1}
      >
        {overview.actions.length > 0 ? (
          overview.actions.map((action, index) => (
            <Box key={action.id}>
              <Text color={index === 0 ? "yellow" : "cyan"}>
                {index === 0
                  ? zh ? "主要 · " : "PRIMARY · "
                  : zh ? "次要 · " : "SECONDARY · "}
              </Text>
              <Text>{action.label}</Text>
            </Box>
          ))
        ) : (
          <Text dimColor>
            {zh
              ? "当前没有待办。可以观察标本，不必制造事故。"
              : "Nothing is pending. Observation does not require an incident."}
          </Text>
        )}
      </Panel>
    </Box>
  );
}

function OverviewScreen(props) {
  return props.mode === "details"
    ? <OverviewDetailsScreen {...props} />
    : <DailyBriefingScreen {...props} />;
}

function HabitatScreen({
  snapshot,
  lang,
  frame,
  motion,
  observationTargets,
  observationIndex,
  glitch,
  replay,
  compact,
}) {
  const { habitat } = snapshot;
  const zh = lang === "zh";
  const sceneColor = {
    pollution: "red",
    clarity: "cyan",
    paradox: "yellow",
  }[habitat.scene.routeId] ?? "green";
  const observation = observationTargets[observationIndex] ?? null;
  const specimenFrame = deriveSpecimenFrame(
    habitat.specimen.art,
    frame,
    motion,
    {
      glitch,
      pose: glitch
        ? "mutation"
        : habitat.scene.layers.subject.poseId,
      temperament: habitat.specimen.temperament,
      chromaticAbilityId: habitat.specimen.chromaticAbilityId,
      observedOrganId: observation?.target === "specimen"
        ? observation.id
        : null,
    },
  );
  const sceneFrame = deriveHabitatSceneFrame(
    habitat.scene.art,
    habitat.scene.routeId,
    frame,
    motion,
  );
  return (
    <Box flexDirection="column">
      <Panel
        title={`${zh ? "活体生态舱" : "LIVING HABITAT"} · ${habitat.scene.name}`}
        color={sceneColor}
      >
        <Box flexDirection="column" marginBottom={1}>
          {sceneFrame.map((line, index) => (
            <Text key={`${habitat.scene.archetypeId}-${index}`} color={sceneColor}>
              {line}
            </Text>
          ))}
          <Text>
            <Text bold>{zh ? "舱内气候" : "HABITAT CLIMATE"}</Text>
            {" · "}{habitat.scene.climate}{" · "}{habitat.scene.cycle}
          </Text>
          <Text>
            <Text bold color={sceneColor}>{zh ? "生态短讯" : "HABITAT BULLETIN"}</Text>
            {" · "}{habitat.scene.bulletin}
          </Text>
          {habitat.scene.layers.trace ? (
            <Text dimColor>
              {zh ? "近期痕迹" : "RECENT TRACE"}{" · "}
              {habitat.scene.layers.trace.label}{" · "}
              {habitat.scene.layers.trace.date}
            </Text>
          ) : null}
        </Box>
        <Box gap={2} flexDirection={compact ? "column" : "row"}>
          <Box flexDirection="column" width={compact ? undefined : "50%"}>
            <Text bold>{zh ? "主标本" : "SPECIMEN"}</Text>
            {specimenFrame.map((line, lineIndex) => {
              const selected =
                observation?.target === "specimen" &&
                observation.lineIndex === lineIndex;
              return (
                <Text
                  key={`${lineIndex}-${line}`}
                  bold={selected}
                  color={selected ? "yellow" : glitch ? "magenta" : "red"}
                >
                  {line}
                </Text>
              );
            })}
            <Text color="magenta">
              {zh ? "馆藏异变" : "COLLECTION MUTATION"} · {habitat.specimen.collectionPhenotype.name
                ? `${habitat.specimen.collectionPhenotype.name} · ${zh ? "阶段" : "TIER"} ${habitat.specimen.collectionPhenotype.tier}`
                : zh ? "尚未诱发" : "NOT YET INDUCED"}
            </Text>
          </Box>
          <Box flexDirection="column" flexGrow={1}>
            <Text bold>{zh ? "伴生位" : "COMPANION BAY"}</Text>
            {habitat.companion ? (
              <>
                {deriveCompanionFrame(
                  habitat.companion.art,
                  frame,
                  motion,
                  {
                    routeId: habitat.companion.routeId,
                    stageId: habitat.companion.stageId,
                    anomalyIds: habitat.companion.anomalyIds,
                  },
                ).map((line, lineIndex) => {
                  const selected =
                    observation?.target === "companion" &&
                    observation.lineIndex === lineIndex;
                  return (
                    <Text
                      key={`${lineIndex}-${line}`}
                      bold={selected}
                      color={selected ? "yellow" : "cyan"}
                    >
                      {line}
                    </Text>
                  );
                })}
                <Text>
                  #{habitat.companion.cultureId} ·{" "}
                  {zh
                    ? `${habitat.companion.cohabitationDays} 天`
                    : `${habitat.companion.cohabitationDays}d`}
                </Text>
              </>
            ) : (
              <Box flexDirection="column">
                <Text bold color="yellow">
                  {zh ? "伴生收容进度" : "COMPANION INTAKE"} ·{" "}
                  {snapshot.laboratory.workflow.completed} /{" "}
                  {snapshot.laboratory.workflow.total}
                </Text>
                <Text>{snapshot.laboratory.workflow.next.label}</Text>
                <Text dimColor>
                  {snapshot.laboratory.workflow.next.id === "bond"
                    ? zh
                      ? "b 选择并绑定伴生物 · l 查看实验室"
                      : "b selects a companion to bond · l opens the lab"
                    : zh
                      ? "l 前往实验室查看下一步"
                      : "l opens the laboratory for the next step"}
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      </Panel>
      {replay ? (
        <Panel
          title={zh ? "事件回放" : "EVENT REPLAY"}
          color="magenta"
          marginTop={1}
        >
          <Text bold color="magenta">
            {replay.step + 1}/{replay.total} · {replay.label}
          </Text>
          <Text>{replay.message}</Text>
          <Text dimColor>
            {zh ? "r 停止回放" : "r stops replay"}
          </Text>
        </Panel>
      ) : null}
      {observation ? (
        <Panel
          title={zh ? "器官观察" : "ANATOMY INSPECTION"}
          color="yellow"
          marginTop={1}
        >
          <Text bold color="yellow">
            {observationIndex + 1}/{observationTargets.length} ·{" "}
            {observation.name}
          </Text>
          <Text>{observation.detail}</Text>
          <Text dimColor>
            {zh
              ? "方向键切换焦点 · Enter / esc 返回生态舱"
              : "Arrows change focus · Enter / esc returns to habitat"}
          </Text>
        </Panel>
      ) : null}
      <Box gap={1} marginTop={1} flexDirection={compact ? "column" : "row"}>
        <Panel
          title={zh ? "共生关系" : "RELATIONSHIP"}
          color="cyan"
          width={compact ? undefined : "50%"}
        >
          {habitat.relationship ? (
            <>
              <Text bold>{habitat.relationship.name}</Text>
              <Text>{habitat.relationship.symptom}</Text>
            </>
          ) : (
            <Text dimColor>
              {zh ? "目前只有主标本在自言自语。" : "The specimen is talking to itself."}
            </Text>
          )}
          <Text dimColor>
            {zh ? "下次生态记录" : "Next ecology record"} ·{" "}
            {zh
              ? `${habitat.cadence.daysUntilNext} 天`
              : `${habitat.cadence.daysUntilNext}d`}
          </Text>
        </Panel>
        <Panel
          title={zh ? "最近现象" : "RECENT PHENOMENA"}
          color="magenta"
          flexGrow={1}
        >
          {habitat.events.length > 0 ? (
            habitat.events.slice(0, 1).map((event) => (
              <Text key={`${event.id}-${event.discoveredAt}`}>
                {event.name} <Text dimColor>· {event.discoveredAt}</Text>
              </Text>
            ))
          ) : (
            <Text dimColor>
              {zh ? "尚无封存事故，生态舱仍假装安全。" : "No sealed incidents. The habitat still claims safety."}
            </Text>
          )}
        </Panel>
      </Box>
      <CabinetSlots cabinet={habitat.cabinet} lang={lang} showInteractions />
    </Box>
  );
}

export { OverviewScreen, HabitatScreen };
