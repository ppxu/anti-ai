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
  VISITOR_CONTENT,
  visitationCopy,
} from "../src/visitation-content.mjs";

test("visitor cohabitation content is route-balanced", () => {
  for (const routeId of ["pollution", "clarity", "paradox"]) {
    assert.equal(VISITOR_CONTENT[routeId].relationships.length, 4);
    assert.equal(VISITOR_CONTENT[routeId].bulletins.length, 4);
    assert.equal(VISITOR_CONTENT[routeId].exhibits.length, 4);
    assert.equal(
      new Set(VISITOR_CONTENT[routeId].relationships.map(({ id }) => id)).size,
      4,
    );
    assert.ok(
      VISITOR_CONTENT[routeId].relationships.every(({ id }) =>
        id.startsWith(`${routeId}_`)
      ),
    );
  }
});

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
  assert.equal(state.schemaVersion, 16);
  assert.equal(state.foreignSpecimens.length, 1);
  assert.doesNotMatch(
    savedState,
    /pollutionCode|exactTokens|modelName|conversation|session\.jsonl/,
  );
});

test("saved encounters appear in a read-only visitor archive", (t) => {
  const localHome = mkdtempSync(
    path.join(tmpdir(), "anti-ai-visitor-archive-local-"),
  );
  const visitorHome = mkdtempSync(
    path.join(tmpdir(), "anti-ai-visitor-archive-remote-"),
  );
  t.after(() => {
    rmSync(localHome, { recursive: true, force: true });
    rmSync(visitorHome, { recursive: true, force: true });
  });
  const visitor = JSON.parse(
    runCli(
      ["creature", "export", "--date", "2026-07-23", "--json"],
      {
        HOME: visitorHome,
        ANTI_AI_CREATURE_SEED: "visitor-archive-remote",
      },
    ).stdout,
  );
  const env = {
    HOME: localHome,
    ANTI_AI_CREATURE_SEED: "visitor-archive-local",
  };
  const saved = runCli(
    ["encounter", visitor.code, "--date", "2026-07-23", "--save", "--json"],
    env,
  );
  assert.equal(saved.status, 0, saved.stderr);

  const statePath = path.join(localHome, ".anti-ai", "creature.json");
  const before = readFileSync(statePath, "utf8");
  const archive = runCli(
    ["encounter", "visitors", "--date", "2026-07-24", "--json"],
    env,
  );
  const after = readFileSync(statePath, "utf8");

  assert.equal(archive.status, 0, archive.stderr);
  assert.equal(after, before);
  assert.deepEqual(JSON.parse(archive.stdout), {
    version: 1,
    date: "2026-07-24",
    activeStayId: null,
    visitors: [
      {
        id: JSON.parse(saved.stdout).encounterId,
        collectedAt: "2026-07-23",
        specimenId: JSON.parse(saved.stdout).hybrid.specimenId,
        fingerprint: JSON.parse(saved.stdout).hybrid.fingerprint,
        formId: JSON.parse(saved.stdout).hybrid.formId,
        ecology: JSON.parse(saved.stdout).hybrid.ecology,
        pathology: JSON.parse(saved.stdout).hybrid.pathology,
        status: "archived",
        admittedAt: null,
      },
    ],
  });
});

test("visitor hosting and release are explicit, idempotent, and date bounded", (t) => {
  const localHome = mkdtempSync(
    path.join(tmpdir(), "anti-ai-visitor-host-local-"),
  );
  const visitorHome = mkdtempSync(
    path.join(tmpdir(), "anti-ai-visitor-host-remote-"),
  );
  t.after(() => {
    rmSync(localHome, { recursive: true, force: true });
    rmSync(visitorHome, { recursive: true, force: true });
  });
  const visitor = JSON.parse(
    runCli(
      ["creature", "export", "--date", "2026-07-23", "--json"],
      {
        HOME: visitorHome,
        ANTI_AI_CREATURE_SEED: "visitor-host-remote",
      },
    ).stdout,
  );
  const env = {
    HOME: localHome,
    ANTI_AI_CREATURE_SEED: "visitor-host-local",
  };
  const saved = JSON.parse(
    runCli(
      ["encounter", visitor.code, "--date", "2026-07-23", "--save", "--json"],
      env,
    ).stdout,
  );

  const hosted = runCli(
    ["encounter", "host", saved.encounterId, "--date", "2026-07-24", "--json"],
    env,
  );
  const repeated = runCli(
    ["encounter", "host", saved.encounterId, "--date", "2026-07-24", "--json"],
    env,
  );
  assert.equal(hosted.status, 0, hosted.stderr);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(JSON.parse(hosted.stdout).changed, true);
  assert.equal(JSON.parse(repeated.stdout).changed, false);

  const active = JSON.parse(
    runCli(
      ["encounter", "visitors", "--date", "2026-07-24", "--json"],
      env,
    ).stdout,
  );
  assert.match(active.activeStayId, /^stay-[a-f0-9]{12}-2026-07-24$/u);
  assert.equal(active.visitors[0].status, "active");
  assert.equal(active.visitors[0].admittedAt, "2026-07-24");

  const released = runCli(
    ["encounter", "release", "--date", "2026-07-25", "--json"],
    env,
  );
  const releasedAgain = runCli(
    ["encounter", "release", "--date", "2026-07-25", "--json"],
    env,
  );
  assert.equal(released.status, 0, released.stderr);
  assert.equal(releasedAgain.status, 0, releasedAgain.stderr);
  assert.equal(JSON.parse(released.stdout).changed, true);
  assert.equal(JSON.parse(releasedAgain.stdout).changed, false);

  const historical = JSON.parse(
    runCli(
      ["encounter", "visitors", "--date", "2026-07-24", "--json"],
      env,
    ).stdout,
  );
  const current = JSON.parse(
    runCli(
      ["encounter", "visitors", "--date", "2026-07-25", "--json"],
      env,
    ).stdout,
  );
  assert.equal(historical.visitors[0].status, "active");
  assert.equal(current.activeStayId, null);
  assert.equal(current.visitors[0].status, "archived");

  const rollback = runCli(
    ["encounter", "host", saved.encounterId, "--date", "2026-07-24"],
    env,
  );
  assert.equal(rollback.status, 2);
  assert.match(rollback.stderr, /早于最近一次访客操作/);

  const invalid = runCli(
    ["encounter", "host", "missing", "--date", "2026-07-25"],
    env,
  );
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /未找到外来标本/);

  const stateText = readFileSync(
    path.join(localHome, ".anti-ai", "creature.json"),
    "utf8",
  );
  const state = JSON.parse(stateText);
  assert.equal(state.schemaVersion, 16);
  assert.equal(state.visitation.stays.length, 1);
  assert.equal(state.visitation.stays[0].releasedAt, "2026-07-25");
  assert.doesNotMatch(
    stateText,
    /pollutionCode|exactTokens|modelName|sourceName|prompt|response|conversation/i,
  );
});

test("an active visitor creates one deterministic date-driven Habitat projection", (t) => {
  const localHome = mkdtempSync(
    path.join(tmpdir(), "anti-ai-visitor-habitat-local-"),
  );
  const visitorHome = mkdtempSync(
    path.join(tmpdir(), "anti-ai-visitor-habitat-remote-"),
  );
  t.after(() => {
    rmSync(localHome, { recursive: true, force: true });
    rmSync(visitorHome, { recursive: true, force: true });
  });
  const visitor = JSON.parse(
    runCli(
      ["creature", "export", "--date", "2026-07-23", "--json"],
      {
        HOME: visitorHome,
        ANTI_AI_CREATURE_SEED: "visitor-habitat-remote",
      },
    ).stdout,
  );
  const env = {
    HOME: localHome,
    ANTI_AI_CREATURE_SEED: "visitor-habitat-local",
  };
  const saved = JSON.parse(
    runCli(
      ["encounter", visitor.code, "--date", "2026-07-23", "--save", "--json"],
      env,
    ).stdout,
  );
  assert.equal(
    runCli(
      ["encounter", "host", saved.encounterId, "--date", "2026-07-23"],
      env,
    ).status,
    0,
  );

  const statePath = path.join(localHome, ".anti-ai", "creature.json");
  const before = readFileSync(statePath, "utf8");
  const arrival = runCli(
    ["creature", "habitat", "--date", "2026-07-23", "--json"],
    env,
  );
  const repeated = runCli(
    ["creature", "habitat", "--date", "2026-07-23", "--json"],
    env,
  );
  const resident = runCli(
    ["creature", "habitat", "--date", "2026-07-30", "--json"],
    env,
  );
  const after = readFileSync(statePath, "utf8");

  assert.equal(arrival.status, 0, arrival.stderr);
  assert.equal(resident.status, 0, resident.stderr);
  assert.equal(after, before);
  assert.deepEqual(JSON.parse(arrival.stdout), JSON.parse(repeated.stdout));
  const first = JSON.parse(arrival.stdout).visitor;
  const later = JSON.parse(resident.stdout).visitor;
  assert.equal(first.foreignSpecimenId, saved.encounterId);
  assert.equal(first.cohabitationDays, 1);
  assert.equal(first.stageId, "intake");
  assert.match(first.relationshipId, /^(pollution|clarity|paradox)_/u);
  assert.match(first.bulletinId, /^(pollution|clarity|paradox)_/u);
  assert.match(first.exhibit.id, /^(pollution|clarity|paradox)_/u);
  assert.equal(later.cohabitationDays, 8);
  assert.equal(later.stageId, "resident");
  assert.deepEqual(later.appearance, first.appearance);
  assert.doesNotMatch(
    JSON.stringify(first),
    /exactTokens|modelName|sourceName|filePath|prompt|response|conversation/i,
  );

  const human = runCli(
    ["creature", "habitat", "--date", "2026-07-30", "--lang", "en"],
    env,
  );
  assert.equal(human.status, 0, human.stderr);
  assert.match(human.stdout, /VISITOR BAY/);
  assert.match(human.stdout, /COHABITATION DIAGNOSIS/);
  assert.match(human.stdout, /JOINT EXHIBIT/);
  assert.doesNotMatch(human.stdout, /[\p{Script=Han}]/u);

  const card = runCli(
    ["share", "--card", "habitat", "--date", "2026-07-30", "--lang", "en"],
    env,
  );
  const relationship = visitationCopy(
    "relationships",
    later.routeId,
    later.relationshipId,
    "en",
  );
  const exhibit = visitationCopy(
    "exhibits",
    later.routeId,
    later.exhibit.id,
    "en",
  );
  assert.equal(card.status, 0, card.stderr);
  assert.match(card.stdout, /VISITOR COHABITATION/);
  assert.ok(card.stdout.includes(relationship.name));
  assert.ok(card.stdout.includes(exhibit.name));
  assert.doesNotMatch(card.stdout, /AA1\.|exactTokens|modelName|prompt|response/u);
  assert.equal(readFileSync(statePath, "utf8"), before);
});
