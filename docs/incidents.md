# Containment Incidents

English | [简体中文](./incidents.zh-CN.md)

Containment Incidents add delayed, branching local events to the mutation creature. They are narrative consequences, not quests, combat encounters, or Token-powered rewards.

## Commands

```bash
anti-ai creature incident
anti-ai creature incident <1|2|3>
anti-ai creature incident --json
anti-ai creature history
anti-ai codex
```

Use `anti-ai help creature incident` for focused bilingual help. A person can also inspect, cancel, and explicitly confirm a response from the `anti-ai tui` action center.

## Cadence and guardrails

After hatching, at most one incident is offered every 7 experience days. One settled calendar day is always one experience day, so heavy use, restrained use, and AI-free days advance the cadence at exactly the same rate.

Only one incident may be pending or waiting for aftermath. Leaving it unanswered creates no backlog, expiry, missed reward, or daily check-in pressure. Reopening a command, changing language, or using the TUI cannot reroll an incident.

Incident responses never add abilities, experience, Ecology, rarity, scores, or Token rewards. They only shape the local event chain, disposition counts, history, and collected incident reports.

## Incident pool

Version 2.5 includes 12 deterministic skeletons:

- one universal habitat incident;
- four pathology incidents for Context, Cache, Frenzy, and Nuclear forms;
- two Ecology incidents for Lucid and Paradox forms;
- one companion incident when a culture is bonded;
- one fossil incident after a permanent fossil exists;
- three response-specific follow-ups.

The local seed, date, experience day, current pathology/Ecology, and existing derived collection context select the incident. No model call or network request is involved.

## Responses and delayed aftermath

Every incident presents the same three visible stances, each with a benefit and a cost:

1. **Emergency Quarantine** — restores short-term boundaries but leaves permanent distance.
2. **Continue Observation** — preserves a complete record but lets uncertainty keep roaming.
3. **Allow Resonance** — enables shared adaptation but further blurs the host boundary.

Inspecting does not choose. Only an explicit `anti-ai creature incident <1|2|3>` command or confirmed TUI action seals a response. A sealed response cannot be rewritten.

The aftermath remains hidden until 3 more experience days have settled. It then becomes a permanent incident report. A root incident can open one deterministic response-specific follow-up; after that second chapter resolves, the next eligible incident starts a new chain.

## History, reports, and codex

`anti-ai creature` surfaces the current pending, waiting, or resolved incident. `creature history` records the offer, sealed response, and revealed aftermath. Complete-source `week` and `month` reports count newly discovered incident reports. `anti-ai codex` stores them as unlimited private dynamic entries without changing the fixed 68-entry denominator.

## State and privacy

Creature schema v12 stores only stable incident, stance, aftermath, actor, target, chain, and trigger-summary IDs; offer/selection/resolution dates; experience-day thresholds; aggregate disposition counts; up to three displayed collection keys; and daily observe/contact target and reaction IDs. It does not store prompts, responses, paths, model names, exact Tokens, request counts, or per-request timestamps.

Schema v1–v11 files migrate sequentially and idempotently by adding empty incident and consequence-cabinet indexes. Migration does not invent past incidents, responses, aftermaths, disposition history, displays, or interactions. Everything remains in `~/.anti-ai/creature.json`; there is no account, server, upload, leaderboard, or background process.
