# Growth Appearance Codex

English | [简体中文](./creature-growth-appearance.zh-CN.md) · [Base Organ Codex](./creature-organs.md) · [Creature Guide](./creature.md)

The Reactor Kaiju generator uses **36 visible growth elements** in addition to its 40 structural organs:

```text
4 Ecology marks + 4 pathology crests
+ 6 genome patterns + 4 scars + 6 achievement marks
+ 6 chromatic overlays + 6 generation grafts
= 36 source elements
```

They occupy four independent or competing layers. A stable final form selects one Ecology, one pathology, one of 22 mutually exclusive chest overlays, and either no graft or one of six sealed v2 generation grafts:

```text
4 Ecologies × 4 pathologies
× (6 genome patterns + 4 scars + 6 achievement marks + 6 chromatic overlays)
× (1 ungrafted form + 6 generation grafts)
= 2,464 growth appearances
```

The glyphs below are the literal values used by [`src/creature/appearance.mjs`](../src/creature/appearance.mjs).

## Placement and stage visibility

```text
                 PATHOLOGY CREST
                        ↓
              ╭─────────────────╮
              │   Reactor Kaiju │
              │ ECOLOGY  CHEST  │
              │   MARK   OVERLAY│
              │      GRAFT      │
              ╰─────────────────╯
```

| Layer | Visible behavior |
|---|---|
| Ecology | Colors the whole specimen at every stage. Its mark occupies the early chest unless a scar replaces it; the complete form gives it a dedicated body slot. |
| Pathology | Changes the crest from stage II onward. Stage I uses a fixed embryonic crest. |
| Chest overlay | Shows one chromatic mutation, achievement mark, scar, or genome pattern according to stage and precedence. |
| Generation graft | A sealed v2 evolution choice adds one independent organ near the lower silhouette. Legacy and unselected generations remain ungrafted. |

## Ecology marks · 4

| Ecology ID | Meaning | Glyph | Terminal color |
|---|---|:---:|---|
| `unformed` | Neither axis has stabilized | `·····` | dim |
| `polluted` | Pollution dominates | `!!~!!` | red |
| `lucid` | Clarity dominates | `--○--` | cyan |
| `paradox` | Pollution and Clarity both developed | `!X!X!` | magenta |

## Pathology crests · 4

| Pathology ID | Branch | Glyph |
|---|---|:---:|
| `context` | Context Pathology | `╱╲[[ ]]╱╲` |
| `cache` | Cache Fossil | `▟▙▟▙▟▙` |
| `frenzy` | Request Proliferation | `╱◉╲╱◉╲╱◉╲` |
| `nuclear` | Nuclear Feeder | stage II `╱╲╱╲` · stage III `╱╲╱╲╱╲` · stage IV `╱╲╱╲╱╲╱╲` |

## Ordinary genome patterns · 6

| Pattern ID | Glyph |
|---|:---:|
| `pattern_01` | `. . .` |
| `pattern_02` | `x-x-x` |
| `pattern_03` | `:::::` |
| `pattern_04` | `+-+-+` |
| `pattern_05` | `[=*=]` |
| `pattern_06` | `o-o-o` |

## Inherited generation scars · 4

| Scar ID | Inherited from | Glyph |
|---|---|:---:|
| `blank_suture` | Unformed | `--//--` |
| `carbonized_spine` | Polluted | `##/##` |
| `sterile_halo` | Lucid | `oo/oo` |
| `split_shadow` | Paradox | `//\\//` |

## Achievement marks · 6

The 36 achievement IDs are balanced at 12 per category. Legacy and v2 achievements use different marks, so content expansion changes new specimens without rewriting old ones.

| Category | Legacy IDs / glyph | v2 IDs / glyph |
|---|---:|---:|
| `offense` | 8 · `!!x!!` | 4 · `!!+!!` |
| `sobriety` | 8 · `--X--` | 4 · `--+--` |
| `paradox` | 8 · `!X?X!` | 4 · `!+?+!` |

## Chromatic overlays · 6

The 12 rare abilities use one legacy and one v2 signature per rarity. Awakening one recolors the whole specimen and replaces every lower-priority chest mark.

| Rarity | Legacy abilities / glyph | v2 abilities / glyph | Terminal color |
|---|---:|---:|---|
| R / `rare` | 3 · `@R@R@` | 3 · `@N@N@` | cyan |
| SR / `epic` | 2 · `@S@S@` | 2 · `@Q@Q@` | magenta |
| SSR / `mythic` | 1 · `@X@X@` | 1 · `@Z@Z@` | yellow |

## Sealed generation grafts · 6

These organs come from an explicitly selected v2 evolution path. The absence of a graft remains a valid appearance, preserving legacy identity.

| Evolution ID | Route | Glyph |
|---|---|:---:|
| `bottomless_graft` | Pollution | `{v∞v}` |
| `recursive_lobe` | Pollution | `{[[∞]]}` |
| `chorus_jaw` | Pollution | `{≡≡≡}` |
| `reactor_bladder` | Pollution | `{☢o☢}` |
| `abstinence_sac` | Clarity | `{○-○}` |
| `loaded_nerve` | Paradox | `{?x?}` |

## Chest precedence

Only one of the 22 chest alternatives contributes to a stable final form:

```text
chromatic overlay
      ↓ overrides
achievement mark
      ↓ overrides
inherited scar
      ↓ overrides
ordinary genome pattern
```

Stages I–III do not display the ordinary genome pattern or achievement mark. Their chest shows a chromatic overlay when awakened, otherwise an inherited scar when present, otherwise the current Ecology mark. Stage IV separates the Ecology mark into its own slot and resolves the chest using the precedence above. The generation graft is independent of this stack.

## Collection-induced crowns · 28

After the stable base specimen is rendered, fixed Codex breadth can add one of seven evidence motifs at four milestones. This produces 28 crown/exoskeleton variants plus the unchanged specimen. The motif is selected by the fixed discovery that crosses the milestone; it is not a random reroll.

| Milestone | Requirement | Visible scale |
|---|---|---|
| I | 34 / 134 fixed discoveries · 3 / 7 categories | single evidence glyph |
| II | 67 / 134 · 5 / 7 | paired crown |
| III | 101 / 134 · 6 / 7 | extended crown |
| IV | 134 / 134 · 7 / 7 | full crown or exoskeleton |

The seven motifs correspond to form families, achievements, chromatic abilities, scars, habitat phenomena, Expedition artifacts, and Expedition achievements. They multiply theoretical presentation capacity by 29, but remain outside the base appearance fingerprint and pollution-code identity.

## Motion is presentation, not identity

The TUI can animate six poses (`idle`, `feeding`, `withdrawal`, `dormant`, `alert`, `mutation`) using seven temperament rhythms. Each chromatic ability has its own deterministic glitch signature; companion movement also reflects route, stage, and anomaly. Observation briefly renders a two-frame organ reaction.

These frames are transient. Motion is capped at 4 FPS, pauses outside living screens, respects `--motion off` and `NO_COLOR`, and never changes the stored appearance fingerprint or either theoretical capacity.
