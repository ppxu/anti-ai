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

test("creature export emits a versioned privacy-safe pollution code", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-export-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "export-specimen",
  };

  const human = runCli(
    ["creature", "export", "--date", "2026-07-23"],
    env,
  );
  const machine = runCli(
    ["creature", "export", "--date", "2026-07-23", "--json"],
    env,
  );

  assert.equal(human.status, 0, human.stderr);
  assert.match(human.stdout, /污染编码\s+AA1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  assert.match(human.stdout, /标本编号\s+[a-f0-9]{8}/);
  assert.match(human.stdout, /不包含精确 Token、模型、路径或对话/);
  assert.doesNotMatch(human.stdout, /gpt-test|180 tokens|session\.jsonl/);

  assert.equal(machine.status, 0, machine.stderr);
  const exported = JSON.parse(machine.stdout);
  assert.equal(exported.protocolVersion, 1);
  assert.match(exported.code, /^AA1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.match(exported.specimenId, /^[a-f0-9]{8}$/);
  assert.match(exported.fingerprint, /^[a-f0-9]{12}$/);
  assert.deepEqual(Object.keys(exported).sort(), [
    "code",
    "fingerprint",
    "protocolVersion",
    "specimenId",
  ]);
  const payload = JSON.parse(
    Buffer.from(exported.code.split(".")[1], "base64url").toString("utf8"),
  );
  assert.deepEqual(Object.keys(payload).sort(), [
    "a",
    "c",
    "e",
    "f",
    "g",
    "i",
    "o",
    "p",
    "r",
    "s",
    "v",
    "x",
  ]);
  assert.doesNotMatch(
    JSON.stringify(payload),
    /exactTokens|modelName|sourceName|filePath|prompt|response|requestCount|conversation/i,
  );
});

test("encounter combines two pollution codes into one deterministic local accident", (t) => {
  const localHome = mkdtempSync(path.join(tmpdir(), "anti-ai-encounter-local-"));
  const visitorHome = mkdtempSync(
    path.join(tmpdir(), "anti-ai-encounter-visitor-"),
  );
  t.after(() => {
    rmSync(localHome, { recursive: true, force: true });
    rmSync(visitorHome, { recursive: true, force: true });
  });
  const visitorExport = runCli(
    ["creature", "export", "--date", "2026-07-23", "--json"],
    {
      HOME: visitorHome,
      ANTI_AI_CREATURE_SEED: "encounter-visitor",
    },
  );
  assert.equal(visitorExport.status, 0, visitorExport.stderr);
  const visitor = JSON.parse(visitorExport.stdout);
  const localEnv = {
    HOME: localHome,
    ANTI_AI_CREATURE_SEED: "encounter-local",
  };

  const human = runCli(
    ["encounter", visitor.code, "--date", "2026-07-23"],
    localEnv,
  );
  const english = runCli(
    [
      "encounter",
      visitor.code,
      "--date",
      "2026-07-23",
      "--lang",
      "en",
    ],
    localEnv,
  );
  const first = runCli(
    ["encounter", visitor.code, "--date", "2026-07-23", "--json"],
    localEnv,
  );
  const repeated = runCli(
    ["encounter", visitor.code, "--date", "2026-07-23", "--json"],
    localEnv,
  );

  assert.equal(human.status, 0, human.stderr);
  assert.match(human.stdout, /异变体接触事故/);
  assert.match(human.stdout, /算力天气\s+\S+/);
  assert.match(human.stdout, /接触类型\s+\S+/);
  assert.match(human.stdout, /混种标本\s+#[a-f0-9]{12}/);
  assert.match(human.stdout, /anti-ai encounter .* --save/);
  assert.doesNotMatch(human.stdout, /gpt-test|180 tokens|session\.jsonl/);
  assert.equal(english.status, 0, english.stderr);
  assert.match(english.stdout, /MUTATION CONTACT INCIDENT/);
  assert.match(english.stdout, /COMPUTE WEATHER\s+\S+/);
  assert.match(english.stdout, /CONTACT TYPE\s+\S+/);
  assert.doesNotMatch(english.stdout, /[\p{Script=Han}]/u);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(repeated.status, 0, repeated.stderr);
  const firstResult = JSON.parse(first.stdout);
  const repeatedResult = JSON.parse(repeated.stdout);
  assert.equal(firstResult.protocolVersion, 1);
  assert.match(firstResult.encounterId, /^[a-f0-9]{12}$/);
  assert.equal(firstResult.saved, false);
  assert.equal(firstResult.visitor.specimenId, visitor.specimenId);
  assert.match(firstResult.hybrid.fingerprint, /^[a-f0-9]{12}$/);
  assert.deepEqual(firstResult, repeatedResult);
});

test("encounter keeps the incident and hybrid stable in both directions", (t) => {
  const leftHome = mkdtempSync(
    path.join(tmpdir(), "anti-ai-encounter-left-"),
  );
  const rightHome = mkdtempSync(
    path.join(tmpdir(), "anti-ai-encounter-right-"),
  );
  t.after(() => {
    rmSync(leftHome, { recursive: true, force: true });
    rmSync(rightHome, { recursive: true, force: true });
  });
  const leftEnv = {
    HOME: leftHome,
    ANTI_AI_CREATURE_SEED: "encounter-left",
  };
  const rightEnv = {
    HOME: rightHome,
    ANTI_AI_CREATURE_SEED: "encounter-right",
  };
  const leftCode = JSON.parse(
    runCli(
      ["creature", "export", "--date", "2026-07-23", "--json"],
      leftEnv,
    ).stdout,
  ).code;
  const rightCode = JSON.parse(
    runCli(
      ["creature", "export", "--date", "2026-07-23", "--json"],
      rightEnv,
    ).stdout,
  ).code;

  const leftToRight = JSON.parse(
    runCli(
      ["encounter", rightCode, "--date", "2026-07-23", "--json"],
      leftEnv,
    ).stdout,
  );
  const rightToLeft = JSON.parse(
    runCli(
      ["encounter", leftCode, "--date", "2026-07-23", "--json"],
      rightEnv,
    ).stdout,
  );

  assert.equal(leftToRight.encounterId, rightToLeft.encounterId);
  assert.deepEqual(leftToRight.weather, rightToLeft.weather);
  assert.deepEqual(leftToRight.type, rightToLeft.type);
  assert.deepEqual(leftToRight.hybrid, rightToLeft.hybrid);
});

test("encounter rejects malformed, oversized, tampered, and self pollution codes", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-encounter-guard-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "encounter-guard",
  };
  const exported = runCli(
    ["creature", "export", "--date", "2026-07-23", "--json"],
    env,
  );
  assert.equal(exported.status, 0, exported.stderr);
  const code = JSON.parse(exported.stdout).code;
  const tampered = `${code.slice(0, -1)}${code.endsWith("A") ? "B" : "A"}`;
  const cases = [
    [[], /缺少污染编码/],
    [["not-a-specimen"], /格式无效/],
    [[`AA1.${"a".repeat(2050)}.checksum`], /过长/],
    [[tampered], /校验失败/],
    [[code], /不能让异变体和自己的污染编码/],
  ];

  for (const [args, message] of cases) {
    const result = runCli(
      ["encounter", ...args, "--date", "2026-07-23"],
      env,
    );
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, message);
    assert.equal(result.stdout, "");
  }
});

test("encounter save bottles one privacy-safe foreign specimen in the codex", (t) => {
  const localHome = mkdtempSync(
    path.join(tmpdir(), "anti-ai-encounter-save-local-"),
  );
  const visitorHome = mkdtempSync(
    path.join(tmpdir(), "anti-ai-encounter-save-visitor-"),
  );
  t.after(() => {
    rmSync(localHome, { recursive: true, force: true });
    rmSync(visitorHome, { recursive: true, force: true });
  });
  const visitorResult = runCli(
    ["creature", "export", "--date", "2026-07-23", "--json"],
    {
      HOME: visitorHome,
      ANTI_AI_CREATURE_SEED: "encounter-save-visitor",
    },
  );
  assert.equal(visitorResult.status, 0, visitorResult.stderr);
  const visitor = JSON.parse(visitorResult.stdout);
  const env = {
    HOME: localHome,
    ANTI_AI_CREATURE_SEED: "encounter-save-local",
  };

  const first = runCli(
    [
      "encounter",
      visitor.code,
      "--date",
      "2026-07-23",
      "--save",
      "--json",
    ],
    env,
  );
  const repeated = runCli(
    [
      "encounter",
      visitor.code,
      "--date",
      "2026-07-23",
      "--save",
      "--json",
    ],
    env,
  );
  assert.equal(first.status, 0, first.stderr);
  assert.equal(repeated.status, 0, repeated.stderr);
  const firstEncounter = JSON.parse(first.stdout);
  const repeatedEncounter = JSON.parse(repeated.stdout);
  assert.equal(firstEncounter.saved, true);
  assert.equal(firstEncounter.alreadyCollected, false);
  assert.equal(repeatedEncounter.saved, true);
  assert.equal(repeatedEncounter.alreadyCollected, true);

  const machineCodex = runCli(
    ["codex", "--date", "2026-07-23", "--json"],
    env,
  );
  const humanCodex = runCli(["codex", "--date", "2026-07-23"], env);
  const weekly = runCli(["week", "--date", "2026-07-23"], env);
  assert.equal(machineCodex.status, 0, machineCodex.stderr);
  assert.equal(humanCodex.status, 0, humanCodex.stderr);
  assert.equal(weekly.status, 0, weekly.stderr);
  const codex = JSON.parse(machineCodex.stdout);
  assert.equal(codex.summary.foreignSpecimens.discovered, 1);
  assert.equal(codex.sections.foreignSpecimens.length, 1);
  assert.equal(
    codex.sections.foreignSpecimens[0].id,
    firstEncounter.encounterId,
  );
  assert.match(humanCodex.stdout, /外来标本\s+\[1\]/);
  assert.match(humanCodex.stdout, new RegExp(`#${firstEncounter.encounterId}`));
  assert.match(weekly.stdout, /新增收藏.*外来 1/);

  const savedState = readFileSync(
    path.join(localHome, ".anti-ai", "creature.json"),
    "utf8",
  );
  const state = JSON.parse(savedState);
  assert.equal(state.schemaVersion, 10);
  assert.equal(state.foreignSpecimens.length, 1);
  assert.doesNotMatch(
    savedState,
    /pollutionCode|exactTokens|modelName|conversation|session\.jsonl/,
  );
});
