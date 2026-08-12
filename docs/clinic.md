# Token Metabolic Clinic

[简体中文](./clinic.zh-CN.md)

The Token Metabolic Clinic turns local usage metadata into deterministic, evidence-bounded pattern descriptions. It is satire around an accounting signal, not a medical diagnosis, productivity score, causal claim, or judgment of personal ability.

## Commands

```bash
anti-ai clinic
anti-ai clinic --date 2026-07-23 --source codex
anti-ai clinic --json
anti-ai clinic start <cache-rehab|context-diet|load-recovery>
anti-ai clinic history
```

`clinic` scans the selected date and the preceding 30 calendar days. `clinic history` reads only the existing Creature file and does not scan Agent records. Both are read-only. `clinic start` is the only Clinic command that writes state.

Human `today`, `week`, and `month` reports append a period-sized Clinic section. `today --json` remains unchanged; scripts should use `clinic --json` for the versioned machine contract. The TUI reuses Overview and the Action Center instead of adding a sixth top-level area.

## Evidence model

The target day is compared with at most 14 earlier active days inside the 31-day window. A relative rule needs at least three comparable active days. Request-level signals are calculated inside each source first, so unlike event semantics are never pooled across Agents.

The report explicitly exposes:

- `fieldsUsed`: normalized usage fields that supported the primary diagnosis;
- `sourcesUsed`: sources with usable evidence for that diagnosis;
- `excludedSources`: source ID and `field_unavailable`, `scan_failed`, or `no_comparable_baseline` reason;
- `baselineActiveDays`: the actual comparable history size;
- `provisional`: `true` while the selected local day is still open;
- fixed limitations stating that the result is correlation only and not a productivity or causal judgment.

A missing field is not treated as zero. Hermes participates in total-volume rules by default; request, cache, or model rules include it only when a future adapter can prove those fields. Pi request density is compared only with Pi history. Model IDs may be used transiently to detect a dominant-model change, but no model name enters Clinic JSON or persistent state.

## Diagnoses

At most one primary diagnosis is shown. If multiple signals fire, this fixed priority wins:

1. `burst_overload`
2. `cache_imbalance`
3. `context_bloat`
4. `request_fragmentation`
5. `model_migration`
6. `restrained_recovery`
7. `stable_metabolism`
8. `insufficient_evidence`

| ID | Rule |
|---|---|
| `burst_overload` | daily total is at least 2.5× the prior active-day median |
| `cache_imbalance` | one capable source has cache writes at least 35% of input, cache reads below 15%, and at least 3 events |
| `context_bloat` | fresh input per event is at least 2.2× that source's historical median, with at least 3 events |
| `request_fragmentation` | event count is at least 2× that source's median while Tokens per event are at most 55% of its median |
| `model_migration` | three comparable days share one at-least-60% dominant model, then the target day changes to another at-least-60% dominant model |
| `restrained_recovery` | a completed day's total is at most 45% of the prior median, including an AI-free day |
| `stable_metabolism` | enough evidence exists and no signal fires |
| `insufficient_evidence` | the comparable baseline or usable evidence is missing |

Low-use recovery is never sealed before the local calendar day ends. High-side signals can remain provisional today. The 7/30-day trends count observable days, active days, AI-free days, signal days, and a qualitative increasing/decreasing/stable direction; they do not produce a health or efficiency score.

`freshInput = max(0, inputTokens - cachedInputTokens - cacheWriteInputTokens)`.

## Passive studies

Only one non-ended study may exist at a time:

| CLI protocol | Length | Observes | Possible seals |
|---|---:|---|---|
| `cache-rehab` | 7 days | cache imbalance | cache stabilized, write relapse, insufficient evidence |
| `context-diet` | 14 days | context bloat and request fragmentation | context stabilized, context swelling, request fragmentation, insufficient evidence |
| `load-recovery` | 30 days | burst overload and restrained recovery | load recovered, overload relapse, load oscillating, insufficient evidence |

Studies advance by local calendar date, not by check-ins, Token volume, or a background process. The end date is `start + duration - 1`; the result becomes completed on the following day. Missed days never reset, punish, or extend a study. Missing sealed samples reduce evidence coverage and may produce `insufficient_evidence`, never a failure penalty.

A completed study adds only a local report seal. It grants no ability, experience, Ecology, rarity, collection progress, companion growth, Expedition opportunity, or Token reward.

## State and privacy

Creature schema v15 adds:

- a `clinic.studies` list containing stable protocol IDs, start/end dates, and content version;
- an optional privacy-safe `days[date].metabolism` snapshot sealed during normal Creature settlement.

The daily snapshot stores the primary diagnosis ID, signal IDs and severity bands, normalized field IDs, source IDs, excluded source IDs, comparable-day count, and provisional flag. An open-day sample may remain provisional; the next explicit Creature settlement can finalize that diagnosis after the natural day ends without rewriting the day's growth. It stores no exact Token value, ratio, request timestamp, model name, prompt, response, tool-call body, project path, or raw record.

Schema v14 migrates sequentially to v15 by adding an empty Clinic container. Migration never invents historical diagnoses or studies. Browsing `clinic`, `clinic history`, period reports, or the TUI never rewrites an already finalized metabolic sample. All accounting and study derivation stays local; there is no account, network request, telemetry, daemon, notification, or cloud sync.

## JSON stability

`clinic --json` returns a language-neutral version 1 envelope with `date`, `provisional`, `diagnosis`, `evidence`, `trends`, `study`, and `limitations`. Stable IDs and arrays are deterministic for the same usage metadata, date, source filter, and anti-ai version. Satirical human copy and ANSI formatting never enter JSON.

`clinic history --json` returns versioned study records ordered newest first. Completed results are derived from already sealed privacy-safe daily samples; history does not scan raw Agent stores.
