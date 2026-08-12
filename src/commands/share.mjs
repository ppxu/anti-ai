import { currentCreatureIntervention, casebookLabel } from "../casebook.mjs";
import { creatureLabel, loadCreatureState } from "../creature.mjs";
import { creatureArt } from "../renderers/creature-art.mjs";
import { encounterLabel, SpecimenCodeError } from "../encounter.mjs";
import { shiftDate } from "../core/date.mjs";
import {
  renderEncounterShareSvg,
  renderPrognosisShareSvg,
  renderShareSvg,
} from "../renderers/svg.mjs";
import { localDate, reportsForDates } from "../scanner.mjs";
import { localized } from "../shared.mjs";
import { prepareShareCard } from "../application/share-export.mjs";
import { settleCreatureState } from "../application/settlement.mjs";
import { runCreature } from "./creature.mjs";
import { encounterContext, encounterErrorMessage } from "./encounter.mjs";

const STATE_SHARE_CARDS = new Set([
  "briefing",
  "dossier",
  "expedition",
  "habitat",
  "companion",
  "culture",
  "pathology",
  "specimen",
  "wanted",
  "fossil",
]);

function shareFailure(message, status = 2) {
  return { status, error: message, svg: null };
}

function shareSuccess(svg) {
  return { status: 0, error: null, svg };
}

async function renderStateShareCard(options) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = options.date ?? localDate(new Date(), timezone);
  let state;
  try {
    state = await loadCreatureState();
  } catch {
    const message = {
      pathology: [
        "病理报告无法读取异变体档案。运行 anti-ai creature reset 后可重新孵化。",
        "The pathology card cannot read the mutation file. Run anti-ai creature reset to hatch again.",
      ],
      dossier: [
        "标本档案卡无法读取异变体档案。运行 anti-ai creature reset 后可重新孵化。",
        "The dossier card cannot read the mutation file. Run anti-ai creature reset to hatch again.",
      ],
      expedition: [
        "远征分享卡无法读取异变体档案。",
        "The expedition card cannot read the mutation file.",
      ],
      companion: [
        "伴生异物分享卡无法读取异变体档案。",
        "The companion card cannot read the mutation file.",
      ],
      culture: [
        "培养物分享卡无法读取异变体档案。",
        "The culture card cannot read the mutation file.",
      ],
    }[options.card] ?? [
      "收藏卡无法读取异变体档案。运行 anti-ai creature reset 后可重新孵化。",
      "The collection card cannot read the mutation file. Run anti-ai creature reset to hatch again.",
    ];
    return shareFailure(
      localized(options.lang, ...message),
      1,
    );
  }

  const shouldSettle = !["culture", "expedition"].includes(options.card)
    && (options.card !== "companion" || !state.days?.[date]);
  if (shouldSettle) {
    const settlement = await settleCreatureState(
      state,
      date,
      options,
      timezone,
    );
    state = settlement.state;
  }

  const prepared = await prepareShareCard(
    options.card,
    options.id,
    date,
    options.lang,
    { state },
  );
  return prepared.available
    ? shareSuccess(prepared.svg)
    : shareFailure(prepared.reasonLabel);
}

async function renderPrognosisCard(options) {
  const context = await runCreature(
    {
      ...options,
      action: undefined,
      command: "creature",
      json: false,
    },
    "snapshot-context",
  );
  if (!context) return null;
  const intervention = currentCreatureIntervention(
    context.state,
    context.result.date,
  );
  if (!intervention || intervention.status !== "pending") {
    return shareFailure(
      localized(
        options.lang,
        "当前没有可分享的待处理转折病例。",
        "No pending turning-point case is available to share.",
      ),
    );
  }
  return shareSuccess(
    renderPrognosisShareSvg(
      {
        date: context.result.date,
        specimenId: context.result.appearance.specimenId,
        art: creatureArt(context.result),
        caseId: intervention.id,
        caseLabel: casebookLabel("cases", intervention.caseId, options.lang),
        options: intervention.options.map((option) => ({
          slot: option.slot,
          label: casebookLabel("routes", option.route, options.lang),
          benefit: casebookLabel("benefits", option.benefitId, options.lang),
          cost: casebookLabel("costs", option.costId, options.lang),
        })),
      },
      options.lang,
    ),
  );
}

async function renderEncounterCard(options) {
  let context;
  try {
    context = await encounterContext(
      { ...options, code: options.with },
      "snapshot-context",
    );
  } catch (error) {
    if (!(error instanceof SpecimenCodeError)) throw error;
    return shareFailure(encounterErrorMessage(error, options.lang));
  }
  if (!context) return null;
  const { encounter } = context;
  return shareSuccess(
    renderEncounterShareSvg(
      {
        date: encounter.date,
        encounterId: encounter.encounterId,
        art: creatureArt({ appearance: encounter.hybrid }),
        weather: encounterLabel("weather", encounter.weather.id, options.lang),
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

async function renderShareCard(options) {
  if (STATE_SHARE_CARDS.has(options.card)) {
    return renderStateShareCard(options);
  }
  if (options.card === "prognosis") return renderPrognosisCard(options);
  if (options.card === "encounter") return renderEncounterCard(options);

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
