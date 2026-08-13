import { existsSync } from "node:fs";

import {
  assert,
  mkdtempSync,
  path,
  readFileSync,
  rmSync,
  runCli,
  test,
  tmpdir,
  writeCodexUsage,
  writeFileSync,
} from "./helpers.mjs";

import {
  validateDesktopSnapshot,
} from "../src/application/desktop-snapshot.mjs";
import { localDate } from "../src/scanner.mjs";

function desktopPaths(home) {
  const directory = path.join(home, ".anti-ai", "desktop");
  return {
    link: path.join(directory, "link-v1.json"),
    snapshot: path.join(directory, "snapshot-v1.json"),
  };
}

function linkedFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "anti-ai-desktop-"));
  const home = path.join(root, "home");
  const codex = path.join(root, "codex");
  const date = localDate(
    new Date(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  writeCodexUsage(
    codex,
    [
      {
        input_tokens: 1_234,
        cached_input_tokens: 456,
        output_tokens: 321,
        reasoning_output_tokens: 12,
        total_tokens: 1_555,
      },
    ],
    date,
  );
  return {
    root,
    home,
    date,
    env: {
      HOME: home,
      ANTI_AI_CODEX_DIR: codex,
      ANTI_AI_CREATURE_SEED: "desktop-contract-seed",
    },
  };
}

test("desktop link records a fixed bridge and writes a privacy-safe snapshot", (t) => {
  const fixture = linkedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));

  const result = runCli(["desktop", "link", "--json"], fixture.env);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  const files = desktopPaths(fixture.home);
  assert.equal(output.version, 1);
  assert.equal(output.bridge.status, "linked");
  assert.equal(output.snapshot.status, "ready");
  assert.ok(existsSync(files.link));
  assert.ok(existsSync(files.snapshot));

  const link = JSON.parse(readFileSync(files.link, "utf8"));
  assert.equal(link.version, 1);
  assert.ok(path.isAbsolute(link.nodePath));
  assert.ok(path.isAbsolute(link.cliEntryPath));
  assert.ok(!JSON.stringify(output).includes(link.nodePath));
  assert.ok(!JSON.stringify(output).includes(link.cliEntryPath));

  const snapshot = validateDesktopSnapshot(
    JSON.parse(readFileSync(files.snapshot, "utf8")),
  );
  assert.equal(snapshot.date, fixture.date);
  assert.equal(snapshot.creature.specimenId.length, 8);
  assert.equal(snapshot.creature.fingerprint.length, 12);
  assert.equal(snapshot.privacy.containsExactTokens, false);
  assert.equal(snapshot.privacy.containsModels, false);
  assert.equal(snapshot.privacy.containsPaths, false);
  assert.equal(snapshot.privacy.containsConversation, false);
  const serialized = JSON.stringify(snapshot);
  assert.ok(!serialized.includes("mutation-test"));
  assert.ok(!serialized.includes(fixture.root));
  assert.ok(!serialized.includes("input_tokens"));
  assert.ok(!serialized.includes("total_tokens"));
});

test("desktop status is read-only and reports missing, invalid, stale, and ready states", (t) => {
  const fixture = linkedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const files = desktopPaths(fixture.home);

  const missing = runCli(["desktop", "status", "--json"], fixture.env);
  assert.equal(missing.status, 1);
  assert.deepEqual(JSON.parse(missing.stdout), {
    version: 1,
    bridge: { status: "missing" },
    snapshot: { status: "missing" },
  });

  assert.equal(
    runCli(["desktop", "link", "--json"], fixture.env).status,
    0,
  );
  const snapshotBefore = readFileSync(files.snapshot, "utf8");
  const creatureBefore = readFileSync(
    path.join(fixture.home, ".anti-ai", "creature.json"),
    "utf8",
  );
  const ready = runCli(["desktop", "status", "--json"], fixture.env);
  assert.equal(ready.status, 0, ready.stderr);
  assert.equal(JSON.parse(ready.stdout).snapshot.status, "ready");
  assert.equal(readFileSync(files.snapshot, "utf8"), snapshotBefore);
  assert.equal(
    readFileSync(path.join(fixture.home, ".anti-ai", "creature.json"), "utf8"),
    creatureBefore,
  );

  const historical = JSON.parse(snapshotBefore);
  historical.date = "2000-01-01";
  historical.generatedAt = "2000-01-01T00:00:00.000Z";
  writeFileSync(files.snapshot, `${JSON.stringify(historical)}\n`);
  const stale = runCli(["desktop", "status", "--json"], fixture.env);
  assert.equal(stale.status, 0, stale.stderr);
  assert.equal(JSON.parse(stale.stdout).snapshot.status, "stale");
  assert.equal(readFileSync(files.snapshot, "utf8"), `${JSON.stringify(historical)}\n`);
  writeFileSync(files.snapshot, snapshotBefore);

  writeFileSync(files.link, "{not-json\n");
  const invalid = runCli(["desktop", "status", "--json"], fixture.env);
  assert.equal(invalid.status, 1);
  assert.equal(JSON.parse(invalid.stdout).bridge.status, "invalid");
  assert.equal(readFileSync(files.snapshot, "utf8"), snapshotBefore);
});

test("desktop refresh preserves its previous snapshot when the bridge is invalid", (t) => {
  const fixture = linkedFixture();
  t.after(() => rmSync(fixture.root, { recursive: true, force: true }));
  const files = desktopPaths(fixture.home);
  assert.equal(
    runCli(["desktop", "link", "--json"], fixture.env).status,
    0,
  );
  const before = readFileSync(files.snapshot, "utf8");
  writeFileSync(
    files.link,
    `${JSON.stringify({
      version: 1,
      linkedAt: new Date().toISOString(),
      nodePath: "/missing/node",
      cliEntryPath: "/missing/anti-ai.mjs",
    })}\n`,
  );

  const result = runCli(["desktop", "refresh", "--json"], fixture.env);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).error, "bridge_invalid");
  assert.equal(readFileSync(files.snapshot, "utf8"), before);
});

test("desktop command exposes bilingual command and action help", () => {
  const command = runCli(["desktop", "--help", "--lang", "en"]);
  const link = runCli(["desktop", "link", "--help"]);
  const refresh = runCli(["help", "desktop", "refresh", "--lang", "en"]);
  assert.equal(command.status, 0);
  assert.equal(link.status, 0);
  assert.equal(refresh.status, 0);
  assert.match(command.stdout, /Usage: anti-ai desktop/);
  assert.match(command.stdout, /desktop link/);
  assert.match(link.stdout, /关联桌面伴生体/);
  assert.match(refresh.stdout, /Refresh the desktop snapshot/);
});
