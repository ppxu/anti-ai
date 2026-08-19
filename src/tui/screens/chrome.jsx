import React from "react";
import { Box, Text } from "ink";

import { Panel } from "../panel.jsx";

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

function Header({ snapshot, lang, dense = false }) {
  const zh = lang === "zh";
  const settlement = snapshot.overview.status === "awaiting"
    ? zh ? "待结算" : "UNSETTLED"
    : zh ? "已结算" : "SETTLED";
  if (dense) {
    return (
      <Box justifyContent="space-between">
        <Text bold color="red">
          {zh ? "ANTI-AI · 收容控制台" : "ANTI-AI · CONTAINMENT CONSOLE"}
        </Text>
        <Text dimColor>{snapshot.date} · {settlement}</Text>
      </Box>
    );
  }
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

function Navigation({ navigation, activeId, dense = false }) {
  return (
    <Box gap={dense ? 1 : 2} marginY={dense ? 0 : 1}>
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

const RARITY_COLORS = {
  common: "white",
  uncommon: "cyan",
  rare: "magenta",
  epic: "yellow",
  mythic: "red",
  legendary: "red",
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

export { RARITY_COLORS, ProgressBar, Header, Navigation, CabinetSlots };
