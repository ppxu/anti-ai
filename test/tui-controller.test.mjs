import assert from "node:assert/strict";
import test from "node:test";

import {
  createTuiControllerState,
  shouldRunTuiMotion,
  tuiControllerReducer,
} from "../src/application/tui-controller.mjs";

function snapshot(proposals = []) {
  return { laboratory: { proposals } };
}

test("the TUI controller keeps one explicit state envelope", () => {
  const initial = createTuiControllerState({
    snapshot: snapshot([{ slot: 1 }]),
    motion: "full",
  });
  assert.equal(initial.activeIndex, 0);
  assert.equal(initial.overviewMode, "briefing");
  assert.equal(initial.laboratoryFocus, "formulas");
  assert.equal(initial.shareMode, null);

  const updated = tuiControllerReducer(initial, {
    type: "set",
    field: "frame",
    value: (frame) => frame + 1,
  });
  assert.equal(updated.frame, 1);
  assert.equal(initial.frame, 0);
  assert.strictEqual(
    tuiControllerReducer(updated, {
      type: "set",
      field: "frame",
      value: 1,
    }),
    updated,
  );
});

test("TUI motion pauses behind help, action, and share overlays", () => {
  const active = {
    activeId: "habitat",
    motion: "low",
    showHelp: false,
    actionMode: null,
    shareMode: null,
  };
  assert.equal(shouldRunTuiMotion(active), true);
  assert.equal(shouldRunTuiMotion({ ...active, showHelp: true }), false);
  assert.equal(shouldRunTuiMotion({ ...active, actionMode: "preview" }), false);
  assert.equal(shouldRunTuiMotion({ ...active, shareMode: "preview" }), false);
  assert.equal(shouldRunTuiMotion({ ...active, activeId: "codex" }), false);
  assert.equal(shouldRunTuiMotion({ ...active, motion: "off" }), false);
});
