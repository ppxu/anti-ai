import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-package-"));
const npmCli = process.env.npm_execpath;

if (!npmCli) throw new Error("npm_execpath is required for package verification");

function npm(args, cwd) {
  return execFileSync(process.execPath, [npmCli, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_registry: "https://registry.npmjs.org/",
    },
  });
}

try {
  const packResult = JSON.parse(
    npm(
      ["pack", "--ignore-scripts", "--json", "--pack-destination", workspace],
      projectRoot,
    ),
  );
  const tarball = path.join(workspace, packResult[0].filename);
  writeFileSync(
    path.join(workspace, "package.json"),
    `${JSON.stringify({ private: true }, null, 2)}\n`,
  );
  npm(
    [
      "install",
      tarball,
      "--omit=optional",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    workspace,
  );

  const packageJson = JSON.parse(
    readFileSync(path.join(projectRoot, "package.json"), "utf8"),
  );
  if (Object.keys(packageJson.dependencies ?? {}).length > 0) {
    throw new Error("Published package must keep zero required dependencies");
  }
  const installedPackage = path.join(
    workspace,
    "node_modules",
    ...packageJson.name.split("/"),
  );
  if (!existsSync(path.join(installedPackage, "dist", "tui.mjs"))) {
    throw new Error("Packed CLI is missing the bundled TUI runtime");
  }
  if (
    !existsSync(
      path.join(installedPackage, "dist", "THIRD_PARTY_NOTICES.txt"),
    )
  ) {
    throw new Error("Packed CLI is missing TUI third-party notices");
  }
  const cli = path.join(
    installedPackage,
    "bin",
    "anti-ai.mjs",
  );
  const version = execFileSync(process.execPath, [cli, "--version"], {
    cwd: workspace,
    encoding: "utf8",
  }).trim();
  if (version !== `anti-ai ${packageJson.version}`) {
    throw new Error(`Unexpected packed CLI version: ${version}`);
  }

  const report = JSON.parse(
    execFileSync(
      process.execPath,
      [
        cli,
        "today",
        "--date",
        "2026-07-23",
        "--source",
        "codex",
        "--json",
      ],
      {
        cwd: workspace,
        encoding: "utf8",
        env: {
          ...process.env,
          HOME: path.join(workspace, "home"),
          ANTI_AI_CODEX_DIR: path.join(workspace, "missing-codex"),
        },
      },
    ),
  );
  if (report.totals.totalTokens !== 0) {
    throw new Error("Packed CLI returned unexpected usage");
  }

  const tuiHelp = execFileSync(
    process.execPath,
    [cli, "tui", "--help", "--lang", "en"],
    { cwd: workspace, encoding: "utf8" },
  );
  if (!tuiHelp.includes("Usage: anti-ai tui [options]")) {
    throw new Error("Packed CLI is missing TUI command help");
  }
  const pipedTui = spawnSync(process.execPath, [cli, "tui", "--lang", "en"], {
    cwd: workspace,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: path.join(workspace, "home"),
    },
  });
  if (
    pipedTui.status !== 2 ||
    !pipedTui.stderr.includes("requires an interactive terminal")
  ) {
    throw new Error("Packed TUI did not fail safely outside a terminal");
  }

  process.stdout.write(
    `Verified ${packResult[0].filename} without optional native dependencies.\n`,
  );
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
