# Living Containment Habitat

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

The default view is the selected single-screen layout: a Living Habitat scene surrounds the specimen and companion, while the lower file keeps the relationship diagnosis, joint symptom, latest ecological incident, and next seven-day observation point. `--full` expands the sealed event history.

## Fifteen living scenes

The shared scene model has 15 deterministic archetypes, balanced five per Pollution, Clarity, and Paradox. Each archetype contributes a three-line ASCII environment, a chamber climate, and two bilingual satirical bulletins, for 30 bulletins in total. Four deterministic chamber cycles add inspection, feeding, maintenance, or lights-out context.

Every view layers the same information in the same order:

1. environment archetype and chamber climate;
2. specimen pose derived from the selected day's discrete usage band;
3. current relationship and active companion, or a solitary bay;
4. one latest existing trace from same-day interaction, Expedition activity, containment incident, companion bond, culture, case, or seven-day ecological event.

The most recent date wins; same-day trace types use a fixed priority so repeated views cannot reorder or reroll the result. This model is shared by terminal output, stable JSON, the TUI Habitat area, and the Habitat SVG card. The TUI adds only low-frequency route-aware weather glyph changes. `--no-motion` preserves the exact static scene.

## Read-only snapshots

`creature habitat`, its JSON output, and `share --card habitat` are read-only. They may scan local usage metadata in memory to derive the selected day's current Creature snapshot, but they never:

- create, migrate, settle, or rewrite `~/.anti-ai/creature.json`;
- award experience, abilities, companion imprints, achievements, or rarity;
- consume cultures, fossils, specimens, or case slices;
- record view counts or create a check-in streak.

If the file has not hatched or no culture is bonded, the habitat still renders an empty companion bay and points to `anti-ai lab shelf`.

The separate visitor bay may also be empty. Use `anti-ai encounter visitors` or press `v` in the TUI Habitat to open the local intake desk.

## One event per seven experience days

The habitat derives at most one event at experience days 7, 14, 21, and so on. A settled calendar day remains the only clock; Token volume cannot move the interval forward.

Each event uses:

- the seven discrete daily Ecology gains in that interval;
- the active companion route visible at the event date;
- the local Creature seed;
- derived collection counts already present in the private file.

The result is deterministic. Repeating the command, changing language, resizing the terminal, or using more Tokens after the event cannot reroll it.

The current catalog contains 30 events in equal pools:

| Route | Events | Meaning |
|---|---:|---|
| Pollution | 10 | appetite, waste heat, cache remains, request proliferation, and organizational contamination |
| Clarity | 10 | refusal, manual control, low-power shelter, AI-free recovery, and quiet-system reclamation |
| Paradox | 10 | mixed evidence, recursive custody, double exposure, compliant failure, and contradictory care |

Events are narrative and visual. They add no power, score, reward, rare-event boost, or growth speed.

## Relationships and duo titles

When a companion is active, the current Creature Ecology, companion route, and cohabitation milestones derive one of 24 relationship diagnoses:

- eight Pollution relationships;
- eight Clarity relationships;
- eight Paradox relationships.

The diagnosis may change as cohabitation crosses 7, 21, and 42 observed days. It has no affection meter and cannot be farmed through feeding or repeated inspection.

Each relationship also selects one of 36 route-balanced duo titles and a joint symptom. These labels change presentation only; they do not modify either organism.

## Optional visitor bay

A saved foreign encounter can occupy one additional visitor bay without replacing the active companion:

```bash
anti-ai encounter visitors
anti-ai encounter host <foreign-specimen-id>
anti-ai encounter release
```

In the TUI Habitat, press `v` to paste and preview an AA1 code, browse the Visitor Archive, host one saved visitor, or release the current stay. The intake preview is read-only; saving, hosting, and release each require explicit input.

The active stay adds one route-balanced cohabitation diagnosis, visitor bulletin, and joint exhibit to terminal, JSON, TUI, and Habitat SVG views. Intake, Settled, and Resident presentation stages advance by natural date. Repeated viewing, Token volume, language, and terminal motion cannot reroll or accelerate them. See [Local Visitor Stays](./visitors.md).

## Scenery and Codex

The latest unique incidents leave up to four visible traces selected from 24 decorations. The pools are balanced across Pollution, Clarity, and Paradox and include waste-heat pipes, clarity moss, cache bone piles, manual switches, mirrored dishes, recursive cable nests, and their v2 proliferations.

All 30 habitat phenomena are fixed Codex entries. With Expeditions, the fixed denominator is now 134:

```text
16 form families
+ 36 achievements
+ 12 chromatic abilities
+ 4 generation scars
+ 30 habitat phenomena
+ 24 expedition artifacts
+ 12 expedition achievements
= 134 fixed entries
```

A phenomenon becomes discovered on the date its corresponding seven-day event is first derived. Locked entries remain `???`.

## Consequence Cabinet and light contact

The TUI Codex can place up to three already-discovered entries in the Habitat's Consequence Cabinet. Category browsing, entry details, locked silhouettes, and cancellation are read-only; pressing `d` on a discovered detail opens a separate impact preview, and only explicit confirmation changes the display. The cabinet stores stable collection keys and changes terminal/TUI/Habitat-card presentation only.

In Habitat, `o` records one deterministic Observation and `c` records one restrained Contact per settled day. Available targets reflect the specimen, bonded companion, lighting, and displayed collection context. The local seed, date, interaction kind, and target fix the response, so reopening cannot reroll it. Observation and Contact add no experience, abilities, Ecology, rarity, score, reward, or missed-day pressure.

## Period reports and sharing

- `today` adds one current habitat observation.
- `week` and `month` show the current relationship, events sealed in the period, and new scenery without duplicating the full chamber.
- `share --card habitat` prints a 1200×630 SVG containing the same scene name, climate, bulletin, specimen/companion bays, optional visitor diagnosis and exhibit, displayed Cabinet or scenery, and recent trace.

The card is written only to stdout. It omits exact Tokens, requests, source/model names, paths, prompts, responses, tool calls, and local record names.

## Product guardrail

Pollution, Clarity, and Paradox have equal scene, bulletin, event, and visitor-cohabitation pools. Heavy use, restrained use, and AI-free days can create different stories, but they all advance the event clock at the same rate. The habitat has no server, account, background process, leaderboard, combat, daily task, missed-day penalty, consumable item, or paid reroll.
