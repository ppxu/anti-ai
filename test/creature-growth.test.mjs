import {
  assert,
  Database,
  mkdirSync,
  mkdtempSync,
  path,
  readFileSync,
  rmSync,
  spawnSync,
  test,
  tmpdir,
  writeFileSync,
  baselineCodexDir,
  cliPath,
  fixtureDir,
  projectDir,
  testDir,
  creatureAppearanceContentStats,
  creatureAppearanceState,
  creatureArt,
  creatureClinicalNote,
  creatureEvent,
  deriveCreatureAppearance,
  everydayComparisonLines,
  framedFooter,
  runCli,
  shiftTestDate,
  terminalWidth,
  writeCodexUsage,
  writeHermesDb,
  writeHermesModelUsage,
  writeJsonl,
  writeOpenCodeDb,
  writeOpenCodeSessionMessageDb,
} from "./helpers.mjs";
import {
  COMMON_CREATURE_EVENTS,
  CREATURE_CLINICAL_NOTES,
  RARE_CREATURE_EVENTS,
} from "../src/creature/content.mjs";

test("creature --json turns the latest 30 days into an initial mutation file", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-home-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    {
      HOME: home,
      ANTI_AI_CREATURE_SEED: "test-seed",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), {
    date: "2026-07-23",
    status: "active",
    stage: "contaminated_embryo",
    branch: "nuclear",
    form: "compute_embryo",
    exposure: 27,
    nextStageAt: 7,
    progressPercent: 14,
    quietStreakDays: 0,
    activeStreakDays: 1,
    ageDays: 1,
    experienceDays: 1,
    observedDays: 30,
    activeDays: 1,
    traits: {
      context: 0.01,
      cache: 15.2,
      frenzy: 1.08,
      nuclear: 22.68,
    },
    level: 1,
    abilities: {
      appetite: 1,
      memory: 0,
      shell: 1,
      mouths: 0,
      glow: 1,
      instability: 0,
      withdrawal: 0,
    },
    abilityTotals: {
      appetite: 1,
      memory: 0,
      shell: 1,
      mouths: 0,
      glow: 1,
      instability: 0,
      withdrawal: 0,
    },
    abilityProgress: {
      appetite: {
        value: 1,
        totalPoints: 1,
        malignancyRank: 0,
        nextMalignancyAt: 256,
      },
      memory: {
        value: 0,
        totalPoints: 0,
        malignancyRank: 0,
        nextMalignancyAt: 256,
      },
      shell: {
        value: 1,
        totalPoints: 1,
        malignancyRank: 0,
        nextMalignancyAt: 256,
      },
      mouths: {
        value: 0,
        totalPoints: 0,
        malignancyRank: 0,
        nextMalignancyAt: 256,
      },
      glow: {
        value: 1,
        totalPoints: 1,
        malignancyRank: 0,
        nextMalignancyAt: 256,
      },
      instability: {
        value: 0,
        totalPoints: 0,
        malignancyRank: 0,
        nextMalignancyAt: 256,
      },
      withdrawal: {
        value: 0,
        totalPoints: 0,
        malignancyRank: 0,
        nextMalignancyAt: 256,
      },
    },
    malignancyRanks: {
      appetite: 0,
      memory: 0,
      shell: 0,
      mouths: 0,
      glow: 0,
      instability: 0,
      withdrawal: 0,
    },
    malignancies: [],
    abilityPoints: 3,
    dominantAbility: "appetite",
    temperament: "voracious",
    epithet: "token_sink",
    talents: [],
    rareChancePercent: 8,
    rareAbilities: {},
    rareAbilityChancesPercent: {
      rare: 0.5,
      epic: 0.1,
      mythic: 0.02,
    },
    collections: {
      mutationEvents: 1,
      rareMutations: 0,
      talentsUnlocked: 0,
      rareAbilitiesUnlocked: 0,
      achievementsUnlocked: 0,
      formsUnlocked: 1,
      appearancePartsUnlocked: 3,
      specimensCollected: 1,
      fossilsSealed: 0,
      evolutionTriggers: 0,
      evolutionBenefitPoints: 0,
      evolutionCostPoints: 0,
      evolutionsMissed: 0,
    },
    generation: {
      number: 1,
      day: 1,
      length: 90,
      progressPercent: 1,
      inheritedAbilityId: null,
      scarId: null,
    },
    fossils: [],
    evolution: null,
    ecology: {
      balanceVersion: 2,
      pollution: 1,
      clarity: 0,
      pollutionRate: 1,
      clarityRate: 0,
      windowDays: 1,
      windowPollution: 1,
      windowClarity: 0,
      type: "unformed",
      pendingType: "polluted",
      pendingDays: 1,
    },
    ecologyForm: "extinguished_core",
    appearance: {
      version: 1,
      specimenId: "609f9f4b",
      geneIds: {
        body: "body_03",
        eyes: "eyes_08",
        mouth: "mouth_02",
        core: "core_01",
        limbs: "limbs_06",
        tail: "tail_06",
        pattern: "pattern_02",
      },
      partIds: ["body_03", "eyes_08", "mouth_02"],
      fingerprint: "a78d962af277",
      stageIndex: 0,
      ecology: "unformed",
      pathology: "nuclear",
      formId: "extinguished_core",
      achievementId: null,
      achievementCategory: null,
      rareAbilityId: null,
      scarId: null,
    },
    achievements: {
      unlocked: [],
      recent: [],
      total: 36,
    },
    title: {
      modifierId: "awaiting_shape",
      coreId: "extinguished_core",
      achievementId: null,
    },
    collectionPhenotype: {
      version: 1,
      presentationOnly: true,
      discovered: 1,
      total: 134,
      breadth: 1,
      totalCategories: 7,
      tier: 0,
      milestone: 0,
      breadthRequired: 0,
      motifId: null,
      triggeredAt: null,
      routeId: "unformed",
      variantId: null,
      next: { tier: 1, count: 34, breadth: 3 },
    },
    mood: "token_chewing",
    today: {
      contentVersion: 2,
      balanceVersion: 2,
      pollutionDose: 27,
      usageBand: "calibrating",
      ecologyGains: {
        pollution: 1,
        clarity: 0,
      },
      event: {
        id: "snapshot_bloating",
        rarity: "common",
      },
      abilityGains: {
        appetite: 1,
        memory: 0,
        shell: 1,
        mouths: 0,
        glow: 1,
        instability: 0,
        withdrawal: 0,
      },
      rareAbilityGain: null,
      achievementUnlockIds: [],
      newTalents: [],
      evolutionEffect: null,
    },
    casebook: {
      current: null,
      selectedCount: 0,
    },
    incident: {
      current: null,
      resolvedCount: 0,
      dispositions: {
        quarantine: 0,
        observe: 0,
        resonate: 0,
      },
    },
    companion: null,
  });
});

test("creature persists one deterministic mutation event per active day", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-event-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "test-seed",
  };

  const first = runCli(["creature", "--date", "2026-07-23", "--json"], env);
  const second = runCli(["creature", "--date", "2026-07-23", "--json"], env);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(JSON.parse(second.stdout), JSON.parse(first.stdout));
  assert.deepEqual(JSON.parse(first.stdout).today.event, {
    id: "snapshot_bloating",
    rarity: "common",
  });
});

test("creature content v2 preserves legacy event rolls and versions new days", (t) => {
  assert.deepEqual(creatureEvent("test-seed", "2026-07-23", 0, 0, 1), {
    id: "cache_calcification",
    trait: "cache",
    delta: 8,
    rarity: "common",
  });

  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-content-version-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 12,
      seed: "legacy-content-version",
      days: {
        "2026-07-22": {
          pollutionDose: 0,
          active: false,
          usageBand: "sober",
          ecologyGains: { pollution: 0, clarity: 0 },
          traits: { context: 0, cache: 0, frenzy: 0, nuclear: 0 },
          event: null,
          abilityGains: {
            appetite: 0,
            memory: 0,
            shell: 0,
            mouths: 0,
            glow: 0,
            instability: 0,
            withdrawal: 0,
          },
          rareAbilityGain: null,
        },
      },
    })}\n`,
  );

  const result = runCli(["creature", "--date", "2026-07-23", "--json"], {
    HOME: home,
    ANTI_AI_CODEX_DIR: path.join(home, "missing-codex"),
  });
  assert.equal(result.status, 0, result.stderr);
  const saved = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  assert.equal(saved.schemaVersion, 14);
  assert.equal(saved.days["2026-07-22"].contentVersion, 1);
  assert.equal(saved.days["2026-07-23"].contentVersion, 2);
});

test("v2 achievements unlock on a new day without rewriting legacy discovery dates", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-content-achievement-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  const days = Object.fromEntries(
    Array.from({ length: 15 }, (_, index) => [
      shiftTestDate("2026-07-01", index),
      {
        pollutionDose: 40,
        active: true,
        usageBand: "heavy",
        ecologyGains: { pollution: 1, clarity: 0 },
        traits: { context: 40, cache: 0, frenzy: 0, nuclear: 0 },
        event: { id: "misplaced_context", rarity: "common" },
        abilityGains: {
          appetite: 1,
          memory: 1,
          shell: 0,
          mouths: 0,
          glow: 0,
          instability: 0,
          withdrawal: 0,
        },
        rareAbilityGain: null,
      },
    ]),
  );
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 12,
      seed: "legacy-achievement-version",
      days,
    })}\n`,
  );

  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: path.join(home, "missing-codex"),
  };
  const result = runCli(["creature", "--date", "2026-07-16", "--json"], env);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  const achievement = report.achievements.unlocked.find(
    ({ id }) => id === "context_landfill",
  );
  assert.equal(achievement.unlockedAt, "2026-07-16");
  const legacyCodex = runCli(
    ["codex", "--date", "2026-07-15", "--json"],
    env,
  );
  assert.equal(legacyCodex.status, 0, legacyCodex.stderr);
  assert.equal(
    JSON.parse(legacyCodex.stdout).sections.achievements.find(
      ({ id }) => id === "context_landfill",
    ).discovered,
    false,
  );
});

test("creature events and clinical notes have enough deterministic variety", () => {
  assert.equal(COMMON_CREATURE_EVENTS.length, 28);
  assert.equal(RARE_CREATURE_EVENTS.length, 21);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(CREATURE_CLINICAL_NOTES).map(([symptom, notes]) => [
        symptom,
        notes.length,
      ]),
    ),
    {
      context: 12,
      cache: 12,
      frenzy: 12,
      nuclear: 12,
      withdrawal: 12,
      unhatched: 12,
    },
  );
  const events = new Set();
  for (let day = 0; day < 800; day += 1) {
    events.add(
      creatureEvent(
        "content-richness",
        shiftTestDate("2026-01-01", day),
        999,
      ).id,
    );
  }
  assert.ok(events.size >= 18, `creature events: ${events.size}`);

  for (const symptom of [
    "context",
    "cache",
    "frenzy",
    "nuclear",
    "withdrawal",
    "unhatched",
  ]) {
    const notes = new Set();
    for (let day = 0; day < 120; day += 1) {
      const startDate = shiftTestDate("2026-01-01", day);
      notes.add(
        creatureClinicalNote(
          {
            startDate,
            endDate: shiftTestDate(startDate, 6),
            primarySymptom: symptom,
            ecology: { to: day % 2 === 0 ? "polluted" : "lucid" },
          },
          "zh",
          day % 2 === 0 ? "week" : "month",
        ),
      );
    }
    assert.ok(notes.size >= 5, `${symptom} clinical notes: ${notes.size}`);
  }
});

test("creature gives every settled day neutral experience and exposes ecology", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-ecology-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(["creature", "--date", "2026-07-23", "--json"], {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "ecology-seed",
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.experienceDays, 1);
  assert.deepEqual(report.ecology, {
    balanceVersion: 2,
    pollution: 1,
    clarity: 0,
    pollutionRate: 1,
    clarityRate: 0,
    windowDays: 1,
    windowPollution: 1,
    windowClarity: 0,
    type: "unformed",
    pendingType: "polluted",
    pendingDays: 1,
  });
  assert.deepEqual(report.today.ecologyGains, {
    pollution: 1,
    clarity: 0,
  });
  assert.equal(report.today.usageBand, "calibrating");
});

test("an unhatched creature keeps the first-stage threshold before generation one", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-unhatched-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  const emptyCodex = path.join(workspace, "empty-codex");
  const emptyClaude = path.join(workspace, "empty-claude");
  mkdirSync(emptyCodex, { recursive: true });
  mkdirSync(emptyClaude, { recursive: true });

  const result = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    {
      HOME: home,
      ANTI_AI_CODEX_DIR: emptyCodex,
      ANTI_AI_CLAUDE_DIR: emptyClaude,
      ANTI_AI_CREATURE_SEED: "unhatched-seed",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.experienceDays, 0);
  assert.equal(report.nextStageAt, 7);
  assert.deepEqual(report.generation, {
    number: 0,
    day: 0,
    length: 90,
    progressPercent: 0,
    inheritedAbilityId: null,
    scarId: null,
  });
});

test("creature uses the twenty-eight-day active baseline and rewards quiet days equally", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-ecology-bands-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const regularUsage = [
    {
      input_tokens: 900,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 1_000,
    },
  ];
  const heavyUsage = [
    {
      input_tokens: 1_800,
      cached_input_tokens: 0,
      output_tokens: 200,
      total_tokens: 2_000,
    },
  ];
  for (let day = 1; day <= 7; day += 1) {
    writeCodexUsage(root, regularUsage, `2026-07-${String(day).padStart(2, "0")}`);
  }
  writeCodexUsage(root, heavyUsage, "2026-07-08");
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "ecology-bands",
  };

  const heavy = runCli(["creature", "--date", "2026-07-08", "--json"], env);
  const quiet = runCli(["creature", "--date", "2026-07-09", "--json"], env);

  assert.equal(heavy.status, 0, heavy.stderr);
  assert.equal(quiet.status, 0, quiet.stderr);
  const heavyReport = JSON.parse(heavy.stdout);
  const quietReport = JSON.parse(quiet.stdout);
  assert.equal(heavyReport.experienceDays, 8);
  assert.equal(heavyReport.stage, "mutated_juvenile");
  assert.equal(heavyReport.today.usageBand, "heavy");
  assert.deepEqual(heavyReport.today.ecologyGains, {
    pollution: 1,
    clarity: 0,
  });
  assert.equal(quietReport.experienceDays, 9);
  assert.equal(quietReport.stage, "mutated_juvenile");
  assert.equal(quietReport.today.usageBand, "sober");
  assert.deepEqual(quietReport.today.ecologyGains, {
    pollution: 0,
    clarity: 3,
  });
});

test("raw token volume never grants an extra creature ability point", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-volume-guardrail-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const lowRoot = path.join(workspace, "low-codex");
  const highRoot = path.join(workspace, "high-codex");
  const usage = (totalTokens) => [
    {
      input_tokens: Math.round(totalTokens * 0.9),
      cached_input_tokens: 0,
      output_tokens: Math.round(totalTokens * 0.1),
      total_tokens: totalTokens,
    },
  ];
  for (const date of ["2026-07-22", "2026-07-23"]) {
    writeCodexUsage(lowRoot, usage(100_000), date);
    writeCodexUsage(highRoot, usage(2_000_000), date);
  }
  const environment = (home, root) => ({
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "volume-guardrail",
  });

  const low = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    environment(path.join(workspace, "low-home"), lowRoot),
  );
  const high = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    environment(path.join(workspace, "high-home"), highRoot),
  );

  assert.equal(low.status, 0, low.stderr);
  assert.equal(high.status, 0, high.stderr);
  const lowCreature = JSON.parse(low.stdout);
  const highCreature = JSON.parse(high.stdout);
  assert.ok(highCreature.today.pollutionDose >= 75);
  assert.equal(lowCreature.today.abilityGains.appetite, 1);
  assert.equal(highCreature.today.abilityGains.appetite, 1);
  assert.equal(highCreature.abilityPoints, lowCreature.abilityPoints);
  assert.equal(lowCreature.today.ecologyGains.pollution, 0);
  assert.equal(highCreature.today.ecologyGains.pollution, 1);
});

test("a weekly token spike is not laundered into a lucid ecology", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-robust-baseline-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  for (let day = 0; day < 28; day += 1) {
    const totalTokens = (day + 1) % 7 === 0 ? 700_000 : 100_000;
    writeCodexUsage(
      root,
      [
        {
          input_tokens: Math.round(totalTokens * 0.9),
          cached_input_tokens: 0,
          output_tokens: Math.round(totalTokens * 0.1),
          total_tokens: totalTokens,
        },
      ],
      shiftTestDate("2026-07-01", day),
    );
  }

  const result = runCli(
    ["creature", "--date", "2026-07-28", "--json"],
    {
      HOME: home,
      ANTI_AI_CODEX_DIR: root,
      ANTI_AI_CREATURE_SEED: "robust-baseline",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const creature = JSON.parse(result.stdout);
  assert.equal(creature.ecology.type, "unformed");
  assert.equal(creature.ecology.clarity, 0);
  assert.equal(creature.today.usageBand, "meltdown");
});

test("a sustained token reduction earns a meaningful clarity runway", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-reduction-runway-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  for (let day = 0; day < 42; day += 1) {
    const totalTokens = day < 28 ? 100_000 : 30_000;
    writeCodexUsage(
      root,
      [
        {
          input_tokens: Math.round(totalTokens * 0.9),
          cached_input_tokens: 0,
          output_tokens: Math.round(totalTokens * 0.1),
          total_tokens: totalTokens,
        },
      ],
      shiftTestDate("2026-06-01", day),
    );
  }
  const environment = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "reduction-runway",
  };

  const hatch = runCli(
    ["creature", "--date", "2026-06-01", "--json"],
    environment,
  );
  const settled = runCli(
    ["creature", "--date", "2026-07-12", "--json"],
    environment,
  );
  const history = runCli(
    ["creature", "history", "--date", "2026-07-12", "--full", "--json"],
    environment,
  );

  assert.equal(hatch.status, 0, hatch.stderr);
  assert.equal(settled.status, 0, settled.stderr);
  assert.equal(history.status, 0, history.stderr);
  const reductionDays = JSON.parse(history.stdout).daily.slice(-14);
  assert.equal(reductionDays.length, 14);
  assert.ok(
    reductionDays.filter(({ usageBand }) =>
      ["restrained", "light"].includes(usageBand),
    ).length >= 12,
  );
});

test("creature renders a stable individualized ASCII specimen from its local genome", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-genome-art-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const firstEnv = {
    HOME: path.join(workspace, "first"),
    ANTI_AI_CREATURE_SEED: "genome-first",
  };
  const secondEnv = {
    HOME: path.join(workspace, "second"),
    ANTI_AI_CREATURE_SEED: "genome-second",
  };

  const firstJson = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    firstEnv,
  );
  const repeatedArt = runCli(
    ["creature", "--date", "2026-07-23"],
    firstEnv,
  );
  const firstArt = runCli(
    ["creature", "--date", "2026-07-23"],
    firstEnv,
  );
  const englishArt = runCli(
    ["creature", "--date", "2026-07-23", "--lang", "en"],
    firstEnv,
  );
  const coloredArt = runCli(["creature", "--date", "2026-07-23"], {
    ...firstEnv,
    FORCE_COLOR: "1",
    NO_COLOR: "",
  });
  const secondJson = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    secondEnv,
  );
  const secondArt = runCli(
    ["creature", "--date", "2026-07-23"],
    secondEnv,
  );

  for (const result of [
    firstJson,
    repeatedArt,
    firstArt,
    englishArt,
    coloredArt,
    secondJson,
    secondArt,
  ]) {
    assert.equal(result.status, 0, result.stderr);
  }
  const firstReport = JSON.parse(firstJson.stdout);
  const secondReport = JSON.parse(secondJson.stdout);
  assert.match(firstReport.appearance.specimenId, /^[0-9a-f]{8}$/);
  assert.equal(firstReport.appearance.version, 1);
  assert.deepEqual(Object.keys(firstReport.appearance.geneIds), [
    "body",
    "eyes",
    "mouth",
    "core",
    "limbs",
    "tail",
    "pattern",
  ]);
  assert.ok(firstReport.appearance.partIds.length >= 3);
  assert.match(firstReport.appearance.fingerprint, /^[0-9a-f]{12}$/);
  assert.notEqual(
    firstReport.appearance.fingerprint,
    secondReport.appearance.fingerprint,
  );
  assert.match(firstArt.stdout, new RegExp(`标本编号\\s+${firstReport.appearance.specimenId}`));
  assert.equal(firstArt.stdout, repeatedArt.stdout);

  const artLines = (output) => {
    const lines = output.split("\n");
    const specimenIndex = lines.findIndex(
      (line) => line.includes("标本编号") || line.includes("SPECIMEN ID"),
    );
    return lines.slice(2, specimenIndex - 1);
  };
  const firstArtLines = artLines(firstArt.stdout);
  const englishArtLines = artLines(englishArt.stdout);
  const coloredArtLines = artLines(
    coloredArt.stdout.replace(/\u001b\[[0-9;]*m/g, ""),
  );
  const secondArtLines = artLines(secondArt.stdout);
  assert.deepEqual(firstArtLines, englishArtLines);
  assert.deepEqual(firstArtLines, coloredArtLines);
  assert.notDeepEqual(firstArtLines, secondArtLines);
  assert.ok(firstArtLines.length >= 5);
  assert.ok(firstArtLines.every((line) => terminalWidth(line) <= 39));
  assert.ok(secondArtLines.every((line) => terminalWidth(line) <= 39));
});

test("reactor kaiju standard anatomy grows through four bounded stages", () => {
  const appearanceState = creatureAppearanceState("reactor-kaiju-standard");
  const stageLimits = [15, 25, 34, 39];
  const stageLineCounts = [8, 9, 9, 10];
  const arts = stageLimits.map((limit, stageIndex) => {
    const appearance = deriveCreatureAppearance(
      appearanceState,
      stageIndex,
      "polluted",
      "nuclear",
      [],
      {},
    );
    const art = creatureArt({ appearance });
    const lines = art.split("\n");
    const width = Math.max(...lines.map((line) => terminalWidth(line)));
    assert.equal(lines.length, stageLineCounts[stageIndex]);
    assert.ok(width <= limit, `stage ${stageIndex + 1} exceeded ${limit} columns`);
    return { art, width };
  });

  assert.ok(arts[0].art.includes("["));
  assert.match(arts[1].art, /╱╲╱╲/);
  assert.match(arts[2].art, /━━$/m);
  assert.match(arts[3].art, /[>》]$/m);
  assert.ok(
    arts.every(({ width }, index) => index === 0 || width > arts[index - 1].width),
    `stage widths did not grow monotonically: ${arts.map(({ width }) => width).join(", ")}`,
  );
});

test("reactor kaiju keeps ecology and pathology visibly distinct on one skeleton", () => {
  const appearanceState = creatureAppearanceState("reactor-kaiju-ecology");
  const ecologies = ["unformed", "polluted", "lucid", "paradox"];
  const pathologies = ["context", "cache", "frenzy", "nuclear"];
  const ecologyArts = new Set(
    ecologies.map((ecology) =>
      creatureArt({
        appearance: deriveCreatureAppearance(
          appearanceState,
          3,
          ecology,
          "nuclear",
          [],
          {},
        ),
      }),
    ),
  );
  const pathologyArts = new Set(
    pathologies.map((pathology) =>
      creatureArt({
        appearance: deriveCreatureAppearance(
          appearanceState,
          3,
          "polluted",
          pathology,
          [],
          {},
        ),
      }),
    ),
  );

  assert.equal(ecologyArts.size, ecologies.length);
  assert.equal(pathologyArts.size, pathologies.length);
});

test("all reactor kaiju stages keep 10,000 seeded specimens diverse and bounded", () => {
  const appearances = new Set();
  const stageLimits = [15, 25, 34, 39];
  for (let index = 0; index < 10_000; index += 1) {
    const appearanceState = creatureAppearanceState(`collision-seed-${index}`);
    for (let stageIndex = 0; stageIndex < stageLimits.length; stageIndex += 1) {
      const appearance = deriveCreatureAppearance(
        appearanceState,
        stageIndex,
        "paradox",
        "context",
        [],
        {},
      );
      const art = creatureArt({ appearance });
      if (stageIndex === 3) appearances.add(art);
      assert.ok(
        art
          .split("\n")
          .every((line) => terminalWidth(line) <= stageLimits[stageIndex]),
        `seed ${index} stage ${stageIndex + 1} exceeded ${stageLimits[stageIndex]} columns`,
      );
    }
  }

  const collisionRate = (10_000 - appearances.size) / 10_000;
  assert.ok(collisionRate <= 0.05, `collision rate was ${collisionRate}`);
  assert.deepEqual(creatureAppearanceContentStats(), {
    basePartIds: 54,
    formFamilies: 16,
    achievements: 36,
  });
});

test("creature unlocks equally visible feeding and sobriety achievements", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-achievements-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const usage = [
    {
      input_tokens: 900,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 1_000,
    },
  ];
  for (let day = 1; day <= 7; day += 1) {
    writeCodexUsage(root, usage, `2026-07-${String(day).padStart(2, "0")}`);
  }
  writeCodexUsage(root, usage, "2026-07-11");
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "achievement-seed",
  };

  const active = runCli(["creature", "--date", "2026-07-07", "--json"], env);
  const quiet = runCli(["creature", "--date", "2026-07-08", "--json"], env);
  const human = runCli(["creature", "--date", "2026-07-08"], env);
  const coloredHuman = runCli(["creature", "--date", "2026-07-08"], {
    ...env,
    FORCE_COLOR: "1",
    NO_COLOR: "",
  });
  const paradoxHuman = runCli(["creature", "--date", "2026-07-11"], {
    ...env,
    FORCE_COLOR: "1",
    NO_COLOR: "",
  });

  assert.equal(active.status, 0, active.stderr);
  assert.equal(quiet.status, 0, quiet.stderr);
  assert.equal(human.status, 0, human.stderr);
  assert.equal(coloredHuman.status, 0, coloredHuman.stderr);
  assert.equal(paradoxHuman.status, 0, paradoxHuman.stderr);
  const activeReport = JSON.parse(active.stdout);
  const quietReport = JSON.parse(quiet.stdout);
  assert.ok(
    activeReport.achievements.unlocked.some(
      (achievement) => achievement.id === "seven_day_feeding",
    ),
  );
  assert.ok(
    quietReport.achievements.unlocked.some(
      (achievement) => achievement.id === "first_supply_cut",
    ),
  );
  assert.deepEqual(
    quietReport.achievements.recent.map((achievement) => achievement.id),
    ["first_supply_cut", "withdrawal_reactor"],
  );
  assert.equal(
    quietReport.collections.achievementsUnlocked,
    quietReport.achievements.unlocked.length,
  );
  assert.match(quietReport.title.modifierId, /^[a-z_]+$/);
  assert.equal(quietReport.title.coreId, quietReport.ecologyForm);
  assert.match(human.stdout, /徽章\s+\[\d+\]/);
  assert.match(human.stdout, /今日成就\s+第一次断供/);
  assert.match(human.stdout, /称号\s+.*戒断反应堆/);
  assert.ok(coloredHuman.stdout.includes("\u001b[1;31m七日连喂"));
  assert.ok(coloredHuman.stdout.includes("\u001b[1;36m第一次断供"));
  assert.ok(paradoxHuman.stdout.includes("\u001b[1;33m续杯戒断者"));
});

test("repeatable achievements grow through three non-token tiers", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-achievement-tier-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const usage = [
    {
      input_tokens: 900,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 1_000,
    },
  ];
  for (let day = 1; day <= 30; day += 1) {
    writeCodexUsage(root, usage, `2026-06-${String(day).padStart(2, "0")}`);
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "achievement-tier-seed",
  };

  const json = runCli(["creature", "--date", "2026-06-30", "--json"], env);
  const human = runCli(["creature", "--date", "2026-06-30"], env);

  assert.equal(json.status, 0, json.stderr);
  assert.equal(human.status, 0, human.stderr);
  const achievement = JSON.parse(json.stdout).achievements.unlocked.find(
    (candidate) => candidate.id === "seven_day_feeding",
  );
  assert.deepEqual(achievement, {
    id: "seven_day_feeding",
    category: "offense",
    rarity: "common",
    tier: 2,
    maxTier: 3,
    progress: 30,
    nextTierAt: 100,
    unlockedAt: "2026-06-07",
  });
  assert.match(human.stdout, /七日连喂 \[定罪 30\/100\]/);
});

test("creature grows achievement-marked ASCII complexity without extra token experience", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-art-growth-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 900,
        cached_input_tokens: 0,
        output_tokens: 100,
        total_tokens: 1_000,
      },
    ],
    "2026-01-01",
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "art-growth",
  };

  const hatch = runCli(["creature", "--date", "2026-01-01", "--json"], env);
  const grown = runCli(["creature", "--date", "2026-03-31", "--json"], env);

  assert.equal(hatch.status, 0, hatch.stderr);
  assert.equal(grown.status, 0, grown.stderr);
  const hatchReport = JSON.parse(hatch.stdout);
  const grownReport = JSON.parse(grown.stdout);
  assert.equal(hatchReport.experienceDays, 1);
  assert.equal(hatchReport.appearance.partIds.length, 3);
  assert.equal(grownReport.experienceDays, 90);
  assert.equal(grownReport.stage, "catastrophe_complete");
  assert.equal(grownReport.ecology.type, "lucid");
  assert.equal(grownReport.appearance.partIds.length, 9);
  assert.ok(
    grownReport.appearance.partIds.some((partId) =>
      partId.startsWith("achievement_"),
    ),
  );
  assert.notEqual(
    grownReport.appearance.fingerprint,
    hatchReport.appearance.fingerprint,
  );
});

test("chromatic mutations visibly outrank achievement marks on complete forms", () => {
  const appearanceState = creatureAppearanceState("chromatic-priority");
  const achievements = [
    {
      id: "seven_day_feeding",
      category: "offense",
      rarity: "common",
      tier: 1,
      unlockedAt: "2026-01-07",
    },
  ];
  const achievementOnly = deriveCreatureAppearance(
    appearanceState,
    3,
    "polluted",
    "frenzy",
    achievements,
    {},
  );
  const chromatic = deriveCreatureAppearance(
    appearanceState,
    3,
    "polluted",
    "frenzy",
    achievements,
    { deadline_scent: { rarity: "rare", level: 1 } },
  );

  assert.equal(chromatic.partIds.at(-1), "chromatic_deadline_scent");
  assert.notEqual(chromatic.fingerprint, achievementOnly.fingerprint);
  assert.notEqual(
    creatureArt({ appearance: chromatic }),
    creatureArt({ appearance: achievementOnly }),
  );

  const embryo = deriveCreatureAppearance(
    appearanceState,
    0,
    "unformed",
    "frenzy",
    [],
    {},
  );
  const chromaticEmbryo = deriveCreatureAppearance(
    appearanceState,
    0,
    "unformed",
    "frenzy",
    [],
    { deadline_scent: { rarity: "rare", level: 1 } },
  );
  assert.equal(chromaticEmbryo.partIds.length, 3);
  assert.notEqual(chromaticEmbryo.fingerprint, embryo.fingerprint);
  assert.notEqual(
    creatureArt({ appearance: chromaticEmbryo }),
    creatureArt({ appearance: embryo }),
  );

  const scarredEmbryo = deriveCreatureAppearance(
    appearanceState,
    0,
    "unformed",
    "frenzy",
    [],
    {},
    "sterile_halo",
  );
  assert.ok(scarredEmbryo.partIds.includes("scar_sterile_halo"));
  assert.notEqual(scarredEmbryo.fingerprint, embryo.fingerprint);
  assert.notEqual(
    creatureArt({ appearance: scarredEmbryo }),
    creatureArt({ appearance: embryo }),
  );
});

test("v2.9 growth marks add new overlays and one current-generation graft", () => {
  const state = creatureAppearanceState("pathological-proliferation");
  const achievementAppearance = deriveCreatureAppearance(
    state,
    3,
    "paradox",
    "context",
    [{
      id: "balanced_damage",
      category: "paradox",
      rarity: "rare",
      tier: 1,
      unlockedAt: "2026-08-06",
    }],
    {},
    null,
    "loaded_nerve",
  );
  const chromaticAppearance = deriveCreatureAppearance(
    state,
    3,
    "polluted",
    "nuclear",
    [],
    { budget_resurrection: { rarity: "mythic", level: 1 } },
    null,
    "reactor_bladder",
  );

  assert.match(creatureArt({ appearance: achievementAppearance }), /!\+\?\+!/u);
  assert.match(creatureArt({ appearance: achievementAppearance }), /\{\?x\?\}/u);
  assert.match(creatureArt({ appearance: chromaticAppearance }), /@Z@Z@/u);
  assert.match(creatureArt({ appearance: chromaticAppearance }), /\{☢o☢\}/u);
  assert.ok(achievementAppearance.partIds.includes("evolution_loaded_nerve"));
});

test("creature grows deterministic random abilities and exposes playable state", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-abilities-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "ability-seed",
  };

  const first = runCli(["creature", "--date", "2026-07-23", "--json"], env);
  const second = runCli(["creature", "--date", "2026-07-23", "--json"], env);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const report = JSON.parse(first.stdout);
  assert.deepEqual(JSON.parse(second.stdout), report);
  assert.deepEqual(Object.keys(report.abilities), [
    "appetite",
    "memory",
    "shell",
    "mouths",
    "glow",
    "instability",
    "withdrawal",
  ]);
  assert.ok(
    Object.values(report.abilities).every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 255,
    ),
  );
  assert.ok(Object.values(report.today.abilityGains).some((value) => value > 0));
  assert.ok(Object.hasOwn(report.abilities, report.dominantAbility));
  assert.ok(report.level >= 1);
  assert.ok(report.abilityPoints > 0);
  assert.match(report.temperament, /^[a-z_]+$/);
  assert.match(report.mood, /^[a-z_]+$/);
  assert.ok(report.rareChancePercent >= 8);
  assert.deepEqual(report.collections, {
    mutationEvents: 1,
    rareMutations: 0,
    talentsUnlocked: report.talents.length,
    rareAbilitiesUnlocked: 0,
    achievementsUnlocked: report.achievements.unlocked.length,
    formsUnlocked: 1,
    appearancePartsUnlocked: report.appearance.partIds.length,
    specimensCollected: 1,
    fossilsSealed: 0,
    evolutionTriggers: 0,
    evolutionBenefitPoints: 0,
    evolutionCostPoints: 0,
    evolutionsMissed: 0,
  });
});

test("creature rolls legacy ability points into 255-point malignancy ranks without loss", (t) => {
  const workspace = mkdtempSync(
    path.join(tmpdir(), "anti-ai-creature-malignancy-"),
  );
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 5,
      seed: "malignancy-migration",
      days: {
        "2026-07-22": {
          pollutionDose: 100,
          active: true,
          usageBand: "meltdown",
          ecologyGains: { pollution: 3, clarity: 0 },
          traits: { context: 0, cache: 0, frenzy: 0, nuclear: 100 },
          event: null,
          abilityGains: {
            appetite: 267,
            memory: 0,
            shell: 0,
            mouths: 0,
            glow: 0,
            instability: 0,
            withdrawal: 0,
          },
          rareAbilityGain: null,
        },
      },
    })}\n`,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
  };

  const json = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    env,
  );
  const human = runCli(
    ["creature", "--date", "2026-07-23", "--lang", "en", "--full"],
    env,
  );
  const colored = runCli(
    ["creature", "--date", "2026-07-23", "--lang", "en", "--full"],
    {
      ...env,
      FORCE_COLOR: "1",
      NO_COLOR: "",
    },
  );
  const compact = runCli(
    ["creature", "--date", "2026-07-23", "--lang", "en"],
    {
      ...env,
      COLUMNS: "120",
    },
  );

  assert.equal(json.status, 0, json.stderr);
  const report = JSON.parse(json.stdout);
  assert.equal(report.abilities.appetite, 12);
  assert.equal(report.abilityTotals.appetite, 267);
  assert.equal(report.malignancyRanks.appetite, 1);
  assert.deepEqual(report.abilityProgress.appetite, {
    value: 12,
    totalPoints: 267,
    malignancyRank: 1,
    nextMalignancyAt: 511,
  });
  assert.deepEqual(report.malignancies, [
    {
      abilityId: "appetite",
      rank: 1,
      titleId: "famine_tumor",
      evolutionChanceBonusPercent: 2,
    },
  ]);
  assert.equal(human.status, 0, human.stderr);
  assert.match(
    human.stdout,
    /TOKEN APPETITE · MALIGNANT I\s+█░{9}\s+12 \/ 255/,
  );
  assert.match(human.stdout, /MALIGNANT GROWTH\s+\[1\] FAMINE TUMOR I/);
  assert.equal(colored.status, 0, colored.stderr);
  assert.match(
    colored.stdout,
    /\u001b\[1;31mTOKEN APPETITE · MALIGNANT I\u001b\[0m/,
  );
  assert.equal(compact.status, 0, compact.stderr);
  assert.match(
    compact.stdout,
    /TOKEN APPETITE · MALIGNANT I\s+█░{9}\s+12 \/ 255/,
  );
  assert.ok(
    compact.stdout
      .trimEnd()
      .split("\n")
      .every((line) => terminalWidth(line) <= 120),
    compact.stdout,
  );
  const saved = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  assert.equal(saved.schemaVersion, 14);
  assert.equal(saved.days["2026-07-22"].abilityGains.appetite, 267);
});

test("creature remaps all six regular talent tiers into one 255-point cycle", (t) => {
  const workspace = mkdtempSync(
    path.join(tmpdir(), "anti-ai-creature-talent-cycle-"),
  );
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 5,
      seed: "talent-cycle-migration",
      days: {
        "2026-07-22": {
          pollutionDose: 100,
          active: true,
          usageBand: "meltdown",
          ecologyGains: { pollution: 3, clarity: 0 },
          traits: { context: 0, cache: 0, frenzy: 0, nuclear: 100 },
          event: null,
          abilityGains: {
            appetite: 220,
            memory: 0,
            shell: 0,
            mouths: 0,
            glow: 0,
            instability: 0,
            withdrawal: 0,
          },
          rareAbilityGain: null,
        },
      },
    })}\n`,
  );

  const result = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    {
      HOME: home,
      ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(
    report.talents.filter((talent) =>
      [
        "bottomless_stomach",
        "throughput_singularity",
        "invoice_devourer",
        "token_landfill",
        "budget_event_horizon",
        "planetary_feedlot",
      ].includes(talent),
    ),
    [
      "bottomless_stomach",
      "throughput_singularity",
      "invoice_devourer",
      "token_landfill",
      "budget_event_horizon",
      "planetary_feedlot",
    ],
  );
});

test("creature abilities unlock talents and withdrawal grows on AI-free days", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-ability-growth-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  const usage = [
    {
      input_tokens: 10_000,
      cached_input_tokens: 0,
      output_tokens: 1_000_000,
      total_tokens: 1_010_000,
    },
  ];
  for (let day = 1; day <= 12; day += 1) {
    writeCodexUsage(root, usage, `2026-07-${String(day).padStart(2, "0")}`);
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "talent-seed",
  };

  const active = runCli(["creature", "--date", "2026-07-12", "--json"], env);
  const quiet = runCli(["creature", "--date", "2026-07-13", "--json"], env);

  assert.equal(active.status, 0, active.stderr);
  assert.equal(quiet.status, 0, quiet.stderr);
  const activeReport = JSON.parse(active.stdout);
  const quietReport = JSON.parse(quiet.stdout);
  assert.ok(activeReport.level > 1);
  assert.ok(activeReport.talents.length > 0);
  assert.ok(activeReport.today.newTalents.length > 0);
  assert.equal(
    quietReport.abilities.withdrawal,
    activeReport.abilities.withdrawal + 1,
  );
  assert.equal(quietReport.today.abilityGains.withdrawal, 1);
  assert.equal(quietReport.mood, "withdrawal_tremor");
  assert.equal(
    quietReport.collections.talentsUnlocked,
    quietReport.talents.length,
  );
});

test("grown Instability raises the future rare-mutation chance", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-instability-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const usage = [
    {
      input_tokens: 10_000,
      cached_input_tokens: 0,
      output_tokens: 1_000_000,
      total_tokens: 1_010_000,
    },
  ];
  const startDate = "2026-01-01";
  for (let day = 0; day < 200; day += 1) {
    writeCodexUsage(root, usage, shiftTestDate(startDate, day));
  }

  const env = {
    HOME: path.join(workspace, "home"),
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "instability-0",
  };
  const hatch = runCli(["creature", "--date", startDate, "--json"], env);
  const result = runCli(
    ["creature", "--date", shiftTestDate(startDate, 199), "--json"],
    env,
  );

  assert.equal(hatch.status, 0, hatch.stderr);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.abilities.instability >= 20);
  assert.ok(report.rareChancePercent > 8);
  assert.ok(report.collections.rareMutations > 0);
});

test("creature malignancy ranks retain more than one year of growth headroom", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-year-growth-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2025-01-01";
  const usage = [
    {
      input_tokens: 10_000,
      cached_input_tokens: 0,
      output_tokens: 100_000_000,
      total_tokens: 100_010_000,
    },
  ];

  for (let day = 0; day < 400; day += 1) {
    writeCodexUsage(root, usage, shiftTestDate(startDate, day));
  }

  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "one-year-growth",
  };
  const hatch = runCli(
    ["creature", "--date", startDate, "--json"],
    env,
  );
  const grown = runCli(
    ["creature", "--date", shiftTestDate(startDate, 399), "--json"],
    env,
  );

  assert.equal(hatch.status, 0, hatch.stderr);
  assert.equal(grown.status, 0, grown.stderr);
  const report = JSON.parse(grown.stdout);
  const values = Object.values(report.abilities);
  const totals = Object.values(report.abilityTotals);
  assert.equal(report.activeDays, 400);
  assert.ok(Math.max(...totals) > 255);
  assert.ok(values.every((value) => value >= 0 && value <= 255));
  assert.ok(Object.values(report.malignancyRanks).some((rank) => rank > 0));
  assert.equal(
    totals.reduce((total, value) => total + value, 0),
    report.abilityPoints,
  );
  assert.ok(report.talents.includes("planetary_feedlot"));
});
