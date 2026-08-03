import React, { useEffect, useState } from "react";
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
    { glitch },
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

function LaboratoryScreen({ snapshot, lang, selectedProposalIndex, compact }) {
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
      <Box gap={1} marginTop={1} flexDirection={compact ? "column" : "row"}>
        <Panel
          title={`${zh ? "第" : "BATCH"} ${laboratory.batch} ${zh ? "批配方" : "FORMULAS"}`}
          color="red"
          width={compact ? undefined : "60%"}
        >
          {laboratory.proposals.length > 0 ? (
            laboratory.proposals.map((proposal, index) => (
              <Box key={proposal.id} flexDirection="column" marginBottom={1}>
                <Text bold={index === selectedProposalIndex} color={index === selectedProposalIndex ? "yellow" : "white"}>
                  {index === selectedProposalIndex ? "> " : "  "}{proposal.slot}. {proposal.type}{" "}
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
            <Text dimColor>
              {zh
                ? "原料不足。这里暂时只能培养空气。"
                : "No material. The lab is culturing air."}
            </Text>
          )}
          {laboratory.proposals.length > 0 ? (
            <Text dimColor>
              {zh ? "↑↓ / Tab 选择配方 · Enter 预览" : "↑↓ / Tab selects formula · Enter previews"}
            </Text>
          ) : null}
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

const RARITY_COLORS = {
  common: "white",
  uncommon: "cyan",
  rare: "magenta",
  epic: "yellow",
  mythic: "red",
};

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

function CodexScreen({ snapshot, lang, mode, categoryIndex, entryIndex, compact }) {
  const { codex } = snapshot;
  const zh = lang === "zh";
  const category = codex.categories[categoryIndex] ?? codex.categories[0];
  const entry = category?.entries[entryIndex] ?? null;
  if (mode === "detail" && entry) {
    return (
      <Box flexDirection="column">
        <Panel title={zh ? "条目档案" : "COLLECTION RECORD"} color={RARITY_COLORS[entry.rarity]}>
          <Text bold color={RARITY_COLORS[entry.rarity]}>
            {entry.discovered ? "◆" : "▒"} {entry.label}
          </Text>
          <Text>{entry.detail}</Text>
          <Text color={RARITY_COLORS[entry.rarity]}>
            {zh ? "稀有性" : "RARITY"}　{entry.rarityLabel}
          </Text>
          <Text>
            {zh ? "稳定编号" : "STABLE ID"}　{entry.discovered ? entry.key : `${entry.type}:locked`}
          </Text>
          <Text>
            {zh ? "发现于" : "DISCOVERED"}　{entry.discoveredAt ?? (zh ? "尚未发现" : "LOCKED")}
          </Text>
          <Text dimColor>
            {entry.discovered
              ? zh
                ? "d 陈列 · Esc 返回条目"
                : "d display · Esc returns to entries"
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
  const fixed = codex.categories.filter(({ group }) => group === "fixed");
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
          {item.group === "fixed" ? `${item.discovered} / ${item.total}` : item.discovered}
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
        {zh ? "↑↓ 选择分类 · Enter 浏览条目" : "↑↓ selects a category · Enter browses entries"}
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
    ],
    habitat: [
      ["Enter", zh ? "进入只读器官观察" : "open read-only anatomy inspection"],
      ["o / c", zh ? "今日观察 / 今日接触" : "today's observation / contact"],
      ["r", zh ? "回放最近生态事件" : "replay the latest habitat event"],
    ],
    laboratory: [
      ["↑↓ / Tab", zh ? "选择配方" : "select a formula"],
      ["Enter", zh ? "预览所选实验" : "preview the selected experiment"],
    ],
    codex: [
      ["↑↓ / Tab", zh ? "选择分类或条目" : "select category or entry"],
      ["Enter", zh ? "进入下一级" : "open the next level"],
      ["d", zh ? "陈列已发现条目" : "display a discovered entry"],
      ["Esc", zh ? `${codexMode === "categories" ? "退出" : "返回上一级"}` : codexMode === "categories" ? "exit" : "go up one level"],
    ],
  }[activeId] ?? [];
  return (
    <Panel title={zh ? "控制台快捷键" : "CONSOLE SHORTCUTS"} color="yellow">
      <Text>1–4　{zh ? "切换区域" : "switch area"}</Text>
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

function TuiApp({
  snapshot: initialSnapshot,
  lang = "zh",
  initialMotion = "low",
  actionController = null,
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
  const [codexMode, setCodexMode] = useState("categories");
  const [codexCategoryIndex, setCodexCategoryIndex] = useState(0);
  const [codexEntryIndex, setCodexEntryIndex] = useState(0);
  const [laboratoryProposalIndex, setLaboratoryProposalIndex] = useState(0);

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
  useEffect(() => {
    const interval = motionInterval(motion);
    if (
      interval === null ||
      showHelp ||
      actionMode !== null ||
      !["overview", "habitat"].includes(activeId)
    ) {
      return undefined;
    }
    const timer = setInterval(() => {
      setFrame((value) => value + 1);
    }, interval);
    return () => clearInterval(timer);
  }, [activeId, motion, showHelp, actionMode]);

  useInput((input, key) => {
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
          void openActionPreview(menuActions[actionIndex], undefined, "menu");
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
        else setCodexMode("categories");
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
    if (input === "a") {
      openActionMenu();
      return;
    }
    if (activeId === "codex") {
      const categories = snapshot.codex.categories;
      const category = categories[codexCategoryIndex];
      const entries = category?.entries ?? [];
      if (codexMode === "categories") {
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
        if (entry?.discovered && displayAction?.available) {
          void openActionPreview(displayAction, entry.key, "screen");
        }
        return;
      }
    }
    if (
      activeId === "overview" &&
      key.return &&
      snapshot.primaryAction?.available
    ) {
      void openActionPreview(snapshot.primaryAction);
      return;
    }
    if (activeId === "laboratory" && key.return) {
      const laboratoryAction =
        actions.find(({ id, available }) => id === "incubate" && available) ??
        actions.find(({ id, available }) => id === "bond" && available);
      if (laboratoryAction) {
        const target = laboratoryAction.id === "incubate"
          ? String(snapshot.laboratory.proposals[laboratoryProposalIndex]?.slot ?? "1")
          : undefined;
        void openActionPreview(laboratoryAction, target, "screen");
        return;
      }
    }
    if (
      activeId === "laboratory" &&
      snapshot.laboratory.proposals.length > 0 &&
      (key.upArrow || key.downArrow || key.tab)
    ) {
      const count = snapshot.laboratory.proposals.length;
      setLaboratoryProposalIndex((value) =>
        key.upArrow ? (value + count - 1) % count : (value + 1) % count,
      );
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
    laboratory: (
      <LaboratoryScreen
        snapshot={snapshot}
        lang={lang}
        selectedProposalIndex={laboratoryProposalIndex}
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
      }`
    : activeId === "overview" && snapshot.primaryAction
      ? ` · Enter ${zh ? "处理" : "act"}`
      : activeId === "laboratory" &&
          actions.some(
            ({ id, available }) =>
              available && ["incubate", "bond"].includes(id),
          )
        ? ` · Enter ${zh ? "执行实验" : "run protocol"}`
        : "";
  const navigationFooter = compact
    ? `1–4 ${zh ? "区域" : "areas"} · a ${zh ? "行动" : "actions"} · ? ${zh ? "帮助" : "help"} · m ${motionLabel}`
    : `1–4 ${zh ? "区域" : "areas"} · ← → ${zh ? "切换" : "switch"} · a ${zh ? "行动" : "actions"} · ? ${zh ? "帮助" : "help"} · m ${zh ? "动态" : "motion"} ${motionLabel}`;
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

  return (
    <Box flexDirection="column" paddingX={1} width={columns}>
      <Header snapshot={snapshot} lang={lang} />
      <Navigation
        navigation={snapshot.navigation}
        activeId={showHelp || actionMode !== null ? null : activeId}
      />
      {showHelp ? (
        <HelpOverlay lang={lang} activeId={activeId} codexMode={codexMode} />
      ) : actionOverlay ?? screen}
      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>
          {actionMode !== null
            ? zh
              ? "收容协议 · 所有写入都需要明确确认"
              : "Containment protocol · every write requires confirmation"
            : `${navigationFooter}${contextualFooter}`}
        </Text>
        <Text dimColor>
          {actionMode !== null
            ? `Esc ${zh ? "返回" : "back"}`
            : `q ${zh ? "退出" : "quit"}`}
        </Text>
      </Box>
    </Box>
  );
}

export { TuiApp };
