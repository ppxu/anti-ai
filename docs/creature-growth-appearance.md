# Growth Appearance Codex

English | [简体中文](./creature-growth-appearance.zh-CN.md) · [Base Organ Codex](./creature-organs.md) · [Creature Guide](./creature.md)

The Reactor Kaiju generator currently uses **24 visible growth elements** in addition to its 40 structural organs:

```text
4 Ecology marks + 4 pathology crests
+ 6 genome patterns + 4 scars + 3 achievement marks + 3 chromatic overlays
= 24 source elements
```

These 24 elements do not all occupy the same slot. A final form independently selects one Ecology and one pathology, then one of 16 mutually exclusive chest overlays:

```text
4 Ecologies × 4 pathologies
× (6 genome patterns + 4 scars + 3 achievement marks + 3 chromatic overlays)
= 256 growth appearances
```

The glyphs below are the literal values used by the current renderer in [`src/creature.mjs`](../src/creature.mjs).

## Placement and stage visibility

```text
                 PATHOLOGY CREST
                        ↓
              ╭─────────────────╮
              │   Reactor Kaiju │
              │ ECOLOGY  CHEST  │
              │   MARK   OVERLAY│
              ╰─────────────────╯
```

| Layer | Visible behavior |
|---|---|
| Ecology | Colors the whole specimen at every stage. Its mark occupies the early chest unless a scar replaces it; the complete form gives it a dedicated body slot. |
| Pathology | Changes the crest from stage II onward. Stage I uses a fixed embryonic crest. |
| Chest overlay | Rare mutation, achievement, scar, or genome pattern according to stage and precedence. |

## Ecology marks · 4

Ecology is shaped by persistent Pollution and Clarity. On the complete form, this mark remains visible beside the selected chest overlay.

| Ecology ID | Meaning | Glyph | Terminal color |
|---|---|:---:|---|
| `unformed` | Neither axis has stabilized | `·····` | dim |
| `polluted` | Pollution dominates | `!!~!!` | red |
| `lucid` | Clarity dominates | `--○--` | cyan |
| `paradox` | Pollution and Clarity both developed | `!X!X!` | magenta |

## Pathology crests · 4

Pathology is driven by the dominant way the coding agents were used.

| Pathology ID | Branch | Glyph |
|---|---|:---:|
| `context` | Context Pathology | `╱╲[[ ]]╱╲` |
| `cache` | Cache Fossil | `▟▙▟▙▟▙` |
| `frenzy` | Request Proliferation | `╱◉╲╱◉╲╱◉╲` |
| `nuclear` | Nuclear Feeder | stage II `╱╲╱╲` · stage III `╱╲╱╲╱╲` · stage IV `╱╲╱╲╱╲╱╲` |

## Ordinary genome patterns · 6

These stable local genes become visible in the complete-form chest when no higher-priority overlay is active.

| Pattern ID | Glyph |
|---|:---:|
| `pattern_01` | `. . .` |
| `pattern_02` | `x-x-x` |
| `pattern_03` | `:::::` |
| `pattern_04` | `+-+-+` |
| `pattern_05` | `[=*=]` |
| `pattern_06` | `o-o-o` |

## Inherited generation scars · 4

At the end of a 90-day generation, its settled Ecology determines the scar inherited by the next generation.

| Scar ID | Inherited from | Glyph |
|---|---|:---:|
| `blank_suture` | Unformed | `--//--` |
| `carbonized_spine` | Polluted | `##/##` |
| `sterile_halo` | Lucid | `oo/oo` |
| `split_shadow` | Paradox | `//\\//` |

## Achievement marks · 3

The 24 achievement IDs collapse into three visible categories. The latest unlocked achievement selects the category mark on a complete form.

| Category | Achievement IDs | Glyph |
|---|---:|:---:|
| `offense` | 8 | `!!x!!` |
| `sobriety` | 8 | `--X--` |
| `paradox` | 8 | `!X?X!` |

## Chromatic overlays · 3

Six rare abilities collapse into three visible rarity ranks. Awakening one recolors the whole specimen and replaces the lower-priority chest mark.

| Rarity | Abilities | Glyph | Terminal color |
|---|---:|:---:|---|
| R / `rare` | 3 | `@R@R@` | cyan |
| SR / `epic` | 2 | `@S@S@` | magenta |
| SSR / `mythic` | 1 | `@X@X@` | yellow |

## Chest precedence

Only one chest overlay from the 16 alternatives contributes to a final-form appearance:

```text
chromatic overlay
      ↓ overrides
achievement mark
      ↓ overrides
inherited scar
      ↓ overrides
ordinary genome pattern
```

Stages I–III do not display the ordinary genome pattern or achievement mark. Their chest shows a chromatic overlay when awakened, otherwise an inherited scar when present, otherwise the current Ecology mark. Stage IV separates the Ecology mark into its own slot and resolves the chest using the precedence above.

Exact ability levels, achievement IDs within one category, titles, moods, and numeric growth values remain visible in the casebook or JSON, but they do not create additional ASCII geometry.
