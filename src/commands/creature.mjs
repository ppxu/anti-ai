import {
  CREATURE_ABILITY_KEYS,
  CREATURE_ABILITY_MAX,
  CREATURE_COPY,
  CREATURE_RARE_ABILITY_CHANCES,
  CREATURE_RARE_ABILITY_MAX,
  CREATURE_RARE_ABILITY_RANKS,
  creatureAbilityBar,
  creatureCodex,
  creatureEvolutionSummary,
  creatureLabel,
  creatureMalignancyRankLabel,
  creatureMood,
  creatureTitle,
  deriveCreature,
  loadCreatureState,
  resetCreatureState,
  saveCreatureState,
} from "../creature.mjs";
import { creatureArt } from "../renderers/creature-art.mjs";
import { collectionPhenotypeCopy } from "../collection-phenotype.mjs";
import {
  color,
  padTerminal,
  shiftDate,
  terminalWidth,
} from "../reporting.mjs";
import { localDate } from "../scanner.mjs";
import { exportSpecimenCode } from "../encounter.mjs";
import { localized } from "../shared.mjs";
import {
  currentCreatureIncident,
  incidentLabel,
} from "../incidents.mjs";
import {
  casebookLabel,
  creatureHistory,
  creaturePrognosis,
  currentCreatureIntervention,
} from "../casebook.mjs";
import {
  companionLabel,
  laboratoryCompanion,
} from "../companion.mjs";
import {
  achievementLabel,
  generationLabel,
  renderEvolutionOptions,
} from "../cli/render.mjs";
import { deriveHabitat } from "../habitat.mjs";
import { renderHabitat } from "../renderers/habitat.mjs";
import { settleCreatureState } from "../application/settlement.mjs";
import { applyContainmentAction } from "../application/action-execution.mjs";
import { expeditionDestination } from "../expedition/content.mjs";
import { deriveMutationChronicle } from "../chronicle.mjs";
import { renderMutationChronicle } from "../renderers/chronicle.mjs";

async function runCreature(options, mode = "render") {
  if (options.action === "reset") {
    await resetCreatureState();
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ reset: true })}\n`);
    } else {
      process.stdout.write(
        `${localized(options.lang, "异变体档案已销毁。下一枚 Token 会重新孵化它。", "Mutation file destroyed. The next token will hatch it again.")}\n`,
      );
    }
    return;
  }

  if (options.action === "habitat") {
    const context = await runCreature(
      {
        ...options,
        action: undefined,
        command: "creature",
        json: false,
      },
      "snapshot-context",
    );
    if (!context) return;
    const habitat = deriveHabitat(
      context.state,
      context.result,
      context.result.date,
      creatureArt(context.result),
    );
    if (options.json) {
      process.stdout.write(`${JSON.stringify(habitat, null, 2)}\n`);
    } else {
      process.stdout.write(
        renderHabitat(
          habitat,
          {
            specimenStage: creatureLabel(
              "stages",
              habitat.specimen.stageId,
              options.lang,
            ),
            companionStage: habitat.companion
              ? companionLabel(
                  "stages",
                  habitat.companion.stageId,
                  options.lang,
                )
              : null,
          },
          options.lang,
          { full: options.full },
        ),
      );
    }
    return;
  }

  if (options.action === "chronicle") {
    const context = await runCreature(
      {
        ...options,
        action: undefined,
        command: "creature",
        json: false,
      },
      "snapshot-context",
    );
    if (!context) return;
    const chronicle = deriveMutationChronicle(
      context.state,
      context.result.date,
    );
    if (options.json) {
      process.stdout.write(`${JSON.stringify(chronicle, null, 2)}\n`);
    } else {
      process.stdout.write(renderMutationChronicle(chronicle, options.lang));
    }
    return;
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = options.date ?? localDate(new Date(), timezone);
  let state;
  try {
    state = await loadCreatureState();
  } catch {
    if (["result", "snapshot-result"].includes(mode)) return null;
    process.stderr.write(
      `${localized(options.lang, "异变体档案无法读取。运行 anti-ai creature reset 后可重新孵化。", "The mutation file cannot be read. Run anti-ai creature reset to hatch again.")}\n`,
    );
    process.exitCode = 1;
    return;
  }
  const settlement = await settleCreatureState(state, date, options, timezone);
  state = settlement.state;
  let creature = settlement.creature;
  let evolutionAction = null;
  if (options.action === "evolve") {
    if (options.choice === undefined) {
      const evolution = creatureEvolutionSummary(state, date);
      evolutionAction =
        evolution === null
          ? { error: "unavailable" }
          : { value: evolution };
    } else {
      evolutionAction = applyContainmentAction(
        state,
        date,
        "choose_evolution",
        options.choice,
      );
    }
    if (evolutionAction.error) {
      const generation = evolutionAction.generation;
      const message =
        evolutionAction.error === "locked"
          ? localized(
              options.lang,
              `第 ${generation} 代进化已经封存，不能改选。`,
              `Generation ${generation} evolution is sealed and cannot be changed.`,
            )
          : evolutionAction.error === "invalid"
            ? localized(
                options.lang,
                "进化选项必须是 1、2 或 3。",
                "Evolution choice must be 1, 2, or 3.",
              )
            : localized(
                options.lang,
                "当前没有可选择的进化。",
                "No evolution choice is currently available.",
              );
      process.stderr.write(`${message}\n`);
      process.exitCode = 2;
      return;
    }
    creature = deriveCreature(state, date);
    evolutionAction.value = creature.evolution;
  }
  let interventionAction = null;
  if (options.action === "intervene") {
    if (options.choice === undefined) {
      const intervention = currentCreatureIntervention(state, date);
      interventionAction =
        intervention === null
          ? { error: "unavailable" }
          : { value: intervention };
    } else {
      interventionAction = applyContainmentAction(
        state,
        date,
        "choose_intervention",
        options.choice,
      );
    }
    if (interventionAction.error) {
      const message =
        interventionAction.error === "locked"
          ? localized(
              options.lang,
              "病例已封存，不能改选治疗方案。",
              "The case is sealed and its treatment cannot be changed.",
            )
          : interventionAction.error === "invalid"
            ? localized(
                options.lang,
                "治疗方案必须是 1、2 或 3。",
                "Treatment choice must be 1, 2, or 3.",
              )
            : localized(
                options.lang,
                "当前没有可干预的转折病例。",
                "No turning-point case is currently available.",
              );
      process.stderr.write(`${message}\n`);
      process.exitCode = 2;
      return;
    }
  }
  let incidentAction = null;
  if (options.action === "incident") {
    if (options.choice === undefined) {
      const incident = currentCreatureIncident(state, date);
      incidentAction =
        incident === null
          ? { error: "unavailable" }
          : { value: incident };
    } else {
      incidentAction = applyContainmentAction(
        state,
        date,
        "resolve_incident",
        options.choice,
      );
    }
    if (incidentAction.error) {
      const message =
        incidentAction.error === "locked"
          ? localized(
              options.lang,
              "事故响应已经封存，不能临时改口。",
              "The incident response is sealed and cannot be rewritten.",
            )
          : incidentAction.error === "invalid"
            ? localized(
                options.lang,
                "事故响应必须是 1、2 或 3。",
                "Incident response must be 1, 2, or 3.",
              )
            : localized(
                options.lang,
                "当前没有可处理的收容事故。",
                "No containment incident is currently available.",
              );
      process.stderr.write(`${message}\n`);
      process.exitCode = 2;
      return;
    }
  }
  if (!mode.startsWith("snapshot-")) await saveCreatureState(state);

  if (options.action === "incident") {
    const incident = incidentAction.value;
    if (options.json) {
      process.stdout.write(`${JSON.stringify(incident, null, 2)}\n`);
      return;
    }
    const optionLines = incident.options.flatMap((option) => [
      `  ${option.slot}. ${incidentLabel("stances", option.stance, options.lang)}`,
      `     ${localized(options.lang, "作用", "EFFECT")}  ${incidentLabel("benefits", option.benefitId, options.lang)}`,
      `     ${localized(options.lang, "代价", "COST")}  ${incidentLabel("costs", option.costId, options.lang)}`,
    ]);
    const statusLabel = {
      pending: localized(options.lang, "待响应", "PENDING"),
      awaiting_aftermath: localized(
        options.lang,
        "等待延迟后果",
        "AWAITING AFTERMATH",
      ),
      resolved: localized(options.lang, "已结案", "RESOLVED"),
    }[incident.status];
    process.stdout.write(
      [
        localized(
          options.lang,
          "收容事故 · 事件链",
          "CONTAINMENT INCIDENT · EVENT CHAIN",
        ),
        `${localized(options.lang, "事故", "INCIDENT")} #${incident.id} · ${incidentLabel("incidents", incident.incidentId, options.lang)}`,
        `${localized(options.lang, "状态", "STATUS")}  ${statusLabel}`,
        `  ${incidentLabel("bodies", incident.incidentId, options.lang)}`,
        "",
        ...(incident.status === "pending"
          ? optionLines
          : [
              `${localized(options.lang, "已选择", "SELECTED")}  ${incident.selected.slot}. ${incidentLabel("stances", incident.selected.stance, options.lang)}`,
              ...(incident.status === "awaiting_aftermath"
                ? [
                    `${localized(options.lang, "延迟后果", "DELAYED AFTERMATH")}  ${localized(options.lang, `将在阅历 ${incident.aftermath.dueAtExperience} 结算`, `settles at experience ${incident.aftermath.dueAtExperience}`)}`,
                  ]
                : [
                    `${localized(options.lang, "延迟后果", "DELAYED AFTERMATH")}  ${incidentLabel("aftermaths", incident.aftermath.outcomeId, options.lang)}`,
                  ]),
            ]),
        "",
        ...(incident.status === "pending"
          ? [
              localized(
                options.lang,
                "运行 anti-ai creature incident <1|2|3> 封存响应。",
                "Run anti-ai creature incident <1|2|3> to seal a response.",
              ),
            ]
          : []),
        "",
      ].join("\n"),
    );
    return;
  }

  if (options.action === "intervene") {
    const intervention = interventionAction.value;
    if (options.json) {
      process.stdout.write(`${JSON.stringify(intervention, null, 2)}\n`);
      return;
    }
    const optionLines = intervention.options.flatMap((option) => [
      `  ${option.slot}. ${casebookLabel("routes", option.route, options.lang)}`,
      `     ${localized(options.lang, "作用", "EFFECT")}  ${casebookLabel("benefits", option.benefitId, options.lang)}`,
      `     ${localized(options.lang, "代价", "COST")}  ${casebookLabel("costs", option.costId, options.lang)}`,
    ]);
    process.stdout.write(
      [
        localized(options.lang, "分叉病历 · 转折病例", "FORKED CASEBOOK · TURNING CASE"),
        `${localized(options.lang, "病例", "CASE")} #${intervention.id} · ${casebookLabel("cases", intervention.caseId, options.lang)}`,
        `${localized(options.lang, "状态", "STATUS")}  ${localized(options.lang, intervention.status === "pending" ? "待处理" : "已封存", intervention.status.toUpperCase())}`,
        "",
        ...(intervention.status === "pending"
          ? optionLines
          : [
              `${localized(options.lang, "已选择", "SELECTED")}  ${intervention.selected.slot}. ${casebookLabel("routes", intervention.selected.route, options.lang)}`,
              `${localized(options.lang, "后遗症", "AFTEREFFECT")}  ${casebookLabel("marks", intervention.selected.markId, options.lang)}`,
            ]),
        "",
        ...(intervention.status === "pending"
          ? [
              localized(
                options.lang,
                "运行 anti-ai creature intervene <1|2|3> 封存选择。",
                "Run anti-ai creature intervene <1|2|3> to seal a choice.",
              ),
            ]
          : []),
        "",
      ].join("\n"),
    );
    return;
  }

  if (options.action === "history") {
    const history = creatureHistory(state, date, { full: options.full });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(history, null, 2)}\n`);
      return;
    }
    const eventLines = history.events.map((event) => {
      let label;
      if (event.type === "hatch") {
        label = localized(options.lang, "首次孵化", "INITIAL HATCH");
      } else if (event.type === "stage") {
        label = creatureLabel("stages", event.id, options.lang);
      } else if (event.type === "rare_mutation") {
        label = `${localized(options.lang, "稀有突变", "RARE MUTATION")} · ${CREATURE_COPY.events[event.id].name[options.lang]}`;
      } else if (event.type === "chromatic") {
        label = `${localized(options.lang, "异色觉醒", "CHROMATIC AWAKENING")} · ${creatureLabel("rareAbilities", event.id, options.lang)} +${event.levelGain}`;
      } else if (event.type === "achievement") {
        label = `${localized(options.lang, "徽章解锁", "BADGE UNLOCKED")} · ${creatureLabel("achievements", event.id, options.lang)}`;
      } else if (event.type === "fossil") {
        label = `${localized(options.lang, "永久化石", "PERMANENT FOSSIL")} · #${event.id} · ${generationLabel(event.generation, options.lang)}`;
      } else if (event.type === "evolution_selected") {
        label = `${localized(options.lang, "进化封存", "EVOLUTION SEALED")} · ${generationLabel(event.generation, options.lang)} · ${creatureLabel("evolutions", event.evolutionId, options.lang)}`;
      } else if (event.type === "case_offered") {
        label = `${localized(options.lang, "转折病例", "TURNING CASE")} · ${casebookLabel("cases", event.caseId, options.lang)}`;
      } else if (event.type === "case_selected") {
        label = `${localized(options.lang, "选择封存", "SEALED CHOICE")} · ${casebookLabel("routes", event.routeId, options.lang)} · ${casebookLabel("marks", event.markId, options.lang)}`;
      } else if (event.type === "incident_opened") {
        label = `${localized(options.lang, "收容事故", "CONTAINMENT INCIDENT")} · ${incidentLabel("incidents", event.incidentId, options.lang)}`;
      } else if (event.type === "incident_selected") {
        label = `${localized(options.lang, "事故响应", "INCIDENT RESPONSE")} · ${incidentLabel("stances", event.stanceId, options.lang)}`;
      } else if (event.type === "incident_aftermath") {
        label = `${localized(options.lang, "延迟后果", "DELAYED AFTERMATH")} · ${incidentLabel("aftermaths", event.outcomeId, options.lang)}`;
      } else if (event.type === "expedition_started") {
        label = `${localized(options.lang, "远征开启", "EXPEDITION STARTED")} · ${expeditionDestination(event.destinationId).name[options.lang]}`;
      } else {
        label = `${localized(options.lang, event.type === "expedition_returned" ? "远征返航" : "远征放弃", event.type === "expedition_returned" ? "EXPEDITION RETURNED" : "EXPEDITION ABANDONED")} · ${expeditionDestination(event.destinationId).name[options.lang]} · ${event.cells} / 10`;
      }
      return `  ${event.date}  ${label}`;
    });
    const usageBandLabels = {
      sober: ["AI 清醒", "AI-FREE"],
      calibrating: ["校准污染", "CALIBRATING"],
      restrained: ["节制使用", "RESTRAINED"],
      light: ["轻量使用", "LIGHT"],
      habitual: ["惯常使用", "HABITUAL"],
      heavy: ["重度使用", "HEAVY"],
      binge: ["暴食使用", "BINGE"],
      meltdown: ["熔毁使用", "MELTDOWN"],
    };
    const dailyLines = (history.daily ?? []).map((day) => {
      const band =
        usageBandLabels[day.usageBand]?.[options.lang === "zh" ? 0 : 1] ??
        day.usageBand.toUpperCase();
      return `  ${day.date}  ${localized(options.lang, `阅历 ${day.experienceDay} · ${day.status === "active" ? "活跃" : "休眠"} · ${band}`, `EXPERIENCE ${day.experienceDay} · ${day.status.toUpperCase()} · ${band}`)}`;
    });
    process.stdout.write(
      [
        localized(options.lang, "分叉病历 · 关键病程", "FORKED CASEBOOK · KEY HISTORY"),
        `${localized(options.lang, "观察", "OBSERVED")}  ${history.observedDays} ${localized(options.lang, "天", "DAYS")} · ${localized(options.lang, "关键节点", "KEY EVENTS")} ${history.totalEvents}`,
        "",
        ...(eventLines.length > 0
          ? eventLines
          : [
              `  ${localized(options.lang, "尚未孵化", "NOT YET HATCHED")}`,
            ]),
        ...(dailyLines.length > 0
          ? [
              "",
              localized(options.lang, "逐日病程", "DAILY COURSE"),
              ...dailyLines,
            ]
          : []),
        "",
      ].join("\n"),
    );
    return;
  }

  if (options.action === "prognosis") {
    const prognosis = creaturePrognosis(state, date, creature);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(prognosis, null, 2)}\n`);
      return;
    }
    const routeLines = prognosis.routes.flatMap((route) => [
      `  [${casebookLabel("likelihoods", route.likelihood, options.lang)}] ${casebookLabel("routes", route.route, options.lang)}`,
      `    ${localized(options.lang, "可能病例", "POSSIBLE CASE")}  ${casebookLabel("cases", route.previewCaseId, options.lang)}`,
      ...route.driverIds.map(
        (driverId) =>
          `    · ${casebookLabel("drivers", driverId, options.lang)}`,
      ),
    ]);
    process.stdout.write(
      [
        localized(options.lang, "分叉病历 · 三路预演", "FORKED CASEBOOK · THREE-WAY PROGNOSIS"),
        `${localized(options.lang, "观察窗口", "WINDOW")}  ${prognosis.window.minDays}–${prognosis.window.maxDays} ${localized(options.lang, "个阅历日", "EXPERIENCE DAYS")}`,
        "",
        ...routeLines,
        "",
        localized(
          options.lang,
          "这是可解释的方向预演，不是精确概率、任务或奖励承诺。",
          "This is an explainable directional preview, not a precise probability, task, or reward promise.",
        ),
        "",
      ].join("\n"),
    );
    return;
  }

  if (options.action === "evolve") {
    const evolution = evolutionAction.value;
    if (options.json) {
      process.stdout.write(`${JSON.stringify(evolution, null, 2)}\n`);
      return;
    }
    process.stdout.write(
      [
        localized(
          options.lang,
          `第 ${evolution.generation} 代进化 · ${evolution.status === "pending" ? "待选择" : "已封存"}`,
          `GENERATION ${evolution.generation} EVOLUTION · ${evolution.status.toUpperCase()}`,
        ),
        "",
        ...(evolution.status === "pending"
          ? renderEvolutionOptions(evolution, options.lang)
          : [
              `${localized(options.lang, "已选择", "SELECTED")}  [${creatureLabel("evolutionCategories", evolution.selected.category, options.lang)}] ${creatureLabel("evolutions", evolution.selected.id, options.lang)}`,
            ]),
        "",
        ...(evolution.status === "pending"
          ? [
              localized(
                options.lang,
                "运行 anti-ai creature evolve <1|2|3> 确认选择。",
                "Run anti-ai creature evolve <1|2|3> to seal a choice.",
              ),
            ]
          : []),
        "",
      ].join("\n"),
    );
    return;
  }

  const previousCreature = deriveCreature(state, shiftDate(date, -1));
  const today = state.days[date];
  const currentIncident = currentCreatureIncident(state, date);
  const codex = creatureCodex(state, date);
  const newTalents = creature.talents.filter(
    (talent) => !previousCreature.talents.includes(talent),
  );
  const result = {
    date,
    status: today.active ? "active" : "dormant",
    ...creature,
    collectionPhenotype: codex.collectionPhenotype,
    mood: creatureMood(creature, today),
    today: {
      contentVersion: today.contentVersion ?? 1,
      balanceVersion: today.balanceVersion ?? 1,
      pollutionDose: today.pollutionDose,
      usageBand: today.usageBand,
      ecologyGains: today.ecologyGains,
      event: today.event,
      abilityGains: today.abilityGains,
      rareAbilityGain: today.rareAbilityGain,
      achievementUnlockIds: today.achievementUnlockIds,
      newTalents,
      evolutionEffect: today.evolutionEffect ?? null,
    },
    casebook: {
      current: currentCreatureIntervention(state, date),
      selectedCount: (state.casebook?.cases ?? []).filter(
        (entry) =>
          entry.status === "selected" &&
          entry.selectedAt !== null &&
          entry.selectedAt <= date,
      ).length,
    },
    incident: {
      current: currentIncident,
      resolvedCount: (state.incidents?.records ?? []).filter(
        (entry) =>
          entry.aftermath?.status === "resolved" &&
          entry.aftermath.resolvedAt <= date,
      ).length,
      dispositions: {
        quarantine: state.incidents?.dispositions?.quarantine ?? 0,
        observe: state.incidents?.dispositions?.observe ?? 0,
        resonate: state.incidents?.dispositions?.resonate ?? 0,
      },
    },
    companion: laboratoryCompanion(state, date).companion,
  };

  if (options.action === "export") {
    const exported = exportSpecimenCode(result);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(exported, null, 2)}\n`);
    } else {
      process.stdout.write(
        [
          localized(
            options.lang,
            "异变体污染编码",
            "MUTATION POLLUTION CODE",
          ),
          "",
          `${localized(options.lang, "污染编码", "POLLUTION CODE")}  ${exported.code}`,
          `${localized(options.lang, "标本编号", "SPECIMEN ID")}  ${exported.specimenId}`,
          `${localized(options.lang, "外观指纹", "APPEARANCE FINGERPRINT")}  ${exported.fingerprint}`,
          "",
          localized(
            options.lang,
            "隐私编码：不包含精确 Token、模型、路径或对话。",
            "PRIVATE CODE: contains no exact tokens, models, paths, or chats.",
          ),
          "",
        ].join("\n"),
      );
    }
    return;
  }

  if (["context", "snapshot-context"].includes(mode)) {
    return { result, state };
  }
  if (["result", "snapshot-result"].includes(mode)) return result;
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const lang = options.lang;
  const collectionPhenotype = collectionPhenotypeCopy(
    result.collectionPhenotype,
    lang,
  );
  const eventCopy = today.event
    ? CREATURE_COPY.events[today.event.id]
    : undefined;
  const rarity = today.event
    ? localized(
        lang,
        today.event.rarity === "rare" ? "稀有" : "普通",
        today.event.rarity.toUpperCase(),
      )
    : undefined;
  const statusLine =
    result.status === "dormant"
      ? `${localized(lang, "状态", "STATUS")}  ${localized(lang, `休眠 · 连续 ${result.quietStreakDays} 个 AI 清醒日`, `DORMANT · ${result.quietStreakDays} AI-free days`)}`
      : `${localized(lang, "状态", "STATUS")}  ${localized(lang, "正在进食", "FEEDING")}`;
  const eventLines = eventCopy
    ? [
        `${localized(lang, "今日突变", "TODAY'S MUTATION")}  [${rarity}] ${eventCopy.name[lang]}`,
        `  ${eventCopy.body[lang]}`,
      ]
    : [
        `${localized(lang, "今日突变", "TODAY'S MUTATION")}  ${localized(lang, "无 · 今日未进食，污染 -2", "NONE · no feeding today, exposure -2")}`,
      ];
  const abilityDisplayLabels = Object.fromEntries(
    CREATURE_ABILITY_KEYS.map((ability) => {
      const rank = result.malignancyRanks[ability];
      const suffix =
        rank === 0
          ? ""
          : localized(
              lang,
              ` · 恶性 ${creatureMalignancyRankLabel(rank)}`,
              ` · MALIGNANT ${creatureMalignancyRankLabel(rank)}`,
            );
      return [ability, `${creatureLabel("abilities", ability, lang)}${suffix}`];
    }),
  );
  const abilityLabelWidth = Math.max(
    ...Object.values(abilityDisplayLabels).map((label) =>
      terminalWidth(label),
    ),
  );
  const abilityLines = CREATURE_ABILITY_KEYS.map((ability) => {
    const rank = result.malignancyRanks[ability];
    const malignancyColor =
      rank >= 3 ? "1;33" : rank === 2 ? "1;35" : "1;31";
    const label = padTerminal(abilityDisplayLabels[ability], abilityLabelWidth);
    const renderedLabel = rank === 0 ? label : color(malignancyColor, label);
    return `  ${renderedLabel}  ${creatureAbilityBar(result.abilities[ability])} ${String(result.abilities[ability]).padStart(3, " ")} / ${CREATURE_ABILITY_MAX}`;
  });
  const malignancyPreview = result.malignancies
    .map(
      (entry) =>
        `${creatureLabel("malignancyTitles", entry.titleId, lang)} ${creatureMalignancyRankLabel(entry.rank)}`,
    )
    .join(" · ");
  const malignancyLine = `${localized(lang, "恶性增殖", "MALIGNANT GROWTH")}  [${result.malignancies.length}] ${malignancyPreview || localized(lang, "尚未越界", "CONTAINED")}`;
  const growth = CREATURE_ABILITY_KEYS.filter(
    (ability) => today.abilityGains[ability] > 0,
  )
    .map(
      (ability) =>
        `${creatureLabel("abilities", ability, lang)} +${today.abilityGains[ability]}`,
    )
    .join(" · ");
  const talentPreview = result.talents
    .slice(-4)
    .map((talent) => creatureLabel("talents", talent, lang))
    .join(" · ");
  const newTalentPreview = result.today.newTalents
    .map((talent) => creatureLabel("talents", talent, lang))
    .join(" · ");
  const rareAbilityEntries = Object.entries(result.rareAbilities);
  const rareAbilityLabelWidth = Math.max(
    0,
    ...rareAbilityEntries.map(([ability, details]) => {
      const rank = CREATURE_RARE_ABILITY_RANKS[details.rarity];
      return terminalWidth(
        `[${rank.badge}] ${creatureLabel("rareAbilities", ability, lang)}`,
      );
    }),
  );
  const rareAbilityLines =
    rareAbilityEntries.length === 0
      ? [`  ${localized(lang, "尚未觉醒 · 它目前只是普通地失控", "LOCKED · currently failing in ordinary ways")}`]
      : rareAbilityEntries.flatMap(([ability, details]) => {
          const rank = CREATURE_RARE_ABILITY_RANKS[details.rarity];
          const label = padTerminal(
            `[${rank.badge}] ${creatureLabel("rareAbilities", ability, lang)}`,
            rareAbilityLabelWidth,
          );
          const bar = `${"◆".repeat(details.level)}${"◇".repeat(CREATURE_RARE_ABILITY_MAX - details.level)}`;
          return [
            `  ${color(rank.color, label)}  ${bar} ${details.level} / ${CREATURE_RARE_ABILITY_MAX}`,
            `      ${color("2", creatureLabel("rareAbilityDescriptions", ability, lang))}`,
          ];
        });
  const rareAbilityGain = today.rareAbilityGain
    ? (() => {
        const rank =
          CREATURE_RARE_ABILITY_RANKS[today.rareAbilityGain.rarity];
        const label = `[${rank.badge}] ${creatureLabel("rareAbilities", today.rareAbilityGain.id, lang)} +${today.rareAbilityGain.points}`;
        return color(rank.color, label);
      })()
    : localized(lang, "无", "NONE");
  const rareAbilityOdds = Object.entries(CREATURE_RARE_ABILITY_CHANCES)
    .map(([rarityId, chance]) => {
      const rank = CREATURE_RARE_ABILITY_RANKS[rarityId];
      return color(rank.color, `${rank.badge} ${chance.toFixed(2)}%`);
    })
    .join(" · ");
  const achievementPreview = result.achievements.unlocked
    .slice(-4)
    .map((achievement) => achievementLabel(achievement, lang))
    .join(" · ");
  const recentAchievementPreview = result.achievements.recent
    .map((achievement) => achievementLabel(achievement, lang))
    .join(" · ");
  const ecologyGain = [
    today.ecologyGains.pollution > 0
      ? `${localized(lang, "污染性", "POLLUTION")} +${today.ecologyGains.pollution}`
      : null,
    today.ecologyGains.clarity > 0
      ? `${localized(lang, "清醒性", "CLARITY")} +${today.ecologyGains.clarity}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const fossilPreview = result.fossils.at(-1);
  const fossilMalignancyGain = Object.values(
    fossilPreview?.malignancyGains ?? {},
  ).reduce((total, value) => total + value, 0);
  const fossilLines = fossilPreview
    ? [
        `  #${fossilPreview.id} · ${generationLabel(fossilPreview.generation, lang)} · ${creatureLabel("ecologies", fossilPreview.ecologyId, lang)} · ${creatureLabel("abilities", fossilPreview.inheritanceAbilityId, lang)} · ${creatureLabel("scars", fossilPreview.scarId, lang)}${fossilMalignancyGain > 0 ? localized(lang, ` · 恶性阶 +${fossilMalignancyGain}`, ` · MALIGNANCY +${fossilMalignancyGain}`) : ""}`,
      ]
    : [`  ${localized(lang, "尚未形成 · 90 天后再来考古", "NONE · archaeology begins after day 90")}`];
  const evolutionLines = result.evolution
    ? [
        `${localized(lang, "下一代进化", "NEXT EVOLUTION")}  ${generationLabel(result.evolution.generation, lang)} · ${localized(lang, result.evolution.status === "pending" ? "待选择" : "已封存", result.evolution.status.toUpperCase())}`,
        ...(result.evolution.status === "pending"
          ? renderEvolutionOptions(result.evolution, lang)
          : [
              `${localized(lang, "进化规则", "EVOLUTION RULE")}  [${creatureLabel("evolutionCategories", result.evolution.selected.category, lang)}] ${creatureLabel("evolutions", result.evolution.selected.id, lang)} · ${localized(lang, "触发", "PROC")} ${result.evolution.selected.procChancePercent}% · ${localized(lang, `累计发作 ${result.collections.evolutionTriggers} 次`, `${result.collections.evolutionTriggers} LIFETIME PROCS`)}`,
              `  ${localized(lang, `累计收益 ${result.collections.evolutionBenefitPoints} · 累计代价 ${result.collections.evolutionCostPoints}`, `LIFETIME BENEFIT ${result.collections.evolutionBenefitPoints} · LIFETIME COST ${result.collections.evolutionCostPoints}`)}`,
            ]),
        ...(result.evolution.status === "pending"
          ? [
              `  ${localized(lang, "运行", "RUN")} anti-ai creature evolve <1|2|3>`,
            ]
          : []),
      ]
    : [];
  const casebookLines =
    result.casebook.current === null
      ? []
      : result.casebook.current.status === "pending"
        ? [
            `${localized(lang, "转折病例", "TURNING CASE")}  ${localized(lang, "待处理", "PENDING")} · ${casebookLabel("cases", result.casebook.current.caseId, lang)}`,
            `${localized(lang, "病例处置", "CASE ACTION")}  anti-ai creature intervene`,
          ]
        : [
            `${localized(lang, "病例后遗症", "CASE AFTEREFFECT")}  ${casebookLabel("marks", result.casebook.current.selected.markId, lang)}`,
          ];
  const incidentLines =
    result.incident.current === null
      ? []
      : result.incident.current.status === "pending"
        ? [
            `${localized(lang, "收容事故", "CONTAINMENT INCIDENT")}  ${localized(lang, "待响应", "PENDING")} · ${incidentLabel("incidents", result.incident.current.incidentId, lang)}`,
            `${localized(lang, "事故响应", "INCIDENT RESPONSE")}  anti-ai creature incident`,
          ]
        : result.incident.current.status === "awaiting_aftermath"
          ? [
              `${localized(lang, "收容事故", "CONTAINMENT INCIDENT")}  ${localized(lang, "等待延迟后果", "AWAITING AFTERMATH")} · ${incidentLabel("incidents", result.incident.current.incidentId, lang)}`,
              `${localized(lang, "延迟后果", "DELAYED AFTERMATH")}  ${localized(lang, `将在阅历 ${result.incident.current.aftermath.dueAtExperience} 结算`, `settles at experience ${result.incident.current.aftermath.dueAtExperience}`)}`,
            ]
          : [
              `${localized(lang, "事故结论", "INCIDENT OUTCOME")}  ${incidentLabel("aftermaths", result.incident.current.aftermath.outcomeId, lang)}`,
              `${localized(lang, "事故响应", "INCIDENT RESPONSE")}  ${incidentLabel("stances", result.incident.current.selected.stance, lang)} · ${localized(lang, "已封存", "SEALED")}`,
            ];
  const companionRouteColor = {
    unformed: "2",
    pollution: "1;31",
    clarity: "1;36",
    paradox: "1;33",
  };
  const companionPanel =
    result.companion === null
      ? []
      : [
          color(
            companionRouteColor[result.companion.routeId],
            localized(
              lang,
              `伴生异物 · #${result.companion.cultureId}`,
              `SYMBIOTIC COMPANION · #${result.companion.cultureId}`,
            ),
          ),
          ...result.companion.appearance.lines.map((line) => `  ${line}`),
          `${localized(lang, "阶段", "STAGE")}  ${companionLabel("stages", result.companion.stageId, lang)}`,
          `${localized(lang, "路线", "ROUTE")}  ${companionLabel("routes", result.companion.routeId, lang)}`,
          `${localized(lang, "印记", "IMPRINTS")}  ${result.companion.imprintCounts.total}${result.companion.nextStageAt === null ? " · MAX" : ` / ${result.companion.nextStageAt}`}`,
          `${localized(lang, "异常", "ANOMALIES")}  [${result.companion.anomalyIds.length}]`,
        ];

  const fullLines = [
      `TOKEN MUTATION FILE · ${date}`,
      "",
      creatureArt(result),
      ...(companionPanel.length > 0 ? ["", ...companionPanel] : []),
      "",
      `${localized(lang, "标本编号", "SPECIMEN ID")}  ${result.appearance.specimenId}`,
      `☢ ${localized(lang, "今日污染剂量", "TODAY'S POLLUTION DOSE")}  +${today.pollutionDose}`,
      statusLine,
      `${localized(lang, "阶段", "STAGE")}  ${creatureLabel("stages", result.stage, lang)} · ${result.progressPercent}%`,
      `${localized(lang, "进化分支", "EVOLUTION BRANCH")}  ${creatureLabel("branches", result.branch, lang)}`,
      `${localized(lang, "生态人格", "ECOLOGY")}  ${creatureLabel("ecologies", result.ecology.type, lang)} · ${localized(lang, `污染 ${result.ecology.pollution} / 清醒 ${result.ecology.clarity}`, `pollution ${result.ecology.pollution} / clarity ${result.ecology.clarity}`)}`,
      `${localized(lang, "今日生态", "TODAY'S ECOLOGY")}  ${ecologyGain || localized(lang, "惯常波动", "HABITUAL DRIFT")}`,
      `${localized(lang, "形态", "FORM")}  ${creatureLabel("ecologyForms", result.ecologyForm, lang)}`,
      `${localized(lang, "馆藏异变", "COLLECTION MUTATION")}  ${collectionPhenotype ? `${collectionPhenotype.name} · ${localized(lang, `阶段 ${collectionPhenotype.tier}`, `TIER ${collectionPhenotype.tier}`)}` : localized(lang, "尚未诱发", "NOT YET INDUCED")}`,
      `${localized(lang, "称号", "EPITHET")}  ${creatureTitle(result, lang)}`,
      `${localized(lang, "性格", "TEMPERAMENT")}  ${creatureLabel("temperaments", result.temperament, lang)} · ${localized(lang, "心情", "MOOD")}  ${creatureLabel("moods", result.mood, lang)}`,
      `${localized(lang, "阅历", "EXPERIENCE")}  ${result.experienceDays}${result.nextStageAt === null ? localized(lang, " 天", " days") : localized(lang, ` / ${result.nextStageAt} 天`, ` / ${result.nextStageAt} days`)}`,
      `${localized(lang, "累积污染", "ACCUMULATED EXPOSURE")}  ${result.exposure}`,
      `${localized(lang, "个体记录", "SPECIMEN LOG")}  ${localized(lang, `孵化 ${result.ageDays} 天 · 活跃连击 ${result.activeStreakDays} 天`, `age ${result.ageDays} days · active streak ${result.activeStreakDays} days`)}`,
      `${localized(lang, "世代", "GENERATION")}  ${generationLabel(result.generation.number, lang)} · ${result.generation.day} / ${result.generation.length} ${localized(lang, "天", "DAYS")}`,
      `${localized(lang, "遗传", "INHERITANCE")}  ${result.generation.inheritedAbilityId ? creatureLabel("abilities", result.generation.inheritedAbilityId, lang) : localized(lang, "无", "NONE")} · ${localized(lang, "伤疤", "SCAR")}  ${result.generation.scarId ? creatureLabel("scars", result.generation.scarId, lang) : localized(lang, "无", "NONE")}`,
      `${localized(lang, "永久化石", "PERMANENT FOSSILS")}  [${result.fossils.length}]`,
      ...fossilLines,
      ...evolutionLines,
      ...casebookLines,
      ...incidentLines,
      `${localized(lang, "徽章", "BADGES")}  [${result.achievements.unlocked.length}] ${achievementPreview || localized(lang, "尚未解锁", "LOCKED")}`,
      `${localized(lang, "今日成就", "TODAY'S ACHIEVEMENTS")}  ${recentAchievementPreview || localized(lang, "无", "NONE")}`,
      "",
      `${localized(lang, `能力值 · Lv.${result.level}`, `ABILITIES · LV.${result.level}`)}  (${result.abilityPoints} pts)`,
      ...abilityLines,
      malignancyLine,
      `${localized(lang, "今日加点", "TODAY'S GROWTH")}  ${growth || localized(lang, "无", "NONE")}`,
      `${localized(lang, "稀有突变率", "RARE MUTATION CHANCE")}  ${result.rareChancePercent}%`,
      `${localized(lang, "畸变天赋", "MUTATION TALENTS")}  [${result.talents.length}] ${talentPreview || localized(lang, "尚未解锁", "LOCKED")}`,
      `${localized(lang, "今日解锁", "TODAY'S UNLOCKS")}  ${newTalentPreview || localized(lang, "无", "NONE")}`,
      "",
      `${localized(lang, "异色能力", "CHROMATIC ABILITIES")}  [${rareAbilityEntries.length}]`,
      ...rareAbilityLines,
      `${localized(lang, "今日异色", "TODAY'S CHROMATIC GAIN")}  ${rareAbilityGain}`,
      `${localized(lang, "每日觉醒率", "DAILY AWAKENING ODDS")}  ${rareAbilityOdds}`,
      "",
      ...eventLines,
      "",
      localized(
        lang,
        "隐私档案：只保存用量带、派生生态点、基因/部件 ID、成就、化石、进化选择、污染剂量、性状、能力与事件；不保存对话、路径、模型名或精确 Token。",
        "PRIVACY FILE: stores usage bands, derived ecology, gene/part IDs, achievements, fossils, evolution choices, dose, traits, ability gains, and events; stores no chats, paths, model names, or exact tokens.",
      ),
      "",
    ];
  const configuredWidth =
    Number(process.env.COLUMNS) || process.stdout.columns || 0;
  if (options.full || configuredWidth === 0) {
    process.stdout.write(fullLines.join("\n"));
    return;
  }

  const truncateLine = (value, width) => {
    const source = String(value);
    if (terminalWidth(source) <= width) return source;
    let output = "";
    let visible = "";
    let hasAnsi = false;
    const tokens = source.match(/\u001B\[[0-9;]*m|./gu) ?? [];
    for (const token of tokens) {
      if (token.startsWith("\u001B[")) {
        output += token;
        hasAnsi = true;
        continue;
      }
      if (terminalWidth(`${visible}${token}…`) > width) break;
      output += token;
      visible += token;
    }
    return `${output}…${hasAnsi ? "\u001B[0m" : ""}`;
  };
  const joinColumns = (left, right, leftWidth, totalWidth) => {
    const count = Math.max(left.length, right.length);
    return Array.from({ length: count }, (_, index) => {
      const leftLine = truncateLine(left[index] ?? "", leftWidth);
      const rightWidth = Math.max(10, totalWidth - leftWidth - 3);
      const rightLine = truncateLine(right[index] ?? "", rightWidth);
      return `${padTerminal(leftLine, leftWidth)} │ ${rightLine}`.trimEnd();
    });
  };
  const artLines = creatureArt(result).split("\n").filter(Boolean);
  const overviewLines = [
    `${localized(lang, "标本编号", "SPECIMEN ID")}  ${result.appearance.specimenId}`,
    `☢ ${localized(lang, "今日污染剂量", "TODAY'S POLLUTION DOSE")}  +${today.pollutionDose}`,
    statusLine,
    `${localized(lang, "阶段", "STAGE")}  ${creatureLabel("stages", result.stage, lang)} · ${result.progressPercent}%`,
    `${localized(lang, "进化分支", "EVOLUTION BRANCH")}  ${creatureLabel("branches", result.branch, lang)}`,
    `${localized(lang, "生态人格", "ECOLOGY")}  ${creatureLabel("ecologies", result.ecology.type, lang)} · ${localized(lang, `污染 ${result.ecology.pollution} / 清醒 ${result.ecology.clarity}`, `pollution ${result.ecology.pollution} / clarity ${result.ecology.clarity}`)}`,
    `${localized(lang, "形态", "FORM")}  ${creatureLabel("ecologyForms", result.ecologyForm, lang)}`,
    `${localized(lang, "馆藏异变", "COLLECTION MUTATION")}  ${collectionPhenotype ? `${collectionPhenotype.name} · ${localized(lang, `阶段 ${collectionPhenotype.tier}`, `TIER ${collectionPhenotype.tier}`)}` : localized(lang, "尚未诱发", "NOT YET INDUCED")}`,
    ...(companionPanel.length > 0 ? ["", ...companionPanel] : []),
  ];
  const stateLines = [
    `${localized(lang, "称号", "EPITHET")}  ${creatureTitle(result, lang)}`,
    `${localized(lang, "性格", "TEMPERAMENT")}  ${creatureLabel("temperaments", result.temperament, lang)} · ${localized(lang, "心情", "MOOD")} ${creatureLabel("moods", result.mood, lang)}`,
    `${localized(lang, "阅历", "EXPERIENCE")}  ${result.experienceDays}${result.nextStageAt === null ? localized(lang, " 天", " days") : localized(lang, ` / ${result.nextStageAt} 天`, ` / ${result.nextStageAt} days`)}`,
    `${localized(lang, "世代", "GENERATION")}  ${generationLabel(result.generation.number, lang)} · ${result.generation.day} / ${result.generation.length}`,
    `${localized(lang, "累积污染", "EXPOSURE")}  ${result.exposure}`,
    `${localized(lang, "徽章", "BADGES")}  [${result.achievements.unlocked.length}] ${achievementPreview || localized(lang, "尚未解锁", "LOCKED")}`,
    `${localized(lang, "畸变天赋", "MUTATION TALENTS")}  [${result.talents.length}] ${talentPreview || localized(lang, "尚未解锁", "LOCKED")}`,
  ];
  const abilityColumnWidth = Math.min(
    Math.max(43, ...abilityLines.map((line) => terminalWidth(line))),
    Math.max(43, configuredWidth - 33),
  );
  const compactLines = [
    `TOKEN MUTATION FILE · ${date}`,
    "",
    ...(configuredWidth >= 100
      ? joinColumns(artLines, overviewLines, 39, configuredWidth)
      : [...artLines, "", ...overviewLines]),
    "",
    `${localized(lang, `能力值 · Lv.${result.level}`, `ABILITIES · LV.${result.level}`)}  (${result.abilityPoints} pts)`,
    ...(configuredWidth >= 100
      ? joinColumns(
          abilityLines,
          stateLines,
          abilityColumnWidth,
          configuredWidth,
        )
      : [...abilityLines, "", ...stateLines]),
    malignancyLine,
    `${localized(lang, "今日加点", "TODAY'S GROWTH")}  ${growth || localized(lang, "无", "NONE")}`,
    `${localized(lang, "稀有突变率", "RARE MUTATION CHANCE")}  ${result.rareChancePercent}% · ${localized(lang, "每日觉醒率", "DAILY AWAKENING ODDS")} ${rareAbilityOdds}`,
    `${localized(lang, "异色能力", "CHROMATIC ABILITIES")}  [${rareAbilityEntries.length}] · ${localized(lang, "今日", "TODAY")} ${rareAbilityGain}`,
    ...eventLines,
    ...casebookLines,
    ...incidentLines,
    `${localized(lang, "完整病历", "FULL CASEBOOK")}  anti-ai creature --full`,
    localized(
      lang,
      "隐私档案：只保存派生成长状态；不保存对话、路径、模型名或精确 Token。",
      "PRIVACY FILE: derived growth only; no chats, paths, model names, or exact tokens.",
    ),
    "",
  ].map((line) => truncateLine(line, configuredWidth));
  process.stdout.write(compactLines.join("\n"));
}

export { runCreature };
