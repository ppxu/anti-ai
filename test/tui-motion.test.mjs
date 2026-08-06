import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveAnatomyAnchors,
  deriveCompanionFrame,
  deriveEventReplay,
  deriveObservationTargets,
  deriveSpecimenFrame,
  isGlitchFrame,
  motionInterval,
  nextMotionLevel,
  observationContentStats,
} from "../src/application/tui-motion.mjs";

test("motion levels stay low-rate and cycle predictably", () => {
  assert.equal(motionInterval("off"), null);
  assert.equal(motionInterval("low"), 400);
  assert.equal(motionInterval("full"), 250);
  assert.equal(nextMotionLevel("off"), "low");
  assert.equal(nextMotionLevel("low"), "full");
  assert.equal(nextMotionLevel("full"), "off");
});

test("specimen idle frames preserve static mode and animate only local anatomy", () => {
  const art = [
    "    ╱◉╲╱◉╲",
    "  ╭─╱● ●╲─╮",
    "  │ ## [0] ## │",
    "  ╰━━",
  ];

  const staticFrame = deriveSpecimenFrame(art, 3, "off");
  const livingFrame = deriveSpecimenFrame(art, 3, "low");

  assert.deepEqual(staticFrame, art);
  assert.notEqual(staticFrame, art);
  assert.deepEqual(art, [
    "    ╱◉╲╱◉╲",
    "  ╭─╱● ●╲─╮",
    "  │ ## [0] ## │",
    "  ╰━━",
  ]);
  assert.equal(livingFrame.length, art.length);
  assert.equal(livingFrame[0], art[0]);
  assert.equal(livingFrame[1], art[1]);
  assert.match(livingFrame[2], /\[\*\]/u);
  assert.match(livingFrame[3], /━╸$/u);
  assert.deepEqual(
    deriveSpecimenFrame(["  │ [●] │"], 0, "low"),
    ["  │ [●] │"],
  );
  assert.match(
    deriveSpecimenFrame(["  ╱╲", " ╭╱≋╲╮", " │ 0 0 0 │"], 6, "low")[2],
    /• • •/u,
  );
  assert.deepEqual(
    deriveSpecimenFrame([" │ ╲[_]╱ │", " │  [●]  │"], 1, "low"),
    [" │ ╲[_]╱ │", " │  [o]  │"],
  );
});

test("event replay turns the latest sealed phenomenon into four local scenes", () => {
  const snapshot = {
    habitat: {
      events: [
        {
          id: "cached-moon",
          name: "缓存月蚀",
          body: "旧上下文遮住了核心。",
        },
      ],
      companion: { cultureId: "c-1" },
      relationship: {
        symptom: "伴生物开始替主标本眨眼。",
      },
    },
  };

  assert.deepEqual(deriveEventReplay({ habitat: { events: [] } }, 0, "zh"), null);
  assert.match(deriveEventReplay(snapshot, 0, "zh").message, /缓存月蚀/u);
  assert.match(deriveEventReplay(snapshot, 1, "zh").message, /旧上下文/u);
  assert.match(deriveEventReplay(snapshot, 2, "zh").message, /替主标本眨眼/u);
  assert.match(deriveEventReplay(snapshot, 3, "zh").message, /仍坚持一切正常/u);
  assert.equal(deriveEventReplay(snapshot, 4, "zh").step, 0);
});

test("companion idle frames blink without changing static output", () => {
  const art = ["    .---.", "  _/0 0\\_", " /  %  \\", " \\__^__/"];

  assert.deepEqual(deriveCompanionFrame(art, 6, "off"), art);
  assert.match(deriveCompanionFrame(art, 6, "low")[1], /- -/u);
  assert.match(deriveCompanionFrame(art, 3, "low")[3], /~/u);
  assert.match(deriveCompanionFrame(art, 1, "full")[2], /\*/u);
});

test("rare glitch frames require a discovered chromatic ability", () => {
  const eligible = {
    codex: {
      categories: [{ id: "chromaticAbilities", discovered: 1 }],
    },
  };
  const ordinary = {
    codex: {
      categories: [{ id: "chromaticAbilities", discovered: 0 }],
    },
  };

  assert.equal(isGlitchFrame(eligible, 31, "full"), true);
  assert.equal(isGlitchFrame(eligible, 53, "low"), true);
  assert.equal(isGlitchFrame(eligible, 30, "full"), false);
  assert.equal(isGlitchFrame(eligible, 31, "off"), false);
  assert.equal(isGlitchFrame(ordinary, 31, "full"), false);
  assert.match(
    deriveSpecimenFrame(["╱◉╲ [0] ##"], 31, "full", { glitch: true })[0],
    /⊘.*\[!\].*%%/u,
  );
});

test("observation targets map visible organs to existing growth attributes", () => {
  const snapshot = {
    overview: {
      art: [
        "    ╱◉╲╱◉╲",
        "  ╭─╱● ●╲─╮",
        "  │ ## ╲≡╱ ## │",
        "  │    [0]    │",
        "  ╰━╯ ╱██╲ ╰━━",
      ],
      abilities: {
        appetite: 65,
        shell: 21,
        mouths: 96,
        glow: 14,
        instability: 19,
        withdrawal: 9,
      },
    },
    habitat: { companion: null },
  };

  const targets = deriveObservationTargets(snapshot, "zh");

  assert.deepEqual(
    targets.map(({ id }) => id),
    ["eyes", "mouth", "core", "armor", "limbs", "tail"],
  );
  assert.equal(targets.find(({ id }) => id === "eyes").lineIndex, 0);
  assert.match(targets.find(({ id }) => id === "mouth").detail, /请求口器 96/u);
  assert.match(targets.find(({ id }) => id === "core").detail, /核素亮度 14/u);
  assert.match(targets.find(({ id }) => id === "tail").detail, /失控指数 19/u);
  assert.equal(targets.every(({ target }) => target === "specimen"), true);
  assert.equal(
    deriveObservationTargets(snapshot, "en").find(({ id }) => id === "mouth")
      .name,
    "REQUEST MAW",
  );

  const embryoTargets = deriveObservationTargets({
    overview: {
      art: [" │ ●   ● │", " │ ╲[_]╱ │", " │  [●]  │"],
      abilities: snapshot.overview.abilities,
    },
    habitat: { companion: null },
  }, "en");
  assert.equal(embryoTargets.find(({ id }) => id === "mouth").lineIndex, 1);
  assert.equal(embryoTargets.find(({ id }) => id === "core").lineIndex, 2);
});

test("v2.9 exposes six readable poses and twelve chromatic signatures", () => {
  const art = [
    "    ╱◉╲╱◉╲",
    "  ╭─╱● ●╲─╮",
    "  │ ## ╲≡╱ ## │",
    "  │    [0]    │",
    "  ╰━╯ ╱██╲ ╰━━",
  ];
  const poses = ["idle", "feeding", "withdrawal", "dormant", "alert", "mutation"];
  const poseFrames = new Set(
    poses.map((pose) => deriveSpecimenFrame(
      art,
      5,
      "full",
      { pose, temperament: "clamorous" },
    ).join("\n")),
  );
  assert.equal(poseFrames.size, 6);
  assert.deepEqual(deriveSpecimenFrame(art, 5, "off", { pose: "mutation" }), art);

  const chromatics = [
    "deadline_scent",
    "phantom_cache",
    "rubber_duck_necromancy",
    "prompt_telepathy",
    "hallucination_antibodies",
    "token_transmutation",
    "merge_conflict_gills",
    "meeting_radiation",
    "lint_divination",
    "rollback_precognition",
    "synthetic_conscience",
    "budget_resurrection",
  ];
  const signatures = new Set(
    chromatics.map((chromaticAbilityId) => deriveSpecimenFrame(
      art,
      31,
      "full",
      { glitch: true, chromaticAbilityId },
    ).join("\n")),
  );
  assert.equal(signatures.size, 12);
});

test("v2.9 companion motion combines route, stage, and anomaly effects", () => {
  const art = ["    .---.", "  _/0 0\\_", " /  %  \\", " \\__^__/"];
  const frames = new Set();
  for (const routeId of ["pollution", "clarity", "paradox"]) {
    for (const stageId of ["culture", "parasite", "symbiote", "accomplice"]) {
      frames.add(deriveCompanionFrame(art, 1, "full", {
        routeId,
        stageId,
        anomalyIds: ["reactor_drool"],
      }).join("\n"));
    }
  }
  assert.equal(frames.size, 12);
  assert.notDeepEqual(
    deriveSpecimenFrame([" [0] "], 0, "full", { observedOrganId: "core" }),
    deriveSpecimenFrame([" [0] "], 1, "full", { observedOrganId: "core" }),
  );
  assert.deepEqual(observationContentStats(), { organs: 6, feedback: 24 });
});

test("semantic motion anchors cover every base-organ glyph", () => {
  const eyes = ["◉   ◉", "●   ●", "◆   ◆", "×   ×", "+   +", "◌ ◉ ◌", "0 0 0", "▣   ▣"];
  const mouths = ["╲═══╱", "╲≡≡≡╱", "╲███╱", "╲▼▼▼╱", "╲WWW╱", "╲───╱", "╲[_]╱", "╲}{ ╱"];
  const cores = ["[●X●]", "[◉X◉]", "[@X@]", "[◆X◆]", "[+X+]", "[-X-]"];
  const armor = ["▓", "█", "▒", "▦", "#", "≋"];
  const feet = ["═╩═", "╙─╜", "╱_╲", "┻━┻", "╰┳╯", "▰▰▰"];
  const tails = ["━━>", "══>", "~~>", "──>", "::>", "##>"];
  for (let index = 0; index < eyes.length; index += 1) {
    const art = [
      `╭─${armor[index % armor.length].repeat(4)}─╮`,
      `│ ${eyes[index]} │`,
      `│ ${mouths[index]} │`,
      `│ ${cores[index % cores.length]} │`,
      `│ ${feet[index % feet.length]} │`,
      `╰${tails[index % tails.length]}`,
    ];
    const anchors = deriveAnatomyAnchors(art);
    assert.deepEqual(
      Object.keys(anchors).filter((organId) => anchors[organId] < 0),
      [],
      `missing anchors for variant ${index + 1}`,
    );
    const targets = deriveObservationTargets({
      date: "2026-08-06",
      overview: {
        specimenId: `variant-${index}`,
        art,
        abilities: {
          appetite: 1,
          memory: 1,
          shell: 1,
          mouths: 1,
          glow: 1,
          instability: 1,
          withdrawal: 1,
        },
      },
    });
    assert.deepEqual(
      targets.map(({ id }) => id),
      ["eyes", "mouth", "core", "armor", "limbs", "tail"],
    );
    for (const organId of Object.keys(anchors)) {
      const base = deriveSpecimenFrame(art, 0, "full");
      const observed = deriveSpecimenFrame(art, 0, "full", {
        observedOrganId: organId,
      });
      assert.notDeepEqual(observed, base, `${organId} did not react`);
      assert.equal(observed[anchors[organId]].length, art[anchors[organId]].length);
    }
  }
});
