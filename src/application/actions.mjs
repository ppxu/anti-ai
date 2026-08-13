import {
  casebookLabel,
  currentCreatureIntervention,
} from "../casebook.mjs";
import {
  companionLabel,
} from "../companion.mjs";
import {
  cabinetInteractionCopy,
  codexCollectionEntries,
} from "../consequence-cabinet.mjs";
import {
  creatureCodex,
  creatureEvolutionSummary,
  creatureLabel,
  deriveCreature,
  loadCreatureState,
} from "../creature.mjs";
import {
  laboratoryLabel,
  laboratoryShelf,
  laboratoryView,
} from "../laboratory.mjs";
import { localDate } from "../scanner.mjs";
import { localized } from "../shared.mjs";
import {
  INCIDENT_AFTERMATH_DELAY,
  currentCreatureIncident,
  incidentLabel,
} from "../incidents.mjs";
import { StateConflictError } from "../state-store.mjs";
import {
  EXPEDITION_DESTINATIONS,
} from "../expedition.mjs";
import {
  expeditionChoiceCopy,
  expeditionDestination,
} from "../expedition/content.mjs";
import { deriveContainmentActions } from "./action-catalog.mjs";
import {
  applyContainmentAction,
  availableInteractionTargets,
  executeContainmentMutation,
} from "./action-execution.mjs";
import { persistCreatureState } from "./desktop.mjs";
import { settleCreatureState } from "./settlement.mjs";
import { deriveTuiSnapshot } from "./tui.mjs";
import { CLINIC_PROTOCOLS } from "../clinic-studies.mjs";
import {
  executeVisitationMutation,
  executeVisitorIntake,
  previewVisitorIntake,
} from "./visitation.mjs";

function actionDate(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    date: options.date ?? localDate(new Date(), timezone),
    timezone,
  };
}

function actionContext(state, date, lang) {
  const creature = deriveCreature(state, date);
  const laboratory = laboratoryView(state, date);
  const actions = deriveContainmentActions(
    state,
    date,
    creature,
    laboratory,
    lang,
  );
  return {
    creature,
    laboratory,
    actions,
    actionById: new Map(actions.map((action) => [action.id, action])),
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function activeSourceCount(report) {
  return Object.values(report.sources).filter(
    (source) => source.requests > 0 || source.totalTokens > 0,
  ).length;
}

function settleImpact(report, creature) {
  const day = creature.today;
  return {
    date: report.date,
    totalTokens: report.totals.totalTokens,
    requests: report.totals.requests,
    activeSources: activeSourceCount(report),
    usageBand: day.usageBand,
    ecologyGains: day.ecologyGains,
  };
}

async function settlePreview(state, date, timezone, options, action) {
  const projected = cloneState(state);
  const settled = await settleCreatureState(projected, date, options, timezone);
  const today = settled.state.days[date];
  const creature = {
    ...settled.creature,
    today: {
      usageBand: today.usageBand,
      ecologyGains: today.ecologyGains,
    },
  };
  const impact = settleImpact(settled.report, creature);
  return {
    ...action,
    title: localized(options.lang, "结算工作后遗症", "SETTLE WORK AFTERMATH"),
    summary: localized(
      options.lang,
      `将扫描 ${impact.activeSources} 个有记录的数据源，并把 ${impact.date} 封存为一次本地成长。`,
      `Scans ${impact.activeSources} active source(s) and seals ${impact.date} as one local growth record.`,
    ),
    warning: localized(
      options.lang,
      "确认后会写入本地异变体档案；不会保存模型名、路径、对话或精确 Token。",
      "Confirmation writes the local mutation file; models, paths, chats, and exact Tokens are not stored.",
    ),
    irreversible: true,
    choices: [],
    impact,
  };
}

function interventionPreview(state, date, lang, action) {
  const intervention = currentCreatureIntervention(state, date);
  return {
    ...action,
    title: localized(lang, "处理转折病例", "RESOLVE TURNING CASE"),
    summary: localized(
      lang,
      `病例 #${intervention.id} 将永久保留一次治疗选择。`,
      `Case #${intervention.id} permanently records one treatment choice.`,
    ),
    warning: localized(
      lang,
      "选择封存后不能改选；三条路线提供不同收益与代价。",
      "A sealed choice cannot be changed; every route carries a different benefit and cost.",
    ),
    irreversible: true,
    choices: intervention.options.map((option) => ({
      id: String(option.slot),
      route: option.route,
      label: casebookLabel("routes", option.route, lang),
      detail: localized(
        lang,
        `作用：${casebookLabel("benefits", option.benefitId, lang)} · 代价：${casebookLabel("costs", option.costId, lang)}`,
        `Effect: ${casebookLabel("benefits", option.benefitId, lang)} · Cost: ${casebookLabel("costs", option.costId, lang)}`,
      ),
    })),
    impact: { caseId: intervention.id },
  };
}

function incidentPreview(state, date, lang, action) {
  const incident = currentCreatureIncident(state, date);
  return {
    ...action,
    title: localized(lang, "响应收容事故", "RESPOND TO CONTAINMENT INCIDENT"),
    summary: localized(
      lang,
      `事故 #${incident.id} 将封存一条响应，并在 ${INCIDENT_AFTERMATH_DELAY} 个阅历日后结算后果。`,
      `Incident #${incident.id} seals one response and resolves its aftermath after ${INCIDENT_AFTERMATH_DELAY} experience days.`,
    ),
    warning: localized(
      lang,
      "响应封存后不能改选；结果只改变本地事件链，不增加能力、阅历或 Token 奖励。",
      "A sealed response cannot be changed; the result affects only the local event chain, never abilities, experience, or Token rewards.",
    ),
    irreversible: true,
    choices: incident.options.map((option) => ({
      id: String(option.slot),
      stance: option.stance,
      label: incidentLabel("stances", option.stance, lang),
      detail: localized(
        lang,
        `作用：${incidentLabel("benefits", option.benefitId, lang)} · 代价：${incidentLabel("costs", option.costId, lang)}`,
        `Effect: ${incidentLabel("benefits", option.benefitId, lang)} · Cost: ${incidentLabel("costs", option.costId, lang)}`,
      ),
    })),
    impact: {
      incidentId: incident.id,
      delayExperienceDays: INCIDENT_AFTERMATH_DELAY,
    },
  };
}

function evolutionPreview(state, date, lang, action) {
  const evolution = creatureEvolutionSummary(state, date);
  return {
    ...action,
    title: localized(lang, "选择世代进化", "SELECT GENERATION EVOLUTION"),
    summary: localized(
      lang,
      `第 ${evolution.generation} 代将继承一条长期病理规则。`,
      `Generation ${evolution.generation} inherits one long-term pathology rule.`,
    ),
    warning: localized(
      lang,
      "进化封存后不能改选；高消耗不会获得额外选项。",
      "A sealed evolution cannot be changed; heavier use grants no extra choices.",
    ),
    irreversible: true,
    choices: evolution.options.map((option) => ({
      id: String(option.slot),
      category: option.category,
      label: `[${creatureLabel("evolutionCategories", option.category, lang)}] ${creatureLabel("evolutions", option.id, lang)}`,
      detail: localized(
        lang,
        `${creatureLabel("evolutionBenefits", option.benefitId, lang)} +${option.benefitPoints} · ${creatureLabel("evolutionCosts", option.costId, lang)} +${option.costPoints} · 触发 ${option.procChancePercent}%`,
        `${creatureLabel("evolutionBenefits", option.benefitId, lang)} +${option.benefitPoints} · ${creatureLabel("evolutionCosts", option.costId, lang)} +${option.costPoints} · proc ${option.procChancePercent}%`,
      ),
    })),
    impact: { generation: evolution.generation },
  };
}

function incubationPreview(laboratory, lang, action) {
  return {
    ...action,
    title: localized(lang, "孵化污染培养物", "INCUBATE POLLUTION CULTURE"),
    summary: localized(
      lang,
      `第 ${laboratory.batch} 批提供三份由本地收藏派生的稳定配方。`,
      `Batch ${laboratory.batch} offers three stable formulas derived from local collections.`,
    ),
    warning: localized(
      lang,
      "确认后会新增一份培养物；配方不会消耗或删除原始收藏。",
      "Confirmation adds one culture; formulas never consume or delete their source collections.",
    ),
    irreversible: true,
    choices: laboratory.proposals.map((proposal) => ({
      id: String(proposal.slot),
      rarity: proposal.rarity,
      label: `${laboratoryLabel("types", proposal.typeId, lang)} · ${proposal.rarity.toUpperCase()}`,
      detail: `${creatureLabel("ecologies", proposal.ecologyId, lang)} / ${creatureLabel("branches", proposal.pathologyId, lang)} · ${laboratoryLabel("complications", proposal.complicationId, lang)}`,
    })),
    impact: { batch: laboratory.batch },
  };
}

function studyPreview(lang, action) {
  return {
    ...action,
    title: localized(lang, "启动代谢研究", "START METABOLIC STUDY"),
    summary: localized(
      lang,
      "选择一项按自然日推进的被动观察课题。",
      "Choose one passive observation driven by calendar days.",
    ),
    warning: localized(
      lang,
      "同时只能进行一项；漏日不清零、不惩罚、不延长，也不提供成长奖励。",
      "Only one can run at a time; missed days never reset, punish, or extend it, and studies grant no growth reward.",
    ),
    irreversible: true,
    choices: CLINIC_PROTOCOLS.map((protocol) => ({
      id: protocol.cli,
      label: localized(lang, ...protocol.labels),
      detail: localized(
        lang,
        `${protocol.durationDays} 个自然日 · 被动观察`,
        `${protocol.durationDays} calendar days · passive observation`,
      ),
    })),
    impact: {
      durationOptions: CLINIC_PROTOCOLS.map(({ durationDays }) => durationDays).join(" / "),
      numericRewards: localized(lang, "无", "NONE"),
    },
  };
}

function bondPreview(state, date, lang, action) {
  const shelf = laboratoryShelf(state, date);
  return {
    ...action,
    title: localized(lang, "建立伴生关系", "ESTABLISH SYMBIOTIC BOND"),
    summary: localized(
      lang,
      "选择一份已封存培养物放入生态舱；切换不会丢失既有成长。",
      "Choose a sealed culture for the habitat; switching preserves prior growth.",
    ),
    warning: localized(
      lang,
      "同一自然日只保留最后一次绑定选择，不能借此重复获得印记。",
      "Only the final bond for a calendar day is kept; rebonding cannot duplicate imprints.",
    ),
    irreversible: false,
    choices: shelf.cultures.map((culture) => ({
      id: culture.id,
      rarity: culture.rarity,
      label: `#${culture.id} · ${laboratoryLabel("types", culture.typeId, lang)}`,
      detail: localized(
        lang,
        `${culture.rarity.toUpperCase()} · 封存于 ${culture.createdAt}`,
        `${culture.rarity.toUpperCase()} · sealed ${culture.createdAt}`,
      ),
    })),
    impact: { cultures: shelf.total },
  };
}

function interactionTargetCopy(targetId, lang) {
  const copy = {
    specimen: ["主标本", "Main specimen"],
    companion: ["伴生异物", "Symbiotic companion"],
    cabinet: ["后果陈列柜", "Consequence cabinet"],
    glass: ["轻敲舱壁", "Tap the habitat glass"],
    light: ["调整舱内照明", "Adjust habitat lighting"],
  }[targetId];
  return localized(lang, ...(copy ?? [targetId, targetId]));
}

function interactionPreview(state, date, lang, action, kind) {
  const targets = availableInteractionTargets(state, date, kind);
  const observe = kind === "observe";
  return {
    ...action,
    title: localized(
      lang,
      observe ? "记录今日观察" : "进行克制接触",
      observe ? "RECORD TODAY'S OBSERVATION" : "MAKE RESTRAINED CONTACT",
    ),
    summary: localized(
      lang,
      observe
        ? "选择一个对象，封存一条今天固定不变的观察记录。"
        : "选择一种接触方式，封存今天唯一一次接触反馈。",
      observe
        ? "Choose a target and seal one deterministic observation for today."
        : "Choose a contact method and seal today's only contact response.",
    ),
    warning: localized(
      lang,
      "只改变当天姿态与叙事；不增加能力、阅历、稀有率或 Token 收益。",
      "This changes only today's pose and narrative; no abilities, experience, rarity, or Token rewards are added.",
    ),
    irreversible: false,
    choices: targets.map((targetId) => ({
      id: targetId,
      label: interactionTargetCopy(targetId, lang),
      detail: localized(
        lang,
        "结果由本地种子与日期确定，重复查看不能重抽。",
        "The local seed and date fix the result; reopening cannot reroll it.",
      ),
    })),
    impact: {
      date,
      dailyLimit: localized(lang, "今日 1 次", "1 today"),
      numericRewards: localized(lang, "无", "NONE"),
    },
  };
}

function collectionChoiceLabel(entry, lang) {
  if (entry.type === "form") return creatureLabel("ecologyForms", entry.id, lang);
  if (entry.type === "achievement") return creatureLabel("achievements", entry.id, lang);
  if (entry.type === "chromaticAbility") return creatureLabel("rareAbilities", entry.id, lang);
  if (entry.type === "scar") return creatureLabel("scars", entry.id, lang);
  return localized(
    lang,
    `${entry.sectionId} #${entry.id}`,
    `${entry.sectionId.toUpperCase()} #${entry.id}`,
  );
}

function displayPreview(state, date, lang, action, target) {
  const codex = creatureCodex(state, date);
  const discovered = codexCollectionEntries(codex).filter(
    (entry) => entry.discovered,
  );
  const selected = target
    ? discovered.filter((entry) => entry.key === target)
    : discovered.slice(-8).reverse();
  return {
    ...action,
    title: localized(lang, "调整后果陈列柜", "CURATE CONSEQUENCE CABINET"),
    summary: localized(
      lang,
      "把一项已发现收藏放进生态舱展示位；最近选择排在最前。",
      "Place one discovered collection in the habitat display; the latest choice comes first.",
    ),
    warning: localized(
      lang,
      "陈列只改变控制台、生态舱与分享展示，不改变数值、概率或成长路线。",
      "Display changes only console, habitat, and sharing presentation—not stats, probability, or growth routes.",
    ),
    irreversible: false,
    choices: selected.map((entry) => ({
      id: entry.key,
      label: collectionChoiceLabel(entry, lang),
      detail: `${entry.sectionId} · ${entry.discoveredAt ?? date}`,
    })),
    impact: {
      displaySlots: 3,
      numericRewards: localized(lang, "无", "NONE"),
    },
  };
}

function expeditionPreview(state, date, lang, action) {
  const active = state.expeditions?.active ?? null;
  if (action.id === "start_expedition") {
    return {
      ...action,
      title: localized(
        lang,
        "开启收容远征",
        "START CONTAINMENT EXPEDITION",
      ),
      summary: localized(
        lang,
        "选择一个目的地，封存十格稳定事件序列。",
        "Choose a destination and seal one stable ten-cell event sequence.",
      ),
      warning: localized(
        lang,
        "每个本地自然日最多启程一次；开始会消耗今日机会，退出可恢复但目的地和事件不能重抽。",
        "Start at most once on each local calendar day; starting consumes today's opportunity, and the run can resume but cannot reroll its destination or events.",
      ),
      irreversible: true,
      choices: EXPEDITION_DESTINATIONS.map(({ id }) => {
        const destination = expeditionDestination(id);
        return {
          id,
          label: destination.name[lang],
          detail: `${destination.description[lang]} · ${destination.mood[lang]}`,
        };
      }),
      impact: { cells: 10, opportunity: 1 },
    };
  }
  if (action.id === "advance_expedition") {
    return {
      ...action,
      title: localized(lang, "进入下一格", "ENTER THE NEXT CELL"),
      summary: localized(
        lang,
        `将进入第 ${active.step + 1} / 10 格；结果在确认前保持未知。`,
        `Enters cell ${active.step + 1} / 10; its result remains unknown until confirmation.`,
      ),
      warning: localized(
        lang,
        "事件会立即封存且不能重抽；永久微调每局最多一次。",
        "The event is sealed immediately and cannot be rerolled; at most one permanent adjustment exists per run.",
      ),
      irreversible: true,
      choices: [],
      impact: { nextCell: active.step + 1, totalCells: 10 },
    };
  }
  if (action.id === "choose_expedition") {
    return {
      ...action,
      title: localized(lang, "处理远征分叉", "RESOLVE EXPEDITION BRANCH"),
      summary: localized(
        lang,
        "封存当前格的一项处理方式，然后继续远征。",
        "Seal one response for the current cell, then continue the expedition.",
      ),
      warning: localized(
        lang,
        "选择不能改写；公开变化只在本局有效。",
        "The choice cannot be rewritten; disclosed changes last only for this run.",
      ),
      irreversible: true,
      choices: active.pendingChoice.options.map((option) => ({
        id: option.slot,
        label: expeditionChoiceCopy(active.destinationId, option.slot, lang),
        detail: `${creatureLabel("abilities", option.effect.abilityId, lang)} ${option.effect.delta >= 0 ? "+" : ""}${option.effect.delta}`,
      })),
      impact: { cell: active.step },
    };
  }
  return {
    ...action,
    title: localized(lang, "放弃当前远征", "ABANDON ACTIVE EXPEDITION"),
    summary: localized(
      lang,
      `在第 ${active.step} / 10 格立即返航。`,
      `Return immediately from cell ${active.step} / 10.`,
    ),
    warning: localized(
      lang,
      "今日机会不会返还；已经发生的永久变化和收藏继续保留。",
      "Today's opportunity is not refunded; reached permanent changes and artifacts remain.",
    ),
    irreversible: true,
    choices: [],
    impact: { reachedCells: active.step, totalCells: 10 },
  };
}

async function previewContainmentAction(actionId, options = {}, session = {}) {
  const { date, timezone } = actionDate(options);
  const lang = options.lang ?? "zh";
  const state = session.state ?? await loadCreatureState();
  const context = actionContext(state, date, lang);
  const action = context.actionById.get(actionId);
  if (!action) {
    return { id: actionId, available: false, reason: "unknown_action" };
  }
  if (!action.available) return { ...action, choices: [] };
  if (actionId === "settle_today") {
    return settlePreview(state, date, timezone, { ...options, lang }, action);
  }
  if (actionId === "choose_intervention") {
    return interventionPreview(state, date, lang, action);
  }
  if (actionId === "resolve_incident") {
    return incidentPreview(state, date, lang, action);
  }
  if (actionId === "choose_evolution") {
    return evolutionPreview(state, date, lang, action);
  }
  if (actionId === "incubate") {
    return incubationPreview(context.laboratory, lang, action);
  }
  if (actionId === "start_study") {
    return studyPreview(lang, action);
  }
  if (actionId === "observe_specimen") {
    return interactionPreview(state, date, lang, action, "observe");
  }
  if (actionId === "contact_specimen") {
    return interactionPreview(state, date, lang, action, "contact");
  }
  if (actionId === "curate_display") {
    return displayPreview(state, date, lang, action, options.target);
  }
  if (
    [
      "start_expedition",
      "advance_expedition",
      "choose_expedition",
      "abandon_expedition",
    ].includes(actionId)
  ) {
    return expeditionPreview(state, date, lang, action);
  }
  return bondPreview(state, date, lang, action);
}

function failedAction(actionId, error) {
  return {
    id: actionId,
    status: "unavailable",
    reason: error === "invalid" ? "invalid_choice" : error,
  };
}

function completeAction(actionId, state, date, lang, result, message) {
  return {
    id: actionId,
    status: "completed",
    message: localized(lang, ...message),
    result,
    snapshot: deriveTuiSnapshot(state, date, lang),
  };
}

async function executeContainmentAction(actionId, options = {}, session = {}) {
  const { date, timezone } = actionDate(options);
  const lang = options.lang ?? "zh";
  const state = session.state ?? await loadCreatureState();
  const context = actionContext(state, date, lang);
  const action = context.actionById.get(actionId);
  if (!action?.available) {
    return {
      id: actionId,
      status: "unavailable",
      reason: action?.reason ?? "unknown_action",
    };
  }
  if (actionId === "settle_today") {
    const settled = await settleCreatureState(
      state,
      date,
      { ...options, lang },
      timezone,
    );
    await persistCreatureState(settled.state, date);
    const day = settled.state.days[date];
    const impact = settleImpact(settled.report, {
      today: {
        usageBand: day.usageBand,
        ecologyGains: day.ecologyGains,
      },
    });
    return {
      id: actionId,
      status: "completed",
      message: localized(
        lang,
        `${date} 已封存。异变体声称这只是正常进食。`,
        `${date} sealed. The specimen insists this was normal feeding.`,
      ),
      impact,
      snapshot: deriveTuiSnapshot(settled.state, date, lang),
    };
  }
  if (actionId === "choose_intervention") {
    const selected = await executeContainmentMutation(
      actionId,
      { ...options, date, lang },
      { state },
    );
    if (selected.status !== "completed") return failedAction(actionId, selected.reason);
    return completeAction(actionId, selected.state, date, lang, selected.result, [
      "病例选择已封存。异变体拒绝提供第二诊疗意见。",
      "The case choice is sealed. The specimen refuses a second opinion.",
    ]);
  }
  if (actionId === "resolve_incident") {
    const selected = await executeContainmentMutation(
      actionId,
      { ...options, date, lang },
      { state },
    );
    if (selected.status !== "completed") return failedAction(actionId, selected.reason);
    return completeAction(actionId, selected.state, date, lang, selected.result, [
      "事故响应已封存。后果正在后台假装与选择无关。",
      "Incident response sealed. The aftermath is pretending to be unrelated.",
    ]);
  }
  if (actionId === "choose_evolution") {
    const selected = await executeContainmentMutation(
      actionId,
      { ...options, date, lang },
      { state },
    );
    if (selected.status !== "completed") return failedAction(actionId, selected.reason);
    return completeAction(actionId, selected.state, date, lang, selected.result, [
      "世代进化已封存。遗传错误正式转为家族传统。",
      "Evolution sealed. The hereditary defect is now a family tradition.",
    ]);
  }
  if (actionId === "incubate") {
    const selected = await executeContainmentMutation(
      actionId,
      { ...options, date, lang },
      { state },
    );
    if (selected.status !== "completed") return failedAction(actionId, selected.reason);
    return completeAction(actionId, selected.state, date, lang, selected.result, [
      "培养事故已入架。实验室再次把意外写成了流程。",
      "The incubation accident is shelved. The lab has documented surprise as procedure.",
    ]);
  }
  if (actionId === "start_study") {
    const selected = await executeContainmentMutation(
      actionId,
      { ...options, date, lang },
      { state },
    );
    if (selected.status !== "completed") return failedAction(actionId, selected.reason);
    return completeAction(actionId, selected.state, date, lang, selected.result, [
      "代谢研究已启动。接下来不需要打卡，门诊会安静地数日历。",
      "Metabolic study started. No check-in is required; the clinic will quietly count calendar days.",
    ]);
  }
  if (
    [
      "start_expedition",
      "advance_expedition",
      "choose_expedition",
      "abandon_expedition",
    ].includes(actionId)
  ) {
    const selected = await executeContainmentMutation(
      actionId,
      { ...options, date, lang },
      { state },
    );
    if (selected.status !== "completed") return failedAction(actionId, selected.reason);
    const messages = {
      start_expedition: [
        "远征序列已封存。它现在连后悔都具有确定性。",
        "The expedition is sealed. Even regret is deterministic now.",
      ],
      advance_expedition: [
        "下一格已封存。未知内容正式升级为既成事实。",
        "The next cell is sealed. The unknown is now documented fact.",
      ],
      choose_expedition: [
        "分叉处置已封存。另两种后悔方式同时失效。",
        "The branch response is sealed. Two alternative regrets expired.",
      ],
      abandon_expedition: [
        "远征已提前返航。机会没有，病历还在。",
        "The expedition returned early. The opportunity is gone; the record remains.",
      ],
    }[actionId];
    return completeAction(
      actionId,
      selected.state,
      date,
      lang,
      selected.result,
      messages,
    );
  }
  if (actionId === "curate_display") {
    const selected = await executeContainmentMutation(
      actionId,
      { ...options, date, lang },
      { state },
    );
    if (selected.status !== "completed") return failedAction(actionId, selected.reason);
    return completeAction(actionId, selected.state, date, lang, selected.result, [
      "收藏已进入后果陈列柜。它没有变强，只是更难装作没发生过。",
      "The collection entered the consequence cabinet. It gained no power, only visibility.",
    ]);
  }
  if (["observe_specimen", "contact_specimen"].includes(actionId)) {
    const kind = actionId === "observe_specimen" ? "observe" : "contact";
    const selected = await executeContainmentMutation(
      actionId,
      { ...options, date, lang },
      { state },
    );
    if (selected.status !== "completed") return failedAction(actionId, selected.reason);
    const reaction = cabinetInteractionCopy(kind, selected.result, lang);
    return completeAction(actionId, selected.state, date, lang, selected.result, [
      `${kind === "observe" ? "观察记录" : "接触记录"}已封存：${reaction}`,
      `${kind === "observe" ? "Observation" : "Contact"} sealed: ${reaction}`,
    ]);
  }
  const selected = await executeContainmentMutation(
    actionId,
    { ...options, date, lang },
    { state },
  );
  if (selected.status !== "completed") return failedAction(actionId, selected.reason);
  return completeAction(actionId, selected.state, date, lang, selected.result, [
    `伴生关系已建立：${companionLabel("stages", selected.result.companion.stageId, lang)}。`,
    `Symbiotic bond established: ${companionLabel("stages", selected.result.companion.stageId, lang)}.`,
  ]);
}

async function createContainmentSession(options = {}) {
  const { date } = actionDate(options);
  const lang = options.lang ?? "zh";
  let state = await loadCreatureState();
  const recoverVisitorFailure = async (error) => {
    state = await loadCreatureState();
    const conflict = error instanceof StateConflictError;
    return {
      status: "failed",
      reason: conflict ? "state_conflict" : "execution_failed",
      reasonLabel: conflict
        ? localized(
            lang,
            "访客档案刚被另一个进程更新；本次操作已取消，并重新载入最新档案。",
            "Another process updated the visitor archive; this operation was cancelled and the latest file was reloaded.",
          )
        : localized(
            lang,
            "访客操作失败，档案未被覆盖。请返回后重试。",
            "The visitor operation failed without overwriting the archive. Return and retry.",
          ),
      snapshot: deriveTuiSnapshot(state, date, lang),
    };
  };
  return {
    snapshot: deriveTuiSnapshot(state, date, lang),
    actionController: {
      preview: (actionId, target) =>
        previewContainmentAction(actionId, { ...options, target }, { state }),
      execute: async (actionId, choice) => {
        try {
          return await executeContainmentAction(
            actionId,
            { ...options, choice },
            { state },
          );
        } catch (error) {
          state = await loadCreatureState();
          const conflict = error instanceof StateConflictError;
          return {
            id: actionId,
            status: "failed",
            reason: conflict ? "state_conflict" : "execution_failed",
            reasonLabel: conflict
              ? localized(
                  lang,
                  "异变体档案刚被另一个进程更新。本次操作已取消，并重新载入最新档案。",
                  "Another process updated the mutation file. This action was cancelled and the latest file was reloaded.",
                )
              : localized(
                  lang,
                  "收容协议执行失败，档案未被覆盖。请返回后重试。",
                  "The containment protocol failed without overwriting the file. Return and retry.",
                ),
            snapshot: deriveTuiSnapshot(state, date, lang),
          };
        }
      },
    },
    visitorController: {
      preview: (code) => previewVisitorIntake(
        code,
        { ...options, date, lang },
        { state },
      ),
      receive: async (preview) => {
        try {
          const result = await executeVisitorIntake(
            preview,
            { ...options, date, lang },
            { state },
          );
          return {
            ...result,
            snapshot: deriveTuiSnapshot(state, date, lang),
          };
        } catch (error) {
          return recoverVisitorFailure(error);
        }
      },
      host: async (foreignSpecimenId) => {
        try {
          const result = await executeVisitationMutation(
            "host",
            { date, foreignSpecimenId },
            { state },
          );
          return {
            status: "completed",
            changed: result.changed,
            message: result.changed
              ? localized(lang, "访客已进入生态舱。", "The visitor entered the Habitat.")
              : localized(lang, "该访客已经入住。", "The visitor is already hosted."),
            snapshot: deriveTuiSnapshot(state, date, lang),
          };
        } catch (error) {
          return recoverVisitorFailure(error);
        }
      },
      release: async () => {
        try {
          const result = await executeVisitationMutation(
            "release",
            { date },
            { state },
          );
          return {
            status: "completed",
            changed: result.changed,
            message: result.changed
              ? localized(lang, "当前访客已送离。", "The active visitor was released.")
              : localized(lang, "当前没有访客。", "There is no active visitor."),
            snapshot: deriveTuiSnapshot(state, date, lang),
          };
        } catch (error) {
          return recoverVisitorFailure(error);
        }
      },
    },
  };
}

export {
  applyContainmentAction,
  createContainmentSession,
  deriveContainmentActions,
  executeContainmentAction,
  previewContainmentAction,
};
