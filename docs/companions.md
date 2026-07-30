# Symbiotic Companions

[简体中文](./companions.zh-CN.md)

Symbiotic Companions turn one sealed laboratory culture into a local sidekick whose body records *how* you used or avoided AI. They grow by observed calendar days, not by Token volume, and never grant numeric power to the main creature.

## Commands

```bash
anti-ai lab shelf
anti-ai lab bond <culture-id>

anti-ai lab companion
anti-ai lab companion --full
anti-ai lab companion --json

anti-ai share --card companion > anti-ai-companion.svg
```

Run `anti-ai help lab bond` or `anti-ai help lab companion` for focused help.

When the requested date has not yet been settled, `lab bond`, `lab companion`, and the companion share card first run the normal complete-source local usage accounting used by `creature`. This reads usage metadata only, never conversation content, and makes the companion commands work as standalone daily entry points.

## Bonding

Only an already sealed culture can become a companion. `lab bond` records the active culture and its first bond date; it does not consume the culture or remove it from the shelf.

You may switch to another culture later. Switching:

- preserves every former companion and all of its imprints;
- makes only the selected culture active from that date onward;
- cannot award two imprints on the same date;
- cannot reroll an existing anomaly or appearance.

A migrated v1–v9 file starts with no active companion. Existing cultures are never auto-bonded.

## One day, one imprint

Every observed date after bonding contributes exactly one imprint to the companion active on that date:

| Main creature day | Companion imprint | Meaning |
|---|---|---|
| Heavy use | Pollution | The companion learns appetite |
| Restrained use | Clarity | The companion learns refusal |
| AI-free day | Clarity | Refusal becomes especially visible |
| Ordinary active day | Neutral | The companion records routine exposure |

Heavy, restrained, and AI-free days grow at the **same rate**: one day is one imprint. Token volume cannot accelerate a companion.

## Stages

| Total imprints | Stage |
|---|---|
| 1–6 | PARASITIC HATCHLING |
| 7–20 | SYMBIOTIC ABERRATION |
| 21+ | ACCOMPLICE ORGAN |

The first imprint hatches the companion. Its ASCII body becomes more complex at days 7 and 21.

## Routes and anomalies

The balance of accumulated imprints determines one of three routes:

- **POLLUTION** when appetite evidence clearly leads;
- **CLARITY** when refusal evidence clearly leads;
- **PARADOX** when neither side can establish a lead.

This route is a diagnosis, not a moral score or upgrade tier. Day 7 and day 21 each seal one deterministic anomaly from the active route's pool. The culture ID, milestone, and route select the anomaly, so repeated commands, language changes, terminal width, and current Token totals cannot reroll it.

The companion's ASCII form is generated from its culture, stage, route, and sealed anomalies. Its fingerprint is stable for the same state and date.

## Where it appears

- `anti-ai creature` shows the active companion beside the main mutation.
- `today` adds a compact companion watch.
- `week` and `month` show imprint and stage movement for the period.
- `codex` keeps each bonded companion as a private dynamic entry.
- `share --card companion` prints a privacy-safe 1200×630 SVG for the active companion.

The share card is unavailable until a culture has been bonded. SVG is written only to stdout and is never uploaded.

## Growth guardrail

Companions are narrative and visual. They do not change:

- main-creature experience, life stage, Ecology, pathology, or appearance;
- abilities, Malignancy, talents, chromatic abilities, or rare-event rates;
- achievements, evolution choices, case timing, resource estimates, or scores;
- Token rewards, combat power, or growth speed.

Using more AI creates more Pollution-shaped evidence; using less AI or taking AI-free days creates more Clarity-shaped evidence. All three behaviors advance time equally.

## State and privacy

Creature state uses schema v10. The Laboratory v2 section stores only:

- the active culture ID and privacy-safe bond history;
- one discrete imprint ID per observed date;
- sealed anomaly IDs;
- the existing derived culture IDs and local deterministic seed.

It does not store exact Tokens, request counts, models, Agent names, prompts, responses, tool calls, paths, personal baselines, or per-request timestamps. Schema v1–v9 migration adds an empty companion index and does not invent bonds, imprints, or anomalies.
