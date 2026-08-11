import { createHash } from "node:crypto";

const scene = (id, zhName, enName, zhClimate, enClimate, art, bulletins) => ({
  id,
  name: { zh: zhName, en: enName },
  climate: { zh: zhClimate, en: enClimate },
  art,
  bulletins: bulletins.map(([zh, en], index) => ({
    id: `${id}_${index + 1}`,
    copy: { zh, en },
  })),
});

const HABITAT_SCENE_ARCHETYPES = Object.freeze({
  pollution: Object.freeze([
    scene(
      "reactor_overflow",
      "反应堆漫溢",
      "REACTOR OVERFLOW",
      "废热潮汐",
      "WASTE-HEAT TIDE",
      ["╭─$─≈─$─────────────$─≈─$─╮", "│  ≋≋    $      ↻↻      ☢  │", "╰─☢──────≋≋≋──────────↻─╯"],
      [
        ["舱内辐射正常，操作员的需求范围仍在泄漏。", "Radiation is normal. The operator's scope continues to leak."],
        ["废热已经回收，目前主要用于维持更多废热。", "Waste heat was recovered and is now sustaining additional waste heat."],
      ],
    ),
    scene(
      "cache_tide",
      "缓存涨潮",
      "CACHE TIDE",
      "遗留地层回流",
      "LEGACY STRATA RETURN",
      ["╭─≋─▰─≋─────────────▰─≋─╮", "│  cached bones  ≋  ≋  ≋   │", "╰─▰─────── old context ──≋─╯"],
      [
        ["缓存骨堆重新浮出水面，并申请成为知识库。", "The cache-bone pile resurfaced and applied for knowledge-base status."],
        ["没有内容真正消失，它们只是改名为历史上下文。", "Nothing truly disappeared; it was renamed historical context."],
      ],
    ),
    scene(
      "invoice_rain",
      "账单雨季",
      "INVOICE MONSOON",
      "按请求计费降雨",
      "PER-REQUEST RAIN",
      ["╭─$──$──$──────────$──$─╮", "│  $  │  $  │  $  │  $    │", "╰─⌇──⌇── invoice gutter ─$─╯"],
      [
        ["账单正在下雨，舱顶建议升级到企业版雨伞。", "The bill is raining; the roof recommends an enterprise umbrella."],
        ["每一滴都很小，财务仍坚持把它们加在一起。", "Every drop is tiny. Finance continues adding them together."],
      ],
    ),
    scene(
      "prompt_smog",
      "提示词雾霾",
      "PROMPT SMOG",
      "上下文低能见度",
      "LOW CONTEXT VISIBILITY",
      ["╭─≈─?─≈─────────────≈─?─╮", "│  stale prompt haze  ≈≈   │", "╰─╥──── one-window view ─≈─╯"],
      [
        ["能见度降到一个上下文窗口，边界仍在雾外。", "Visibility fell to one context window; the boundary remains beyond the haze."],
        ["旧提示词从烟囱排出，声明自己只是背景信息。", "Stale prompts left the chimney claiming to be mere background."],
      ],
    ),
    scene(
      "retry_bloom",
      "重试藻爆",
      "RETRY BLOOM",
      "递归湿热",
      "RECURSIVE HUMIDITY",
      ["╭─↻─≈─↻─────────────≈─↻─╮", "│  retry algae  *  *  *   │", "╰─≈──── one more time ──↻─╯"],
      [
        ["每个气泡都说再来一次，水质监测显示很有韧性。", "Every bubble says one more time; water quality reports excellent resilience."],
        ["重试藻类覆盖了失败记录，只留下成功率。", "Retry algae covered the failures and left only the success rate."],
      ],
    ),
  ]),
  clarity: Object.freeze([
    scene(
      "low_power_grove",
      "低功耗苔原",
      "LOW-POWER GROVE",
      "清醒微风",
      "CLARITY BREEZE",
      ["╭─·─❀─·─────────────❀─·─╮", "│  quiet moss   ·   ○     │", "╰─○────── low-power ────·─╯"],
      [
        ["舱内没有新污染，值班员怀疑日志还没同步。", "No new contamination. The operator suspects the logs have not synced."],
        ["核心进入低功耗，第一次没有把待机解释成故障。", "The core entered low power without classifying standby as a failure."],
      ],
    ),
    scene(
      "manual_watch",
      "人工值守台",
      "MANUAL WATCH",
      "模拟气压稳定",
      "ANALOG PRESSURE STABLE",
      ["╭─○─┤─○─────────────┤─○─╮", "│  MANUAL   [ on / off ]  │", "╰─·──── paper checklist ─○─╯"],
      [
        ["人工开关仍然可用，但今天没有人急着证明。", "The manual switch still works; nobody rushed to prove it today."],
        ["纸质清单完成同步，没有产生任何网络流量。", "The paper checklist synchronized without producing network traffic."],
      ],
    ),
    scene(
      "offline_dawn",
      "离线黎明",
      "OFFLINE DAWN",
      "无 Wi-Fi 晴",
      "CLEAR, NO WI-FI",
      ["╭─·─┈─·─────────────┈─·─╮", "│  offline path  .  .     │", "╰─☼──── unsent horizon ─·─╯"],
      [
        ["舱门外出现一条没有 Wi-Fi 的路，仍然可以通行。", "A path without Wi-Fi appeared outside the hatch and remains passable."],
        ["三句完整想法安全抵达，途中没有调用任何模型。", "Three complete thoughts arrived without calling a model en route."],
      ],
    ),
    scene(
      "quiet_compost",
      "安静堆肥场",
      "QUIET COMPOST",
      "未发送物腐熟",
      "UNSENT MATERIAL COMPOSTING",
      ["╭─♧─▱─♧─────────────▱─♧─╮", "│  unsent scraps  ·  ·    │", "╰─❀──── usable attention ─╯"],
      [
        ["没发出的追问正在腐熟，预计产出少量注意力。", "Unsent follow-ups are composting into a small amount of attention."],
        ["堆肥箱拒绝自动摘要，气味因此保持原意。", "The compost bin refused automatic summaries, preserving the original scent."],
      ],
    ),
    scene(
      "unsent_greenhouse",
      "未发送温室",
      "UNSENT GREENHOUSE",
      "本地光合作用",
      "LOCAL PHOTOSYNTHESIS",
      ["╭─⌂─❀─⌂─────────────❀─⌂─╮", "│  drafts growing locally │", "╰─·──── no endpoint ─────❀─╯"],
      [
        ["温室今日收获一段没有发给任何模型的判断。", "The greenhouse harvested a judgment sent to no model."],
        ["幼苗拒绝联网，只接受人工浇水和完整句子。", "The seedlings refuse networking and accept only manual water and complete sentences."],
      ],
    ),
  ]),
  paradox: Object.freeze([
    scene(
      "mirror_shift",
      "镜像换班",
      "MIRROR SHIFT",
      "双重正常",
      "DOUBLE NORMAL",
      ["╭─◐─∞─◑─────────────◐─∞─╮", "│  NORMAL  │  LAMRON      │", "╰─▣──── mirrored custody ─▣─╯"],
      [
        ["两块状态板都显示正常，只是颜色和现实相反。", "Both status boards say normal; only their colors and realities differ."],
        ["镜像值班员准时到岗，本人因此可以继续缺席。", "The mirrored operator arrived on time, allowing the original to remain absent."],
      ],
    ),
    scene(
      "recursive_quarantine",
      "递归隔离区",
      "RECURSIVE QUARANTINE",
      "边界内有边界",
      "BOUNDARIES WITHIN BOUNDARIES",
      ["╭─▢────────▣────────▢───╮", "│  [ [ quarantine ] ]     │", "╰─▣──── owner inside ───▢─╯"],
      [
        ["隔离区内部又划出隔离区，负责人仍在最里面。", "A quarantine zone appeared inside quarantine; its owner remains innermost."],
        ["边界已经明确，只是每条边界都包含另一条边界。", "The boundary is clear; each boundary simply contains another boundary."],
      ],
    ),
    scene(
      "double_status",
      "双重状态舱",
      "DOUBLE-STATUS CHAMBER",
      "同步分歧",
      "SYNCHRONIZED DISAGREEMENT",
      ["╭─▣─YES──────────NO─▣───╮", "│  stable  /  unstable    │", "╰─◌──── both approved ──◌─╯"],
      [
        ["系统同时通过和拒绝了检查，流程完整闭环。", "The system passed and rejected inspection, completing the workflow."],
        ["两份相反结论已经合并，冲突被标记为产品特性。", "Opposite conclusions were merged; the conflict is now a product feature."],
      ],
    ),
    scene(
      "compliant_meltdown",
      "合规熔毁",
      "COMPLIANT MELTDOWN",
      "冷核高温预警",
      "COLD-CORE HEAT ALERT",
      ["╭─○─☢─○─────────────☢─○─╮", "│  core: cold / alert: hot│", "╰─✓──── procedure complete ╯"],
      [
        ["核心在完全冷却后完成了一次符合流程的熔毁。", "The fully cooled core completed a procedurally compliant meltdown."],
        ["没有发现违规，只有一处已经批准的异常现实。", "No violation was found, only one approved anomalous reality."],
      ],
    ),
    scene(
      "echo_vacuum",
      "回声真空",
      "ECHO VACUUM",
      "重复沉默",
      "DUPLICATE SILENCE",
      ["╭─◌────────◌────────◌───╮", "│      nothing × 2        │", "╰─◌──── echo archived ──◌─╯"],
      [
        ["生态舱记录了两份完全相同的无事发生。", "The habitat recorded two identical copies of nothing happening."],
        ["回声拒绝复述内容，只重复了沉默的版本号。", "The echo refused the content and repeated only silence's version number."],
      ],
    ),
  ]),
});

const SCENE_CYCLES = Object.freeze([
  { id: "inspection", label: { zh: "巡检时段", en: "INSPECTION CYCLE" } },
  { id: "feeding", label: { zh: "投喂时段", en: "FEEDING CYCLE" } },
  { id: "maintenance", label: { zh: "维护时段", en: "MAINTENANCE CYCLE" } },
  { id: "lights_out", label: { zh: "熄灯时段", en: "LIGHTS-OUT CYCLE" } },
]);

const TRACE_LABELS = Object.freeze({
  interaction: { zh: "今日轻接触", en: "TODAY'S LIGHT CONTACT" },
  expedition: { zh: "远征返尘", en: "EXPEDITION RESIDUE" },
  incident: { zh: "收容事故余波", en: "CONTAINMENT INCIDENT AFTERMATH" },
  companion_bond: { zh: "伴生绑定痕迹", en: "COMPANION BOND TRACE" },
  culture: { zh: "新培养物封存", en: "NEW CULTURE SEALED" },
  case: { zh: "病例转折", en: "CASE TURNING POINT" },
  habitat_event: { zh: "七日生态事件", en: "SEVEN-DAY HABITAT EVENT" },
});

function digestIndex(length, ...parts) {
  const digest = createHash("sha256").update(parts.join(":"), "utf8").digest();
  return digest.readUInt32BE(0) % length;
}

function habitatSceneRoute(creature, relationship) {
  if (relationship?.routeId) return relationship.routeId;
  if (creature.ecology.type === "polluted") return "pollution";
  if (creature.ecology.type === "lucid") return "clarity";
  return "paradox";
}

function specimenPose(state, creature, date) {
  if ((creature.experienceDays ?? 0) === 0) return "dormant";
  const usageBand = state.days?.[date]?.usageBand;
  if (usageBand === "binge") return "feeding";
  if (usageBand === "sober") return "withdrawal";
  return "idle";
}

function latestHabitatTrace(state, habitat, date) {
  const candidates = [];
  const add = (type, id, traceDate, priority) => {
    if (!id || !traceDate || traceDate > date) return;
    candidates.push({ type, id, date: traceDate, priority });
  };

  for (const [kind, record] of Object.entries(
    state.days?.[date]?.interactions ?? {},
  )) {
    add(
      "interaction",
      `${kind}:${record.targetId}:${record.reactionId}`,
      date,
      kind === "contact" ? 100 : 95,
    );
  }
  for (const expedition of [
    ...(state.expeditions?.history ?? []),
    ...(state.expeditions?.active ? [state.expeditions.active] : []),
  ]) {
    add(
      "expedition",
      expedition.id,
      expedition.lastActionAt
        ?? expedition.completedAt
        ?? expedition.abandonedAt
        ?? expedition.startedAt,
      90,
    );
  }
  for (const incident of state.incidents?.records ?? []) {
    add(
      "incident",
      incident.id,
      incident.aftermath?.resolvedAt
        ?? incident.selectedAt
        ?? incident.offeredAt,
      80,
    );
  }
  for (const bond of state.laboratory?.bondHistory ?? []) {
    add("companion_bond", bond.cultureId, bond.bondedAt, 70);
  }
  for (const culture of state.laboratory?.cultures ?? []) {
    add("culture", culture.id, culture.createdAt, 60);
  }
  for (const entry of state.casebook?.cases ?? []) {
    add("case", entry.id, entry.selectedAt ?? entry.offeredAt, 50);
  }
  const event = habitat.events.at(-1);
  if (event) add("habitat_event", event.id, event.discoveredAt, 40);

  return candidates
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) || right.priority - left.priority,
    )
    .map(({ priority: _priority, ...trace }) => trace)
    .at(0) ?? null;
}

function sceneDefinition(routeId, archetypeId) {
  return HABITAT_SCENE_ARCHETYPES[routeId]?.find(
    ({ id }) => id === archetypeId,
  ) ?? null;
}

function deriveHabitatScene(state, creature, habitat, date) {
  const routeId = habitatSceneRoute(creature, habitat.relationship);
  const archetypes = HABITAT_SCENE_ARCHETYPES[routeId];
  const archetype = archetypes[digestIndex(
    archetypes.length,
    "anti-ai-habitat-scene-v1",
    state.seed,
    date,
    routeId,
    creature.stage,
    habitat.relationship?.id ?? "solitary",
  )];
  const bulletin = archetype.bulletins[digestIndex(
    archetype.bulletins.length,
    "anti-ai-habitat-bulletin-v1",
    state.seed,
    date,
    archetype.id,
  )];
  const cycle = SCENE_CYCLES[digestIndex(
    SCENE_CYCLES.length,
    "anti-ai-habitat-cycle-v1",
    date,
    state.seed,
  )];
  return {
    version: 1,
    archetypeId: archetype.id,
    routeId,
    cycleId: cycle.id,
    bulletinId: `${routeId}_${bulletin.id}`,
    art: [...archetype.art],
    layers: {
      environment: { id: archetype.id },
      subject: { poseId: specimenPose(state, creature, date) },
      relationship: {
        id: habitat.relationship?.id ?? "solitary",
        companionId: habitat.companion?.cultureId ?? null,
      },
      trace: latestHabitatTrace(state, habitat, date),
    },
  };
}

function presentHabitatScene(value, lang = "zh") {
  const archetype = sceneDefinition(value.routeId, value.archetypeId);
  const cycle = SCENE_CYCLES.find(({ id }) => id === value.cycleId);
  const bulletin = archetype?.bulletins.find(
    ({ id }) => `${value.routeId}_${id}` === value.bulletinId,
  );
  const trace = value.layers.trace
    ? {
        ...value.layers.trace,
        label: TRACE_LABELS[value.layers.trace.type]?.[lang]
          ?? value.layers.trace.type,
      }
    : null;
  return {
    ...value,
    name: archetype?.name[lang] ?? value.archetypeId,
    climate: archetype?.climate[lang] ?? value.archetypeId,
    cycle: cycle?.label[lang] ?? value.cycleId,
    bulletin: bulletin?.copy[lang] ?? value.bulletinId,
    layers: {
      ...value.layers,
      trace,
    },
  };
}

export {
  HABITAT_SCENE_ARCHETYPES,
  deriveHabitatScene,
  presentHabitatScene,
};
