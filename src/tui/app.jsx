import React, { useEffect, useRef, useState } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";

import {
  deriveCompanionFrame,
  deriveEventReplay,
  deriveObservationTargets,
  deriveSpecimenFrame,
  isGlitchFrame,
  motionInterval,
  nextMotionLevel,
} from "../application/tui-motion.mjs";
import {
  ActionMenu,
  ActionPreview,
  ActionResult,
  ActionStatus,
} from "./action-views.jsx";
import { Panel } from "./panel.jsx";

const SCREEN_IDS = [
  "overview",
  "habitat",
  "expedition",
  "laboratory",
  "codex",
];

function ProgressBar({ value, width = 18, color = "cyan" }) {
  const normalized = Math.max(0, Math.min(100, Number(value) || 0));
  const filled = Math.round((normalized / 100) * width);
  return (
    <Text color={color}>
      {"█".repeat(filled)}
      <Text dimColor>{"░".repeat(width - filled)}</Text>
      {` ${String(normalized).padStart(3)}%`}
    </Text>
  );
}

function Header({ snapshot, lang }) {
  const zh = lang === "zh";
  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text bold color="red">
          {zh ? "ANTI-AI · 收容控制台" : "ANTI-AI · CONTAINMENT CONSOLE"}
        </Text>
        <Text color="yellow">
          {zh ? "查看日期" : "VIEW"} · {snapshot.date}
        </Text>
      </Box>
      <Text dimColor>
        {zh ? "状态截止" : "STATE THROUGH"} · {snapshot.lastSettledDate ?? (zh ? "尚无" : "NONE")} ·{" "}
        {snapshot.overview.status === "awaiting"
          ? zh ? "当前日期待结算" : "VIEW DATE NOT SETTLED"
          : zh ? "当前日期已结算" : "VIEW DATE SETTLED"}
      </Text>
    </Box>
  );
}

function Navigation({ navigation, activeId }) {
  return (
    <Box gap={2} marginY={1}>
      {navigation.map((item) => {
        const active = item.id === activeId;
        return (
          <Text
            key={item.id}
            bold={active}
            color={active ? "black" : "gray"}
            backgroundColor={active ? "cyan" : undefined}
          >
            {` ${item.shortcut} ${item.label} `}
          </Text>
        );
      })}
    </Box>
  );
}

function OverviewScreen({ snapshot, lang, frame, motion, glitch, compact }) {
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
          {zh ? "收藏套组" : "COLLECTION SETS"} · {overview.chronicle.collectionSets.completed}/{overview.chronicle.collectionSets.total}
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
  const observation = observationTargets[observationIndex] ?? null;
  const specimenFrame = deriveSpecimenFrame(
    habitat.specimen.art,
    frame,
    motion,
    {
      glitch,
      pose: glitch ? "mutation" : habitat.relationship ? "alert" : "idle",
      temperament: habitat.specimen.temperament,
      chromaticAbilityId: habitat.specimen.chromaticAbilityId,
      observedOrganId: observation?.target === "specimen"
        ? observation.id
        : null,
    },
  );
  return (
    <Box flexDirection="column">
      <Panel title={zh ? "生态舱状态" : "HABITAT STATUS"} color="green">
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
            habitat.events.map((event) => (
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

function ExpeditionRail({ expedition, frame, motion }) {
  const cursor = Math.max(1, expedition.step);
  const cursorGlyph = motion === "off" || frame % 2 === 0 ? "@" : "◉";
  const cells = Array.from({ length: expedition.totalSteps }, (_, index) => {
    const cell = index + 1;
    if (expedition.status === "completed" || cell < cursor) return "[✓]";
    if (cell === cursor) return `[${cursorGlyph}]`;
    return "[?]";
  });
  return <Text color="cyan">{cells.join("─")}</Text>;
}

function ExpeditionScreen({
  snapshot,
  lang,
  selectedDestinationIndex,
  selectedChoiceIndex,
  frame,
  motion,
  compact,
}) {
  const { expedition } = snapshot;
  const zh = lang === "zh";
  const active = expedition.active;
  if (!active) {
    const latest = expedition.latest;
    return (
      <Box flexDirection="column">
        <Panel title={zh ? "收容远征" : "CONTAINMENT EXPEDITION"} color="yellow">
          <Text bold color={expedition.eligibility.available ? "green" : "gray"}>
            {expedition.eligibility.available
              ? zh ? "今日远征可用" : "TODAY'S EXPEDITION AVAILABLE"
              : expedition.eligibility.reason === "unhatched"
                ? zh ? "异变体尚未孵化" : "CREATURE NOT HATCHED"
                : expedition.eligibility.reason === "expired"
                  ? zh ? "所选日期的机会已过期" : "SELECTED DATE EXPIRED"
                  : zh ? "今日远征机会已使用" : "TODAY'S EXPEDITION USED"}
          </Text>
          <Text dimColor>
            {zh
              ? "按本地自然日刷新，不依赖结算；机会不累计，Token 量不改变结果。"
              : "Refreshes by local calendar day without settlement; no stacking or Token advantage."}
          </Text>
        </Panel>
        {expedition.eligibility.available ? (
          <Panel title={zh ? "选择目的地" : "SELECT DESTINATION"} color="cyan" marginTop={1}>
            {expedition.destinations.map((destination, index) => (
              <Box key={destination.id} flexDirection="column">
                <Text bold={index === selectedDestinationIndex} color={index === selectedDestinationIndex ? "cyan" : undefined}>
                  {index === selectedDestinationIndex ? "> " : "  "}
                  {index + 1}. {destination.label}
                </Text>
                {!compact || index === selectedDestinationIndex ? (
                  <Text dimColor>
                    {"   "}{destination.description} · {destination.mood}
                  </Text>
                ) : null}
              </Box>
            ))}
            <Text dimColor>
              {zh ? "↑↓ 选择 · Enter 启程" : "↑↓ selects · Enter starts"}
            </Text>
          </Panel>
        ) : latest ? (
          <Panel
            title={zh ? "最近返航 · 返航总结" : "LATEST RETURN · RETURN SUMMARY"}
            color="magenta"
            marginTop={1}
          >
            <Text bold>{latest.destination.label} · {latest.status.toUpperCase()}</Text>
            <ExpeditionRail expedition={latest} frame={frame} motion={motion} />
            <Text>
              {zh ? `已处理 ${latest.step} / 10 格` : `${latest.step} / 10 CELLS SEALED`} ·{" "}
              {zh ? `特殊事件 ${latest.returnSummary.events.special}` : `SPECIAL ${latest.returnSummary.events.special}`} ·{" "}
              {zh ? `状态变动 ${latest.returnSummary.events.mutations}` : `SHIFTS ${latest.returnSummary.events.mutations}`}
            </Text>
            <Text bold color="yellow">
              {zh ? "返航清单" : "RETURN MANIFEST"}
            </Text>
            <Text>
              {zh ? "遗物" : "ARTIFACTS"} ·{" "}
              {latest.returnSummary.artifacts.length > 0
                ? latest.returnSummary.artifacts.map((artifact, index) => (
                    <Text key={artifact.id} color={RARITY_COLORS[artifact.rarity]}>
                      {index > 0 ? " · " : ""}{artifact.name}
                    </Text>
                  ))
                : zh ? "空手返航" : "EMPTY-HANDED"}
            </Text>
            <Text>
              {zh ? "新成就" : "ACHIEVEMENTS"} ·{" "}
              {latest.returnSummary.achievements.length > 0
                ? latest.returnSummary.achievements.map((achievement, index) => (
                    <Text key={achievement.id} color={RARITY_COLORS[achievement.rarity]}>
                      {index > 0 ? " · " : ""}{achievement.name}
                    </Text>
                  ))
                : zh ? "无" : "NONE"}
            </Text>
            {latest.returnSummary.permanentEffect ? (
              <Text color={latest.returnSummary.permanentEffect.delta >= 0 ? "red" : "cyan"}>
                {zh ? "永久后遗症" : "PERMANENT AFTEREFFECT"} ·{" "}
                {latest.returnSummary.permanentEffect.ability}{" "}
                {latest.returnSummary.permanentEffect.delta >= 0 ? "+" : ""}
                {latest.returnSummary.permanentEffect.delta}
              </Text>
            ) : null}
            <Text dimColor>{latest.returnSummary.temporaryEffectNote}</Text>
            <Text bold color="cyan">{zh ? "事件轨迹" : "EVENT TRAIL"}</Text>
            {latest.returnSummary.recentEvents.map((event) => (
              <Text key={`${event.step}-${event.type}`}>
                {String(event.step).padStart(2, "0")} · {event.badge} · {event.title}
              </Text>
            ))}
            <Text bold color="yellow">{zh ? "返航诊断" : "RETURN DIAGNOSIS"}</Text>
            <Text>{latest.returnSummary.diagnosis}</Text>
          </Panel>
        ) : null}
      </Box>
    );
  }
  const latestEvent = active.events.at(-1) ?? null;
  return (
    <Box flexDirection="column">
      <Panel title={`${zh ? "收容远征" : "CONTAINMENT EXPEDITION"} · ${active.destination.label}`} color="magenta">
        <ExpeditionRail expedition={active} frame={frame} motion={motion} />
        <Text bold>
          {zh ? `第 ${active.step} / 10 格` : `CELL ${active.step} / 10`} ·{" "}
          {zh ? `临时状态 ${active.temporaryEffects.length}` : `CONDITIONS ${active.temporaryEffects.length}`} ·{" "}
          {zh ? `遗物 ${active.artifactIds.length}` : `ARTIFACTS ${active.artifactIds.length}`}
        </Text>
      </Panel>
      <Panel title={zh ? "最近事件" : "LATEST EVENT"} color="cyan" marginTop={1}>
        {latestEvent ? (
          <>
            <Text bold color={latestEvent.color}>
              {zh ? `第 ${latestEvent.step} 格` : `CELL ${latestEvent.step}`} · [{latestEvent.badge}] · {latestEvent.title}
            </Text>
            <Text>{latestEvent.body}</Text>
            {latestEvent.effect ? (
              <Text color={latestEvent.effect.delta >= 0 ? "red" : "cyan"}>
                {latestEvent.effect.ability} {latestEvent.effect.delta >= 0 ? "+" : ""}{latestEvent.effect.delta} · {latestEvent.effect.durationLabel}
              </Text>
            ) : null}
            {latestEvent.artifact ? (
              <Text color={RARITY_COLORS[latestEvent.artifact.rarity]}>
                {zh ? "发现" : "FOUND"} · {latestEvent.artifact.name} · {latestEvent.artifact.rarity.toUpperCase()}
              </Text>
            ) : null}
            <Text dimColor>{latestEvent.system}</Text>
          </>
        ) : (
          <Text dimColor>
            {zh ? "尚未进入第一格。事件正在排队假装随机。" : "Cell one is untouched. Events are queuing to impersonate chance."}
          </Text>
        )}
        {active.pendingChoice ? (
          <Box flexDirection="column">
            <Text bold color="yellow">
              {zh ? "当前分叉待处理" : "BRANCH PENDING"}
            </Text>
            {(latestEvent?.options ?? []).map((option, index) => (
              <Text
                key={option.slot}
                bold={index === selectedChoiceIndex}
                color={index === selectedChoiceIndex ? "yellow" : undefined}
              >
                {index === selectedChoiceIndex ? "> " : "  "}
                {option.slot}. {option.label} · {option.effect.ability}{" "}
                {option.effect.delta >= 0 ? "+" : ""}{option.effect.delta}
              </Text>
            ))}
            <Text dimColor>
              {zh ? "↑↓ / 1–3 选择 · Enter 封存" : "↑↓ / 1–3 selects · Enter seals"}
            </Text>
          </Box>
        ) : (
          <Text dimColor>
            {zh ? "Enter 下一格 · x 放弃并返航 · q 暂停返回" : "Enter advances · x abandons · q pauses"}
          </Text>
        )}
      </Panel>
      {active.events.length > 1 && !active.pendingChoice ? (
        <Panel title={zh ? "最近轨迹" : "RECENT TRAIL"} color="gray" marginTop={1}>
          {active.events.slice(-3).map((event) => (
            <Text key={`${event.step}-${event.type}`}>
              {String(event.step).padStart(2, "0")} · {event.badge} · {event.title}
            </Text>
          ))}
        </Panel>
      ) : null}
    </Box>
  );
}

const RARITY_COLORS = {
  common: "white",
  uncommon: "cyan",
  rare: "magenta",
  epic: "yellow",
  mythic: "red",
};

function LaboratoryScreen({
  snapshot,
  lang,
  focus,
  selectedProposalIndex,
  selectedCultureIndex,
  inspectingCulture,
  compact,
}) {
  const { laboratory } = snapshot;
  const zh = lang === "zh";
  const selectedCulture = laboratory.shelf[selectedCultureIndex] ?? null;
  if (inspectingCulture && selectedCulture) {
    return (
      <Box flexDirection="column">
        <Panel
          title={`${zh ? "培养物档案" : "CULTURE FILE"} · #${selectedCulture.id}`}
          color={RARITY_COLORS[selectedCulture.rarity]}
        >
          <Box gap={2} flexDirection={compact ? "column" : "row"}>
            <Box flexDirection="column" width={compact ? undefined : "42%"}>
              <Text color={RARITY_COLORS[selectedCulture.rarity]}>
                {selectedCulture.art.join("\n")}
              </Text>
              <Text dimColor>
                {zh ? "外观指纹" : "APPEARANCE"} · {selectedCulture.fingerprint}
              </Text>
            </Box>
            <Box flexDirection="column" flexGrow={1}>
              <Text bold color={RARITY_COLORS[selectedCulture.rarity]}>
                {selectedCulture.type} · {selectedCulture.rarity.toUpperCase()}
              </Text>
              <Text>
                {zh ? "原料" : "MATERIALS"}　
                {selectedCulture.ingredients
                  .map(({ label, id }) => `${label} #${id}`)
                  .join(" × ")}
              </Text>
              <Text>
                {zh ? "诊断" : "DIAGNOSIS"}　{selectedCulture.ecology} /{" "}
                {selectedCulture.pathology}
              </Text>
              <Text>
                {zh ? "并发症" : "COMPLICATION"}　{selectedCulture.complication}
              </Text>
              <Text>
                {zh ? "副作用" : "SIDE EFFECT"}　{selectedCulture.sideEffect}
              </Text>
              <Text>
                {zh ? "封存日期" : "SEALED"}　{selectedCulture.createdAt}
              </Text>
              <Text dimColor>
                {selectedCulture.active
                  ? zh
                    ? "● 当前伴生物 · Esc 返回培养架"
                    : "● ACTIVE COMPANION · Esc returns to shelf"
                  : zh
                    ? "b 绑定为伴生物 · Esc 返回培养架"
                    : "b bonds as companion · Esc returns to shelf"}
              </Text>
            </Box>
          </Box>
        </Panel>
      </Box>
    );
  }
  const shelfWindowSize = 5;
  const shelfStart = Math.max(
    0,
    Math.min(
      selectedCultureIndex - shelfWindowSize + 1,
      laboratory.shelf.length - shelfWindowSize,
    ),
  );
  const visibleShelf = laboratory.shelf.slice(
    shelfStart,
    shelfStart + shelfWindowSize,
  );
  const formulaTitle = `${zh ? "第" : "BATCH"} ${laboratory.batch} ${
    zh ? "批配方" : "FORMULAS"
  }${focus === "formulas" ? (zh ? " · 已聚焦" : " · FOCUSED") : ""}`;
  const shelfTitle = `${zh ? "培养架" : "CULTURE SHELF"}${
    focus === "shelf" ? (zh ? " · 已聚焦" : " · FOCUSED") : ""
  }`;
  return (
    <Box flexDirection="column">
      <Panel title={zh ? "污染实验室" : "POLLUTION LABORATORY"} color="magenta">
        <Box gap={3}>
          <Text>
            {zh ? "外来标本" : "Foreign"}{" "}
            <Text color="cyan">{laboratory.inventory.foreignSpecimens}</Text>
          </Text>
          <Text>
            {zh ? "永久化石" : "Fossils"}{" "}
            <Text color="yellow">{laboratory.inventory.fossils}</Text>
          </Text>
          <Text>
            {zh ? "病例切片" : "Case slices"}{" "}
            <Text color="red">{laboratory.inventory.caseSlices}</Text>
          </Text>
          <Text>
            {zh ? "培养物" : "Cultures"}{" "}
            <Text color="green">{laboratory.cultures}</Text>
          </Text>
        </Box>
        <Text bold color="yellow">
          {zh ? "培养流程" : "CULTURE WORKFLOW"} ·{" "}
          {laboratory.workflow.completed} / {laboratory.workflow.total}
        </Text>
        <Text>
          {laboratory.workflow.steps.map((step) =>
            `${step.complete ? "●" : "○"} ${step.label}`,
          ).join("  →  ")}
        </Text>
      </Panel>
      <Box gap={1} marginTop={1} flexDirection={compact ? "column" : "row"}>
        <Panel
          title={formulaTitle}
          color={focus === "formulas" ? "yellow" : "red"}
          width={compact ? undefined : "60%"}
        >
          {laboratory.proposals.length > 0 ? (
            laboratory.proposals.map((proposal, index) => (
              <Box key={proposal.id} flexDirection="column" marginBottom={1}>
                <Text
                  bold={focus === "formulas" && index === selectedProposalIndex}
                  color={
                    focus === "formulas" && index === selectedProposalIndex
                      ? "yellow"
                      : "white"
                  }
                >
                  {focus === "formulas" && index === selectedProposalIndex
                    ? "> "
                    : "  "}
                  {proposal.slot}. {proposal.type}{" "}
                  <Text color="yellow">
                    {zh
                      ? ({ common: "常见", uncommon: "罕见", rare: "稀有", epic: "史诗", mythic: "神话" }[proposal.rarity] ?? proposal.rarity)
                      : proposal.rarity.toUpperCase()}
                  </Text>
                </Text>
                <Text dimColor>
                  {proposal.ecology} / {proposal.pathology} ·{" "}
                  {proposal.complication}
                </Text>
              </Box>
            ))
          ) : (
            <Box flexDirection="column">
              <Text bold color="yellow">{laboratory.workflow.next.label}</Text>
              <Text dimColor>
                {zh
                  ? "外来标本 · anti-ai encounter <污染编码> --save"
                  : "Foreign specimen · anti-ai encounter <pollution-code> --save"}
              </Text>
              <Text dimColor>
                {zh
                  ? "病例切片 · 在待处理病例出现后，从行动中心选择路线"
                  : "Case slice · choose a route in Actions when a case appears"}
              </Text>
              <Text dimColor>
                {zh
                  ? "永久化石 · 每个 90 日世代自动封存"
                  : "Permanent fossil · sealed after each 90-day generation"}
              </Text>
            </Box>
          )}
          {laboratory.proposals.length > 0 ? (
            <Text dimColor>
              {zh
                ? "↑↓ 选择配方 · Tab 切换区域 · Enter 培养"
                : "↑↓ selects · Tab changes pane · Enter incubates"}
            </Text>
          ) : null}
        </Panel>
        <Panel
          title={shelfTitle}
          color={focus === "shelf" ? "yellow" : "green"}
          flexGrow={1}
        >
          {visibleShelf.length > 0 ? (
            visibleShelf.map((culture, visibleIndex) => {
              const index = shelfStart + visibleIndex;
              const selected = focus === "shelf" && index === selectedCultureIndex;
              return (
                <Text
                  key={culture.id}
                  bold={selected}
                  color={selected ? "yellow" : RARITY_COLORS[culture.rarity]}
                >
                  {selected ? "> " : "  "}#{culture.id} · {culture.type}
                  {culture.active ? (zh ? " · 当前" : " · ACTIVE") : ""}
                </Text>
              );
            })
          ) : (
            <Text dimColor>{zh ? "培养架空空如也。" : "The shelf is empty."}</Text>
          )}
          {laboratory.shelf.length > 0 ? (
            <Text dimColor>
              {zh
                ? "↑↓ 选择 · Tab 切换区域 · Enter 查看 · b 绑定"
                : "↑↓ selects · Tab changes pane · Enter inspects · b bonds"}
            </Text>
          ) : null}
        </Panel>
      </Box>
    </Box>
  );
}

function CabinetSlots({ cabinet, lang, showInteractions = false }) {
  const zh = lang === "zh";
  return (
    <Panel title={zh ? "后果陈列柜" : "CONSEQUENCE CABINET"} color="magenta" marginTop={1}>
      <Box gap={2}>
        {cabinet.slots.map((entry, index) => (
          <Text key={entry?.key ?? `empty-${index}`} color={entry ? RARITY_COLORS[entry.rarity] : "gray"}>
            {index + 1}. {entry?.label ?? (zh ? "空置" : "VACANT")}
          </Text>
        ))}
      </Box>
      {showInteractions ? (
        <>
          <Text dimColor>
            {cabinet.interactions.observe
              ? `${zh ? "今日观察" : "OBSERVATION"} · ${cabinet.interactions.observe.text}`
              : zh ? "o 今日观察 · 尚未使用" : "o observation · available"}
          </Text>
          <Text dimColor>
            {cabinet.interactions.contact
              ? `${zh ? "今日接触" : "CONTACT"} · ${cabinet.interactions.contact.text}`
              : zh ? "c 今日接触 · 尚未使用" : "c contact · available"}
          </Text>
        </>
      ) : null}
    </Panel>
  );
}

function CodexScreen({
  snapshot,
  lang,
  mode,
  categoryIndex,
  entryIndex,
  archiveSpan,
  archiveIndex,
  compact,
}) {
  const { codex } = snapshot;
  const zh = lang === "zh";
  const category = codex.categories[categoryIndex] ?? codex.categories[0];
  const entry = category?.entries[entryIndex] ?? null;
  const archiveDays = codex.archive.days.slice(0, archiveSpan);
  const archiveDay = archiveDays[archiveIndex] ?? null;
  if (mode === "archive_detail" && archiveDay) {
    return (
      <Box flexDirection="column">
        <Panel title={`${zh ? "每日收容记录" : "DAILY CONTAINMENT RECORD"} · ${archiveDay.date}`} color="magenta">
          <Text bold color={archiveDay.status === "active" ? "red" : "cyan"}>
            {archiveDay.statusLabel} · {archiveDay.usageBandLabel}
          </Text>
          <Text>{archiveDay.summary}</Text>
          {archiveDay.mutationEventLabel ? (
            <Text>{zh ? "异变事件" : "MUTATION EVENT"}　{archiveDay.mutationEventLabel}</Text>
          ) : null}
          <Text bold color="magenta">{zh ? "病理变化" : "PATHOLOGY CHANGES"}</Text>
          {archiveDay.pathologyChanges.length > 0 ? (
            archiveDay.pathologyChanges.map((change) => (
              <Text key={`${change.type}-${change.to}`}>· {change.label}</Text>
            ))
          ) : (
            <Text dimColor>{zh ? "· 无结构性变化" : "· No structural change"}</Text>
          )}
          <Text bold color="cyan">{zh ? "新增收藏" : "DISCOVERIES"}</Text>
          {archiveDay.discoveries.length > 0 ? (
            archiveDay.discoveries.map((discovery) => (
              <Text key={`${discovery.type}-${discovery.id}`}>· {discovery.label}</Text>
            ))
          ) : (
            <Text dimColor>{zh ? "· 今日没有新标本入库" : "· No new records today"}</Text>
          )}
          {archiveDay.activities.map((activity, index) => (
            <Text key={`${activity.type}-${index}`}>· {activity.label}</Text>
          ))}
          <Text dimColor>
            {zh ? "s 分享 · Esc 返回档案" : "s share · Esc returns to archive"}
          </Text>
        </Panel>
      </Box>
    );
  }
  if (mode === "archive") {
    return (
      <Box flexDirection="column">
        <Panel title={zh ? "收容档案" : "CONTAINMENT ARCHIVE"} color="magenta">
          <Box justifyContent="space-between">
            <Text bold>{zh ? `最近 ${archiveSpan} 天` : `LATEST ${archiveSpan} DAYS`}</Text>
            <Text dimColor>{zh ? "t 切换 7 / 30 天" : "t toggles 7 / 30 days"}</Text>
          </Box>
          {archiveDays.length > 0 ? (
            archiveDays.map((day, index) => (
              <Box key={day.date} justifyContent="space-between">
                <Text
                  bold={index === archiveIndex}
                  color={index === archiveIndex ? "yellow" : day.status === "active" ? "red" : "cyan"}
                >
                  {index === archiveIndex ? "> " : "  "}{day.date} · {day.statusLabel}
                </Text>
                <Text dimColor>{day.summary}</Text>
              </Box>
            ))
          ) : (
            <Text dimColor>{zh ? "尚无孵化后的收容记录。" : "No post-hatch containment records yet."}</Text>
          )}
          <Text dimColor>
            {zh ? "↑↓ 选择日期 · Enter 查看 · Esc 返回图鉴" : "↑↓ selects a date · Enter opens · Esc returns to Codex"}
          </Text>
        </Panel>
      </Box>
    );
  }
  if (mode === "detail" && entry) {
    return (
      <Box flexDirection="column">
        <Panel title={zh ? "条目档案" : "COLLECTION RECORD"} color={RARITY_COLORS[entry.rarity]}>
          <Text bold color={RARITY_COLORS[entry.rarity]}>
            {entry.discovered ? "◆" : "▒"} {entry.label}
          </Text>
          <Text>{entry.detail}</Text>
          {entry.type === "collectionSet" ? (
            <>
              <Text color={RARITY_COLORS[entry.rarity]}>
                {zh ? "进度" : "PROGRESS"}　{entry.progress.completed} / {entry.progress.total}
              </Text>
              {entry.requirements.map((requirement) => (
                <Text key={requirement.id} color={requirement.completed ? "green" : "gray"}>
                  {requirement.completed ? "✓" : "◇"} {requirement.label}
                </Text>
              ))}
              {entry.completed ? (
                <Text color="yellow">{zh ? "档案印章" : "DOSSIER STAMP"}　{entry.stamp}</Text>
              ) : null}
            </>
          ) : null}
          <Text color={RARITY_COLORS[entry.rarity]}>
            {zh ? "稀有性" : "RARITY"}　{entry.rarityLabel}
          </Text>
          <Text>
            {zh ? "稳定编号" : "STABLE ID"}　{entry.discovered ? entry.key : `${entry.type}:locked`}
          </Text>
          <Text>
            {zh ? "发现于" : "DISCOVERED"}　{entry.discoveredAt ?? (zh ? "尚未发现" : "LOCKED")}
          </Text>
          {entry.discovered && entry.provenance ? (
            <>
              <Text>
                {zh ? "来源" : "SOURCE"}　{entry.provenance.sourceLabel}
              </Text>
              <Text>
                {zh ? "关联记录" : "RELATED RECORD"}　{entry.provenance.relatedId ?? entry.provenance.sourceId ?? "—"}
              </Text>
              <Text>
                {zh ? "陈列状态" : "DISPLAY STATUS"}　{entry.cabinet.displayed
                  ? zh ? `第 ${entry.cabinet.slot} 位` : `SLOT ${entry.cabinet.slot}`
                  : zh ? "未陈列" : "NOT DISPLAYED"}
              </Text>
            </>
          ) : null}
          <Text dimColor>
            {entry.type === "collectionSet"
              ? entry.completed
                ? zh
                  ? "s 分享标本档案 · Esc 返回条目"
                  : "s shares dossier · Esc returns to entries"
                : zh
                  ? "套组按既有记录自动完成，不提供数值奖励 · Esc 返回"
                  : "Sets complete from existing records and grant no numeric reward · Esc returns"
              : entry.discovered
              ? zh
                ? "d 陈列 · s 分享 · Esc 返回条目"
                : "d display · s share · Esc returns to entries"
              : zh
                ? "锁定条目不会泄露名称或解锁条件 · Esc 返回"
                : "Locked records reveal neither names nor hidden conditions · Esc returns"}
          </Text>
        </Panel>
        <CabinetSlots cabinet={codex.cabinet} lang={lang} />
      </Box>
    );
  }
  if (mode === "entries") {
    return (
      <Box flexDirection="column">
        <Panel title={`${zh ? "收藏条目" : "COLLECTION ENTRIES"} · ${category.label}`} color="cyan">
          {category.entries.length > 0 ? (
            category.entries.map((candidate, index) => (
              <Box key={candidate.key} justifyContent="space-between">
                <Text
                  bold={index === entryIndex}
                  color={index === entryIndex ? "yellow" : candidate.discovered ? RARITY_COLORS[candidate.rarity] : "gray"}
                >
                  {index === entryIndex ? "> " : "  "}
                  {candidate.discovered ? "◆" : "▒"} {candidate.label}
                </Text>
                <Text color={candidate.discovered ? RARITY_COLORS[candidate.rarity] : "gray"}>
                  {candidate.discovered ? candidate.rarityLabel : zh ? "未发现" : "LOCKED"}
                </Text>
              </Box>
            ))
          ) : (
            <Text dimColor>{zh ? "这个分类还没有个人收藏。" : "No personal records in this category yet."}</Text>
          )}
          <Text dimColor>
            {zh ? "↑↓ / Tab 选择 · Enter 查看 · Esc 返回分类" : "↑↓ / Tab select · Enter opens · Esc returns to categories"}
          </Text>
        </Panel>
        <CabinetSlots cabinet={codex.cabinet} lang={lang} />
      </Box>
    );
  }
  const fixed = codex.categories.filter(({ group }) => group !== "dynamic");
  const dynamic = codex.categories.filter(({ group }) => group === "dynamic");
  const categoryRow = (item) => {
    const index = codex.categories.findIndex(({ id }) => id === item.id);
    const selected = index === categoryIndex;
    return (
      <Box key={item.id} justifyContent="space-between">
        <Text bold={selected} color={selected ? "yellow" : "white"}>
          {selected ? "> " : "  "}{item.label}
        </Text>
        <Text color="cyan">
          {Number.isInteger(item.total) ? `${item.discovered} / ${item.total}` : item.discovered}
        </Text>
      </Box>
    );
  };
  return (
    <Box flexDirection="column">
      <Panel title={zh ? "病理图鉴" : "PATHOLOGY CODEX"} color="yellow">
        <Box justifyContent="space-between">
          <Text bold>
            {codex.fixed.discovered} / {codex.fixed.total}{" "}
            {zh ? "固定收藏" : "fixed discoveries"}
          </Text>
          <ProgressBar value={codex.fixed.percent} color="yellow" width={24} />
        </Box>
      </Panel>
      <Box gap={1} marginTop={1} flexDirection={compact ? "column" : "row"}>
        <Panel
          title={zh ? "基础图鉴" : "BASE CODEX"}
          color="cyan"
          width={compact ? undefined : "50%"}
        >
          {fixed.map(categoryRow)}
        </Panel>
        <Panel
          title={zh ? "个人收藏" : "PERSONAL COLLECTION"}
          color="green"
          flexGrow={1}
        >
          {dynamic.map(categoryRow)}
        </Panel>
      </Box>
      <Panel
        title={zh ? "最近入库" : "RECENT DISCOVERIES"}
        color="magenta"
        marginTop={1}
      >
        {codex.recent.length > 0 ? (
          codex.recent.map((entry) => (
            <Text key={`${entry.type}-${entry.id}`}>
              {entry.label} <Text dimColor>· {entry.discoveredAt}</Text>
            </Text>
          ))
        ) : (
          <Text dimColor>
            {zh ? "今天没有新收藏。病理学暂时失业。" : "No new finds today. Pathology is briefly unemployed."}
          </Text>
        )}
      </Panel>
      <Text dimColor>
        {zh ? "↑↓ 选择分类 · Enter 浏览条目 · h 收容档案" : "↑↓ selects a category · Enter browses entries · h archive"}
      </Text>
      <CabinetSlots cabinet={codex.cabinet} lang={lang} />
    </Box>
  );
}

function HelpOverlay({ lang, activeId, codexMode }) {
  const zh = lang === "zh";
  const contextual = {
    overview: [
      ["Enter", zh ? "处理当前主要行动" : "open the primary action"],
      ["s", zh ? "导出异变体分享卡" : "export the specimen share card"],
    ],
    habitat: [
      ["Enter", zh ? "进入只读器官观察" : "open read-only anatomy inspection"],
      ["o / c", zh ? "今日观察 / 今日接触" : "today's observation / contact"],
      ["r", zh ? "回放最近生态事件" : "replay the latest habitat event"],
      ["l", zh ? "前往污染实验室" : "open the pollution laboratory"],
      ["b", zh ? "选择或切换伴生物" : "bond or switch a companion"],
      ["s", zh ? "导出生态舱分享卡" : "export the habitat share card"],
    ],
    laboratory: [
      ["Tab", zh ? "切换配方与培养架" : "switch formulas and shelf"],
      ["↑↓", zh ? "选择配方或培养物" : "select a formula or culture"],
      ["Enter", zh ? "培养所选配方或查看培养物" : "incubate or inspect selection"],
      ["b", zh ? "绑定所选培养物" : "bond the selected culture"],
      ["Esc", zh ? "从培养物档案返回" : "return from a culture file"],
    ],
    expedition: [
      ["↑↓", zh ? "选择目的地" : "select a destination"],
      ["Enter", zh ? "直接启程、进入下一格或封存分叉" : "start, advance, or seal a branch directly"],
      ["1–3", zh ? "分叉出现时快速选择" : "select a branch when one appears"],
      ["x", zh ? "预览放弃当前远征" : "preview abandoning the run"],
      ["s", zh ? "分享当前远征或返航总结" : "share the run or return summary"],
      ["q", zh ? "暂停并返回总览" : "pause and return to Overview"],
    ],
    codex: [
      ["↑↓ / Tab", zh ? "选择分类或条目" : "select category or entry"],
      ["Enter", zh ? "进入下一级" : "open the next level"],
      ["h", zh ? "打开收容档案" : "open containment archive"],
      ["t", zh ? "切换 7 / 30 天档案" : "toggle 7 / 30 day archive"],
      ["d", zh ? "陈列已发现条目" : "display a discovered entry"],
      ["s", zh ? "预览并导出当前记录" : "preview and export the current record"],
      ["Esc", zh ? `${codexMode === "categories" ? "退出" : "返回上一级"}` : codexMode === "categories" ? "exit" : "go up one level"],
    ],
  }[activeId] ?? [];
  return (
    <Panel title={zh ? "控制台快捷键" : "CONSOLE SHORTCUTS"} color="yellow">
      <Text>1–5　{zh ? "切换区域" : "switch area"}</Text>
      <Text>← →　{zh ? "切换相邻区域" : "switch adjacent area"}</Text>
      <Text>Tab　 {zh ? "切换区域或当前焦点" : "switch area or current focus"}</Text>
      <Text>m　　{zh ? "切换动态档位" : "cycle motion level"}</Text>
      <Text>a　　{zh ? "打开收容协议行动中心" : "open containment actions"}</Text>
      <Text bold color="cyan">{zh ? "当前页面" : "CURRENT PAGE"}</Text>
      {contextual.map(([key, description]) => (
        <Text key={`${key}-${description}`}>{key}　{description}</Text>
      ))}
      <Text>?　　{zh ? "关闭本说明" : "close this help"}</Text>
      <Text>
        esc　{zh ? "返回上层；再次按下退出" : "go back; press again to exit"}
      </Text>
      <Text>q　　{zh ? "退出，不惊动标本" : "exit without disturbing specimens"}</Text>
    </Panel>
  );
}

function ShareOverlay({ mode, preview, result, error, lang }) {
  const zh = lang === "zh";
  if (mode === "loading") {
    return (
      <Panel title={zh ? "分享卡" : "SHARE CARD"} color="yellow">
        <Text>{zh ? "正在准备本地卡片……" : "Preparing the local card…"}</Text>
      </Panel>
    );
  }
  if (mode === "error") {
    return (
      <Panel title={zh ? "分享失败" : "SHARE FAILED"} color="red">
        <Text>{error}</Text>
        <Text dimColor>{zh ? "Esc 返回，不会写入文件" : "Esc returns without writing a file"}</Text>
      </Panel>
    );
  }
  if (mode === "result") {
    return (
      <Panel title={zh ? "分享卡已保存" : "SHARE CARD SAVED"} color="green">
        <Text bold color="green">{result.message}</Text>
        <Text>{result.targetPath}</Text>
        <Text dimColor>{zh ? "Enter 返回当前页面" : "Enter returns to the current page"}</Text>
      </Panel>
    );
  }
  return (
    <Panel title={zh ? "分享卡预览" : "SHARE CARD PREVIEW"} color="yellow">
      <Text bold>{preview.title}</Text>
      <Text>{zh ? "卡片类型" : "CARD"}　{preview.card.toUpperCase()}</Text>
      <Text>{zh ? "目标文件" : "TARGET"}　{preview.targetPath ?? preview.filename}</Text>
      <Text color="cyan">{preview.privacy}</Text>
      <Text color="yellow">{preview.warning}</Text>
      <Text dimColor>
        {zh ? "y / Enter 确认导出 · n / Esc 取消" : "y / Enter exports · n / Esc cancels"}
      </Text>
    </Panel>
  );
}

function TuiApp({
  snapshot: initialSnapshot,
  lang = "zh",
  initialMotion = "low",
  actionController = null,
  shareController = null,
  terminalColumns = undefined,
}) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const columns = terminalColumns ?? stdout?.columns ?? 80;
  const compact = columns <= 80;
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [motion, setMotion] = useState(initialMotion);
  const [frame, setFrame] = useState(0);
  const [observationIndex, setObservationIndex] = useState(null);
  const [replayStartFrame, setReplayStartFrame] = useState(null);
  const [actionMode, setActionMode] = useState(null);
  const [actionIndex, setActionIndex] = useState(0);
  const [actionPreview, setActionPreview] = useState(null);
  const [actionChoiceIndex, setActionChoiceIndex] = useState(0);
  const [actionResult, setActionResult] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionOrigin, setActionOrigin] = useState("menu");
  const [shareMode, setShareMode] = useState(null);
  const [sharePreview, setSharePreview] = useState(null);
  const [shareResult, setShareResult] = useState(null);
  const [shareError, setShareError] = useState(null);
  const [codexMode, setCodexMode] = useState("categories");
  const [codexCategoryIndex, setCodexCategoryIndex] = useState(0);
  const [codexEntryIndex, setCodexEntryIndex] = useState(0);
  const [codexArchiveSpan, setCodexArchiveSpan] = useState(7);
  const [codexArchiveIndex, setCodexArchiveIndex] = useState(0);
  const [laboratoryFocus, setLaboratoryFocus] = useState(
    initialSnapshot.laboratory.proposals.length > 0 ? "formulas" : "shelf",
  );
  const [laboratoryProposalIndex, setLaboratoryProposalIndex] = useState(0);
  const [laboratoryCultureIndex, setLaboratoryCultureIndex] = useState(0);
  const [expeditionDestinationIndex, setExpeditionDestinationIndex] = useState(0);
  const [expeditionChoiceIndex, setExpeditionChoiceIndex] = useState(0);
  const [inspectingCulture, setInspectingCulture] = useState(false);
  const inlineActionLock = useRef(false);

  const activeId = SCREEN_IDS[activeIndex];
  const observationTargets = deriveObservationTargets(snapshot, lang);
  const glitch = isGlitchFrame(snapshot, frame, motion);
  const replay = replayStartFrame === null
    ? null
    : deriveEventReplay(
        snapshot,
        Math.floor((frame - replayStartFrame) / 3),
        lang,
      );
  const actions = snapshot.actions ?? [];
  const menuActions = actions.filter(({ available }) => available);
  const activeCodexCategory = snapshot.codex.categories[codexCategoryIndex];
  const activeCodexEntry = activeCodexCategory?.entries[codexEntryIndex] ?? null;
  const activeArchiveDay = snapshot.codex.archive.days
    .slice(0, codexArchiveSpan)[codexArchiveIndex] ?? null;

  const currentShareContext = () => {
    const settledDate = snapshot.lastSettledDate;
    if (activeId === "overview") {
      return settledDate ? { screen: "overview", date: settledDate } : null;
    }
    if (activeId === "habitat") {
      return settledDate ? { screen: "habitat", date: settledDate } : null;
    }
    if (activeId === "expedition") {
      const record = snapshot.expedition.active ?? snapshot.expedition.latest;
      return record
        ? {
            screen: "expedition",
            date: record.completedAt ?? record.abandonedAt ?? record.startedAt,
          }
        : null;
    }
    if (activeId === "codex" && codexMode === "archive_detail" && activeArchiveDay) {
      return { screen: "archive", date: activeArchiveDay.date };
    }
    if (activeId === "codex" && codexMode === "detail" && activeCodexEntry) {
      return {
        screen: "codex",
        date: activeCodexEntry.discoveredAt ?? settledDate,
        entry: activeCodexEntry,
      };
    }
    return null;
  };

  const openSharePreview = async () => {
    const context = currentShareContext();
    if (!context || !shareController?.preview) return;
    setShareMode("loading");
    setShareError(null);
    setShareResult(null);
    try {
      const preview = await shareController.preview(context);
      if (!preview.available) {
        setShareError(preview.reasonLabel ?? preview.reason);
        setShareMode("error");
        return;
      }
      setSharePreview(preview);
      setShareMode("preview");
    } catch (error) {
      setShareError(error?.message ?? String(error));
      setShareMode("error");
    }
  };

  const executeShare = async () => {
    if (!sharePreview || !shareController?.execute) return;
    setShareMode("loading");
    try {
      const result = await shareController.execute(sharePreview);
      if (result.status !== "completed") {
        setShareError(result.reasonLabel ?? result.reason);
        setShareMode("error");
        return;
      }
      setShareResult(result);
      setShareMode("result");
    } catch (error) {
      setShareError(error?.message ?? String(error));
      setShareMode("error");
    }
  };

  const openActionMenu = () => {
    const primaryIndex = snapshot.primaryAction
      ? menuActions.findIndex(({ id }) => id === snapshot.primaryAction.id)
      : 0;
    setActionIndex(Math.max(0, primaryIndex));
    setActionPreview(null);
    setActionResult(null);
    setActionError(null);
    setActionOrigin("menu");
    setActionMode("menu");
  };

  const openActionPreview = async (action, target = undefined, origin = "screen") => {
    if (!action?.available) return;
    if (!actionController?.preview) {
      setActionError(
        lang === "zh" ? "当前控制台没有行动执行器。" : "No action executor is attached.",
      );
      setActionMode("error");
      return;
    }
    setActionMode("loading");
    setActionOrigin(origin);
    try {
      const preview = await actionController.preview(action.id, target);
      if (!preview.available) {
        setActionError(preview.reasonLabel ?? preview.reason);
        setActionMode("error");
        return;
      }
      setActionPreview(preview);
      const preferredChoice = target
        ? preview.choices.findIndex(({ id }) => id === target)
        : 0;
      setActionChoiceIndex(Math.max(0, preferredChoice));
      setActionMode("preview");
    } catch (error) {
      setActionError(error?.message ?? String(error));
      setActionMode("error");
    }
  };

  const executeAction = async () => {
    if (!actionPreview || !actionController?.execute) return;
    const choice = actionPreview.choices[actionChoiceIndex]?.id;
    setActionMode("loading");
    try {
      const result = await actionController.execute(actionPreview.id, choice);
      if (result.status !== "completed") {
        if (result.snapshot) setSnapshot(result.snapshot);
        setActionError(result.reasonLabel ?? result.reason);
        setActionMode("error");
        return;
      }
      if (result.snapshot) setSnapshot(result.snapshot);
      setActionResult(result);
      setActionMode("result");
    } catch (error) {
      setActionError(error?.message ?? String(error));
      setActionMode("error");
    }
  };

  const executeInlineAction = async (action, choice = undefined) => {
    if (
      !action?.available
      || !actionController?.execute
      || inlineActionLock.current
    ) {
      return;
    }
    inlineActionLock.current = true;
    try {
      const result = await actionController.execute(action.id, choice);
      if (result.snapshot) setSnapshot(result.snapshot);
      if (result.status !== "completed") {
        setActionOrigin("screen");
        setActionError(result.reasonLabel ?? result.reason);
        setActionMode("error");
      }
    } catch (error) {
      setActionOrigin("screen");
      setActionError(error?.message ?? String(error));
      setActionMode("error");
    } finally {
      inlineActionLock.current = false;
    }
  };
  useEffect(() => {
    const interval = motionInterval(motion);
    if (
      interval === null ||
      showHelp ||
      actionMode !== null ||
      !["overview", "habitat", "expedition"].includes(activeId)
    ) {
      return undefined;
    }
    const timer = setInterval(() => {
      setFrame((value) => value + 1);
    }, interval);
    return () => clearInterval(timer);
  }, [activeId, motion, showHelp, actionMode]);

  useInput((input, key) => {
    if (shareMode !== null) {
      if (shareMode === "loading") return;
      if (
        key.escape ||
        input === "q" ||
        (shareMode === "preview" && input === "n")
      ) {
        setShareMode(null);
        return;
      }
      if (shareMode === "preview" && (key.return || input === "y")) {
        void executeShare();
        return;
      }
      if (shareMode === "result" && key.return) {
        setShareMode(null);
        setSharePreview(null);
        setShareResult(null);
      }
      return;
    }
    if (actionMode !== null) {
      if (actionMode === "loading") return;
      if (
        key.escape ||
        input === "q" ||
        (actionMode === "preview" && input === "n")
      ) {
        if (["preview", "result", "error"].includes(actionMode)) {
          setActionMode(actionOrigin === "menu" ? "menu" : null);
        } else {
          setActionMode(null);
        }
        return;
      }
      if (actionMode === "menu") {
        if (input === "a") {
          setActionMode(null);
          return;
        }
        if (key.upArrow) {
          if (menuActions.length > 0) {
            setActionIndex(
              (value) => (value + menuActions.length - 1) % menuActions.length,
            );
          }
          return;
        }
        if (key.downArrow || key.tab) {
          if (menuActions.length > 0) {
            setActionIndex((value) => (value + 1) % menuActions.length);
          }
          return;
        }
        if (key.return) {
          const selectedAction = menuActions[actionIndex];
          if (
            selectedAction?.target === "expedition"
            && selectedAction.execution !== "confirm"
          ) {
            setActionMode(null);
            setActiveIndex(SCREEN_IDS.indexOf("expedition"));
          } else {
            void openActionPreview(selectedAction, undefined, "menu");
          }
          return;
        }
      }
      if (actionMode === "preview") {
        const choiceCount = actionPreview?.choices.length ?? 0;
        if (choiceCount > 0 && (key.upArrow || key.leftArrow)) {
          setActionChoiceIndex((value) => (value + choiceCount - 1) % choiceCount);
          return;
        }
        if (
          choiceCount > 0 &&
          (key.downArrow || key.rightArrow || key.tab)
        ) {
          setActionChoiceIndex((value) => (value + 1) % choiceCount);
          return;
        }
        if (key.return || input === "y") {
          void executeAction();
          return;
        }
      }
      if (actionMode === "result" && key.return) {
        setActionMode(null);
        setActionPreview(null);
        setActionResult(null);
        return;
      }
      return;
    }
    if (input === "q" && activeId === "expedition") {
      setActiveIndex(SCREEN_IDS.indexOf("overview"));
      return;
    }
    if (input === "q") {
      exit();
      return;
    }
    if (key.escape) {
      if (showHelp) {
        setShowHelp(false);
        return;
      }
      if (observationIndex !== null) {
        setObservationIndex(null);
        return;
      }
      if (replayStartFrame !== null) {
        setReplayStartFrame(null);
        return;
      }
      if (activeId === "codex" && codexMode !== "categories") {
        if (codexMode === "detail") setCodexMode("entries");
        else if (codexMode === "archive_detail") setCodexMode("archive");
        else setCodexMode("categories");
        return;
      }
      if (activeId === "laboratory" && inspectingCulture) {
        setInspectingCulture(false);
        return;
      }
      exit();
      return;
    }
    if (activeId === "habitat" && observationIndex !== null) {
      if (key.return) {
        setObservationIndex(null);
        return;
      }
      if (key.upArrow || key.leftArrow) {
        setObservationIndex(
          (value) =>
            (value + observationTargets.length - 1) %
            observationTargets.length,
        );
        return;
      }
      if (key.downArrow || key.rightArrow || key.tab) {
        setObservationIndex(
          (value) => (value + 1) % observationTargets.length,
        );
        return;
      }
    }
    if (input === "?") {
      setShowHelp((value) => !value);
      return;
    }
    if (input === "m") {
      setMotion((value) => nextMotionLevel(value));
      return;
    }
    if (input === "s" && currentShareContext()) {
      void openSharePreview();
      return;
    }
    if (input === "a") {
      openActionMenu();
      return;
    }
    if (activeId === "habitat" && input === "l") {
      setObservationIndex(null);
      setReplayStartFrame(null);
      setLaboratoryFocus(
        snapshot.laboratory.proposals.length > 0 ? "formulas" : "shelf",
      );
      setActiveIndex(SCREEN_IDS.indexOf("laboratory"));
      return;
    }
    if (activeId === "habitat" && input === "b") {
      const bondAction = actions.find(({ id }) => id === "bond");
      const cultureId = snapshot.laboratory.shelf[0]?.id;
      if (bondAction?.available && cultureId) {
        void openActionPreview(bondAction, cultureId, "screen");
      }
      return;
    }
    if (activeId === "laboratory" && input === "b") {
      const bondAction = actions.find(({ id }) => id === "bond");
      const culture = snapshot.laboratory.shelf[laboratoryCultureIndex];
      if (bondAction?.available && culture && !culture.active) {
        void openActionPreview(bondAction, culture.id, "screen");
      }
      return;
    }
    if (activeId === "codex") {
      const categories = snapshot.codex.categories;
      const category = categories[codexCategoryIndex];
      const entries = category?.entries ?? [];
      if (codexMode === "categories") {
        if (input === "h") {
          setCodexArchiveIndex(0);
          setCodexMode("archive");
          return;
        }
        if (key.upArrow) {
          setCodexCategoryIndex(
            (value) => (value + categories.length - 1) % categories.length,
          );
          setCodexEntryIndex(0);
          return;
        }
        if (key.downArrow) {
          setCodexCategoryIndex((value) => (value + 1) % categories.length);
          setCodexEntryIndex(0);
          return;
        }
        if (key.return) {
          setCodexEntryIndex(0);
          setCodexMode("entries");
          return;
        }
      } else if (codexMode === "archive") {
        const archiveCount = Math.min(
          codexArchiveSpan,
          snapshot.codex.archive.days.length,
        );
        if (input === "t") {
          setCodexArchiveSpan((value) => (value === 7 ? 30 : 7));
          setCodexArchiveIndex(0);
          return;
        }
        if (archiveCount > 0 && key.upArrow) {
          setCodexArchiveIndex(
            (value) => (value + archiveCount - 1) % archiveCount,
          );
          return;
        }
        if (archiveCount > 0 && (key.downArrow || key.tab)) {
          setCodexArchiveIndex((value) => (value + 1) % archiveCount);
          return;
        }
        if (archiveCount > 0 && key.return) {
          setCodexMode("archive_detail");
          return;
        }
      } else if (codexMode === "entries") {
        if (entries.length > 0 && key.upArrow) {
          setCodexEntryIndex(
            (value) => (value + entries.length - 1) % entries.length,
          );
          return;
        }
        if (entries.length > 0 && (key.downArrow || key.tab)) {
          setCodexEntryIndex((value) => (value + 1) % entries.length);
          return;
        }
        if (entries.length > 0 && key.return) {
          setCodexMode("detail");
          return;
        }
      } else if (codexMode === "detail" && input === "d") {
        const entry = entries[codexEntryIndex];
        const displayAction = actions.find(({ id }) => id === "curate_display");
        if (
          entry?.discovered &&
          entry.canDisplay !== false &&
          displayAction?.available
        ) {
          void openActionPreview(displayAction, entry.key, "screen");
        }
        return;
      }
    }
    if (activeId === "expedition") {
      const expedition = snapshot.expedition;
      if (!expedition.active && expedition.eligibility.available) {
        if (key.upArrow) {
          setExpeditionDestinationIndex(
            (value) =>
              (value + expedition.destinations.length - 1) %
              expedition.destinations.length,
          );
          return;
        }
        if (key.downArrow || key.tab) {
          setExpeditionDestinationIndex(
            (value) => (value + 1) % expedition.destinations.length,
          );
          return;
        }
        if (key.return) {
          const action = actions.find(({ id }) => id === "start_expedition");
          const destination = expedition.destinations[expeditionDestinationIndex];
          if (action?.available && destination) {
            void executeInlineAction(action, destination.id);
          }
          return;
        }
      }
      if (expedition.active && input === "x") {
        const action = actions.find(({ id }) => id === "abandon_expedition");
        if (action?.available) void openActionPreview(action, undefined, "screen");
        return;
      }
      if (expedition.active?.pendingChoice) {
        const optionCount = expedition.active.events.at(-1)?.options?.length ?? 0;
        const directChoice = Number(input) - 1;
        if (
          Number.isInteger(directChoice)
          && directChoice >= 0
          && directChoice < optionCount
        ) {
          setExpeditionChoiceIndex(directChoice);
          return;
        }
        if (optionCount > 0 && key.upArrow) {
          setExpeditionChoiceIndex(
            (value) => (value + optionCount - 1) % optionCount,
          );
          return;
        }
        if (optionCount > 0 && (key.downArrow || key.tab)) {
          setExpeditionChoiceIndex((value) => (value + 1) % optionCount);
          return;
        }
      }
      if (expedition.active && key.return) {
        const pendingChoice = expedition.active.pendingChoice;
        const actionId = pendingChoice
          ? "choose_expedition"
          : "advance_expedition";
        const action = actions.find(({ id }) => id === actionId);
        const choice = pendingChoice
          ? expedition.active.events.at(-1)?.options?.[expeditionChoiceIndex]?.slot
          : undefined;
        if (action?.available) {
          void executeInlineAction(action, choice);
          if (pendingChoice) setExpeditionChoiceIndex(0);
        }
        return;
      }
    }
    if (
      activeId === "overview" &&
      key.return &&
      snapshot.primaryAction?.available
    ) {
      if (snapshot.primaryAction.target === "expedition") {
        setActiveIndex(SCREEN_IDS.indexOf("expedition"));
      } else {
        void openActionPreview(snapshot.primaryAction);
      }
      return;
    }
    if (activeId === "laboratory" && key.return) {
      if (inspectingCulture) {
        setInspectingCulture(false);
        return;
      }
      if (laboratoryFocus === "shelf") {
        if (snapshot.laboratory.shelf[laboratoryCultureIndex]) {
          setInspectingCulture(true);
        }
        return;
      }
      const incubationAction = actions.find(
        ({ id, available }) => id === "incubate" && available,
      );
      if (incubationAction) {
        const target = String(
          snapshot.laboratory.proposals[laboratoryProposalIndex]?.slot ?? "1",
        );
        void openActionPreview(incubationAction, target, "screen");
        return;
      }
    }
    if (
      activeId === "laboratory" &&
      !inspectingCulture &&
      key.tab
    ) {
      const hasProposals = snapshot.laboratory.proposals.length > 0;
      const hasCultures = snapshot.laboratory.shelf.length > 0;
      if (hasProposals && hasCultures) {
        setLaboratoryFocus((value) =>
          value === "formulas" ? "shelf" : "formulas",
        );
      } else if (hasCultures) {
        setLaboratoryFocus("shelf");
      } else if (hasProposals) {
        setLaboratoryFocus("formulas");
      }
      return;
    }
    if (
      activeId === "laboratory" &&
      !inspectingCulture &&
      (key.upArrow || key.downArrow)
    ) {
      const count = laboratoryFocus === "shelf"
        ? snapshot.laboratory.shelf.length
        : snapshot.laboratory.proposals.length;
      if (count > 0) {
        const update = key.upArrow
          ? (value) => (value + count - 1) % count
          : (value) => (value + 1) % count;
        if (laboratoryFocus === "shelf") setLaboratoryCultureIndex(update);
        else setLaboratoryProposalIndex(update);
      }
      return;
    }
    if (activeId === "habitat" && ["o", "c"].includes(input)) {
      const actionId = input === "o" ? "observe_specimen" : "contact_specimen";
      const action = actions.find(({ id }) => id === actionId);
      if (action?.available) void openActionPreview(action, undefined, "screen");
      return;
    }
    if (
      activeId === "habitat" &&
      input === "r" &&
      snapshot.habitat.events.length > 0
    ) {
      setObservationIndex(null);
      setReplayStartFrame((value) => (value === null ? frame : null));
      return;
    }
    if (
      activeId === "habitat" &&
      key.return &&
      observationTargets.length > 0
    ) {
      setReplayStartFrame(null);
      setObservationIndex(0);
      return;
    }
    const directIndex = Number(input) - 1;
    if (
      Number.isInteger(directIndex) &&
      directIndex >= 0 &&
      directIndex < SCREEN_IDS.length
    ) {
      setShowHelp(false);
      setObservationIndex(null);
      setReplayStartFrame(null);
      setInspectingCulture(false);
      if (SCREEN_IDS[directIndex] === "laboratory") {
        setLaboratoryFocus(
          snapshot.laboratory.proposals.length > 0 ? "formulas" : "shelf",
        );
      }
      setActiveIndex(directIndex);
      return;
    }
    if (key.leftArrow) {
      setReplayStartFrame(null);
      setActiveIndex((value) => (value + SCREEN_IDS.length - 1) % SCREEN_IDS.length);
    } else if (key.rightArrow || key.tab) {
      setReplayStartFrame(null);
      setActiveIndex((value) => (value + 1) % SCREEN_IDS.length);
    }
  });

  const screen = {
    overview: (
      <OverviewScreen
        snapshot={snapshot}
        lang={lang}
        frame={frame}
        motion={motion}
        glitch={glitch}
        compact={compact}
      />
    ),
    habitat: (
      <HabitatScreen
        snapshot={snapshot}
        lang={lang}
        frame={frame}
        motion={motion}
        observationTargets={observationTargets}
        observationIndex={observationIndex}
        glitch={glitch}
        replay={replay}
        compact={compact}
      />
    ),
    expedition: (
      <ExpeditionScreen
        snapshot={snapshot}
        lang={lang}
        selectedDestinationIndex={expeditionDestinationIndex}
        selectedChoiceIndex={expeditionChoiceIndex}
        frame={frame}
        motion={motion}
        compact={compact}
      />
    ),
    laboratory: (
      <LaboratoryScreen
        snapshot={snapshot}
        lang={lang}
        focus={laboratoryFocus}
        selectedProposalIndex={laboratoryProposalIndex}
        selectedCultureIndex={laboratoryCultureIndex}
        inspectingCulture={inspectingCulture}
        compact={compact}
      />
    ),
    codex: (
      <CodexScreen
        snapshot={snapshot}
        lang={lang}
        mode={codexMode}
        categoryIndex={codexCategoryIndex}
        entryIndex={codexEntryIndex}
        archiveSpan={codexArchiveSpan}
        archiveIndex={codexArchiveIndex}
        compact={compact}
      />
    ),
  }[activeId];
  const zh = lang === "zh";
  const motionLabel = {
    off: zh ? "关闭" : "OFF",
    low: zh ? "低频" : "LOW",
    full: zh ? "完整" : "FULL",
  }[motion];
  const contextualFooter = activeId === "habitat"
    ? ` · Enter ${zh ? "观察" : "inspect"}${
        snapshot.habitat.events.length > 0
          ? ` · r ${zh ? "回放" : "replay"}`
          : ""
      } · s ${zh ? "分享" : "share"}`
    : activeId === "expedition" && snapshot.expedition.active
      ? ` · Enter ${zh ? "推进" : "advance"} · x ${zh ? "放弃" : "abandon"} · s ${zh ? "分享" : "share"}`
    : activeId === "expedition" && snapshot.expedition.eligibility.available
        ? ` · ↑↓ ${zh ? "目的地" : "destination"} · Enter ${zh ? "开始" : "start"}`
      : activeId === "expedition" && snapshot.expedition.latest
        ? ` · s ${zh ? "分享返航总结" : "share return summary"}`
    : activeId === "overview" && snapshot.primaryAction
      ? ` · Enter ${snapshot.primaryAction.target === "expedition" ? (zh ? "前往远征" : "open expedition") : (zh ? "处理" : "act")} · s ${zh ? "分享" : "share"}`
      : activeId === "overview"
        ? ` · s ${zh ? "分享" : "share"}`
        : activeId === "codex" && ["detail", "archive_detail"].includes(codexMode)
          ? ` · s ${zh ? "分享" : "share"}`
      : activeId === "laboratory" && inspectingCulture
        ? ` · b ${zh ? "绑定" : "bond"} · Esc ${zh ? "返回" : "back"}`
        : activeId === "laboratory" && laboratoryFocus === "shelf"
          ? ` · Enter ${zh ? "查看" : "inspect"} · b ${zh ? "绑定" : "bond"}`
          : activeId === "laboratory" &&
              actions.some(({ id, available }) => id === "incubate" && available)
            ? ` · Enter ${zh ? "培养" : "incubate"}`
        : "";
  const navigationFooter = compact
    ? `1–5 ${zh ? "区域" : "areas"} · a ${zh ? "行动" : "actions"} · ? ${zh ? "帮助" : "help"} · m ${motionLabel}`
    : `1–5 ${zh ? "区域" : "areas"} · ← → ${zh ? "切换" : "switch"} · a ${zh ? "行动" : "actions"} · ? ${zh ? "帮助" : "help"} · m ${zh ? "动态" : "motion"} ${motionLabel}`;
  const actionOverlay = {
    menu: (
      <ActionMenu
        actions={menuActions}
        unavailableCount={actions.length - menuActions.length}
        selectedIndex={actionIndex}
        lang={lang}
      />
    ),
    preview: actionPreview ? (
      <ActionPreview
        preview={actionPreview}
        selectedChoiceIndex={actionChoiceIndex}
        lang={lang}
      />
    ) : null,
    result: actionResult ? <ActionResult result={actionResult} lang={lang} /> : null,
    loading: <ActionStatus mode="loading" lang={lang} />,
    error: <ActionStatus mode="error" error={actionError} lang={lang} />,
  }[actionMode];
  const shareOverlay = shareMode === null ? null : (
    <ShareOverlay
      mode={shareMode}
      preview={sharePreview}
      result={shareResult}
      error={shareError}
      lang={lang}
    />
  );

  return (
    <Box flexDirection="column" paddingX={1} width={columns}>
      <Header snapshot={snapshot} lang={lang} />
      <Navigation
        navigation={snapshot.navigation}
        activeId={showHelp || actionMode !== null || shareMode !== null ? null : activeId}
      />
      {showHelp ? (
        <HelpOverlay lang={lang} activeId={activeId} codexMode={codexMode} />
      ) : shareOverlay ?? actionOverlay ?? screen}
      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>
          {shareMode !== null
            ? zh
              ? "本地分享 · 预览不会写入，确认后才创建 SVG"
              : "Local sharing · preview is read-only; confirmation creates the SVG"
            : actionMode !== null
            ? zh
              ? "收容协议 · 所有写入都需要明确确认"
              : "Containment protocol · every write requires confirmation"
            : `${navigationFooter}${contextualFooter}`}
        </Text>
        <Text dimColor>
          {actionMode !== null || shareMode !== null
            ? `Esc ${zh ? "返回" : "back"}`
            : `q ${zh ? "退出" : "quit"}`}
        </Text>
      </Box>
    </Box>
  );
}

export { TuiApp };
