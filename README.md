# anti-ai

[![npm version](https://img.shields.io/npm/v/anti-ai.svg)](https://www.npmjs.com/package/anti-ai)
[![CI](https://github.com/ppxu/anti-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/ppxu/anti-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

English | [简体中文](./README.zh-CN.md)

Turn local Codex and Claude Code token usage into a transparent, satirical AI resource receipt—and a mutation creature fed on compute waste.

```text
┌──────────────────────────────────────────────┐
  YOUR AI RECEIPT · 2026-07-23
├──────────────────────────────────────────────┤

  127,605,581 tokens · 1,058 model requests

  Estimated resource use — from public data
  ⚡  253.92–359.72 Wh
  💧  275.08–54,015.30 mL
  ☁️  31.74–1,368.39 gCO₂e

  Everyday translation
  📱  15Wh phone charge  16.93–23.98 charges
  💻  50W laptop         5.08–7.19 hours
  🚿  8L/min shower      0.03–6.75 minutes
  ☕  250mL cup of water 1.10–216.06 cups
  🚽  6L toilet flush    0.05–9.00 flushes
  🚗  Average gas car    0.13–5.51 km
  🌳  One urban tree     0.19–8.32 days to absorb it

  Personal baseline · prior 7 calendar days
  Tokens +62.00% · requests -18.00%

  Today's charge: CONTEXT HOARDING

  Confidence: LOW · run anti-ai explain
└──────────────────────────────────────────────┘
```

Human-readable output defaults to Simplified Chinese. Pass `--lang en` for English. JSON field names remain stable in either language.

## Why

Token counts are measurable. The electricity, water, and carbon impact of proprietary AI systems is not publicly measurable per request.

`anti-ai` keeps those two facts separate:

- exact local token and model statistics are available through `--json`;
- environmental values are clearly labelled low-confidence estimates from public examples;
- every assumption and source is visible through `anti-ai explain`;
- no prompt or response text leaves your machine.

## Requirements

- Node.js 20 or newer
- Local Codex or Claude Code JSONL logs
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
anti-ai today --lang en
anti-ai today --json

anti-ai week
anti-ai week --date 2026-07-23

anti-ai month
anti-ai month --date 2026-07-23

anti-ai share > anti-ai-receipt.svg
anti-ai share --lang en > anti-ai-receipt.svg

anti-ai creature
anti-ai creature --json
anti-ai creature reset

anti-ai doctor
anti-ai explain
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

`today --json` and `creature --json` ignore presentation language and keep stable machine-readable keys.

### `today`

Print a daily receipt using your system timezone. It includes a token breakdown by source and model. The human-readable receipt compares usage with the prior seven calendar days and selects one verdict from an expanded satirical copy bank. The selected title and line are stable for a given date, and no model is called to generate them.

A cache offense no longer wins merely because cache use is normally high. It requires cached reads to reach at least `70%` of current input and exceed the personal seven-day cache baseline by at least `10` percentage points. Five same-category titles rotate deterministically by date.

`--json` returns exact token data grouped by source and model. It deliberately excludes environmental proxies, baselines, and verdicts.

The human-readable receipt scans the comparison window directly and may take several seconds when local logs are large. The tool deliberately avoids a persistent usage index in this release.

### `week`

Print a seven-day token trend ending on the selected date, followed by model and resource summaries with everyday comparisons. The current release scans recent logs directly and does not create an index.

### `month`

Print a terminal calendar heatmap from the first day of the month through the selected date. It includes the quiet-day ratio (for example, `7 days / 23 days`), longest quiet streak, peak day, model breakdown, and monthly resource comparisons.

### `share`

Print a 1200×630 SVG share card to stdout. It uses the same resource estimate formulas, personal baseline, and deterministic verdict as `today`, but omits prompts, responses, paths, model names, request counts, and exact token counts.

```bash
anti-ai share > anti-ai-receipt.svg
anti-ai share --date 2026-07-23 --lang en > anti-ai-receipt.svg
```

Nothing is uploaded. The destination file is controlled entirely by your shell.

### `creature`

Turn recent Token use into a persistent compute mutation:

```bash
anti-ai creature
anti-ai creature --date 2026-07-23
anti-ai creature --lang en
anti-ai creature --json
```

The first run backfills the latest 30 calendar days; later runs fill the entire gap since the previous visit. Daily Token totals are compressed logarithmically into a capped pollution dose from `1–100`; a zero-Token day has dose `0`, so wasteful volume does not produce linear growth.

The initial backfill may take several seconds with large logs. Once the file exists, another visit on the same day scans only that day.

The creature has four stages and four main branches:

| Branch | Main signal |
|---|---|
| Context Pathology | Uncached input per request |
| Cache Fossil | Cached reads as a share of input |
| Request Proliferation | Daily request count |
| Nuclear Feeder | High pollution when no specialized trait dominates |

It also grows seven deliberately unhealthy abilities:

| Ability | Main growth source |
|---|---|
| Token Appetite | Pollution dose |
| Parasitic Memory | Context-heavy use |
| Cache Carapace | Cached input |
| Request Maws | Request proliferation |
| Core Glow | Unspecialized compute pollution |
| Instability | Seeded random gains and rare events |
| Withdrawal | AI-free days after hatching |

Regular abilities cap at `999`. Each active day grants `1–2` Token Appetite, `1` point to the dominant usage ability, a deterministic random bonus with a `25%` chance, and `1` event-linked point. Even 400 consecutive heavy-use days retain growth headroom. Reaching `5`, `15`, `30`, `100`, `300`, and `700` unlocks 42 progressively worse mutation talents. Every 10 Instability points adds one percentage point to the rare-mutation chance, from a base `8%` up to `20%`.

Six low-probability “chromatic abilities” can also awaken:

| Rarity | Per active day | Abilities |
|---|---:|---|
| R (cyan) | `0.50%` | Deadline Scent, Phantom Cache, Rubber-Duck Necromancy |
| SR (magenta) | `0.10%` | Prompt Telepathy, Hallucination Antibodies |
| SSR (yellow) | `0.02%` | Token Transmutation |

Chromatic awakenings are determined by the local seed and date. Drawing the same ability again grows it, up to level `9`. Level, temperament, mood, epithet, active streak, age, talent collection, chromatic collection, and daily gains are shown in the terminal and in `creature --json`. Color-capable terminals distinguish R / SR / SSR; set `NO_COLOR=1` to disable colors.

Accumulated exposure crosses later stages at `50`, `150`, and `350`. A local seed plus the date selects one repeatable event per active day. After the first active day, every AI-free day reduces exposure by `2`, grows Withdrawal by `1`, and puts the creature to sleep without erasing historical traits.

State lives at `~/.anti-ai/creature.json`. It contains pollution doses, traits, regular/chromatic ability gains, event IDs, and a local seed—not prompts, responses, paths, model names, exact Token totals, or per-request timestamps. Existing v0.5/v0.6 files are upgraded locally on first use without losing prior ability growth. One mutation history always uses the complete Codex + Claude Code data set, so `creature` rejects `--source` filters.

Explicitly restart it with:

```bash
anti-ai creature reset
```

### `doctor`

Check whether the default log directories exist and report how many JSONL files were found.

### `explain`

Show every estimate factor, formula, source, and limitation.

## Data sources and counting

Default locations:

- Codex: `~/.codex/sessions`
- Claude Code: `~/.claude/projects`

Override them when needed:

```bash
ANTI_AI_CODEX_DIR=/path/to/codex/sessions \
ANTI_AI_CLAUDE_DIR=/path/to/claude/projects \
anti-ai today
```

Codex records are counted from `token_count.info.last_token_usage`. Each record is attributed to the most recent `turn_context.payload.model` in the same session. Cached input and reasoning output are displayed as subsets and are never added twice.

Claude Code may write multiple snapshots for one streamed assistant response. `anti-ai` deduplicates them by `message.id`, keeps the most complete usage snapshot, and reads its model from `message.model`.

If a log does not contain a model field, the usage is grouped under `unknown`. Human-readable reports show the five highest-token source/model combinations; JSON keeps the complete breakdown.

## Environmental methodology

Codex and Claude Code do not provide this tool with measured per-request electricity, water, or carbon data. The receipt therefore shows an estimate range derived from published examples—not a measured value or statistical confidence interval.

- [Google: Measuring the environmental impact of delivering AI at Google Scale](https://services.google.com/fh/files/misc/measuring_the_environmental_impact_of_delivering_ai_at_google_scale.pdf)
- [OpenAI disclosure: The Gentle Singularity](https://blog.samaltman.com/the-gentle-singularity)
- [Mistral: Our contribution to a global environmental standard for AI](https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/)

Everyday comparisons adapt to the upper end of the displayed estimate range so that the output remains readable. They use:

- display assumptions of a 10W LED, 50W laptop, 15Wh phone charge, 100Wh to boil 1L of water, 250mL cup of water, 550mL water bottle, 6L toilet flush, and 8L/min shower;
- [US EPA average gasoline passenger vehicle emissions](https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle);
- [US EPA urban tree carbon sequestration methodology](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references).

The household values are display assumptions, not environmental measurement standards. Run `anti-ai explain` to see each formula. The tool reports how long one urban tree would need to sequester the carbon estimate; it does not claim an equivalent number of trees cut down.

## Privacy

- Runs locally and sends no log data over the network
- Retains only timestamp, message ID, model, and usage metadata while scanning
- Does not store or print prompts, responses, or tool-call content
- The default share card omits paths, model names, request counts, and exact token counts
- Creates no usage database and starts no background process; `creature` maintains one local growth file without exact usage

Do not attach real Codex or Claude Code logs to public issues. Use a minimal, redacted fixture instead.

## Development

```bash
git clone https://github.com/ppxu/anti-ai.git
cd anti-ai
npm test
npm run check
node ./bin/anti-ai.mjs --help
```

Tests exercise the public CLI through exit codes and stdout/stderr using synthetic JSONL fixtures.

## Architecture

- `bin/anti-ai.mjs`: minimal executable launcher
- `src/cli.mjs`: argument validation, command orchestration, help, and methodology
- `src/scanner.mjs`: Codex and Claude Code JSONL scanning and accounting
- `src/reporting.mjs`: receipts, resource estimates, everyday comparisons, and verdicts
- `src/creature.mjs`: mutation growth rules and local state
- `src/shared.mjs`: shared language and empty-usage primitives

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
