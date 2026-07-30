import {
  creatureArt,
  creatureLabel,
  saveCreatureState,
} from "../creature.mjs";
import {
  SpecimenCodeError,
  createSpecimenEncounter,
  decodeSpecimenCode,
  encounterLabel,
  saveEncounterSpecimen,
} from "../encounter.mjs";
import { color } from "../reporting.mjs";
import { localized } from "../shared.mjs";
import { runCreature } from "./creature.mjs";

function encounterErrorMessage(error, lang) {
  const messages = {
    missing: localized(
      lang,
      "缺少污染编码。先运行 anti-ai creature export 获取一份。",
      "Missing pollution code. Run anti-ai creature export to obtain one.",
    ),
    too_long: localized(
      lang,
      "污染编码过长，已拒绝解析。",
      "Pollution code is too long and was rejected.",
    ),
    malformed: localized(
      lang,
      "污染编码格式无效。",
      "Invalid pollution code format.",
    ),
    version: localized(
      lang,
      "污染编码版本不受支持。",
      "Unsupported pollution code version.",
    ),
    checksum: localized(
      lang,
      "污染编码校验失败；它可能被截断或篡改。",
      "Pollution code checksum failed; it may be truncated or altered.",
    ),
    payload: localized(
      lang,
      "污染编码中的标本资料无效。",
      "The pollution code contains an invalid specimen.",
    ),
    self: localized(
      lang,
      "不能让异变体和自己的污染编码发生遭遇。",
      "A mutation cannot encounter its own pollution code.",
    ),
  };
  return messages[error.code] ?? messages.malformed;
}

async function encounterContext(options, mode = "context") {
  const visitor = decodeSpecimenCode(options.code);
  const localContext = await runCreature(
    {
      ...options,
      action: undefined,
      command: "creature",
      json: false,
      save: false,
    },
    mode,
  );
  if (!localContext) return null;
  return {
    encounter: createSpecimenEncounter(
      localContext.result,
      visitor,
      localContext.result.date,
    ),
    state: localContext.state,
  };
}

async function runEncounter(options) {
  let context;
  try {
    context = await encounterContext(options);
  } catch (error) {
    if (!(error instanceof SpecimenCodeError)) throw error;
    process.stderr.write(`${encounterErrorMessage(error, options.lang)}\n`);
    process.exitCode = 2;
    return;
  }
  if (!context) return;
  const { encounter, state } = context;
  if (options.save) {
    const collected = saveEncounterSpecimen(state, encounter);
    await saveCreatureState(state);
    encounter.saved = true;
    encounter.alreadyCollected = !collected;
  }
  if (options.json) {
    process.stdout.write(`${JSON.stringify(encounter, null, 2)}\n`);
    return;
  }

  const lang = options.lang;
  process.stdout.write(
    [
      color(
        "1;35",
        localized(lang, "异变体接触事故", "MUTATION CONTACT INCIDENT"),
      ),
      "",
      `${localized(lang, "算力天气", "COMPUTE WEATHER")}  ${encounterLabel("weather", encounter.weather.id, lang)}`,
      `${localized(lang, "接触类型", "CONTACT TYPE")}  ${encounterLabel("type", encounter.type.id, lang)}`,
      "",
      `${localized(lang, "本地标本", "LOCAL SPECIMEN")}  #${encounter.local.specimenId} · ${creatureLabel("ecologyForms", encounter.local.formId, lang)}`,
      `${localized(lang, "外来标本", "VISITOR SPECIMEN")}  #${encounter.visitor.specimenId} · ${creatureLabel("ecologyForms", encounter.visitor.formId, lang)}`,
      "",
      creatureArt({ appearance: encounter.hybrid }),
      `${localized(lang, "混种标本", "HYBRID SPECIMEN")}  #${encounter.hybrid.fingerprint} · ${creatureLabel("ecologyForms", encounter.hybrid.formId, lang)}`,
      `  ${encounterLabel("detail", encounter.type.id, lang)}`,
      "",
      options.save
        ? encounter.alreadyCollected
          ? localized(
              lang,
              "这只混种早已入柜；本地管理员拒绝制造重复库存。",
              "This hybrid was already bottled; the local curator refused duplicate inventory.",
            )
          : localized(
              lang,
              "外来标本已入柜。它现在属于你的本地病理图鉴。",
              "Foreign specimen bottled. It now belongs to your local pathology codex.",
            )
        : localized(
            lang,
            `这次事故尚未入柜。运行 anti-ai encounter ${options.code} --save`,
            `This accident is not bottled yet. Run anti-ai encounter ${options.code} --save`,
          ),
      localized(
        lang,
        "本地演算：污染编码不包含精确 Token、模型、路径或对话。",
        "LOCAL SIMULATION: pollution codes contain no exact tokens, models, paths, or chats.",
      ),
      "",
    ].join("\n"),
  );
}

export { encounterContext, encounterErrorMessage, runEncounter };
