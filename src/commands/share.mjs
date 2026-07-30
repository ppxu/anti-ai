import { currentCreatureIntervention, casebookLabel } from "../casebook.mjs";
import {
  companionLabel,
  laboratoryCompanion,
  syncLaboratoryCompanion,
} from "../companion.mjs";
import {
  creatureArt,
  creatureLabel,
  creatureTitle,
  loadCreatureState,
} from "../creature.mjs";
import { encounterLabel, SpecimenCodeError } from "../encounter.mjs";
import { laboratoryCulture, laboratoryLabel, laboratoryShelf } from "../laboratory.mjs";
import {
  color,
  shiftDate,
} from "../reporting.mjs";
import {
  renderCompanionShareSvg,
  renderCultureShareSvg,
  renderCreatureCollectionShareSvg,
  renderEncounterShareSvg,
  renderPathologyShareSvg,
  renderPrognosisShareSvg,
  renderShareSvg,
} from "../renderers/svg.mjs";
import { localDate, reportsForDates } from "../scanner.mjs";
import { localized } from "../shared.mjs";
import { runCreature } from "./creature.mjs";
import { encounterContext, encounterErrorMessage } from "./encounter.mjs";

async function runShare(options) {
  if (options.card === "companion") {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = options.date ?? localDate(new Date(), timezone);
    let state;
    try {
      state = await loadCreatureState();
    } catch {
      process.stderr.write(
        `${localized(options.lang, "伴生异物分享卡无法读取异变体档案。", "The companion card cannot read the mutation file.")}\n`,
      );
      process.exitCode = 1;
      return;
    }
    if (!state.days?.[date]) {
      const creatureContext = await runCreature(
        {
          ...options,
          action: undefined,
          command: "creature",
          json: false,
        },
        "snapshot-context",
      );
      if (!creatureContext) return;
      state = creatureContext.state;
    }
    syncLaboratoryCompanion(state, date);
    const view = laboratoryCompanion(state, date);
    if (!view.companion) {
      process.stderr.write(
        `${localized(options.lang, "当前没有可分享的伴生异物。", "No symbiotic companion is available to share.")}\n`,
      );
      process.exitCode = 2;
      return;
    }
    const companion = view.companion;
    process.stdout.write(
      renderCompanionShareSvg(
        {
          date,
          cultureId: companion.cultureId,
          art: companion.appearance.lines,
          type: laboratoryLabel("types", companion.typeId, options.lang),
          rarity: companion.rarity.toUpperCase(),
          stage: companionLabel("stages", companion.stageId, options.lang),
          route: companionLabel("routes", companion.routeId, options.lang),
          imprints: localized(
            options.lang,
            `污染 ${companion.imprintCounts.pollution} · 清醒 ${companion.imprintCounts.clarity} · 常态 ${companion.imprintCounts.neutral}`,
            `pollution ${companion.imprintCounts.pollution} · clarity ${companion.imprintCounts.clarity} · neutral ${companion.imprintCounts.neutral}`,
          ),
          anomalies:
            companion.anomalyIds
              .map((id) => companionLabel("anomalies", id, options.lang))
              .join(" · ") || localized(options.lang, "尚无", "NONE"),
        },
        options.lang,
      ),
    );
    return;
  }
  if (options.card === "culture") {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = options.date ?? localDate(new Date(), timezone);
    let state;
    try {
      state = await loadCreatureState();
    } catch {
      process.stderr.write(
        `${localized(options.lang, "培养物分享卡无法读取异变体档案。", "The culture card cannot read the mutation file.")}\n`,
      );
      process.exitCode = 1;
      return;
    }
    const shelf = laboratoryShelf(state, date);
    const culture = options.id
      ? laboratoryCulture(state, date, options.id)
      : shelf.cultures.at(-1);
    if (!culture) {
      process.stderr.write(
        `${localized(options.lang, "当前没有可分享的污染培养物。", "No pollution culture is available to share.")}\n`,
      );
      process.exitCode = 2;
      return;
    }
    process.stdout.write(
      renderCultureShareSvg(
        {
          date: culture.createdAt,
          batch: culture.batch,
          cultureId: culture.id,
          art: culture.appearance.lines,
          type: laboratoryLabel("types", culture.typeId, options.lang),
          rarity: culture.rarity.toUpperCase(),
          materials: culture.ingredients
            .map(
              ({ type, id }) =>
                `${laboratoryLabel("ingredients", type, options.lang)} #${id}`,
            )
            .join(" × "),
          ecology: creatureLabel(
            "ecologies",
            culture.ecologyId,
            options.lang,
          ),
          pathology: creatureLabel(
            "branches",
            culture.pathologyId,
            options.lang,
          ),
          complication: laboratoryLabel(
            "complications",
            culture.complicationId,
            options.lang,
          ),
          sideEffect: laboratoryLabel(
            "sideEffects",
            culture.sideEffectId,
            options.lang,
          ),
        },
        options.lang,
      ),
    );
    return;
  }
  if (options.card === "prognosis") {
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
    const intervention = currentCreatureIntervention(
      context.state,
      context.result.date,
    );
    if (!intervention || intervention.status !== "pending") {
      process.stderr.write(
        `${localized(options.lang, "当前没有可分享的待处理转折病例。", "No pending turning-point case is available to share.")}\n`,
      );
      process.exitCode = 2;
      return;
    }
    process.stdout.write(
      renderPrognosisShareSvg(
        {
          date: context.result.date,
          specimenId: context.result.appearance.specimenId,
          art: creatureArt(context.result),
          caseId: intervention.id,
          caseLabel: casebookLabel(
            "cases",
            intervention.caseId,
            options.lang,
          ),
          options: intervention.options.map((option) => ({
            slot: option.slot,
            label: casebookLabel("routes", option.route, options.lang),
            benefit: casebookLabel(
              "benefits",
              option.benefitId,
              options.lang,
            ),
            cost: casebookLabel("costs", option.costId, options.lang),
          })),
        },
        options.lang,
      ),
    );
    return;
  }
  if (options.card === "encounter") {
    let context;
    try {
      context = await encounterContext(
        {
          ...options,
          code: options.with,
        },
        "snapshot-context",
      );
    } catch (error) {
      if (!(error instanceof SpecimenCodeError)) throw error;
      process.stderr.write(`${encounterErrorMessage(error, options.lang)}\n`);
      process.exitCode = 2;
      return;
    }
    if (!context) return;
    const { encounter } = context;
    process.stdout.write(
      renderEncounterShareSvg(
        {
          date: encounter.date,
          encounterId: encounter.encounterId,
          art: creatureArt({ appearance: encounter.hybrid }),
          weather: encounterLabel(
            "weather",
            encounter.weather.id,
            options.lang,
          ),
          type: encounterLabel("type", encounter.type.id, options.lang),
          detail: encounterLabel("detail", encounter.type.id, options.lang),
          localForm: creatureLabel(
            "ecologyForms",
            encounter.local.formId,
            options.lang,
          ),
          visitorForm: creatureLabel(
            "ecologyForms",
            encounter.visitor.formId,
            options.lang,
          ),
          hybridForm: creatureLabel(
            "ecologyForms",
            encounter.hybrid.formId,
            options.lang,
          ),
          hybridFingerprint: encounter.hybrid.fingerprint,
        },
        options.lang,
      ),
    );
    return;
  }
  if (
    ["pathology", "specimen", "wanted", "fossil"].includes(options.card)
  ) {
    const creature = await runCreature(
      {
        ...options,
        action: undefined,
        command: "creature",
        json: false,
      },
      "snapshot-result",
    );
    if (!creature) {
      process.stderr.write(
        `${options.card === "pathology"
          ? localized(options.lang, "病理报告无法读取异变体档案。运行 anti-ai creature reset 后可重新孵化。", "The pathology card cannot read the mutation file. Run anti-ai creature reset to hatch again.")
          : localized(options.lang, "收藏卡无法读取异变体档案。运行 anti-ai creature reset 后可重新孵化。", "The collection card cannot read the mutation file. Run anti-ai creature reset to hatch again.")}\n`,
      );
      process.exitCode = 1;
      return;
    }
    const ecologyGain = [
      creature.today.ecologyGains.pollution > 0
        ? localized(
            options.lang,
            `污染 +${creature.today.ecologyGains.pollution}`,
            `pollution +${creature.today.ecologyGains.pollution}`,
          )
        : null,
      creature.today.ecologyGains.clarity > 0
        ? localized(
            options.lang,
            `清醒 +${creature.today.ecologyGains.clarity}`,
            `clarity +${creature.today.ecologyGains.clarity}`,
          )
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const view = {
      date: creature.date,
      specimenId: creature.appearance.specimenId,
      art: creatureArt(creature),
      ecology: creatureLabel(
        "ecologies",
        creature.ecology.type,
        options.lang,
      ),
      pathology: creatureLabel(
        "branches",
        creature.branch,
        options.lang,
      ),
      form: creatureLabel(
        "ecologyForms",
        creature.ecologyForm,
        options.lang,
      ),
      stage: creatureLabel("stages", creature.stage, options.lang),
      experience: localized(
        options.lang,
        `阅历 ${creature.experienceDays} 天`,
        `${creature.experienceDays} experience days`,
      ),
      epithet: creatureTitle(creature, options.lang),
      ecologyGain:
        ecologyGain || localized(options.lang, "惯常波动", "habitual drift"),
    };
    if (options.card === "pathology") {
      process.stdout.write(
        renderPathologyShareSvg(view, options.lang),
      );
      return;
    }
    if (options.card === "fossil") {
      const fossil = creature.fossils.at(-1);
      if (!fossil) {
        process.stderr.write(
          `${localized(options.lang, "当前没有永久化石可生成证书。第 90 个阅历日后再来。", "No permanent fossil is available for certification. Return after experience day 90.")}\n`,
        );
        process.exitCode = 2;
        return;
      }
      view.fossil = {
        ...fossil,
        discoveredAt: fossil.sealedAt,
      };
      view.ecology = creatureLabel(
        "ecologies",
        fossil.ecologyId,
        options.lang,
      );
      view.pathology = creatureLabel(
        "branches",
        fossil.pathologyId,
        options.lang,
      );
      view.inheritance = creatureLabel(
        "abilities",
        fossil.inheritanceAbilityId,
        options.lang,
      );
      view.scar = creatureLabel("scars", fossil.scarId, options.lang);
      delete view.art;
    }
    process.stdout.write(
      renderCreatureCollectionShareSvg(
        view,
        options.card,
        options.lang,
      ),
    );
    return;
  }
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = options.date ?? localDate(new Date(), timezone);
  const dates = Array.from({ length: 8 }, (_, index) =>
    shiftDate(date, index - 7),
  );
  const reports = await reportsForDates(options, dates, timezone);
  process.stdout.write(
    renderShareSvg(reports.at(-1), reports.slice(0, -1), options.lang),
  );
}

export { runShare };
