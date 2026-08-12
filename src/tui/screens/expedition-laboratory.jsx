import React from "react";
import { Box, Text } from "ink";

import { Panel } from "../panel.jsx";
import { RARITY_COLORS } from "./chrome.jsx";

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

export { ExpeditionScreen, LaboratoryScreen };
