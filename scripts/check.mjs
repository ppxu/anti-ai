import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceRoots = ["bin", "scripts", "src", "test"];

function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(target);
    return entry.isFile() && entry.name.endsWith(".mjs") ? [target] : [];
  });
}

const files = sourceRoots
  .flatMap((directory) => javascriptFiles(path.join(projectRoot, directory)))
  .sort();

for (const file of files) {
  execFileSync(process.execPath, ["--check", file], {
    stdio: "inherit",
  });
  const lines = readFileSync(file, "utf8").split("\n");
  const trailingWhitespace = lines.findIndex((line) => /[ \t]+$/.test(line));
  if (trailingWhitespace >= 0) {
    throw new Error(
      `${path.relative(projectRoot, file)}:${trailingWhitespace + 1} has trailing whitespace`,
    );
  }
}

const runtimeFiles = files.filter((file) =>
  [path.join(projectRoot, "bin"), path.join(projectRoot, "src")].some(
    (root) => file.startsWith(`${root}${path.sep}`),
  ),
);
const runtimeSet = new Set(runtimeFiles);
const graph = new Map();
for (const file of runtimeFiles) {
  const dependencies = [
    ...readFileSync(file, "utf8").matchAll(
      /(?:from\s+|import\s*\()\s*["'](\.[^"']+)["']/g,
    ),
  ].map((match) => path.resolve(path.dirname(file), match[1]));
  for (const dependency of dependencies) {
    if (!existsSync(dependency)) {
      throw new Error(
        `${path.relative(projectRoot, file)} imports missing ${path.relative(projectRoot, dependency)}`,
      );
    }
  }
  graph.set(
    file,
    dependencies.filter((dependency) => runtimeSet.has(dependency)),
  );
}

const visiting = new Set();
const visited = new Set();
function visit(file, trail = []) {
  if (visiting.has(file)) {
    throw new Error(
      `Runtime import cycle: ${[...trail, file]
        .map((entry) => path.relative(projectRoot, entry))
        .join(" -> ")}`,
    );
  }
  if (visited.has(file)) return;
  visiting.add(file);
  for (const dependency of graph.get(file) ?? []) {
    visit(dependency, [...trail, file]);
  }
  visiting.delete(file);
  visited.add(file);
}
for (const file of runtimeFiles) visit(file);

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(target);
    return entry.isFile() && entry.name.endsWith(".md") ? [target] : [];
  });
}

const markdown = [
  ...readdirSync(projectRoot)
    .filter((name) => name.endsWith(".md"))
    .map((name) => path.join(projectRoot, name)),
  ...markdownFiles(path.join(projectRoot, "docs")),
  ...markdownFiles(path.join(projectRoot, "skills")),
];

for (const file of markdown) {
  const contents = readFileSync(file, "utf8");
  for (const match of contents.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, "").split("#")[0];
    if (
      target === "" ||
      /^(?:https?:|mailto:)/.test(target)
    ) {
      continue;
    }
    const resolved = path.resolve(path.dirname(file), target);
    if (!existsSync(resolved)) {
      throw new Error(
        `${path.relative(projectRoot, file)} links to missing ${target}`,
      );
    }
  }
}

process.stdout.write(
  `Checked ${files.length} JavaScript modules and ${markdown.length} Markdown files.\n`,
);
