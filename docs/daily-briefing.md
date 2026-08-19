# Daily Containment Broadcast

[简体中文](./daily-briefing.zh-CN.md)

The Daily Containment Broadcast makes Overview the one place to answer four questions: what is sealed today, what changed, how the Habitat reacted, and what—if anything—deserves one response.

## Open it

```bash
anti-ai tui
anti-ai tui --lang en
anti-ai tui --no-motion
```

Overview starts in broadcast mode. It is not a modal intro and it has no read receipt: `1`–`5` immediately opens another area. Press `e` to expand or collapse the complete specimen file, `a` for the full action center, and `s` to preview the daily SVG cover.

## Broadcast order

The structured projection always exposes five sections in this order:

1. **System status** — whether the date is settled and its broad usage/ecology summary;
2. **Current diagnosis** — the existing deterministic Chronicle diagnosis;
3. **Key change** — the first applicable non-collection item from hatch/pathology, local record, ecology drift, or no other material change;
4. **Collection update** — the only place collection changes are summarized, so one discovery is never repeated as both narrative and collection news;
5. **Habitat reaction** — the existing deterministic Living Habitat scene and bulletin.

At most one existing action is recommended. `Enter` handles that recommendation using the same action service and confirmation rules as the full action center. The broadcast does not create another action, reward, rarity roll, or daily opportunity.

When the terminal is 30 rows high or shorter, Overview removes the large specimen art and secondary hints, then keeps the same five sections, recommendation, area navigation, Help, and exit control inside a compact frame. This affects presentation only.

## Full file

Pressing `e` reveals the information previously shown directly on Overview: current specimen and pathology, generation progress, next milestone, 7/30/90-day Chronicle, generation comparison, Pathology Constellation progress, and up to two available action summaries. The display mode exists only for the current TUI session and is never persisted.

## Share the broadcast

```bash
anti-ai share --card briefing > anti-ai-briefing.svg
anti-ai share --card briefing --date 2026-07-23 --lang en > anti-ai-briefing.svg
```

The 1200×630 card uses the same broadcast projection as TUI Overview. An explicit CLI export may derive the selected date in memory, but it never persists that settlement. The card omits exact Tokens, requests, model/source names, prompts, responses, tool calls, paths, per-request timestamps, and internal hashes. `dossier` remains the separate long-course Chronicle card.

## State and growth boundary

Opening, expanding, navigating, and previewing the broadcast are read-only. It adds no Creature schema field and does not scan Agent logs. Only explicitly opening the settlement impact preview may scan supported usage metadata, and only explicit confirmation writes through the existing atomic state service. Heavy use, restrained use, and AI-free days retain their existing equal-time routes.
