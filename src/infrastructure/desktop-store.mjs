import { randomBytes } from "node:crypto";
import { access, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const DESKTOP_BRIDGE_VERSION = 1;
const DESKTOP_SNAPSHOT_VERSION = 1;

class DesktopStoreError extends Error {
  constructor(code, message, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = "DesktopStoreError";
    this.code = code;
  }
}

function desktopDirectory(home = os.homedir()) {
  return path.join(home, ".anti-ai", "desktop");
}

function desktopLinkPath(home = os.homedir()) {
  return path.join(desktopDirectory(home), "link-v1.json");
}

function desktopSnapshotPath(home = os.homedir()) {
  return path.join(desktopDirectory(home), "snapshot-v1.json");
}

async function readJson(target, missingCode, invalidCode) {
  let contents;
  try {
    contents = await readFile(target, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new DesktopStoreError(missingCode, `Missing desktop file: ${target}`);
    }
    throw error;
  }
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new DesktopStoreError(invalidCode, `Invalid desktop JSON: ${target}`, error);
  }
}

async function writeAtomicJson(target, value) {
  const directory = path.dirname(target);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = path.join(
    directory,
    `.desktop-${process.pid}-${randomBytes(4).toString("hex")}.tmp`,
  );
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      mode: 0o600,
    });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function validateDesktopLink(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value.version !== DESKTOP_BRIDGE_VERSION ||
    typeof value.linkedAt !== "string" ||
    !path.isAbsolute(value.nodePath ?? "") ||
    !path.isAbsolute(value.cliEntryPath ?? "")
  ) {
    throw new DesktopStoreError("bridge_invalid", "Invalid desktop bridge link");
  }
  try {
    await access(value.nodePath);
    const node = await stat(value.nodePath);
    const cli = await stat(value.cliEntryPath);
    if (!node.isFile() || (node.mode & 0o111) === 0 || !cli.isFile()) {
      throw new Error("Desktop bridge target is not executable");
    }
  } catch (error) {
    throw new DesktopStoreError("bridge_invalid", "Desktop bridge target is unavailable", error);
  }
  return value;
}

async function readDesktopLink(home = os.homedir()) {
  const value = await readJson(
    desktopLinkPath(home),
    "bridge_missing",
    "bridge_invalid",
  );
  return validateDesktopLink(value);
}

async function writeDesktopLink(value, home = os.homedir()) {
  const validated = await validateDesktopLink(value);
  await writeAtomicJson(desktopLinkPath(home), validated);
  return validated;
}

async function readDesktopSnapshot(home = os.homedir()) {
  return readJson(
    desktopSnapshotPath(home),
    "snapshot_missing",
    "snapshot_invalid",
  );
}

async function writeDesktopSnapshot(value, home = os.homedir()) {
  await writeAtomicJson(desktopSnapshotPath(home), value);
  return value;
}

async function removeDesktopSnapshot(home = os.homedir()) {
  await rm(desktopSnapshotPath(home), { force: true });
}

export {
  DESKTOP_BRIDGE_VERSION,
  DESKTOP_SNAPSHOT_VERSION,
  DesktopStoreError,
  desktopDirectory,
  desktopLinkPath,
  desktopSnapshotPath,
  readDesktopLink,
  readDesktopSnapshot,
  removeDesktopSnapshot,
  validateDesktopLink,
  writeDesktopLink,
  writeDesktopSnapshot,
};
