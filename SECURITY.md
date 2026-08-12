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

Containment Expeditions persist only stable destination, event-plan, revealed-event, choice, effect, artifact, achievement, status, sequence, experience-day, date, and derived local hash fields. Public JSON and SVG output omit unopened event plans and internal plan hashes. Historical views exclude later runs. Daily eligibility is derived from the requested local calendar date and existing Expedition dates, not from exact usage or settlement. Starting, advancing, choosing, and abandoning require an explicit CLI action or focused TUI input. In the TUI, the selected destination or branch plus `Enter` confirms start, advance, and branch writes directly; an in-flight lock rejects repeated input, while abandonment retains a separate preview-confirm step. Token volume does not affect opportunity count, event sequence, or collection odds.

Mutation Chronicle, generation comparison, twelve Pathology Constellations, their concealed Legendary reveal, and Collection Mutations are calculated in memory from Creature and Codex records. An explicit CLI snapshot may scan supported usage metadata to derive missing dates, but it never reads conversation content or persists the result. These views add no state or action. Collection Mutations alter only rendered crown/exoskeleton glyphs; they do not alter the base appearance fingerprint, pollution code, stats, probability, or collection denominator. The dossier SVG and Chronicle JSON omit exact Tokens, requests, source/model names, prompts, responses, tool calls, local paths, per-request timestamps, unopened Expedition plans, and internal hashes. Concealed human views expose broad evidence domains rather than exact requirements. Historical dates exclude later discoveries and runs.

The Daily Containment Broadcast is another in-memory projection over an already-derived daily archive record, Chronicle diagnosis, Living Habitat scene, collection changes, and action availability. Its priority order is deterministic, recommends at most one existing action, and creates no read receipt or daily state. An explicit CLI export may derive the selected date in memory without persisting that settlement. The `briefing` SVG omits exact Tokens, requests, model/source names, prompts, responses, tool calls, paths, per-request timestamps, and internal hashes; a date with neither a settled nor an explicitly derived snapshot is never presented as a completed public broadcast.

Living Habitat scenes are derived in memory from the local seed, selected date, stable route/stage/relationship IDs, and already-persisted interaction, Expedition, incident, bond, culture, case, and ecological-event references. The scene object stores no log text and adds no persistent state. Terminal, TUI, JSON, and Habitat SVG adapters share this model; public output still omits exact Tokens, requests, model/source names, prompts, responses, paths, and per-request timestamps.

Opening, navigating, inspecting the containment archive or collection provenance, replaying, previewing a share card, or cancelling inside `anti-ai tui` does not scan Agent records or write state. A share preview is rendered in memory from an already settled day and selects the launch directory or, when it is not writable, `~/.anti-ai/exports` without creating either target. Confirmation creates the selected directory when needed and one new local SVG with exclusive-create semantics, never overwrites an existing file, and never changes gameplay state. Known filesystem errors disclose only an actionable localized category and the intended output path. Entering the daily-settlement impact preview may scan supported usage metadata, but it still does not write. Consequence Cabinet changes and the once-per-settled-day Observation and Contact actions write only stable collection, target, and reaction IDs after explicit confirmation; they grant no numeric reward. Every gameplay write goes through the shared application service and the same validated, atomic, optimistic-concurrency state store as the CLI. Ink and React are bundled locally; the console makes no network request and starts no background service.
