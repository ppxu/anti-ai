const MOTION_LEVELS = ["off", "low", "full"];
const CORE_FRAMES = [null, "o", "●", "*"];
const MOTION_INTERVALS = {
  off: null,
  low: 400,
  full: 250,
};
const MOUTH_PATTERN = /≡|▲|▼|▽|≋|牙|\[_\]/u;
const CORE_PATTERN = /\[(?!_)[^\]]\]/u;

const OBSERVATION_DEFINITIONS = [
  {
    id: "eyes",
    pattern: /◉|●|(?:^|\s)0(?:\s+0)+/u,
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
    pattern: MOUTH_PATTERN,
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
    pattern: CORE_PATTERN,
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
    pattern: /#|█/u,
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
    pattern: /██|═╩═|╰━╯|╱██|╲██/u,
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
    pattern: /━/u,
    labels: ["失控尾迹", "RUNAWAY TRAIL"],
    ability: "instability",
    abilityLabels: ["失控指数", "Instability"],
    copy: [
      "越是声称一切可控，尾迹越会在终端边缘留下证词。",
      "The louder it claims control, the more evidence its trail leaves at the terminal edge.",
    ],
  },
];

function normalizeFrame(frame) {
  const numeric = Number.isFinite(frame) ? Math.trunc(frame) : 0;
  return ((numeric % 8) + 8) % 8;
}

function deriveSpecimenFrame(
  art,
  frame,
  motion = "low",
  { glitch = false } = {},
) {
  const source = Array.isArray(art) ? art : [];
  if (motion === "off") return [...source];

  const phase = normalizeFrame(frame);
  const eyeLineIndex = source.findIndex((line) =>
    OBSERVATION_DEFINITIONS[0].pattern.test(line)
  );
  return source.map((line, index) => {
    let next = line;
    if (index === eyeLineIndex && phase === 6) {
      next = next
        .replaceAll("◉", "─")
        .replaceAll("●", "•")
        .replaceAll("0", "•");
    }
    const core = CORE_FRAMES[phase % 4];
    if (core !== null) {
      next = next.replace(CORE_PATTERN, `[${core}]`);
    }
    if (phase % 4 === 3) {
      next = next.replace(/━━$/u, "━╸");
    }
    if (glitch) {
      next = next
        .replaceAll("◉", "⊘")
        .replaceAll("●", "×")
        .replaceAll("#", "%")
        .replace(CORE_PATTERN, "[!]");
    }
    return next;
  });
}

function deriveCompanionFrame(art, frame, motion = "low") {
  const source = Array.isArray(art) ? art : [];
  if (motion === "off") return [...source];
  const phase = normalizeFrame(frame);
  return source.map((line) => {
    let next = line;
    if (phase === 6) next = next.replaceAll("0", "-");
    if (phase === 3) next = next.replaceAll("^", "~");
    if (motion === "full" && phase % 4 === 1) {
      next = next.replaceAll("%", "*");
    }
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
  const targets = OBSERVATION_DEFINITIONS.flatMap((definition) => {
    const lineIndex = art.findIndex((line) => definition.pattern.test(line));
    if (lineIndex < 0) return [];
    const value = Number(abilities[definition.ability]) || 0;
    return [{
      id: definition.id,
      target: "specimen",
      lineIndex,
      name: definition.labels[zh ? 0 : 1],
      detail: `${definition.abilityLabels[zh ? 0 : 1]} ${value} · ${definition.copy[zh ? 0 : 1]}`,
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

export {
  MOTION_LEVELS,
  deriveCompanionFrame,
  deriveEventReplay,
  deriveObservationTargets,
  deriveSpecimenFrame,
  isGlitchFrame,
  motionInterval,
  nextMotionLevel,
};
