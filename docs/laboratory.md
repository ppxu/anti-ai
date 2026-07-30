# Pollution Laboratory

[简体中文](./laboratory.zh-CN.md)

The Pollution Laboratory turns existing derived collections into a local choice-and-display loop. It does not read raw Agent logs, consume materials, or reward more Token use.

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

anti-ai share --card culture
anti-ai share --card culture --id <culture-id>
```

Use `anti-ai help lab`, `anti-ai help lab incubate`, `anti-ai help lab shelf`, or `anti-ai help lab inspect` for focused help.

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

- 6 culture types;
- 3 Ecology directions;
- 4 pathologies;
- 6 complications;
- 6 side effects;
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

Sealed cultures also appear in `anti-ai codex` with their stable ID, type, rarity, discovery date, ingredient categories, and appearance fingerprint. They do not change the fixed 50-entry Codex denominator.

`share --card culture` prints a 1200×630 SVG for the latest culture. `--id` selects another culture. The SVG is written to stdout and is never uploaded.

## Growth guardrails

A culture does not change:

- experience days or life stage;
- Pollution, Clarity, pathology, or the main creature's appearance;
- regular abilities, Malignancy ranks, talents, or chromatic abilities;
- achievement progress, evolution chance, or case timing;
- combat power, score, Token rewards, or resource estimates.

The laboratory is a collection and narrative system. More Token use is not a shortcut; foreign exchange, neutral experience days, explicit case choices, and existing local history provide independent inputs.

## State and privacy

Creature state uses schema v9. The `laboratory` section stores only:

- a laboratory format version and next batch number;
- stable culture and material IDs;
- sealed date and batch;
- discrete culture, Ecology, pathology, complication, side-effect, and rarity IDs;
- derived ASCII lines and appearance fingerprint.

Schema v1–v8 files migrate locally and idempotently by adding an empty laboratory. Migration never invents past experiments.

The state, JSON output, Codex entry, and culture card omit exact Tokens, request counts, model and Agent names, prompts, responses, tool calls, local paths, personal baselines, and request timestamps. Everything stays in `~/.anti-ai/creature.json`.
