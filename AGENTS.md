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
- `src/scanner.mjs` owns isolated local-source adapters.
- `src/commands/` owns command orchestration.
- `src/application/` owns presentation-neutral query and action models.
- `src/application/action-catalog.mjs` derives action availability and disabled reasons.
- `src/application/actions.mjs` owns shared preview, confirmation, execution, and session orchestration.
- `src/application/settlement.mjs` owns the settlement pipeline shared by CLI and TUI.
- Domain modules own calculations and gameplay rules.
- `src/cli/` and `src/renderers/` own terminal and SVG presentation.
- `src/tui/` owns Ink source; `dist/tui.mjs` is generated and must not be edited directly.
- `src/state-store.mjs` owns validation-aware state loading, backups, locking, and atomic writes.

Avoid runtime import cycles. Register new public IDs centrally instead of adding duplicate allowlists.
TUI actions must call application services, never command handlers or arbitrary shell commands. Browsing and cancellation stay read-only; all mutations require an explicit confirmation screen.

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

`npm run verify` combines the first three project gates. Tests must use synthetic fixtures and public CLI behavior wherever practical.

## Release boundary

Do not commit, push, create a pull request, publish npm packages, create GitHub releases, or change repository rules unless the user explicitly asks.

Public releases use `anti-ai`; the company registry uses `@tant/anti-ai`. Never commit registry tokens or user-level npm configuration.
