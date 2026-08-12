import {
  deriveCreature,
  creatureLabel,
  loadCreatureState,
} from "../creature.mjs";
import {
  EXPEDITION_DESTINATIONS,
  expeditionHistory,
  expeditionStatus,
} from "../expedition.mjs";
import { localDate } from "../scanner.mjs";
import { localized } from "../shared.mjs";
import { executeContainmentMutation } from "../application/action-execution.mjs";
import {
  expeditionChoiceCopy,
  expeditionDestination,
} from "../expedition/content.mjs";
import {
  expeditionEventView,
  expeditionRail,
  expeditionReturnSummary,
} from "../expedition/presentation.mjs";

function eventEffectLine(effect, lang) {
  if (!effect) return null;
  return `  ${effect.ability} ${effect.delta >= 0 ? "+" : ""}${effect.delta} · ${effect.durationLabel}`;
}

function expeditionActionError(reason, options) {
  const messages = {
    invalid_destination: [
      `未知远征目的地：${options.destination ?? ""}`,
      `Unknown expedition destination: ${options.destination ?? ""}`,
    ],
    expedition_active: [
      "已有远征正在进行；请继续或放弃当前远征。",
      "An expedition is already active; continue or abandon it first.",
    ],
    unhatched: [
      "异变体尚未孵化；请先运行 anti-ai today。",
      "The creature has not hatched; run anti-ai today first.",
    ],
    expedition_used: [
      "今天的远征机会已经使用。",
      "Today's expedition opportunity is already used.",
    ],
    expedition_expired: [
      "所选日期的远征机会已过期；机会按本地自然日开放且不会累计。",
      "The selected date's expedition opportunity has expired; local-calendar-day opportunities do not stack.",
    ],
    no_active_expedition: [
      "当前没有进行中的远征。",
      "No expedition is currently active.",
    ],
    expedition_choice_required: [
      "必须先处理当前分叉，再进入下一格。",
      "Resolve the current branch before entering the next cell.",
    ],
    no_expedition_choice: [
      "当前格没有需要处理的分叉。",
      "The current cell has no unresolved branch.",
    ],
    invalid_choice: [
      "远征选择必须是 1、2 或 3。",
      "Expedition choice must be 1, 2, or 3.",
    ],
    expedition_date_before_last_action: [
      "操作日期不能早于远征最近一次操作日期。",
      "The action date cannot be earlier than the expedition's latest action date.",
    ],
  };
  return localized(
    options.lang,
    ...(messages[reason] ?? [
      "远征操作当前不可用。",
      "The expedition action is currently unavailable.",
    ]),
  );
}

function renderExpeditionStatus(status, lang) {
  const eligibility = status.eligibility.available
    ? localized(lang, "今日可开启", "AVAILABLE TODAY")
    : {
        active: localized(lang, "远征进行中", "EXPEDITION ACTIVE"),
        unhatched: localized(lang, "异变体尚未孵化", "CREATURE NOT HATCHED"),
        used: localized(lang, "今日机会已使用", "USED TODAY"),
        expired: localized(lang, "所选日期已过期", "SELECTED DATE EXPIRED"),
      }[status.eligibility.reason];
  const active = status.active ?? status.latest;
  const destination = active
    ? expeditionDestination(active.destinationId)
    : null;
  const latestEvent = active?.events.at(-1) ?? null;
  const eventView = latestEvent && active
    ? expeditionEventView(active, latestEvent, lang)
    : null;
  const summary = active ? expeditionReturnSummary(active, lang) : null;
  return [
    destination
      ? localized(
          lang,
          `收容远征 · ${destination.name.zh}`,
          `CONTAINMENT EXPEDITION · ${destination.name.en}`,
        )
      : localized(lang, "收容远征", "CONTAINMENT EXPEDITION"),
    `${localized(lang, "状态", "STATUS")}  ${eligibility}`,
    `${localized(lang, "阅历", "EXPERIENCE")}  ${status.eligibility.experienceDays}`,
    ...(active
      ? [
          expeditionRail(active),
          localized(
            lang,
            `第 ${active.step} / 10 格`,
            `CELL ${active.step} / 10`,
          ),
          ...(status.active && latestEvent
            ? [
                "",
                `${localized(lang, "最近事件", "LATEST EVENT")}  [${eventView.badge}] ${eventView.title}`,
                `  ${eventView.body}`,
                ...(eventView.effect
                  ? [eventEffectLine(eventView.effect, lang)]
                  : []),
                ...(eventView.artifact
                  ? [
                      `  ${localized(lang, "发现", "FOUND")}  ${eventView.artifact.name} · ${eventView.artifact.rarity.toUpperCase()}`,
                    ]
                  : []),
                `  ${eventView.system}`,
                ...(active.pendingChoice
                  ? [
                      "",
                      ...active.pendingChoice.options.map(
                        (option) =>
                          `  ${option.slot}. ${expeditionChoiceCopy(active.destinationId, option.slot, lang)} · ${creatureLabel("abilities", option.effect.abilityId, lang)} ${option.effect.delta >= 0 ? "+" : ""}${option.effect.delta}`,
                      ),
                      localized(
                        lang,
                        "运行 anti-ai expedition choose <1|2|3> 封存选择。",
                        "Run anti-ai expedition choose <1|2|3> to seal a choice.",
                      ),
                    ]
                  : []),
                ...(active.events.length > 1
                  ? [
                      "",
                      localized(lang, "最近轨迹", "RECENT TRAIL"),
                      ...summary.recentEvents.map(
                        (event) =>
                          `  ${String(event.step).padStart(2, "0")} · ${event.badge} · ${event.title}`,
                      ),
                    ]
                  : []),
              ]
            : []),
          ...(!status.active && status.latest
            ? [
                "",
                localized(lang, "返航总结", "RETURN SUMMARY"),
                localized(
                  lang,
                  `  行程 ${summary.step} / ${summary.totalSteps} 格 · 事件 ${summary.events.total} · 特殊事件 ${summary.events.special} · 状态变动 ${summary.events.mutations}`,
                  `  ROUTE ${summary.step} / ${summary.totalSteps} · EVENTS ${summary.events.total} · SPECIAL ${summary.events.special} · SHIFTS ${summary.events.mutations}`,
                ),
                `  ${localized(lang, "遗物", "ARTIFACTS")}  ${summary.artifacts.length > 0 ? summary.artifacts.map(({ name, rarity }) => `${name} [${rarity.toUpperCase()}]`).join(" · ") : localized(lang, "空手返航", "EMPTY-HANDED")}`,
                `  ${localized(lang, "成就", "ACHIEVEMENTS")}  ${summary.achievements.length > 0 ? summary.achievements.map(({ name, rarity }) => `${name} [${rarity.toUpperCase()}]`).join(" · ") : localized(lang, "无", "NONE")}`,
                ...(summary.permanentEffect
                  ? [
                      `${localized(lang, "永久后遗症", "PERMANENT AFTEREFFECT")}  ${summary.permanentEffect.ability} ${summary.permanentEffect.delta >= 0 ? "+" : ""}${summary.permanentEffect.delta}`,
                    ]
                  : []),
                `${localized(lang, "临时状态", "TEMPORARY CONDITIONS")}  ${summary.temporaryEffectNote}`,
                "",
                localized(lang, "事件轨迹", "EVENT TRAIL"),
                ...summary.recentEvents.map(
                  (event) =>
                    `  ${String(event.step).padStart(2, "0")} · ${event.badge} · ${event.title}`,
                ),
                "",
                `${localized(lang, "返航诊断", "RETURN DIAGNOSIS")}  ${summary.diagnosis}`,
              ]
            : []),
        ]
      : []),
    ...(status.eligibility.available
      ? [
          "",
          localized(lang, "可选目的地", "DESTINATIONS"),
          ...EXPEDITION_DESTINATIONS.map(
            ({ id }) => {
              const candidate = expeditionDestination(id);
              return `  ${id}  ${candidate.name[lang]} · ${candidate.mood[lang]}`;
            },
          ),
          "",
          localized(
            lang,
            "运行 anti-ai expedition start <destination> 开始。",
            "Run anti-ai expedition start <destination> to begin.",
          ),
        ]
      : []),
    "",
  ].join("\n");
}

async function runExpedition(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = options.date ?? localDate(new Date(), timezone);
  const state = await loadCreatureState();
  const creature = deriveCreature(state, date);
  const actionId = {
    start: "start_expedition",
    next: "advance_expedition",
    choose: "choose_expedition",
    abandon: "abandon_expedition",
  }[options.action];
  if (actionId) {
    const execution = await executeContainmentMutation(
      actionId,
      {
        date,
        lang: options.lang,
        choice: options.action === "start"
          ? options.destination
          : options.choice,
      },
      { state },
    );
    if (execution.status !== "completed") {
      const reason = options.action === "choose"
        && execution.reason === "no_expedition_choice"
        && !state.expeditions?.active
          ? "no_active_expedition"
          : execution.reason;
      process.stderr.write(`${expeditionActionError(reason, options)}\n`);
      process.exitCode = 2;
      return;
    }
  } else if (options.action === "history") {
    const history = expeditionHistory(state, date);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(history, null, 2)}\n`);
      return;
    }
    const lines = history.records.toReversed().map((record) => {
      const destination = expeditionDestination(record.destinationId);
      const statusLabel = record.status === "completed"
        ? localized(options.lang, "已返航", "RETURNED")
        : localized(options.lang, "提前返航", "ABANDONED");
      return localized(
        options.lang,
        `  ${record.completedAt ?? record.abandonedAt}  #${record.id} · ${destination.name.zh} · ${statusLabel} · ${record.step} / 10 · 遗物 ${record.artifactIds.length} · 成就 ${record.achievementIds.length}`,
        `  ${record.completedAt ?? record.abandonedAt}  #${record.id} · ${destination.name.en} · ${statusLabel} · ${record.step} / 10 · artifacts ${record.artifactIds.length} · achievements ${record.achievementIds.length}`,
      );
    });
    process.stdout.write(
      [
        localized(
          options.lang,
          `远征记录 · ${history.records.length}`,
          `EXPEDITION HISTORY · ${history.records.length}`,
        ),
        "",
        ...(lines.length > 0
          ? lines
          : [localized(options.lang, "  尚无返航记录。", "  NO RETURN RECORDS.")]),
        "",
      ].join("\n"),
    );
    return;
  }
  const status = expeditionStatus(state, creature, date);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
    return;
  }
  process.stdout.write(renderExpeditionStatus(status, options.lang));
}

export { runExpedition };
