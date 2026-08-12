import { laboratoryCompanion } from "../companion.mjs";
import { creatureCodex, deriveCreature } from "../creature.mjs";
import { laboratoryShelf, laboratoryView } from "../laboratory.mjs";

function memoizeByDate(derive) {
  const cache = new Map();
  return (date) => {
    if (!cache.has(date)) cache.set(date, derive(date));
    return cache.get(date);
  };
}

function createProjectionContext(state) {
  return {
    state,
    creature: memoizeByDate((date) => deriveCreature(state, date)),
    codex: memoizeByDate((date) => creatureCodex(state, date)),
    companion: memoizeByDate(
      (date) => laboratoryCompanion(state, date).companion,
    ),
    laboratory: memoizeByDate((date) => laboratoryView(state, date)),
    shelf: memoizeByDate((date) => laboratoryShelf(state, date)),
  };
}

export { createProjectionContext };
