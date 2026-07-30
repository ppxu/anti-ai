import {
  bondLaboratoryCompanion,
  companionLabel,
  laboratoryCompanion,
  syncLaboratoryCompanion,
} from "../companion.mjs";
import {
  creatureLabel,
  loadCreatureState,
  saveCreatureState,
} from "../creature.mjs";
import {
  incubateLaboratoryCulture,
  laboratoryCulture,
  laboratoryLabel,
  laboratoryShelf,
  laboratoryView,
} from "../laboratory.mjs";
import { color } from "../reporting.mjs";
import { localDate } from "../scanner.mjs";
import { localized } from "../shared.mjs";
import { CODEX_RARITY_COLORS } from "../cli/render.mjs";
import { runCreature } from "./creature.mjs";

async function runLaboratory(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = options.date ?? localDate(new Date(), timezone);
  let state = await loadCreatureState();
  if (
    ["bond", "companion"].includes(options.action) &&
    !state.days?.[date]
  ) {
    const creatureContext = await runCreature(
      {
        ...options,
        action: undefined,
        command: "creature",
        json: false,
      },
      "context",
    );
    if (!creatureContext) return;
    state = creatureContext.state;
  }
  if (options.action === "companion") {
    syncLaboratoryCompanion(state, date);
    await saveCreatureState(state);
    const view = laboratoryCompanion(state, date);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(view, null, 2)}\n`);
      return;
    }
    if (view.status === "unbound") {
      process.stdout.write(
        `${localized(options.lang, "当前没有绑定伴生异物。", "No symbiotic companion is currently bonded.")}\n`,
      );
      return;
    }
    const companion = view.companion;
    const routeColor = {
      unformed: "2",
      pollution: "1;31",
      clarity: "1;36",
      paradox: "1;33",
    }[companion.routeId];
    const anomalyLabels = companion.anomalyIds.map((id) =>
      companionLabel("anomalies", id, options.lang),
    );
    process.stdout.write(
      [
        color(
          routeColor,
          localized(
            options.lang,
            `伴生异物 · #${companion.cultureId}`,
            `SYMBIOTIC COMPANION · #${companion.cultureId}`,
          ),
        ),
        "",
        ...companion.appearance.lines.map((line) => `  ${line}`),
        "",
        `${localized(options.lang, "类型", "TYPE")}  ${color(
          CODEX_RARITY_COLORS[companion.rarity],
          `${laboratoryLabel("types", companion.typeId, options.lang)} · ${companion.rarity.toUpperCase()}`,
        )}`,
        `${localized(options.lang, "阶段", "STAGE")}  ${companionLabel("stages", companion.stageId, options.lang)}${companion.nextStageAt === null ? " · MAX" : ` · ${companion.imprintCounts.total} / ${companion.nextStageAt}`}`,
        `${localized(options.lang, "路线", "ROUTE")}  ${color(
          routeColor,
          companionLabel("routes", companion.routeId, options.lang),
        )}`,
        localized(
          options.lang,
          `印记  污染 ${companion.imprintCounts.pollution} · 清醒 ${companion.imprintCounts.clarity} · 常态 ${companion.imprintCounts.neutral}`,
          `IMPRINTS  pollution ${companion.imprintCounts.pollution} · clarity ${companion.imprintCounts.clarity} · neutral ${companion.imprintCounts.neutral}`,
        ),
        `${localized(options.lang, "异常", "ANOMALIES")}  [${anomalyLabels.length}] ${anomalyLabels.join(" · ") || localized(options.lang, "尚未封存", "NONE SEALED")}`,
        `${localized(options.lang, "绑定日期", "BONDED AT")}  ${companion.bondedAt}`,
        ...(options.full
          ? [
              `${localized(options.lang, "外观指纹", "APPEARANCE FINGERPRINT")}  ${companion.appearance.fingerprint}`,
              localized(
                options.lang,
                "成长护栏  每日一个印记；不提供战力、能力或 Token 收益。",
                "GROWTH GUARDRAIL  one daily imprint; no combat, abilities, or Token rewards.",
              ),
            ]
          : [
              `${localized(options.lang, "完整档案", "FULL FILE")}  anti-ai lab companion --full`,
            ]),
        "",
      ].join("\n"),
    );
    return;
  }
  if (options.action === "bond") {
    const result = bondLaboratoryCompanion(state, date, options.id);
    if (result.error === "not_found") {
      process.stderr.write(
        `${localized(options.lang, `未找到培养物：${options.id ?? ""}`, `Culture not found: ${options.id ?? ""}`)}\n`,
      );
      process.exitCode = 2;
      return;
    }
    await saveCreatureState(state);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result.value, null, 2)}\n`);
      return;
    }
    process.stdout.write(
      `${localized(options.lang, `伴生关系已建立：#${result.value.companion.cultureId}`, `Symbiotic bond established: #${result.value.companion.cultureId}`)}\n`,
    );
    return;
  }
  if (options.action === "shelf") {
    const shelf = laboratoryShelf(state, date);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(shelf, null, 2)}\n`);
      return;
    }
    const shown = options.full
      ? shelf.cultures
      : shelf.cultures.slice(-6);
    process.stdout.write(
      [
        color(
          "1;35",
          localized(
            options.lang,
            `污染培养架 · ${shelf.total}`,
            `POLLUTION CULTURE SHELF · ${shelf.total}`,
          ),
        ),
        "",
        ...(shown.length === 0
          ? [
              localized(
                options.lang,
                "  尚无培养物。实验室仍在认真培养空气。",
                "  NONE. The laboratory is still culturing air.",
              ),
            ]
          : shown.map(
              (culture) =>
                `  ${color(
                  CODEX_RARITY_COLORS[culture.rarity],
                  `#${culture.id} · ${laboratoryLabel("types", culture.typeId, options.lang)} · ${culture.rarity.toUpperCase()}`,
                )} · ${culture.createdAt}`,
            )),
        ...(shelf.total > shown.length
          ? [
              localized(
                options.lang,
                `  另有 ${shelf.total - shown.length} 份封存记录 · anti-ai lab shelf --full`,
                `  ${shelf.total - shown.length} more sealed records · anti-ai lab shelf --full`,
              ),
            ]
          : []),
        "",
      ].join("\n"),
    );
    return;
  }
  if (options.action === "inspect") {
    const culture = laboratoryCulture(state, date, options.id);
    if (!culture) {
      process.stderr.write(
        `${localized(options.lang, `未找到培养物：${options.id ?? ""}`, `Culture not found: ${options.id ?? ""}`)}\n`,
      );
      process.exitCode = 2;
      return;
    }
    if (options.json) {
      process.stdout.write(`${JSON.stringify(culture, null, 2)}\n`);
      return;
    }
    const material = culture.ingredients
      .map(
        ({ type, id }) =>
          `${laboratoryLabel("ingredients", type, options.lang)} #${id}`,
      )
      .join(" × ");
    process.stdout.write(
      [
        color(
          "1;35",
          localized(
            options.lang,
            `污染培养标本 · #${culture.id}`,
            `POLLUTION CULTURE SPECIMEN · #${culture.id}`,
          ),
        ),
        "",
        ...culture.appearance.lines.map((line) => `  ${line}`),
        "",
        `  ${localized(options.lang, "类型", "TYPE")}  ${color(
          CODEX_RARITY_COLORS[culture.rarity],
          `${laboratoryLabel("types", culture.typeId, options.lang)} · ${culture.rarity.toUpperCase()}`,
        )}`,
        `  ${localized(options.lang, "原料", "MATERIALS")}  ${material}`,
        `  ${localized(options.lang, "并发症", "COMPLICATION")}  ${laboratoryLabel("complications", culture.complicationId, options.lang)}`,
        `  ${localized(options.lang, "副作用", "SIDE EFFECT")}  ${laboratoryLabel("sideEffects", culture.sideEffectId, options.lang)}`,
        "",
      ].join("\n"),
    );
    return;
  }
  if (options.action === "incubate") {
    const selection = incubateLaboratoryCulture(
      state,
      date,
      options.choice,
    );
    if (selection.error === "unavailable") {
      process.stderr.write(
        `${localized(options.lang, "当前没有可培养的派生原料。", "No derived material is available for incubation.")}\n`,
      );
      process.exitCode = 2;
      return;
    }
    if (selection.error === "invalid") {
      process.stderr.write(
        `${localized(options.lang, "培养方案必须是 1、2 或 3。", "Culture choice must be 1, 2, or 3.")}\n`,
      );
      process.exitCode = 2;
      return;
    }
    await saveCreatureState(state);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(selection.value, null, 2)}\n`);
      return;
    }
    process.stdout.write(
      [
        color(
          "1;35",
          localized(options.lang, "培养事故已封存", "INCUBATION ACCIDENT SEALED"),
        ),
        "",
        `  ${color(
          CODEX_RARITY_COLORS[selection.value.culture.rarity],
          `#${selection.value.culture.id} · ${laboratoryLabel("types", selection.value.culture.typeId, options.lang)} · ${selection.value.culture.rarity.toUpperCase()}`,
        )}`,
        ...selection.value.culture.appearance.lines.map((line) => `  ${line}`),
        "",
        `  ${localized(options.lang, "查看标本", "INSPECT")}  anti-ai lab inspect ${selection.value.culture.id}`,
        "",
      ].join("\n"),
    );
    return;
  }
  const view = laboratoryView(state, date);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(view, null, 2)}\n`);
    return;
  }
  const lines = [
    color("1;35", localized(options.lang, "污染实验室", "POLLUTION LABORATORY")),
    "",
    localized(
      options.lang,
      `原料：外来标本 ${view.inventory.foreignSpecimens} · 永久化石 ${view.inventory.fossils} · 病例切片 ${view.inventory.caseSlices}`,
      `MATERIALS: foreign ${view.inventory.foreignSpecimens} · fossils ${view.inventory.fossils} · case slices ${view.inventory.caseSlices}`,
    ),
    localized(
      options.lang,
      `培养架：${view.cultures} · 当前批次 #${view.batch}`,
      `SHELF: ${view.cultures} · CURRENT BATCH #${view.batch}`,
    ),
    "",
    ...(view.status === "locked"
      ? [
          localized(
            options.lang,
            "尚无可用原料。保存一次遭遇、封存一枚化石或处理一个转折病例后再来。",
            "No derived material is available. Save an encounter, seal a fossil, or treat a turning case first.",
          ),
        ]
      : view.proposals.flatMap((proposal) => {
          const material = proposal.ingredients
            .map(
              ({ type, id }) =>
                `${laboratoryLabel("ingredients", type, options.lang)} #${id}`,
            )
            .join(" × ");
          return [
            `  ${color(
              CODEX_RARITY_COLORS[proposal.rarity],
              localized(
                options.lang,
                `方案 ${proposal.slot} · #${proposal.id} · ${laboratoryLabel("types", proposal.typeId, options.lang)} · ${proposal.rarity.toUpperCase()}`,
                `FORMULA ${proposal.slot} · #${proposal.id} · ${laboratoryLabel("types", proposal.typeId, options.lang)} · ${proposal.rarity.toUpperCase()}`,
              ),
            )}`,
            `    ${localized(options.lang, "原料", "MATERIALS")}  ${material}`,
            `    ${localized(options.lang, "诊断", "DIAGNOSIS")}  ${creatureLabel("ecologies", proposal.ecologyId, options.lang)} / ${creatureLabel("branches", proposal.pathologyId, options.lang)} · ${laboratoryLabel("complications", proposal.complicationId, options.lang)}`,
            `    ${localized(options.lang, "副作用", "SIDE EFFECT")}  ${laboratoryLabel("sideEffects", proposal.sideEffectId, options.lang)}`,
            `    ${localized(options.lang, "培养", "INCUBATE")}  anti-ai lab incubate ${proposal.slot}`,
            "",
          ];
        })),
    "",
  ];
  process.stdout.write(lines.join("\n"));
}

export { runLaboratory };
