const MOTION_LEVELS = ["off", "low", "full"];
const CORE_FRAMES = [null, "o", "●", "*"];
const MOTION_INTERVALS = {
  off: null,
  low: 400,
  full: 250,
};
const EYE_PATTERN = /◉|●|◆|×|\+|◌|▣|0(?:\s+0){1,2}/u;
const MOUTH_PATTERN = /═{3}|≡+|█{3}|▼+|▽+|W{3}|─{3}|\[_\]|\}\{ |▲+|≋+|牙/u;
const MOUTH_LINE_PATTERN = /╲(?:═{3}|≡+|█{3}|▼+|▽+|W{3}|─{3}|\[_\]|\}\{ |▲+|≋+|牙)╱/u;
const CORE_ANCHOR_PATTERN = /\[(?:●|0|\*|#|\+|-)\]|\[(?:●X●|◉X◉|@X@|◆X◆|\+X\+|-X-)\]/u;
const CORE_PATTERN = /\[[^\[\]]{1,3}\]/u;
const ARMOR_PATTERN = /[▓█▒▦#≋]{2,}/u;
const LIMB_PATTERN = /═╩═|╙─╜|╱_╲|┻━┻|╰┳╯|▰▰▰|╱[█▓▒║╳▦]{2,}╲|╰━╯/u;
const TAIL_PATTERN = /━━(?:>|$)|══>|~~>|──>|::>|##>/u;
const SPECIMEN_POSES = [
  "idle",
  "feeding",
  "withdrawal",
  "dormant",
  "alert",
  "mutation",
];
const CHROMATIC_SIGNATURES = {
  deadline_scent: "D",
  phantom_cache: "P",
  rubber_duck_necromancy: "U",
  prompt_telepathy: "T",
  hallucination_antibodies: "A",
  token_transmutation: "$",
  merge_conflict_gills: "M",
  meeting_radiation: "R",
  lint_divination: "L",
  rollback_precognition: "↺",
  synthetic_conscience: "C",
  budget_resurrection: "B",
};
const COMPANION_STAGE_SIGNATURES = {
  culture: "c",
  parasite: "p",
  symbiote: "s",
  accomplice: "a",
};
const COMPANION_ROUTE_SIGNATURES = {
  pollution: "#",
  clarity: "~",
  paradox: "?",
};

const OBSERVATION_DEFINITIONS = [
  {
    id: "eyes",
    pattern: EYE_PATTERN,
    labels: ["监测复眼", "WATCHFUL EYES"],
    ability: "withdrawal",
    abilityLabels: ["戒断反应", "Withdrawal"],
    copy: [
      "它不断确认提示词还在不在，偶尔也会假装这是独立思考。",
      "It keeps checking whether the prompt is still there, occasionally calling this independent thought.",
    ],
  },
  {
    id: "mouth",
    pattern: MOUTH_LINE_PATTERN,
    labels: ["请求口器", "REQUEST MAW"],
    ability: "mouths",
    abilityLabels: ["请求口器", "Request maw"],
    copy: [
      "每次张合都像一次无害请求，只是账单和生态舱持不同意见。",
      "Every bite resembles a harmless request. The receipt and habitat disagree.",
    ],
  },
  {
    id: "core",
    pattern: CORE_ANCHOR_PATTERN,
    labels: ["核素心核", "ISOTOPE CORE"],
    ability: "glow",
    abilityLabels: ["核素亮度", "Isotope glow"],
    copy: [
      "把算力后遗症压成一颗会呼吸的小太阳，拒绝提供辐射说明书。",
      "It compresses compute aftermath into a breathing pocket sun and declines to provide a radiation manual.",
    ],
  },
  {
    id: "armor",
    pattern: ARMOR_PATTERN,
    labels: ["化石甲层", "FOSSIL PLATING"],
    ability: "shell",
    abilityLabels: ["化石甲", "Fossil shell"],
    copy: [
      "由缓存、旧上下文和不愿删除的草稿沉积而成。",
      "Deposited from caches, stale context, and drafts nobody volunteered to delete.",
    ],
  },
  {
    id: "limbs",
    pattern: LIMB_PATTERN,
    labels: ["执行肢", "EXECUTION LIMBS"],
    ability: "appetite",
    abilityLabels: ["吞噬欲", "Appetite"],
    copy: [
      "负责把“再改一点”搬运成另一次完整调用。",
      "Responsible for carrying “one tiny change” into another complete invocation.",
    ],
  },
  {
    id: "tail",
    pattern: TAIL_PATTERN,
    labels: ["失控尾迹", "RUNAWAY TRAIL"],
    ability: "instability",
    abilityLabels: ["失控指数", "Instability"],
    copy: [
      "越是声称一切可控，尾迹越会在终端边缘留下证词。",
      "The louder it claims control, the more evidence its trail leaves at the terminal edge.",
    ],
  },
];

const OBSERVATION_VARIANTS = {
  eyes: [
    OBSERVATION_DEFINITIONS[0].copy,
    ["复眼每眨一次，就少假装理解一个前置条件。", "Each blink drops one prerequisite it was pretending to understand."],
    ["它在看提示词，也在等提示词先移开视线。", "It watches the prompt and waits for the prompt to look away first."],
    ["视野分成三份：需求、背景，以及更值得怀疑的背景。", "Its vision splits into requirement, context, and more suspicious context."],
  ],
  mouth: [
    OBSERVATION_DEFINITIONS[1].copy,
    ["口器没有饥饿，只是把空闲误诊成了待处理请求。", "The maw is not hungry; it misdiagnosed idleness as a pending request."],
    ["牙列按并发数生长，牙医按调用次数收费。", "Dentition grows with concurrency; the dentist bills per call."],
    ["它刚说完最后一次，又长出一颗补充说明齿。", "After the final ask, it grew one clarification tooth."],
  ],
  core: [
    OBSERVATION_DEFINITIONS[2].copy,
    ["核心脉搏与费用曲线同步，医学上称为预算耦合。", "The core pulse tracks the bill, clinically known as budget coupling."],
    ["小太阳拒绝下班，只同意切换到低功耗发光。", "The pocket sun refuses shutdown and accepts only low-power glowing."],
    ["温度正常，正常值由核心本人提供。", "Temperature is normal according to the core's own reference range."],
  ],
  armor: [
    OBSERVATION_DEFINITIONS[3].copy,
    ["每一层甲片都是一次被保留下来的临时方案。", "Every plate is a temporary workaround that survived."],
    ["敲击背甲会依次听见缓存命中、回滚和叹气。", "Tap the shell to hear cache hit, rollback, then a sigh."],
    ["它把遗留问题穿在身上，并称之为向后兼容。", "It wears legacy problems and calls them backward compatibility."],
  ],
  limbs: [
    OBSERVATION_DEFINITIONS[4].copy,
    ["执行肢擅长走完流程，不负责确认流程通向哪里。", "Execution limbs finish workflows without checking where they lead."],
    ["每条腿都在推进，方向由下一次同步会决定。", "Every leg is moving; direction awaits the next sync."],
    ["它能跑得很快，尤其是在问题定义尚未完成时。", "It runs fastest before the problem is defined."],
  ],
  tail: [
    OBSERVATION_DEFINITIONS[5].copy,
    ["尾迹记录了所有边界情况，只是没有按优先级排序。", "The trail records every edge case in no priority order."],
    ["尾巴指向回滚方向时，核心会假装那是路线规划。", "When the tail points toward rollback, the core calls it route planning."],
    ["它在终端外轻轻扫过，留下一个无法复现的问题。", "It brushes beyond the terminal and leaves an irreproducible issue."],
  ],
};

function normalizeFrame(frame) {
  const numeric = Number.isFinite(frame) ? Math.trunc(frame) : 0;
  return ((numeric % 8) + 8) % 8;
}

function repeatedSymbol(symbol, value) {
  return symbol.repeat(Array.from(value).length);
}

function replaceEyes(line, symbol) {
  return line
    .replaceAll("◉", symbol)
    .replaceAll("●", symbol)
    .replaceAll("◆", symbol)
    .replaceAll("×", symbol)
    .replaceAll("+", symbol)
    .replaceAll("◌", symbol)
    .replaceAll("▣", symbol)
    .replaceAll("0", symbol);
}

function glitchEyes(line) {
  return replaceEyes(line.replaceAll("◉", "⊘"), "×");
}

function replaceMouth(line, symbol) {
  return line.replace(MOUTH_PATTERN, (value) => repeatedSymbol(symbol, value));
}

function replaceCore(line, symbol) {
  return line.replace(CORE_PATTERN, (value) => {
    const innerWidth = Array.from(value).length - 2;
    const left = Math.floor((innerWidth - 1) / 2);
    return `[${" ".repeat(left)}${symbol}${" ".repeat(innerWidth - left - 1)}]`;
  });
}

function replaceArmor(line, symbol) {
  return line.replace(ARMOR_PATTERN, (value) => repeatedSymbol(symbol, value));
}

function replaceLimb(line, symbol) {
  return line.replace(LIMB_PATTERN, (value) => {
    const glyphs = Array.from(value);
    glyphs[Math.floor(glyphs.length / 2)] = symbol;
    return glyphs.join("");
  });
}

function replaceTail(line, symbol) {
  return line.replace(TAIL_PATTERN, (value) => {
    const glyphs = Array.from(value);
    glyphs[glyphs.length - 2] = symbol;
    return glyphs.join("");
  });
}

function deriveAnatomyAnchors(art) {
  const source = Array.isArray(art) ? art : [];
  const find = (pattern) => source.findIndex((line) => pattern.test(line));
  return {
    eyes: find(EYE_PATTERN),
    mouth: find(MOUTH_LINE_PATTERN),
    core: find(CORE_ANCHOR_PATTERN),
    armor: find(ARMOR_PATTERN),
    limbs: find(LIMB_PATTERN),
    tail: find(TAIL_PATTERN),
  };
}

function transformAnchor(lines, index, transform) {
  if (index >= 0 && index < lines.length) lines[index] = transform(lines[index]);
}

function applySpecimenPose(lines, anchors, pose, phase) {
  if (pose === "feeding") {
    transformAnchor(lines, anchors.mouth, (line) =>
      replaceMouth(line, phase % 2 === 0 ? "▽" : "▼"));
  } else if (pose === "withdrawal") {
    transformAnchor(lines, anchors.eyes, (line) =>
      replaceEyes(line, "·"));
    transformAnchor(lines, anchors.core, (line) => replaceCore(line, "~"));
  } else if (pose === "dormant") {
    transformAnchor(lines, anchors.eyes, (line) =>
      replaceEyes(line, "─"));
    transformAnchor(lines, anchors.core, (line) => replaceCore(line, "_"));
  } else if (pose === "alert") {
    transformAnchor(lines, anchors.eyes, (line) =>
      replaceEyes(line, "◎"));
    transformAnchor(lines, anchors.core, (line) => replaceCore(line, "!"));
  } else if (pose === "mutation") {
    transformAnchor(lines, anchors.eyes, (line) =>
      replaceEyes(line, "×"));
    transformAnchor(lines, anchors.core, (line) => replaceCore(line, "?"));
    transformAnchor(lines, anchors.armor, (line) => replaceArmor(line, "%"));
  }
}

function applyTemperamentMotion(lines, anchors, temperament, phase) {
  if (!temperament) return;
  if (temperament === "voracious" && phase % 2 === 1) {
    transformAnchor(lines, anchors.mouth, (line) => replaceMouth(line, "▼"));
  } else if (temperament === "ruminating" && phase % 3 === 1) {
    transformAnchor(lines, anchors.eyes, (line) => replaceEyes(line, "◎"));
  } else if (temperament === "fossilized") {
    transformAnchor(lines, anchors.armor, (line) => replaceArmor(line, "▦"));
  } else if (temperament === "clamorous" && phase % 2 === 1) {
    transformAnchor(lines, anchors.mouth, (line) => replaceMouth(line, "≋"));
  } else if (temperament === "self_igniting") {
    transformAnchor(lines, anchors.core, (line) =>
      replaceCore(line, phase % 2 ? "*" : "●"));
  } else if (temperament === "dice_brained" && phase % 3 === 2) {
    transformAnchor(lines, anchors.tail, (line) => line.replace(/━━$/u, "━?"));
  } else if (temperament === "withdrawing" && phase === 6) {
    transformAnchor(lines, anchors.eyes, (line) => replaceEyes(line, "·"));
  }
}

function applyChromaticSignature(lines, anchors, chromaticAbilityId) {
  const signature = CHROMATIC_SIGNATURES[chromaticAbilityId];
  if (!signature) return;
  transformAnchor(lines, anchors.core, (line) =>
    replaceCore(line, signature));
}

function deriveSpecimenFrame(
  art,
  frame,
  motion = "low",
  {
    glitch = false,
    pose = "idle",
    temperament = null,
    chromaticAbilityId = null,
    observedOrganId = null,
  } = {},
) {
  const source = Array.isArray(art) ? art : [];
  if (motion === "off") return [...source];

  const phase = normalizeFrame(frame);
  const anchors = deriveAnatomyAnchors(source);
  const lines = source.map((line, index) => {
    let next = line;
    if (index === anchors.eyes && phase === 6) {
      next = replaceEyes(next, "•");
    }
    const core = CORE_FRAMES[phase % 4];
    if (index === anchors.core && core !== null) {
      next = replaceCore(next, core);
    }
    if (phase % 4 === 3) {
      next = next.replace(/━━$/u, "━╸");
    }
    if (glitch && index === anchors.eyes) {
      next = glitchEyes(next);
    }
    if (glitch && index === anchors.armor) {
      next = replaceArmor(next, "%");
    }
    if (glitch && index === anchors.core) {
      next = replaceCore(next, "!");
    }
    return next;
  });
  applyTemperamentMotion(lines, anchors, temperament, phase);
  applySpecimenPose(
    lines,
    anchors,
    SPECIMEN_POSES.includes(pose) ? pose : "idle",
    phase,
  );
  if (glitch) applyChromaticSignature(lines, anchors, chromaticAbilityId);
  if (observedOrganId && phase % 2 === 0) {
    const anchor = anchors[observedOrganId];
    transformAnchor(lines, anchor, (line) => {
      if (observedOrganId === "eyes") return replaceEyes(line, "◎");
      if (observedOrganId === "mouth") return replaceMouth(line, "◇");
      if (observedOrganId === "core") return replaceCore(line, "!");
      if (observedOrganId === "armor") return replaceArmor(line, "◇");
      if (observedOrganId === "limbs") return replaceLimb(line, "◇");
      if (observedOrganId === "tail") return replaceTail(line, "◇");
      return line;
    });
  }
  return lines;
}

function deriveCompanionFrame(
  art,
  frame,
  motion = "low",
  { routeId = null, stageId = null, anomalyIds = [] } = {},
) {
  const source = Array.isArray(art) ? art : [];
  if (motion === "off") return [...source];
  const phase = normalizeFrame(frame);
  const routeSignature = COMPANION_ROUTE_SIGNATURES[routeId];
  const stageSignature = COMPANION_STAGE_SIGNATURES[stageId];
  const anomalySignature = anomalyIds.length > 0
    ? String((anomalyIds[0].length % 9) + 1)
    : null;
  return source.map((line, index) => {
    let next = line;
    if (phase === 6) next = next.replaceAll("0", "-");
    if (phase === 3) next = next.replaceAll("^", "~");
    if (motion === "full" && phase % 4 === 1 && !routeSignature) {
      next = next.replaceAll("%", "*");
    }
    if (routeSignature) next = next.replaceAll("%", routeSignature);
    if (stageSignature && index === source.length - 1) {
      next = next.replace("^", stageSignature).replace("~", stageSignature);
      if (!/[cpsa]/u.test(next)) next = `${next}${stageSignature}`;
    }
    if (anomalySignature && index === 0) next = `${next}${anomalySignature}`;
    return next;
  });
}

function deriveEventReplay(snapshot, frame, lang = "zh") {
  const event = snapshot?.habitat?.events?.[0];
  if (!event) return null;
  const zh = lang === "zh";
  const step = ((Math.trunc(Number(frame) || 0) % 4) + 4) % 4;
  const relationship = snapshot?.habitat?.relationship;
  const companion = snapshot?.habitat?.companion;
  const scenes = [
    {
      label: zh ? "封存事故" : "SEALED INCIDENT",
      message: `${event.name}${event.discoveredAt ? ` · ${event.discoveredAt}` : ""}`,
    },
    {
      label: zh ? "症状扩散" : "SYMPTOM SPREAD",
      message: event.body,
    },
    {
      label: zh ? "共生反应" : "COHABITATION RESPONSE",
      message: relationship?.symptom ?? (companion
        ? (zh
          ? "伴生物同步抖了一下，并拒绝解释。"
          : "The companion twitched in sync and declined to explain.")
        : (zh
          ? "伴生位没有证人，主标本决定自行作证。"
          : "The companion bay had no witness, so the specimen testified for itself.")),
    },
    {
      label: zh ? "安全声明" : "SAFETY STATEMENT",
      message: zh
        ? "生态舱仍坚持一切正常，并把异常归类为氛围灯。"
        : "The habitat still insists everything is normal and classifies the anomaly as mood lighting.",
    },
  ];
  return {
    eventId: event.id,
    step,
    total: scenes.length,
    ...scenes[step],
  };
}

function nextMotionLevel(motion) {
  const index = MOTION_LEVELS.indexOf(motion);
  return MOTION_LEVELS[(index + 1) % MOTION_LEVELS.length];
}

function motionInterval(motion) {
  return Object.hasOwn(MOTION_INTERVALS, motion)
    ? MOTION_INTERVALS[motion]
    : MOTION_INTERVALS.low;
}

function isGlitchFrame(snapshot, frame, motion) {
  if (motion === "off") return false;
  const chromatics =
    snapshot?.codex?.categories?.find(
      (category) => category.id === "chromaticAbilities",
    )?.discovered ?? 0;
  if (chromatics < 1) return false;
  const cadence = motion === "full" ? 37 : 61;
  const target = motion === "full" ? 31 : 53;
  const normalized = Math.max(0, Math.trunc(Number(frame) || 0));
  return normalized % cadence === target;
}

function deriveObservationTargets(snapshot, lang = "zh") {
  const zh = lang === "zh";
  const art = snapshot?.overview?.art ?? [];
  const abilities = snapshot?.overview?.abilities ?? {};
  const variantSeed = `${snapshot?.overview?.specimenId ?? "unhatched"}:${snapshot?.date ?? "undated"}`;
  const targets = OBSERVATION_DEFINITIONS.flatMap((definition) => {
    const lineIndex = art.findIndex((line) => definition.pattern.test(line));
    if (lineIndex < 0) return [];
    const value = Number(abilities[definition.ability]) || 0;
    const variants = OBSERVATION_VARIANTS[definition.id];
    const variantIndex = Array.from(`${variantSeed}:${definition.id}`).reduce(
      (total, character) => total + character.codePointAt(0),
      0,
    ) % variants.length;
    const copy = variants[variantIndex];
    return [{
      id: definition.id,
      target: "specimen",
      lineIndex,
      name: definition.labels[zh ? 0 : 1],
      detail: `${definition.abilityLabels[zh ? 0 : 1]} ${value} · ${copy[zh ? 0 : 1]}`,
    }];
  });
  const companion = snapshot?.habitat?.companion;
  if (companion) {
    targets.push({
      id: "companion",
      target: "companion",
      lineIndex: 0,
      name: zh ? "伴生异物" : "COMPANION ACCIDENT",
      detail: zh
        ? `共居 ${companion.cohabitationDays} 天 · 它没有被驯服，只是学会了同步眨眼。`
        : `Cohabiting for ${companion.cohabitationDays} days · It was not tamed; it merely learned to blink in sync.`,
    });
  }
  return targets;
}

function observationContentStats() {
  return {
    organs: OBSERVATION_DEFINITIONS.length,
    feedback: Object.values(OBSERVATION_VARIANTS).reduce(
      (total, variants) => total + variants.length,
      0,
    ),
  };
}

export {
  MOTION_LEVELS,
  SPECIMEN_POSES,
  deriveAnatomyAnchors,
  deriveCompanionFrame,
  deriveEventReplay,
  deriveObservationTargets,
  deriveSpecimenFrame,
  isGlitchFrame,
  motionInterval,
  nextMotionLevel,
  observationContentStats,
};
