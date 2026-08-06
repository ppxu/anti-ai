# Security Policy

## Supported versions

Security fixes are applied to the latest published version.
The supported runtime is Node.js 22 or newer.

## Reporting a vulnerability

Use GitHub private vulnerability reporting for `ppxu/anti-ai`. Do not open a public issue for a vulnerability that could expose local files, prompts, responses, identifiers, or credentials.

Include only the minimum reproduction needed. Redact all local AI logs and use synthetic fixtures whenever possible.

## Privacy boundary

`anti-ai` scans local JSONL files and keeps only usage metadata needed for aggregation. It does not upload logs, create a usage database, or start a background process.

SQLite support is optional and lazy-loaded. A missing or incompatible native driver does not prevent JSONL sources from running.

Creature schema and its state envelope are validated before use. Future schemas are rejected, migrations keep an exact local backup under `~/.anti-ai/backups/`, and stale concurrent writes are cancelled instead of overwriting newer state. Backups contain the same privacy-safe derived data as the main Creature file and should still be treated as personal local files. An explicit `anti-ai creature reset` removes both the current state and these backups.

Containment incidents persist only stable IDs, dates, discrete experience thresholds, privacy-safe trigger summaries, response dispositions, and event-chain references. They store no exact Token totals, requests, model/source names, prompts, responses, paths, or per-request timestamps. Inspecting an incident is read-only; only an explicit CLI choice or confirmed TUI action seals a response.

Containment Expeditions persist only stable destination, event-plan, revealed-event, choice, effect, artifact, achievement, status, sequence, experience-day, date, and derived local hash fields. Public JSON and SVG output omit unopened event plans and internal plan hashes. Historical views exclude later runs. Starting, advancing, choosing, and abandoning require an explicit CLI action or confirmed TUI preview; Token volume does not affect opportunity count, event sequence, or collection odds.

Opening, navigating, inspecting the containment archive or collection provenance, replaying, previewing a share card, or cancelling inside `anti-ai tui` does not scan Agent records or write state. A share preview is rendered in memory from an already settled day; confirmation creates one new local SVG with exclusive-create semantics, never overwrites an existing file, and never changes gameplay state. Entering the daily-settlement impact preview may scan supported usage metadata, but it still does not write. Consequence Cabinet changes and the once-per-settled-day Observation and Contact actions write only stable collection, target, and reaction IDs after explicit confirmation; they grant no numeric reward. Every gameplay write goes through the shared application service and the same validated, atomic, optimistic-concurrency state store as the CLI. Ink and React are bundled locally; the console makes no network request and starts no background service.
