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

test("share prints a privacy-safe SVG without exact tokens or model names", () => {
  const result = runCli(
    ["share", "--date", "2026-07-23"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^<svg\b/);
  assert.match(result.stdout, /YOUR AI RECEIPT/);
  assert.match(result.stdout, /2026-07-23/);
  assert.match(result.stdout, /1\.36 Wh/);
  assert.match(result.stdout, /8\.44 mL/);
  assert.match(result.stdout, /0\.21 gCO₂e/);
  assert.match(result.stdout, /今日罪名：[^<]+/);
  assert.match(result.stdout, /隐私模式：未包含对话、路径、模型名和精确 Token/);
  assert.match(result.stdout, /<\/svg>\n$/);
  assert.doesNotMatch(result.stdout, /350 tokens|gpt-test|claude-test/);
  assert.doesNotMatch(result.stdout, /Codex|Claude Code|\/Users\//);
});

test("share supports a fully English privacy-safe SVG", () => {
  const result = runCli(
    ["share", "--date", "2026-07-23", "--lang", "en"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RESOURCE USE ESTIMATE/);
  assert.doesNotMatch(result.stdout, /PUBLISHED PROXY RANGE/);
  assert.match(result.stdout, /EVERYDAY TRANSLATION/);
  assert.match(result.stdout, /TODAY&apos;S CHARGE: [A-Z][A-Z -]+/);
  assert.match(
    result.stdout,
    /PRIVACY MODE: no chats, paths, model names, or exact tokens/,
  );
  assert.doesNotMatch(result.stdout, /今日罪名|隐私模式|生活翻译/);
});

test("share --card pathology prints a bilingual privacy-safe creature autopsy", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-pathology-card-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "pathology-card",
    ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
  };

  const chinese = runCli(
    ["share", "--card", "pathology", "--date", "2026-07-23"],
    env,
  );
  const english = runCli(
    [
      "share",
      "--card",
      "pathology",
      "--date",
      "2026-07-23",
      "--lang",
      "en",
    ],
    env,
  );

  for (const result of [chinese, english]) {
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^<svg\b/);
    assert.match(result.stdout, /[0-9a-f]{8}/);
    assert.doesNotMatch(result.stdout, /350 tokens|gpt-test|claude-test/);
    assert.doesNotMatch(result.stdout, /Codex|Claude Code|\/Users\//);
  }
  assert.match(chinese.stdout, /异变体病理报告/);
  assert.match(chinese.stdout, /标本编号/);
  assert.match(chinese.stdout, /生态人格/);
  assert.match(chinese.stdout, /隐私模式：无对话、路径、模型名或精确 Token/);
  assert.match(english.stdout, /MUTATION PATHOLOGY REPORT/);
  assert.match(english.stdout, /SPECIMEN ID/);
  assert.match(english.stdout, /ECOLOGY/);
  assert.match(
    english.stdout,
    /PRIVACY MODE: no chats, paths, model names, or exact tokens/,
  );
  assert.doesNotMatch(english.stdout, /异变体病理报告|标本编号|生态人格/);
});

test("share --card pathology reports a recoverable corrupted creature file", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-pathology-corrupt-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(path.join(home, ".anti-ai", "creature.json"), "{not-json\n");

  const result = runCli(
    ["share", "--card", "pathology", "--date", "2026-07-23"],
    { HOME: home },
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(
    result.stderr,
    "病理报告无法读取异变体档案。运行 anti-ai creature reset 后可重新孵化。\n",
  );
  assert.doesNotMatch(result.stderr, /\/Users\/|SyntaxError|at runCreature/);
});

test("share prints privacy-safe specimen and wanted collection cards", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-collection-cards-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "collection-cards",
  };

  const specimen = runCli(
    ["share", "--card", "specimen", "--date", "2026-07-23"],
    env,
  );
  const wanted = runCli(
    [
      "share",
      "--card",
      "wanted",
      "--date",
      "2026-07-23",
      "--lang",
      "en",
    ],
    env,
  );
  const fossil = runCli(
    ["share", "--card", "fossil", "--date", "2026-07-23"],
    env,
  );

  assert.equal(specimen.status, 0, specimen.stderr);
  assert.match(specimen.stdout, /^<svg\b/);
  assert.match(specimen.stdout, /异变标本卡/);
  assert.match(specimen.stdout, /标本编号/);
  assert.match(specimen.stdout, /熄火幼核/);
  assert.match(specimen.stdout, /隐私模式：无对话、路径、模型名或精确 Token/);

  assert.equal(wanted.status, 0, wanted.stderr);
  assert.match(wanted.stdout, /^<svg\b/);
  assert.match(wanted.stdout, /MUTATION WANTED/);
  assert.match(wanted.stdout, /REWARD: ONE MANUAL THOUGHT/);
  assert.match(wanted.stdout, /SPECIMEN ID/);
  assert.doesNotMatch(wanted.stdout, /异变悬赏|标本编号/);

  for (const card of [specimen, wanted]) {
    assert.doesNotMatch(
      card.stdout,
      /350 tokens|gpt-test|claude-test|Codex|Claude Code|\/Users\//,
    );
  }
  assert.equal(fossil.status, 2);
  assert.equal(fossil.stdout, "");
  assert.equal(
    fossil.stderr,
    "当前没有永久化石可生成证书。第 90 个阅历日后再来。\n",
  );
});

test("share --card fossil certifies the latest permanent fossil", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-fossil-card-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-01-01";
  const boundaryDate = shiftTestDate(startDate, 89);
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
    ANTI_AI_CREATURE_SEED: "fossil-card",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );

  const fossil = runCli(
    [
      "share",
      "--card",
      "fossil",
      "--date",
      boundaryDate,
      "--lang",
      "en",
    ],
    env,
  );

  assert.equal(fossil.status, 0, fossil.stderr);
  assert.match(fossil.stdout, /^<svg\b/);
  assert.match(fossil.stdout, /PERMANENT FOSSIL CERTIFICATE/);
  assert.match(fossil.stdout, /GENERATION 1/);
  assert.match(fossil.stdout, /SEALED 2026-03-31/);
  assert.match(fossil.stdout, /FOSSIL ID [0-9a-f]{8}/);
  assert.match(
    fossil.stdout,
    /PRIVACY MODE: no chats, paths, model names, or exact tokens/,
  );
  assert.doesNotMatch(
    fossil.stdout,
    /5,000,100 tokens|mutation-test|Codex|Claude Code|\/Users\//,
  );
});

test("share --card prognosis prints one privacy-safe three-choice case card", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-prognosis-card-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-04-01";
  const endDate = shiftTestDate(startDate, 13);
  for (let index = 0; index <= 13; index += 1) {
    writeCodexUsage(
      root,
      [
        {
          input_tokens: 4_000,
          cached_input_tokens: 800,
          output_tokens: 400,
          total_tokens: 4_400,
        },
      ],
      shiftTestDate(startDate, index),
    );
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "prognosis-card",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );

  const card = runCli(
    [
      "share",
      "--card",
      "prognosis",
      "--date",
      endDate,
      "--lang",
      "en",
    ],
    env,
  );

  assert.equal(card.status, 0, card.stderr);
  assert.match(card.stdout, /^<svg\b/);
  assert.match(card.stdout, /FORKED CASEBOOK PROGNOSIS/);
  assert.match(card.stdout, /CASE #[0-9a-f]{8}/);
  assert.match(card.stdout, /1 · ALLOW PROLIFERATION/);
  assert.match(card.stdout, /2 · FORCED ABSTINENCE/);
  assert.match(card.stdout, /3 · CROSS-GRAFT/);
  assert.match(card.stdout, /PICK ONE UNTENABLE FUTURE/);
  assert.match(
    card.stdout,
    /PRIVACY MODE: no chats, paths, model names, or exact tokens/,
  );
  assert.doesNotMatch(
    card.stdout,
    /4,400 tokens|mutation-test|Codex|session\.jsonl|\/Users\//,
  );

  assert.equal(
    runCli(
      ["creature", "intervene", "1", "--date", endDate, "--json"],
      env,
    ).status,
    0,
  );
  const sealed = runCli(
    ["share", "--card", "prognosis", "--date", endDate],
    env,
  );
  assert.equal(sealed.status, 2);
  assert.equal(sealed.stdout, "");
  assert.equal(sealed.stderr, "当前没有可分享的待处理转折病例。\n");
});

test("codex --json derives a stable private collection from creature history", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-codex-home-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "codex-test",
  };

  const first = runCli(
    ["codex", "--date", "2026-07-23", "--json"],
    env,
  );
  const second = runCli(
    ["codex", "--date", "2026-07-23", "--json"],
    env,
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.stderr, "");
  assert.equal(second.status, 0, second.stderr);
  const report = JSON.parse(first.stdout);
  assert.deepEqual(JSON.parse(second.stdout), report);
  assert.equal(report.date, "2026-07-23");
  assert.match(report.specimenId, /^[0-9a-f]{8}$/);
  assert.deepEqual(report.cabinet, { featured: [] });
  assert.deepEqual(report.summary, {
    fixed: { discovered: 1, total: 68, percent: 1 },
    forms: { discovered: 1, total: 16 },
    achievements: { discovered: 0, total: 24 },
    chromaticAbilities: { discovered: 0, total: 6 },
    scars: { discovered: 0, total: 4 },
    habitatPhenomena: { discovered: 0, total: 18 },
    specimens: { discovered: 1 },
    foreignSpecimens: { discovered: 0 },
    fossils: { discovered: 0 },
    caseSlices: { discovered: 0 },
    cultures: { discovered: 0 },
    companions: { discovered: 0 },
    incidentReports: { discovered: 0 },
  });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(report.sections).map(([key, value]) => [
        key,
        value.length,
      ]),
    ),
    {
      forms: 16,
      achievements: 24,
      chromaticAbilities: 6,
      scars: 4,
      habitatPhenomena: 18,
      specimens: 1,
      foreignSpecimens: 0,
      fossils: 0,
      caseSlices: 0,
      cultures: 0,
      companions: 0,
      incidentReports: 0,
    },
  );
  assert.deepEqual(
    report.sections.forms.find(({ id }) => id === "extinguished_core"),
    {
      id: "extinguished_core",
      ecologyId: "unformed",
      pathologyId: "nuclear",
      discovered: true,
      discoveredAt: "2026-07-23",
      provenance: {
        firstDiscoveredAt: "2026-07-23",
        sourceType: "specimen_record",
        sourceId: report.sections.specimens[0].id,
        relatedId: "extinguished_core",
      },
    },
  );
  assert.deepEqual(report.recent, [
    {
      type: "form",
      id: "extinguished_core",
      discoveredAt: "2026-07-23",
    },
    {
      type: "specimen",
      id: report.sections.specimens[0].id,
      discoveredAt: "2026-07-23",
    },
  ]);
  assert.equal(report.sections.specimens[0].formId, "extinguished_core");
  assert.doesNotMatch(
    first.stdout,
    /350 tokens|gpt-test|claude-test|Codex|Claude Code|\/Users\//,
  );
});

test("codex collects selected intervention case slices without rewarding token volume", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-case-slices-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-05-01";
  const endDate = shiftTestDate(startDate, 13);
  for (let index = 0; index <= 13; index += 1) {
    writeCodexUsage(
      root,
      [
        {
          input_tokens: 5_000,
          cached_input_tokens: 1_000,
          output_tokens: 500,
          total_tokens: 5_500,
        },
      ],
      shiftTestDate(startDate, index),
    );
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "case-slice-codex",
  };
  assert.equal(
    runCli(["creature", "--date", startDate, "--json"], env).status,
    0,
  );
  assert.equal(
    runCli(
      ["creature", "intervene", "3", "--date", endDate, "--json"],
      env,
    ).status,
    0,
  );

  const json = runCli(["codex", "--date", endDate, "--json"], env);
  const human = runCli(
    ["codex", "--date", endDate, "--lang", "en"],
    env,
  );

  assert.equal(json.status, 0, json.stderr);
  assert.equal(human.status, 0, human.stderr);
  const codex = JSON.parse(json.stdout);
  assert.deepEqual(codex.summary.caseSlices, { discovered: 1 });
  assert.equal(codex.sections.caseSlices.length, 1);
  assert.equal(codex.sections.caseSlices[0].routeId, "paradox");
  assert.equal(codex.sections.caseSlices[0].markId, "paradox");
  assert.equal(codex.sections.caseSlices[0].discoveredAt, endDate);
  assert.ok(
    codex.recent.some(
      (entry) =>
        entry.type === "caseSlice" &&
        entry.id === codex.sections.caseSlices[0].id,
    ),
  );
  assert.match(human.stdout, /CASE SLICES\s+\[1\]/);
  assert.match(human.stdout, /FORKED SCAR/);
  assert.doesNotMatch(
    `${json.stdout}${human.stdout}`,
    /5,500 tokens|mutation-test|Codex|session\.jsonl|\/Users\//,
  );
});

test("codex exposes the deduplicated final ASCII species capacity", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-codex-capacity-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "codex-capacity",
  };

  const chinese = runCli(["codex", "--date", "2026-07-23"], env);
  const english = runCli(
    ["codex", "--date", "2026-07-23", "--lang", "en"],
    env,
  );
  const json = runCli(
    ["codex", "--date", "2026-07-23", "--json"],
    env,
  );

  assert.equal(chinese.status, 0, chinese.stderr);
  assert.match(
    chinese.stdout,
    /理论物种容量\s+21,233,664 · 去重后的最终 ASCII 形象/,
  );
  assert.equal(english.status, 0, english.stderr);
  assert.match(
    english.stdout,
    /THEORETICAL SPECIES CAPACITY\s+21,233,664 · DEDUPLICATED FINAL ASCII FORMS/,
  );
  assert.equal(json.status, 0, json.stderr);
  assert.deepEqual(JSON.parse(json.stdout).capacity, {
    structuralForms: 82_944,
    growthVariants: 256,
    finalAsciiForms: 21_233_664,
  });
});

test("codex renders bilingual locked and discovered collections", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-codex-human-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "codex-human",
  };

  const chinese = runCli(["codex", "--date", "2026-07-23"], env);
  const english = runCli(
    ["codex", "--date", "2026-07-23", "--lang", "en"],
    env,
  );
  const filtered = runCli(
    ["codex", "--date", "2026-07-23", "--source", "codex"],
    env,
  );

  assert.equal(chinese.status, 0, chinese.stderr);
  assert.match(chinese.stdout, /病理图鉴 · 2026-07-23/);
  assert.match(chinese.stdout, /固定收藏\s+1 \/ 68 · 1%/);
  assert.match(chinese.stdout, /形态家族\s+\[1 \/ 16\]/);
  assert.match(chinese.stdout, /熄火幼核/);
  assert.match(chinese.stdout, /\?\?\? × 15/);
  assert.match(chinese.stdout, /生态现象\s+\[0 \/ 18\]/);
  assert.match(chinese.stdout, /动态标本\s+\[1\]/);
  assert.match(chinese.stdout, /今日发现\s+\[2\]/);
  assert.match(
    chinese.stdout,
    /隐私图鉴：只保存离散成长结果，不保存对话、路径、模型名或精确 Token/,
  );

  assert.equal(english.status, 0, english.stderr);
  assert.match(english.stdout, /PATHOLOGY CODEX · 2026-07-23/);
  assert.match(english.stdout, /FIXED COLLECTION\s+1 \/ 68 · 1%/);
  assert.match(english.stdout, /FORM FAMILIES\s+\[1 \/ 16\]/);
  assert.match(english.stdout, /EXTINGUISHED CORE/);
  assert.match(english.stdout, /HABITAT PHENOMENA\s+\[0 \/ 18\]/);
  assert.match(english.stdout, /DYNAMIC SPECIMENS\s+\[1\]/);
  assert.match(english.stdout, /TODAY'S DISCOVERIES\s+\[2\]/);
  assert.doesNotMatch(english.stdout, /病理图鉴|固定收藏|形态家族/);

  assert.equal(filtered.status, 2);
  assert.equal(filtered.stdout, "");
  assert.equal(
    filtered.stderr,
    "codex 必须使用完整数据源；请移除 --source 过滤。\n",
  );
});

test("codex keeps achievement category colors while preserving rarity labels", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-codex-rarity-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "codex-rarity",
    NO_COLOR: "",
    FORCE_COLOR: "1",
  };

  const colored = runCli(["codex", "--date", "2026-07-23"], env);
  const plain = runCli(["codex", "--date", "2026-07-23"], {
    ...env,
    NO_COLOR: "1",
    FORCE_COLOR: "",
  });

  assert.equal(colored.status, 0, colored.stderr);
  assert.match(
    colored.stdout,
    /\u001b\[1;31m桌面反应堆 · OFFENSE\u001b\[0m \/ \u001b\[36mUNCOMMON\u001b\[0m/,
  );
  assert.match(colored.stdout, /\u001b\[37mCOMMON\u001b\[0m/);
  assert.match(colored.stdout, /\u001b\[36mUNCOMMON\u001b\[0m/);
  assert.equal(plain.status, 0, plain.stderr);
  assert.doesNotMatch(plain.stdout, /\u001b/);
  assert.match(plain.stdout, /桌面反应堆 · OFFENSE \/ UNCOMMON/);
  assert.match(plain.stdout, /COMMON/);
  assert.match(plain.stdout, /UNCOMMON/);
});

test("codex and creature use the same chromatic ability rank colors", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-codex-chromatic-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "rare-ability-297",
    NO_COLOR: "",
    FORCE_COLOR: "1",
  };

  const creature = runCli(["creature", "--date", "2026-07-23"], env);
  const codex = runCli(["codex", "--date", "2026-07-23"], env);

  assert.equal(creature.status, 0, creature.stderr);
  assert.equal(codex.status, 0, codex.stderr);
  assert.ok(creature.stdout.includes("\u001b[1;36m[R] 截止日嗅觉"));
  assert.ok(codex.stdout.includes("\u001b[1;36m✓ [R] 截止日嗅觉"));
});

test("today week and month surface collection discoveries", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-codex-feedback-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "codex-feedback",
  };

  const today = runCli(["today", "--date", "2026-07-23"], env);
  const week = runCli(["week", "--date", "2026-07-23"], env);
  const month = runCli(
    ["month", "--date", "2026-07-23", "--lang", "en"],
    env,
  );

  assert.equal(today.status, 0, today.stderr);
  assert.match(today.stdout, /图鉴入库\s+\+2 · 熄火幼核 · 动态标本/);
  assert.equal(week.status, 0, week.stderr);
  assert.match(
    week.stdout,
    /新增收藏\s+2 · 形态 1 · 成就 0 · 异色 0 · 伤痕 0 · 标本 1 · 外来 0 · 化石 0 · 病例 0 · 培养 0/,
  );
  assert.equal(month.status, 0, month.stderr);
  assert.match(
    month.stdout,
    /NEW COLLECTIONS\s+2 · forms 1 · achievements 0 · chromatics 0 · scars 0 · specimens 1 · foreign 0 · fossils 0 · cases 0 · cultures 0/,
  );
});
