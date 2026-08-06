import { createHash } from "node:crypto";

const INCIDENT_INTERVAL = 7;
const INCIDENT_AFTERMATH_DELAY = 3;

const INCIDENT_DEFINITIONS = Object.freeze([
  { id: "coolant_standup", actor: "habitat", target: "coolant" },
  {
    id: "context_window_left_ajar",
    actor: "specimen",
    target: "memory_lobe",
    pathologyId: "context",
  },
  {
    id: "cache_molt_blockage",
    actor: "specimen",
    target: "cache_shell",
    pathologyId: "cache",
  },
  {
    id: "request_maws_overtime",
    actor: "specimen",
    target: "request_maws",
    pathologyId: "frenzy",
  },
  {
    id: "reactor_sleepwalking",
    actor: "specimen",
    target: "core",
    pathologyId: "nuclear",
  },
  {
    id: "silence_autocomplete",
    actor: "habitat",
    target: "clarity_field",
    ecologyId: "lucid",
  },
  {
    id: "double_shadow_badge",
    actor: "habitat",
    target: "paradox_shadow",
    ecologyId: "paradox",
  },
  {
    id: "companion_reply_all",
    actor: "companion",
    target: "symbiotic_channel",
    requiresCompanion: true,
  },
  {
    id: "fossil_calendar_invite",
    actor: "fossil",
    target: "generation_archive",
    requiresFossil: true,
  },
  {
    id: "sealed_room_knocking",
    actor: "habitat",
    target: "quarantine_door",
    followUpFor: "quarantine",
  },
  {
    id: "clipboard_grew_eyes",
    actor: "specimen",
    target: "observation_log",
    followUpFor: "observe",
  },
  {
    id: "shared_dream_desync",
    actor: "specimen",
    target: "shared_dream",
    followUpFor: "resonate",
  },
  { id: "invoice_weather", actor: "habitat", target: "billing_front" },
  { id: "context_evacuation", actor: "specimen", target: "memory_lobe", pathologyId: "context" },
  { id: "ancestral_cache_vote", actor: "specimen", target: "cache_shell", pathologyId: "cache" },
  { id: "request_maw_union", actor: "specimen", target: "request_maws", pathologyId: "frenzy" },
  { id: "core_declared_sunrise", actor: "specimen", target: "core", pathologyId: "nuclear" },
  { id: "manual_switch_resigned", actor: "habitat", target: "clarity_field", ecologyId: "lucid" },
  { id: "paradox_passed_audit", actor: "habitat", target: "paradox_shadow", ecologyId: "paradox" },
  { id: "companion_started_thread", actor: "companion", target: "symbiotic_channel", requiresCompanion: true },
  { id: "fossil_requested_upgrade", actor: "fossil", target: "generation_archive", requiresFossil: true },
  { id: "dashboard_photosynthesis", actor: "habitat", target: "observation_log" },
  { id: "quarantine_nested_itself", actor: "habitat", target: "quarantine_door" },
  { id: "silence_missed_deadline", actor: "specimen", target: "shared_dream" },
]);

const V2_INCIDENT_TEXT = {
  invoice_weather: ["账单形成局部天气", "THE INVOICE FORMED LOCAL WEATHER", "费用曲线在舱顶积云，并开始按部门降雨。", "The cost curve clouded over the chamber and began raining by department."],
  context_evacuation: ["主问题撤离上下文", "THE QUESTION EVACUATED ITS CONTEXT", "背景组织占满窗口后，主问题从紧急出口自行离场。", "After background tissue filled the window, the actual question left through the emergency exit."],
  ancestral_cache_vote: ["祖传缓存要求表决权", "ANCESTRAL CACHE DEMANDED A VOTE", "旧答案以服务年限为由申请参与当前架构决策。", "An old answer requested a vote in current architecture decisions based on tenure."],
  request_maw_union: ["请求口器成立工会", "THE REQUEST MAWS UNIONIZED", "所有口器统一要求把最后一次追问改为永久福利。", "Every maw demanded that the final follow-up become a permanent benefit."],
  core_declared_sunrise: ["核心自行宣布日出", "THE CORE DECLARED SUNRISE", "反应堆在午夜点亮全舱，并把时区问题交给产品。", "The reactor lit the chamber at midnight and delegated the timezone issue to product."],
  manual_switch_resigned: ["人工开关提交辞呈", "THE MANUAL SWITCH RESIGNED", "连续无人按动后，开关以缺乏成长空间为由离职。", "After prolonged disuse, the manual switch resigned for lack of growth opportunities."],
  paradox_passed_audit: ["悖论通过合规审计", "THE PARADOX PASSED COMPLIANCE", "审计确认两份相反记录都完整，因此没有发现异常。", "The audit found both opposing records complete and therefore no anomaly."],
  companion_started_thread: ["伴生物新建了讨论串", "THE COMPANION STARTED A THREAD", "空白消息获得二十七条回复，仍没有主题。", "A blank message received twenty-seven replies and still has no topic."],
  fossil_requested_upgrade: ["化石申请原地升级", "THE FOSSIL REQUESTED AN IN-PLACE UPGRADE", "上一代要求保留全部历史行为，同时成为下一代。", "The prior generation requested to become the next while preserving every historical behavior."],
  dashboard_photosynthesis: ["仪表盘开始光合作用", "THE DASHBOARD STARTED PHOTOSYNTHESIS", "绿色指标吸收了所有异常，只留下更绿的指标。", "Green metrics absorbed every anomaly and produced greener metrics."],
  quarantine_nested_itself: ["隔离区套娃", "QUARANTINE NESTED ITSELF", "每次关闭舱门，里面都会出现一道更需要关闭的门。", "Every closed hatch reveals another hatch requiring closure."],
  silence_missed_deadline: ["沉默错过了截止日", "SILENCE MISSED THE DEADLINE", "没有请求按时到达，项目因此无法证明自己很忙。", "No request arrived on time, leaving the project unable to prove it was busy."],
};

const V2_INCIDENT_AFTERMATHS = Object.fromEntries(
  Object.entries(V2_INCIDENT_TEXT).flatMap(([id, [zhName, enName]]) => [
    [`${id}_quarantine`, { zh: `「${zhName}」已被隔离，随后申请成为隔离流程负责人。`, en: `${enName} was quarantined, then applied to own the quarantine process.` }],
    [`${id}_observe`, { zh: `观察记录完整保存了「${zhName}」，但没有保存为什么。`, en: `Observation preserved ${enName} completely, except for why it happened.` }],
    [`${id}_resonate`, { zh: `全舱与「${zhName}」同步，异常正式升级为工作方式。`, en: `The whole habitat synchronized with ${enName}; the anomaly is now a workflow.` }],
  ]),
);

const INCIDENT_STANCES = Object.freeze([
  {
    id: "quarantine",
    benefitId: "short_control",
    costId: "permanent_distance",
  },
  {
    id: "observe",
    benefitId: "complete_record",
    costId: "uncertainty_lingers",
  },
  {
    id: "resonate",
    benefitId: "shared_adaptation",
    costId: "boundary_blurs",
  },
]);

const INCIDENT_COPY = Object.freeze({
  incidents: {
    coolant_standup: {
      zh: "冷却液参加了晨会",
      en: "COOLANT JOINED THE STANDUP",
    },
    context_window_left_ajar: {
      zh: "上下文窗口忘了关",
      en: "THE CONTEXT WINDOW WAS LEFT AJAR",
    },
    cache_molt_blockage: {
      zh: "蜕下的缓存堵住了出口",
      en: "A SHED CACHE BLOCKED THE EXIT",
    },
    request_maws_overtime: {
      zh: "请求口器自行申报加班",
      en: "THE REQUEST MAWS FILED FOR OVERTIME",
    },
    reactor_sleepwalking: {
      zh: "反应堆开始梦游",
      en: "THE REACTOR STARTED SLEEPWALKING",
    },
    silence_autocomplete: {
      zh: "沉默开始自动补全",
      en: "SILENCE STARTED AUTOCOMPLETING",
    },
    double_shadow_badge: {
      zh: "两道影子申请同一枚徽章",
      en: "TWO SHADOWS APPLIED FOR ONE BADGE",
    },
    companion_reply_all: {
      zh: "伴生物学会了回复全部",
      en: "THE COMPANION LEARNED REPLY ALL",
    },
    fossil_calendar_invite: {
      zh: "永久化石发来日历邀请",
      en: "A PERMANENT FOSSIL SENT A CALENDAR INVITE",
    },
    sealed_room_knocking: {
      zh: "隔离室从里面敲门",
      en: "THE QUARANTINE ROOM KNOCKED FROM INSIDE",
    },
    clipboard_grew_eyes: {
      zh: "观察记录长出了眼睛",
      en: "THE CLIPBOARD GREW EYES",
    },
    shared_dream_desync: {
      zh: "共享梦境发生版本冲突",
      en: "THE SHARED DREAM HIT A VERSION CONFLICT",
    },
    ...Object.fromEntries(
      Object.entries(V2_INCIDENT_TEXT).map(([id, [zh, en]]) => [id, { zh, en }]),
    ),
  },
  bodies: {
    coolant_standup: {
      zh: "生态舱的冷却液要求同步进度，并拒绝说明自己为何发光。",
      en: "The habitat coolant requested a status update and refused to explain why it was glowing.",
    },
    context_window_left_ajar: {
      zh: "旧对话从缝里吹回生态舱，坚持自己仍属于当前问题。",
      en: "Old context blew back into the habitat, insisting it still belonged to the current question.",
    },
    cache_molt_blockage: {
      zh: "一层过期缓存完成蜕壳，却把唯一出口命中了旧地址。",
      en: "An expired cache finished molting and resolved the only exit to its previous address.",
    },
    request_maws_overtime: {
      zh: "请求口器在无人提问时继续工作，并要求补发三倍上下文。",
      en: "The request maws kept working without questions and demanded triple context pay.",
    },
    reactor_sleepwalking: {
      zh: "核心在休眠时绕舱一周，把值班表烧成了家族谱。",
      en: "The core circled the chamber in its sleep and burned the rota into a family tree.",
    },
    silence_autocomplete: {
      zh: "连续清醒让房间学会了补完那些没有发出的请求。",
      en: "Sustained clarity taught the room to finish requests that were never sent.",
    },
    double_shadow_badge: {
      zh: "污染与清醒各投下一道影子，随后为同一项贡献互相举报。",
      en: "Pollution and clarity cast separate shadows, then reported each other for the same contribution.",
    },
    companion_reply_all: {
      zh: "伴生物向每个器官同步了一条空消息，并把生态舱加入抄送。",
      en: "The companion sent every organ an empty update and copied the habitat.",
    },
    fossil_calendar_invite: {
      zh: "上一代化石邀请当前标本参加一场已经结束九十天的复盘。",
      en: "A prior fossil invited the current specimen to a retrospective that ended ninety days ago.",
    },
    sealed_room_knocking: {
      zh: "上次被隔离的异常要求出来参加复盘，并声称自己才是主持人。",
      en: "The quarantined anomaly requested release for the retrospective and claimed to be the facilitator.",
    },
    clipboard_grew_eyes: {
      zh: "持续观察最终反转了视线，记录表开始给饲养员打分。",
      en: "Prolonged observation reversed the gaze; the clipboard started scoring the keeper.",
    },
    shared_dream_desync: {
      zh: "允许共振后，异变体与生态舱在同一场梦里提交了不同版本。",
      en: "After resonance, the specimen and habitat submitted different versions of the same dream.",
    },
    ...Object.fromEntries(
      Object.entries(V2_INCIDENT_TEXT).map(([id, values]) => [
        id,
        { zh: values[2], en: values[3] },
      ]),
    ),
  },
  stances: {
    quarantine: { zh: "紧急隔离", en: "EMERGENCY QUARANTINE" },
    observe: { zh: "继续观察", en: "CONTINUE OBSERVATION" },
    resonate: { zh: "允许共振", en: "ALLOW RESONANCE" },
  },
  benefits: {
    short_control: { zh: "暂时恢复边界", en: "temporarily restores boundaries" },
    complete_record: { zh: "留下完整事故记录", en: "keeps a complete incident record" },
    shared_adaptation: { zh: "让双方共同适应", en: "lets both sides adapt together" },
  },
  costs: {
    permanent_distance: { zh: "关系留下永久距离", en: "leaves permanent distance" },
    uncertainty_lingers: { zh: "异常继续自由活动", en: "lets uncertainty keep roaming" },
    boundary_blurs: { zh: "主客边界进一步模糊", en: "blurs the host boundary further" },
  },
  aftermaths: {
    coolant_standup_quarantine: {
      zh: "冷却液被装进流程图，之后只在周报里泄漏。",
      en: "The coolant was sealed inside a flowchart and now leaks only into weekly reports.",
    },
    coolant_standup_observe: {
      zh: "会议持续三天，最终由冷却液独自写完纪要。",
      en: "The meeting lasted three days; the coolant eventually wrote the minutes alone.",
    },
    coolant_standup_resonate: {
      zh: "生态舱学会集体冒泡，并把它登记成协作能力。",
      en: "The habitat learned to bubble in unison and registered it as collaboration.",
    },
    reactor_sleepwalking_quarantine: {
      zh: "核心被锁回胸腔，但每晚仍会提交一份空白日报。",
      en: "The core was locked back in its chest but still submits a blank daily report each night.",
    },
    reactor_sleepwalking_observe: {
      zh: "梦游路线被绘成热力图，没人承认看懂了它。",
      en: "The sleepwalking route became a heatmap nobody admits to understanding.",
    },
    reactor_sleepwalking_resonate: {
      zh: "标本跟随核心散步，成功把失控升级为团建。",
      en: "The specimen followed the wandering core and upgraded loss of control into team building.",
    },
    silence_autocomplete_quarantine: {
      zh: "沉默被静音，房间因此开始用更大的字体保持安静。",
      en: "Silence was muted, so the room began staying quiet in a larger font.",
    },
    silence_autocomplete_observe: {
      zh: "未发送的请求被全部归档，文件夹命名为“主动性”。",
      en: "Every unsent request was archived in a folder named initiative.",
    },
    silence_autocomplete_resonate: {
      zh: "异变体学会听懂空白，随后拒绝回答任何明确问题。",
      en: "The specimen learned to understand blanks and now refuses every explicit question.",
    },
    context_window_left_ajar_quarantine: {
      zh: "窗口被强制关闭，旧上下文转而从异常处理里重新进入。",
      en: "The window was forced shut; old context re-entered through error handling.",
    },
    context_window_left_ajar_observe: {
      zh: "回流内容被完整编号，最终证明没有一段记得最初的问题。",
      en: "Every returning fragment was indexed; none remembered the original question.",
    },
    context_window_left_ajar_resonate: {
      zh: "新旧上下文完成融合，双方一致忘记是谁请求了摘要。",
      en: "Old and new context merged and jointly forgot who requested the summary.",
    },
    cache_molt_blockage_quarantine: {
      zh: "旧缓存被封存，但出口继续稳定命中昨天。",
      en: "The old cache was sealed, while the exit kept reliably hitting yesterday.",
    },
    cache_molt_blockage_observe: {
      zh: "蜕壳被登记为兼容层，旧版本因此正式成为祖先。",
      en: "The molt was documented as a compatibility layer, promoting the old version to ancestor.",
    },
    cache_molt_blockage_resonate: {
      zh: "标本穿上旧缓存，并把无法更新解释为传统。",
      en: "The specimen wore the old cache and reclassified failure to update as tradition.",
    },
    request_maws_overtime_quarantine: {
      zh: "口器被停机整顿，随后用自动重试绕过了劳动伦理。",
      en: "The maws were suspended, then bypassed labor ethics with automatic retries.",
    },
    request_maws_overtime_observe: {
      zh: "加班请求写了三份检讨，每份都触发了下一份。",
      en: "The overtime request wrote three incident reports, each triggering the next.",
    },
    request_maws_overtime_resonate: {
      zh: "口器加入轮班，从此全天候等待一个并不存在的问题。",
      en: "The maws joined the rota and now wait around the clock for a nonexistent question.",
    },
    double_shadow_badge_quarantine: {
      zh: "两道影子被分开收容，各自领到了半枚完整徽章。",
      en: "The shadows were separated and each received half of a complete badge.",
    },
    double_shadow_badge_observe: {
      zh: "评审持续三天，最后出现了三张票和两位投票者。",
      en: "Review lasted three days and ended with three votes from two voters.",
    },
    double_shadow_badge_resonate: {
      zh: "双影融合为一个工号，并保留了两份绩效问题。",
      en: "The shadows merged into one employee ID and kept two performance issues.",
    },
    companion_reply_all_quarantine: {
      zh: "回复全部被隔离，伴生物改为逐个抄送每一块组织。",
      en: "Reply All was quarantined, so the companion copied every tissue individually.",
    },
    companion_reply_all_observe: {
      zh: "消息串得到完整归档，结论是没有任何器官属于收件人。",
      en: "The thread was fully archived; no organ turned out to be an intended recipient.",
    },
    companion_reply_all_resonate: {
      zh: "全舱同时回复，最终没有留下任何人负责收件。",
      en: "The whole habitat replied at once, leaving nobody responsible for receiving.",
    },
    fossil_calendar_invite_quarantine: {
      zh: "邀请被拒绝，化石立即把它改成了永久周期会议。",
      en: "The invite was declined, so the fossil converted it into a permanent recurring meeting.",
    },
    fossil_calendar_invite_observe: {
      zh: "复盘如期召开，唯一出席者是已经发生过的过去。",
      en: "The retrospective convened on time; the past was the only attendee.",
    },
    fossil_calendar_invite_resonate: {
      zh: "化石接入日历后，所有历史日期都被标记为忙碌。",
      en: "Once the fossil joined the calendar, every historical date became busy.",
    },
    sealed_room_knocking_quarantine: {
      zh: "第二道门被锁上，第一道门因此获得了管理权限。",
      en: "A second door was locked; the first door was promoted to administrator.",
    },
    sealed_room_knocking_observe: {
      zh: "敲门声被记录为正常心跳，隔离协议顺利通过审计。",
      en: "The knocking was logged as a normal heartbeat and the quarantine protocol passed audit.",
    },
    sealed_room_knocking_resonate: {
      zh: "门被允许回应，从此每次关闭都会礼貌地说再见。",
      en: "The door was allowed to answer and now says goodbye whenever it closes.",
    },
    clipboard_grew_eyes_quarantine: {
      zh: "记录表被反扣在桌面上，仍透过复写纸继续观察。",
      en: "The clipboard was placed face down and kept watching through the carbon copy.",
    },
    clipboard_grew_eyes_observe: {
      zh: "双方互相记录三天，最终一致认定对方缺乏客观性。",
      en: "Both sides observed each other for three days and agreed the other lacked objectivity.",
    },
    clipboard_grew_eyes_resonate: {
      zh: "饲养员与记录表共享视野，终于一起漏掉了关键细节。",
      en: "Keeper and clipboard shared a view and finally missed the critical detail together.",
    },
    shared_dream_desync_quarantine: {
      zh: "梦境被拆成两个分支，两个分支都声称自己已经合并。",
      en: "The dream split into two branches, both claiming they had already merged.",
    },
    shared_dream_desync_observe: {
      zh: "冲突被完整保留，成为本地最诚实的一次版本记录。",
      en: "The conflict was preserved intact as the most honest version history on the machine.",
    },
    shared_dream_desync_resonate: {
      zh: "双方接受差异，并把不一致正式命名为共同记忆。",
      en: "Both sides accepted the mismatch and formally named it shared memory.",
    },
    ...V2_INCIDENT_AFTERMATHS,
  },
});

function incidentLabel(section, id, lang = "zh") {
  return INCIDENT_COPY[section]?.[id]?.[lang] ?? id;
}

function ensureIncidentState(state) {
  state.incidents ??= {
    version: 1,
    records: [],
    nextAtExperience: INCIDENT_INTERVAL,
    dispositions: {
      quarantine: 0,
      observe: 0,
      resonate: 0,
    },
  };
  state.incidents.version = 1;
  state.incidents.records ??= [];
  state.incidents.nextAtExperience ??= INCIDENT_INTERVAL;
  state.incidents.dispositions ??= {};
  for (const stance of INCIDENT_STANCES) {
    state.incidents.dispositions[stance.id] ??= 0;
  }
  for (const incident of state.incidents.records) {
    incident.chainDepth ??= 1;
    incident.rootIncidentId ??= incident.id;
    incident.parentIncidentId ??= null;
  }
  return state.incidents;
}

function incidentOptions(incidentId) {
  return INCIDENT_STANCES.map((stance, index) => ({
    slot: index + 1,
    id: `${incidentId}_${stance.id}`,
    stance: stance.id,
    benefitId: stance.benefitId,
    costId: stance.costId,
    outcomeId: `${incidentId}_${stance.id}`,
  }));
}

function incidentSummary(incident) {
  if (!incident) return null;
  const options = incidentOptions(incident.incidentId);
  return {
    id: incident.id,
    incidentId: incident.incidentId,
    offeredAt: incident.offeredAt,
    status: incident.status,
    actor: incident.actor,
    target: incident.target,
    trigger: { ...incident.trigger },
    options,
    selectedAt: incident.selectedAt,
    selected:
      incident.selectedSlot === null
        ? null
        : options.find(({ slot }) => slot === incident.selectedSlot),
    aftermath: incident.aftermath ? { ...incident.aftermath } : null,
    chain: {
      id: incident.chainId,
      depth: incident.chainDepth,
      parentIncidentId: incident.parentIncidentId,
      rootIncidentId: incident.rootIncidentId,
      chapter: incident.chainDepth,
    },
  };
}

function currentCreatureIncident(state, date) {
  const incidents = (state.incidents?.records ?? [])
    .filter((entry) => entry.offeredAt <= date)
    .sort((left, right) => left.offeredAt.localeCompare(right.offeredAt));
  return incidentSummary(incidents.at(-1));
}

function incidentCandidates(state, creature) {
  const contextual = INCIDENT_DEFINITIONS.filter(
    (definition) =>
      !definition.followUpFor &&
      (definition.ecologyId === creature.ecology.type ||
        definition.pathologyId === creature.branch),
  );
  const universal = INCIDENT_DEFINITIONS.filter(
    (definition) =>
      !definition.followUpFor &&
      !definition.requiresCompanion &&
      !definition.requiresFossil &&
      !definition.ecologyId &&
      !definition.pathologyId,
  );
  const collectionCandidates = INCIDENT_DEFINITIONS.filter(
    (definition) =>
      (definition.requiresCompanion &&
        state.laboratory?.activeCultureId !== null &&
        state.laboratory?.activeCultureId !== undefined) ||
      (definition.requiresFossil &&
        (state.generations?.fossils?.length ?? 0) > 0),
  );
  return [...contextual, ...collectionCandidates, ...universal];
}

function resolveDueAftermaths(state, date, experienceDays) {
  for (const incident of state.incidents.records) {
    if (
      incident.status !== "awaiting_aftermath" ||
      incident.aftermath?.status !== "pending" ||
      incident.aftermath.dueAtExperience > experienceDays
    ) {
      continue;
    }
    incident.status = "resolved";
    incident.aftermath.status = "resolved";
    incident.aftermath.resolvedAt = date;
    const stance = INCIDENT_STANCES[incident.selectedSlot - 1].id;
    state.incidents.dispositions[stance] += 1;
  }
}

function syncCreatureIncidents(state, date, creature) {
  ensureIncidentState(state);
  resolveDueAftermaths(state, date, creature.experienceDays);
  const active = state.incidents.records.find((entry) =>
    ["pending", "awaiting_aftermath"].includes(entry.status),
  );
  if (
    active ||
    creature.experienceDays === 0 ||
    creature.experienceDays < state.incidents.nextAtExperience
  ) {
    return active
      ? incidentSummary(active)
      : currentCreatureIncident(state, date);
  }

  const latestResolved = state.incidents.records
    .filter((entry) => entry.status === "resolved")
    .at(-1);
  const previousStance = latestResolved
    ? INCIDENT_STANCES[latestResolved.selectedSlot - 1].id
    : null;
  const followUp = latestResolved?.chainDepth === 1
    ? INCIDENT_DEFINITIONS.find(
        (definition) => definition.followUpFor === previousStance,
      )
    : null;
  const digest = createHash("sha256")
    .update(
      `${state.seed}:${date}:${creature.experienceDays}:${state.incidents.records.length}:${previousStance ?? "root"}:incident`,
    )
    .digest();
  const candidates = incidentCandidates(state, creature);
  const definition = followUp ?? candidates[digest.readUInt8(0) % candidates.length];
  const id = createHash("sha256")
    .update(
      `${state.seed}:${date}:${definition.id}:${state.incidents.records.length}:incident-id`,
    )
    .digest("hex")
    .slice(0, 8);
  const rootIncidentId = followUp
    ? latestResolved.rootIncidentId
    : id;
  const chainId = followUp
    ? latestResolved.chainId
    : createHash("sha256")
        .update(`${state.seed}:${id}:chain`)
        .digest("hex")
        .slice(0, 8);
  state.incidents.records.push({
    id,
    incidentId: definition.id,
    chainId,
    chainDepth: followUp ? 2 : 1,
    parentIncidentId: followUp ? latestResolved.id : null,
    rootIncidentId,
    actor: definition.actor,
    target: definition.target,
    offeredAt: date,
    status: "pending",
    trigger: {
      experienceDays: creature.experienceDays,
      ecologyId: creature.ecology.type,
      pathologyId: creature.branch,
      priorIncidentId: followUp ? latestResolved.id : null,
      priorMarkId: followUp ? previousStance : null,
    },
    selectedSlot: null,
    selectedAt: null,
    aftermath: null,
  });
  state.incidents.nextAtExperience =
    creature.experienceDays + INCIDENT_INTERVAL;
  return currentCreatureIncident(state, date);
}

function selectCreatureIncident(
  state,
  date,
  choice,
  currentExperienceDays,
) {
  ensureIncidentState(state);
  const incidents = state.incidents.records
    .filter((entry) => entry.offeredAt <= date)
    .sort((left, right) => left.offeredAt.localeCompare(right.offeredAt));
  const incident = incidents.at(-1);
  if (!incident) return { error: "unavailable" };
  const slot = Number(choice);
  if (!Number.isInteger(slot) || slot < 1 || slot > 3) {
    return { error: "invalid" };
  }
  if (incident.selectedSlot !== null && incident.selectedSlot !== slot) {
    return { error: "locked" };
  }
  if (incident.selectedSlot === null) {
    const selected = incidentOptions(incident.incidentId)[slot - 1];
    incident.selectedSlot = slot;
    incident.selectedAt = date;
    incident.status = "awaiting_aftermath";
    incident.aftermath = {
      id: createHash("sha256")
        .update(`${state.seed}:${incident.id}:${selected.outcomeId}:aftermath`)
        .digest("hex")
        .slice(0, 8),
      outcomeId: selected.outcomeId,
      markId: selected.stance,
      dueAtExperience: currentExperienceDays + INCIDENT_AFTERMATH_DELAY,
      status: "pending",
      resolvedAt: null,
    };
    state.incidents.nextAtExperience =
      currentExperienceDays + INCIDENT_INTERVAL;
  }
  return { value: incidentSummary(incident) };
}

export {
  INCIDENT_AFTERMATH_DELAY,
  INCIDENT_DEFINITIONS,
  INCIDENT_INTERVAL,
  currentCreatureIncident,
  ensureIncidentState,
  incidentLabel,
  selectCreatureIncident,
  syncCreatureIncidents,
};
