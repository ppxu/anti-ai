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

- Node.js 20 or newer
- Local records from at least one supported Agent (JSONL or SQLite)
- Verified on macOS; the implementation uses cross-platform Node.js paths and APIs

## Install

```bash
npm install -g anti-ai
anti-ai doctor
anti-ai today
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

anti-ai codex
anti-ai codex --json

anti-ai share > anti-ai-receipt.svg
anti-ai share --lang en > anti-ai-receipt.svg
anti-ai share --card pathology > anti-ai-pathology.svg
anti-ai share --card specimen > anti-ai-specimen.svg
anti-ai share --card wanted > anti-ai-wanted.svg
anti-ai share --card fossil > anti-ai-fossil.svg

anti-ai creature
anti-ai creature --full
anti-ai creature --json
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

`today --json`, `codex --json`, and `creature --json` ignore presentation language and keep stable machine-readable keys.

### `today`

Print a daily receipt using your system timezone. It includes a token breakdown by source and model. The human-readable receipt compares usage with the prior seven calendar days and selects one verdict from an expanded satirical copy bank. The selected title and line are stable for a given date, and no model is called to generate them.

A cache offense no longer wins merely because cache use is normally high. It requires cached reads to reach at least `70%` of current input and exceed the personal seven-day cache baseline by at least `10` percentage points.

Every verdict category combines 11 charge titles with 13 detail lines. The pair is deterministic for a date and does not reset at month boundaries, so one continuously triggered symptom has 143 exact combinations before repeating.

`--json` returns exact token data grouped by source and model. It deliberately excludes environmental proxies, baselines, and verdicts.

The default all-source human receipt also settles that creature day and appends a concise mutation update with ecology gain, current form, today's achievements, newly sealed fossils, pending evolution choices, and anything newly added to the codex. `today --json` and source-filtered receipts do not mutate the complete growth history.

The human-readable receipt scans the comparison window directly and may take several seconds when local logs are large. The tool deliberately avoids a persistent usage index in this release.

### `week`

Print a seven-day token trend ending on the selected date, followed by model and resource summaries with everyday comparisons. A complete-source human report also settles the creature and appends a living casebook with the primary symptom, Pollution/Clarity change, stage and generation growth, fossils sealed during the period, newly unlocked badges, collection discoveries, and a deterministic attending note. Source-filtered reports remain usage-only. The current release scans recent logs directly and does not create an index.

### `month`

Print a terminal calendar heatmap from the first day of the month through the selected date. It includes the quiet-day ratio (for example, `7 days / 23 days`), longest quiet streak, peak day, model breakdown, and monthly resource comparisons.

A complete-source human report also appends a monthly follow-up. It counts only settled days after hatching, summarizes the dominant symptom and Ecology transition, and reviews stage/generation growth, fossils, achievements, and collection discoveries without treating pre-hatch empty days as Withdrawal.

### `codex`

Inspect the private pathology collection derived from the existing creature history:

```bash
anti-ai codex
anti-ai codex --date 2026-07-23 --lang en
anti-ai codex --json
```

The fixed collection contains 50 entries: 16 form families, 24 achievements, 6 chromatic abilities, and 4 generation scars. Human output reveals only discovered names; locked entries remain `???`. Dynamic specimen fingerprints and permanent fossils are collected without an artificial upper limit.

`codex --json` exposes stable IDs, discovery state and dates, collection counts, and the selected day's `recent` discoveries. The codex uses the same complete six-source growth history as `creature`, so it rejects `--source` filters. It stores no new state and does not turn Token volume into a preferred collection route.

The human view also reports the generator's **21,233,664 deduplicated final ASCII forms**. This is a theoretical species-space estimate, not collection progress. See the [Creature Guide](./docs/creature.md) for the capacity calculation and visual precedence rules.

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
```

Creature history now supports four privacy-safe cards: `pathology` for a clinical snapshot, `specimen` for the current collected form, `wanted` for a satirical wanted poster, and `fossil` for the latest sealed generation. A fossil certificate becomes available after experience day 90.

Nothing is uploaded. Every card omits exact Token totals, requests, source/model names, paths, and conversation content; the destination file is controlled entirely by your shell. Creature cards require the complete data set and therefore reject `--source` filters.

### `creature`

Turn recent Token use into a persistent compute mutation:

```bash
anti-ai creature
anti-ai creature --date 2026-07-23
anti-ai creature --lang en
anti-ai creature --json
anti-ai creature --full
anti-ai creature evolve
anti-ai creature evolve 2
```

Every settled day advances exactly one experience day, so high use, low use, and AI-free days grow different traits without letting Token volume buy faster stages. Each 90-day generation evolves through Compute Embryo, Reactor Hatchling, Nuclear Feeder, and Compute Meltdown, then seals a permanent fossil.

Regular abilities cycle through 255 visible points. Overflow becomes a lossless Malignancy rank, adds a route-specific diagnosis and evolution modifier, and is preserved in permanent fossils.

The Reactor Kaiju generator has 16 core form families and **21,233,664 deduplicated final ASCII forms**. A stable local genome controls its organs while pathology, Ecology, scars, achievements, and chromatic rarity reshape the same skeleton. Run `anti-ai codex` to compare that theoretical capacity with your collection.

Read the full [Creature Guide](./docs/creature.md) for lifecycle, capacity math, Pollution/Clarity, abilities, talents, generations, evolution costs, chromatic mutations, codex, privacy, and reset. [中文版](./docs/creature.zh-CN.md).

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

Do not attach real Agent logs or SQLite databases to public issues. Use a minimal, redacted fixture instead.

## Development

```bash
git clone https://github.com/ppxu/anti-ai.git
cd anti-ai
npm test
npm run check
node ./bin/anti-ai.mjs --help
```

Tests exercise the public CLI through exit codes and stdout/stderr using synthetic JSONL and SQLite fixtures.

## Architecture

- `bin/anti-ai.mjs`: minimal executable launcher
- `src/cli.mjs`: argument validation and command orchestration
- `src/help.mjs`: global and command-specific help
- `src/scanner.mjs`: six-source JSONL/SQLite scanning and accounting
- `src/methodology.mjs`: named public resource cases and high-side selection
- `src/comparisons.mjs`: period-specific everyday comparisons
- `src/content.mjs`: deterministic bilingual footer and share-copy pools
- `src/reporting.mjs`: receipts, calendars, cards, and verdicts
- `src/creature.mjs`: mutation growth rules and local state
- `src/shared.mjs`: shared language and empty-usage primitives
- `docs/creature.md`: complete Creature system and species-capacity guide

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
