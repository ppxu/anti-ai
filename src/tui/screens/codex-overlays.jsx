import React from "react";
import { Box, Text } from "ink";

import { Panel } from "../panel.jsx";
import { CabinetSlots, ProgressBar, RARITY_COLORS } from "./chrome.jsx";

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
        <Panel title={entry.type === "collectionSet" ? zh ? "病理星图" : "PATHOLOGY CONSTELLATION" : zh ? "条目档案" : "COLLECTION RECORD"} color={RARITY_COLORS[entry.rarity]}>
          <Text bold color={RARITY_COLORS[entry.rarity]}>
            {entry.discovered ? "◆" : "▒"} {entry.label}
          </Text>
          <Text>{entry.detail}</Text>
          {entry.type === "collectionSet" ? (
            <>
              <Text>
                {zh ? "路线 / 阶段" : "ROUTE / PHASE"}　{{
                  pollution: zh ? "污染" : "POLLUTION",
                  clarity: zh ? "清醒" : "CLARITY",
                  paradox: zh ? "悖论" : "PARADOX",
                }[entry.routeId]} · {{
                  unknown: zh ? "未形成" : "UNFORMED",
                  started: zh ? "已起病" : "STARTED",
                  near: zh ? "接近确诊" : "NEAR DIAGNOSIS",
                  complete: zh ? "已确诊" : "DIAGNOSED",
                }[entry.phase]}
              </Text>
              <Text color={RARITY_COLORS[entry.rarity]}>
                {zh ? "进度" : "PROGRESS"}　{entry.progress.completed} / {entry.progress.total}
              </Text>
              {entry.hidden && !entry.revealed ? (
                <Text color="gray">
                  {zh ? "揭示进度" : "REVEAL PROGRESS"}　{entry.revealProgress.completed} / {entry.revealProgress.total}
                </Text>
              ) : null}
              <Text dimColor>{entry.phaseNote}</Text>
              <Text bold>{zh ? "证据节点" : "EVIDENCE NODES"}</Text>
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
    if (category.id === "collectionSets") {
      const routePanels = [
        ["pollution", zh ? "污染" : "POLLUTION", "red"],
        ["clarity", zh ? "清醒" : "CLARITY", "cyan"],
        ["paradox", zh ? "悖论" : "PARADOX", "yellow"],
      ];
      return (
        <Box flexDirection="column">
          <Panel title={zh ? "病理星图" : "PATHOLOGY CONSTELLATIONS"} color="magenta">
            <Box gap={1} flexDirection={compact ? "column" : "row"}>
              {routePanels.map(([routeId, routeLabel, routeColor]) => {
                const routeEntries = category.entries.filter((candidate) => candidate.routeId === routeId);
                return (
                  <Panel
                    key={routeId}
                    title={`${routeLabel} · ${routeEntries.filter((candidate) => candidate.completed).length}/4`}
                    color={routeColor}
                    width={compact ? undefined : "33%"}
                  >
                    {routeEntries.map((candidate) => {
                      const index = category.entries.indexOf(candidate);
                      const selected = index === entryIndex;
                      return (
                        <Text
                          key={candidate.key}
                          bold={selected}
                          color={selected ? "yellow" : RARITY_COLORS[candidate.rarity]}
                        >
                          {selected ? "> " : "  "}{candidate.completed ? "◆" : candidate.revealed ? "◇" : "▒"} {candidate.name} · {candidate.progress.completed}/{candidate.progress.total}
                        </Text>
                      );
                    })}
                  </Panel>
                );
              })}
            </Box>
            {entry ? (
              <>
                <Text bold color={RARITY_COLORS[entry.rarity]}>
                  {zh ? "重点诊断" : "FOCUSED DIAGNOSIS"} · {entry.name}
                </Text>
                <Text dimColor>{entry.phaseNote}</Text>
              </>
            ) : null}
            <Text dimColor>
              {zh ? "↑↓ / Tab 选择 · Enter 查看节点 · Esc 返回分类" : "↑↓ / Tab select · Enter opens nodes · Esc returns to categories"}
            </Text>
          </Panel>
        </Box>
      );
    }
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
      ["e", zh ? "展开或收起完整档案" : "expand or collapse the full file"],
      ["s", zh ? "导出每日收容播报" : "export the daily containment broadcast"],
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

export { CodexScreen, HelpOverlay, ShareOverlay };
