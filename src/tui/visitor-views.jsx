import React from "react";
import { Box, Text } from "ink";

import { Panel } from "./panel.jsx";

function VisitorOverlay({
  mode,
  archive,
  input,
  preview,
  result,
  error,
  selectedIndex,
  lang,
}) {
  const zh = lang === "zh";
  if (mode === "input") {
    const visible = input.length > 68 ? `…${input.slice(-67)}` : input;
    return (
      <Panel title={zh ? "粘贴 AA1 污染编码" : "PASTE AA1 POLLUTION CODE"} color="cyan">
        <Text>{visible || (zh ? "等待输入…" : "WAITING FOR INPUT…")}</Text>
        <Text color={input.length > 2048 ? "red" : undefined} dimColor={input.length <= 2048}>{input.length} / 2048</Text>
        <Text dimColor>{zh ? "Enter 校验并预览 · Backspace 删除 · Esc 返回" : "Enter validates and previews · Backspace deletes · Esc returns"}</Text>
      </Panel>
    );
  }
  if (mode === "preview" && preview) {
    return (
      <Panel title={preview.title} color="magenta">
        <Text>{preview.summary}</Text>
        <Text>{zh ? "接触类型" : "CONTACT TYPE"} · {preview.encounter.typeLabel}</Text>
        <Text>{zh ? "外来标本" : "VISITOR"} · #{preview.encounter.visitorId} · {preview.encounter.visitorForm}</Text>
        <Text>{zh ? "混种标本" : "HYBRID"} · #{preview.encounter.hybridId} · {preview.encounter.hybridForm}</Text>
        <Text color="yellow">{preview.warning}</Text>
        <Text dimColor>{zh ? "Enter / y 确认接待 · Esc / n 取消" : "Enter / y confirms intake · Esc / n cancels"}</Text>
      </Panel>
    );
  }
  if (mode === "loading") {
    return <Panel title={zh ? "访客接待台" : "VISITOR INTAKE"} color="cyan"><Text>{zh ? "正在处理本地访客档案…" : "PROCESSING LOCAL VISITOR FILE…"}</Text></Panel>;
  }
  if (mode === "error") {
    return (
      <Panel title={zh ? "访客操作失败" : "VISITOR OPERATION FAILED"} color="red">
        <Text color="red">{error}</Text>
        <Text dimColor>{zh ? "Enter 返回输入 · Esc 返回档案" : "Enter returns to input · Esc returns to archive"}</Text>
      </Panel>
    );
  }
  if (mode === "result") {
    return (
      <Panel title={zh ? "访客操作完成" : "VISITOR OPERATION COMPLETE"} color="green">
        <Text color="green">{result?.message}</Text>
        <Text dimColor>{zh ? "Enter 返回访客档案" : "Enter returns to visitor archive"}</Text>
      </Panel>
    );
  }
  const visitors = archive?.visitors ?? [];
  const active = visitors.find(({ status }) => status === "active");
  return (
    <Panel title={zh ? "访客接待台" : "VISITOR INTAKE DESK"} color="cyan">
      <Text bold>{zh ? "当前访客" : "ACTIVE VISITOR"} · {active ? `#${active.id}` : (zh ? "空置" : "VACANT")}</Text>
      <Box flexDirection="column" marginTop={1}>
        {visitors.length === 0 ? (
          <Text dimColor>{zh ? "尚无外来标本。" : "NO FOREIGN SPECIMENS."}</Text>
        ) : visitors.map((visitor, index) => (
          <Text key={visitor.id} color={visitor.status === "active" ? "green" : index === selectedIndex ? "yellow" : undefined}>
            {index === selectedIndex ? ">" : " "} #{visitor.id} · {visitor.label ?? visitor.formId} · {visitor.status === "active" ? (zh ? "入住中" : "ACTIVE") : (zh ? "已归档" : "ARCHIVED")}
          </Text>
        ))}
      </Box>
      <Text dimColor>{zh ? "i 粘贴污染编码 · ↑↓ 选择 · Enter 接待 · x 送离 · Esc 返回" : "i pastes a code · ↑↓ selects · Enter hosts · x releases · Esc returns"}</Text>
    </Panel>
  );
}

export { VisitorOverlay };
