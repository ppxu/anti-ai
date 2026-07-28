---
name: anti-ai
description: Inspect and explain local Codex or Claude Code token usage with the anti-ai CLI. Use this skill whenever the user asks how many AI tokens they used, which models consumed them, wants daily/weekly/monthly AI usage, requests an AI resource or environmental receipt, asks for an AI-free streak, wants a privacy-safe resource or creature pathology share card, or asks about their token-fed mutation creature, generations, fossils, evolution choices, and living casebook—even when they do not mention anti-ai by name.
compatibility: Requires Node.js 20+ and the anti-ai CLI. Reads only local Codex and Claude Code usage metadata.
---

# anti-ai

Use the `anti-ai` CLI as the single source of truth for local token accounting and its satirical resource receipts. The CLI already handles log locations, Claude Code streaming deduplication, Codex model attribution, local time zones, and the distinction between exact usage and estimated resources.

## Preflight

1. Check whether the CLI is available:

   ```bash
   command -v anti-ai
   anti-ai --version
   ```

2. If it is missing, tell the user and offer this exact installation command:

   ```bash
   npm install -g anti-ai
   ```

   Do not silently install global software.

3. If usage is unexpectedly empty, run:

   ```bash
   anti-ai doctor
   ```

   Summarize whether each source is available, but do not expose absolute log paths unless the user explicitly asks.

## Choose the right workflow

### Exact data for an Agent

Use JSON when the user wants numbers, comparisons, model attribution, or data for another workflow:

```bash
anti-ai today --json
anti-ai today --date YYYY-MM-DD --source all --json
```

Treat `totals`, `sources`, and `models` as exact local log statistics. Keep the JSON field names unchanged; `--lang` affects only human-readable output.

### Human-readable receipt

Use the smallest report matching the question:

```bash
anti-ai today
anti-ai week
anti-ai month
```

Add `--date YYYY-MM-DD`, `--source codex|claude`, or `--lang zh|en` only when the user requests that scope. Do not run all three reports when one answers the question.

The complete-source human `week` report settles creature history and appends a living casebook with its primary symptom, Pollution/Clarity change, stage and generation growth, newly sealed fossils, new badges, and a deterministic attending note. The complete-source human `month` report appends a monthly autopsy with post-hatch observation totals, Ecology transition, generation growth, fossils, achievements, and a deterministic conclusion. Source-filtered reports remain usage-only so a partial source cannot reshape the complete creature history.

Daily verdicts are fixed local content, not model output. Each symptom combines seven charge titles with five detail lines, producing at least 35 deterministic combinations before an identical pair repeats; rotation continues across month boundaries.

### Privacy-safe SVG share card

Generate a share card as pure SVG on stdout:

```bash
anti-ai share > anti-ai-receipt.svg
anti-ai share --date YYYY-MM-DD --lang en > anti-ai-receipt.svg
anti-ai share --card pathology > anti-ai-pathology.svg
anti-ai share --card pathology --date YYYY-MM-DD --lang en > anti-ai-pathology.svg
```

The default card is a resource receipt. `--card pathology` uses the complete creature history and shows its stable specimen ID and ASCII, Ecology, form, life stage, epithet, and daily Ecology change. It rejects `--source` filters because a partial source must not reshape the creature.

Both card types intentionally omit prompts, responses, paths, model/source names, request counts, and exact token counts. Tell the user where the file was saved. Do not add sensitive details back into the card.

### Token mutation creature

Inspect the user's locally persisted mutation creature:

```bash
anti-ai creature
anti-ai creature --lang en
anti-ai creature --json
anti-ai creature evolve
anti-ai creature evolve <1|2|3>
anti-ai creature evolve --json
```

The creature backfills the latest 30 calendar days. Every settled day after hatching adds exactly one experience day, so spending more Tokens cannot accelerate its four life stages. Each generation lasts 90 experience days. Day 90 seals the current form as a permanent fossil; the next generation returns to embryo form, inherits one ability with a small permanent bonus, and carries a scar. Relative to the prior seven-calendar-day baseline, high use adds Pollution, low use adds Clarity, and an AI-free day adds more Clarity. Those values produce Unformed, Polluted, Lucid, or Paradox ecology after a three-day confirmation window; four usage pathologies still describe how the Token work shapes its body.

After the first fossil, `anti-ai creature evolve` shows three explicit choices:

1. POLLUTION strengthens a consumption-oriented ability, but creates more Pollution when it triggers.
2. CLARITY strengthens withdrawal-driven Clarity, but slows exposure recovery.
3. PARADOX increases the chance of rare mutations, but also risks Pollution.

Choose with `anti-ai creature evolve <1|2|3>`. A missed choice does not block the next generation, and a sealed choice cannot be changed. Evolution effects are ability-driven rather than guaranteed:

`min(35, 5 + floor(ability / 25) + 2 × unlocked talent count)%`

Talents increase both the benefit and the cost. When reporting an active evolution, include its trigger chance, cumulative proc count, benefit points, and cost points so the trade-off remains visible.

Its ASCII form is assembled deterministically from a stable local genome, life stage, usage pathology, ecology, achievement parts, and chromatic abilities. The first collection contains 16 form families and 24 achievements, split evenly across Offense, Sobriety, and Paradox. Repeatable achievements have three behavior-count tiers; meaningful appearance fingerprints are retained as private specimen records for a future codex. Do not describe high consumption as the primary or preferred upgrade route.

It also grows seven regular abilities from usage signals, AI-free days, seeded random gains, and events. Regular abilities cap at 999 and unlock mutation talents at 5, 15, 30, 100, 300, and 700; Instability raises the rare-event chance from 8% up to 20%. Six chromatic abilities can awaken independently on active days at R 0.50%, SR 0.10%, or SSR 0.02%, and repeated awakenings grow up to level 9.

When reporting a creature, summarize its specimen ID, generation, life stage and experience, latest fossil, inherited ability and scar, current evolution choice and benefit/cost totals, ecology and today's ecology gain, form and title, badges, level, dominant ability, temperament, mood, latest daily gains, newly visible talents, chromatic abilities, and rare-mutation chance. Describe this as a satirical growth system, not a resource measurement or productivity score, and do not imply that a high level is productive, healthy, or environmentally measured.

The creature state is stored at `~/.anti-ai/creature.json` with schema v5. It contains only discrete usage bands, derived ecology points, stable gene/part IDs, achievements, appearance fingerprints, pollution doses, traits, regular/chromatic ability gains, event IDs, permanent fossils, sealed evolution choices, and a local deterministic seed—never prompts, responses, paths, model names, exact Token totals, personal-baseline values, or request timestamps. Schema v1/v2/v3/v4 files migrate locally and idempotently. Do not open or edit the state file directly.

Only destroy the mutation history when the user explicitly asks to reset or restart it:

```bash
anti-ai creature reset
```

Do not pass `--source` to `creature`; one evolution history always uses the complete Codex and Claude Code data set.

### Methodology questions

When the user asks whether electricity, water, or carbon values are exact, run:

```bash
anti-ai explain
```

Describe environmental values as a **low-confidence estimate derived from public examples**, never as measured consumption. Do not recompute or tighten the ranges yourself.

## Privacy boundary

- Use the CLI instead of opening `~/.codex/sessions` or `~/.claude/projects` directly.
- Do not read raw logs, prompts, responses, tool calls, or project paths.
- Do not upload local usage data or generated cards without explicit user approval.
- Do not interpret token volume as productivity, code quality, or employee performance.

## Response style

Lead with the requested result, then mention the period and source filters used. Keep exact token statistics separate from resource estimates. Preserve the tool's satirical tone when the user wants a receipt, but use neutral language for audits or machine-readable requests.

## Skill installation reference

This repository is compatible with the open `skills` installer:

```bash
npx skills add ppxu/anti-ai --skill anti-ai
```
