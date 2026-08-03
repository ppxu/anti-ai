# Containment Habitat

[简体中文](./habitat.zh-CN.md)

The Containment Habitat combines the current Reactor Kaiju, active symbiotic companion, and already-derived collection history into one local ASCII scene. It creates relationships and incidents from existing growth instead of adding another power system.

## Commands

```bash
anti-ai creature habitat
anti-ai creature habitat --full
anti-ai creature habitat --json

anti-ai share --card habitat > anti-ai-habitat.svg
```

Use `anti-ai help creature habitat` for focused help.

The default view is the selected single-screen layout: specimen and companion share one chamber, recent collection traces become scenery, and the lower file shows the relationship diagnosis, joint symptom, latest incident, and next seven-day observation point. `--full` expands the sealed event history.

## Read-only snapshots

`creature habitat`, its JSON output, and `share --card habitat` are read-only. They may scan local usage metadata in memory to derive the selected day's current Creature snapshot, but they never:

- create, migrate, settle, or rewrite `~/.anti-ai/creature.json`;
- award experience, abilities, companion imprints, achievements, or rarity;
- consume cultures, fossils, specimens, or case slices;
- record view counts or create a check-in streak.

If the file has not hatched or no culture is bonded, the habitat still renders an empty companion bay and points to `anti-ai lab shelf`.

## One event per seven experience days

The habitat derives at most one event at experience days 7, 14, 21, and so on. A settled calendar day remains the only clock; Token volume cannot move the interval forward.

Each event uses:

- the seven discrete daily Ecology gains in that interval;
- the active companion route visible at the event date;
- the local Creature seed;
- derived collection counts already present in the private file.

The result is deterministic. Repeating the command, changing language, resizing the terminal, or using more Tokens after the event cannot reroll it.

The first catalog contains 18 events in equal pools:

| Route | Events | Meaning |
|---|---:|---|
| Pollution | 6 | appetite, waste heat, cache remains, and request proliferation |
| Clarity | 6 | refusal, manual control, low-power shelter, and AI-free recovery |
| Paradox | 6 | mixed evidence, recursive custody, double exposure, and compliant failure |

Events are narrative and visual. They add no power, score, reward, rare-event boost, or growth speed.

## Relationships and duo titles

When a companion is active, the current Creature Ecology, companion route, and cohabitation milestones derive one of 12 relationship diagnoses:

- four Pollution relationships;
- four Clarity relationships;
- four Paradox relationships.

The diagnosis may change as cohabitation crosses 7, 21, and 42 observed days. It has no affection meter and cannot be farmed through feeding or repeated inspection.

Each relationship also selects one of 18 route-balanced duo titles and a joint symptom. These labels change presentation only; they do not modify either organism.

## Scenery and Codex

The latest unique incidents leave up to four visible traces selected from 12 decorations. The pools are balanced across Pollution, Clarity, and Paradox and include waste-heat pipes, clarity moss, cache bone piles, manual switches, mirrored dishes, and recursive cable nests.

All 18 habitat phenomena are fixed Codex entries. The fixed denominator is now 68:

```text
16 form families
+ 24 achievements
+ 6 chromatic abilities
+ 4 generation scars
+ 18 habitat phenomena
= 68 fixed entries
```

A phenomenon becomes discovered on the date its corresponding seven-day event is first derived. Locked entries remain `???`.

## Consequence Cabinet and light contact

The TUI Codex can place up to three already-discovered entries in the Habitat's Consequence Cabinet. Category browsing, entry details, locked silhouettes, and cancellation are read-only; pressing `d` on a discovered detail opens a separate impact preview, and only explicit confirmation changes the display. The cabinet stores stable collection keys and changes terminal/TUI/Habitat-card presentation only.

In Habitat, `o` records one deterministic Observation and `c` records one restrained Contact per settled day. Available targets reflect the specimen, bonded companion, lighting, and displayed collection context. The local seed, date, interaction kind, and target fix the response, so reopening cannot reroll it. Observation and Contact add no experience, abilities, Ecology, rarity, score, reward, or missed-day pressure.

## Period reports and sharing

- `today` adds one current habitat observation.
- `week` and `month` show the current relationship, events sealed in the period, and new scenery without duplicating the full chamber.
- `share --card habitat` prints a 1200×630 SVG containing the two bays, current diagnosis, displayed Cabinet when occupied, or scenery when it is empty, plus the latest incident.

The card is written only to stdout. It omits exact Tokens, requests, source/model names, paths, prompts, responses, tool calls, and local record names.

## Product guardrail

Pollution, Clarity, and Paradox have equal content pools. Heavy use, restrained use, and AI-free days can create different stories, but they all advance the event clock at the same rate. The habitat has no server, account, background process, leaderboard, combat, daily task, missed-day penalty, consumable item, or paid reroll.
