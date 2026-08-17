---
name: anti-ai
description: Inspect and explain local Codex, Claude Code, OpenCode, OpenClaw, Hermes, or Pi token usage with the anti-ai CLI. Use this skill whenever the user asks how many AI tokens they used, which models consumed them, wants daily/weekly/monthly AI usage, requests an AI resource or environmental receipt, asks for an AI-free streak or Token-metabolism pattern, wants a privacy-safe resource, briefing, specimen, wanted, pathology, fossil, encounter, prognosis, culture, companion, habitat, expedition, or dossier share card, wants to exchange a pollution code, manage a local Visitor Archive or Habitat stay, run a local mutation encounter, use or configure the interactive console or macOS desktop specimen, or asks about their token-fed mutation creature, Token Metabolic Clinic, passive study, daily containment broadcast, mutation chronicle, pathology sets, containment expeditions, pollution laboratory, symbiotic companion, containment habitat, containment incidents, private codex, collections, generations, fossils, evolution choices, turning-point cases, prognosis, or living casebook—even when they do not mention anti-ai by name.
compatibility: Requires Node.js 22+ and the anti-ai CLI. Reads only local usage metadata from supported Agent JSONL or optional SQLite stores.
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

### macOS desktop specimen

The native macOS companion is human-facing and local-only. After installing the CLI and desktop app, the user must explicitly create its one-shot bridge and first privacy-safe snapshot:

```bash
anti-ai desktop link
anti-ai desktop status
anti-ai desktop refresh
```

`desktop status` is read-only. `desktop link` records the current absolute Node and CLI entry paths; `desktop refresh` performs the normal current-day settlement and atomically replaces `~/.anti-ai/desktop/snapshot-v1.json`. Do not edit either desktop JSON file, invent paths, invoke the native menu, or change its update preference on the user's behalf. The snapshot omits exact Tokens, models, sources, paths, and conversation content. The native app displays missing, invalid, incompatible, stale, refreshing, and failed states explicitly, preserves the previous valid specimen after refresh failure, and uses only fixed one-shot refresh/TUI bridge actions—never a daemon or telemetry. A human may click the unlocked specimen for a non-activating snapshot insight, drag it, or double-click to open one allowlisted TUI area; locking keeps the whole panel click-through. Its isolated updater checks only a signed HTTPS desktop feed after manual action or explicit opt-in, uploads no product data, and never updates the separately installed npm CLI.

### Human-only interactive console

`anti-ai tui` is a human-only keyboard interface for a person sitting at an interactive terminal. Do not invoke it from an Agent, subprocess pipe, automation, or a workflow that needs parseable output. Use explicit commands and `--json` instead.

If the user explicitly asks to open or explore the local console, tell them to run:

```bash
anti-ai tui
anti-ai tui --area habitat
anti-ai tui --no-motion
```

Browsing, inspection, replay, archive navigation, provenance lookup, share preview, and cancellation read only the already-settled Creature file. The five areas are Overview, Habitat, Expedition, Laboratory, and Codex; `--area overview|habitat|expedition|laboratory|codex` selects the initial area, while `2` and `3` navigate to Habitat and Expedition after launch. Overview opens with a deterministic Daily Containment Broadcast: system status, current Token-metabolism diagnosis, one prioritized change, a separate collection update, the Living Habitat reaction, and at most one recommended response. Press `e` to expand or collapse the complete specimen, pathology, milestone, Clinic, 7/30/90-day Chronicle, generation comparison, constellation, and action file. The Clinic does not add a sixth area. The Action Center can preview and start one passive study when none is active. The broadcast is not modal, so `1`–`5` always switch areas. Habitat presents one deterministic Living Habitat scene with environment, specimen pose, relationship context, latest existing trace, and satirical bulletin. In Codex, `h` opens the nested Containment Archive, `t` toggles the latest 7/30 days, and `Enter` opens a daily record; collection details expose first discovery, provenance, related record, and Cabinet status without revealing locked names or conditions. Twelve presentation-only Pathology Constellations form a three-route star map and cannot occupy the Cabinet; Legendary names remain concealed until two same-route diagnoses are complete. Pressing `a` opens the complete action center. Daily settlement, passive-study start, incident responses, turning-case interventions, generation evolution, incubation, bonding, display changes, and Expedition abandonment keep a preview-confirm flow. Focused Expedition start, ordinary advance, and branch controls execute from the selected item plus `Enter`, use the same local action service, and ignore repeated input while a write is in flight. Pressing `s` from Overview, Habitat, Expedition, a discovered Codex detail, or a daily archive detail previews an existing privacy-safe SVG card and its complete target path; Overview prepares the `briefing` card, while explicit `dossier` exports retain the long-course file. Confirmation writes only that file and never overwrites an existing one. TUI exports prefer the launch directory and fall back to `~/.anti-ai/exports` when it is not writable. Laboratory also exposes existing culture actions contextually: `Tab` switches between formulas and the full culture shelf, `Enter` incubates or inspects, and `b` previews bonding. An empty Habitat bay reports the next material → culture → companion step; `l` opens Laboratory and `b` opens bonding when a culture exists. Completing a bond returns to Habitat and exposes its stable bond trace. Pollution-code input remains an explicit `encounter --save` CLI workflow. Daily-settlement preview may scan supported usage metadata without writing; only confirmation performs the action through the same local service used by explicit CLI commands. Its low-rate ASCII motion is ephemeral: `m` cycles motion levels and `--no-motion` starts fully static, including the route-aware Habitat weather. In Habitat, `Enter` opens read-only anatomy inspection and `r` replays the latest sealed ecological event. Never drive or automate these interactive choices as an Agent.

### Exact data for an Agent

Use JSON when the user wants numbers, comparisons, model attribution, or data for another workflow:

```bash
anti-ai today --json
anti-ai today --date YYYY-MM-DD --source all --json
```

Treat `totals`, `sources`, and `models` as local usage accounting. Codex, Claude Code, OpenCode, OpenClaw, and Pi use message/entry dates; Hermes aggregates may span a session and are assigned to its last active day, so call Hermes date attribution approximate. Keep the JSON field names unchanged; `--lang` affects only human-readable output.

### Token Metabolic Clinic

Use the read-only Clinic when the user asks about Token-use patterns, unusual changes, or a passive study:

```bash
anti-ai clinic --json
anti-ai clinic --date YYYY-MM-DD --source all --json
anti-ai clinic history
```

The Clinic describes usage-metadata correlations, not health, causality, productivity, code quality, or personal ability. It compares the selected day with up to 14 prior active days inside a 31-day window; relative rules require at least three comparable samples. Keep `fieldsUsed`, `sourcesUsed`, `excludedSources`, `baselineActiveDays`, `provisional`, and `limitations` visible when explaining a result. A missing field is not zero. Request-level semantics are compared inside each source; exact model names never appear in Clinic output or state.

Do not start a study unless the user explicitly selects one of these protocols:

```bash
anti-ai clinic start <cache-rehab|context-diet|load-recovery>
```

The protocols last 7, 14, and 30 calendar days. Missed days never reset, punish, or extend them. Completion is derived locally the next time the CLI or TUI opens; there is no check-in, daemon, network call, or notification. A study seal does not change abilities, experience, Ecology, rarity, collection progress, companion growth, Expedition opportunities, or Token rewards. `clinic` and `clinic history` are read-only; only the explicit start action writes stable protocol/date IDs. Never choose a protocol on the user's behalf.

### Human-readable receipt

Use the smallest report matching the question:

```bash
anti-ai today
anti-ai week
anti-ai month
```

Add `--date YYYY-MM-DD`, `--source codex|claude|opencode|openclaw|hermes|pi`, or `--lang zh|en` only when the user requests that scope. Do not run all three reports when one answers the question. Use `anti-ai help <command>` before guessing a command-specific option.

The complete-source human `week` report settles creature history and appends a living casebook with its primary symptom, Pollution/Clarity change, stage and generation growth, newly sealed fossils, new badges, collection discoveries including resolved incident reports, a deterministic attending note, and the current containment relationship plus period events. The complete-source human `month` report appends a monthly follow-up with post-hatch observation totals, Ecology transition, generation growth, fossils, achievements, collection discoveries including resolved incident reports, habitat events, and a deterministic conclusion. Complete-source `today` also surfaces that day's collection discoveries and one current habitat observation. Source-filtered reports remain usage-only so a partial source cannot reshape the complete creature history.

Daily verdicts are fixed local content, not model output. Each symptom combines eleven charge titles with thirteen detail lines, producing 143 deterministic combinations; rotation continues across month boundaries.

### Privacy-safe SVG share card

Generate a share card as pure SVG on stdout:

```bash
anti-ai share > anti-ai-receipt.svg
anti-ai share --date YYYY-MM-DD --lang en > anti-ai-receipt.svg
anti-ai share --card pathology > anti-ai-pathology.svg
anti-ai share --card pathology --date YYYY-MM-DD --lang en > anti-ai-pathology.svg
anti-ai share --card briefing > anti-ai-briefing.svg
anti-ai share --card specimen > anti-ai-specimen.svg
anti-ai share --card wanted > anti-ai-wanted.svg
anti-ai share --card fossil > anti-ai-fossil.svg
anti-ai share --card encounter --with <pollution-code> > anti-ai-encounter.svg
anti-ai share --card prognosis > anti-ai-prognosis.svg
anti-ai share --card culture --id <culture-id> > anti-ai-culture.svg
anti-ai share --card companion > anti-ai-companion.svg
anti-ai share --card habitat > anti-ai-habitat.svg
anti-ai share --card expedition > anti-ai-expedition.svg
anti-ai share --card dossier > anti-ai-dossier.svg
```

The default card is a resource receipt. `--card briefing` renders the selected day's system status, diagnosis, prioritized change, collection update, Habitat reaction, and one recommended response. `--card pathology` shows a clinical snapshot, `--card specimen` shows the current collected form, `--card wanted` turns the current mutation into a satirical poster, `--card fossil` certifies the latest permanent generation, `--card encounter` shows a local contact accident, `--card prognosis` shows the current three-choice case without prediction percentages, `--card culture` renders the latest or selected laboratory culture, `--card companion` renders the currently bonded growth file, `--card habitat` renders the combined containment scene, `--card expedition` renders the current or latest eligible run, and `--card dossier` combines the Chronicle diagnosis, 30-day course, generation comparison, and completed set stamps. An explicit briefing export may derive the selected date in memory without persisting it. A fossil certificate is unavailable until the first 90-day generation is sealed. Prognosis is unavailable until a turning-point case exists, culture is unavailable until something has been incubated, and companion is unavailable until a culture has been bonded. Habitat cards may render an empty companion bay. Historical expedition and dossier cards exclude later records. All creature cards use the complete history and reject `--source` filters because a partial source must not reshape the creature.

All card types intentionally omit prompts, responses, paths, model/source names, request counts, exact token counts, and pollution codes. Tell the user where the file was saved. Do not add sensitive details back into the card.

### Local mutation encounter

Use the pollution-code workflow when the user wants to compare, mix, exchange, or collect mutations from different machines:

```bash
anti-ai creature export
anti-ai creature export --json
anti-ai encounter <pollution-code>
anti-ai encounter <pollution-code> --save
anti-ai encounter <pollution-code> --json
anti-ai encounter visitors
anti-ai encounter host <foreign-specimen-id>
anti-ai encounter release
```

Ask the other person to share only their `AA1...` pollution code. Do not ask for a creature state file or raw Agent logs. The code contains protocol/version and derived appearance IDs, not exact Tokens, models, paths, prompts, responses, or request timestamps.

The encounter is deterministic and local: the same two appearance fingerprints produce the same incident ID, contact type, and hybrid; the selected date determines compute weather. It settles the normal local creature history through that date but does not collect the hybrid unless the user explicitly requests `--save`. Saving is idempotent and adds one foreign specimen to the codex without changing growth, experience, abilities, scores, or Token incentives.

Treat pollution codes as public and untrusted. The checksum detects damage but is not proof of identity. Do not describe encounters as combat, compare Token power, invent winners, upload codes, or encourage more Token use.

Use `encounter visitors` for the read-only local archive. Host or release only when the user explicitly asks for that exact state change. One saved foreign specimen may occupy the Habitat visitor bay at a time; repeated host/release calls are idempotent, and historical views use admission/release dates. Cohabitation stages advance by natural date and derive only route-balanced relationship copy, visitor bulletins, and joint exhibits—never experience, abilities, Ecology, companion imprints, rarity, collection odds, Expedition opportunities, or Token rewards.

For a human-operated flow, `anti-ai tui` area `2` exposes the same workflow under `v`: `i` pastes an AA1 code, `Enter` validates and previews it read-only, and `Enter`/`y` explicitly saves the derived encounter. Archived visitors can then be hosted with `Enter` or released with `x`. Do not paste or confirm on the user's behalf. Oversized, malformed, tampered, self, and invalid-payload inputs must fail without a write, and the pollution code must never enter persisted state.

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
anti-ai lab bond <culture-id>
anti-ai lab companion
anti-ai lab companion --full
anti-ai lab companion --json
anti-ai share --card culture --id <culture-id>
anti-ai share --card companion
```

The laboratory references only three kinds of already-derived material: saved foreign specimens, permanent fossils, and selected turning-point case slices. It never reads raw logs for a recipe. The same local state, selected date, and batch produce the same three deterministic formulas; a successful incubation advances the batch so the next set changes.

Show the three formulas and let the user decide. Never choose an incubation slot on their behalf unless they explicitly ask. Incubation appends one culture to the private shelf; referenced materials are not consumed or rewritten. A culture adds collection variety only: it does not change creature growth, experience, abilities, ecology, scores, or create a Token-powered shortcut.

`lab bond <culture-id>` turns one sealed culture into the active symbiotic companion. Switching later preserves every former companion and its growth. `lab bond` and `lab companion` settle an unseen date through the same complete-source local usage-metadata accounting as `creature`; the companion card derives that date in memory without saving it. Neither path reads conversation content. The active companion receives exactly one imprint per observed day; heavy, restrained, and AI-free days grow it at the same rate while shaping different directions: Pollution, Clarity, or neutral evidence. Relative imprint balance produces POLLUTION, CLARITY, or PARADOX instead of rewarding raw volume.

Companion growth uses three visible stages: PARASITIC HATCHLING on days 1–6, SYMBIOTIC ABERRATION on days 7–20, and ACCOMPLICE ORGAN from day 21 onward. Days 7 and 21 deterministically seal rare anomalies and reshape its ASCII form; repeated commands cannot reroll them. Use `lab companion` for the compact file and `--full` for its fingerprint and privacy guardrail. Companion growth is narrative and visual only: it grants no numeric creature benefit, score, ability, combat power, or Token incentive.

### Containment habitat

Use the habitat when the user wants to see the main Creature, active companion, collection traces, and their current relationship as one scene:

```bash
anti-ai creature habitat
anti-ai creature habitat --full
anti-ai creature habitat --json
anti-ai share --card habitat > anti-ai-habitat.svg
```

`creature habitat` is a read-only snapshot. It may derive the selected day's complete-source Creature in memory, but it never creates, migrates, settles, or rewrites the state file. `--full` expands sealed ecological incidents; JSON keeps language-neutral IDs. The JSON `scene` object is the shared source for terminal, TUI, and Habitat SVG presentation.

The habitat also presents the three-slot Consequence Cabinet. Display changes are explicit collection curation only: they grant no score, growth, rarity, or Token reward.

The Living Habitat contains 15 deterministic scene archetypes and 30 bilingual satirical bulletins, balanced five scenes and ten bulletins per Pollution, Clarity, and Paradox route. Environment, discrete-day specimen pose, relationship context, one latest existing trace, and a chamber cycle are layered without adding state. Trace precedence is deterministic across interactions, Expeditions, incidents, bonds, cultures, cases, and ecological events; it must not be interpreted as a new reward or task.

One deterministic event is derived per seven experience days from discrete Ecology gains, the companion route, the local seed, and existing derived collection counts. Pollution, Clarity, and Paradox each have ten events, eight relationship diagnoses, eight decorations, and twelve duo titles. Token volume cannot accelerate or reroll the cadence or Living Habitat scene. Repeated views, language, terminal width, motion, and card generation change no growth, imprints, power, rarity, score, or rewards.

### Containment expedition

Default to read-only status or history when the user asks about Expeditions:

```bash
anti-ai expedition
anti-ai expedition --json
anti-ai expedition history
anti-ai expedition history --json
```

Do not start, advance, choose, or abandon a run on the user's behalf unless they explicitly request that exact state-changing action. Starting also requires an explicit destination: `context_mine`, `cache_swamp`, `request_nest`, or `reactor_graveyard`. A branch requires the user's explicit `1`, `2`, or `3`; never choose a preferred stat outcome for them.

```bash
anti-ai expedition start <destination>
anti-ai expedition next
anti-ai expedition choose <1|2|3>
anti-ai expedition abandon
```

Each local calendar day offers at most one ten-cell run, independent of Creature settlement. Opportunities do not stack; skipping has no penalty, while an old date expires after the file advances to a newer settled or Expedition date. Exiting pauses the sealed run. Completing or abandoning an older run on a later date leaves the later date's opportunity available. Abandonment cannot reroll the plan and preserves effects or artifacts already reached.

The event plan is deterministic from private derived state. Repeated views, language, date, terminal width, motion, and Token volume change neither the sequence nor collection odds. A complete run contains two empty cells, two observations, two temporary conditions, one permanent adjustment, one three-way branch, and two wildcards. Permanent adjustment is normally `+1` or `-1`; a 1% named side effect becomes `+2` or `-2`. This is satire and collection, not optimization advice.

Human CLI, TUI, and Expedition SVG output use the same visible Quiet Cell, Field Event, Condition Shift, and Special Event hierarchy. Completing or abandoning produces a derived return summary with event counts, the recent trail, artifacts, achievements, permanent and expired temporary effects, and a deterministic satirical diagnosis. It does not add state or rewards.

The Codex adds 24 fixed artifacts and 12 fixed Expedition achievements. They grant no combat power, score, additional opportunity, rarity bonus, or Token reward. Status, history, Codex, and share views are read-only and historical dates exclude later runs. Public JSON and SVG omit the internal plan hash and unopened event sequence.

### Private pathology codex

Use the codex when the user asks what they have collected, what was discovered today, or wants stable machine-readable collection data:

```bash
anti-ai codex
anti-ai codex --date YYYY-MM-DD --lang en
anti-ai codex --set set_licensed_overfeed
anti-ai codex --json
```

The codex derives 134 fixed collection entries from the existing schema v16 state: 16 form families, 36 achievements, 12 chromatic abilities, 4 generation scars, 30 habitat phenomena, 24 Expedition artifacts, and 12 Expedition achievements. Human output reveals discovered names while locked entries remain `???`. It also lists private dynamic specimens, foreign specimens, permanent fossils, selected case slices, laboratory cultures, bonded companions, and resolved incident reports. Twelve route-balanced Pathology Constellations derive progress from those existing discoveries and sit outside the fixed denominator. Each has four deterministic case phases. A Legendary name and exact requirements stay concealed until two same-route diagnoses are complete; before reveal, expose broad evidence domains only. `anti-ai codex --set <set-id>` focuses one constellation. Completing one reveals only its stamp and presentation copy. JSON keeps stable IDs, discovery booleans and dates, counts, derived `collectionSets`, optional `focusedCollectionSet`, derived `collectionPhenotype`, the selected day's `recent` discoveries, and the three language-neutral `cabinet.featured` keys; `--lang` never changes JSON keys or IDs.

Do not pass `--source` to `codex`. It derives a read-only snapshot from the complete supported-source history and never persists the in-memory result. Summarize progress without encouraging Token spending: Pollution, Clarity, AI-free behavior, rare chance, generations, explicit choices, and route-balanced habitat events all create independent collection routes.

In the interactive console, Codex navigation is category → entry → detail. `d` opens an explicit display preview for a discovered entry. `o` observes the main specimen and `c` contacts the bonded companion; each is available at most once per settled day and produces deterministic narrative text with no numeric effect. Never drive those interactive choices on the user's behalf.

### Token mutation creature

Inspect the user's locally persisted mutation creature:

```bash
anti-ai creature
anti-ai creature --lang en
anti-ai creature --json
anti-ai creature habitat
anti-ai creature evolve
anti-ai creature evolve <1|2|3>
anti-ai creature evolve --json
anti-ai creature history
anti-ai creature history --full
anti-ai creature chronicle
anti-ai creature chronicle --json
anti-ai creature prognosis
anti-ai creature intervene
anti-ai creature intervene <1|2|3>
anti-ai creature incident
anti-ai creature incident <1|2|3>
```

The creature backfills the latest 30 calendar days. Every settled day after hatching adds exactly one experience day, so spending more Tokens cannot accelerate its four life stages. Each generation lasts 90 experience days. Day 90 seals the current form as a permanent fossil; the next generation returns to embryo form, inherits one ability with a small permanent bonus, and carries a scar. Growth balance v2 compares an active day with the median of up to 28 prior non-zero days: high use adds Pollution, low use adds Clarity, and an AI-free day adds more Clarity without lowering the baseline. Dose 75+ applies at least one point of negative Pollution pressure, but it never grants an extra ability point or faster stage growth. Lifetime Pollution and Clarity stay in the history while the latest 28 experience days produce the current Unformed, Polluted, Lucid, or Paradox Ecology after a three-day confirmation window; four usage pathologies still describe how the Token work shapes its body.

After the first fossil, `anti-ai creature evolve` shows three explicit choices:

1. POLLUTION strengthens a consumption-oriented ability, but creates more Pollution when it triggers.
2. CLARITY strengthens withdrawal-driven Clarity, but slows exposure recovery.
3. PARADOX increases the chance of rare mutations, but also risks Pollution.

Choose with `anti-ai creature evolve <1|2|3>`. A missed choice does not block the next generation, and a sealed choice cannot be changed. Evolution effects are ability-driven rather than guaranteed:

`min(35, 5 + min(10, floor(lifetime ability / 25)) + 2 × unlocked talent count + 2 × malignancy rank)%`

Talents increase both the benefit and the cost. When reporting an active evolution, include its trigger chance, cumulative proc count, benefit points, and cost points so the trade-off remains visible.

Every 14 experience days may offer at most one turning-point case selected locally from 24 case skeletons. `anti-ai creature intervene` shows three routes—POLLUTION, CLARITY, and PARADOX—and every route has both a benefit and a cost. Seal a route only when the user explicitly asks by running `anti-ai creature intervene <1|2|3>`; never choose on their behalf. A pending case blocks additional case offers, so the system never creates a choice backlog.

Every 7 experience days may offer at most one containment incident. Heavy, restrained, and AI-free days advance this cadence equally. `anti-ai creature incident` shows EMERGENCY QUARANTINE, CONTINUE OBSERVATION, and ALLOW RESONANCE with a visible benefit and cost; an explicit `anti-ai creature incident <1|2|3>` response reveals its aftermath after 3 more experience days and may open one deterministic follow-up chapter. Never select a response unless the user explicitly asks. Pending incidents create no backlog, expiry, or missed reward, and responses grant no abilities, experience, Ecology, rarity, score, or Token reward.

Use `anti-ai creature history` for a compressed key-event timeline and add `--full` only when the user asks for the privacy-safe daily course. Use `anti-ai creature chronicle` for the current file, deterministic diagnosis, latest meaningful change, 7/30/90-day course, generation comparison, twelve presentation-only constellations, and the Collection Mutation. It is read-only; it may scan supported usage metadata to derive an in-memory current snapshot but never reads conversation content, persists that snapshot, adds a daily action, or grants a reward. Use `anti-ai creature prognosis` for three explainable directional previews. Treat LEADING, POSSIBLE, and LATENT as qualitative labels with no precise probabilities, prediction guarantee, quest, or reward promise. A selected route changes later prognosis context and the collected case slice, but does not grant Token-powered combat strength.

Its ASCII form grows on one continuous four-stage Reactor Kaiju anatomy. A stable local genome controls eyes, jaw, armor, reactor core, limbs, tail, and chest pattern; life stage, usage pathology, ecology, scars, achievement parts, chromatic abilities, and sealed v2 generation grafts keep reshaping that skeleton. The generator has 82,944 structural forms, 2,464 growth variants, and 204,374,016 deduplicated base specimen forms. Fixed collection milestones at 34/67/101/134 discoveries with 3/5/6/7-category breadth derive one of seven evidence motifs at four tiers: 29 display states including the unchanged form and 5,926,846,464 theoretical displayed forms. This Collection Mutation may alter a crown or exoskeleton in Creature, Chronicle, Habitat, TUI, and dossier/habitat cards, but it never changes the base appearance fingerprint, pollution code, state schema, stats, rarity, or probability. The codex contains 134 fixed collection entries: 16 form families, 36 achievements split evenly across Offense, Sobriety, and Paradox, 12 chromatic abilities, 4 scars, 30 route-balanced habitat phenomena, 24 Expedition artifacts, and 12 Expedition achievements. Repeatable achievements have three behavior-count tiers; meaningful appearance fingerprints are retained as private dynamic specimens. Do not describe high consumption as the primary or preferred upgrade route.

It also grows seven regular abilities from usage signals, AI-free days, seeded random gains, and events. Visible ability values cycle through 1–255; point 256 becomes `MALIGNANT I · 1/255` while lifetime totals remain lossless. Mutation talents unlock at 5, 15, 30, 60, 120, and 220. Each malignancy rank adds two percentage points to the associated evolution proc chance, and permanent fossils retain per-generation gains, the sealed ability snapshot, and malignancy changes. Instability raises the rare-event chance from 8% up to 20%. Twelve chromatic abilities can awaken independently on active days at R 0.50%, SR 0.10%, or SSR 0.02%, and repeated awakenings grow up to level 9.

When reporting a creature, summarize its specimen ID, generation, life stage and experience, latest fossil, inherited ability and scar, current evolution choice and benefit/cost totals, ecology and today's ecology gain, form and title, badges, level, dominant ability, temperament, mood, latest daily gains, newly visible talents, chromatic abilities, rare-mutation chance, and the active companion's stage and route when one is bonded. Describe this as a satirical growth system, not a resource measurement or productivity score, and do not imply that a high level is productive, healthy, or environmentally measured.

The creature state is stored at `~/.anti-ai/creature.json` with schema v16. It contains only discrete usage bands, derived ecology points, stable gene/part IDs, achievements, appearance fingerprints, pollution doses, traits, regular/chromatic ability gains, event and content-version IDs, permanent fossils with derived ability snapshots, sealed evolution choices, turning-point case IDs with privacy-safe triggers and selections, containment incident/response/aftermath/chain IDs with discrete trigger summaries and disposition counts, Expedition destination/plan/event/choice/effect/collection/status/date IDs, privacy-safe metabolism diagnosis/signal/field/source IDs and passive-study protocol/date IDs, saved foreign encounters as derived appearance IDs, stable visitor stay/foreign-specimen IDs and admission/release dates, derived laboratory cultures and their ingredient references, companion bond dates, daily discrete imprint bands, anomaly IDs, up to three displayed collection keys, daily observe/contact target and reaction IDs, and a local deterministic seed—never pollution codes, prompts, responses, paths, model names, exact Token totals, personal-baseline values, ratios, or request timestamps. Schema v1-v15 files migrate sequentially and idempotently; legacy days and selected evolutions become `contentVersion: 1`, while newly settled content uses v2. Migration never invents diagnoses, studies, visitors, stays, choices, incidents, Expeditions, cultures, bonds, companion growth, displays, or interactions, and the first persisted migration keeps an exact local backup. Do not open or edit the state file directly.

Only destroy the mutation history when the user explicitly asks to reset or restart it:

```bash
anti-ai creature reset
```

Reset also removes migration backups, but never Agent logs.

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
