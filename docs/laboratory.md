# Pollution Laboratory

[简体中文](./laboratory.zh-CN.md)

The Pollution Laboratory turns existing derived collections into a local choice-and-display loop. Formula generation and incubation do not scan Agent logs, consume materials, or reward more Token use. Companion observation may settle an unseen date through the same local usage-metadata accounting as `creature`; conversation content is never read.

## Commands

```bash
anti-ai lab
anti-ai lab --json

anti-ai lab incubate <1|2|3>
anti-ai lab incubate <1|2|3> --json

anti-ai lab shelf
anti-ai lab shelf --full
anti-ai lab shelf --json

anti-ai lab inspect <culture-id>
anti-ai lab inspect <culture-id> --json

anti-ai lab bond <culture-id>
anti-ai lab companion
anti-ai lab companion --full
anti-ai lab companion --json

anti-ai share --card culture
anti-ai share --card culture --id <culture-id>
anti-ai share --card companion
```

Use `anti-ai help lab`, `anti-ai help lab incubate`, `anti-ai help lab shelf`, `anti-ai help lab inspect`, `anti-ai help lab bond`, or `anti-ai help lab companion` for focused help.

## Interactive console

The human-only `anti-ai tui` exposes the same main Laboratory workflow without requiring a return to the shell. Press `3` to open Laboratory. Its progress strip identifies the first unmet step in material → culture → companion intake. `Tab` switches between stable formulas and the complete culture shelf, arrow keys select an item, and `Enter` either opens incubation preview or a read-only culture file. Press `b` on a shelf item to preview bonding or switching the active companion; every write still requires explicit confirmation.

An empty Habitat companion bay links back to Laboratory with `l`. If a culture has already been sealed, `b` opens the bond picker directly from Habitat. Pollution-code exchange remains an explicit `anti-ai encounter <pollution-code> --save` command because the TUI does not accept free-form visitor codes. This is navigation over existing actions, not a second growth or reward system.

## Derived materials

The laboratory accepts three types of material already present in the private mutation file:

- a foreign specimen explicitly bottled with `encounter --save`;
- a permanent fossil sealed after a 90-experience-day generation;
- a case slice created by `creature intervene <1|2|3>`.

Materials are references. Incubation never deletes or consumes a specimen, fossil, or case slice. If only one material category is available, formulas combine it with a self-tissue reference. With two categories, formulas combine one item from each. With all three categories, two formulas use cross-category pairs and the third uses all three materials.

No material means no formulas. The laboratory prints the commands that can create eligible derived material instead of offering an empty daily task.

## Stable formula batches

Each batch contains three formulas. Their IDs, material selection, culture type, Ecology, pathology, complication, side effect, rarity, and ASCII appearance are derived from:

```text
local creature seed + laboratory batch + formula slot + sorted material IDs
```

The selected date, language, terminal width, repeated inspection, and current Token total do not reroll a batch. Incubating slot 1, 2, or 3 seals that result and advances the local batch counter. The other two formulas are not stored.

There is no network randomness, countdown, daily free attempt, missed-day punishment, or pay-to-reroll mechanism.

## Culture results

The first release combines:

- 10 culture types;
- 3 Ecology directions;
- 4 pathologies;
- 10 complications;
- 10 side effects;
- a deterministic dish ASCII and 12-character appearance fingerprint.

Rarity depends on material-category diversity plus one deterministic local roll:

| Material diversity | Result |
|---|---|
| Three derived categories | Epic, with about a 7% Mythic branch |
| Two derived categories | Rare, with a 12.5% Epic branch |
| One derived category + self tissue | Common, Uncommon, or Rare |

These percentages describe the fixed hash partition, not an online probability service. Token volume, creature abilities, Malignancy, and repeated command execution cannot improve the roll.

## Shelf, Codex, and cards

`lab shelf` shows the six most recently sealed cultures. `--full` displays the complete local shelf; JSON always returns the complete machine-readable list. `lab inspect` shows one culture's materials, dish ASCII, diagnosis, complication, and side effect.

Sealed cultures also appear in `anti-ai codex` with their stable ID, type, rarity, discovery date, ingredient categories, and appearance fingerprint. They do not change the fixed 98-entry Codex denominator.

`share --card culture` prints a 1200×630 SVG for the latest culture. `--id` selects another culture. The SVG is written to stdout and is never uploaded.

## Symbiotic companions

`lab bond <culture-id>` turns one sealed culture into the active companion. Switching later preserves every former companion and its growth; the same observed date can never award two imprints.

The companion advances exactly once per observed day. Heavy, restrained, and AI-free days grow at the same rate while shaping Pollution, Clarity, or neutral imprints. It reaches PARASITIC HATCHLING at day 1, SYMBIOTIC ABERRATION at day 7, and ACCOMPLICE ORGAN at day 21. The latter two milestones seal deterministic route-specific anomalies and reshape its ASCII body.

Use `lab companion` for the current file, `--full` for its stable fingerprint and privacy note, and `share --card companion` for a privacy-safe SVG. See [Symbiotic Companions](./companions.md) for the complete route, switching, appearance, and migration rules.

## Growth guardrails

A culture or companion does not change:

- experience days or life stage;
- Pollution, Clarity, pathology, or the main creature's appearance;
- regular abilities, Malignancy ranks, talents, or chromatic abilities;
- achievement progress, evolution chance, or case timing;
- combat power, score, Token rewards, or resource estimates.

The laboratory is a collection and narrative system. More Token use is not a shortcut; foreign exchange, neutral experience days, explicit case choices, and existing local history provide independent inputs. A bonded culture can develop its own companion narrative and appearance, but this never changes the main creature's numeric state.

## State and privacy

Creature state uses schema v13. The Laboratory v2 section stores only:

- a laboratory format version and next batch number;
- stable culture and material IDs;
- sealed date and batch;
- discrete culture, Ecology, pathology, complication, side-effect, and rarity IDs;
- derived ASCII lines and appearance fingerprint.
- the active culture ID and privacy-safe bond history;
- one discrete companion imprint per observed date and sealed anomaly IDs.

Schema v1–v12 files migrate sequentially and idempotently by preserving or adding missing indexes and freezing legacy content as v1. Migration never invents past experiments, bonds, imprints, anomalies, incidents, displays, or interactions.

The state, JSON output, Codex entry, culture card, and companion card omit exact Tokens, request counts, model and Agent names, prompts, responses, tool calls, local paths, personal baselines, and request timestamps. Everything stays in `~/.anti-ai/creature.json`.
