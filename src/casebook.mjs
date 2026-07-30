import { createHash } from "node:crypto";

const CASEBOOK_GENERATION_LENGTH = 90;
const CASEBOOK_INTERVENTION_INTERVAL = 14;

const CASEBOOK_STAGES = [
  { id: "contaminated_embryo", threshold: 1 },
  { id: "mutated_juvenile", threshold: 7 },
  { id: "runaway_adult", threshold: 30 },
  { id: "catastrophe_complete", threshold: 90 },
];

const CASEBOOK_CASES = [
  { id: "context_echo_chamber", pathologyId: "context", abilityId: "memory" },
  { id: "recursive_memory_fever", pathologyId: "context", abilityId: "memory" },
  { id: "cache_mummification", pathologyId: "cache", abilityId: "shell" },
  { id: "rollback_calcification", pathologyId: "cache", abilityId: "shell" },
  { id: "autonomous_refill", pathologyId: "frenzy", abilityId: "mouths" },
  { id: "queue_parasite", pathologyId: "frenzy", abilityId: "mouths" },
  { id: "reactor_sweat", pathologyId: "nuclear", abilityId: "glow" },
  { id: "watt_hour_fever", pathologyId: "nuclear", abilityId: "glow" },
  { id: "abstinence_delirium", ecologyId: "lucid", abilityId: "withdrawal" },
  { id: "clarity_rejection", ecologyId: "lucid", abilityId: "withdrawal" },
  { id: "split_diagnosis", ecologyId: "paradox", abilityId: "instability" },
  { id: "borrowed_symptom", ecologyId: "paradox", abilityId: "instability" },
];

const CASEBOOK_COPY = {
  cases: {
    context_echo_chamber: {
      zh: "上下文回声室",
      en: "CONTEXT ECHO CHAMBER",
    },
    recursive_memory_fever: {
      zh: "递归记忆热",
      en: "RECURSIVE MEMORY FEVER",
    },
    cache_mummification: {
      zh: "缓存木乃伊化",
      en: "CACHE MUMMIFICATION",
    },
    rollback_calcification: {
      zh: "回滚钙化症",
      en: "ROLLBACK CALCIFICATION",
    },
    autonomous_refill: {
      zh: "请求口器自主续杯",
      en: "AUTONOMOUS REQUEST REFILL",
    },
    queue_parasite: {
      zh: "队列寄生虫",
      en: "QUEUE PARASITE",
    },
    reactor_sweat: {
      zh: "反应堆盗汗",
      en: "REACTOR NIGHT SWEATS",
    },
    watt_hour_fever: {
      zh: "瓦时高热",
      en: "WATT-HOUR FEVER",
    },
    abstinence_delirium: {
      zh: "戒断谵妄",
      en: "ABSTINENCE DELIRIUM",
    },
    clarity_rejection: {
      zh: "清醒排异",
      en: "CLARITY REJECTION",
    },
    split_diagnosis: {
      zh: "裂解诊断",
      en: "SPLIT DIAGNOSIS",
    },
    borrowed_symptom: {
      zh: "借来症状",
      en: "BORROWED SYMPTOM",
    },
  },
  routes: {
    pollution: {
      zh: "放任增殖",
      en: "ALLOW PROLIFERATION",
    },
    clarity: {
      zh: "强制戒断",
      en: "FORCED ABSTINENCE",
    },
    paradox: {
      zh: "交叉移植",
      en: "CROSS-GRAFT",
    },
  },
  benefits: {
    pollution: {
      zh: "后续预后记住污染倾向",
      en: "future prognosis remembers Pollution",
    },
    clarity: {
      zh: "后续预后记住清醒倾向",
      en: "future prognosis remembers Clarity",
    },
    paradox: {
      zh: "后续预后记住悖论倾向",
      en: "future prognosis remembers Paradox",
    },
  },
  costs: {
    pollution: {
      zh: "病历永久留下增殖缝线",
      en: "permanent PROLIFERATION SUTURE in the casebook",
    },
    clarity: {
      zh: "病历永久贴上戒断封条",
      en: "permanent ABSTINENCE SEAL in the casebook",
    },
    paradox: {
      zh: "病历永久形成分叉瘢痕",
      en: "permanent FORKED SCAR in the casebook",
    },
  },
  marks: {
    pollution: {
      zh: "增殖缝线",
      en: "PROLIFERATION SUTURE",
    },
    clarity: {
      zh: "戒断封条",
      en: "ABSTINENCE SEAL",
    },
    paradox: {
      zh: "分叉瘢痕",
      en: "FORKED SCAR",
    },
  },
  likelihoods: {
    leading: {
      zh: "主导病程",
      en: "LEADING COURSE",
    },
    possible: {
      zh: "可能并发",
      en: "POSSIBLE COMPLICATION",
    },
    latent: {
      zh: "潜伏分支",
      en: "LATENT BRANCH",
    },
  },
  drivers: {
    ecology_polluted: {
      zh: "污染生态正在主导",
      en: "polluted ecology is dominant",
    },
    ecology_lucid: {
      zh: "清醒生态正在主导",
      en: "lucid ecology is dominant",
    },
    ecology_paradox: {
      zh: "污染与清醒同时增殖",
      en: "pollution and clarity are proliferating together",
    },
    active_streak: {
      zh: "连续活跃仍在延长",
      en: "the active streak is still extending",
    },
    quiet_streak: {
      zh: "连续清醒仍在延长",
      en: "the AI-free streak is still extending",
    },
    unstable_ability: {
      zh: "失控指数正在干扰诊断",
      en: "instability is interfering with diagnosis",
    },
    intervention_pollution: {
      zh: "既往选择偏向放任增殖",
      en: "a prior choice favored proliferation",
    },
    intervention_clarity: {
      zh: "既往选择偏向强制戒断",
      en: "a prior choice favored abstinence",
    },
    intervention_paradox: {
      zh: "既往选择留下分叉瘢痕",
      en: "a prior choice left a forked scar",
    },
    pollution_baseline: {
      zh: "污染路线仍保留基础病灶",
      en: "the pollution route retains a baseline lesion",
    },
    clarity_baseline: {
      zh: "清醒路线仍保留基础封印",
      en: "the clarity route retains a baseline seal",
    },
    paradox_baseline: {
      zh: "悖论路线仍在等待一次误诊",
      en: "the paradox route is waiting for a misdiagnosis",
    },
  },
};

function casebookLabel(section, id, lang = "zh") {
  return CASEBOOK_COPY[section]?.[id]?.[lang] ?? id;
}

function stageForExperienceDay(experienceDay) {
  const generationDay =
    ((experienceDay - 1) % CASEBOOK_GENERATION_LENGTH) + 1;
  return CASEBOOK_STAGES.findLast(
    (stage) => generationDay >= stage.threshold,
  ).id;
}

function caseCandidates(creature) {
  const ecologyCandidates = CASEBOOK_CASES.filter(
    (entry) => entry.ecologyId === creature.ecology.type,
  );
  if (ecologyCandidates.length > 0) return ecologyCandidates;
  return CASEBOOK_CASES.filter(
    (entry) => entry.pathologyId === creature.branch,
  );
}

function interventionOptions(caseId) {
  return ["pollution", "clarity", "paradox"].map((route, index) => ({
    slot: index + 1,
    id: `${caseId}_${route}`,
    route,
    benefitId: route,
    costId: route,
    markId: route,
  }));
}

function interventionSummary(intervention) {
  if (!intervention) return null;
  const options = interventionOptions(intervention.caseId);
  return {
    id: intervention.id,
    caseId: intervention.caseId,
    offeredAt: intervention.offeredAt,
    status: intervention.status,
    trigger: { ...intervention.trigger },
    options,
    selectedAt: intervention.selectedAt,
    selected:
      intervention.selectedSlot === null
        ? null
        : options.find(
            (option) => option.slot === intervention.selectedSlot,
          ),
  };
}

function currentCreatureIntervention(state, date) {
  const interventions = (state.casebook?.cases ?? [])
    .filter((entry) => entry.offeredAt <= date)
    .sort((left, right) => left.offeredAt.localeCompare(right.offeredAt));
  return interventionSummary(interventions.at(-1));
}

function syncCreatureInterventions(state, date, creature) {
  state.casebook ??= {
    cases: [],
    nextAtExperience: CASEBOOK_INTERVENTION_INTERVAL,
  };
  state.casebook.cases ??= [];
  state.casebook.nextAtExperience ??= CASEBOOK_INTERVENTION_INTERVAL;
  const pending = state.casebook.cases.find(
    (entry) => entry.status === "pending",
  );
  if (
    pending ||
    creature.experienceDays < state.casebook.nextAtExperience ||
    creature.experienceDays === 0
  ) {
    return currentCreatureIntervention(state, date);
  }

  const candidates = caseCandidates(creature);
  const digest = createHash("sha256")
    .update(
      `${state.seed}:${date}:${creature.experienceDays}:${state.casebook.cases.length}:casebook`,
    )
    .digest();
  const definition = candidates[digest.readUInt8(0) % candidates.length];
  const id = createHash("sha256")
    .update(
      `${state.seed}:${date}:${definition.id}:${state.casebook.cases.length}:case`,
    )
    .digest("hex")
    .slice(0, 8);
  state.casebook.cases.push({
    id,
    caseId: definition.id,
    offeredAt: date,
    status: "pending",
    trigger: {
      experienceDays: creature.experienceDays,
      ecologyId: creature.ecology.type,
      pathologyId: creature.branch,
      abilityId: definition.abilityId,
    },
    selectedSlot: null,
    selectedAt: null,
  });
  state.casebook.nextAtExperience =
    creature.experienceDays + CASEBOOK_INTERVENTION_INTERVAL;
  return currentCreatureIntervention(state, date);
}

function selectCreatureIntervention(
  state,
  date,
  choice,
  currentExperienceDays,
) {
  const interventions = (state.casebook?.cases ?? [])
    .filter((entry) => entry.offeredAt <= date)
    .sort((left, right) => left.offeredAt.localeCompare(right.offeredAt));
  const intervention = interventions.at(-1);
  if (!intervention) return { error: "unavailable" };
  const slot = Number(choice);
  if (!Number.isInteger(slot) || slot < 1 || slot > 3) {
    return { error: "invalid" };
  }
  if (
    intervention.selectedSlot !== null &&
    intervention.selectedSlot !== slot
  ) {
    return { error: "locked" };
  }
  intervention.selectedSlot = slot;
  intervention.selectedAt ??= date;
  intervention.status = "selected";
  state.casebook.nextAtExperience =
    currentExperienceDays + CASEBOOK_INTERVENTION_INTERVAL;
  return { value: interventionSummary(intervention) };
}

function selectedRouteBiases(state, date) {
  const biases = {
    pollution: 0,
    clarity: 0,
    paradox: 0,
  };
  for (const intervention of state.casebook?.cases ?? []) {
    if (
      intervention.selectedAt === null ||
      intervention.selectedAt > date ||
      intervention.selectedSlot === null
    ) {
      continue;
    }
    const route = ["pollution", "clarity", "paradox"][
      intervention.selectedSlot - 1
    ];
    biases[route] += 1;
  }
  return biases;
}

function prognosisCaseCandidates(route, creature) {
  if (route === "clarity") {
    return CASEBOOK_CASES.filter((entry) => entry.ecologyId === "lucid");
  }
  if (route === "paradox") {
    return CASEBOOK_CASES.filter((entry) => entry.ecologyId === "paradox");
  }
  return CASEBOOK_CASES.filter(
    (entry) => entry.pathologyId === creature.branch,
  );
}

function prognosisDrivers(route, creature, biases) {
  const drivers = [];
  if (route === "pollution") {
    if (creature.ecology.type === "polluted") {
      drivers.push("ecology_polluted");
    }
    if (creature.activeStreakDays >= 3) drivers.push("active_streak");
  } else if (route === "clarity") {
    if (creature.ecology.type === "lucid") drivers.push("ecology_lucid");
    if (creature.quietStreakDays >= 3) drivers.push("quiet_streak");
  } else {
    if (creature.ecology.type === "paradox") {
      drivers.push("ecology_paradox");
    }
    if (
      creature.dominantAbility === "instability" ||
      creature.abilities.instability >= 15
    ) {
      drivers.push("unstable_ability");
    }
  }
  if (biases[route] > 0) drivers.push(`intervention_${route}`);
  if (drivers.length === 0) drivers.push(`${route}_baseline`);
  return drivers;
}

function creaturePrognosis(state, date, creature) {
  const biases = selectedRouteBiases(state, date);
  const routes = ["pollution", "clarity", "paradox"];
  const scores = {
    pollution:
      creature.ecology.pollutionRate * 100 +
      Math.min(20, creature.activeStreakDays * 3) +
      biases.pollution * 18,
    clarity:
      creature.ecology.clarityRate * 100 +
      Math.min(20, creature.quietStreakDays * 3) +
      biases.clarity * 18,
    paradox:
      Math.min(
        creature.ecology.pollutionRate,
        creature.ecology.clarityRate,
      ) *
        100 +
      Math.min(20, creature.abilities.instability / 3) +
      biases.paradox * 18,
  };
  const ordered = [...routes].sort(
    (left, right) =>
      scores[right] - scores[left] || left.localeCompare(right),
  );
  const likelihoodByRoute = Object.fromEntries(
    ordered.map((route, index) => [
      route,
      ["leading", "possible", "latent"][index],
    ]),
  );

  return {
    date,
    specimenId: creature.appearance.specimenId,
    window: {
      minDays: 14,
      maxDays: 30,
    },
    routes: routes.map((route) => {
      const candidates = prognosisCaseCandidates(route, creature);
      const digest = createHash("sha256")
        .update(
          `${state.seed}:${date}:${route}:${state.casebook?.cases?.length ?? 0}:prognosis`,
        )
        .digest();
      return {
        route,
        likelihood: likelihoodByRoute[route],
        previewCaseId:
          candidates[digest.readUInt8(0) % candidates.length].id,
        driverIds: prognosisDrivers(route, creature, biases),
      };
    }),
  };
}

function creatureHistory(state, date, { full = false } = {}) {
  const entries = Object.entries(state.days)
    .filter(([entryDate]) => entryDate <= date)
    .sort(([left], [right]) => left.localeCompare(right));
  const hatchIndex = entries.findIndex(([, day]) => day.active);
  const observed = hatchIndex === -1 ? [] : entries.slice(hatchIndex);
  const events = [];
  let previousStage = null;

  for (const [index, [entryDate, day]] of observed.entries()) {
    const experienceDay = index + 1;
    const stage = stageForExperienceDay(experienceDay);
    if (index === 0) {
      events.push({
        date: entryDate,
        type: "hatch",
        id: "initial_hatch",
      });
    }
    if (stage !== previousStage) {
      events.push({
        date: entryDate,
        type: "stage",
        id: stage,
        experienceDay,
      });
      previousStage = stage;
    }
    if (day.event?.rarity === "rare") {
      events.push({
        date: entryDate,
        type: "rare_mutation",
        id: day.event.id,
      });
    }
    if (day.rareAbilityGain) {
      events.push({
        date: entryDate,
        type: "chromatic",
        id: day.rareAbilityGain.id,
        rarity: day.rareAbilityGain.rarity,
        levelGain: day.rareAbilityGain.points,
      });
    }
    for (const achievementId of day.achievementUnlockIds ?? []) {
      events.push({
        date: entryDate,
        type: "achievement",
        id: achievementId,
      });
    }
  }
  for (const fossil of state.generations?.fossils ?? []) {
    if (fossil.sealedAt > date) continue;
    events.push({
      date: fossil.sealedAt,
      type: "fossil",
      id: fossil.id,
      generation: fossil.generation,
      ecologyId: fossil.ecologyId,
      scarId: fossil.scarId,
    });
  }
  for (const evolution of Object.values(
    state.generations?.evolutions ?? {},
  )) {
    if (
      evolution.selectedId === null ||
      evolution.selectedAt === null ||
      evolution.selectedAt > date
    ) {
      continue;
    }
    events.push({
      date: evolution.selectedAt,
      type: "evolution_selected",
      id: evolution.selectedId,
      evolutionId: evolution.selectedId,
      generation: evolution.generation,
    });
  }
  for (const intervention of state.casebook?.cases ?? []) {
    if (intervention.offeredAt > date) continue;
    events.push({
      date: intervention.offeredAt,
      type: "case_offered",
      id: intervention.id,
      caseId: intervention.caseId,
    });
    if (
      intervention.selectedAt !== null &&
      intervention.selectedAt <= date
    ) {
      const route = ["pollution", "clarity", "paradox"][
        intervention.selectedSlot - 1
      ];
      events.push({
        date: intervention.selectedAt,
        type: "case_selected",
        id: intervention.id,
        caseId: intervention.caseId,
        routeId: route,
        markId: route,
      });
    }
  }
  const eventOrder = {
    hatch: 0,
    stage: 1,
    rare_mutation: 2,
    chromatic: 3,
    achievement: 4,
    fossil: 5,
    evolution_selected: 6,
    case_offered: 7,
    case_selected: 8,
  };
  events.sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      eventOrder[left.type] - eventOrder[right.type],
  );

  return {
    date,
    observedDays: observed.length,
    totalEvents: events.length,
    events,
    ...(full
      ? {
          daily: observed.map(([entryDate, day], index) => ({
            date: entryDate,
            experienceDay: index + 1,
            status: day.active ? "active" : "dormant",
            usageBand: day.usageBand,
            eventId: day.event?.id ?? null,
          })),
        }
      : {}),
  };
}

export {
  CASEBOOK_CASES,
  casebookLabel,
  currentCreatureIntervention,
  creatureHistory,
  creaturePrognosis,
  selectCreatureIntervention,
  syncCreatureInterventions,
};
