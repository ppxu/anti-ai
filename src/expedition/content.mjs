const EXPEDITION_DESTINATION_DEFINITIONS = Object.freeze([
  {
    id: "context_mine",
    name: { zh: "上下文矿井", en: "CONTEXT MINE" },
    description: {
      zh: "被压缩、截断和反复引用的地下记忆层。",
      en: "An underground memory seam compressed, truncated, and cited again.",
    },
    mood: {
      zh: "像把四十个标签页压进一块煤里。",
      en: "Forty browser tabs compressed into one lump of coal.",
    },
    observations: [
      ["矿壁正在引用一段已经不存在的上文。", "The wall cites context that no longer exists."],
      ["一辆提示词矿车空载驶过，却坚持申报满额。", "An empty prompt cart passes while reporting a full load."],
      ["断句从岩层里渗出，拒绝补完自己。", "Sentence fragments seep from the rock and refuse completion."],
      ["你发现三层摘要，最里面仍写着“详见上文”。", "Three nested summaries end with SEE ABOVE."],
      ["废弃窗口在黑暗中继续计算相关性。", "An abandoned context window keeps ranking relevance in the dark."],
      ["矿灯照见一条被截断到只剩逗号的指令。", "The lamp finds an instruction truncated down to a comma."],
      ["回声准确复述了问题，但没有回答。", "The echo repeats the question accurately and declines to answer."],
      ["一块记忆矿石声称自己已被永久记住。", "A memory ore claims it will definitely be remembered."],
    ],
    choices: [
      ["继续向下引用", "Cite deeper"],
      ["压缩成一句话", "Compress to one line"],
      ["承认已经忘了", "Admit it was forgotten"],
    ],
  },
  {
    id: "cache_swamp",
    name: { zh: "缓存沼泽", en: "CACHE SWAMP" },
    description: {
      zh: "过期内容沉积成仍然命中的化石泥层。",
      en: "Expired content settles into fossil mud that still reports a hit.",
    },
    mood: {
      zh: "每一步都命中缓存，每个答案都来自昨天。",
      en: "Every step is a cache hit; every answer is from yesterday.",
    },
    observations: [
      ["沼气弹出一个绿色 HIT，然后什么也没返回。", "A green HIT bubbles up and returns nothing."],
      ["失效索引在泥里保持着令人敬佩的自信。", "A stale index remains impressively confident in the mud."],
      ["你踩到昨天的答案，它仍标注为最新。", "You step on yesterday's answer, still marked LATEST."],
      ["一片回滚记录正缓慢长成沉积岩。", "A rollback log is slowly becoming sedimentary rock."],
      ["缓存骨片互相证明对方从未过期。", "Cache bones certify that none of them ever expired."],
      ["泥面浮着一枚无人敢清理的键。", "An invalidation key floats where nobody dares clean it."],
      ["这里每一条捷径都通往更老的版本。", "Every shortcut here leads to an older version."],
      ["沼泽安静得像一次被错误缓存的报错。", "The swamp is as quiet as an error cached by mistake."],
    ],
    choices: [
      ["相信缓存", "Trust the cache"],
      ["强制刷新", "Force refresh"],
      ["把过期当传统", "Call staleness tradition"],
    ],
  },
  {
    id: "request_nest",
    name: { zh: "请求巢穴", en: "REQUEST NEST" },
    description: {
      zh: "排队、重试并自我复制的口器育儿室。",
      en: "A nursery of queued, retried, self-replicating request mouths.",
    },
    mood: {
      zh: "队列永远只差一个重试就能恢复正常。",
      en: "The queue is always one retry away from becoming normal.",
    },
    observations: [
      ["一窝请求刚孵化就开始请求更多请求。", "A clutch of requests hatches and immediately requests more requests."],
      ["队列尽头挂着一块“马上轮到你”的永久标牌。", "The queue ends beneath a permanent YOU'RE NEXT sign."],
      ["限流壳里传出礼貌而连续的重试声。", "Polite retries click continuously inside a rate-limit shell."],
      ["一只口器把取消信号也当成了新任务。", "One maw interprets cancellation as a new task."],
      ["巢穴正在为尚未发生的超时预热。", "The nest preheats for a timeout that has not happened yet."],
      ["空响应被整齐码放，等待二次消费。", "Empty responses are stacked neatly for a second consumption."],
      ["请求幼体学会的第一个词是 AGAIN。", "A request hatchling's first word is AGAIN."],
      ["队列短暂归零，所有口器因此惊慌失措。", "The queue briefly reaches zero and every maw panics."],
    ],
    choices: [
      ["再试一次", "Retry once more"],
      ["合并请求", "Batch the requests"],
      ["关闭口器", "Close the maw"],
    ],
  },
  {
    id: "reactor_graveyard",
    name: { zh: "反应堆墓场", en: "REACTOR GRAVEYARD" },
    description: {
      zh: "熄灭模型留下余热、辐射风和未结算的风扇声。",
      en: "Dead models leave residual heat, radiation wind, and unsettled fan noise.",
    },
    mood: {
      zh: "回答已经结束，散热和账单坚持继续。",
      en: "The answer ended; cooling and billing chose to continue.",
    },
    observations: [
      ["冷却塔仍在为一条早已结束的回答散热。", "A cooling tower still vents heat for an answer long finished."],
      ["算力灰落在肩上，像极其昂贵的雪。", "Compute ash lands like extremely expensive snow."],
      ["废弃核心每隔几秒假装自己还有负载。", "A dead core pretends to have load every few seconds."],
      ["辐射风吹来一段没人要求的推理过程。", "The radiation wind carries reasoning nobody requested."],
      ["墓碑只刻了一个参数：MAX_TOKENS。", "A headstone bears one parameter: MAX_TOKENS."],
      ["冷却棒已经凉透，账单仍有余温。", "The cooling rod is cold; the bill is still warm."],
      ["风扇在无负载状态下维持职业尊严。", "A fan preserves professional dignity at zero load."],
      ["远处有一枚状态灯拒绝承认推理已经结束。", "A status light refuses to admit inference is over."],
    ],
    choices: [
      ["靠近余热", "Approach the heat"],
      ["收集算力灰", "Collect compute ash"],
      ["切断最后一盏灯", "Cut the final light"],
    ],
  },
]);

const EVENT_TYPE_COPY = Object.freeze({
  empty: { zh: "无事发生", en: "NOTHING HAPPENED" },
  observation: { zh: "环境观察", en: "FIELD OBSERVATION" },
  condition: { zh: "临时病变", en: "TEMPORARY CONDITION" },
  ability: { zh: "永久微调", en: "PERMANENT ADJUSTMENT" },
  choice: { zh: "处置分叉", en: "PROTOCOL BRANCH" },
  artifact: { zh: "遗物发现", en: "ARTIFACT FOUND" },
  anomaly: { zh: "稀有异常", en: "RARE ANOMALY" },
  companion: { zh: "伴生介入", en: "COMPANION INTERVENTION" },
});

const ARTIFACT_NAMES = Object.freeze({
  context_mine: [
    ["断层记忆", "FAULT MEMORY"], ["废弃上下文", "ABANDONED CONTEXT"],
    ["递归矿样", "RECURSIVE ORE"], ["逗号化石", "COMMA FOSSIL"],
    ["空白引用核", "BLANK CITATION CORE"], ["终稿的终稿", "FINAL FINAL DRAFT"],
  ],
  cache_swamp: [
    ["缓存骨片", "CACHE BONE"], ["失效索引", "STALE INDEX"],
    ["回滚遗物", "ROLLBACK RELIC"], ["未清理键", "UNPURGED KEY"],
    ["命中气泡", "HIT BUBBLE"], ["永不过期泥板", "IMMORTAL CACHE TABLET"],
  ],
  request_nest: [
    ["队列卵", "QUEUE EGG"], ["限流外壳", "RATE-LIMIT SHELL"],
    ["续杯器官", "REFILL ORGAN"], ["取消信号茧", "CANCEL COCOON"],
    ["空响应乳牙", "EMPTY RESPONSE TOOTH"], ["无限重试母巢", "INFINITE RETRY HIVE"],
  ],
  reactor_graveyard: [
    ["冷却棒", "COOLING ROD"], ["算力灰", "COMPUTE ASH"],
    ["异色残片", "CHROMATIC SHARD"], ["空载风扇叶", "IDLE FAN BLADE"],
    ["余热墓碑", "RESIDUAL HEAT MARKER"], ["末次推理核心", "LAST REASONING CORE"],
  ],
});

const ARTIFACT_RARITIES = Object.freeze([
  "common", "common", "uncommon", "uncommon", "rare", "epic",
]);

const EXPEDITION_ARTIFACT_DEFINITIONS = Object.freeze(
  EXPEDITION_DESTINATION_DEFINITIONS.flatMap((destination) =>
    ARTIFACT_NAMES[destination.id].map(([zh, en], index) => ({
      id: `${destination.id}_artifact_${index + 1}`,
      destinationId: destination.id,
      rarity: ARTIFACT_RARITIES[index],
      name: { zh, en },
      description: {
        zh: `从${destination.name.zh}带回的第 ${index + 1} 类不必要证据。`,
        en: `Category ${index + 1} of unnecessary evidence returned from ${destination.name.en}.`,
      },
    })),
  ),
);

const EXPEDITION_ACHIEVEMENT_DEFINITIONS = Object.freeze([
  ["first_return", "common", "首次返航", "FIRST RETURN"],
  ["empty_handed", "common", "两手空空", "EMPTY-HANDED"],
  ["branch_clerk", "uncommon", "分叉办事员", "BRANCH CLERK"],
  ["condition_stack", "uncommon", "带病返航", "RETURNED SYMPTOMATIC"],
  ["permanent_increase", "rare", "病灶增生", "LESION GROWTH"],
  ["permanent_decrease", "rare", "指标回落", "METRIC REGRESSION"],
  ["named_adjustment", "epic", "命名副作用", "NAMED SIDE EFFECT"],
  ["all_destinations", "rare", "四地巡诊", "FOUR-SITE ROUND"],
  ["destination_regular", "uncommon", "固定污染路线", "REGULAR CONTAMINATION ROUTE"],
  ["artifact_triplet", "rare", "遗物过敏", "ARTIFACT ALLERGY"],
  ["ten_returns", "epic", "稳定复发", "STABLE RELAPSE"],
  ["paradox_return", "epic", "正负同舱", "MIXED-SIGN RETURN"],
].map(([id, rarity, zh, en]) => ({
  id,
  rarity,
  name: { zh, en },
  description: {
    zh: "由远征病程自动封存，不提供战力或 Token 奖励。",
    en: "Sealed from expedition history with no combat power or Token reward.",
  },
})));

const DESTINATION_BY_ID = new Map(
  EXPEDITION_DESTINATION_DEFINITIONS.map((definition) => [definition.id, definition]),
);
const ARTIFACT_BY_ID = new Map(
  EXPEDITION_ARTIFACT_DEFINITIONS.map((definition) => [definition.id, definition]),
);

function expeditionDestination(id) {
  return DESTINATION_BY_ID.get(id) ?? null;
}

function expeditionEventCopy(event, lang) {
  const destination = expeditionDestination(event.id.split(":")[0]);
  const variant = Number(event.id.split(":")[2]) || 0;
  return {
    title: EVENT_TYPE_COPY[event.type]?.[lang] ?? event.type,
    body: destination?.observations[variant % destination.observations.length]?.[
      lang === "en" ? 1 : 0
    ] ?? event.bodyId,
  };
}

function expeditionChoiceCopy(destinationId, slot, lang) {
  const destination = expeditionDestination(destinationId);
  return destination?.choices[Number(slot) - 1]?.[lang === "en" ? 1 : 0] ?? slot;
}

function expeditionArtifact(id) {
  return ARTIFACT_BY_ID.get(id) ?? null;
}

export {
  EXPEDITION_ACHIEVEMENT_DEFINITIONS,
  EXPEDITION_ARTIFACT_DEFINITIONS,
  EXPEDITION_DESTINATION_DEFINITIONS,
  expeditionArtifact,
  expeditionChoiceCopy,
  expeditionDestination,
  expeditionEventCopy,
};
