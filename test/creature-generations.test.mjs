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

test("creature seals a fossil at day ninety and offers balanced next-generation evolution", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-generation-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 5_000_000,
        cached_input_tokens: 0,
        output_tokens: 100,
        total_tokens: 5_000_100,
      },
    ],
    startDate,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "generation-seed",
  };

  const hatch = runCli(["creature", "--date", startDate, "--json"], env);
  const boundaryDate = shiftTestDate(startDate, 89);
  const boundary = runCli(
    ["creature", "--date", boundaryDate, "--json"],
    env,
  );
  const next = runCli(
    ["creature", "--date", shiftTestDate(startDate, 90), "--json"],
    env,
  );
  const todayAtBoundary = runCli(["today", "--date", boundaryDate], env);
  const weekAfterBoundary = runCli(
    ["week", "--date", shiftTestDate(startDate, 90)],
    env,
  );

  assert.equal(hatch.status, 0, hatch.stderr);
  assert.equal(boundary.status, 0, boundary.stderr);
  assert.equal(next.status, 0, next.stderr);
  assert.equal(todayAtBoundary.status, 0, todayAtBoundary.stderr);
  assert.match(todayAtBoundary.stdout, /永久化石 #[0-9a-f]{8} 已封存/);
  assert.match(
    todayAtBoundary.stdout.replace(/\s+/gu, " "),
    /第 2 代进化待选择.*anti-ai creature evolve/,
  );
  assert.equal(weekAfterBoundary.status, 0, weekAfterBoundary.stderr);
  assert.match(
    weekAfterBoundary.stdout,
    /世代  第 1 代 → 第 2 代 · 永久化石 \+1/,
  );
  const boundaryReport = JSON.parse(boundary.stdout);
  assert.deepEqual(boundaryReport.generation, {
    number: 1,
    day: 90,
    length: 90,
    progressPercent: 100,
    inheritedAbilityId: null,
    scarId: null,
  });
  assert.equal(boundaryReport.fossils.length, 1);
  assert.deepEqual(
    (({
      generation,
      sealedAt,
      ecologyId,
      pathologyId,
      inheritanceAbilityId,
      scarId,
    }) => ({
      generation,
      sealedAt,
      ecologyId,
      pathologyId,
      inheritanceAbilityId,
      scarId,
    }))(boundaryReport.fossils[0]),
    {
      generation: 1,
      sealedAt: boundaryDate,
      ecologyId: "lucid",
      pathologyId: "context",
      inheritanceAbilityId: "withdrawal",
      scarId: "sterile_halo",
    },
  );
  assert.match(boundaryReport.fossils[0].id, /^[0-9a-f]{8}$/);
  assert.deepEqual(
    boundaryReport.evolution.options.map(({ slot, category }) => ({
      slot,
      category,
    })),
    [
      { slot: 1, category: "pollution" },
      { slot: 2, category: "clarity" },
      { slot: 3, category: "paradox" },
    ],
  );
  assert.equal(boundaryReport.evolution.generation, 2);
  assert.equal(boundaryReport.evolution.status, "pending");

  const nextReport = JSON.parse(next.stdout);
  assert.equal(nextReport.stage, "contaminated_embryo");
  assert.equal(nextReport.nextStageAt, 97);
  assert.deepEqual(nextReport.generation, {
    number: 2,
    day: 1,
    length: 90,
    progressPercent: 1,
    inheritedAbilityId: "withdrawal",
    scarId: "sterile_halo",
  });
  assert.equal(nextReport.appearance.scarId, "sterile_halo");
  assert.ok(
    nextReport.appearance.partIds.includes("scar_sterile_halo"),
  );
  assert.equal(nextReport.abilities.withdrawal >= 94, true);
  assert.equal(nextReport.collections.fossilsSealed, 1);
});

test("generation fossils preserve ability gains and malignancy changes", (t) => {
  const workspace = mkdtempSync(
    path.join(tmpdir(), "anti-ai-generation-ability-fossil-"),
  );
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  const days = Object.fromEntries(
    Array.from({ length: 90 }, (_, index) => [
      shiftTestDate(startDate, index),
      {
        pollutionDose: 100,
        active: true,
        usageBand: "meltdown",
        ecologyGains: { pollution: 3, clarity: 0 },
        traits: { context: 0, cache: 0, frenzy: 0, nuclear: 100 },
        event: null,
        abilityGains: {
          appetite: 3,
          memory: 0,
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
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 5,
      seed: "malignancy-passive-2",
      days,
    })}\n`,
  );
  const date = shiftTestDate(startDate, 90);
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
  };

  const first = runCli(["creature", "--date", date, "--json"], env);
  const second = runCli(["creature", "--date", date, "--json"], env);
  const human = runCli(
    ["creature", "--date", date, "--lang", "en", "--full"],
    env,
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(human.status, 0, human.stderr);
  assert.deepEqual(JSON.parse(second.stdout), JSON.parse(first.stdout));
  const report = JSON.parse(first.stdout);
  const fossil = report.fossils[0];
  assert.equal(fossil.abilityGains.appetite, 270);
  assert.deepEqual(fossil.abilitySnapshot.appetite, {
    value: 15,
    totalPoints: 270,
    malignancyRank: 1,
    nextMalignancyAt: 511,
  });
  assert.equal(fossil.malignancyGains.appetite, 1);
  const appetiteEvolution = report.evolution.options.find(
    (option) => option.abilityId === "appetite",
  );
  assert.equal(appetiteEvolution.malignancyModifiers, 2);
  assert.equal(appetiteEvolution.procChancePercent, 29);
  assert.match(human.stdout, /PERMANENT FOSSILS\s+\[1\][\s\S]*MALIGNANCY \+1/);
});

test("the clarity evolution is powered by AI-free growth rather than token feeding", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-clarity-choice-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 2_000,
        cached_input_tokens: 0,
        output_tokens: 100,
        total_tokens: 2_100,
      },
    ],
    startDate,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "clarity-balance-5",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );

  const result = runCli(
    ["creature", "--date", shiftTestDate(startDate, 89), "--json"],
    env,
  );
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  const clarity = report.evolution.options.find(
    (option) => option.category === "clarity",
  );
  assert.equal(report.ecology.type, "lucid");
  assert.equal(report.abilities.withdrawal >= 89, true);
  assert.equal(clarity.id, "abstinence_sac");
  assert.equal(clarity.abilityId, "withdrawal");
  assert.ok(clarity.procChancePercent > 5);
});

test("creature evolve persists one explicit choice and refuses to rewrite it", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-evolve-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 5_000_000,
        cached_input_tokens: 0,
        output_tokens: 100,
        total_tokens: 5_000_100,
      },
    ],
    startDate,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "evolve-seed",
  };
  const boundaryDate = shiftTestDate(startDate, 89);
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );
  assert.equal(
    runCli(["creature", "--date", boundaryDate, "--json"], env).status,
    0,
  );

  const menu = runCli(
    ["creature", "evolve", "--date", boundaryDate, "--json"],
    env,
  );
  assert.equal(menu.status, 0, menu.stderr);
  const pending = JSON.parse(menu.stdout);
  assert.equal(pending.generation, 2);
  assert.equal(pending.status, "pending");
  assert.deepEqual(
    pending.options.map(({ slot, category }) => ({ slot, category })),
    [
      { slot: 1, category: "pollution" },
      { slot: 2, category: "clarity" },
      { slot: 3, category: "paradox" },
    ],
  );

  const choice = runCli(
    ["creature", "evolve", "2", "--date", boundaryDate, "--json"],
    env,
  );
  const repeated = runCli(
    ["creature", "evolve", "2", "--date", boundaryDate, "--json"],
    env,
  );
  const rewrite = runCli(
    ["creature", "evolve", "1", "--date", boundaryDate, "--json"],
    env,
  );

  assert.equal(choice.status, 0, choice.stderr);
  assert.equal(repeated.status, 0, repeated.stderr);
  const selected = JSON.parse(choice.stdout);
  assert.deepEqual(JSON.parse(repeated.stdout), selected);
  assert.equal(selected.generation, 2);
  assert.equal(selected.status, "selected");
  assert.deepEqual(selected.selected, pending.options[1]);
  assert.equal(rewrite.status, 2);
  assert.equal(
    rewrite.stderr,
    "第 2 代进化已经封存，不能改选。\n",
  );
  assert.equal(rewrite.stdout, "");
});

test("creature evolve reports that no choice exists before the first fossil", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-no-evolution-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(
    ["creature", "evolve", "--date", "2026-07-23", "--json"],
    {
      HOME: home,
      ANTI_AI_CREATURE_SEED: "no-evolution-seed",
    },
  );

  assert.equal(result.status, 2);
  assert.equal(result.stderr, "当前没有可选择的进化。\n");
  assert.equal(result.stdout, "");
});

test("selected evolution turns ability and talents into both benefits and costs", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-rule-cost-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  const usage = [
    {
      input_tokens: 5_000_000,
      cached_input_tokens: 0,
      output_tokens: 100_000,
      total_tokens: 5_100_000,
    },
  ];
  for (let day = 0; day < 150; day += 1) {
    writeCodexUsage(root, usage, shiftTestDate(startDate, day));
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "rule-cost-seed",
  };
  const boundaryDate = shiftTestDate(startDate, 89);
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );
  assert.equal(
    runCli(["creature", "--date", boundaryDate, "--json"], env).status,
    0,
  );
  const choice = runCli(
    ["creature", "evolve", "1", "--date", boundaryDate, "--json"],
    env,
  );
  assert.equal(choice.status, 0, choice.stderr);

  const grown = runCli(
    ["creature", "--date", shiftTestDate(startDate, 149), "--json"],
    env,
  );
  const human = runCli(
    ["creature", "--date", shiftTestDate(startDate, 149)],
    env,
  );
  assert.equal(grown.status, 0, grown.stderr);
  assert.equal(human.status, 0, human.stderr);
  const report = JSON.parse(grown.stdout);
  assert.equal(report.generation.number, 2);
  assert.equal(report.evolution.status, "selected");
  assert.equal(report.evolution.selected.category, "pollution");
  assert.ok(report.evolution.selected.procChancePercent > 5);
  assert.ok(report.evolution.selected.talentModifiers > 0);
  assert.ok(report.collections.evolutionTriggers > 0);
  assert.ok(report.collections.evolutionBenefitPoints > 0);
  assert.ok(report.collections.evolutionCostPoints > 0);
  assert.equal(
    report.collections.evolutionBenefitPoints >=
      report.collections.evolutionTriggers,
    true,
  );
  assert.equal(
    report.collections.evolutionCostPoints >=
      report.collections.evolutionTriggers,
    true,
  );
  assert.match(
    human.stdout,
    /进化规则\s+\[污染\].*触发 \d+%.*累计发作 \d+ 次/,
  );
  assert.match(human.stdout, /累计收益 \d+ · 累计代价 \d+/);
});

test("creature renders bilingual fossils, inheritance, and evolution choices", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-generation-copy-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 5_000_000,
        cached_input_tokens: 0,
        output_tokens: 100,
        total_tokens: 5_000_100,
      },
    ],
    startDate,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "generation-copy-seed",
  };
  const boundaryDate = shiftTestDate(startDate, 89);
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );

  const zh = runCli(["creature", "--date", boundaryDate], env);
  const en = runCli(
    ["creature", "--date", boundaryDate, "--lang", "en"],
    env,
  );
  const menu = runCli(
    ["creature", "evolve", "--date", boundaryDate, "--lang", "en"],
    env,
  );

  assert.equal(zh.status, 0, zh.stderr);
  assert.match(zh.stdout, /世代\s+第 1 代 · 90 \/ 90 天/);
  assert.match(zh.stdout, /遗传\s+无 · 伤疤\s+无/);
  assert.match(zh.stdout, /永久化石\s+\[1\]/);
  assert.match(zh.stdout, /第 1 代 · 清醒型 · 戒断反应 · 无菌光环/);
  assert.match(zh.stdout, /下一代进化\s+第 2 代 · 待选择/);
  assert.match(zh.stdout, /\n  1\. \[污染\]/);
  assert.match(zh.stdout, /收益.+代价/);
  assert.match(zh.stdout, /anti-ai creature evolve <1\|2\|3>/);

  assert.equal(en.status, 0, en.stderr);
  assert.match(en.stdout, /GENERATION\s+GEN 1 · 90 \/ 90 DAYS/);
  assert.match(en.stdout, /INHERITANCE\s+NONE · SCAR\s+NONE/);
  assert.match(en.stdout, /PERMANENT FOSSILS\s+\[1\]/);
  assert.match(en.stdout, /GEN 1 · LUCID · WITHDRAWAL · STERILE HALO/);
  assert.match(en.stdout, /NEXT EVOLUTION\s+GEN 2 · PENDING/);
  assert.match(en.stdout, /\n  1\. \[POLLUTION\]/);
  assert.match(en.stdout, /BENEFIT.+COST/);

  assert.equal(menu.status, 0, menu.stderr);
  assert.match(menu.stdout, /GENERATION 2 EVOLUTION · PENDING/);
  assert.match(menu.stdout, /1\. \[POLLUTION\]/);
  assert.match(menu.stdout, /2\. \[CLARITY\]/);
  assert.match(menu.stdout, /3\. \[PARADOX\]/);
});

test("an ignored evolution expires without blocking later generations", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-missed-evolution-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 5_000_000,
        cached_input_tokens: 0,
        output_tokens: 100,
        total_tokens: 5_000_100,
      },
    ],
    startDate,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "missed-evolution-seed",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );

  const thirdGeneration = runCli(
    ["creature", "--date", shiftTestDate(startDate, 180), "--json"],
    env,
  );
  assert.equal(thirdGeneration.status, 0, thirdGeneration.stderr);
  const report = JSON.parse(thirdGeneration.stdout);
  assert.equal(report.generation.number, 3);
  assert.equal(report.generation.day, 1);
  assert.equal(report.fossils.length, 2);
  assert.equal(report.fossils[1].evolutionId, null);
  assert.equal(report.evolution.generation, 3);
  assert.equal(report.evolution.status, "pending");
  assert.equal(report.collections.evolutionsMissed, 1);

  const saved = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  assert.equal(saved.generations.evolutions["2"].status, "missed");
  assert.equal(saved.generations.evolutions["3"].status, "pending");
});

test("creature awakens deterministic low-probability rare abilities", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-rare-ability-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(["creature", "--date", "2026-07-23", "--json"], {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "rare-ability-758",
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.rareAbilityChancesPercent, {
    rare: 0.5,
    epic: 0.1,
    mythic: 0.02,
  });
  assert.deepEqual(report.rareAbilities, {
    deadline_scent: {
      rarity: "rare",
      level: 1,
    },
  });
  assert.deepEqual(report.today.rareAbilityGain, {
    id: "deadline_scent",
    rarity: "rare",
    points: 1,
  });
  assert.equal(report.collections.rareAbilitiesUnlocked, 1);
});

test("drawing the same rare ability again grows its level", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-rare-growth-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const usage = [
    {
      input_tokens: 1_000,
      cached_input_tokens: 0,
      output_tokens: 1_000,
      total_tokens: 2_000,
    },
  ];
  writeCodexUsage(root, usage, "2026-07-12");
  writeCodexUsage(root, usage, "2026-08-27");
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "growth-3",
  };

  const first = runCli(
    ["creature", "--date", "2026-07-12", "--json"],
    env,
  );
  const second = runCli(
    ["creature", "--date", "2026-08-27", "--json"],
    env,
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const report = JSON.parse(second.stdout);
  assert.deepEqual(report.rareAbilities.lint_divination, {
    rarity: "rare",
    level: 2,
  });
  assert.deepEqual(report.today.rareAbilityGain, {
    id: "lint_divination",
    rarity: "rare",
    points: 1,
  });
});

test("v0.6 creature files migrate without losing stored ability growth", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-v06-migration-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const days = {};
  const startDate = "2026-01-01";
  for (let day = 0; day < 100; day += 1) {
    days[shiftTestDate(startDate, day)] = {
      pollutionDose: 40,
      active: true,
      traits: {
        context: 0,
        cache: 0,
        frenzy: 40,
        nuclear: 0,
      },
      event: {
        id: "request_budding",
        rarity: "common",
      },
      abilityGains: {
        appetite: 1,
        memory: 0,
        shell: 0,
        mouths: 2,
        glow: 0,
        instability: 0,
        withdrawal: 0,
      },
    };
  }
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 2,
      seed: "v06-migration",
      days,
    })}\n`,
  );
  const env = { HOME: home };
  const date = shiftTestDate(startDate, 99);

  const first = runCli(["creature", "--date", date, "--json"], env);
  const second = runCli(["creature", "--date", date, "--json"], env);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const report = JSON.parse(first.stdout);
  assert.deepEqual(JSON.parse(second.stdout), report);
  assert.equal(report.abilities.mouths, 203);
  assert.equal(report.generation.inheritedAbilityId, "mouths");
  assert.equal(report.collections.fossilsSealed, 1);
  assert.ok(report.collections.rareAbilitiesUnlocked >= 0);
});

test("schema v1-v15 creature files migrate idempotently without inventing cabinet, companion, incident, or visitor history", (t) => {
  for (const schemaVersion of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
    const home = mkdtempSync(
      path.join(tmpdir(), `anti-ai-schema-${schemaVersion}-`),
    );
    t.after(() => rmSync(home, { recursive: true, force: true }));
    mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
    writeFileSync(
      path.join(home, ".anti-ai", "creature.json"),
      `${JSON.stringify({
        schemaVersion,
        seed: `schema-${schemaVersion}`,
        days: {
          "2026-07-01": {
            pollutionDose: 40,
            active: true,
            traits: {
              context: 40,
              cache: 0,
              frenzy: 0,
              nuclear: 0,
            },
            event: {
              id: "misplaced_context",
              rarity: "common",
            },
          },
          "2026-07-02": {
            pollutionDose: 0,
            active: false,
            traits: {
              context: 0,
              cache: 0,
              frenzy: 0,
              nuclear: 0,
            },
            event: null,
          },
        },
      })}\n`,
    );
    const env = { HOME: home };

    const first = runCli(
      ["creature", "--date", "2026-07-02", "--json"],
      env,
    );
    const second = runCli(
      ["creature", "--date", "2026-07-02", "--json"],
      env,
    );

    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.deepEqual(JSON.parse(second.stdout), JSON.parse(first.stdout));
    const report = JSON.parse(first.stdout);
    assert.equal(report.experienceDays, 2);
    assert.equal(report.ecology.pollution, 1);
    assert.equal(report.ecology.clarity, 3);
    const saved = JSON.parse(
      readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
    );
    assert.equal(saved.schemaVersion, 16);
    assert.deepEqual(saved.cabinet, { version: 1, featured: [] });
    assert.equal(saved.appearance.version, 1);
    assert.match(saved.appearance.specimenId, /^[0-9a-f]{8}$/);
    assert.equal(saved.specimens.length, 1);
    assert.match(saved.specimens[0].fingerprint, /^[0-9a-f]{12}$/);
    assert.equal(saved.specimens[0].renderVersion, 1);
    assert.equal(saved.specimens[0].recordedAt, "2026-07-02");
    assert.deepEqual(saved.days["2026-07-02"].ecologyGains, {
      pollution: 0,
      clarity: 3,
    });
    assert.deepEqual(saved.generations, {
      fossils: [],
      evolutions: {},
    });
    assert.deepEqual(saved.foreignSpecimens, []);
    assert.deepEqual(saved.visitation, {
      version: 1,
      activeStayId: null,
      stays: [],
    });
    assert.deepEqual(saved.casebook, {
      cases: [],
      nextAtExperience: 14,
    });
    assert.deepEqual(saved.laboratory, {
      version: 2,
      nextBatch: 1,
      cultures: [],
      activeCultureId: null,
      bondHistory: [],
      imprintAssignments: {},
    });
    assert.deepEqual(saved.incidents, {
      version: 1,
      records: [],
      nextAtExperience: 7,
      dispositions: {
        quarantine: 0,
        observe: 0,
        resonate: 0,
      },
    });
    assert.doesNotMatch(
      JSON.stringify(saved),
      /totalTokens|modelName|prompt|response|requestTimestamp/,
    );
  }
});

test("schema v9 cultures remain unbound after companion migration", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-schema9-culture-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  const culture = {
    id: "culture-legacy",
    batch: 1,
    createdAt: "2026-07-01",
    typeId: "request_amoeba",
    ecologyId: "paradox",
    pathologyId: "context",
    complicationId: "recursive_hunger",
    sideEffectId: "keyboard_fever",
    rarity: "uncommon",
    ingredients: [{ type: "selfTissue", id: "self" }],
    appearance: {
      version: 1,
      fingerprint: "abc123def456",
      lines: ["legacy culture"],
    },
  };
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "schema9-culture",
      days: {
        "2026-07-02": {
          pollutionDose: 0,
          active: false,
          usageBand: "sober",
          ecologyGains: { pollution: 0, clarity: 0 },
          traits: { context: 0, cache: 0, frenzy: 0, nuclear: 0 },
          event: null,
        },
      },
      laboratory: {
        version: 1,
        nextBatch: 2,
        cultures: [culture],
      },
    })}\n`,
  );

  const result = runCli(
    ["lab", "companion", "--date", "2026-07-02", "--json"],
    { HOME: home },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    date: "2026-07-02",
    status: "unbound",
    companion: null,
  });
  const saved = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  assert.equal(saved.schemaVersion, 16);
  assert.deepEqual(saved.cabinet, { version: 1, featured: [] });
  assert.deepEqual(saved.laboratory, {
    version: 2,
    nextBatch: 2,
    cultures: [culture],
    activeCultureId: null,
    bondHistory: [],
    imprintAssignments: {},
  });
});

test("creature can reach a rare mutation from its local deterministic seed", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-rare-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(["creature", "--date", "2026-07-23", "--json"], {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "rare-4",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).today.event, {
    id: "repository_swallow",
    rarity: "rare",
  });
});

test("creature evolves into four branches from distinct usage patterns", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-branches-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const patterns = {
    context: [
      {
        input_tokens: 5_000_000,
        cached_input_tokens: 0,
        output_tokens: 100,
        total_tokens: 5_000_100,
      },
    ],
    cache: [
      {
        input_tokens: 1_000_000,
        cached_input_tokens: 950_000,
        output_tokens: 100,
        total_tokens: 1_000_100,
      },
    ],
    frenzy: Array.from({ length: 60 }, () => ({
      input_tokens: 1_000,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 1_100,
    })),
    nuclear: [
      {
        input_tokens: 10_000,
        cached_input_tokens: 0,
        output_tokens: 1_000_000,
        total_tokens: 1_010_000,
      },
    ],
  };
  const actual = {};

  for (const [name, usages] of Object.entries(patterns)) {
    const root = path.join(workspace, name, "codex");
    const home = path.join(workspace, name, "home");
    mkdirSync(home, { recursive: true });
    writeCodexUsage(root, usages);
    const result = runCli(["creature", "--date", "2026-07-23", "--json"], {
      HOME: home,
      ANTI_AI_CODEX_DIR: root,
      ANTI_AI_CREATURE_SEED: "branch-seed",
    });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    actual[name] = {
      branch: report.branch,
      form: report.form,
      ecologyForm: report.ecologyForm,
    };
  }

  assert.deepEqual(actual, {
    context: {
      branch: "context",
      form: "context_polyp",
      ecologyForm: "blank_dossier_embryo",
    },
    cache: {
      branch: "cache",
      form: "cache_moss",
      ecologyForm: "standby_moss",
    },
    frenzy: {
      branch: "frenzy",
      form: "request_spore",
      ecologyForm: "unsent_spore",
    },
    nuclear: {
      branch: "nuclear",
      form: "compute_embryo",
      ecologyForm: "extinguished_core",
    },
  });
});

test("creature evolves across active days and becomes dormant on AI-free days", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-evolution-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  const heavyContextUsage = [
    {
      input_tokens: 5_000_000,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 5_000_100,
    },
  ];
  for (const date of ["2026-07-20", "2026-07-21", "2026-07-22"]) {
    writeCodexUsage(root, heavyContextUsage, date);
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "evolution-seed",
  };

  const firstQuietDay = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    env,
  );
  const secondQuietDay = runCli(
    ["creature", "--date", "2026-07-24", "--json"],
    env,
  );

  assert.equal(firstQuietDay.status, 0, firstQuietDay.stderr);
  assert.equal(secondQuietDay.status, 0, secondQuietDay.stderr);
  assert.deepEqual(
    [firstQuietDay, secondQuietDay].map((result) => {
      const report = JSON.parse(result.stdout);
      return {
        status: report.status,
        stage: report.stage,
        branch: report.branch,
        form: report.form,
        experienceDays: report.experienceDays,
        ecologyType: report.ecology.type,
        exposure: report.exposure,
        quietStreakDays: report.quietStreakDays,
        event: report.today.event,
      };
    }),
    [
      {
        status: "dormant",
        stage: "contaminated_embryo",
        branch: "context",
        form: "context_polyp",
        experienceDays: 4,
        ecologyType: "polluted",
        exposure: 238,
        quietStreakDays: 1,
        event: null,
      },
      {
        status: "dormant",
        stage: "contaminated_embryo",
        branch: "context",
        form: "context_polyp",
        experienceDays: 5,
        ecologyType: "polluted",
        exposure: 236,
        quietStreakDays: 2,
        event: null,
      },
    ],
  );
});

test("creature backfills the full gap between visits after its initial 30 days", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-gap-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  const usage = [
    {
      input_tokens: 5_000_000,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 5_000_100,
    },
  ];
  writeCodexUsage(root, usage, "2026-06-01");
  writeCodexUsage(root, usage, "2026-07-01");
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "gap-seed",
  };

  const firstVisit = runCli(
    ["creature", "--date", "2026-06-01", "--json"],
    env,
  );
  const laterVisit = runCli(
    ["creature", "--date", "2026-08-15", "--json"],
    env,
  );

  assert.equal(firstVisit.status, 0, firstVisit.stderr);
  assert.equal(laterVisit.status, 0, laterVisit.stderr);
  assert.equal(JSON.parse(firstVisit.stdout).activeDays, 1);
  assert.equal(JSON.parse(laterVisit.stdout).activeDays, 2);
});

test("creature renders bilingual mutation files without leaking raw usage", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-copy-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const env = {
    HOME: path.join(workspace, "home"),
    ANTI_AI_CREATURE_SEED: "test-seed",
  };
  mkdirSync(env.HOME, { recursive: true });

  const zh = runCli(["creature", "--date", "2026-07-23"], env);
  const en = runCli(
    ["creature", "--date", "2026-07-23", "--lang", "en"],
    env,
  );

  assert.equal(zh.status, 0, zh.stderr);
  assert.match(zh.stdout, /TOKEN MUTATION FILE · 2026-07-23/);
  assert.match(zh.stdout, /☢ 今日污染剂量\s+\+27/);
  assert.match(zh.stdout, /阶段\s+异常胚体 I · 14%/);
  assert.match(zh.stdout, /进化分支\s+核食系/);
  assert.match(zh.stdout, /生态人格\s+未定型/);
  assert.match(zh.stdout, /形态\s+熄火幼核/);
  assert.match(zh.stdout, /标本编号\s+[0-9a-f]{8}/);
  assert.match(zh.stdout, /徽章\s+\[\d+\]/);
  assert.match(zh.stdout, /今日成就/);
  assert.match(zh.stdout, /今日突变\s+\[普通\] 快照腹胀/);
  assert.match(zh.stdout, /能力值 · Lv\.\d+/);
  assert.match(zh.stdout, /吞噬欲/);
  assert.match(zh.stdout, /今日加点/);
  assert.match(zh.stdout, /今日解锁/);
  assert.match(zh.stdout, /畸变天赋/);
  assert.match(zh.stdout, /性格\s+/);
  assert.match(zh.stdout, /心情\s+/);
  assert.match(
    zh.stdout,
    /化石、进化选择.*不保存对话、路径、模型名或精确 Token/,
  );
  assert.doesNotMatch(zh.stdout, /180 tokens|gpt-test|Codex|\/Users\//);

  assert.equal(en.status, 0, en.stderr);
  assert.match(en.stdout, /TODAY'S POLLUTION DOSE\s+\+27/);
  assert.match(en.stdout, /STAGE\s+ANOMALOUS EMBRYO I · 14%/);
  assert.match(en.stdout, /EVOLUTION BRANCH\s+NUCLEAR FEEDER/);
  assert.match(en.stdout, /ECOLOGY\s+UNFORMED/);
  assert.match(en.stdout, /FORM\s+EXTINGUISHED CORE/);
  assert.match(en.stdout, /SPECIMEN ID\s+[0-9a-f]{8}/);
  assert.match(en.stdout, /BADGES\s+\[\d+\]/);
  assert.match(en.stdout, /TODAY'S ACHIEVEMENTS/);
  assert.match(en.stdout, /TODAY'S MUTATION\s+\[COMMON\] SNAPSHOT BLOATING/);
  assert.match(en.stdout, /ABILITIES · LV\.\d+/);
  assert.match(en.stdout, /APPETITE/);
  assert.match(en.stdout, /TODAY'S GROWTH/);
  assert.match(en.stdout, /TODAY'S UNLOCKS/);
  assert.match(en.stdout, /MUTATION TALENTS/);
  assert.match(en.stdout, /TEMPERAMENT\s+/);
  assert.match(en.stdout, /MOOD\s+/);
  assert.match(
    en.stdout,
    /fossils, evolution choices.*stores no chats, paths, model names, or exact tokens/,
  );
  assert.doesNotMatch(en.stdout, /今日污染|阶段|进化分支|今日突变/);
});

test("creature uses horizontal space for a compact default and keeps full detail on demand", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-layout-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "creature-layout",
    COLUMNS: "120",
  };
  const compact = runCli(["creature", "--date", "2026-07-23"], env);
  const full = runCli(["creature", "--date", "2026-07-23", "--full"], env);

  assert.equal(compact.status, 0, compact.stderr);
  assert.equal(full.status, 0, full.stderr);
  const compactLines = compact.stdout.trimEnd().split("\n");
  const fullLines = full.stdout.trimEnd().split("\n");
  assert.ok(compactLines.length <= 34, compact.stdout);
  assert.ok(fullLines.length > compactLines.length, full.stdout);
  assert.match(compact.stdout, /│/);
  assert.match(compact.stdout, /完整病历\s+anti-ai creature --full/);
  assert.match(full.stdout, /永久化石[\s\S]*每日觉醒率/);
  assert.ok(compactLines.every((line) => terminalWidth(line) <= 120));
});

test("creature compact fallback does not overflow an 80-column terminal", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-narrow-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const result = runCli(["creature", "--date", "2026-07-23"], {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "creature-narrow",
    COLUMNS: "80",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    result.stdout
      .trimEnd()
      .split("\n")
      .every((line) => terminalWidth(line) <= 80),
    result.stdout,
  );
  assert.match(result.stdout, /完整病历\s+anti-ai creature --full/);
});

test("creature compact default preserves terminal colors at narrow and wide widths", (t) => {
  for (const columns of ["80", "120"]) {
    const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-color-"));
    t.after(() => rmSync(home, { recursive: true, force: true }));
    const env = {
      HOME: home,
      ANTI_AI_CODEX_DIR: baselineCodexDir,
      ANTI_AI_CREATURE_SEED: `creature-color-${columns}`,
      COLUMNS: columns,
    };
    const plain = runCli(["creature", "--date", "2026-07-23"], env);
    const colored = runCli(["creature", "--date", "2026-07-23"], {
      ...env,
      FORCE_COLOR: "1",
      NO_COLOR: "",
    });

    assert.equal(plain.status, 0, plain.stderr);
    assert.equal(colored.status, 0, colored.stderr);
    assert.match(colored.stdout, /\u001b\[[0-9;]*m/);
    assert.match(
      colored.stdout
        .split("\n")
        .find((line) => line.includes("╱╲")),
      /^\u001b\[[0-9;]*m/,
    );
    assert.equal(
      colored.stdout.replaceAll(/\u001b\[[0-9;]*m/g, ""),
      plain.stdout,
    );
    assert.ok(
      colored.stdout
        .trimEnd()
        .split("\n")
        .every((line) => terminalWidth(line) <= Number(columns)),
      colored.stdout,
    );
  }
});
