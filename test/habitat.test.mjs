import { existsSync } from "node:fs";

import {
  HABITAT_SCENE_ARCHETYPES,
  presentHabitatScene,
} from "../src/habitat-scenes.mjs";

import {
  assert,
  mkdirSync,
  mkdtempSync,
  path,
  readFileSync,
  rmSync,
  runCli,
  test,
  terminalWidth,
  tmpdir,
  writeCodexUsage,
  writeFileSync,
} from "./helpers.mjs";

test("living habitat keeps fifteen route-balanced deterministic scene archetypes", () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(HABITAT_SCENE_ARCHETYPES).map(([routeId, scenes]) => [
        routeId,
        scenes.length,
      ]),
    ),
    { pollution: 5, clarity: 5, paradox: 5 },
  );
  const scenes = Object.values(HABITAT_SCENE_ARCHETYPES).flat();
  assert.equal(new Set(scenes.map(({ id }) => id)).size, 15);
  assert.equal(
    new Set(scenes.flatMap(({ bulletins }) => bulletins.map(({ id }) => id)))
      .size,
    30,
  );
  assert.ok(
    scenes.every(
      ({ art, bulletins }) =>
        art.length === 3 &&
        bulletins.length === 2 &&
        bulletins.every(({ copy }) => copy.zh && copy.en),
    ),
  );
});

test("creature habitat derives a deterministic read-only snapshot", (t) => {
  const workspace = mkdtempSync(
    path.join(tmpdir(), "anti-ai-habitat-snapshot-"),
  );
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "habitat-snapshot",
    ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
    ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
    ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
    ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
    ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
    ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
  };

  const first = runCli(
    ["creature", "habitat", "--date", "2026-07-23", "--json"],
    env,
  );
  const repeated = runCli(
    ["creature", "habitat", "--date", "2026-07-23", "--json"],
    env,
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(repeated.stdout, first.stdout);
  assert.equal(existsSync(statePath), false);
  const habitat = JSON.parse(first.stdout);
  assert.equal(habitat.version, 3);
  assert.equal(habitat.date, "2026-07-23");
  assert.equal(habitat.status, "solitary");
  assert.equal(habitat.specimen.experienceDays, 0);
  assert.equal(habitat.companion, null);
  assert.equal(habitat.relationship, null);
  assert.deepEqual(habitat.events, []);
  assert.equal(habitat.cadence.days, 7);
  assert.equal(habitat.scene.version, 1);
  assert.equal(habitat.scene.routeId, "paradox");
  assert.equal(habitat.scene.layers.environment.id, habitat.scene.archetypeId);
  assert.equal(habitat.scene.layers.subject.poseId, "dormant");
  assert.equal(habitat.scene.layers.relationship.id, "solitary");
  assert.equal(habitat.scene.layers.trace, null);
  assert.match(habitat.scene.bulletinId, /^paradox_/u);
  assert.equal(habitat.scene.art.length, 3);
  assert.ok(habitat.scene.art.every((line) => typeof line === "string"));
  assert.doesNotMatch(
    first.stdout,
    /totalTokens|modelName|prompt|response|requestTimestamp|session\.jsonl/,
  );
});

test("habitat share card renders a privacy-safe read-only SVG", (t) => {
  const workspace = mkdtempSync(
    path.join(tmpdir(), "anti-ai-habitat-card-"),
  );
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "habitat-card",
    ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
    ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
    ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
    ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
    ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
    ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
  };

  const card = runCli(
    [
      "share",
      "--card",
      "habitat",
      "--date",
      "2026-07-23",
      "--lang",
      "en",
    ],
    env,
  );
  const habitatJson = runCli(
    ["creature", "habitat", "--date", "2026-07-23", "--json"],
    env,
  );

  assert.equal(card.status, 0, card.stderr);
  assert.equal(habitatJson.status, 0, habitatJson.stderr);
  const scene = presentHabitatScene(
    JSON.parse(habitatJson.stdout).scene,
    "en",
  );
  assert.match(card.stdout, /^<svg/);
  assert.match(card.stdout, /width="1200"[^>]+height="630"/);
  assert.match(card.stdout, /LIVING HABITAT SNAPSHOT/);
  assert.match(card.stdout, /HABITAT BULLETIN/);
  assert.ok(card.stdout.includes(scene.name));
  assert.ok(card.stdout.includes(scene.climate));
  assert.ok(
    card.stdout.includes(scene.bulletin.split(" ").slice(0, 5).join(" ")),
  );
  assert.match(
    card.stdout,
    /<text x="626" y="174"[^>]*><tspan x="626"/u,
  );
  assert.match(card.stdout, /UNBONDED BAY/);
  assert.match(card.stdout, /READ-ONLY/);
  assert.match(
    card.stdout,
    /no chats, paths, model names, or exact tokens/i,
  );
  assert.doesNotMatch(card.stdout, /[\p{Script=Han}]/u);
  assert.doesNotMatch(
    card.stdout,
    /session\.jsonl|\/Users\/|totalTokens|modelName|prompt|response/,
  );
  assert.equal(existsSync(statePath), false);
});

test("living habitat surfaces the latest expedition as a stable read-only trace", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-habitat-trace-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "habitat-trace",
    ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
    ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
    ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
    ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
    ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
    ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
  };
  const date = "2026-07-23";
  writeCodexUsage(
    env.ANTI_AI_CODEX_DIR,
    [{ input_tokens: 900, output_tokens: 100, total_tokens: 1_000 }],
    date,
  );
  assert.equal(runCli(["creature", "--date", date, "--json"], env).status, 0);
  const started = runCli(
    ["expedition", "start", "context_mine", "--date", date, "--json"],
    env,
  );
  assert.equal(started.status, 0, started.stderr);
  const advanced = runCli(
    ["expedition", "next", "--date", date, "--json"],
    env,
  );
  assert.equal(advanced.status, 0, advanced.stderr);
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const before = readFileSync(statePath, "utf8");

  const first = runCli(
    ["creature", "habitat", "--date", date, "--json"],
    env,
  );
  const repeated = runCli(
    ["creature", "habitat", "--date", date, "--json"],
    env,
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(repeated.stdout, first.stdout);
  assert.equal(readFileSync(statePath, "utf8"), before);
  const trace = JSON.parse(first.stdout).scene.layers.trace;
  assert.deepEqual(trace, {
    type: "expedition",
    id: "exp-0001",
    date,
  });
});

test("habitat command and share card expose focused bilingual help", () => {
  const direct = runCli([
    "creature",
    "habitat",
    "--help",
    "--lang",
    "en",
  ]);
  const alias = runCli([
    "help",
    "creature",
    "habitat",
    "--lang",
    "en",
  ]);
  const share = runCli(["help", "share", "--lang", "en"]);
  const explain = runCli(["explain", "creature", "--lang", "en"]);

  for (const result of [direct, alias, share, explain]) {
    assert.equal(result.status, 0, result.stderr);
  }
  assert.equal(direct.stdout, alias.stdout);
  assert.match(
    direct.stdout,
    /Usage: anti-ai creature habitat \[options\]/,
  );
  assert.match(direct.stdout, /read-only containment scene/i);
  assert.match(direct.stdout, /--full/);
  assert.match(direct.stdout, /--json/);
  assert.match(direct.stdout, /share --card habitat/);
  assert.doesNotMatch(direct.stdout, /[\p{Script=Han}]/u);
  assert.match(share.stdout, /companion\|habitat/);
  assert.match(share.stdout, /habitat\.svg/);
  assert.match(explain.stdout, /read-only containment habitat/i);
  assert.match(explain.stdout, /seven experience days/i);
  assert.match(explain.stdout, /15 deterministic scene archetypes/i);
  assert.match(explain.stdout, /cannot change creature or companion numbers/i);
});

test("creature habitat renders one bilingual cohabitation scene within 80 columns", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-habitat-scene-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const statePath = path.join(home, ".anti-ai", "creature.json");
  mkdirSync(path.dirname(statePath), { recursive: true });
  const day = (kind) =>
    kind === "pollution"
      ? {
          pollutionDose: 85,
          active: true,
          usageBand: "binge",
          ecologyGains: { pollution: 3, clarity: 0 },
          traits: { context: 1, cache: 2, frenzy: 2, nuclear: 1 },
          event: null,
        }
      : kind === "clarity"
        ? {
            pollutionDose: 0,
            active: false,
            usageBand: "sober",
            ecologyGains: { pollution: 0, clarity: 3 },
            traits: { context: 0, cache: 0, frenzy: 0, nuclear: 0 },
            event: null,
          }
        : {
            pollutionDose: 40,
            active: true,
            usageBand: "habitual",
            ecologyGains: { pollution: 0, clarity: 0 },
            traits: { context: 1, cache: 1, frenzy: 1, nuclear: 1 },
            event: null,
          };
  const days = Object.fromEntries(
    Array.from({ length: 23 }, (_, index) => {
      const kind =
        index < 7 ? "pollution" : index < 14 ? "clarity" : "neutral";
      return [
        `2026-07-${String(index + 1).padStart(2, "0")}`,
        day(kind),
      ];
    }),
  );
  writeFileSync(
    statePath,
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "habitat-scene",
      days,
      generations: {
        fossils: [
          {
            id: "fossil-habitat",
            generation: 1,
            sealedAt: "2026-06-20",
            ecologyId: "paradox",
            pathologyId: "cache",
            scarId: "split_shadow",
            inheritanceAbilityId: "cache",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  const env = { HOME: home, COLUMNS: "80" };
  const incubated = runCli(
    ["lab", "incubate", "1", "--date", "2026-06-30", "--json"],
    env,
  );
  assert.equal(incubated.status, 0, incubated.stderr);
  const cultureId = JSON.parse(incubated.stdout).culture.id;
  assert.equal(
    runCli(
      ["lab", "bond", cultureId, "--date", "2026-07-01", "--json"],
      env,
    ).status,
    0,
  );
  assert.equal(
    runCli(
      ["lab", "companion", "--date", "2026-07-23", "--json"],
      env,
    ).status,
    0,
  );
  const before = readFileSync(statePath, "utf8");

  const machine = runCli(
    ["creature", "habitat", "--date", "2026-07-23", "--json"],
    env,
  );
  const chinese = runCli(
    ["creature", "habitat", "--date", "2026-07-23"],
    env,
  );
  const english = runCli(
    [
      "creature",
      "habitat",
      "--date",
      "2026-07-23",
      "--lang",
      "en",
      "--full",
    ],
    env,
  );
  const colored = runCli(
    ["creature", "habitat", "--date", "2026-07-23"],
    { ...env, FORCE_COLOR: "1", NO_COLOR: "" },
  );

  for (const result of [machine, chinese, english, colored]) {
    assert.equal(result.status, 0, result.stderr);
  }
  assert.equal(readFileSync(statePath, "utf8"), before);
  const today = runCli(["today", "--date", "2026-07-23"], env);
  const week = runCli(["week", "--date", "2026-07-23"], env);
  const month = runCli(
    ["month", "--date", "2026-07-23", "--lang", "en"],
    env,
  );
  const codexJson = runCli(
    ["codex", "--date", "2026-07-23", "--json"],
    env,
  );
  const codexHuman = runCli(["codex", "--date", "2026-07-23"], env);
  for (const result of [today, week, month, codexJson, codexHuman]) {
    assert.equal(result.status, 0, result.stderr);
  }
  const habitat = JSON.parse(machine.stdout);
  assert.equal(habitat.status, "cohabiting");
  assert.equal(habitat.companion.cultureId, cultureId);
  assert.equal(habitat.relationship.cohabitationDays, 23);
  assert.equal(habitat.events.length, 3);
  assert.deepEqual(
    habitat.events.map(({ routeId }) => routeId),
    ["pollution", "clarity", "paradox"],
  );
  assert.equal(habitat.cadence.daysUntilNext, 5);
  assert.equal(habitat.scene.routeId, "paradox");
  assert.equal(
    habitat.scene.layers.relationship.id,
    habitat.relationship.id,
  );
  assert.equal(habitat.scene.layers.trace.type, "incident");
  assert.equal(habitat.scene.layers.trace.date, "2026-07-23");
  assert.match(habitat.scene.layers.trace.id, /^[0-9a-f]{8}$/u);
  assert.match(chinese.stdout, /收容生态舱/);
  assert.match(chinese.stdout, /活体场景/);
  assert.match(chinese.stdout, /生态短讯/);
  assert.match(chinese.stdout, /近期痕迹\s+收容事故余波/);
  assert.match(chinese.stdout, /关系诊断/);
  assert.match(chinese.stdout, /联合症状/);
  assert.match(chinese.stdout, /最近事件/);
  assert.match(chinese.stdout, /下次生态事件\s+5 天后/);
  assert.match(chinese.stdout, /anti-ai creature habitat --full/);
  assert.match(english.stdout, /CONTAINMENT HABITAT/);
  assert.match(english.stdout, /LIVING SCENE/);
  assert.match(english.stdout, /HABITAT BULLETIN/);
  assert.match(english.stdout, /RECENT TRACE\s+CONTAINMENT INCIDENT AFTERMATH/);
  assert.match(english.stdout, /RELATIONSHIP DIAGNOSIS/);
  assert.match(english.stdout, /SEALED ECOLOGICAL EVENTS/);
  assert.doesNotMatch(english.stdout, /[\p{Script=Han}]/u);
  assert.match(colored.stdout, /\u001b\[[0-9;]*m/);
  assert.equal(
    colored.stdout.replaceAll(/\u001b\[[0-9;]*m/g, ""),
    chinese.stdout,
  );
  for (const output of [chinese.stdout, english.stdout, colored.stdout]) {
    assert.ok(
      output
        .trimEnd()
        .split("\n")
        .every((line) => terminalWidth(line) <= 80),
      output,
    );
  }
  assert.match(today.stdout, /生态舱观察\s+交替现实 · 递归筑巢/);
  assert.match(
    week.stdout,
    /收容生态舱\s+交替现实 · 本期事件 1 · 递归筑巢/,
  );
  assert.match(
    month.stdout,
    /CONTAINMENT HABITAT\s+ALTERNATING REALITY · PERIOD EVENTS 3 · RECURSIVE NESTING/,
  );
  assert.match(
    `${today.stdout}${week.stdout}${month.stdout}`,
    /anti-ai creature habitat/,
  );
  assert.doesNotMatch(month.stdout, /[\p{Script=Han}]/u);
  const codex = JSON.parse(codexJson.stdout);
  assert.equal(codex.summary.fixed.total, 134);
  assert.deepEqual(codex.summary.habitatPhenomena, {
    discovered: 3,
    total: 30,
  });
  assert.equal(codex.sections.habitatPhenomena.length, 30);
  assert.deepEqual(
    Object.fromEntries(
      ["pollution", "clarity", "paradox"].map((routeId) => [
        routeId,
        codex.sections.habitatPhenomena.filter(
          (entry) => entry.routeId === routeId,
        ).length,
      ]),
    ),
    { pollution: 10, clarity: 10, paradox: 10 },
  );
  assert.deepEqual(
    codex.sections.habitatPhenomena
      .filter(({ discovered }) => discovered)
      .map(({ routeId }) => routeId),
    ["pollution", "clarity", "paradox"],
  );
  assert.match(codexHuman.stdout, /生态现象\s+\[3 \/ 30\]/);
  assert.match(codexHuman.stdout, /热量重构/);
  assert.match(codexHuman.stdout, /冷水停火/);
  assert.match(codexHuman.stdout, /递归筑巢/);
  assert.doesNotMatch(
    `${machine.stdout}${chinese.stdout}${english.stdout}`,
    /totalTokens|modelName|prompt|response|requestTimestamp|session\.jsonl/,
  );
});
