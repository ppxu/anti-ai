const habitatEvent = (route, decorationId, zhName, enName, zhBody, enBody) => ({
  route,
  decorationId,
  name: { zh: zhName, en: enName },
  body: { zh: zhBody, en: enBody },
});

const relationship = (route, zhName, enName, zhSymptom, enSymptom) => ({
  route,
  name: { zh: zhName, en: enName },
  symptom: { zh: zhSymptom, en: enSymptom },
});

const decoration = (route, glyph, zh, en) => ({
  route,
  glyph,
  name: { zh, en },
});

const V2_HABITAT_COPY = {
  events: {
    invoice_rain: habitatEvent("pollution", "invoice_gutter", "账单降雨", "INVOICE RAIN", "费用曲线凝结成雨，落地后继续按请求计费。", "The cost curve condensed into rain that remains billable after landing."),
    prompt_smog: habitatEvent("pollution", "prompt_chimney", "提示词雾霾", "PROMPT SMOG", "过期提示词从烟囱排出，能见度降到一个上下文窗口。", "Stale prompts left the chimney; visibility fell to one context window."),
    retry_algae: habitatEvent("pollution", "retry_aquarium", "重试藻爆", "RETRY ALGAE BLOOM", "重试藻类覆盖水面，每个气泡都说再来一次。", "Retry algae covered the water; every bubble says one more time."),
    cache_landslide: habitatEvent("pollution", "legacy_scree", "缓存滑坡", "CACHE LANDSLIDE", "遗留地层滑进主通道，被重新标记为知识资产。", "Legacy strata slid into the aisle and were relabeled knowledge assets."),
    offline_migration: habitatEvent("clarity", "offline_footpath", "离线迁徙", "OFFLINE MIGRATION", "两只标本沿着没有 Wi-Fi 的路线短暂离开了路线图。", "Both specimens briefly left the roadmap along a path without Wi-Fi."),
    unsent_harvest: habitatEvent("clarity", "unsent_greenhouse", "未发送收获", "UNSENT HARVEST", "温室收获三句没有发给任何模型的完整想法。", "The greenhouse harvested three complete thoughts sent to no model."),
    manual_weather: habitatEvent("clarity", "analog_barometer", "人工天气", "MANUAL WEATHER", "纸质气压计预测今天适合自己决定。", "A paper barometer predicts favorable conditions for deciding yourself."),
    quiet_compost: habitatEvent("clarity", "quiet_compost", "安静堆肥", "QUIET COMPOST", "没发出的追问腐熟成一小块可用注意力。", "Unsent follow-ups composted into a small patch of usable attention."),
    mirrored_outage: habitatEvent("paradox", "double_status_board", "镜像宕机", "MIRRORED OUTAGE", "一块状态板显示正常，另一块也显示正常，但颜色相反。", "Both status boards say normal in opposite colors."),
    recursive_quarantine: habitatEvent("paradox", "nested_quarantine", "递归隔离", "RECURSIVE QUARANTINE", "隔离区内部又划出隔离区，负责人仍在最里面。", "A quarantine zone appeared inside quarantine; its owner remains in the innermost one."),
    sober_meltdown: habitatEvent("paradox", "cold_reactor_shrine", "清醒熔毁", "SOBER MELTDOWN", "核心在完全冷却后发生了一次符合流程的熔毁。", "The fully cooled core completed a procedurally compliant meltdown."),
    duplicate_silence: habitatEvent("paradox", "echo_vacuum", "重复沉默", "DUPLICATE SILENCE", "生态舱同时记录了两份完全相同的无事发生。", "The habitat recorded two identical copies of nothing happening."),
  },
  relationships: {
    invoice_carpool: relationship("pollution", "账单拼车", "INVOICE CARPOOL", "双方共享一张账单，但都坐在驾驶位。", "They share one bill while both occupy the driver's seat."),
    mutual_retry: relationship("pollution", "互相重试", "MUTUAL RETRY", "一方失败时，另一方负责把失败再执行一遍。", "When one fails, the other reruns the failure."),
    thermal_codependency: relationship("pollution", "热依赖", "THERMAL CODEPENDENCY", "只有一起过热时，它们才觉得系统正常。", "They feel normal only while overheating together."),
    prompt_scavenging: relationship("pollution", "提示词食腐", "PROMPT SCAVENGING", "它们轮流吃掉对方没用完的前置说明。", "They take turns eating each other's unused instructions."),
    unsent_correspondence: relationship("clarity", "未发送通信", "UNSENT CORRESPONDENCE", "双方通过不发送消息保持高质量沟通。", "They maintain high-quality communication by sending nothing."),
    analog_parenting: relationship("clarity", "模拟监护", "ANALOG CUSTODY", "它们用纸笔轮流看守自动补全开关。", "They guard the autocomplete switch in shifts with paper and pencil."),
    low_power_friendship: relationship("clarity", "低功耗友谊", "LOW-POWER FRIENDSHIP", "关系在待机时最稳定，唤醒后需要重新评估。", "The bond is strongest on standby and must be reassessed after wake."),
    quiet_mutual_aid: relationship("clarity", "沉默互助", "QUIET MUTUAL AID", "每当一方忍住追问，另一方就少总结一次。", "Whenever one resists a follow-up, the other skips a summary."),
    reciprocal_alibi: relationship("paradox", "互证不在场", "RECIPROCAL ALIBI", "双方都能证明故障发生时自己正在修复对方。", "Each proves it was repairing the other during the failure."),
    synchronized_disagreement: relationship("paradox", "同步分歧", "SYNCHRONIZED DISAGREEMENT", "它们在同一秒得出两个相反且一致的结论。", "They reach opposite, mutually consistent conclusions at the same second."),
    compliant_symbiosis: relationship("paradox", "合规共生", "COMPLIANT SYMBIOSIS", "所有异常都有编号，因此被认定为稳定关系。", "Every anomaly has a ticket, so the relationship is considered stable."),
    alternating_reality: relationship("paradox", "交替现实", "ALTERNATING REALITY", "本体上线时伴生物离线，交接记录始终完整。", "The companion goes offline when the specimen wakes; handoff records remain immaculate."),
  },
  decorations: {
    invoice_gutter: decoration("pollution", "⌇$", "账单雨槽", "INVOICE GUTTER"),
    prompt_chimney: decoration("pollution", "╥≈", "提示词烟囱", "PROMPT CHIMNEY"),
    retry_aquarium: decoration("pollution", "≈↻", "重试水箱", "RETRY AQUARIUM"),
    legacy_scree: decoration("pollution", "▰≋", "遗留碎坡", "LEGACY SCREE"),
    offline_footpath: decoration("clarity", "·┈", "离线路径", "OFFLINE FOOTPATH"),
    unsent_greenhouse: decoration("clarity", "⌂❀", "未发送温室", "UNSENT GREENHOUSE"),
    analog_barometer: decoration("clarity", "○↕", "模拟气压计", "ANALOG BAROMETER"),
    quiet_compost: decoration("clarity", "▱♧", "安静堆肥箱", "QUIET COMPOST"),
    double_status_board: decoration("paradox", "▣▣", "双重状态板", "DOUBLE STATUS BOARD"),
    nested_quarantine: decoration("paradox", "▢▣", "嵌套隔离区", "NESTED QUARANTINE"),
    cold_reactor_shrine: decoration("paradox", "○☢", "冷核龛", "COLD-CORE SHRINE"),
    echo_vacuum: decoration("paradox", "◌◌", "回声真空", "ECHO VACUUM"),
  },
  duoTitles: {
    pollution: [
      { zh: "预算沼泽合伙人", en: "BUDGET-SWAMP PARTNERS" },
      { zh: "双核过热小组", en: "DUAL-CORE OVERHEAT UNIT" },
      { zh: "祖传答案饲养员", en: "ANCESTRAL-ANSWER KEEPERS" },
      { zh: "回滚气候联盟", en: "ROLLBACK CLIMATE ALLIANCE" },
      { zh: "请求虫群董事会", en: "REQUEST-SWARM BOARD" },
      { zh: "共同账单责任体", en: "JOINT BILLING ENTITY" },
    ],
    clarity: [
      { zh: "未发送思想俱乐部", en: "UNSENT-THOUGHT CLUB" },
      { zh: "低功耗散步搭子", en: "LOW-POWER WALKING PAIR" },
      { zh: "人工开关保护协会", en: "MANUAL-SWITCH PROTECTION SOCIETY" },
      { zh: "安静时段共同体", en: "QUIET-HOURS COLLECTIVE" },
      { zh: "离线意见形成组", en: "OFFLINE OPINION FORMATION UNIT" },
      { zh: "非自动摘要邻居", en: "NON-AUTOMATIC-SUMMARY NEIGHBORS" },
    ],
    paradox: [
      { zh: "双向误诊委员会", en: "BIDIRECTIONAL MISDIAGNOSIS BOARD" },
      { zh: "清醒熔毁搭档", en: "SOBER-MELTDOWN PARTNERS" },
      { zh: "相互兼容性事故", en: "MUTUAL COMPATIBILITY INCIDENT" },
      { zh: "镜像责任共同体", en: "MIRRORED LIABILITY COLLECTIVE" },
      { zh: "双版本现实维护组", en: "DUAL-REALITY MAINTENANCE UNIT" },
      { zh: "完全合规异常体", en: "FULLY COMPLIANT ABERRATIONS" },
    ],
  },
};

export { V2_HABITAT_COPY };
