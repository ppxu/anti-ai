import { createHash, randomBytes } from "node:crypto";
import { constants } from "node:fs";
import {
  copyFile,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const STATE_METADATA = Symbol("anti-ai state metadata");
const LOCK_ATTEMPTS = 40;
const LOCK_RETRY_MS = 25;
const STALE_LOCK_MS = 30_000;

class StateConflictError extends Error {
  constructor() {
    super("Local state changed while this command was running");
    this.name = "StateConflictError";
    this.code = "ANTI_AI_STATE_CONFLICT";
  }
}

function fingerprint(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function attachMetadata(state, metadata) {
  Object.defineProperty(state, STATE_METADATA, {
    configurable: true,
    enumerable: false,
    writable: true,
    value: metadata,
  });
  return state;
}

async function readExisting(target) {
  try {
    const contents = await readFile(target, "utf8");
    return { contents, fingerprint: fingerprint(contents) };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { contents: null, fingerprint: null };
    }
    throw error;
  }
}

async function loadJsonState({ target, create, validate, migrate }) {
  const existing = await readExisting(target);
  if (existing.contents === null) {
    return attachMetadata(migrate(validate(create())), {
      expectedFingerprint: null,
      originalContents: null,
      originalVersion: null,
    });
  }

  const parsed = validate(JSON.parse(existing.contents));
  const originalVersion = parsed.schemaVersion;
  return attachMetadata(migrate(parsed), {
    expectedFingerprint: existing.fingerprint,
    originalContents: existing.contents,
    originalVersion,
  });
}

async function acquireLock(lockPath) {
  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx", 0o600);
      try {
        await handle.writeFile(`${process.pid}\n`);
        return handle;
      } catch (error) {
        await handle.close();
        await rm(lockPath, { force: true });
        throw error;
      }
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        const lockStat = await stat(lockPath);
        if (Date.now() - lockStat.mtimeMs > STALE_LOCK_MS) {
          await rm(lockPath, { force: true });
          continue;
        }
      } catch (statError) {
        if (statError.code === "ENOENT") continue;
        throw statError;
      }
      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
    }
  }
  throw new StateConflictError();
}

async function backupMigratedState(target, metadata, currentVersion) {
  if (
    metadata.originalContents === null ||
    metadata.originalVersion === null ||
    metadata.originalVersion >= currentVersion
  ) {
    return;
  }

  const directory = path.join(path.dirname(target), "backups");
  const digest = fingerprint(metadata.originalContents).slice(0, 12);
  const backup = path.join(
    directory,
    `creature-v${metadata.originalVersion}-${digest}.json`,
  );
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    await copyFile(target, backup, constants.COPYFILE_EXCL);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}

async function saveJsonState({ target, state, currentVersion }) {
  const directory = path.dirname(target);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lockPath = `${target}.lock`;
  const lockHandle = await acquireLock(lockPath);

  try {
    const metadata = state[STATE_METADATA] ?? {
      expectedFingerprint: null,
      originalContents: null,
      originalVersion: null,
    };
    const existing = await readExisting(target);
    if (existing.fingerprint !== metadata.expectedFingerprint) {
      throw new StateConflictError();
    }

    await backupMigratedState(target, metadata, currentVersion);
    const contents = `${JSON.stringify(state, null, 2)}\n`;
    const temporary = path.join(
      directory,
      `.creature-${process.pid}-${randomBytes(4).toString("hex")}.tmp`,
    );
    try {
      await writeFile(temporary, contents, { mode: 0o600 });
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
    attachMetadata(state, {
      expectedFingerprint: fingerprint(contents),
      originalContents: contents,
      originalVersion: currentVersion,
    });
  } finally {
    try {
      await lockHandle.close();
    } finally {
      await rm(lockPath, { force: true });
    }
  }
}

async function resetJsonState({ target }) {
  const directory = path.dirname(target);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lockPath = `${target}.lock`;
  const lockHandle = await acquireLock(lockPath);
  try {
    await rm(target, { force: true });
    await rm(path.join(directory, "backups"), {
      recursive: true,
      force: true,
    });
  } finally {
    try {
      await lockHandle.close();
    } finally {
      await rm(lockPath, { force: true });
    }
  }
}

export {
  StateConflictError,
  loadJsonState,
  resetJsonState,
  saveJsonState,
};
