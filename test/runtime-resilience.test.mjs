import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(testDir, "..");

test("JSONL sources run without the optional SQLite driver", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-no-sqlite-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));

  const installedPackage = path.join(workspace, "package");
  const home = path.join(workspace, "home");
  const codexRoot = path.join(workspace, "codex");
  const sessionDir = path.join(codexRoot, "2026", "07", "23");
  mkdirSync(sessionDir, { recursive: true });
  cpSync(path.join(projectDir, "bin"), path.join(installedPackage, "bin"), {
    recursive: true,
  });
  cpSync(path.join(projectDir, "src"), path.join(installedPackage, "src"), {
    recursive: true,
  });
  cpSync(
    path.join(projectDir, "package.json"),
    path.join(installedPackage, "package.json"),
  );

  writeFileSync(
    path.join(sessionDir, "session.jsonl"),
    `${[
      {
        timestamp: "2026-07-23T02:00:00.000Z",
        type: "turn_context",
        payload: { model: "test-model" },
      },
      {
        timestamp: "2026-07-23T02:00:01.000Z",
        type: "event_msg",
        payload: {
          type: "token_count",
          info: {
            last_token_usage: {
              input_tokens: 100,
              output_tokens: 20,
              total_tokens: 120,
            },
          },
        },
      },
    ]
      .map((record) => JSON.stringify(record))
      .join("\n")}\n`,
  );

  const result = spawnSync(
    process.execPath,
    [
      path.join(installedPackage, "bin", "anti-ai.mjs"),
      "today",
      "--date",
      "2026-07-23",
      "--source",
      "codex",
      "--json",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: home,
        TZ: "Asia/Shanghai",
        NO_COLOR: "1",
        ANTI_AI_CODEX_DIR: codexRoot,
        ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
        ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
        ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
        ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
        ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
      },
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).totals.totalTokens, 120);

  const sqlitePath = path.join(workspace, "unreadable-without-driver.db");
  writeFileSync(sqlitePath, "");
  const doctor = spawnSync(
    process.execPath,
    [
      path.join(installedPackage, "bin", "anti-ai.mjs"),
      "doctor",
      "--source",
      "opencode",
      "--lang",
      "en",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: home,
        TZ: "Asia/Shanghai",
        NO_COLOR: "1",
        ANTI_AI_OPENCODE_DB: sqlitePath,
      },
    },
  );
  assert.equal(doctor.status, 1);
  assert.match(doctor.stdout, /SQLite driver unavailable/);

  const degraded = spawnSync(
    process.execPath,
    [
      path.join(installedPackage, "bin", "anti-ai.mjs"),
      "today",
      "--date",
      "2026-07-23",
      "--json",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: home,
        TZ: "Asia/Shanghai",
        NO_COLOR: "1",
        ANTI_AI_CODEX_DIR: codexRoot,
        ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
        ANTI_AI_OPENCODE_DB: sqlitePath,
        ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
        ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
        ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
      },
    },
  );
  assert.equal(degraded.status, 0, degraded.stderr);
  assert.deepEqual(JSON.parse(degraded.stdout).warnings, [
    { source: "opencode", code: "SQLITE_DRIVER_UNAVAILABLE" },
  ]);

  const readableDegraded = spawnSync(
    process.execPath,
    [
      path.join(installedPackage, "bin", "anti-ai.mjs"),
      "today",
      "--date",
      "2026-07-23",
      "--lang",
      "en",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: home,
        TZ: "Asia/Shanghai",
        NO_COLOR: "1",
        ANTI_AI_CODEX_DIR: codexRoot,
        ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
        ANTI_AI_OPENCODE_DB: sqlitePath,
        ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
        ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
        ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
      },
    },
  );
  assert.equal(readableDegraded.status, 0, readableDegraded.stderr);
  assert.match(
    readableDegraded.stdout,
    /Not counted: opencode \(SQLITE_DRIVER_UNAVAILABLE\)/,
  );
  assert.doesNotMatch(readableDegraded.stdout, /unreadable-without-driver/);
});

test("a future creature schema is rejected without overwriting local state", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-future-state-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));

  const home = path.join(workspace, "home");
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const futureState = {
    schemaVersion: 999,
    seed: "future-version",
    days: {
      "2026-07-23": {
        active: true,
        marker: "must-survive",
      },
    },
  };
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(futureState, null, 2)}\n`);
  const before = readFileSync(statePath, "utf8");

  const result = spawnSync(
    process.execPath,
    [
      path.join(projectDir, "bin", "anti-ai.mjs"),
      "creature",
      "--date",
      "2026-07-23",
      "--json",
    ],
    {
      cwd: projectDir,
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: home,
        TZ: "Asia/Shanghai",
        NO_COLOR: "1",
        ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
        ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
        ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
        ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
        ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
        ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
      },
    },
  );

  assert.equal(result.status, 1);
  assert.equal(readFileSync(statePath, "utf8"), before);
});

test("an invalid creature state envelope is rejected without overwriting local state", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-invalid-state-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));

  const home = path.join(workspace, "home");
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const invalidState = {
    schemaVersion: 10,
    seed: "invalid-envelope",
    days: [],
  };
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(invalidState, null, 2)}\n`);
  const before = readFileSync(statePath, "utf8");

  const result = spawnSync(
    process.execPath,
    [
      path.join(projectDir, "bin", "anti-ai.mjs"),
      "creature",
      "--date",
      "2026-07-23",
      "--json",
    ],
    {
      cwd: projectDir,
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: home,
        TZ: "Asia/Shanghai",
        NO_COLOR: "1",
        ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
        ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
        ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
        ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
        ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
        ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
      },
    },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /异变体档案无法读取/);
  assert.equal(readFileSync(statePath, "utf8"), before);
});

test("invalid nested creature collections are rejected before migration or writes", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-invalid-nested-state-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));

  const invalidStates = [
    {
      schemaVersion: 14,
      seed: "invalid-day",
      days: { "2026-07-23": [] },
    },
    {
      schemaVersion: 14,
      seed: "invalid-laboratory",
      days: {},
      laboratory: { cultures: {} },
    },
    {
      schemaVersion: 14,
      seed: "invalid-expedition",
      days: {},
      expeditions: { active: "already escaped", history: [] },
    },
  ];

  for (const [index, invalidState] of invalidStates.entries()) {
    const home = path.join(workspace, `home-${index}`);
    const statePath = path.join(home, ".anti-ai", "creature.json");
    mkdirSync(path.dirname(statePath), { recursive: true });
    writeFileSync(statePath, `${JSON.stringify(invalidState, null, 2)}\n`);
    const before = readFileSync(statePath, "utf8");

    const result = spawnSync(
      process.execPath,
      [
        path.join(projectDir, "bin", "anti-ai.mjs"),
        "creature",
        "--date",
        "2026-07-23",
        "--json",
      ],
      {
        cwd: projectDir,
        encoding: "utf8",
        env: {
          ...process.env,
          HOME: home,
          TZ: "Asia/Shanghai",
          NO_COLOR: "1",
          ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
          ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
          ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
          ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
          ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
          ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
        },
      },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /异变体档案无法读取/u);
    assert.equal(readFileSync(statePath, "utf8"), before);
  }
});

test("migrating a creature file keeps one exact local backup", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-state-backup-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));

  const home = path.join(workspace, "home");
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const oldState = {
    schemaVersion: 9,
    seed: "backup-before-migration",
    days: {},
    marker: "preserve-exactly",
  };
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(oldState, null, 2)}\n`);

  const result = spawnSync(
    process.execPath,
    [
      path.join(projectDir, "bin", "anti-ai.mjs"),
      "creature",
      "--date",
      "2026-07-23",
      "--json",
    ],
    {
      cwd: projectDir,
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: home,
        TZ: "Asia/Shanghai",
        NO_COLOR: "1",
        ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
        ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
        ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
        ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
        ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
        ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
      },
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const backupDirectory = path.join(home, ".anti-ai", "backups");
  const backups = readdirSync(backupDirectory);
  assert.equal(backups.length, 1);
  assert.match(backups[0], /^creature-v9-[a-f0-9]{12}\.json$/);
  assert.deepEqual(
    JSON.parse(readFileSync(path.join(backupDirectory, backups[0]), "utf8")),
    oldState,
  );

  const reset = spawnSync(
    process.execPath,
    [path.join(projectDir, "bin", "anti-ai.mjs"), "creature", "reset", "--json"],
    {
      cwd: projectDir,
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: home,
        TZ: "Asia/Shanghai",
        NO_COLOR: "1",
      },
    },
  );
  assert.equal(reset.status, 0, reset.stderr);
  assert.equal(existsSync(backupDirectory), false);
});

test("codex and chronicle derive current snapshots without creating local state", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-pure-codex-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  const statePath = path.join(home, ".anti-ai", "creature.json");

  for (const args of [
    ["codex", "--date", "2026-07-23", "--json"],
    ["creature", "chronicle", "--date", "2026-07-23", "--json"],
  ]) {
    const result = spawnSync(
      process.execPath,
      [path.join(projectDir, "bin", "anti-ai.mjs"), ...args],
      {
        cwd: projectDir,
        encoding: "utf8",
        env: {
          ...process.env,
          HOME: home,
          TZ: "Asia/Shanghai",
          NO_COLOR: "1",
          ANTI_AI_CREATURE_SEED: "pure-codex",
          ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
          ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
          ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
          ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
          ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
          ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
  }
  assert.equal(existsSync(statePath), false);
});

test("collection share cards render a snapshot without creating local state", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-pure-share-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  const statePath = path.join(home, ".anti-ai", "creature.json");

  for (const card of ["specimen", "dossier"]) {
    const result = spawnSync(
      process.execPath,
      [
        path.join(projectDir, "bin", "anti-ai.mjs"),
        "share",
        "--card",
        card,
        "--date",
        "2026-07-23",
      ],
      {
        cwd: projectDir,
        encoding: "utf8",
        env: {
          ...process.env,
          HOME: home,
          TZ: "Asia/Shanghai",
          NO_COLOR: "1",
          ANTI_AI_CREATURE_SEED: "pure-share",
          ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
          ANTI_AI_CLAUDE_DIR: path.join(workspace, "missing-claude"),
          ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
          ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
          ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
          ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^<svg/);
  }
  assert.equal(existsSync(statePath), false);
});

test("one broken source does not hide healthy local usage", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-source-failure-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const codexRoot = path.join(workspace, "codex");
  const sessionDir = path.join(codexRoot, "2026", "07", "23");
  const brokenClaudeRoot = path.join(workspace, "claude-is-a-file");
  mkdirSync(sessionDir, { recursive: true });
  writeFileSync(brokenClaudeRoot, "not a directory\n");
  writeFileSync(
    path.join(sessionDir, "session.jsonl"),
    `${JSON.stringify({
      timestamp: "2026-07-23T02:00:00.000Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          last_token_usage: {
            input_tokens: 100,
            output_tokens: 20,
            total_tokens: 120,
          },
        },
      },
    })}\n`,
  );

  const result = spawnSync(
    process.execPath,
    [
      path.join(projectDir, "bin", "anti-ai.mjs"),
      "today",
      "--date",
      "2026-07-23",
      "--json",
    ],
    {
      cwd: projectDir,
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: path.join(workspace, "home"),
        TZ: "Asia/Shanghai",
        NO_COLOR: "1",
        ANTI_AI_CODEX_DIR: codexRoot,
        ANTI_AI_CLAUDE_DIR: brokenClaudeRoot,
        ANTI_AI_OPENCODE_DB: path.join(workspace, "missing-opencode.db"),
        ANTI_AI_OPENCLAW_DIR: path.join(workspace, "missing-openclaw"),
        ANTI_AI_HERMES_DB: path.join(workspace, "missing-hermes.db"),
        ANTI_AI_PI_DIR: path.join(workspace, "missing-pi"),
      },
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.totals.totalTokens, 120);
  assert.deepEqual(report.warnings, [{ source: "claude", code: "ENOTDIR" }]);
});
