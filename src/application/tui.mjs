import { laboratoryCompanion } from "../companion.mjs";
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
import {
  laboratoryLabel,
  laboratoryShelf,
  laboratoryView,
} from "../laboratory.mjs";
import { localDate } from "../scanner.mjs";
import { localized } from "../shared.mjs";

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

function snapshotActions(creature, laboratory, codex, date, lang) {
  const actions = [
    {
      id: "settle_today",
      label: localized(lang, "结算今天的工作后遗症", "Settle today's work aftermath"),
      command: `anti-ai today --date ${date}`,
    },
  ];
  if (creature.evolution?.status === "pending") {
    actions.push({
      id: "choose_evolution",
      label: localized(lang, "处理待定世代进化", "Resolve the pending evolution"),
      command: "anti-ai creature evolve",
    });
  }
  if (laboratory.status === "ready") {
    actions.push({
      id: "incubate",
      label: localized(lang, "从三份事故配方中选一份", "Choose one of three accident formulas"),
      command: "anti-ai lab incubate <1|2|3>",
    });
  }
  if (laboratory.cultures > 0 && laboratory.companion === null) {
    actions.push({
      id: "bond",
      label: localized(lang, "给生态舱绑定一只伴生异物", "Bond a companion into the habitat"),
      command: "anti-ai lab shelf",
    });
  }
  if (codex.recent.length > 0) {
    actions.push({
      id: "inspect_codex",
      label: localized(lang, "查看最近入库的病理收藏", "Inspect recent pathology discoveries"),
      command: "anti-ai codex",
    });
  }
  return actions.slice(0, 3);
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
  const section = creatureSections[entry.type];
  return section ? creatureLabel(section, entry.id, lang) : `#${entry.id}`;
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
  const laboratoryModel = {
    status: laboratory.status,
    batch: laboratory.batch,
    inventory: laboratory.inventory,
    cultures: laboratory.cultures,
    proposals,
    shelf: shelf.cultures.slice(-4).reverse().map((culture) => ({
      id: culture.id,
      rarity: culture.rarity,
      type: laboratoryLabel("types", culture.typeId, lang),
      createdAt: culture.createdAt,
    })),
    companion,
  };
  const codexModel = {
    fixed: codex.summary.fixed,
    categories: [
      ["forms", "形态", "Forms"],
      ["achievements", "徽章", "Badges"],
      ["chromaticAbilities", "异色能力", "Chromatics"],
      ["scars", "世代伤痕", "Scars"],
      ["habitatPhenomena", "生态现象", "Phenomena"],
    ].map(([id, zh, en]) => ({
      id,
      label: localized(lang, zh, en),
      ...codex.summary[id],
    })),
    dynamic: [
      ["specimens", "本地标本", "Local specimens"],
      ["foreignSpecimens", "外来标本", "Foreign specimens"],
      ["caseSlices", "病例切片", "Case slices"],
      ["cultures", "培养物", "Cultures"],
      ["companions", "伴生形态", "Companions"],
      ["fossils", "永久化石", "Fossils"],
    ].map(([id, zh, en]) => ({
      id,
      label: localized(lang, zh, en),
      discovered: codex.summary[id].discovered,
    })),
    recent,
  };

  return {
    version: 1,
    date,
    lastSettledDate: latestSettledDate(state, date),
    readOnly: true,
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
      actions: snapshotActions(
        creature,
        laboratoryModel,
        codexModel,
        date,
        lang,
      ),
    },
    habitat: {
      ...habitat,
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
