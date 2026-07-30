---
name: anti-ai
description: Inspect and explain local Codex, Claude Code, OpenCode, OpenClaw, Hermes, or Pi token usage with the anti-ai CLI. Use this skill whenever the user asks how many AI tokens they used, which models consumed them, wants daily/weekly/monthly AI usage, requests an AI resource or environmental receipt, asks for an AI-free streak, wants a privacy-safe resource, specimen, wanted, pathology, fossil, encounter, prognosis, or culture share card, wants to exchange a pollution code or run a local mutation encounter, or asks about their token-fed mutation creature, pollution laboratory, private codex, collections, generations, fossils, evolution choices, turning-point cases, prognosis, or living casebook—even when they do not mention anti-ai by name.
compatibility: Requires Node.js 20+ and the anti-ai CLI. Reads only local usage metadata from supported Agent JSONL or SQLite stores.
---

# anti-ai

Use the `anti-ai` CLI as the single source of truth for local token accounting and its satirical resource receipts. The CLI already handles source locations, JSONL/SQLite formats, deduplication, model attribution, local time zones, and the distinction between local usage accounting and named public resource references.

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

Treat `totals`, `sources`, and `models` as local usage accounting. Codex, Claude Code, OpenCode, OpenClaw, and Pi use message/entry dates; Hermes aggregates may span a session and are assigned to its last active day, so call Hermes date attribution approximate. Keep the JSON field names unchanged; `--lang` affects only human-readable output.

### Human-readable receipt

Use the smallest report matching the question:

```bash
anti-ai today
anti-ai week
anti-ai month
```

Add `--date YYYY-MM-DD`, `--source codex|claude|opencode|openclaw|hermes|pi`, or `--lang zh|en` only when the user requests that scope. Do not run all three reports when one answers the question. Use `anti-ai help <command>` before guessing a command-specific option.

The complete-source human `week` report settles creature history and appends a living casebook with its primary symptom, Pollution/Clarity change, stage and generation growth, newly sealed fossils, new badges, collection discoveries, and a deterministic attending note. The complete-source human `month` report appends a monthly follow-up with post-hatch observation totals, Ecology transition, generation growth, fossils, achievements, collection discoveries, and a deterministic conclusion. Complete-source `today` also surfaces that day's collection discoveries. Source-filtered reports remain usage-only so a partial source cannot reshape the complete creature history.

Daily verdicts are fixed local content, not model output. Each symptom combines eleven charge titles with thirteen detail lines, producing 143 deterministic combinations; rotation continues across month boundaries.

### Privacy-safe SVG share card

Generate a share card as pure SVG on stdout:

```bash
anti-ai share > anti-ai-receipt.svg
anti-ai share --date YYYY-MM-DD --lang en > anti-ai-receipt.svg
anti-ai share --card pathology > anti-ai-pathology.svg
anti-ai share --card pathology --date YYYY-MM-DD --lang en > anti-ai-pathology.svg
anti-ai share --card specimen > anti-ai-specimen.svg
anti-ai share --card wanted > anti-ai-wanted.svg
anti-ai share --card fossil > anti-ai-fossil.svg
anti-ai share --card encounter --with <pollution-code> > anti-ai-encounter.svg
anti-ai share --card prognosis > anti-ai-prognosis.svg
anti-ai share --card culture --id <culture-id> > anti-ai-culture.svg
```

The default card is a resource receipt. `--card pathology` shows a clinical snapshot, `--card specimen` shows the current collected form, `--card wanted` turns the current mutation into a satirical poster, `--card fossil` certifies the latest permanent fossil, `--card encounter` shows a local contact accident, `--card prognosis` shows the current three-choice case without prediction percentages, and `--card culture` renders the latest or selected laboratory culture. A fossil certificate is unavailable until the first 90-day generation is sealed. Prognosis is unavailable until a turning-point case exists, and culture is unavailable until something has been incubated. All creature cards use the complete history and reject `--source` filters because a partial source must not reshape the creature.

All card types intentionally omit prompts, responses, paths, model/source names, request counts, exact token counts, and pollution codes. Tell the user where the file was saved. Do not add sensitive details back into the card.

### Local mutation encounter

Use the pollution-code workflow when the user wants to compare, mix, exchange, or collect mutations from different machines:

```bash
anti-ai creature export
anti-ai creature export --json
anti-ai encounter <pollution-code>
anti-ai encounter <pollution-code> --save
anti-ai encounter <pollution-code> --json
```

Ask the other person to share only their `AA1...` pollution code. Do not ask for a creature state file or raw Agent logs. The code contains protocol/version and derived appearance IDs, not exact Tokens, models, paths, prompts, responses, or request timestamps.

The encounter is deterministic and local: the same two appearance fingerprints produce the same incident ID, contact type, and hybrid; the selected date determines compute weather. It settles the normal local creature history through that date but does not collect the hybrid unless the user explicitly requests `--save`. Saving is idempotent and adds one foreign specimen to the codex without changing growth, experience, abilities, scores, or Token incentives.

Treat pollution codes as public and untrusted. The checksum detects damage but is not proof of identity. Do not describe encounters as combat, compare Token power, invent winners, upload codes, or encourage more Token use.

### Pollution laboratory

Use the laboratory when the user wants to combine collected evidence into a new, privacy-safe culture:

```bash
anti-ai lab
anti-ai lab --json
anti-ai lab incubate <1|2|3>
anti-ai lab shelf
anti-ai lab shelf --full
anti-ai lab shelf --json
anti-ai lab inspect <culture-id>
anti-ai lab inspect <culture-id> --json
anti-ai share --card culture --id <culture-id>
```

The laboratory references only three kinds of already-derived material: saved foreign specimens, permanent fossils, and selected turning-point case slices. It never reads raw logs for a recipe. The same local state, selected date, and batch produce the same three deterministic formulas; a successful incubation advances the batch so the next set changes.

Show the three formulas and let the user decide. Never choose an incubation slot on their behalf unless they explicitly ask. Incubation appends one culture to the private shelf; referenced materials are not consumed or rewritten. A culture adds collection variety only: it does not change creature growth, experience, abilities, ecology, scores, or create a Token-powered shortcut.

### Private pathology codex

Use the codex when the user asks what they have collected, what was discovered today, or wants stable machine-readable collection data:

```bash
anti-ai codex
anti-ai codex --date YYYY-MM-DD --lang en
anti-ai codex --json
```

The codex derives 50 fixed collection entries from the existing schema v9 state: 16 form families, 24 achievements, 6 chromatic abilities, and 4 generation scars. Human output reveals discovered names while locked entries remain `???`. It also lists private dynamic specimens, foreign specimens, permanent fossils, selected case slices, and laboratory cultures. JSON keeps stable IDs, discovery booleans and dates, counts, and the selected day's `recent` discoveries; `--lang` never changes JSON keys or IDs.

Do not pass `--source` to `codex`. It settles the same complete supported-source creature history as `creature`. Summarize progress without encouraging Token spending: Pollution, Clarity, AI-free behavior, rare chance, generations, and explicit choices all create independent collection routes.

### Token mutation creature

Inspect the user's locally persisted mutation creature:

```bash
anti-ai creature
anti-ai creature --lang en
anti-ai creature --json
anti-ai creature evolve
anti-ai creature evolve <1|2|3>
anti-ai creature evolve --json
anti-ai creature history
anti-ai creature history --full
anti-ai creature prognosis
anti-ai creature intervene
anti-ai creature intervene <1|2|3>
```

The creature backfills the latest 30 calendar days. Every settled day after hatching adds exactly one experience day, so spending more Tokens cannot accelerate its four life stages. Each generation lasts 90 experience days. Day 90 seals the current form as a permanent fossil; the next generation returns to embryo form, inherits one ability with a small permanent bonus, and carries a scar. Relative to the prior seven-calendar-day baseline, high use adds Pollution, low use adds Clarity, and an AI-free day adds more Clarity. Those values produce Unformed, Polluted, Lucid, or Paradox ecology after a three-day confirmation window; four usage pathologies still describe how the Token work shapes its body.

After the first fossil, `anti-ai creature evolve` shows three explicit choices:

1. POLLUTION strengthens a consumption-oriented ability, but creates more Pollution when it triggers.
2. CLARITY strengthens withdrawal-driven Clarity, but slows exposure recovery.
3. PARADOX increases the chance of rare mutations, but also risks Pollution.

Choose with `anti-ai creature evolve <1|2|3>`. A missed choice does not block the next generation, and a sealed choice cannot be changed. Evolution effects are ability-driven rather than guaranteed:

`min(35, 5 + min(10, floor(lifetime ability / 25)) + 2 × unlocked talent count + 2 × malignancy rank)%`

Talents increase both the benefit and the cost. When reporting an active evolution, include its trigger chance, cumulative proc count, benefit points, and cost points so the trade-off remains visible.

Every 14 experience days may offer at most one turning-point case selected locally from 12 case skeletons. `anti-ai creature intervene` shows three routes—POLLUTION, CLARITY, and PARADOX—and every route has both a benefit and a cost. Seal a route only when the user explicitly asks by running `anti-ai creature intervene <1|2|3>`; never choose on their behalf. A pending case blocks additional case offers, so the system never creates a choice backlog.

Use `anti-ai creature history` for a compressed key-event timeline and add `--full` only when the user asks for the privacy-safe daily course. Use `anti-ai creature prognosis` for three explainable directional previews. Treat LEADING, POSSIBLE, and LATENT as qualitative labels with no precise probabilities, prediction guarantee, quest, or reward promise. A selected route changes later prognosis context and the collected case slice, but does not grant Token-powered combat strength.

Its ASCII form grows on one continuous four-stage Reactor Kaiju anatomy. A stable local genome controls eyes, jaw, armor, reactor core, limbs, tail, and chest pattern; life stage, usage pathology, ecology, scars, achievement parts, and chromatic abilities keep reshaping that skeleton. The codex contains 50 fixed collection entries: 16 form families, 24 achievements split evenly across Offense, Sobriety, and Paradox, 6 chromatic abilities, and 4 scars. Repeatable achievements have three behavior-count tiers; meaningful appearance fingerprints are retained as private dynamic specimens. Do not describe high consumption as the primary or preferred upgrade route.

It also grows seven regular abilities from usage signals, AI-free days, seeded random gains, and events. Visible ability values cycle through 1–255; point 256 becomes `MALIGNANT I · 1/255` while lifetime totals remain lossless. Mutation talents unlock at 5, 15, 30, 60, 120, and 220. Each malignancy rank adds two percentage points to the associated evolution proc chance, and permanent fossils retain per-generation gains, the sealed ability snapshot, and malignancy changes. Instability raises the rare-event chance from 8% up to 20%. Six chromatic abilities can awaken independently on active days at R 0.50%, SR 0.10%, or SSR 0.02%, and repeated awakenings grow up to level 9.

When reporting a creature, summarize its specimen ID, generation, life stage and experience, latest fossil, inherited ability and scar, current evolution choice and benefit/cost totals, ecology and today's ecology gain, form and title, badges, level, dominant ability, temperament, mood, latest daily gains, newly visible talents, chromatic abilities, and rare-mutation chance. Describe this as a satirical growth system, not a resource measurement or productivity score, and do not imply that a high level is productive, healthy, or environmentally measured.

The creature state is stored at `~/.anti-ai/creature.json` with schema v9. It contains only discrete usage bands, derived ecology points, stable gene/part IDs, achievements, appearance fingerprints, pollution doses, traits, regular/chromatic ability gains, event IDs, permanent fossils with derived ability snapshots, sealed evolution choices, turning-point case IDs with privacy-safe triggers and selections, saved foreign encounters as derived appearance IDs, derived laboratory cultures and their ingredient references, and a local deterministic seed—never prompts, responses, paths, model names, exact Token totals, personal-baseline values, or request timestamps. Schema v1-v8 files migrate locally and idempotently without inventing choices or cultures. Do not open or edit the state file directly.

Only destroy the mutation history when the user explicitly asks to reset or restart it:

```bash
anti-ai creature reset
```

Do not pass `--source` to `creature`, `codex`, or `lab`; one evolution and collection history always uses the complete supported-source data set.

### Methodology questions

When the user asks whether electricity, water, or carbon values are exact, run:

```bash
anti-ai explain resources
```

Describe environmental values as **named public high-side references**, never as measured local consumption or a statistical range. Do not recompute, average, or combine the vendor cases yourself.

## Privacy boundary

- Use the CLI instead of opening any supported Agent JSONL or SQLite store directly.
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
