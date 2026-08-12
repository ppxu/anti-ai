import React from "react";
import { Box, Text } from "ink";

import { Panel } from "./panel.jsx";

function ActionMenu({ actions, unavailableCount = 0, selectedIndex, lang }) {
  const zh = lang === "zh";
  return (
    <Panel
      title={zh ? "行动中心" : "ACTION CENTER"}
      color="yellow"
    >
      <Text bold color="green">
        {zh ? "立即可用" : "AVAILABLE NOW"} · {actions.length}
      </Text>
      {actions.map((action, index) => {
        const selected = index === selectedIndex;
        return (
          <Box key={action.id} flexDirection="column" marginBottom={1}>
            <Text
              bold={selected}
              color={selected ? "yellow" : "white"}
            >
              {selected ? "> " : "  "}
              {action.label}
            </Text>
          </Box>
        );
      })}
      {actions.length === 0 ? (
        <Text dimColor>
          {zh ? "当前没有需要处理的协议。观察本身不需要制造事故。" : "No protocol needs attention. Observation does not require an incident."}
        </Text>
      ) : null}
      {unavailableCount > 0 ? (
        <Text dimColor>
          {zh
            ? `${unavailableCount} 项当前不可用 · 已折叠`
            : `${unavailableCount} unavailable · collapsed`}
        </Text>
      ) : null}
      <Text dimColor>
        {zh
          ? "Enter 影响预览 · ↑↓ / Tab 选择 · Esc 返回"
          : "Enter previews impact · ↑↓ / Tab selects · Esc returns"}
      </Text>
    </Panel>
  );
}

function impactLabel(key, lang) {
  const labels = {
    date: ["日期", "DATE"],
    totalTokens: ["本次扫描 Token", "SCANNED TOKENS"],
    requests: ["请求", "REQUESTS"],
    activeSources: ["有记录来源", "ACTIVE SOURCES"],
    usageBand: ["使用带", "USAGE BAND"],
    ecologyGains: ["生态变化", "ECOLOGY DRIFT"],
    caseId: ["病例", "CASE"],
    generation: ["世代", "GENERATION"],
    batch: ["批次", "BATCH"],
    cultures: ["可选培养物", "AVAILABLE CULTURES"],
    incidentId: ["事故", "INCIDENT"],
    delayExperienceDays: ["延迟阅历日", "DELAYED EXPERIENCE DAYS"],
    dailyLimit: ["每日额度", "DAILY LIMIT"],
    numericRewards: ["数值奖励", "NUMERIC REWARDS"],
    displaySlots: ["展示位", "DISPLAY SLOTS"],
    durationOptions: ["可选时长", "DURATION OPTIONS"],
  };
  return labels[key]?.[lang === "zh" ? 0 : 1] ?? key;
}

function impactValue(value, lang) {
  if (typeof value === "number") return value.toLocaleString("en-US");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, amount]) => amount > 0)
      .map(([key, amount]) => `${key} +${amount}`)
      .join(" · ") || (lang === "zh" ? "无" : "NONE");
  }
  return String(value);
}

function ActionPreview({ preview, selectedChoiceIndex, lang }) {
  const zh = lang === "zh";
  return (
    <Panel
      title={`${zh ? "影响预览" : "IMPACT PREVIEW"} · ${preview.title}`}
      color="yellow"
    >
      <Text>{preview.summary}</Text>
      {Object.entries(preview.impact ?? {}).map(([key, value]) => (
        <Text key={key}>
          <Text color="cyan">{`${impactLabel(key, lang)}:`}</Text>
          {` ${impactValue(value, lang)}`}
        </Text>
      ))}
      {preview.choices.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          {preview.choices.map((choice, index) => (
            <Box key={choice.id} flexDirection="column" marginBottom={1}>
              <Text
                bold={index === selectedChoiceIndex}
                color={index === selectedChoiceIndex ? "yellow" : "white"}
              >
                {index === selectedChoiceIndex ? "> " : "  "}
                {choice.id}. {choice.label}
              </Text>
              <Text dimColor>{choice.detail}</Text>
            </Box>
          ))}
        </Box>
      ) : null}
      <Box marginTop={1} flexDirection="column">
        <Text color={preview.irreversible ? "red" : "yellow"}>
          {preview.warning}
        </Text>
        <Text dimColor>
          {preview.choices.length > 0
            ? zh
              ? "方向键选择 · Enter / y 确认 · Esc / n 取消"
              : "Arrows select · Enter / y confirms · Esc / n cancels"
            : zh
              ? "Enter / y 确认 · Esc / n 取消"
              : "Enter / y confirms · Esc / n cancels"}
        </Text>
      </Box>
    </Panel>
  );
}

function ActionResult({ result, lang }) {
  const zh = lang === "zh";
  return (
    <Panel title={zh ? "协议执行完成" : "PROTOCOL COMPLETED"} color="green">
      <Text bold color="green">{result.message}</Text>
      <Text dimColor>
        {zh
          ? "档案已安全刷新 · Enter 返回控制台"
          : "The file was safely refreshed · Enter returns to console"}
      </Text>
    </Panel>
  );
}

function ActionStatus({ mode, error, lang }) {
  const zh = lang === "zh";
  return (
    <Panel
      title={zh ? "收容协议" : "CONTAINMENT PROTOCOL"}
      color={mode === "error" ? "red" : "yellow"}
    >
      <Text color={mode === "error" ? "red" : "yellow"}>
        {mode === "error"
          ? error
          : zh
            ? "正在核对本地档案……"
            : "Checking the local file…"}
      </Text>
      {mode === "error" ? (
        <Text dimColor>
          {zh ? "Esc 返回行动中心" : "Esc returns to the action center"}
        </Text>
      ) : null}
    </Panel>
  );
}

export { ActionMenu, ActionPreview, ActionResult, ActionStatus };
