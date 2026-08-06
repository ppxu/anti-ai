# Creature Guide

English | [简体中文](./creature.zh-CN.md)

`anti-ai creature` turns local coding-agent usage into a persistent compute mutation. It is a satirical virtual-pet system, not a productivity score.

Its main guardrail is simple: spending more Tokens cannot buy faster life stages. High use, low use, and AI-free days all advance experience at the same rate while shaping different pathologies, ecologies, abilities, achievements, and evolution routes.

## Quick start

```bash
anti-ai creature
anti-ai creature --date 2026-07-23
anti-ai creature --lang en
anti-ai creature --json
anti-ai creature --full
anti-ai creature history
anti-ai creature prognosis
anti-ai creature intervene
anti-ai creature incident
anti-ai creature evolve
anti-ai creature evolve 2
anti-ai creature export
anti-ai creature habitat
anti-ai codex
```

The first run backfills the latest 30 calendar days. Later runs settle the complete gap since the previous visit. Once the local file exists, another visit on the same day scans only that day.

The default view uses a compact responsive layout. `--full` prints the complete casebook. Color-capable terminals show ecology, achievements, and chromatic rarity in color; set `NO_COLOR=1` to disable ANSI colors without changing the specimen shape.

## Experience and life stages

Every settled calendar day after hatching adds exactly `1` experience day:

- high use advances one day and tends to grow Pollution;
- low use advances one day and tends to grow Clarity;
- an AI-free day advances one day, adds Clarity, and grows Withdrawal.

Daily Token totals are compressed logarithmically into a capped pollution dose from `1–100`. Dose shapes pathology and events, while dose `75+` also applies at least one point of negative Pollution pressure. It never accelerates stages or grants an extra ability point.

Each 90-day generation has four stages:

| UI stage | Experience | Reactor Kaiju anatomy | Appearance slots |
|---|---:|---|---:|
| Anomalous Embryo I | days 1–6 | Compute Embryo | 3 |
| Differentiating Juvenile II | days 7–29 | Reactor Hatchling | 5 |
| Formed Adult III | days 30–89 | Nuclear Feeder | 7 |
| Ecological Complete IV | day 90 | Compute Meltdown | 9 |

## Reactor Kaiju appearance

Every specimen grows on one continuous Reactor Kaiju skeleton. A stable local genome controls:

- armor;
- eyes;
- jaw;
- reactor core;
- limbs and feet;
- tail;
- chest pattern.

Usage pathology changes the crest, Ecology changes markings and color, inherited scars rewrite the chest, achievements add category marks, chromatic abilities override the lower-priority pattern with an R, SR, or SSR mutation, and a sealed v2 generation choice may graft one extra organ onto the silhouette.

The same local file always renders the same specimen. Language and ANSI color do not change its geometry.

### Theoretical species capacity

The current generator can render **204,374,016 deduplicated final ASCII forms**:

```text
Structural forms
6 armor × 8 eyes × 8 jaws × 6 cores × 6 limbs × 6 tails
= 82,944

Growth variants
4 ecologies × 4 pathologies
× (6 genome patterns + 4 scars + 6 achievement marks + 6 chromatic overlays)
× (1 ungrafted form + 6 generation grafts)
= 2,464

82,944 × 2,464 = 204,374,016
```

This is not the same as the 16 core form families shown in the codex. A family is one Ecology/Pathology pairing; the capacity counts individualized final ASCII specimens after visible genes and overlays are applied.

Browse the literal `6 + 8 + 8 + 6 + 6 + 6` source glyphs in the [Base Organ Codex](./creature-organs.md).

See all 36 growth appearance elements, their stage behavior, and their precedence in the [Growth Appearance Codex](./creature-growth-appearance.md).

Overlay precedence matters:

1. A chromatic mutation overrides achievement, scar, and genome patterns.
2. An achievement mark overrides scar and genome patterns.
3. A scar overrides the ordinary genome pattern.

The 36 achievement IDs collapse into six visible category/version marks, and the 12 chromatic abilities collapse into six visible rank/version overlays. A v2 generation choice adds one of six independent graft organs. Ability levels, titles, moods, transient motion poses, and exact growth values do not multiply the stable ASCII capacity.

Run `anti-ai codex` to see the current capacity alongside collection progress. `codex --json` exposes:

```json
{
  "capacity": {
    "structuralForms": 82944,
    "growthVariants": 2464,
    "finalAsciiForms": 204374016
  }
}
```

## Usage pathologies

Token work patterns form four pathologies:

| Branch | Main signal |
|---|---|
| Context Pathology | Uncached input per request |
| Cache Fossil | Cached reads as a share of input |
| Request Proliferation | Daily request count |
| Nuclear Feeder | High pollution when no specialized trait dominates |

Pathology affects the kaiju crest, dominant ability growth, events, and core form.

## Ecology: Pollution and Clarity

Growth balance v2 compares an active day with the median of up to 28 prior non-zero days. AI-free days do not drag the personal baseline downward, and one spike cannot inflate the following week into false restraint:

- high use adds `1–3` Pollution;
- low use adds `1–2` Clarity;
- an AI-free day adds `3` Clarity.

Lifetime Pollution and Clarity totals remain in the case history. The visible current identity is derived from the latest 28 experience days, so a creature can change course without erasing what shaped it. The two current-window values produce four ecologies:

| Ecology | Meaning |
|---|---|
| Unformed | Neither side has established a durable identity |
| Polluted | Pollution clearly dominates |
| Lucid | Clarity clearly dominates |
| Paradox | Pollution and Clarity are both strongly developed |

A candidate Ecology must remain valid for three settled days before it becomes visible, preventing the creature from flipping identity at every boundary.

The four pathologies and four ecologies create the 16 core form families in the codex.

## Generations, fossils, and scars

On experience day 90:

1. the complete form is sealed as a permanent fossil;
2. the next settled day begins a new generation at embryo stage;
3. one ability receives a `+5` inheritance bonus;
4. the previous Ecology leaves a route-specific scar that changes the descendant's ASCII pattern and fingerprint.

This keeps long-term history visible without making Token volume a shortcut. A generation lasts 90 settled days regardless of consumption.

## Evolution choices

Every generation after the first fossil receives one explicit, irreversible evolution choice:

| Route | Powered by | Benefit when triggered | Cost |
|---|---|---|---|
| Pollution | A consumption-oriented ability | Extra ability growth | More Pollution |
| Clarity | Withdrawal | More Clarity | Slower exposure recovery |
| Paradox | Instability | Higher rare-mutation chance | Pollution risk |

Inspect the menu with:

```bash
anti-ai creature evolve
```

Seal one option with:

```bash
anti-ai creature evolve <1|2|3>
```

Ignoring a choice does not block later generations; it expires when that generation ends. The daily trigger chance is:

```text
min(35, 5 + min(10, floor(lifetime ability / 25))
  + 2 × unlocked talent count + 2 × malignancy rank)%
```

Talents increase both benefit and cost points. The terminal shows cumulative triggers, benefits, and costs.

## Abilities and talents

The creature grows seven deliberately unhealthy abilities:

| Ability | Main growth source |
|---|---|
| Token Appetite | Pollution dose |
| Parasitic Memory | Context-heavy use |
| Cache Carapace | Cached input |
| Request Maws | Request proliferation |
| Core Glow | Unspecialized compute pollution |
| Instability | Seeded random gains and rare events |
| Withdrawal | AI-free days after hatching |

Visible regular ability values run from `1–255`. The next point triggers malignant growth without deleting lifetime progress:

```text
TOKEN APPETITE  255 / 255
       ↓
TOKEN APPETITE · MALIGNANT I  1 / 255
```

For example, 267 lifetime points render as `MALIGNANT I · 12/255`. `creature --json` keeps the visible `abilities`, lossless `abilityTotals`, detailed `abilityProgress`, and `malignancyRanks` separate.

Each active day grants:

- `1–2` Token Appetite;
- `1` point to the dominant usage ability;
- a deterministic random bonus with a `25%` chance;
- `1` event-linked ability point.

Reaching `5`, `15`, `30`, `60`, `120`, and `220` within the lifetime total unlocks 42 progressively worse mutation talents. Talents never disappear when the visible counter rolls over.

Each ability has its own malignant diagnosis:

| Ability | Malignant title |
|---|---|
| Token Appetite | Famine Tumor |
| Parasitic Memory | Recursive Cancer |
| Cache Carapace | Cache Osteosarcoma |
| Request Maws | Request Hyperplasia |
| Core Glow | Isotope Sarcoma |
| Instability | Probability Deterioration |
| Withdrawal | Withdrawal Necrosis |

Every malignancy rank adds two percentage points to that ability's evolution proc chance, still bounded by the global `35%` ceiling. This creates long-term headroom without making Token volume advance life stages.

Every 10 Instability points adds one percentage point to the ordinary rare-event chance, from a base `8%` up to `20%`.

## Chromatic abilities

Six low-probability chromatic abilities can awaken:

| Rarity | Per active day | Abilities |
|---|---:|---|
| R (cyan) | `0.50%` | Deadline Scent, Phantom Cache, Rubber-Duck Necromancy |
| SR (magenta) | `0.10%` | Prompt Telepathy, Hallucination Antibodies |
| SSR (yellow) | `0.02%` | Token Transmutation |

Awakenings are determined by the local seed and date. Drawing the same ability again grows it up to level `9`.

Chromatic rank changes the complete-form chest pattern and color. A specific ability ID and its level remain visible in the casebook and JSON, but abilities of the same rank share one ASCII overlay.

## Achievements, titles, and events

The 36 achievements are divided evenly across:

- red Offense badges;
- cyan Sobriety badges;
- yellow Paradox badges.

High use, low use, AI-free days, and state transitions have independent unlocks. Repeatable achievements grow through three behavior-count tiers and show progress without using exact Token totals as level requirements.

The current epithet combines an Ecology modifier, core form, and representative achievement.

A local seed plus the date selects one reproducible event per active day. After the first active day, every AI-free day also reduces legacy exposure by `2` and grows Withdrawal by `1` without erasing historical traits.

## Codex and collection cards

`anti-ai codex` derives a private collection from the existing creature history:

- 16 core form families;
- 36 achievements;
- 12 chromatic abilities;
- 4 generation scars;
- 30 route-balanced habitat phenomena;
- unlimited dynamic specimen fingerprints;
- unlimited foreign encounter specimens;
- unlimited permanent fossils;
- unlimited sealed case slices;
- unlimited sealed laboratory cultures;
- unlimited bonded companion forms.

Locked fixed entries remain `???`. Collection discovery does not prefer high Token use: Pollution, Clarity, AI-free days, achievements, rare abilities, generations, and explicit evolution choices all have independent routes.

Inside the TUI, Codex supports category → entry → detail navigation. Details show first discovery, provenance, a related record, and Cabinet status without leaking locked names or conditions. Press `h` for the nested Containment Archive, `t` to toggle 7/30 days, and `Enter` for a daily record. A discovered record can be placed in one of three Consequence Cabinet slots after an explicit preview and confirmation. Press `s` from Overview, Habitat, a discovered record, or a daily archive detail to preview and explicitly export an existing privacy-safe SVG card. The cabinet and exported files add no stats, probability, or progression. Habitat also offers one deterministic Observation and one restrained Contact per settled day. Each stores narrative IDs only and cannot be rerolled into a reward.

Nine privacy-safe SVG cards are available:

```bash
anti-ai share --card pathology > anti-ai-pathology.svg
anti-ai share --card specimen > anti-ai-specimen.svg
anti-ai share --card wanted > anti-ai-wanted.svg
anti-ai share --card fossil > anti-ai-fossil.svg
anti-ai share --card encounter --with <pollution-code> > anti-ai-encounter.svg
anti-ai share --card prognosis > anti-ai-prognosis.svg
anti-ai share --card culture --id <culture-id> > anti-ai-culture.svg
anti-ai share --card companion > anti-ai-companion.svg
anti-ai share --card habitat > anti-ai-habitat.svg
```

A fossil certificate becomes available after experience day 90.
Cross-machine collection is local and optional. Read [Local Mutation Encounters](./encounters.md) for pollution-code and foreign-specimen behavior.
Turning-point cases are also local and optional. Read [Forked Casebook](./casebook.md) for history, intervention, prognosis, and case-slice behavior.
Containment incidents are local delayed event chains. Read [Containment Incidents](./incidents.md) for cadence, responses, aftermaths, and incident-report collection behavior.
Laboratory cultures are local and optional. Read [Pollution Laboratory](./laboratory.md) for stable formula, rarity, shelf, and culture-card behavior.
Bonded companions are local and optional. Read [Symbiotic Companions](./companions.md) for imprints, routes, milestones, and companion-card behavior.
The combined containment scene is local and read-only. Read [Containment Habitat](./habitat.md) for seven-day events, relationships, scenery, period summaries, and the 30 fixed phenomena.

## State, privacy, and reset

State lives at:

```text
~/.anti-ai/creature.json
```

The current schema is v13. It stores only:

- discrete usage bands and derived Ecology points;
- integer content versions for settled days and generation choices, so v1 history is never rerolled by v2 content pools;
- stable gene and part IDs;
- achievements and appearance fingerprints;
- pollution doses, traits, regular/chromatic ability gains, and event IDs;
- permanent fossils with per-generation ability gains, sealed snapshots, and malignancy changes;
- sealed evolution choices;
- turning-point case IDs, privacy-safe triggers, and sealed route choices;
- containment incident, response, aftermath, and chain IDs with privacy-safe trigger summaries and disposition counts;
- saved foreign encounters as derived parent/form and hybrid appearance IDs;
- laboratory batches and cultures as derived material, diagnosis, rarity, and appearance IDs;
- companion bonds, discrete daily imprints, and sealed anomaly IDs;
- up to three stable Consequence Cabinet collection keys;
- at most one Observation target/reaction ID and one Contact target/reaction ID per settled day;
- a local seed.

It does **not** store prompts, responses, paths, model names, exact Token totals, personal-baseline values, or per-request timestamps.

Schema v1-v12 files migrate sequentially and idempotently without losing existing ability points or inventing case choices, containment incidents, laboratory cultures, companion bonds, Cabinet displays, daily interactions, imprints, anomalies, or v2 discoveries. Missing historical content versions become v1; only newly settled days and newly sealed evolution choices use v2 pools. The first persisted migration keeps an exact original backup under `~/.anti-ai/backups/`. Existing daily gains are reinterpreted into the 255-point cycle, so an old total such as 267 becomes `MALIGNANT I · 12/255` rather than being truncated. `anti-ai codex` derives a read-only snapshot without persisting another migration.

One mutation history always uses the complete supported data set, so `creature`, `codex`, and `lab` reject `--source` filters.

Explicitly restart the creature with:

```bash
anti-ai creature reset
```

Reset removes the local derived evolution history and its migration backups. It does not delete Agent logs.
