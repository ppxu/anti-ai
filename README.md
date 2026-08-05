# anti-ai

[![npm version](https://img.shields.io/npm/v/anti-ai.svg)](https://www.npmjs.com/package/anti-ai)
[![CI](https://github.com/ppxu/anti-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/ppxu/anti-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

English | [简体中文](./README.zh-CN.md)

Turn local Codex, Claude Code, OpenCode, OpenClaw, Hermes, and Pi usage into a transparent, satirical AI resource receipt—and a mutation creature fed on compute waste.

```text
┌──────────────────────────────────────────────┐
  YOUR AI RECEIPT · 2026-07-23
├──────────────────────────────────────────────┤

  127,605,581 tokens · 1,058 model requests

  Estimated resource use · named public high-side reference
  ⚡  359.72 Wh · OpenAI published request-level average
  💧  54,015.30 mL · Mistral lifecycle high-side case
  ☁️  1,368.39 gCO₂e · Mistral lifecycle high-side case

  Everyday translation
  💡  10W LED light       1.50 days
  📱  19Wh phone charge   18.93 charges
  🥤  550mL drinking water 98.21 bottles
  💧  One drop of water   1,080,306 drops
  🚗  Average gas car     5.60 km

  Personal baseline · prior 7 calendar days
  Tokens +62.00% · requests -18.00%

  Today's charge: ESSENTIAL ATTACHMENT COLLECTOR

  Run anti-ai explain resources for reference boundaries
└──────────────────────────────────────────────┘
```

Human-readable output defaults to Simplified Chinese. Pass `--lang en` for English. JSON field names remain stable in either language.

## Why

Token counts are measurable. The electricity, water, and carbon impact of proprietary AI systems is not publicly measurable per request.

`anti-ai` keeps those two facts separate:

- exact local token and model statistics are available through `--json`;
- environmental values are clearly labelled named public high-side references, not local measurements;
- every assumption and source is visible through `anti-ai explain`;
- no prompt or response text leaves your machine.

## Requirements

- Node.js 22 or newer
- Local records from at least one supported Agent (JSONL or SQLite)
- Verified on macOS; the implementation uses cross-platform Node.js paths and APIs

## Install

```bash
npm install -g anti-ai
anti-ai doctor
anti-ai
```

### Install the Agent Skill

Install the CLI first, then use the open [`skills`](https://github.com/vercel-labs/skills) installer to give Codex, Claude Code, Cursor, or another supported agent the safe anti-ai workflow:

```bash
npm install -g anti-ai
npx skills add ppxu/anti-ai --skill anti-ai -g -y
```

For an explicit agent target:

```bash
npx skills add ppxu/anti-ai --skill anti-ai -g -a codex -y
npx skills add ppxu/anti-ai --skill anti-ai -g -a claude-code -y
```

The Skill tells an Agent when to use exact JSON, when to show a human receipt, how to create a share card, and why it must not read raw conversation logs.

## Commands

```bash
anti-ai
anti-ai today
anti-ai today --date 2026-07-23
anti-ai today --source codex
anti-ai today --source claude
anti-ai today --source opencode
anti-ai today --source openclaw
anti-ai today --source hermes
anti-ai today --source pi
anti-ai today --lang en
anti-ai today --json

anti-ai week
anti-ai week --date 2026-07-23

anti-ai month
anti-ai month --date 2026-07-23

anti-ai tui
anti-ai tui --lang en
anti-ai tui --no-motion

anti-ai codex
anti-ai codex --json

anti-ai creature export
anti-ai encounter <pollution-code>
anti-ai encounter <pollution-code> --save

anti-ai lab
anti-ai lab --json
anti-ai lab incubate 1
anti-ai lab shelf
anti-ai lab inspect <culture-id>
anti-ai lab bond <culture-id>
anti-ai lab companion

anti-ai share > anti-ai-receipt.svg
anti-ai share --lang en > anti-ai-receipt.svg
anti-ai share --card pathology > anti-ai-pathology.svg
anti-ai share --card specimen > anti-ai-specimen.svg
anti-ai share --card wanted > anti-ai-wanted.svg
anti-ai share --card fossil > anti-ai-fossil.svg
anti-ai share --card encounter --with <pollution-code> > anti-ai-encounter.svg
anti-ai share --card prognosis > anti-ai-prognosis.svg
anti-ai share --card culture --id <culture-id> > anti-ai-culture.svg
anti-ai share --card companion > anti-ai-companion.svg
anti-ai share --card habitat > anti-ai-habitat.svg

anti-ai creature
anti-ai creature --full
anti-ai creature --json
anti-ai creature habitat
anti-ai creature habitat --full
anti-ai creature history
anti-ai creature prognosis
anti-ai creature intervene
anti-ai creature intervene 2
anti-ai creature incident
anti-ai creature incident 2
anti-ai creature evolve
anti-ai creature evolve 2
anti-ai creature reset

anti-ai doctor
anti-ai explain
anti-ai explain resources
anti-ai help today
anti-ai creature --help
anti-ai --version
anti-ai --help
```

### Language

All human-readable commands support `--lang zh|en`, including receipts, summaries, diagnostics, methodology, help, errors, and satirical verdicts. The default is `zh`.

```bash
anti-ai today --lang en
anti-ai month --lang en
anti-ai creature --lang en
anti-ai explain --lang en
```

`today --json`, `codex --json`, `creature --json`, `encounter --json`, and `lab --json` ignore presentation language and keep stable machine-readable keys.

### `tui`

Open the controlled containment console for human exploration and deliberate local actions:

```bash
anti-ai tui
anti-ai tui --date 2026-07-23
anti-ai tui --lang en
anti-ai tui --no-motion
```

Running `anti-ai` with no arguments opens the console in an interactive terminal; a pipe or other non-interactive launch prints grouped Help instead. The console brings Overview, Habitat, Laboratory, and Codex into one keyboard-navigable surface. Overview now opens with a containment brief for the selected day: settled status, pathology changes, discoveries, local records, the next milestone, and no more than one primary plus one secondary action. Press `a` anywhere to open the available-now action center, or press `Enter` on a contextual primary action. Every state write follows preview → explicit confirmation → result → refreshed file; `Enter` or `y` confirms, while `Esc` or `n` cancels.

The specimen and active companion breathe, blink, and pulse at a deliberately low default rate. Press `m` to cycle `LOW`, `FULL`, and `OFF`, or start with `--no-motion` for a completely static display. Motion never changes growth or saved state.

Press `1`–`4`, the arrow keys, or contextual `Tab` focus to move through the console. In Codex, press `h` for the nested Containment Archive, `t` to toggle the latest 7/30 days, and `Enter` to inspect one daily record. Collection details now show first discovery, provenance, related record, and Cabinet status; locked entries remain spoiler-free silhouettes. Press `d` to preview displaying a discovered record. Press `s` from Overview, Habitat, a discovered Codex detail, or a daily archive detail to preview the card type, privacy boundary, and target filename; confirmation creates a new SVG in the current directory without overwriting an existing file. Laboratory shows a three-step material → culture → companion path: `Tab` switches between formulas and the complete culture shelf, `Enter` incubates or inspects the focused item, and `b` previews bonding the selected culture. An empty Habitat bay explains the next unmet step; press `l` to open Laboratory or, when a culture already exists, `b` to bond without leaving the console. Pollution-code exchange still uses the explicit `encounter --save` CLI because the TUI does not collect free-form codes. In Habitat, press `Enter` for read-only anatomy inspection, `r` to replay the latest sealed ecological event, `o` for today's Observation, or `c` for today's restrained Contact. Observation and Contact are each limited to once per settled day and create deterministic narrative only—no stats, rarity, or rewards.

Browsing, replaying, inspecting, archive navigation, provenance lookup, share preview, and cancelling remain read-only and do not scan Agent records. Opening the daily-settlement impact preview may scan supported usage metadata so it can show the exact local impact before confirmation; it does not write. Gameplay confirmation writes the Creature file through the same action service and atomic conflict checks used by CLI commands. Share confirmation renders through the existing local SVG service and writes only the previewed new file. Scripts and Agents should continue using explicit commands and `--json`; the TUI is a human-only interactive surface.

### `today`

Print a daily receipt using your system timezone. It includes a token breakdown by source and model. The human-readable receipt compares usage with the prior seven calendar days and selects one verdict from an expanded satirical copy bank. The selected title and line are stable for a given date, and no model is called to generate them.

A cache offense no longer wins merely because cache use is normally high. It requires cached reads to reach at least `70%` of current input and exceed the personal seven-day cache baseline by at least `10` percentage points.

Every verdict category combines 11 charge titles with 13 detail lines. The pair is deterministic for a date and does not reset at month boundaries, so one continuously triggered symptom has 143 exact combinations before repeating.

`--json` returns exact token data grouped by source and model. It deliberately excludes environmental proxies, baselines, and verdicts.

The default all-source human receipt also settles that creature day and appends a concise mutation update with ecology gain, current form, today's achievements, newly sealed fossils, pending evolution choices, anything newly added to the codex, and one current habitat observation. `today --json` and source-filtered receipts do not mutate the complete growth history.

The human-readable receipt scans the comparison window directly and may take several seconds when local logs are large. The tool deliberately avoids a persistent usage index in this release.

### `week`

Print a seven-day token trend ending on the selected date, followed by model and resource summaries with everyday comparisons. A complete-source human report also settles the creature and appends a living casebook with the primary symptom, Pollution/Clarity change, stage and generation growth, fossils sealed during the period, newly unlocked badges, collection discoveries, a deterministic attending note, and the current habitat relationship plus events sealed in the period. Source-filtered reports remain usage-only. The current release scans recent logs directly and does not create an index.

### `month`

Print a terminal calendar heatmap from the first day of the month through the selected date. It includes the quiet-day ratio (for example, `7 days / 23 days`), longest quiet streak, peak day, model breakdown, and monthly resource comparisons.

A complete-source human report also appends a monthly follow-up. It counts only settled days after hatching, summarizes the dominant symptom and Ecology transition, and reviews stage/generation growth, fossils, achievements, collection discoveries, and habitat incidents without treating pre-hatch empty days as Withdrawal.

### `codex`

Inspect the private pathology collection derived from the existing creature history:

```bash
anti-ai codex
anti-ai codex --date 2026-07-23 --lang en
anti-ai codex --json
```

The fixed collection contains 68 entries: 16 form families, 24 achievements, 6 chromatic abilities, 4 generation scars, and 18 route-balanced habitat phenomena. Human output reveals only discovered names; locked entries remain `???`. Dynamic specimen fingerprints, foreign encounter specimens, permanent fossils, sealed case slices, laboratory cultures, bonded companion forms, and resolved incident reports are collected without an artificial upper limit.

`codex --json` exposes stable IDs, discovery state and dates, provenance, collection counts, the selected day's `recent` discoveries, and the current three-slot Cabinet references. The TUI adds category → entry → detail navigation, first-discovery and related-record context, locked silhouettes, an explicitly confirmed display action, and a nested 7/30-day Containment Archive. Displaying a record changes only Codex, Habitat, and share presentation. The codex uses the same complete six-source growth history as `creature`, so it rejects `--source` filters and does not turn Token volume into a preferred collection route.

The human view also reports the generator's **21,233,664 deduplicated final ASCII forms**. This is a theoretical species-space estimate, not collection progress. See the [Creature Guide](./docs/creature.md) for the capacity calculation and visual precedence rules.

### `encounter`

Export your current form as a privacy-safe pollution code, exchange it with somebody else, and run the accident locally:

```bash
anti-ai creature export
anti-ai encounter <pollution-code>
anti-ai encounter <pollution-code> --save
anti-ai encounter <pollution-code> --json
```

The same two appearance fingerprints always produce the same incident ID, contact type, and hybrid specimen. Compute weather is deterministic for the selected date. `--save` bottles the hybrid once in the local foreign-specimen cabinet; it is optional and does not alter growth, scores, or Token incentives.

Pollution codes contain only protocol version and derived appearance IDs. They omit exact Token totals, model/source names, paths, prompts, responses, and request timestamps. There is no server, upload, leaderboard, combat power, or Token ranking. See [Local Mutation Encounters](./docs/encounters.md) for the protocol, safety limits, and collection behavior.

### `lab`

Turn saved foreign specimens, permanent fossils, and sealed case slices into a local pollution laboratory:

```bash
anti-ai lab
anti-ai lab --json
anti-ai lab incubate 1
anti-ai lab shelf
anti-ai lab shelf --full
anti-ai lab inspect <culture-id>
anti-ai lab bond <culture-id>
anti-ai lab companion
anti-ai lab companion --full
```

Each batch exposes three deterministic formulas. Viewing the laboratory cannot reroll them: the same local seed, derived material inventory, and batch always produce the same choices. Selecting one formula seals a culture with its own dish ASCII, rarity, Ecology, pathology, complication, and side effect; the other two formulas expire with that batch.

Materials are references and are never consumed. Cultures do not change creature experience, abilities, Malignancy, Ecology, evolution rates, combat power, or Token rewards. Formula generation and incubation read only derived local state and never scan Agent logs.

A sealed culture can become a symbiotic companion through `lab bond`. It receives exactly one imprint per observed day: heavy, restrained, and AI-free days grow at the same rate while shaping Pollution, Clarity, or Paradox. It advances from PARASITIC HATCHLING to SYMBIOTIC ABERRATION and ACCOMPLICE ORGAN, with deterministic anomalies and a changing ASCII body at days 7 and 21. A direct companion command settles an unseen date through the same privacy-preserving local usage accounting as `creature`; conversation content is never read. See [Pollution Laboratory](./docs/laboratory.md) for formula rules and [Symbiotic Companions](./docs/companions.md) for the full growth model.

### `share`

Print a 1200×630 SVG share card to stdout. It uses the same resource estimate formulas, personal baseline, and deterministic verdict as `today`, but omits prompts, responses, paths, model names, request counts, and exact token counts.

```bash
anti-ai share > anti-ai-receipt.svg
anti-ai share --date 2026-07-23 --lang en > anti-ai-receipt.svg
anti-ai share --card pathology > anti-ai-pathology.svg
anti-ai share --card pathology --lang en > anti-ai-pathology.svg
anti-ai share --card specimen > anti-ai-specimen.svg
anti-ai share --card wanted > anti-ai-wanted.svg
anti-ai share --card fossil > anti-ai-fossil.svg
anti-ai share --card encounter --with <pollution-code> > anti-ai-encounter.svg
anti-ai share --card prognosis > anti-ai-prognosis.svg
anti-ai share --card culture --id <culture-id> > anti-ai-culture.svg
anti-ai share --card companion > anti-ai-companion.svg
anti-ai share --card habitat > anti-ai-habitat.svg
```

Creature history and the laboratory support nine privacy-safe cards: `pathology` for a clinical snapshot, `specimen` for the current collected form, `wanted` for a satirical wanted poster, `fossil` for the latest sealed generation, `encounter` for a local contact accident, `prognosis` for the current three-route case, `culture` for a sealed laboratory accident, `companion` for the currently bonded growth file, and `habitat` for the combined containment scene. A fossil certificate becomes available after experience day 90; prognosis becomes available when a turning-point case is pending; culture defaults to the latest sealed dish and accepts `--id`; companion becomes available after `lab bond`. The habitat card also works with an empty companion bay.

Nothing is uploaded. Every card omits exact Token totals, requests, source/model names, paths, and conversation content; the destination file is controlled entirely by your shell. Creature cards require the complete data set and therefore reject `--source` filters.

### `creature`

Turn recent Token use into a persistent compute mutation:

```bash
anti-ai creature
anti-ai creature --date 2026-07-23
anti-ai creature --lang en
anti-ai creature --json
anti-ai creature --full
anti-ai creature habitat
anti-ai creature habitat --full
anti-ai creature habitat --json
anti-ai creature export
anti-ai creature history
anti-ai creature history --full
anti-ai creature prognosis
anti-ai creature intervene
anti-ai creature intervene 2
anti-ai creature incident
anti-ai creature incident 2
anti-ai creature evolve
anti-ai creature evolve 2
```

Every settled day advances exactly one experience day, so high use, low use, and AI-free days grow different traits without letting Token volume buy faster stages. Each 90-day generation evolves through Compute Embryo, Reactor Hatchling, Nuclear Feeder, and Compute Meltdown, then seals a permanent fossil.

Regular abilities cycle through 255 visible points. Overflow becomes a lossless Malignancy rank, adds a route-specific diagnosis and evolution modifier, and is preserved in permanent fossils.

Every 14 experience days may offer one turning-point case. Its three routes—Pollution, Clarity, and Paradox—always expose both a benefit and a cost; a pending case prevents a choice backlog. `history` compresses important events, while `prognosis` previews three explainable directions using qualitative labels rather than fake probabilities.

Every 7 experience days may also offer one containment incident. Emergency Quarantine, Continue Observation, and Allow Resonance each seal a visible trade-off; the aftermath appears 3 experience days later and may open one deterministic follow-up chapter. Pending incidents never build a backlog, and responses grant no abilities, experience, Ecology, or Token rewards.

The Reactor Kaiju generator has 16 core form families and **21,233,664 deduplicated final ASCII forms**. A stable local genome controls its organs while pathology, Ecology, scars, achievements, and chromatic rarity reshape the same skeleton. Run `anti-ai codex` to compare that theoretical capacity with your collection.

`creature habitat` combines the current specimen, active companion, collection traces, and Consequence Cabinet into the selected single-screen containment scene. The Habitat snapshot is read-only, derives one deterministic event every seven experience days, and cannot be rerolled or accelerated with Token volume. Cabinet curation and the two daily light interactions happen only after explicit TUI confirmation and never alter growth values.

Read the full [Creature Guide](./docs/creature.md) for lifecycle and appearance, [Forked Casebook](./docs/casebook.md) for history and choices, [Containment Incidents](./docs/incidents.md) for delayed event chains, [Pollution Laboratory](./docs/laboratory.md) for culture formulas, [Symbiotic Companions](./docs/companions.md) for the sidekick growth model, and [Containment Habitat](./docs/habitat.md) for relationships, scenery, events, and the fixed phenomenon catalog. [中文版](./docs/creature.zh-CN.md) · [分叉病历中文说明](./docs/casebook.zh-CN.md) · [收容事故中文说明](./docs/incidents.zh-CN.md) · [污染实验室中文说明](./docs/laboratory.zh-CN.md) · [伴生异物中文说明](./docs/companions.zh-CN.md) · [收容生态舱中文说明](./docs/habitat.zh-CN.md).

### `doctor`

Check all six default sources, their local paths, availability, storage type, and accounting precision. Missing sources do not fail an all-source check; checking one explicitly missing source does.

### `explain`

Show every estimate factor, formula, source, and limitation. Use `anti-ai explain resources|comparisons|sources|creature|privacy` for a focused explanation.

## Data sources and counting

Default locations:

- Codex: `~/.codex/sessions`
- Claude Code: `~/.claude/projects`
- OpenCode: `~/.local/share/opencode/opencode.db`
- OpenClaw: `~/.openclaw/agents`
- Hermes: `~/.hermes/state.db`
- Pi: `~/.pi/agent/sessions`

Override them when needed:

```bash
ANTI_AI_CODEX_DIR=/path/to/codex/sessions \
ANTI_AI_CLAUDE_DIR=/path/to/claude/projects \
ANTI_AI_OPENCODE_DB=/path/to/opencode.db \
ANTI_AI_OPENCLAW_DIR=/path/to/openclaw/agents \
ANTI_AI_HERMES_DB=/path/to/hermes/state.db \
ANTI_AI_PI_DIR=/path/to/pi/sessions \
anti-ai today
```

Codex records are counted from `token_count.info.last_token_usage`. Each record is attributed to the most recent `turn_context.payload.model` in the same session. Cached input and reasoning output are displayed as subsets and are never added twice.

Claude Code may write multiple snapshots for one streamed assistant response. `anti-ai` deduplicates them by `message.id`, keeps the most complete usage snapshot, and reads its model from `message.model`.

OpenCode usage is read from assistant rows in its SQLite `message` or `session_message` table. OpenClaw assistant messages are deduplicated across active and `.reset.*` JSONL files; trajectory exports are excluded. Pi assistant, compaction, and branch-summary usage is deduplicated globally by entry ID, including copied or forked sessions.

Hermes is the intentional precision exception: `anti-ai` prefers `session_model_usage`, including auxiliary calls, and falls back to aggregate `sessions` rows. Those totals span a session and are assigned to its last active day, so `doctor` labels Hermes as `session approximate`.

OpenCode and Hermes use the optional `better-sqlite3` adapter. npm attempts to install it normally, but a missing or ABI-incompatible native build no longer blocks Codex, Claude Code, OpenClaw, or Pi. Run `anti-ai doctor` to see the degraded source. An `all` report keeps healthy sources and prints a privacy-safe warning; explicitly selecting the broken SQLite source exits with an actionable error.

If a log does not contain a model field, the usage is grouped under `unknown`. Human-readable reports show the five highest-token source/model combinations; JSON keeps the complete breakdown.

## Environmental methodology

Supported Agents do not provide measured per-request electricity, water, or carbon data. `anti-ai` calculates each named public case separately and shows the highest case for each resource. It does not combine incompatible cases into a fake range, and the result is neither a local measurement nor a statistical confidence interval.

- [Google: Measuring the environmental impact of delivering AI at Google Scale](https://services.google.com/fh/files/misc/measuring_the_environmental_impact_of_delivering_ai_at_google_scale.pdf)
- [OpenAI disclosure: The Gentle Singularity](https://blog.samaltman.com/the-gentle-singularity)
- [Mistral: Our contribution to a global environmental standard for AI](https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/)

Every report prints five comparisons at an appropriate scale: small daily activities, medium weekly activities, and large monthly activities. Values below `0.01` of a large activity are shown as “times short” rather than `0.00`. The calculations use:

- rounded display assumptions of a 10W LED, 19Wh phone charge, 0.05mL water drop, 550mL bottle, 100Wh to boil 1L of water, 50W laptop, 1kW microwave, 2.5ML pool, and 150L bath;
- [EPA WaterSense shower flow](https://www.epa.gov/watersense/showerheads) and [ENERGY STAR dishwasher water criteria](https://www.energystar.gov/products/dishwashers/key_product_criteria);
- [US EPA gasoline vehicle, urban-tree, and household-electricity factors](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references).

WaterSense shower flow uses the EPA maximum of 2.0 gal/min (about 7.6L/min), and a standard ENERGY STAR dishwasher uses at most 3.2 gal/cycle (about 12.1L). The U.S. household electricity comparison divides EPA's 12,194kWh annual figure by 365, or about 33.4kWh/day. [WaterSense](https://www.epa.gov/watersense/showerheads) · [ENERGY STAR](https://www.energystar.gov/products/dishwashers/key_product_criteria) · [EPA equivalencies](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references)

The remaining rounded consumer-item values are display assumptions, not environmental measurement standards. Run `anti-ai explain comparisons` to see each formula. The tool reports how long one urban tree would need to sequester the carbon estimate; it does not claim an equivalent number of trees cut down.

## Privacy

- Runs locally and sends no log data over the network
- Retains only timestamp, message ID, model, and usage metadata while scanning
- Does not store or print prompts, responses, or tool-call content
- The default share card omits paths, model names, request counts, and exact token counts
- Creates no usage database and starts no background process; `creature` maintains one local growth file without exact usage
- `codex` and every `share` card derive read-only snapshots and never settle or rewrite growth state
- TUI browsing and cancellation are read-only; settlement preview may scan usage metadata, and every write requires explicit confirmation
- Persisted schema migrations keep an exact content-addressed backup; concurrent writers are rejected instead of silently losing progress

Do not attach real Agent logs or SQLite databases to public issues. Use a minimal, redacted fixture instead.

## Development

```bash
git clone https://github.com/ppxu/anti-ai.git
cd anti-ai
npm run build:tui
npm test
npm run check
npm run test:coverage
npm run test:package
node ./bin/anti-ai.mjs --help
```

Tests exercise the public CLI through exit codes and stdout/stderr using synthetic JSONL and SQLite fixtures.

## Architecture

- `bin/anti-ai.mjs`: minimal executable launcher
- `src/cli.mjs`: small command registry dispatcher
- `src/cli/`: argument parsing, terminal rendering, and methodology explanation
- `src/commands/`: focused Creature, Encounter, Laboratory, Share, and TUI handlers
- `src/application/`: presentation-neutral read models, archive queries, confirmed local share export, and shared action orchestration
- `src/tui/`: Ink source for the controlled interactive containment console
- `dist/tui.mjs`: generated self-contained Ink/React runtime bundle
- `src/help.mjs`: global and command-specific help
- `src/registry.mjs`: command, card, and local-source metadata
- `src/scanner.mjs`: isolated six-source JSONL/optional-SQLite adapters
- `src/methodology.mjs`: named public resource cases and high-side selection
- `src/comparisons.mjs`: period-specific everyday comparisons
- `src/content.mjs`: deterministic bilingual footer and share-copy pools
- `src/reporting.mjs`: terminal receipts, calendars, and verdicts
- `src/renderers/svg.mjs`: privacy-safe SVG cards
- `src/creature.mjs`: mutation growth and collection rules
- `src/creature/`: content pools, appearance generation, and versioned balance policy
- `src/consequence-cabinet.mjs`: three-slot displays and deterministic daily narrative interactions
- `src/state-store.mjs`: validation-aware atomic local state storage
- `src/laboratory.mjs`: derived formulas, sealed cultures, and shelves
- `src/companion.mjs`: companion bonds, imprints, routes, and ASCII growth
- `src/habitat.mjs`: read-only relationships, scenery, and seven-day ecological events
- `src/shared.mjs`: shared language and empty-usage primitives
- `docs/architecture.md`: extension, state, privacy, and quality boundaries
- `docs/creature.md`: complete Creature system and species-capacity guide
- `docs/companions.md`: complete Symbiotic Companion guide
- `docs/habitat.md`: complete Containment Habitat guide

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
