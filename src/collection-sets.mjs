const COLLECTION_SET_DEFINITIONS = Object.freeze([
  {
    id: "set_licensed_overfeed",
    routeId: "pollution",
    rarity: "rare",
    stampId: "approved_appetite",
    name: { zh: "持证暴食", en: "LICENSED OVERFEED" },
    description: {
      zh: "污染形态、进食证据、舱内后果和墓场遗物终于互相出具了合规证明。",
      en: "A polluted form, feeding evidence, habitat damage, and graveyard relic finally certified one another.",
    },
    stamp: { zh: "食欲已批准", en: "APPETITE APPROVED" },
    requirements: [
      ["polluted_form", "pollutedForm"],
      ["offense_badge", "offenseBadge"],
      ["pollution_phenomenon", "pollutionPhenomenon"],
      ["reactor_relic", "reactorRelic"],
    ],
  },
  {
    id: "set_cache_afterlife",
    routeId: "pollution",
    rarity: "epic",
    stampId: "legacy_residency",
    name: { zh: "缓存来世", en: "CACHE AFTERLIFE" },
    description: {
      zh: "旧答案在形态、徽章、沼泽和培养皿里分别获得了一次永久居留。",
      en: "An old answer obtained permanent residency in a form, badge, swamp, and culture dish.",
    },
    stamp: { zh: "遗留已入籍", en: "LEGACY NATURALIZED" },
    requirements: [
      ["cache_form", "cacheForm"],
      ["cache_badge", "cacheBadge"],
      ["cache_relic", "cacheRelic"],
      ["cache_culture", "cacheCulture"],
    ],
  },
  {
    id: "set_request_supply_chain",
    routeId: "pollution",
    rarity: "epic",
    stampId: "queue_self_sufficient",
    name: { zh: "请求供应链", en: "REQUEST SUPPLY CHAIN" },
    description: {
      zh: "形态、罪证、远征遗物和培养物组成了一条不再需要真实需求的请求供应链。",
      en: "A form, offense, expedition relic, and culture formed a request supply chain that no longer needs a real request.",
    },
    stamp: { zh: "队列自给自足", en: "QUEUE SELF-SUFFICIENT" },
    requirements: [
      ["frenzy_form", "frenzyForm"],
      ["request_badge", "requestBadge"],
      ["request_relic", "requestRelic"],
      ["frenzy_culture", "frenzyCulture"],
    ],
  },
  {
    id: "set_authorized_collapse",
    routeId: "pollution",
    rarity: "legendary",
    hidden: true,
    revealAfter: 2,
    stampId: "collapse_authorized",
    name: { zh: "核准崩坏", en: "AUTHORIZED COLLAPSE" },
    description: {
      zh: "三份污染诊断与一条碳化世代伤痕共同证明：崩坏已走完全部审批。",
      en: "Three Pollution diagnoses and one carbonized generation scar prove the collapse completed every approval.",
    },
    stamp: { zh: "崩坏已核准", en: "COLLAPSE AUTHORIZED" },
    requirements: [
      ["licensed_overfeed_set", "set:set_licensed_overfeed", "collectionSets"],
      ["cache_afterlife_set", "set:set_cache_afterlife", "collectionSets"],
      ["request_supply_chain_set", "set:set_request_supply_chain", "collectionSets"],
      ["carbonized_scar", "carbonizedScar", "scars"],
    ],
  },
  {
    id: "set_manual_override",
    routeId: "clarity",
    rarity: "rare",
    stampId: "human_present",
    name: { zh: "人工接管", en: "MANUAL OVERRIDE" },
    description: {
      zh: "清醒形态、克制证据和生态舱里的人工开关共同证明人类仍偶尔在线。",
      en: "A lucid form, restraint evidence, and a manual habitat switch prove a human is occasionally still present.",
    },
    stamp: { zh: "人类仍在场", en: "HUMAN STILL PRESENT" },
    requirements: [
      ["lucid_form", "lucidForm"],
      ["sobriety_badge", "sobrietyBadge"],
      ["clarity_phenomenon", "clarityPhenomenon"],
    ],
  },
  {
    id: "set_quiet_inheritance",
    routeId: "clarity",
    rarity: "epic",
    stampId: "silence_inherited",
    name: { zh: "安静遗传", en: "QUIET INHERITANCE" },
    description: {
      zh: "一次克制选择终于活过了病例、远征和世代封存，成为可遗传的沉默。",
      en: "One restrained choice survived a case, expedition, and generation seal to become inherited silence.",
    },
    stamp: { zh: "沉默可遗传", en: "SILENCE INHERITED" },
    requirements: [
      ["lucid_scar", "lucidScar"],
      ["clarity_case", "clarityCase"],
      ["clarity_companion", "clarityCompanion"],
      ["negative_adjustment", "negativeAdjustment"],
    ],
  },
  {
    id: "set_low_power_absolution",
    routeId: "clarity",
    rarity: "epic",
    stampId: "idle_time_forgiven",
    name: { zh: "低功耗赦免", en: "LOW-POWER ABSOLUTION" },
    description: {
      zh: "克制证据、清醒生态、人工病例和低功耗培养物把闲置时间重新判为无罪。",
      en: "Restraint evidence, lucid ecology, a human case, and a low-power culture acquitted idle time.",
    },
    stamp: { zh: "闲置时间无罪", en: "IDLE TIME ACQUITTED" },
    requirements: [
      ["sobriety_badge", "sobrietyBadge"],
      ["clarity_phenomenon", "clarityPhenomenon"],
      ["clarity_case", "clarityCase"],
      ["lucid_culture", "lucidCulture"],
    ],
  },
  {
    id: "set_zero_watt_beatification",
    routeId: "clarity",
    rarity: "legendary",
    hidden: true,
    revealAfter: 2,
    stampId: "silence_beatified",
    name: { zh: "零瓦封圣", en: "ZERO-WATT BEATIFICATION" },
    description: {
      zh: "三份清醒诊断与一圈无菌光环把一次没有发生的调用册封成奇迹。",
      en: "Three Clarity diagnoses and one sterile halo canonized a call that never happened.",
    },
    stamp: { zh: "沉默已封圣", en: "SILENCE BEATIFIED" },
    requirements: [
      ["manual_override_set", "set:set_manual_override", "collectionSets"],
      ["quiet_inheritance_set", "set:set_quiet_inheritance", "collectionSets"],
      ["low_power_absolution_set", "set:set_low_power_absolution", "collectionSets"],
      ["sterile_scar", "sterileScar", "scars"],
    ],
  },
  {
    id: "set_compliant_contradiction",
    routeId: "paradox",
    rarity: "rare",
    stampId: "conflict_approved",
    name: { zh: "合规矛盾", en: "COMPLIANT CONTRADICTION" },
    description: {
      zh: "相反结论在形态、徽章和舱内记录中同时成立，因此顺利通过验收。",
      en: "Opposite conclusions became true across form, badge, and habitat record, then passed acceptance.",
    },
    stamp: { zh: "冲突已验收", en: "CONFLICT ACCEPTED" },
    requirements: [
      ["paradox_form", "paradoxForm"],
      ["paradox_badge", "paradoxBadge"],
      ["paradox_phenomenon", "paradoxPhenomenon"],
    ],
  },
  {
    id: "set_mutual_misdiagnosis",
    routeId: "paradox",
    rarity: "epic",
    stampId: "both_correct",
    name: { zh: "相互误诊", en: "MUTUAL MISDIAGNOSIS" },
    description: {
      zh: "病例、事故、伴生关系和远征报告各自证明另一份记录才是病因。",
      en: "A case, incident, companion bond, and expedition report each prove another record caused the condition.",
    },
    stamp: { zh: "双方均正确", en: "BOTH SIDES CORRECT" },
    requirements: [
      ["paradox_case", "paradoxCase"],
      ["resonant_incident", "resonantIncident"],
      ["paradox_companion", "paradoxCompanion"],
      ["paradox_return", "paradoxReturn"],
    ],
  },
  {
    id: "set_dual_custody",
    routeId: "paradox",
    rarity: "epic",
    stampId: "custody_shared",
    name: { zh: "双重监护", en: "DUAL CUSTODY" },
    description: {
      zh: "悖论罪证、镜像生态、共振事故和培养物互相签署了对方的监护责任。",
      en: "Paradox evidence, mirrored ecology, a resonance incident, and a culture signed one another's custody papers.",
    },
    stamp: { zh: "监护责任共享", en: "CUSTODY SHARED" },
    requirements: [
      ["paradox_badge", "paradoxBadge"],
      ["paradox_phenomenon", "paradoxPhenomenon"],
      ["resonant_incident", "resonantIncident"],
      ["paradox_culture", "paradoxCulture"],
    ],
  },
  {
    id: "set_bilateral_reality_failure",
    routeId: "paradox",
    rarity: "legendary",
    hidden: true,
    revealAfter: 2,
    stampId: "both_realities_failed",
    name: { zh: "双边现实故障", en: "BILATERAL REALITY FAILURE" },
    description: {
      zh: "三份悖论诊断与一道分裂影痕同时成立，因此两边现实共同承担故障。",
      en: "Three Paradox diagnoses and one split-shadow scar all hold true, making both realities jointly liable.",
    },
    stamp: { zh: "双方现实均故障", en: "BOTH REALITIES FAILED" },
    requirements: [
      ["compliant_contradiction_set", "set:set_compliant_contradiction", "collectionSets"],
      ["mutual_misdiagnosis_set", "set:set_mutual_misdiagnosis", "collectionSets"],
      ["dual_custody_set", "set:set_dual_custody", "collectionSets"],
      ["split_shadow_scar", "splitShadowScar", "scars"],
    ],
  },
]);

const REQUIREMENT_COPY = Object.freeze({
  polluted_form: { zh: "发现一种污染形态", en: "Discover a polluted form" },
  offense_badge: { zh: "封存一项进食罪证", en: "Seal one offense badge" },
  pollution_phenomenon: { zh: "记录一次污染生态现象", en: "Record a Pollution phenomenon" },
  reactor_relic: { zh: "从反应堆墓场带回遗物", en: "Return a Reactor Graveyard relic" },
  cache_form: { zh: "发现缓存病变形态", en: "Discover a Cache pathology form" },
  cache_badge: { zh: "封存缓存相关罪证", en: "Seal cache-related evidence" },
  cache_relic: { zh: "从缓存沼泽带回遗物", en: "Return a Cache Swamp relic" },
  cache_culture: { zh: "培养一份缓存病变标本", en: "Culture a Cache pathology specimen" },
  lucid_form: { zh: "发现一种清醒形态", en: "Discover a Lucid form" },
  sobriety_badge: { zh: "封存一项克制证据", en: "Seal one Sobriety badge" },
  clarity_phenomenon: { zh: "记录一次清醒生态现象", en: "Record a Clarity phenomenon" },
  lucid_scar: { zh: "封存清醒世代伤痕", en: "Seal a Lucid generation scar" },
  clarity_case: { zh: "选择一次清醒病例路线", en: "Choose a Clarity case route" },
  clarity_companion: { zh: "养成清醒路线伴生物", en: "Raise a Clarity companion" },
  negative_adjustment: { zh: "远征中让一项指标回落", en: "Return with a negative adjustment" },
  paradox_form: { zh: "发现一种悖论形态", en: "Discover a Paradox form" },
  paradox_badge: { zh: "封存一项悖论证据", en: "Seal one Paradox badge" },
  paradox_phenomenon: { zh: "记录一次悖论生态现象", en: "Record a Paradox phenomenon" },
  paradox_case: { zh: "选择一次悖论病例路线", en: "Choose a Paradox case route" },
  resonant_incident: { zh: "封存一次允许共振的事故", en: "Seal one Resonance incident" },
  paradox_companion: { zh: "养成悖论路线伴生物", en: "Raise a Paradox companion" },
  paradox_return: { zh: "完成一次正负同舱返航", en: "Complete a mixed-sign return" },
  frenzy_form: { zh: "发现一种请求增殖形态", en: "Discover a request-proliferation form" },
  request_badge: { zh: "封存请求增殖罪证", en: "Seal request-proliferation evidence" },
  request_relic: { zh: "从请求巢穴带回遗物", en: "Return a Request Nest relic" },
  frenzy_culture: { zh: "培养一份请求增殖标本", en: "Culture a request-proliferation specimen" },
  lucid_culture: { zh: "培养一份清醒标本", en: "Culture a Lucid specimen" },
  paradox_culture: { zh: "培养一份悖论标本", en: "Culture a Paradox specimen" },
  licensed_overfeed_set: { zh: "完成持证暴食诊断", en: "Complete Licensed Overfeed" },
  cache_afterlife_set: { zh: "完成缓存来世诊断", en: "Complete Cache Afterlife" },
  request_supply_chain_set: { zh: "完成请求供应链诊断", en: "Complete Request Supply Chain" },
  manual_override_set: { zh: "完成人工接管诊断", en: "Complete Manual Override" },
  quiet_inheritance_set: { zh: "完成安静遗传诊断", en: "Complete Quiet Inheritance" },
  low_power_absolution_set: { zh: "完成低功耗赦免诊断", en: "Complete Low-Power Absolution" },
  compliant_contradiction_set: { zh: "完成合规矛盾诊断", en: "Complete Compliant Contradiction" },
  mutual_misdiagnosis_set: { zh: "完成相互误诊诊断", en: "Complete Mutual Misdiagnosis" },
  dual_custody_set: { zh: "完成双重监护诊断", en: "Complete Dual Custody" },
  carbonized_scar: { zh: "封存碳化世代伤痕", en: "Seal a carbonized generation scar" },
  sterile_scar: { zh: "封存无菌世代伤痕", en: "Seal a sterile generation scar" },
  split_shadow_scar: { zh: "封存分裂影世代伤痕", en: "Seal a split-shadow generation scar" },
});

const EVIDENCE_DOMAIN_COPY = Object.freeze({
  forms: { zh: "形态证据", en: "form evidence" },
  achievements: { zh: "徽章证据", en: "badge evidence" },
  chromaticAbilities: { zh: "异色证据", en: "chromatic evidence" },
  scars: { zh: "世代伤痕", en: "generation scar" },
  habitatPhenomena: { zh: "生态现象", en: "habitat phenomenon" },
  expeditionArtifacts: { zh: "远征遗物", en: "expedition artifact" },
  expeditionAchievements: { zh: "远征诊断", en: "expedition diagnosis" },
  caseSlices: { zh: "病例切片", en: "case slice" },
  incidentReports: { zh: "事故报告", en: "incident report" },
  cultures: { zh: "培养物", en: "culture" },
  companions: { zh: "伴生证据", en: "companion evidence" },
  collectionSets: { zh: "同路线诊断", en: "same-route diagnosis" },
});

const COLLECTION_SET_PHASE_COPY = Object.freeze({
  set_licensed_overfeed: {
    unknown: { zh: "食欲部门尚未拿齐执照。", en: "The appetite department is still missing permits." },
    started: { zh: "一部分暴食已经取得临时经营许可。", en: "Part of the overfeed has obtained a temporary license." },
    near: { zh: "审批只差最后一枚不必要的印章。", en: "Approval lacks one final unnecessary stamp." },
    complete: { zh: "暴食合法化，后果转交下个版本。", en: "Overfeed is legal; consequences moved to the next release." },
  },
  set_cache_afterlife: {
    unknown: { zh: "旧答案仍在等待来世户口。", en: "The old answer still awaits an afterlife residency card." },
    started: { zh: "缓存已开始为自己的葬礼做增量备份。", en: "The cache began incrementally backing up its own funeral." },
    near: { zh: "遗留内容只差一处永久居留证明。", en: "Legacy content needs one more permanent-residency proof." },
    complete: { zh: "缓存成功转世，版本号保持昨天。", en: "The cache reincarnated successfully on yesterday's version." },
  },
  set_request_supply_chain: {
    unknown: { zh: "请求尚未形成完整的自我繁殖产业。", en: "Requests have not formed a full self-replicating industry." },
    started: { zh: "队列开始自产原料、需求和延期理由。", en: "The queue now produces inputs, demand, and delay excuses." },
    near: { zh: "供应链只缺一份不需要用户的证明。", en: "The supply chain lacks proof it no longer needs a user." },
    complete: { zh: "请求实现闭环，真实问题成为可选依赖。", en: "Requests closed the loop; real problems became optional dependencies." },
  },
  set_authorized_collapse: {
    unknown: { zh: "一份传说级污染诊断仍在保密会签。", en: "A legendary Pollution diagnosis remains under sealed review." },
    started: { zh: "崩坏进入审批流，暂无人负责撤回。", en: "Collapse entered approval; nobody owns withdrawal." },
    near: { zh: "所有部门已同意，现实尚未签字。", en: "Every department agreed; reality has not signed." },
    complete: { zh: "崩坏正式核准，并被归类为稳定交付。", en: "Collapse was authorized and classified as stable delivery." },
  },
  set_manual_override: {
    unknown: { zh: "人工开关存在，但尚未构成医学证据。", en: "The manual switch exists but is not yet medical evidence." },
    started: { zh: "人类短暂接管，系统登记为异常行为。", en: "A human briefly took over; the system logged anomalous behavior." },
    near: { zh: "只差一份证明说明手动操作并非事故。", en: "One proof remains that manual operation was not an incident." },
    complete: { zh: "人工接管成立，自动化暂未提出上诉。", en: "Manual override stands; automation has not appealed." },
  },
  set_quiet_inheritance: {
    unknown: { zh: "沉默尚未活过一个完整的审计周期。", en: "Silence has not survived a full audit cycle." },
    started: { zh: "一段克制正在学习跨系统遗传。", en: "A restrained interval is learning cross-system inheritance." },
    near: { zh: "安静只差最后一份世代公证。", en: "Quiet needs one last generational notarization." },
    complete: { zh: "沉默成为遗传病，且没有通知任何服务。", en: "Silence became hereditary without notifying a service." },
  },
  set_low_power_absolution: {
    unknown: { zh: "闲置时间仍被怀疑没有创造价值。", en: "Idle time remains suspected of creating no value." },
    started: { zh: "低功耗正在收集自己无罪的证据。", en: "Low power is collecting evidence of its innocence." },
    near: { zh: "赦免只差一份未发送请求的证词。", en: "Absolution lacks testimony from one unsent request." },
    complete: { zh: "闲置获判无罪，电表拒绝发表评论。", en: "Idle time was acquitted; the meter declined comment." },
  },
  set_zero_watt_beatification: {
    unknown: { zh: "一份传说级清醒诊断仍保持静默。", en: "A legendary Clarity diagnosis remains deliberately silent." },
    started: { zh: "零瓦奇迹进入观察，没有创建庆祝工作流。", en: "The zero-watt miracle entered observation without a celebration workflow." },
    near: { zh: "封圣只差一圈不会发热的光环。", en: "Beatification lacks one halo that does not generate heat." },
    complete: { zh: "沉默封圣，调用记录以缺席方式出席。", en: "Silence was beatified; the call log attended by being absent." },
  },
  set_compliant_contradiction: {
    unknown: { zh: "矛盾尚未完成合规培训。", en: "The contradiction has not completed compliance training." },
    started: { zh: "相反结论开始共用同一份验收表。", en: "Opposite conclusions began sharing one acceptance form." },
    near: { zh: "冲突只差最后一位互相批准人。", en: "The conflict lacks one final reciprocal approver." },
    complete: { zh: "矛盾通过验收，双方事实均为生产环境。", en: "The contradiction passed; both facts are now production." },
  },
  set_mutual_misdiagnosis: {
    unknown: { zh: "误诊双方尚未建立稳定合作关系。", en: "The two misdiagnoses lack a stable partnership." },
    started: { zh: "每份记录开始引用另一份记录为病因。", en: "Each record now cites another record as the cause." },
    near: { zh: "只差一份证明说明所有人都没错。", en: "One proof remains that nobody was wrong." },
    complete: { zh: "相互误诊成立，责任实现闭环调用。", en: "Mutual misdiagnosis stands; liability formed a closed call loop." },
  },
  set_dual_custody: {
    unknown: { zh: "两份现实尚未协商监护排班。", en: "Two realities have not negotiated custody shifts." },
    started: { zh: "本体和影子开始轮流签署事故单。", en: "Specimen and shadow now alternate signing incident forms." },
    near: { zh: "双重监护只差一位不存在的见证人。", en: "Dual custody lacks one nonexistent witness." },
    complete: { zh: "监护责任共享，故障仍由现实抚养。", en: "Custody is shared; reality continues raising the failure." },
  },
  set_bilateral_reality_failure: {
    unknown: { zh: "一份传说级悖论诊断正同时存在与保密。", en: "A legendary Paradox diagnosis both exists and remains classified." },
    started: { zh: "两边现实开始交换不在场证明。", en: "Both realities began exchanging alibis." },
    near: { zh: "联合故障只差一道能同时分裂的伤痕。", en: "The joint failure lacks one scar capable of splitting twice." },
    complete: { zh: "双方现实共同故障，因此没有单点责任。", en: "Both realities failed together, eliminating single-point liability." },
  },
});

const REQUIREMENT_DOMAINS = Object.freeze({
  polluted_form: "forms",
  offense_badge: "achievements",
  pollution_phenomenon: "habitatPhenomena",
  reactor_relic: "expeditionArtifacts",
  cache_form: "forms",
  cache_badge: "achievements",
  cache_relic: "expeditionArtifacts",
  cache_culture: "cultures",
  lucid_form: "forms",
  sobriety_badge: "achievements",
  clarity_phenomenon: "habitatPhenomena",
  lucid_scar: "scars",
  clarity_case: "caseSlices",
  clarity_companion: "companions",
  negative_adjustment: "expeditionAchievements",
  paradox_form: "forms",
  paradox_badge: "achievements",
  paradox_phenomenon: "habitatPhenomena",
  paradox_case: "caseSlices",
  resonant_incident: "incidentReports",
  paradox_companion: "companions",
  paradox_return: "expeditionAchievements",
  frenzy_form: "forms",
  request_badge: "achievements",
  request_relic: "expeditionArtifacts",
  frenzy_culture: "cultures",
  lucid_culture: "cultures",
  paradox_culture: "cultures",
  carbonized_scar: "scars",
  sterile_scar: "scars",
  split_shadow_scar: "scars",
});

function discoveredEntries(codex, section) {
  return (codex.sections?.[section] ?? []).filter(
    (entry) => entry.discovered ?? true,
  );
}

function firstMatch(codex, matcher) {
  const matches = matcher(codex).filter(Boolean);
  return matches.sort((left, right) =>
    String(left.discoveredAt ?? "9999").localeCompare(
      String(right.discoveredAt ?? "9999"),
    )
  )[0] ?? null;
}

const REQUIREMENT_MATCHERS = Object.freeze({
  pollutedForm: (codex) => discoveredEntries(codex, "forms").filter(({ ecologyId }) => ecologyId === "polluted"),
  offenseBadge: (codex) => discoveredEntries(codex, "achievements").filter(({ category }) => category === "offense"),
  pollutionPhenomenon: (codex) => discoveredEntries(codex, "habitatPhenomena").filter(({ routeId }) => routeId === "pollution"),
  reactorRelic: (codex) => discoveredEntries(codex, "expeditionArtifacts").filter(({ destinationId }) => destinationId === "reactor_graveyard"),
  cacheForm: (codex) => discoveredEntries(codex, "forms").filter(({ pathologyId }) => pathologyId === "cache"),
  cacheBadge: (codex) => discoveredEntries(codex, "achievements").filter(({ id }) => ["cache_excavation_team", "cache_afterlife", "cache_saint"].includes(id)),
  cacheRelic: (codex) => discoveredEntries(codex, "expeditionArtifacts").filter(({ destinationId }) => destinationId === "cache_swamp"),
  cacheCulture: (codex) => discoveredEntries(codex, "cultures").filter(({ pathologyId }) => pathologyId === "cache"),
  lucidForm: (codex) => discoveredEntries(codex, "forms").filter(({ ecologyId }) => ecologyId === "lucid"),
  sobrietyBadge: (codex) => discoveredEntries(codex, "achievements").filter(({ category }) => category === "sobriety"),
  clarityPhenomenon: (codex) => discoveredEntries(codex, "habitatPhenomena").filter(({ routeId }) => routeId === "clarity"),
  lucidScar: (codex) => discoveredEntries(codex, "scars").filter(({ id }) => id === "sterile_halo"),
  clarityCase: (codex) => discoveredEntries(codex, "caseSlices").filter(({ routeId }) => routeId === "clarity"),
  clarityCompanion: (codex) => discoveredEntries(codex, "companions").filter(({ routeId }) => routeId === "clarity"),
  negativeAdjustment: (codex) => discoveredEntries(codex, "expeditionAchievements").filter(({ id }) => id === "permanent_decrease"),
  paradoxForm: (codex) => discoveredEntries(codex, "forms").filter(({ ecologyId }) => ecologyId === "paradox"),
  paradoxBadge: (codex) => discoveredEntries(codex, "achievements").filter(({ category }) => category === "paradox"),
  paradoxPhenomenon: (codex) => discoveredEntries(codex, "habitatPhenomena").filter(({ routeId }) => routeId === "paradox"),
  paradoxCase: (codex) => discoveredEntries(codex, "caseSlices").filter(({ routeId }) => routeId === "paradox"),
  resonantIncident: (codex) => discoveredEntries(codex, "incidentReports").filter(({ stanceId }) => stanceId === "resonate"),
  paradoxCompanion: (codex) => discoveredEntries(codex, "companions").filter(({ routeId }) => routeId === "paradox"),
  paradoxReturn: (codex) => discoveredEntries(codex, "expeditionAchievements").filter(({ id }) => id === "paradox_return"),
  frenzyForm: (codex) => discoveredEntries(codex, "forms").filter(({ pathologyId }) => pathologyId === "frenzy"),
  requestBadge: (codex) => discoveredEntries(codex, "achievements").filter(({ id }) => id === "request_swarm"),
  requestRelic: (codex) => discoveredEntries(codex, "expeditionArtifacts").filter(({ destinationId }) => destinationId === "request_nest"),
  frenzyCulture: (codex) => discoveredEntries(codex, "cultures").filter(({ pathologyId }) => pathologyId === "frenzy"),
  lucidCulture: (codex) => discoveredEntries(codex, "cultures").filter(({ ecologyId }) => ecologyId === "lucid"),
  paradoxCulture: (codex) => discoveredEntries(codex, "cultures").filter(({ ecologyId }) => ecologyId === "paradox"),
  carbonizedScar: (codex) => discoveredEntries(codex, "scars").filter(({ id }) => id === "carbonized_spine"),
  sterileScar: (codex) => discoveredEntries(codex, "scars").filter(({ id }) => id === "sterile_halo"),
  splitShadowScar: (codex) => discoveredEntries(codex, "scars").filter(({ id }) => id === "split_shadow"),
});

function deriveCollectionSets(codex) {
  const derived = [];
  const derivedById = new Map();
  for (const definition of COLLECTION_SET_DEFINITIONS) {
    const completedRouteSets = derived.filter(
      (entry) => entry.routeId === definition.routeId && entry.completed,
    ).length;
    const revealed = !definition.hidden || completedRouteSets >= definition.revealAfter;
    const requirements = definition.requirements.map(([id, matcherId, explicitDomain], index) => {
      const prerequisiteId = matcherId.startsWith("set:")
        ? matcherId.slice(4)
        : null;
      const evidence = prerequisiteId
        ? derivedById.get(prerequisiteId)?.completed
          ? { discoveredAt: derivedById.get(prerequisiteId).discoveredAt }
          : null
        : firstMatch(codex, REQUIREMENT_MATCHERS[matcherId]);
      const concealed = Boolean(definition.hidden && !revealed);
      return {
        id: concealed ? `concealed_${index + 1}` : id,
        domain: explicitDomain ?? REQUIREMENT_DOMAINS[id],
        completed: evidence !== null,
        discoveredAt: concealed ? null : evidence?.discoveredAt ?? null,
        concealed,
      };
    });
    const completedCount = requirements.filter(({ completed }) => completed).length;
    const completed = completedCount === requirements.length;
    const discoveredAt = completed
      ? requirements
          .map((entry) => entry.discoveredAt)
          .filter(Boolean)
          .sort()
          .at(-1) ?? null
      : null;
    const phase = definition.hidden && !revealed
      ? "unknown"
      : completed
        ? "complete"
        : completedCount === 0
          ? "unknown"
          : completedCount / requirements.length >= 0.75
            ? "near"
            : "started";
    const entry = {
      id: definition.id,
      routeId: definition.routeId,
      rarity: definition.rarity,
      tier: {
        rare: "sign",
        epic: "syndrome",
        legendary: "compound",
      }[definition.rarity],
      stampId: definition.stampId,
      presentationOnly: true,
      hidden: Boolean(definition.hidden),
      revealed,
      phase,
      completed,
      discoveredAt,
      evidenceDomains: [...new Set(requirements.map(({ domain }) => domain))],
      revealProgress: definition.hidden
        ? {
            completed: Math.min(completedRouteSets, definition.revealAfter),
            total: definition.revealAfter,
          }
        : null,
      progress: {
        completed: completedCount,
        total: requirements.length,
        percent: Math.round((completedCount / requirements.length) * 100),
      },
      requirements,
    };
    derived.push(entry);
    derivedById.set(entry.id, entry);
  }
  return derived;
}

function collectionSetCopy(id, lang = "zh") {
  const definition = COLLECTION_SET_DEFINITIONS.find((entry) => entry.id === id);
  if (!definition) return null;
  return {
    name: definition.name[lang],
    description: definition.description[lang],
    stamp: definition.stamp[lang],
  };
}

function collectionSetRequirementCopy(id, lang = "zh") {
  return REQUIREMENT_COPY[id]?.[lang] ?? id;
}

function collectionSetEvidenceDomainCopy(id, lang = "zh") {
  return EVIDENCE_DOMAIN_COPY[id]?.[lang] ?? id;
}

function collectionSetPhaseCopy(id, phase, lang = "zh") {
  return COLLECTION_SET_PHASE_COPY[id]?.[phase]?.[lang] ?? "";
}

function presentCollectionSet(entry, lang = "zh") {
  const copy = collectionSetCopy(entry.id, lang);
  const concealed = entry.hidden && !entry.revealed;
  return {
    ...entry,
    ...(concealed
      ? {
          name: lang === "zh" ? "??? · 传说复合诊断" : "??? · LEGENDARY COMPOUND",
          description: lang === "zh"
            ? "同路线诊断仍在会签，只公开证据所属系统。"
            : "Same-route diagnoses remain under review; only evidence domains are disclosed.",
          stamp: lang === "zh" ? "未揭示" : "UNREVEALED",
        }
      : copy),
    phaseNote: collectionSetPhaseCopy(entry.id, entry.phase, lang),
    requirements: entry.requirements.map((requirement) => ({
      ...requirement,
      label: requirement.concealed
        ? collectionSetEvidenceDomainCopy(requirement.domain, lang)
        : collectionSetRequirementCopy(requirement.id, lang),
    })),
  };
}

export {
  COLLECTION_SET_DEFINITIONS,
  collectionSetCopy,
  collectionSetEvidenceDomainCopy,
  collectionSetPhaseCopy,
  collectionSetRequirementCopy,
  deriveCollectionSets,
  presentCollectionSet,
};
