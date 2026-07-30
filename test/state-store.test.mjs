import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  StateConflictError,
  loadJsonState,
  saveJsonState,
} from "../src/state-store.mjs";

function stateContract(target) {
  return {
    target,
    create: () => ({ schemaVersion: 1, days: {} }),
    validate: (state) => state,
    migrate: (state) => state,
  };
}

test("state writes reject a stale concurrent snapshot instead of losing data", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-state-store-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const target = path.join(workspace, ".anti-ai", "creature.json");

  const first = await loadJsonState(stateContract(target));
  const stale = await loadJsonState(stateContract(target));
  first.days.first = { active: true };
  await saveJsonState({ target, state: first, currentVersion: 1 });

  stale.days.stale = { active: true };
  await assert.rejects(
    saveJsonState({ target, state: stale, currentVersion: 1 }),
    StateConflictError,
  );
  assert.deepEqual(JSON.parse(readFileSync(target, "utf8")).days, {
    first: { active: true },
  });
});
