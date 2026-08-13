import {
  loadCreatureState,
  saveCreatureState,
} from "../creature.mjs";
import {
  DESKTOP_BRIDGE_VERSION,
  DesktopStoreError,
  readDesktopLink,
  readDesktopSnapshot,
  removeDesktopSnapshot,
  writeDesktopLink,
  writeDesktopSnapshot,
} from "../infrastructure/desktop-store.mjs";
import { localDate } from "../scanner.mjs";
import { deriveDesktopSnapshot, validateDesktopSnapshot } from "./desktop-snapshot.mjs";
import { settleCreatureState } from "./settlement.mjs";

const DESKTOP_STALE_AFTER_MS = 36 * 60 * 60 * 1_000;

function desktopDate() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    date: localDate(new Date(), timezone),
    timezone,
  };
}

async function writeDesktopProjection(state, date) {
  const snapshot = deriveDesktopSnapshot(state, date);
  await writeDesktopSnapshot(snapshot);
  return snapshot;
}

async function syncLinkedDesktopSnapshot(state, date = desktopDate().date) {
  try {
    await readDesktopLink();
  } catch (error) {
    if (error instanceof DesktopStoreError && error.code === "bridge_missing") {
      return { status: "unlinked" };
    }
    return { status: "failed", error: error.code ?? "snapshot_write_failed" };
  }
  try {
    const snapshot = await writeDesktopProjection(state, date);
    return { status: "ready", snapshot };
  } catch (error) {
    return { status: "failed", error: error.code ?? "snapshot_write_failed" };
  }
}

async function persistCreatureState(state, date = desktopDate().date) {
  await saveCreatureState(state);
  return syncLinkedDesktopSnapshot(state, date);
}

async function clearLinkedDesktopSnapshot() {
  await removeDesktopSnapshot();
}

async function refreshDesktopSnapshot(options = {}) {
  await readDesktopLink();
  const { date, timezone } = desktopDate();
  const state = await loadCreatureState();
  const settlement = await settleCreatureState(
    state,
    date,
    {
      source: "all",
      lang: options.lang ?? "zh",
      json: false,
    },
    timezone,
  );
  await saveCreatureState(settlement.state);
  return writeDesktopProjection(settlement.state, date);
}

async function linkDesktopBridge({ nodePath, cliEntryPath, lang = "zh" }) {
  const link = {
    version: DESKTOP_BRIDGE_VERSION,
    linkedAt: new Date().toISOString(),
    nodePath,
    cliEntryPath,
  };
  await writeDesktopLink(link);
  const snapshot = await refreshDesktopSnapshot({ lang });
  return { link, snapshot };
}

function statusForError(error, prefix) {
  if (!(error instanceof DesktopStoreError)) return `${prefix}_invalid`;
  return error.code === `${prefix}_missing` ? "missing" : "invalid";
}

async function desktopStatus() {
  let bridge;
  try {
    const link = await readDesktopLink();
    bridge = { status: "linked", linkedAt: link.linkedAt };
  } catch (error) {
    bridge = { status: statusForError(error, "bridge") };
  }

  let snapshot;
  try {
    const value = validateDesktopSnapshot(await readDesktopSnapshot());
    const generatedAt = Date.parse(value.generatedAt);
    const { date } = desktopDate();
    const stale =
      value.date !== date ||
      !Number.isFinite(generatedAt) ||
      Date.now() - generatedAt > DESKTOP_STALE_AFTER_MS ||
      generatedAt - Date.now() > 5 * 60 * 1_000;
    snapshot = {
      status: stale ? "stale" : "ready",
      version: value.version,
      date: value.date,
      generatedAt: value.generatedAt,
      specimenId: value.creature.specimenId,
    };
  } catch (error) {
    snapshot = {
      status: error.code === "snapshot_incompatible"
        ? "incompatible"
        : statusForError(error, "snapshot"),
    };
  }

  return { version: 1, bridge, snapshot };
}

export {
  DESKTOP_STALE_AFTER_MS,
  clearLinkedDesktopSnapshot,
  desktopStatus,
  linkDesktopBridge,
  persistCreatureState,
  refreshDesktopSnapshot,
  syncLinkedDesktopSnapshot,
};
