import {
  deriveCreature,
  creatureLabel,
  loadCreatureState,
} from "../creature.mjs";
import {
  EXPEDITION_DESTINATIONS,
  abandonExpedition,
  advanceExpedition,
  chooseExpedition,
  expeditionHistory,
  expeditionStatus,
  startExpedition,
} from "../expedition.mjs";
import { saveCreatureState } from "../creature.mjs";
import { localDate } from "../scanner.mjs";
import { localized } from "../shared.mjs";
import {
  expeditionArtifact,
  expeditionChoiceCopy,
  expeditionDestination,
  expeditionEventCopy,
} from "../expedition/content.mjs";

function expeditionRail(expedition) {
  const cursor = Math.max(1, expedition.step);
  return Array.from({ length: expedition.totalSteps }, (_, index) => {
    const cell = index + 1;
    if (expedition.status === "completed" || cell < cursor) return "[✓]";
    if (cell === cursor) return "[@]";
    return "[?]";
  }).join("─");
}

function renderExpeditionStatus(status, lang) {
  const eligibility = status.eligibility.available
    ? localized(lang, "可开启", "AVAILABLE")
    : {
        active: localized(lang, "远征进行中", "EXPEDITION ACTIVE"),
        unhatched: localized(lang, "异变体尚未孵化", "CREATURE NOT HATCHED"),
        used: localized(lang, "本阅历日机会已使用", "OPPORTUNITY USED"),
        expired: localized(lang, "过去机会不累计", "PAST OPPORTUNITY EXPIRED"),
      }[status.eligibility.reason];
  const active = status.active ?? status.latest;
  const destination = active
    ? expeditionDestination(active.destinationId)
    : null;
  const latestEvent = active?.events.at(-1) ?? null;
  const eventCopy = latestEvent ? expeditionEventCopy(latestEvent, lang) : null;
  const effect = latestEvent?.effect;
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
          ...(latestEvent
            ? [
                "",
                `${localized(lang, "最近事件", "LATEST EVENT")}  ${eventCopy.title}`,
                `  ${eventCopy.body}`,
                ...(effect
                  ? [
                      `  ${creatureLabel("abilities", effect.abilityId, lang)} ${effect.delta >= 0 ? "+" : ""}${effect.delta} · ${effect.duration === "permanent" ? localized(lang, "永久", "PERMANENT") : localized(lang, "本局", "THIS RUN")}`,
                    ]
                  : []),
                ...(latestEvent.artifactId
                  ? [
                      `  ${localized(lang, "发现", "FOUND")}  ${expeditionArtifact(latestEvent.artifactId).name[lang]}`,
                    ]
                  : []),
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
              return `  ${id}  ${candidate.name[lang]}`;
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
  if (options.action === "start") {
    const started = startExpedition(
      state,
      creature,
      date,
      options.destination,
    );
    if (started.error) {
      const message = {
        invalid_destination: localized(
          options.lang,
          `未知远征目的地：${options.destination ?? ""}`,
          `Unknown expedition destination: ${options.destination ?? ""}`,
        ),
        active: localized(
          options.lang,
          "已有远征正在进行；请继续或放弃当前远征。",
          "An expedition is already active; continue or abandon it first.",
        ),
        unhatched: localized(
          options.lang,
          "异变体尚未孵化；请先运行 anti-ai today。",
          "The creature has not hatched; run anti-ai today first.",
        ),
        used: localized(
          options.lang,
          "本阅历日的远征机会已经使用。",
          "This experience day's expedition opportunity is already used.",
        ),
        expired: localized(
          options.lang,
          "过去阅历日的远征机会不会累计；请选择最新已结算日期。",
          "Past experience-day expedition opportunities do not stack; select the latest settled date.",
        ),
      }[started.error];
      process.stderr.write(`${message}\n`);
      process.exitCode = 2;
      return;
    }
    await saveCreatureState(state);
  } else if (options.action === "next") {
    const advanced = advanceExpedition(state, creature, date);
    if (advanced.error) {
      const message = {
        no_active: localized(
          options.lang,
          "当前没有进行中的远征。",
          "No expedition is currently active.",
        ),
        choice_required: localized(
          options.lang,
          "必须先处理当前分叉，再进入下一格。",
          "Resolve the current branch before entering the next cell.",
        ),
        complete: localized(
          options.lang,
          "当前远征已经返航。",
          "The current expedition has already returned.",
        ),
        date_before_last_action: localized(
          options.lang,
          "操作日期不能早于远征最近一次操作日期。",
          "The action date cannot be earlier than the expedition's latest action date.",
        ),
      }[advanced.error];
      process.stderr.write(`${message}\n`);
      process.exitCode = 2;
      return;
    }
    await saveCreatureState(state);
  } else if (options.action === "choose") {
    const chosen = chooseExpedition(state, date, options.choice);
    if (chosen.error) {
      const message = {
        no_active: localized(
          options.lang,
          "当前没有进行中的远征。",
          "No expedition is currently active.",
        ),
        no_choice: localized(
          options.lang,
          "当前格没有需要处理的分叉。",
          "The current cell has no unresolved branch.",
        ),
        invalid_choice: localized(
          options.lang,
          "远征选择必须是 1、2 或 3。",
          "Expedition choice must be 1, 2, or 3.",
        ),
        date_before_last_action: localized(
          options.lang,
          "操作日期不能早于远征最近一次操作日期。",
          "The action date cannot be earlier than the expedition's latest action date.",
        ),
      }[chosen.error];
      process.stderr.write(`${message}\n`);
      process.exitCode = 2;
      return;
    }
    await saveCreatureState(state);
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
  } else if (options.action === "abandon") {
    const abandoned = abandonExpedition(state, date);
    if (abandoned.error) {
      const message = abandoned.error === "date_before_last_action"
        ? localized(
            options.lang,
            "操作日期不能早于远征最近一次操作日期。",
            "The action date cannot be earlier than the expedition's latest action date.",
          )
        : localized(
            options.lang,
            "当前没有可放弃的远征。",
            "No active expedition can be abandoned.",
          );
      process.stderr.write(`${message}\n`);
      process.exitCode = 2;
      return;
    }
    await saveCreatureState(state);
  }
  const status = expeditionStatus(state, creature, date);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
    return;
  }
  process.stdout.write(renderExpeditionStatus(status, options.lang));
}

export { runExpedition };
