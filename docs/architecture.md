# Architecture

`anti-ai` is a local-first CLI. Version 2.0 keeps one npm package, one optional native adapter, and one privacy-safe JSON state file. The project intentionally avoids a framework, service, account, telemetry pipeline, or background process.

## Runtime flow

1. `bin/anti-ai.mjs` calls the exported CLI `main()`.
2. `src/registry.mjs` defines supported commands, cards, and local sources.
3. `src/scanner.mjs` runs selected source adapters and returns usage metadata by date.
4. `src/methodology.mjs` and `src/comparisons.mjs` translate usage into named public references.
5. focused command handlers derive reports, Creature state, encounters, cultures, companions, or read-only habitats.
6. terminal and SVG renderers format the derived result without reading raw conversation text.

Source adapters are isolated. A broken source does not hide healthy sources when scanning `all`; output receives a source ID and error code, never a local record or conversation excerpt. SQLite adapters load `better-sqlite3` only when an existing SQLite source is selected.

## State boundary

`~/.anti-ai/creature.json` remains the only persistent gameplay file. It stores discrete usage bands and derived game state, not exact Tokens, model names, prompts, responses, tool calls, or source paths.

- Human-readable full-source `today`, `week`, and `month`, plus `creature`, `encounter`, and state-changing Laboratory actions, may settle local history.
- Source-filtered reports and `today --json` are accounting-only.
- `codex`, `creature habitat`, every `share` card, `doctor`, `explain`, and Help are read-only snapshots.
- `creature reset` is the only command that deliberately deletes the state file and its migration backups.

State loading validates the schema and root state envelope before migration. Migrations run one version at a time. The first write after migration keeps an exact content-addressed backup under `~/.anti-ai/backups/`. Writes use a temporary file, atomic rename, a short-lived lock, and an optimistic fingerprint so stale concurrent commands fail instead of overwriting newer growth.

## Extension boundaries

Add a local Agent by registering its metadata in `src/registry.mjs` and adding one adapter operation in `src/scanner.mjs`. JSONL adapters should stream records. SQLite adapters must be read-only, optional, and return empty usage when their database does not exist.

Add a command in `src/commands/` when it owns substantial orchestration. Keep parsing and allowlists in the registry/CLI layer, domain calculations in their domain module, and formatting in `src/cli/render.mjs` or `src/renderers/`.

Creature content belongs in `src/creature/content.mjs`; appearance composition belongs in `src/creature/appearance.mjs`; growth and collection rules remain in `src/creature.mjs`. New mechanics must preserve the product guardrail: high use, restrained use, and AI-free days may shape different outcomes, but Token volume must not become the only upgrade path.

## Quality gates

- `npm test`: fast public-behavior suite.
- `npm run check`: syntax, trailing whitespace, missing relative imports, runtime import cycles, and local Markdown links.
- `npm run test:coverage`: minimum 90% lines, 90% functions, and 75% branches for `src`.
- `npm run test:package`: packs the real tarball, installs it without optional native dependencies, and runs the installed CLI.
- `npm run verify`: complete local and prepublish gate.

CI runs the complete gate on Node.js 22, 24, and 26. CodeQL and Dependabot cover source and dependency drift.
