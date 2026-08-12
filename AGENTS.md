# Agent Guide

This file defines the repository-specific contract for coding agents working on `anti-ai`.

## Product boundary

`anti-ai` is a local-first, satirical CLI that turns supported coding-agent usage metadata into resource receipts and a mutation-creature game.

Preserve these product rules:

- Keep the project local, lightweight, deterministic, and privacy-safe.
- Do not add accounts, servers, telemetry, background processes, rankings, combat power, or raw-log uploads.
- Do not make higher Token consumption the only or preferred upgrade path. Heavy use, restrained use, and AI-free days must remain independently meaningful.
- Keep exact local Token accounting separate from environmental estimates. Resource values are named public references, never measured local consumption.

## Runtime constraints

- Support Node.js 22 or newer using ESM.
- Keep required runtime dependencies at zero.
- Native source adapters must be optional, lazy-loaded, read-only, and safely degradable.
- Stream JSONL inputs; do not load complete Agent histories into memory.
- A scanner may parse a local record to reach its usage metadata, but it must never access content fields for product behavior or copy, retain, log, or render prompts, responses, tool-call bodies, project paths, or other conversation content.

## Read before editing

- [README.md](./README.md) and [README.zh-CN.md](./README.zh-CN.md)
- [Architecture Guide](./docs/architecture.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)
- The relevant gameplay guide under `docs/`

## Architecture boundaries

- `bin/anti-ai.mjs` is a minimal launcher.
- `src/registry.mjs` owns command, card, and source metadata.
- `src/scanner.mjs` is the stable source-scanning facade; isolated adapters live in `src/infrastructure/sources/`.
- `src/core/` owns dependency-light validation, date, and usage primitives.
- `src/commands/` owns command orchestration.
- `src/application/` owns presentation-neutral query and action models.
- `src/application/action-catalog.mjs` derives action availability and disabled reasons.
- `src/application/actions.mjs` owns TUI preview, confirmation, and session orchestration.
- `src/application/action-execution.mjs` owns shared CLI/TUI state mutations; command handlers must not duplicate those writes.
- `src/application/projections.mjs` owns request-local memoized query projections.
- `src/application/tui-controller.mjs` owns explicit ephemeral TUI controller state.
- `src/application/settlement.mjs` owns the settlement pipeline shared by CLI and TUI.
- `src/application/creature-casebook.mjs` owns period casebook queries; `src/chronicle.mjs` composes read-only historical and generation projections.
- `src/collection-sets.mjs` owns presentation-only, route-balanced set definitions.
- `src/collection-phenotype.mjs` owns read-only fixed-collection milestones and display-only specimen motifs; it must not alter appearance fingerprints or state.
- `src/creature/codex.mjs` owns collection projection assembly; `src/creature/state.mjs` owns Creature schema migration and persistence wiring.
- Domain modules own calculations and gameplay rules.
- `src/cli/` and `src/renderers/` own terminal and SVG presentation.
- `src/tui/app.jsx` owns input orchestration, `src/tui/screens/` owns view components, and `dist/tui.mjs` is generated and must not be edited directly.
- `src/state-store.mjs` owns validation-aware state loading, backups, locking, and atomic writes.

Avoid runtime import cycles, protected-layer inversions, and source modules over 1,500 lines; `npm run check` enforces all three. Register new public IDs centrally instead of adding duplicate allowlists.
TUI actions must call application services, never command handlers or arbitrary shell commands. Browsing and cancellation stay read-only; mutations require explicit user input. Irreversible or higher-impact actions use a confirmation screen, while focused Expedition start, advance, and branch keys may execute directly when the keypress itself is the documented confirmation.

## State invariants

`~/.anti-ai/creature.json` is the only persistent gameplay file.

- Validate state before migration or derivation.
- Add one explicit sequential migration for every schema increment.
- Never silently rewrite a future or invalid schema.
- Preserve the exact pre-migration file in the content-addressed backup directory.
- Reject stale concurrent writes instead of overwriting newer progress.
- `codex`, every `share` card, `doctor`, `explain`, Help, source-filtered reports, and `today --json` must remain read-only.
- Only `creature reset` may deliberately delete the gameplay file and migration backups; it must never delete Agent logs.

Never run a stateful command against the developer's real home directory while testing. Use a temporary `HOME` and synthetic records.

## Public CLI contract

Treat commands, options, exit codes, stdout/stderr, bilingual output, JSON fields, deterministic IDs, and privacy behavior as public API.

- Add or update a public CLI test before changing visible behavior.
- Keep `--lang zh|en` behavior aligned.
- Keep `--json` language-neutral and stable.
- Sanitize untrusted model names before terminal rendering.
- A broken source in an `all` scan must not hide healthy sources; a specifically selected broken source must fail clearly.

## Documentation contract

- Update English and Simplified Chinese documents together when they describe the same behavior.
- Keep the English `CHANGELOG.md` current.
- Update command Help and `skills/anti-ai/SKILL.md` when workflows or safety boundaries change.
- Document each resource factor with its formula, boundary, date, and primary source.
- Keep local Markdown links valid.

## Verification

Run:

```bash
npm run build:tui
npm run check
npm run test:coverage
npm run test:package
npm audit --omit=dev --audit-level=high --registry=https://registry.npmjs.org/
git diff --check
```

`npm run check` verifies that committed TUI output is fresh without rewriting it, so run `npm run build:tui` after changing TUI or bundled dependencies. `npm run verify` combines the first three project gates. Tests must use synthetic fixtures and public CLI behavior wherever practical.

## Release boundary

Do not commit, push, create a pull request, publish npm packages, create GitHub releases, or change repository rules unless the user explicitly asks.

Public releases use `anti-ai`; the company registry uses `@tant/anti-ai`. Never commit registry tokens or user-level npm configuration.
