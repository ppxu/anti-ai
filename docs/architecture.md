# Architecture

`anti-ai` is a local-first CLI. It keeps one npm package, one optional native adapter, and one privacy-safe JSON state file. The accounting and gameplay core remains framework-free; the human-only `tui` adapter uses Ink and React compiled into one self-contained distribution artifact. The project still avoids a service, account, telemetry pipeline, or background process, and keeps required runtime dependencies at zero.

## Runtime flow

1. `bin/anti-ai.mjs` calls the exported CLI `main()`.
2. `src/registry.mjs` defines supported commands, cards, and local sources.
3. explicit report and gameplay commands continue through scanners, domain modules, and the existing terminal or SVG adapters.
4. `tui` loads a read-only application snapshot from `src/application/`, then dynamically imports the bundled Ink adapter from `dist/tui.mjs`.
5. terminal, TUI, and SVG adapters format derived results without reading raw conversation text.

Source adapters are isolated. A broken source does not hide healthy sources when scanning `all`; output receives a source ID and error code, never a local record or conversation excerpt. SQLite adapters load `better-sqlite3` only when an existing SQLite source is selected.

## State boundary

`~/.anti-ai/creature.json` remains the only persistent gameplay file. It stores discrete usage bands and derived game state, not exact Tokens, model names, prompts, responses, tool calls, or source paths.

- Human-readable full-source `today`, `week`, and `month`, plus `creature`, `encounter`, and state-changing Laboratory actions, may settle local history.
- Source-filtered reports and `today --json` are accounting-only.
- `tui`, `codex`, `creature habitat`, every `share` card, `doctor`, `explain`, and Help are read-only snapshots.
- `creature reset` is the only command that deliberately deletes the state file and its migration backups.

State loading validates the schema and root state envelope before migration. Migrations run one version at a time. The first write after migration keeps an exact content-addressed backup under `~/.anti-ai/backups/`. Writes use a temporary file, atomic rename, a short-lived lock, and an optimistic fingerprint so stale concurrent commands fail instead of overwriting newer growth.

## Extension boundaries

Add a local Agent by registering its metadata in `src/registry.mjs` and adding one adapter operation in `src/scanner.mjs`. JSONL adapters should stream records. SQLite adapters must be read-only, optional, and return empty usage when their database does not exist.

Add a command in `src/commands/` when it owns substantial orchestration. Keep parsing and allowlists in the registry/CLI layer, domain calculations in their domain module, and formatting in `src/cli/render.mjs` or `src/renderers/`.

Presentation-neutral queries belong in `src/application/`. The TUI consumes structured snapshots rather than terminal strings, and must not call state-changing command handlers. `src/application/tui-motion.mjs` owns deterministic ASCII frames, anatomy observations, rare-glitch eligibility, and event-replay scenes; it has no timer or persistence access. `src/tui/` owns ephemeral frame counters and keyboard state. Motion is capped at 4 FPS, pauses outside living screens, and can be disabled without changing the snapshot.

Ink and React stay in `devDependencies`; `scripts/build-tui.mjs` bundles them into `dist/tui.mjs`, so normal commands do not load the framework and installed packages keep zero required runtime dependencies. Edit `src/tui/`, never the generated bundle.

Creature content belongs in `src/creature/content.mjs`; appearance composition belongs in `src/creature/appearance.mjs`; growth and collection rules remain in `src/creature.mjs`. New mechanics must preserve the product guardrail: high use, restrained use, and AI-free days may shape different outcomes, but Token volume must not become the only upgrade path.

## Quality gates

- `npm test`: fast public-behavior suite.
- `npm run build:tui`: compile the self-contained Ink/React adapter.
- `npm run check`: syntax, trailing whitespace, missing relative imports, runtime import cycles, and local Markdown links.
- `npm run test:coverage`: minimum 90% lines, 90% functions, and 75% branches for `src`.
- `npm run test:package`: packs the real tarball, installs it without optional native dependencies, and runs the installed CLI.
- `npm run verify`: complete local and prepublish gate.

CI runs the complete gate on Node.js 22, 24, and 26. CodeQL and Dependabot cover source and dependency drift.
