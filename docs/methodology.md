# Methodology

English | [简体中文](./methodology.zh-CN.md)

This document separates what `anti-ai` can count locally from what it can only estimate through public references.

- **Token and model usage:** derived from local Agent metadata using source-specific rules.
- **Electricity, water, and carbon:** public reference cases, not local measurements.
- **Everyday translations:** transparent display conversions, not environmental standards.

The installed CLI is the executable source of truth:

```bash
anti-ai explain sources
anti-ai explain resources
anti-ai explain comparisons
```

## Local data sources

Default locations:

| Agent | Default path | Override |
|---|---|---|
| Codex | `~/.codex/sessions` | `ANTI_AI_CODEX_DIR` |
| Claude Code | `~/.claude/projects` | `ANTI_AI_CLAUDE_DIR` |
| OpenCode | `~/.local/share/opencode/opencode.db` | `ANTI_AI_OPENCODE_DB` |
| OpenClaw | `~/.openclaw/agents` | `ANTI_AI_OPENCLAW_DIR` |
| Hermes | `~/.hermes/state.db` | `ANTI_AI_HERMES_DB` |
| Pi | `~/.pi/agent/sessions` | `ANTI_AI_PI_DIR` |

Example override:

```bash
ANTI_AI_CODEX_DIR=/path/to/codex/sessions \
ANTI_AI_CLAUDE_DIR=/path/to/claude/projects \
ANTI_AI_OPENCODE_DB=/path/to/opencode.db \
ANTI_AI_OPENCLAW_DIR=/path/to/openclaw/agents \
ANTI_AI_HERMES_DB=/path/to/hermes/state.db \
ANTI_AI_PI_DIR=/path/to/pi/sessions \
anti-ai today
```

## Token accounting

### Codex

- Counts each `token_count.info.last_token_usage` snapshot.
- Attributes it to the most recent `turn_context.payload.model` in the same session.
- Treats cached input and reasoning output as displayed subsets; neither is added twice.

### Claude Code

- Reads `usage` from assistant messages.
- Deduplicates repeated streamed snapshots by `message.id` and keeps the most complete one.
- Reads the model from `message.model`.
- Includes ordinary input, cache reads, and cache creation in total input.

### OpenCode, OpenClaw, Hermes, and Pi

- **OpenCode:** reads assistant usage from the SQLite `message` or `session_message` table.
- **OpenClaw:** deduplicates assistant messages across active and `.reset.*` JSONL files; trajectory exports are excluded.
- **Hermes:** prefers `session_model_usage`, including auxiliary calls, then falls back to aggregate `sessions` rows. Those totals may span multiple days and are assigned to the session's last active day, so `doctor` labels the source `session approximate`.
- **Pi:** counts assistant, compaction, and branch-summary usage and deduplicates copied or forked sessions globally by entry ID.

OpenCode and Hermes use the optional `better-sqlite3` adapter. A missing or ABI-incompatible native build does not block the JSONL sources. An all-source report keeps healthy sources and prints a privacy-safe warning; explicitly selecting the broken SQLite source exits with an actionable error.

Records without a model field are grouped under `unknown`. Human reports show the five highest-Token source/model combinations; JSON preserves the complete breakdown.

## Public resource reference cases

Supported Agents do not provide measured per-request electricity, water, or carbon values to this tool. `anti-ai` calculates each named public case independently and selects the highest result for each resource. It does not combine incompatible boundaries into a fake range.

| Case | Published unit | Electricity | Water | Carbon | Boundary |
|---|---:|---:|---:|---:|---|
| Google | Median text prompt | 0.24 Wh | 0.26 mL | 0.03 gCO₂e | Production measurement including active accelerators, hosts, idle capacity, and data-center overhead |
| OpenAI | Average ChatGPT query | 0.34 Wh | 0.32176 mL | Not published | Model, request length, and complete measurement boundary were not published |
| Mistral | 400-output-Token Le Chat response using Large 2 | Not published | 45 mL | 1.14 gCO₂e | Lifecycle high-side case including upstream server manufacturing and excluding user devices |

Primary references:

- [Google — Measuring the environmental impact of delivering AI at Google Scale](https://services.google.com/fh/files/misc/measuring_the_environmental_impact_of_delivering_ai_at_google_scale.pdf)
- [OpenAI disclosure — The Gentle Singularity](https://blog.samaltman.com/the-gentle-singularity)
- [Mistral — Our contribution to a global environmental standard for AI](https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/)

Let `R` be model requests and `O` be output Tokens:

```text
electricity Wh = max(R × 0.24, R × 0.34)
water mL      = max(R × 0.26, R × 0.32176, O ÷ 400 × 45)
carbon gCO₂e  = max(R × 0.03, O ÷ 400 × 1.14)
```

The receipt names the case selected for each resource. Results are neither local measurements nor statistical confidence intervals. Actual requests can differ by orders of magnitude with model, context length, reasoning depth, hardware, batching, data center, and energy mix.

## Everyday translations

Reports always show five comparisons selected by period: small daily activities for `today`, medium activities for `week`, and large activities for `month`.

Let `E` be estimated electricity in Wh, `W` water in mL, and `C` carbon in gCO₂e:

| Period | Activity | Conversion | Basis |
|---|---|---|---|
| today | 10W LED light | `E ÷ 10` hours | Rounded display assumption |
| today | 19Wh phone charge | `E ÷ 19` charges | Rounded display assumption |
| today | 550mL drinking water | `W ÷ 550` bottles | Rounded display assumption |
| today | Water drop | `W ÷ 0.05` drops | Rounded display assumption |
| today | Average gasoline car | `C ÷ 244.2` km | U.S. EPA equivalency factor |
| week | Boil 1L water | `E ÷ 100` boils | Rounded 100Wh display assumption |
| week | 50W laptop | `E ÷ 50` hours | Rounded display assumption |
| week | 1kW microwave | `E ÷ 1,000` hours | Rounded display assumption |
| week | WaterSense shower | `W ÷ 7,600` minutes | EPA 2.0 gal/min maximum, approximately 7.6L/min |
| week | ENERGY STAR dishwasher | `W ÷ 12,100` cycles | Standard dishwasher maximum of 3.2 gal/cycle, approximately 12.1L |
| month | Average gasoline car | `C ÷ 244.2` km | U.S. EPA equivalency factor |
| month | One urban tree | `C ÷ 60,000 × 365 × 24` hours to absorb | U.S. EPA estimate of 0.060 metric ton CO₂/year |
| month | Competition pool | `W ÷ 2,500,000,000` pools | Rounded 2.5ML display assumption |
| month | U.S. household electricity day | `E ÷ 33,400` days | EPA 12,194kWh/year divided by 365 |
| month | Bathtub | `W ÷ 150,000` baths | Rounded 150L display assumption |

Official conversion references:

- [EPA WaterSense showerheads](https://www.epa.gov/watersense/showerheads)
- [ENERGY STAR dishwasher criteria](https://www.energystar.gov/products/dishwashers/key_product_criteria)
- [U.S. EPA greenhouse-gas equivalencies calculations and references](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references)

Rounded consumer-item values exist to make scale legible; they are not environmental measurement standards. Values below `0.01` of a large activity are shown as “times short” instead of rounding to `0.00`.

The tree comparison reports how long one urban tree would need to sequester the estimate. It does **not** claim that a number of trees were cut down.

## Privacy and reproducibility

Scanning retains only the metadata required to aggregate timestamp, message identity, model, and usage. It does not store or print prompts, responses, or tool-call content, and it creates no persistent usage index. Selected sources scan concurrently. A request-local session scans only dates missing from its current in-memory result when report and settlement ranges overlap; reuse ends with the command or confirmed TUI action. Codex JSONL parsing decodes only bounded usage/model candidates, so oversized unrelated records are skipped rather than materialized as conversation text.

When an interactive terminal scan outlasts a short delay, stderr shows a localized activity indicator. The indicator is disabled for JSON, non-interactive stderr, and the TUI, and it never enters report data.

For reproducible machine processing, use `--json`; for the exact methodology embedded in an installed version, use `anti-ai explain`. The public constants and selection logic live in [`src/methodology.mjs`](../src/methodology.mjs) and the display conversions in [`src/comparisons.mjs`](../src/comparisons.mjs).
