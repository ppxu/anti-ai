import { casebookLabel } from "../casebook.mjs";
import { companionLabel } from "../companion.mjs";
import {
  cabinetInteractionCopy,
  codexCollectionEntries,
  consequenceCabinetView,
} from "../consequence-cabinet.mjs";
import {
  CREATURE_COPY,
  creatureLabel,
  creatureTitle,
  loadCreatureState,
} from "../creature.mjs";
import { creatureArt } from "../renderers/creature-art.mjs";
import {
  deriveHabitat,
  habitatDecorationCopy,
  habitatEventCopy,
  habitatRelationshipCopy,
} from "../habitat.mjs";
import { presentHabitatScene } from "../habitat-scenes.mjs";
import { encounterLabel } from "../encounter.mjs";
import { incidentLabel } from "../incidents.mjs";
import {
  laboratoryLabel,
} from "../laboratory.mjs";
import { localDate } from "../scanner.mjs";
import { localized } from "../shared.mjs";
import { collectionPhenotypeCopy } from "../collection-phenotype.mjs";
import { expeditionStatus } from "../expedition.mjs";
import {
  EXPEDITION_ACHIEVEMENT_DEFINITIONS,
  EXPEDITION_DESTINATION_DEFINITIONS,
  expeditionArtifact,
  expeditionChoiceCopy,
  expeditionDestination,
} from "../expedition/content.mjs";
import {
  expeditionEventView,
  expeditionReturnSummary,
} from "../expedition/presentation.mjs";
import { deriveContainmentActions } from "./action-catalog.mjs";
import { containmentArchive, containmentBrief } from "./archive.mjs";
import { deriveDailyBriefing } from "./daily-briefing.mjs";
import { createProjectionContext } from "./projections.mjs";
import { deriveMutationChronicle } from "../chronicle.mjs";
import { presentMutationChronicle } from "../renderers/chronicle.mjs";

const ANSI_PATTERN = /\u001B\[[0-9;]*m/g;

function tuiCopy(lang) {
  return {
    navigation: [
      ["overview", "总览", "Overview"],
      ["habitat", "生态舱", "Habitat"],
      ["expedition", "远征", "Expedition"],
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
  if (entry.type === "expeditionArtifact") {
    return expeditionArtifact(entry.id)?.name[lang] ?? `#${entry.id}`;
  }
  if (entry.type === "expeditionAchievement") {
    return EXPEDITION_ACHIEVEMENT_DEFINITIONS.find(
      ({ id }) => id === entry.id,
    )?.name[lang] ?? `#${entry.id}`;
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

function usageBandLabel(usageBand, lang) {
  const labels = {
    sober: ["AI 清醒", "AI-FREE"],
    calibrating: ["校准污染", "CALIBRATING"],
    restrained: ["节制使用", "RESTRAINED"],
    light: ["轻量使用", "LIGHT"],
    habitual: ["惯常使用", "HABITUAL"],
    heavy: ["重度使用", "HEAVY"],
    binge: ["暴食使用", "BINGE"],
    meltdown: ["熔毁使用", "MELTDOWN"],
  };
  return localized(lang, ...(labels[usageBand] ?? [usageBand, usageBand]));
}

function provenanceSourceLabel(sourceType, lang) {
  const labels = {
    specimen_record: ["本地标本记录", "Local specimen record"],
    expedition_artifact: ["远征遗物", "Expedition artifact"],
    expedition_return: ["远征返航", "Expedition return"],
    behavioral_evidence: ["行为证据", "Behavioral evidence"],
    chromatic_mutation: ["异色突变", "Chromatic mutation"],
    generation_seal: ["世代封存", "Generation seal"],
    habitat_event: ["生态事件", "Habitat event"],
    encounter: ["外来遭遇", "Foreign encounter"],
    case_choice: ["病例选择", "Case choice"],
    incident_aftermath: ["事故后果", "Incident aftermath"],
    laboratory_culture: ["实验室培养", "Laboratory culture"],
    companion_bond: ["伴生绑定", "Companion bond"],
  };
  return localized(
    lang,
    ...(labels[sourceType] ?? [sourceType, sourceType]),
  );
}

function pathologyChangeLabel(change, lang) {
  if (change.type === "hatch") {
    return localized(lang, "异变体首次孵化", "The specimen hatched");
  }
  const groups = {
    stage: "stages",
    branch: "branches",
    ecology: "ecologies",
    form: "ecologyForms",
  };
  const group = groups[change.type];
  const from = group ? creatureLabel(group, change.from, lang) : change.from;
  const to = group ? creatureLabel(group, change.to, lang) : change.to;
  const typeLabel = {
    stage: ["阶段", "Stage"],
    branch: ["病理分支", "Pathology"],
    ecology: ["生态", "Ecology"],
    form: ["形态", "Form"],
  }[change.type] ?? [change.type, change.type];
  return `${localized(lang, ...typeLabel)} · ${from} → ${to}`;
}

function archiveRecordLabel(group, type, lang) {
  const labels = {
    incident: {
      opened: ["收容事故出现", "Containment incident opened"],
      responded: ["事故响应已封存", "Incident response sealed"],
      resolved: ["事故后果已显现", "Incident aftermath resolved"],
    },
    case: {
      offered: ["转折病例出现", "Turning case opened"],
      selected: ["治疗方案已封存", "Treatment route sealed"],
    },
    laboratory: {
      culture: ["培养物入架", "Culture shelved"],
      bond: ["伴生关系建立", "Companion bonded"],
    },
    interaction: {
      observe: ["今日观察已封存", "Daily observation sealed"],
      contact: ["今日接触已封存", "Daily contact sealed"],
    },
    imprint: {
      pollution: ["伴生污染印记", "Companion pollution imprint"],
      clarity: ["伴生清醒印记", "Companion clarity imprint"],
      neutral: ["伴生常态印记", "Companion neutral imprint"],
    },
  };
  return localized(
    lang,
    ...(labels[group]?.[type] ?? [type, type]),
  );
}

function archiveDayPresentation(day, lang) {
  const discoveries = day.discoveries.map((entry) => ({
    ...entry,
    label: codexRecentLabel(entry, lang),
  }));
  const activities = [
    ...day.incidentChanges.map((entry) => ({
      type: "incident",
      label: `${archiveRecordLabel("incident", entry.type, lang)} · #${entry.id}`,
    })),
    ...day.caseChanges.map((entry) => ({
      type: "case",
      label: `${archiveRecordLabel("case", entry.type, lang)} · #${entry.id}`,
    })),
    ...day.laboratoryChanges.map((entry) => ({
      type: "laboratory",
      label: `${archiveRecordLabel("laboratory", entry.type, lang)} · #${entry.id}`,
    })),
    ...day.interactions.map((type) => ({
      type: "interaction",
      label: archiveRecordLabel("interaction", type, lang),
    })),
    ...(day.companion?.todayImprint
      ? [{
          type: "companion",
          label: archiveRecordLabel(
            "imprint",
            day.companion.todayImprint,
            lang,
          ),
        }]
      : []),
  ];
  return {
    ...day,
    statusLabel: localized(
      lang,
      day.status === "active" ? "活跃进食" : "AI 清醒",
      day.status === "active" ? "ACTIVE FEEDING" : "AI-FREE",
    ),
    usageBandLabel: usageBandLabel(day.usageBand, lang),
    pathologyChanges: day.pathologyChanges.map((entry) => ({
      ...entry,
      label: pathologyChangeLabel(entry, lang),
    })),
    discoveries,
    mutationEventLabel: day.mutationEvent
      ? CREATURE_COPY.events[day.mutationEvent.id]?.name?.[lang] ??
        `#${day.mutationEvent.id}`
      : null,
    activities,
    summary: localized(
      lang,
      `污染 +${day.ecologyGains.pollution} · 清醒 +${day.ecologyGains.clarity} · 新收藏 ${discoveries.length} · 记录 ${activities.length}`,
      `pollution +${day.ecologyGains.pollution} · clarity +${day.ecologyGains.clarity} · discoveries ${discoveries.length} · records ${activities.length}`,
    ),
  };
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
      provenance: null,
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
  } else if (entry.type === "expeditionArtifact") {
    const artifact = expeditionArtifact(entry.id);
    label = artifact.name[lang];
    detail = artifact.description[lang];
  } else if (entry.type === "expeditionAchievement") {
    const achievement = EXPEDITION_ACHIEVEMENT_DEFINITIONS.find(
      ({ id }) => id === entry.id,
    );
    label = achievement.name[lang];
    detail = achievement.description[lang];
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
    provenance: entry.provenance
      ? {
          ...entry.provenance,
          sourceLabel: provenanceSourceLabel(
            entry.provenance.sourceType,
            lang,
          ),
        }
      : null,
  };
}

function deriveTuiSnapshot(state, date, lang = "zh") {
  const projections = createProjectionContext(state);
  const creature = projections.creature(date);
  const companion = projections.companion(date);
  const codex = projections.codex(date);
  const phenotypeCopy = collectionPhenotypeCopy(
    codex.collectionPhenotype,
    lang,
  );
  const collectionPhenotype = {
    ...codex.collectionPhenotype,
    name: phenotypeCopy?.name ?? null,
  };
  const creatureView = {
    ...creature,
    collectionPhenotype: codex.collectionPhenotype,
  };
  const specimen = { ...creatureView, companion };
  const chronicle = presentMutationChronicle(
    deriveMutationChronicle(state, date, projections),
    lang,
  );
  const laboratory = projections.laboratory(date);
  const shelf = projections.shelf(date);
  const habitat = deriveHabitat(
    state,
    specimen,
    date,
    creatureArt(creatureView),
  );
  const art = creatureArt(creatureView)
    .replaceAll(ANSI_PATTERN, "")
    .split("\n")
    .filter(Boolean);
  const status = overviewStatus(state, creature, date);
  const expedition = expeditionStatus(state, creature, date);
  const presentExpedition = (record) => {
    if (!record) return null;
    const destination = expeditionDestination(record.destinationId);
    return {
      ...record,
      destination: {
        id: destination.id,
        label: destination.name[lang],
        description: destination.description[lang],
      },
      events: record.events.map((event) => ({
        ...event,
        ...expeditionEventView(record, event, lang),
        ...(event.options
          ? {
              options: event.options.map((option) => ({
                ...option,
                effect: {
                  ...option.effect,
                  ability: creatureLabel(
                    "abilities",
                    option.effect.abilityId,
                    lang,
                  ),
                },
                label: expeditionChoiceCopy(
                  record.destinationId,
                  option.slot,
                  lang,
                ),
              })),
            }
          : {}),
      })),
      returnSummary: expeditionReturnSummary(record, lang),
    };
  };
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
  const featuredEntries = state.cabinet?.featured ?? [];
  const collectionEntries = codexCollectionEntries(codex).map((entry) => {
    const presented = codexEntryPresentation(entry, lang);
    const featuredIndex = featuredEntries.indexOf(entry.key);
    return {
      ...presented,
      cabinet: {
        displayed: featuredIndex >= 0,
        slot: featuredIndex >= 0 ? featuredIndex + 1 : null,
      },
    };
  });
  collectionEntries.push(
    ...chronicle.collectionSets.entries.map((entry) => ({
      ...entry,
      key: `collectionSet:${entry.id}`,
      type: "collectionSet",
      sectionId: "collectionSets",
      discovered: entry.completed,
      label: entry.name,
      detail: entry.description,
      rarityLabel: rarityLabel(entry.rarity, lang),
      provenance: null,
      canDisplay: false,
      cabinet: { displayed: false, slot: null },
    })),
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
      ["expeditionArtifacts", "远征遗物", "Expedition artifacts", "fixed"],
      ["expeditionAchievements", "远征成就", "Expedition achievements", "fixed"],
      ["collectionSets", "病理套组", "Pathology sets", "sets"],
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
      ...(id === "collectionSets"
        ? {
            discovered: chronicle.collectionSets.completed,
            total: chronicle.collectionSets.total,
          }
        : codex.summary[id]),
      entries: id === "collectionSets"
        ? [...(collectionBySection.get(id) ?? [])]
        : [...(collectionBySection.get(id) ?? [])].sort(
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
    collectionPhenotype,
    cabinet: cabinetModel,
    archive: {
      defaultSpan: 7,
      availableSpans: [7, 30],
      days: containmentArchive(state, date, 30, projections).map((day) =>
        archiveDayPresentation(day, lang),
      ),
    },
  };
  const brief = containmentBrief(state, date, projections);
  const actions = deriveContainmentActions(
    state,
    date,
    creature,
    laboratoryModel,
    lang,
  );
  const primaryAction = actions.find(({ available }) => available) ?? null;
  const presentedDay = brief.day ? archiveDayPresentation(brief.day, lang) : null;
  const habitatScene = presentHabitatScene(habitat.scene, lang);
  const dailyBriefing = deriveDailyBriefing({
    date,
    status,
    statusLabel,
    day: presentedDay,
    diagnosis: chronicle.diagnosis,
    habitat: habitatScene,
    recommendation: primaryAction,
    lang,
  });

  return {
    version: 3,
    date,
    lastSettledDate: latestSettledDate(state, date),
    readOnly: true,
    actions,
    primaryAction,
    dailyBriefing,
    navigation: tuiCopy(lang).navigation,
    expedition: {
      ...expedition,
      destinations: EXPEDITION_DESTINATION_DEFINITIONS.map((destination) => ({
        id: destination.id,
        label: destination.name[lang],
        description: destination.description[lang],
        mood: destination.mood[lang],
      })),
      active: presentExpedition(expedition.active),
      latest: presentExpedition(expedition.latest),
    },
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
      temperament: creature.temperament,
      chromaticAbilityId: creature.appearance.rareAbilityId,
      evolutionId: creature.appearance.evolutionId,
      collectionPhenotype,
      art,
      actions: actions.filter(({ available }) => available).slice(0, 2),
      chronicle: {
        diagnosis: chronicle.diagnosis,
        latestChangeLabel: chronicle.latestChangeLabel,
        periods: chronicle.periods.map(({ days, summary }) => ({ days, summary })),
        comparison: {
          baselineLabel: chronicle.comparison.baseline.label,
          currentLabel: chronicle.comparison.current.label,
          summary: chronicle.comparison.summary,
        },
        collectionSets: {
          completed: chronicle.collectionSets.completed,
          total: chronicle.collectionSets.total,
        },
      },
      brief: {
        day: presentedDay,
        nextMilestone: {
          ...brief.nextMilestone,
          label: brief.nextMilestone.type === "hatch"
            ? localized(lang, "下一份有效记录将触发孵化", "The next active record triggers hatching")
            : brief.nextMilestone.type === "stage"
              ? localized(
                  lang,
                  `距下一阶段还有 ${brief.nextMilestone.remainingDays} 个阅历日`,
                  `${brief.nextMilestone.remainingDays} experience day(s) to the next stage`,
                )
              : localized(
                  lang,
                  `距下一世代还有 ${brief.nextMilestone.remainingDays} 个阅历日`,
                  `${brief.nextMilestone.remainingDays} experience day(s) to the next generation`,
                ),
        },
      },
    },
    habitat: {
      ...habitat,
      specimen: {
        ...habitat.specimen,
        collectionPhenotype,
      },
      scene: habitatScene,
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
