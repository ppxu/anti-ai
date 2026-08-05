import { casebookLabel } from "../casebook.mjs";
import { companionLabel, laboratoryCompanion } from "../companion.mjs";
import {
  cabinetInteractionCopy,
  codexCollectionEntries,
  consequenceCabinetView,
} from "../consequence-cabinet.mjs";
import {
  creatureArt,
  creatureCodex,
  creatureLabel,
  creatureTitle,
  deriveCreature,
  loadCreatureState,
} from "../creature.mjs";
import {
  deriveHabitat,
  habitatDecorationCopy,
  habitatEventCopy,
  habitatRelationshipCopy,
} from "../habitat.mjs";
import { encounterLabel } from "../encounter.mjs";
import { incidentLabel } from "../incidents.mjs";
import {
  laboratoryLabel,
  laboratoryShelf,
  laboratoryView,
} from "../laboratory.mjs";
import { localDate } from "../scanner.mjs";
import { localized } from "../shared.mjs";
import { deriveContainmentActions } from "./action-catalog.mjs";

const ANSI_PATTERN = /\u001B\[[0-9;]*m/g;

function tuiCopy(lang) {
  return {
    navigation: [
      ["overview", "总览", "Overview"],
      ["habitat", "生态舱", "Habitat"],
      ["laboratory", "实验室", "Laboratory"],
      ["codex", "图鉴", "Codex"],
    ].map(([id, zh, en], index) => ({
      id,
      shortcut: String(index + 1),
      label: localized(lang, zh, en),
    })),
  };
}

function latestSettledDate(state, date) {
  return Object.keys(state.days ?? {})
    .filter((entryDate) => entryDate <= date)
    .sort()
    .at(-1) ?? null;
}

function overviewStatus(state, creature, date) {
  if (creature.activeDays === 0) return "unhatched";
  const day = state.days?.[date];
  if (day === undefined) return "awaiting";
  return day.active ? "active" : "quiet";
}

function codexRecentLabel(entry, lang) {
  const creatureSections = {
    form: "ecologyForms",
    achievement: "achievements",
    chromaticAbility: "rareAbilities",
    scar: "scars",
  };
  if (entry.type === "habitatPhenomenon") {
    return habitatEventCopy(entry.id, lang).name;
  }
  if (entry.type === "incidentReport") {
    return localized(lang, `事故报告 #${entry.id}`, `INCIDENT REPORT #${entry.id}`);
  }
  const section = creatureSections[entry.type];
  return section ? creatureLabel(section, entry.id, lang) : `#${entry.id}`;
}

function rarityLabel(rarity, lang) {
  const labels = {
    common: ["常见", "COMMON"],
    uncommon: ["罕见", "UNCOMMON"],
    rare: ["稀有", "RARE"],
    epic: ["史诗", "EPIC"],
    mythic: ["神话", "MYTHIC"],
  };
  return localized(lang, ...(labels[rarity] ?? labels.common));
}

function laboratoryWorkflow(laboratory, companion, lang) {
  const materialReady = laboratory.inventory.total > 0;
  const cultureReady = laboratory.cultures > 0;
  const bondReady = companion !== null;
  const completed = [materialReady, cultureReady, bondReady].filter(
    Boolean,
  ).length;
  const next = !materialReady
    ? {
        id: "material",
        label: localized(lang, "尚无培养原料", "NO CULTURE MATERIAL"),
      }
    : !cultureReady
      ? {
          id: "incubate",
          label: localized(
            lang,
            "原料已就绪 · 请选择配方培养",
            "MATERIAL READY · SELECT A FORMULA",
          ),
        }
      : !bondReady
        ? {
            id: "bond",
            label: localized(
              lang,
              "培养物已封存 · 可以建立伴生关系",
              "CULTURE SEALED · READY TO BOND",
            ),
          }
        : {
            id: "complete",
            label: localized(lang, "伴生关系已建立", "COMPANION BONDED"),
          };
  return {
    completed,
    total: 3,
    next,
    steps: [
      {
        id: "material",
        complete: materialReady,
        label: localized(lang, "获取原料", "GET MATERIAL"),
      },
      {
        id: "incubate",
        complete: cultureReady,
        label: localized(lang, "孵化培养物", "INCUBATE"),
      },
      {
        id: "bond",
        complete: bondReady,
        label: localized(lang, "绑定伴生物", "BOND COMPANION"),
      },
    ],
  };
}

function codexEntryPresentation(entry, lang) {
  if (!entry.discovered) {
    const rarity = entry.rarity ?? "common";
    return {
      ...entry,
      label: "???",
      detail: localized(
        lang,
        "尚未收录 · 剪影保留，名字拒绝提前剧透",
        "LOCKED · silhouette retained; the diagnosis refuses spoilers",
      ),
      rarity,
      rarityLabel: rarityLabel(rarity, lang),
    };
  }
  let label = `#${entry.id}`;
  let detail = localized(lang, "本地派生收藏", "Locally derived collection");
  let rarity = entry.rarity ?? "common";
  if (entry.type === "form") {
    label = creatureLabel("ecologyForms", entry.id, lang);
    detail = `${creatureLabel("ecologies", entry.ecologyId, lang)} · ${creatureLabel("branches", entry.pathologyId, lang)}`;
  } else if (entry.type === "achievement") {
    label = creatureLabel("achievements", entry.id, lang);
    detail = localized(
      lang,
      `${entry.category.toUpperCase()} 行为证据`,
      `${entry.category.toUpperCase()} behavioral evidence`,
    );
  } else if (entry.type === "chromaticAbility") {
    label = creatureLabel("rareAbilities", entry.id, lang);
    detail = `Lv.${entry.level}`;
  } else if (entry.type === "scar") {
    label = creatureLabel("scars", entry.id, lang);
    detail = localized(lang, "世代封存伤痕", "Generation-sealed scar");
    rarity = "rare";
  } else if (entry.type === "habitatPhenomenon") {
    label = habitatEventCopy(entry.id, lang).name;
    detail = habitatDecorationCopy(entry.decorationId, lang).name;
    rarity = "uncommon";
  } else if (entry.type === "specimen") {
    label = localized(lang, `本地标本 #${entry.id}`, `LOCAL SPECIMEN #${entry.id}`);
    detail = `${creatureLabel("ecologyForms", entry.formId, lang)} · ${localized(lang, `阅历 ${entry.experienceDays} 天`, `${entry.experienceDays} experience days`)}`;
  } else if (entry.type === "foreignSpecimen") {
    label = localized(lang, `外来标本 #${entry.id}`, `FOREIGN SPECIMEN #${entry.id}`);
    detail = `${encounterLabel("type", entry.typeId, lang)} · ${creatureLabel("ecologyForms", entry.hybridFormId, lang)}`;
    rarity = "rare";
  } else if (entry.type === "caseSlice") {
    label = localized(lang, `病例切片 #${entry.id}`, `CASE SLICE #${entry.id}`);
    detail = `${casebookLabel("cases", entry.caseId, lang)} · ${casebookLabel("routes", entry.routeId, lang)}`;
    rarity = "rare";
  } else if (entry.type === "incidentReport") {
    label = localized(lang, `事故报告 #${entry.id}`, `INCIDENT REPORT #${entry.id}`);
    detail = `${incidentLabel("incidents", entry.incidentId, lang)} · ${incidentLabel("stances", entry.stanceId, lang)}`;
    rarity = "rare";
  } else if (entry.type === "culture") {
    label = `${laboratoryLabel("types", entry.typeId, lang)} #${entry.id}`;
    detail = localized(lang, "污染培养物", "Pollution culture");
  } else if (entry.type === "companion") {
    label = localized(lang, `伴生异物 #${entry.id}`, `SYMBIOTIC COMPANION #${entry.id}`);
    detail = `${companionLabel("stages", entry.stageId, lang)} · ${companionLabel("routes", entry.routeId, lang)}`;
  } else if (entry.type === "fossil") {
    label = localized(lang, `永久化石 #${entry.id}`, `PERMANENT FOSSIL #${entry.id}`);
    detail = `${localized(lang, `第 ${entry.generation} 代`, `GENERATION ${entry.generation}`)} · ${creatureLabel("scars", entry.scarId, lang)}`;
    rarity = "epic";
  }
  return {
    ...entry,
    label,
    detail,
    rarity,
    rarityLabel: rarityLabel(rarity, lang),
  };
}

function deriveTuiSnapshot(state, date, lang = "zh") {
  const creature = deriveCreature(state, date);
  const companion = laboratoryCompanion(state, date).companion;
  const specimen = { ...creature, companion };
  const codex = creatureCodex(state, date);
  const laboratory = laboratoryView(state, date);
  const shelf = laboratoryShelf(state, date);
  const habitat = deriveHabitat(
    state,
    specimen,
    date,
    creatureArt(creature),
  );
  const art = creatureArt(creature)
    .replaceAll(ANSI_PATTERN, "")
    .split("\n")
    .filter(Boolean);
  const status = overviewStatus(state, creature, date);
  const statusLabel = {
    active: localized(lang, "今日已进食", "FED TODAY"),
    quiet: localized(lang, "AI 清醒日已结算", "AI-FREE DAY SETTLED"),
    awaiting: localized(lang, "日期尚未结算", "DATE NOT SETTLED"),
    unhatched: localized(lang, "尚未孵化", "NOT YET HATCHED"),
  }[status];
  const proposals = laboratory.proposals.map((proposal) => ({
    id: proposal.id,
    slot: proposal.slot,
    rarity: proposal.rarity,
    type: laboratoryLabel("types", proposal.typeId, lang),
    pathology: creatureLabel("branches", proposal.pathologyId, lang),
    ecology: creatureLabel("ecologies", proposal.ecologyId, lang),
    complication: laboratoryLabel(
      "complications",
      proposal.complicationId,
      lang,
    ),
  }));
  const recent = codex.recent.slice(-5).reverse().map((entry) => ({
    ...entry,
    label: codexRecentLabel(entry, lang),
  }));
  const collectionEntries = codexCollectionEntries(codex).map((entry) =>
    codexEntryPresentation(entry, lang),
  );
  const collectionBySection = new Map();
  for (const entry of collectionEntries) {
    const entries = collectionBySection.get(entry.sectionId) ?? [];
    entries.push(entry);
    collectionBySection.set(entry.sectionId, entries);
  }
  const cabinet = consequenceCabinetView(state, codex);
  const cabinetModel = {
    ...cabinet,
    slots: cabinet.slots.map((entry) =>
      entry ? codexEntryPresentation(entry, lang) : null,
    ),
    interactions: Object.fromEntries(
      Object.entries(cabinet.interactions).map(([kind, record]) => [
        kind,
        {
          ...record,
          text: cabinetInteractionCopy(kind, record, lang),
        },
      ]),
    ),
  };
  const laboratoryModel = {
    status: laboratory.status,
    batch: laboratory.batch,
    inventory: laboratory.inventory,
    cultures: laboratory.cultures,
    proposals,
    shelf: shelf.cultures.toReversed().map((culture) => ({
      id: culture.id,
      rarity: culture.rarity,
      type: laboratoryLabel("types", culture.typeId, lang),
      createdAt: culture.createdAt,
      active: companion?.cultureId === culture.id,
      ecology: creatureLabel("ecologies", culture.ecologyId, lang),
      pathology: creatureLabel("branches", culture.pathologyId, lang),
      complication: laboratoryLabel(
        "complications",
        culture.complicationId,
        lang,
      ),
      sideEffect: laboratoryLabel("sideEffects", culture.sideEffectId, lang),
      ingredients: culture.ingredients.map(({ type, id }) => ({
        type,
        id,
        label: laboratoryLabel("ingredients", type, lang),
      })),
      art: [...culture.appearance.lines],
      fingerprint: culture.appearance.fingerprint,
    })),
    companion,
  };
  laboratoryModel.workflow = laboratoryWorkflow(
    laboratoryModel,
    companion,
    lang,
  );
  const codexModel = {
    fixed: codex.summary.fixed,
    categories: [
      ["forms", "形态", "Forms", "fixed"],
      ["achievements", "徽章", "Badges", "fixed"],
      ["chromaticAbilities", "异色能力", "Chromatics", "fixed"],
      ["scars", "世代伤痕", "Scars", "fixed"],
      ["habitatPhenomena", "生态现象", "Phenomena", "fixed"],
      ["specimens", "本地标本", "Local specimens", "dynamic"],
      ["foreignSpecimens", "外来标本", "Foreign specimens", "dynamic"],
      ["caseSlices", "病例切片", "Case slices", "dynamic"],
      ["incidentReports", "事故报告", "Incident reports", "dynamic"],
      ["cultures", "培养物", "Cultures", "dynamic"],
      ["companions", "伴生形态", "Companions", "dynamic"],
      ["fossils", "永久化石", "Fossils", "dynamic"],
    ].map(([id, zh, en, group]) => ({
      id,
      label: localized(lang, zh, en),
      group,
      ...codex.summary[id],
      entries: [...(collectionBySection.get(id) ?? [])].sort(
        (left, right) =>
          Number(right.discovered) - Number(left.discovered) ||
          String(left.id).localeCompare(String(right.id)),
      ),
    })),
    dynamic: [
      ["specimens", "本地标本", "Local specimens"],
      ["foreignSpecimens", "外来标本", "Foreign specimens"],
      ["caseSlices", "病例切片", "Case slices"],
      ["incidentReports", "事故报告", "Incident reports"],
      ["cultures", "培养物", "Cultures"],
      ["companions", "伴生形态", "Companions"],
      ["fossils", "永久化石", "Fossils"],
    ].map(([id, zh, en]) => ({
      id,
      label: localized(lang, zh, en),
      discovered: codex.summary[id].discovered,
    })),
    recent,
    cabinet: cabinetModel,
  };
  const actions = deriveContainmentActions(
    state,
    date,
    creature,
    laboratoryModel,
    lang,
  );

  return {
    version: 1,
    date,
    lastSettledDate: latestSettledDate(state, date),
    readOnly: true,
    actions,
    primaryAction: actions.find(({ available }) => available) ?? null,
    navigation: tuiCopy(lang).navigation,
    overview: {
      status,
      statusLabel,
      title: creatureTitle(creature, lang),
      stage: {
        id: creature.stage,
        label: creatureLabel("stages", creature.stage, lang),
      },
      branch: {
        id: creature.branch,
        label: creatureLabel("branches", creature.branch, lang),
      },
      ecology: {
        id: creature.ecology.type,
        label: creatureLabel("ecologies", creature.ecology.type, lang),
        pollution: creature.ecology.pollution,
        clarity: creature.ecology.clarity,
      },
      specimenId: creature.appearance.specimenId,
      experienceDays: creature.experienceDays,
      generation: creature.generation,
      abilities: creature.abilities,
      art,
      actions: actions.filter(({ available }) => available).slice(0, 2),
    },
    habitat: {
      ...habitat,
      cabinet: cabinetModel,
      relationship: habitat.relationship
        ? {
            ...habitat.relationship,
            ...habitatRelationshipCopy(habitat.relationship.id, lang),
          }
        : null,
      decorations: habitat.decorations.map((decoration) => ({
        ...decoration,
        ...habitatDecorationCopy(decoration.id, lang),
      })),
      events: habitat.events.slice(-4).reverse().map((event) => ({
        ...event,
        ...habitatEventCopy(event.id, lang),
      })),
    },
    laboratory: laboratoryModel,
    codex: codexModel,
  };
}

async function loadTuiSnapshot(options = {}) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = options.date ?? localDate(new Date(), timezone);
  const state = await loadCreatureState();
  return deriveTuiSnapshot(state, date, options.lang ?? "zh");
}

export { deriveTuiSnapshot, loadTuiSnapshot };
