import React, { useEffect, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";

import {
  deriveCompanionFrame,
  deriveEventReplay,
  deriveObservationTargets,
  deriveSpecimenFrame,
  isGlitchFrame,
  motionInterval,
  nextMotionLevel,
} from "../application/tui-motion.mjs";

const SCREEN_IDS = ["overview", "habitat", "laboratory", "codex"];

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

function Panel({ title, color = "gray", children, ...props }) {
  return (
    <Box
      borderStyle="round"
      borderColor={color}
      flexDirection="column"
      paddingX={1}
      {...props}
    >
      <Text bold color={color}>
        {title}
      </Text>
      {children}
    </Box>
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
          {zh ? "只读" : "READ ONLY"} · {snapshot.date}
        </Text>
      </Box>
      <Text dimColor>
        {zh
          ? `已结算档案：${snapshot.lastSettledDate ?? "尚无"} · 页面不会扫描日志或推进成长`
          : `Last settled: ${snapshot.lastSettledDate ?? "none"} · Browsing never scans logs or advances growth`}
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

function OverviewScreen({ snapshot, lang, frame, motion, glitch }) {
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
  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Panel
          title={zh ? "当前异变体" : "CURRENT SPECIMEN"}
          color={ecologyColor}
          width="48%"
        >
          <Text color={glitch ? "magenta" : ecologyColor}>
            {deriveSpecimenFrame(overview.art, frame, motion, {
              glitch,
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
            {zh ? "污染 / 清醒" : "Pollution / Clarity"}　
            {overview.ecology.pollution} / {overview.ecology.clarity}
          </Text>
        </Panel>
      </Box>
      <Panel
        title={zh ? "建议下一步" : "RECOMMENDED NEXT"}
        color="yellow"
        marginTop={1}
      >
        {overview.actions.map((action, index) => (
          <Box key={action.id}>
            <Text color="yellow">{`${index + 1}. `}</Text>
            <Text>{action.label}</Text>
            <Text dimColor>{`  ${action.command}`}</Text>
          </Box>
        ))}
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
}) {
  const { habitat } = snapshot;
  const zh = lang === "zh";
  const observation = observationTargets[observationIndex] ?? null;
  const specimenFrame = deriveSpecimenFrame(
    habitat.specimen.art,
    frame,
    motion,
    { glitch },
  );
  return (
    <Box flexDirection="column">
      <Panel title={zh ? "生态舱状态" : "HABITAT STATUS"} color="green">
        <Box gap={2}>
          <Box flexDirection="column" width="50%">
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
                  {habitat.companion.cohabitationDays}d
                </Text>
              </>
            ) : (
              <Text dimColor>
                {zh
                  ? "空置 · 先在实验室培养并绑定一只事故"
                  : "VACANT · culture and bond an accident in the lab"}
              </Text>
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
      <Box gap={1} marginTop={1}>
        <Panel
          title={zh ? "共生关系" : "RELATIONSHIP"}
          color="cyan"
          width="50%"
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
            {habitat.cadence.daysUntilNext}d
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
    </Box>
  );
}

function LaboratoryScreen({ snapshot, lang }) {
  const { laboratory } = snapshot;
  const zh = lang === "zh";
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
      </Panel>
      <Box gap={1} marginTop={1}>
        <Panel
          title={`${zh ? "第" : "BATCH"} ${laboratory.batch} ${zh ? "批配方" : "FORMULAS"}`}
          color="red"
          width="60%"
        >
          {laboratory.proposals.length > 0 ? (
            laboratory.proposals.map((proposal) => (
              <Box key={proposal.id} flexDirection="column" marginBottom={1}>
                <Text bold>
                  {proposal.slot}. {proposal.type}{" "}
                  <Text color="yellow">{proposal.rarity.toUpperCase()}</Text>
                </Text>
                <Text dimColor>
                  {proposal.ecology} / {proposal.pathology} ·{" "}
                  {proposal.complication}
                </Text>
              </Box>
            ))
          ) : (
            <Text dimColor>
              {zh
                ? "原料不足。这里暂时只能培养空气。"
                : "No material. The lab is culturing air."}
            </Text>
          )}
        </Panel>
        <Panel
          title={zh ? "最近封存" : "RECENT CULTURES"}
          color="green"
          flexGrow={1}
        >
          {laboratory.shelf.length > 0 ? (
            laboratory.shelf.map((culture) => (
              <Text key={culture.id}>
                #{culture.id} · {culture.type}
              </Text>
            ))
          ) : (
            <Text dimColor>{zh ? "培养架空空如也。" : "The shelf is empty."}</Text>
          )}
        </Panel>
      </Box>
    </Box>
  );
}

function CodexScreen({ snapshot, lang }) {
  const { codex } = snapshot;
  const zh = lang === "zh";
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
      <Box gap={1} marginTop={1}>
        <Panel
          title={zh ? "固定分类" : "FIXED COLLECTIONS"}
          color="cyan"
          width="50%"
        >
          {codex.categories.map((category) => (
            <Box key={category.id} justifyContent="space-between">
              <Text>{category.label}</Text>
              <Text color="cyan">
                {category.discovered} / {category.total}
              </Text>
            </Box>
          ))}
        </Panel>
        <Panel
          title={zh ? "动态档案" : "DYNAMIC FILES"}
          color="green"
          flexGrow={1}
        >
          {codex.dynamic.map((category) => (
            <Box key={category.id} justifyContent="space-between">
              <Text>{category.label}</Text>
              <Text color="green">{category.discovered}</Text>
            </Box>
          ))}
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
    </Box>
  );
}

function HelpOverlay({ lang }) {
  const zh = lang === "zh";
  return (
    <Panel title={zh ? "控制台快捷键" : "CONSOLE SHORTCUTS"} color="yellow">
      <Text>1–4　{zh ? "切换区域" : "switch area"}</Text>
      <Text>← →　{zh ? "切换相邻区域" : "switch adjacent area"}</Text>
      <Text>m　　{zh ? "切换动态档位" : "cycle motion level"}</Text>
      <Text>Enter　{zh ? "在生态舱进入器官观察" : "inspect anatomy in Habitat"}</Text>
      <Text>r　　{zh ? "在生态舱回放最近事件" : "replay the latest Habitat event"}</Text>
      <Text>?　　{zh ? "关闭本说明" : "close this help"}</Text>
      <Text>
        esc　{zh ? "返回上层；再次按下退出" : "go back; press again to exit"}
      </Text>
      <Text>q　　{zh ? "退出，不惊动标本" : "exit without disturbing specimens"}</Text>
    </Panel>
  );
}

function TuiApp({ snapshot, lang = "zh", initialMotion = "low" }) {
  const { exit } = useApp();
  const [activeIndex, setActiveIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [motion, setMotion] = useState(initialMotion);
  const [frame, setFrame] = useState(0);
  const [observationIndex, setObservationIndex] = useState(null);
  const [replayStartFrame, setReplayStartFrame] = useState(null);

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
  useEffect(() => {
    const interval = motionInterval(motion);
    if (
      interval === null ||
      showHelp ||
      !["overview", "habitat"].includes(activeId)
    ) {
      return undefined;
    }
    const timer = setInterval(() => {
      setFrame((value) => value + 1);
    }, interval);
    return () => clearInterval(timer);
  }, [activeId, motion, showHelp]);

  useInput((input, key) => {
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
    if (Number.isInteger(directIndex) && directIndex >= 0 && directIndex < 4) {
      setShowHelp(false);
      setObservationIndex(null);
      setReplayStartFrame(null);
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
      />
    ),
    laboratory: <LaboratoryScreen snapshot={snapshot} lang={lang} />,
    codex: <CodexScreen snapshot={snapshot} lang={lang} />,
  }[activeId];
  const zh = lang === "zh";
  const motionLabel = {
    off: zh ? "关闭" : "OFF",
    low: zh ? "低频" : "LOW",
    full: zh ? "完整" : "FULL",
  }[motion];

  return (
    <Box flexDirection="column" paddingX={1}>
      <Header snapshot={snapshot} lang={lang} />
      <Navigation navigation={snapshot.navigation} activeId={activeId} />
      {showHelp ? <HelpOverlay lang={lang} /> : screen}
      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>
          1–4 {zh ? "区域" : "areas"} · ← → {zh ? "切换" : "switch"} · ?{" "}
          {zh ? "帮助" : "help"} · m {zh ? "动态" : "motion"} {motionLabel}
          {activeId === "habitat"
            ? ` · Enter ${zh ? "观察" : "inspect"}${
                snapshot.habitat.events.length > 0
                  ? ` · r ${zh ? "回放" : "replay"}`
                  : ""
              }`
            : ""}
        </Text>
        <Text dimColor>q {zh ? "退出" : "quit"}</Text>
      </Box>
    </Box>
  );
}

export { TuiApp };
