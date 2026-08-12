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

test("today --json counts Codex request usage on the requested local date", () => {
  const result = runCli([
    "today",
    "--date",
    "2026-07-23",
    "--source",
    "codex",
    "--json",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), {
    date: "2026-07-23",
    timezone: "Asia/Shanghai",
    sources: {
      codex: {
        requests: 2,
        inputTokens: 150,
        cachedInputTokens: 40,
        cacheWriteInputTokens: 0,
        outputTokens: 30,
        reasoningOutputTokens: 5,
        totalTokens: 180,
      },
    },
    models: {
      codex: {
        "gpt-test": {
          requests: 2,
          inputTokens: 150,
          cachedInputTokens: 40,
          cacheWriteInputTokens: 0,
          outputTokens: 30,
          reasoningOutputTokens: 5,
          totalTokens: 180,
        },
      },
    },
    totals: {
      requests: 2,
      inputTokens: 150,
      cachedInputTokens: 40,
      cacheWriteInputTokens: 0,
      outputTokens: 30,
      reasoningOutputTokens: 5,
      totalTokens: 180,
    },
  });
});

test("JSONL adapters clamp malformed and negative usage fields without changing accounting semantics", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "anti-ai-safe-usage-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeCodexUsage(root, [
    {
      input_tokens: -40,
      cached_input_tokens: "not-a-number",
      output_tokens: "7",
      reasoning_output_tokens: -1,
      total_tokens: "not-a-number",
    },
  ]);

  const result = runCli(
    ["today", "--date", "2026-07-23", "--source", "codex", "--json"],
    { ANTI_AI_CODEX_DIR: root },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).sources.codex, {
    requests: 1,
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    outputTokens: 7,
    reasoningOutputTokens: 0,
    totalTokens: 7,
  });
});

test("today --json deduplicates Claude Code streaming usage by message id", () => {
  const result = runCli(
    [
      "today",
      "--date",
      "2026-07-23",
      "--source",
      "claude",
      "--json",
    ],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), {
    date: "2026-07-23",
    timezone: "Asia/Shanghai",
    sources: {
      claude: {
        requests: 2,
        inputTokens: 125,
        cachedInputTokens: 90,
        cacheWriteInputTokens: 20,
        outputTokens: 45,
        reasoningOutputTokens: 0,
        totalTokens: 170,
      },
    },
    models: {
      claude: {
        "claude-test": {
          requests: 2,
          inputTokens: 125,
          cachedInputTokens: 90,
          cacheWriteInputTokens: 20,
          outputTokens: 45,
          reasoningOutputTokens: 0,
          totalTokens: 170,
        },
      },
    },
    totals: {
      requests: 2,
      inputTokens: 125,
      cachedInputTokens: 90,
      cacheWriteInputTokens: 20,
      outputTokens: 45,
      reasoningOutputTokens: 0,
      totalTokens: 170,
    },
  });
});

test("today --json counts OpenCode SQLite assistant usage by message date", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-opencode-"));
  const databasePath = path.join(workspace, "opencode.db");
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const timestamp = new Date("2026-07-23T09:30:00+08:00").getTime();
  writeOpenCodeDb(databasePath, [
    {
      id: "message-assistant",
      timeCreated: timestamp,
      data: {
        role: "assistant",
        modelID: "opencode-test",
        providerID: "test-provider",
        time: { created: timestamp },
        tokens: {
          input: 10,
          output: 7,
          reasoning: 3,
          cache: { read: 20, write: 5 },
        },
      },
    },
    {
      id: "message-user",
      timeCreated: timestamp,
      data: {
        role: "user",
        tokens: { input: 999, output: 999 },
      },
    },
  ]);

  const result = runCli(
    [
      "today",
      "--date",
      "2026-07-23",
      "--source",
      "opencode",
      "--json",
    ],
    { ANTI_AI_OPENCODE_DB: databasePath },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    date: "2026-07-23",
    timezone: "Asia/Shanghai",
    sources: {
      opencode: {
        requests: 1,
        inputTokens: 35,
        cachedInputTokens: 20,
        cacheWriteInputTokens: 5,
        outputTokens: 7,
        reasoningOutputTokens: 3,
        totalTokens: 42,
      },
    },
    models: {
      opencode: {
        "opencode-test": {
          requests: 1,
          inputTokens: 35,
          cachedInputTokens: 20,
          cacheWriteInputTokens: 5,
          outputTokens: 7,
          reasoningOutputTokens: 3,
          totalTokens: 42,
        },
      },
    },
    totals: {
      requests: 1,
      inputTokens: 35,
      cachedInputTokens: 20,
      cacheWriteInputTokens: 5,
      outputTokens: 7,
      reasoningOutputTokens: 3,
      totalTokens: 42,
    },
  });

  const human = runCli(
    ["today", "--date", "2026-07-23", "--source", "opencode"],
    { ANTI_AI_OPENCODE_DB: databasePath },
  );
  assert.equal(human.status, 0, human.stderr);
  assert.match(human.stdout, /OpenCode\s+42/);
  assert.match(human.stdout, /OpenCode · opencode-test\s+42 tokens/);
  assert.doesNotMatch(human.stdout, /^\s+Codex\s+0$/m);
});

test("today --json supports OpenCode's session_message schema", (t) => {
  const workspace = mkdtempSync(
    path.join(tmpdir(), "anti-ai-opencode-modern-"),
  );
  const databasePath = path.join(workspace, "opencode.db");
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const timestamp = new Date("2026-07-23T10:00:00+08:00").getTime();
  writeOpenCodeSessionMessageDb(databasePath, [
    {
      id: "modern-assistant",
      timeCreated: timestamp,
      data: {
        role: "assistant",
        modelID: "opencode-modern",
        time: { created: timestamp },
        tokens: {
          input: 4,
          output: 2,
          reasoning: 1,
          cache: { read: 6, write: 0 },
        },
      },
    },
  ]);

  const result = runCli(
    [
      "today",
      "--date",
      "2026-07-23",
      "--source",
      "opencode",
      "--json",
    ],
    { ANTI_AI_OPENCODE_DB: databasePath },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).sources.opencode, {
    requests: 1,
    inputTokens: 10,
    cachedInputTokens: 6,
    cacheWriteInputTokens: 0,
    outputTokens: 2,
    reasoningOutputTokens: 1,
    totalTokens: 12,
  });
});

test("today --json deduplicates OpenClaw reset logs and ignores trajectory files", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "anti-ai-openclaw-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const assistantRecord = {
    type: "message",
    id: "openclaw-1",
    timestamp: "2026-07-23T01:00:00.000Z",
    message: {
      role: "assistant",
      provider: "test-provider",
      model: "openclaw-test",
      timestamp: Date.parse("2026-07-23T01:00:00.000Z"),
      usage: {
        input: 10,
        output: 4,
        cacheRead: 20,
        cacheWrite: 5,
        reasoningTokens: 2,
        totalTokens: 39,
      },
    },
  };
  writeJsonl(path.join(root, "active.jsonl"), [assistantRecord]);
  writeJsonl(path.join(root, "active.jsonl.reset.20260723"), [
    assistantRecord,
    {
      ...assistantRecord,
      id: "openclaw-2",
      timestamp: "2026-07-23T02:00:00.000Z",
      message: {
        ...assistantRecord.message,
        timestamp: Date.parse("2026-07-23T02:00:00.000Z"),
        usage: {
          input: 3,
          output: 2,
          cacheRead: 0,
          cacheWrite: 0,
          reasoningTokens: 0,
          totalTokens: 5,
        },
      },
    },
  ]);
  writeJsonl(path.join(root, "active.trajectory.jsonl"), [
    {
      ...assistantRecord,
      id: "trajectory-only",
      message: {
        ...assistantRecord.message,
        usage: { input: 1000, output: 1000, totalTokens: 2000 },
      },
    },
  ]);

  const result = runCli(
    [
      "today",
      "--date",
      "2026-07-23",
      "--source",
      "openclaw",
      "--json",
    ],
    { ANTI_AI_OPENCLAW_DIR: root },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).sources.openclaw, {
    requests: 2,
    inputTokens: 38,
    cachedInputTokens: 20,
    cacheWriteInputTokens: 5,
    outputTokens: 6,
    reasoningOutputTokens: 2,
    totalTokens: 44,
  });
  assert.deepEqual(Object.keys(JSON.parse(result.stdout).models.openclaw), [
    "openclaw-test",
  ]);
});

test("today --json counts Pi summaries and deduplicates cloned entry IDs", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "anti-ai-pi-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const assistant = {
    type: "message",
    id: "pi-assistant",
    parentId: "pi-user",
    timestamp: "2026-07-23T01:00:00.000Z",
    message: {
      role: "assistant",
      provider: "test-provider",
      model: "pi-test",
      timestamp: Date.parse("2026-07-23T01:00:00.000Z"),
      usage: {
        input: 11,
        output: 5,
        cacheRead: 2,
        cacheWrite: 3,
        totalTokens: 21,
      },
    },
  };
  const modelChange = {
    type: "model_change",
    id: "pi-model",
    parentId: "pi-assistant",
    timestamp: "2026-07-23T01:01:00.000Z",
    provider: "test-provider",
    modelId: "pi-test",
  };
  const compaction = {
    type: "compaction",
    id: "pi-compaction",
    parentId: "pi-model",
    timestamp: "2026-07-23T01:02:00.000Z",
    usage: {
      input: 7,
      output: 2,
      cacheRead: 1,
      cacheWrite: 0,
      totalTokens: 10,
    },
  };
  writeJsonl(path.join(root, "project", "original.jsonl"), [
    { type: "session", version: 3, id: "pi-session-1" },
    assistant,
    modelChange,
    compaction,
  ]);
  writeJsonl(path.join(root, "project", "clone.jsonl"), [
    { type: "session", version: 3, id: "pi-session-2" },
    assistant,
    modelChange,
    compaction,
  ]);

  const result = runCli(
    ["today", "--date", "2026-07-23", "--source", "pi", "--json"],
    { ANTI_AI_PI_DIR: root },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).sources.pi, {
    requests: 2,
    inputTokens: 24,
    cachedInputTokens: 3,
    cacheWriteInputTokens: 3,
    outputTokens: 7,
    reasoningOutputTokens: 0,
    totalTokens: 31,
  });
  assert.deepEqual(JSON.parse(result.stdout).models.pi["pi-test"], {
    requests: 2,
    inputTokens: 24,
    cachedInputTokens: 3,
    cacheWriteInputTokens: 3,
    outputTokens: 7,
    reasoningOutputTokens: 0,
    totalTokens: 31,
  });
});

test("today --json counts Hermes session totals on the session end date", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-hermes-"));
  const databasePath = path.join(workspace, "state.db");
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  writeHermesDb(databasePath, [
    {
      id: "hermes-session",
      model: "hermes-test",
      started_at: Date.parse("2026-07-22T23:55:00.000Z") / 1000,
      ended_at: Date.parse("2026-07-23T01:05:00.000Z") / 1000,
      input_tokens: 9,
      output_tokens: 4,
      cache_read_tokens: 20,
      cache_write_tokens: 5,
      reasoning_tokens: 2,
      api_call_count: 3,
    },
  ]);

  const result = runCli(
    ["today", "--date", "2026-07-23", "--source", "hermes", "--json"],
    { ANTI_AI_HERMES_DB: databasePath },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).sources.hermes, {
    requests: 3,
    inputTokens: 34,
    cachedInputTokens: 20,
    cacheWriteInputTokens: 5,
    outputTokens: 4,
    reasoningOutputTokens: 2,
    totalTokens: 38,
  });
  assert.deepEqual(JSON.parse(result.stdout).models.hermes["hermes-test"], {
    requests: 3,
    inputTokens: 34,
    cachedInputTokens: 20,
    cacheWriteInputTokens: 5,
    outputTokens: 4,
    reasoningOutputTokens: 2,
    totalTokens: 38,
  });
});

test("today --json prefers Hermes per-model usage including auxiliary calls", (t) => {
  const workspace = mkdtempSync(
    path.join(tmpdir(), "anti-ai-hermes-models-"),
  );
  const databasePath = path.join(workspace, "state.db");
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const timestamp = Date.parse("2026-07-23T01:05:00.000Z") / 1000;
  writeHermesDb(databasePath, [
    {
      id: "hermes-session",
      model: "stale-session-model",
      started_at: timestamp - 60,
      ended_at: timestamp,
      input_tokens: 999,
      output_tokens: 999,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      reasoning_tokens: 0,
      api_call_count: 99,
    },
  ]);
  writeHermesModelUsage(databasePath, [
    {
      session_id: "hermes-session",
      model: "hermes-main",
      task: "",
      api_call_count: 2,
      input_tokens: 5,
      output_tokens: 3,
      cache_read_tokens: 7,
      cache_write_tokens: 0,
      reasoning_tokens: 1,
      first_seen: timestamp - 30,
      last_seen: timestamp,
    },
    {
      session_id: "hermes-session",
      model: "hermes-aux",
      task: "compression",
      api_call_count: 1,
      input_tokens: 2,
      output_tokens: 1,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      reasoning_tokens: 0,
      first_seen: timestamp,
      last_seen: timestamp,
    },
  ]);

  const result = runCli(
    ["today", "--date", "2026-07-23", "--source", "hermes", "--json"],
    { ANTI_AI_HERMES_DB: databasePath },
  );

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.sources.hermes, {
    requests: 3,
    inputTokens: 14,
    cachedInputTokens: 7,
    cacheWriteInputTokens: 0,
    outputTokens: 4,
    reasoningOutputTokens: 1,
    totalTokens: 18,
  });
  assert.deepEqual(Object.keys(report.models.hermes).sort(), [
    "hermes-aux",
    "hermes-main",
  ]);
});

test("human-readable model names cannot inject terminal control characters", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "anti-ai-model-name-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const records = [
    {
      timestamp: "2026-07-22T16:00:00.000Z",
      type: "turn_context",
      payload: { model: "gpt\u001b[31m" },
    },
    {
      timestamp: "2026-07-22T16:01:00.000Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          last_token_usage: {
            input_tokens: 10,
            output_tokens: 5,
            total_tokens: 15,
          },
        },
      },
    },
  ];
  mkdirSync(path.join(root, "2026", "07", "23"), { recursive: true });
  writeFileSync(
    path.join(root, "2026", "07", "23", "session.jsonl"),
    `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
  );

  const result = runCli(["today", "--date", "2026-07-23", "--source", "codex"], {
    ANTI_AI_CODEX_DIR: root,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /\u001b/);
  assert.match(result.stdout, /Codex · gpt�\[31m/);
});
