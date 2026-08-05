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
  renderHabitatShareSvg,
  renderPathologyShareSvg,
  renderPrognosisShareSvg,
  renderShareSvg,
} from "../renderers/svg.mjs";
import { localDate, reportsForDates } from "../scanner.mjs";
import { localized } from "../shared.mjs";
import { deriveHabitat } from "../habitat.mjs";
import { runCreature } from "./creature.mjs";
import { encounterContext, encounterErrorMessage } from "./encounter.mjs";

function shareFailure(message, status = 2) {
  return { status, error: message, svg: null };
}

function shareSuccess(svg) {
  return { status: 0, error: null, svg };
}

async function renderShareCard(options) {
  if (options.card === "habitat") {
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
    return shareSuccess(
      renderHabitatShareSvg(
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
            : localized(options.lang, "未绑定", "UNBONDED BAY"),
        },
        options.lang,
      ),
    );
  }
  if (options.card === "companion") {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = options.date ?? localDate(new Date(), timezone);
    let state;
    try {
      state = await loadCreatureState();
    } catch {
      return shareFailure(
        localized(options.lang, "伴生异物分享卡无法读取异变体档案。", "The companion card cannot read the mutation file."),
        1,
      );
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
      return shareFailure(
        localized(options.lang, "当前没有可分享的伴生异物。", "No symbiotic companion is available to share."),
      );
    }
    const companion = view.companion;
    return shareSuccess(
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
  }
  if (options.card === "culture") {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const date = options.date ?? localDate(new Date(), timezone);
    let state;
    try {
      state = await loadCreatureState();
    } catch {
      return shareFailure(
        localized(options.lang, "培养物分享卡无法读取异变体档案。", "The culture card cannot read the mutation file."),
        1,
      );
    }
    const shelf = laboratoryShelf(state, date);
    const culture = options.id
      ? laboratoryCulture(state, date, options.id)
      : shelf.cultures.at(-1);
    if (!culture) {
      return shareFailure(
        localized(options.lang, "当前没有可分享的污染培养物。", "No pollution culture is available to share."),
      );
    }
    return shareSuccess(
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
      return shareFailure(
        localized(options.lang, "当前没有可分享的待处理转折病例。", "No pending turning-point case is available to share."),
      );
    }
    return shareSuccess(
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
      return shareFailure(encounterErrorMessage(error, options.lang));
    }
    if (!context) return;
    const { encounter } = context;
    return shareSuccess(
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
      return shareFailure(
        options.card === "pathology"
          ? localized(options.lang, "病理报告无法读取异变体档案。运行 anti-ai creature reset 后可重新孵化。", "The pathology card cannot read the mutation file. Run anti-ai creature reset to hatch again.")
          : localized(options.lang, "收藏卡无法读取异变体档案。运行 anti-ai creature reset 后可重新孵化。", "The collection card cannot read the mutation file. Run anti-ai creature reset to hatch again."),
        1,
      );
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
      return shareSuccess(renderPathologyShareSvg(view, options.lang));
    }
    if (options.card === "fossil") {
      const fossil = creature.fossils.at(-1);
      if (!fossil) {
        return shareFailure(
          localized(options.lang, "当前没有永久化石可生成证书。第 90 个阅历日后再来。", "No permanent fossil is available for certification. Return after experience day 90."),
        );
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
    return shareSuccess(
      renderCreatureCollectionShareSvg(
        view,
        options.card,
        options.lang,
      ),
    );
  }
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = options.date ?? localDate(new Date(), timezone);
  const dates = Array.from({ length: 8 }, (_, index) =>
    shiftDate(date, index - 7),
  );
  const reports = await reportsForDates(options, dates, timezone);
  return shareSuccess(
    renderShareSvg(reports.at(-1), reports.slice(0, -1), options.lang),
  );
}

async function runShare(options) {
  const result = await renderShareCard(options);
  if (!result) return;
  if (result.error) {
    process.stderr.write(`${result.error}\n`);
    process.exitCode = result.status;
    return;
  }
  process.stdout.write(result.svg);
}

export { renderShareCard, runShare };
