import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveCompanionFrame,
  deriveEventReplay,
  deriveObservationTargets,
  deriveSpecimenFrame,
  isGlitchFrame,
  motionInterval,
  nextMotionLevel,
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
