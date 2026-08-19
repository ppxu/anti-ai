#!/usr/bin/env node

import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { pathToFileURL } from "node:url";

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/u;
const ITEM_PATTERN = /<item\b[^>]*>[\s\S]*?<\/item>/gu;

function readFeed(file, label) {
  const feed = readFileSync(file, "utf8");
  if (/<!DOCTYPE/iu.test(feed)) {
    throw new Error(`${label} appcast must not contain a DOCTYPE`);
  }
  if (!/<rss\b/iu.test(feed) || !/<channel\b/iu.test(feed)) {
    throw new Error(`${label} appcast is not an RSS channel`);
  }
  return feed;
}

function itemVersion(item) {
  return item.match(
    /<sparkle:shortVersionString>([^<]+)<\/sparkle:shortVersionString>/u,
  )?.[1] ?? null;
}

function validateItem(item, label) {
  const version = itemVersion(item);
  if (!version || !VERSION_PATTERN.test(version)) {
    throw new Error(`${label} item has no valid short version`);
  }
  if (!/sparkle:edSignature="[^"]+"/u.test(item)) {
    throw new Error(`${label} ${version} item has no Ed25519 signature`);
  }
  const enclosure = item.match(/<enclosure\b[^>]*\burl="([^"]+)"/u)?.[1];
  if (!enclosure?.startsWith("https://")) {
    throw new Error(`${label} ${version} item has no HTTPS enclosure`);
  }
  return version;
}

function feedItems(feed, label) {
  return [...feed.matchAll(ITEM_PATTERN)].map((match) => {
    const item = match[0];
    return { item, version: validateItem(item, label) };
  });
}

function mergeAppcasts({
  currentPath,
  previousPath = null,
  outputPath,
  currentVersion,
  maximumVersions = 3,
}) {
  if (!VERSION_PATTERN.test(currentVersion)) {
    throw new Error("current version must use X.Y.Z");
  }
  if (!Number.isInteger(maximumVersions) || maximumVersions < 1) {
    throw new Error("maximum versions must be a positive integer");
  }

  const currentFeed = readFeed(currentPath, "current");
  const currentItems = feedItems(currentFeed, "current");
  if (currentItems.length !== 1) {
    throw new Error("isolated current appcast must contain exactly one item");
  }
  if (currentItems[0].version !== currentVersion) {
    throw new Error(
      `current appcast version ${currentItems[0].version} does not match ${currentVersion}`,
    );
  }

  const historicalItems =
    previousPath && existsSync(previousPath)
      ? feedItems(readFeed(previousPath, "previous"), "previous")
      : [];
  const selected = [currentItems[0]];
  const versions = new Set([currentVersion]);
  for (const entry of historicalItems) {
    if (versions.has(entry.version)) continue;
    selected.push(entry);
    versions.add(entry.version);
    if (selected.length >= maximumVersions) break;
  }

  const currentMatch = currentFeed.match(ITEM_PATTERN);
  const currentItem = currentMatch[0];
  const currentIndex = currentFeed.indexOf(currentItem);
  const prefix = currentFeed.slice(0, currentIndex);
  const suffix = currentFeed.slice(currentIndex + currentItem.length);
  const indentation = prefix.match(/(?:^|\n)([ \t]*)$/u)?.[1] ?? "";
  const merged = `${prefix}${selected
    .map(({ item }) => item)
    .join(`\n${indentation}`)}${suffix}`;
  const temporaryPath = `${outputPath}.tmp-${process.pid}`;
  try {
    writeFileSync(temporaryPath, merged);
    renameSync(temporaryPath, outputPath);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
  return { versions: selected.map(({ version }) => version) };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : null;
if (invokedPath === import.meta.url) {
  const [
    currentPath,
    previousPath,
    outputPath,
    currentVersion,
    maximumVersions = "3",
  ] = process.argv.slice(2);
  try {
    if (!currentPath || !previousPath || !outputPath || !currentVersion) {
      throw new Error(
        "usage: merge-appcast.mjs <current> <previous|-> <output> <version> [maximum]",
      );
    }
    const result = mergeAppcasts({
      currentPath,
      previousPath: previousPath === "-" ? null : previousPath,
      outputPath,
      currentVersion,
      maximumVersions: Number(maximumVersions),
    });
    process.stdout.write(`appcast_versions=${result.versions.join(",")}\n`);
  } catch (error) {
    process.stderr.write(`appcast merge failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

export { mergeAppcasts };
