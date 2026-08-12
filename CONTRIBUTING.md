# Contributing

Thanks for helping improve `anti-ai`.

## Before opening a change

- Use Node.js 22 or newer.
- Keep required runtime dependencies at zero. Native source adapters must remain optional, lazy-loaded, and safely degradable.
- Do not add real Codex or Claude Code logs, prompts, responses, identifiers, or file paths to tests or issues.
- Add or update a public CLI behavior test before changing user-visible behavior.
- Document every new environmental conversion factor with its formula, scope, date, and primary source.
- Update both the English and Simplified Chinese guide when a shared behavior changes.
- Use a temporary `HOME` for stateful tests. Never settle or reset a contributor's real `~/.anti-ai` file.

## Local workflow

```bash
npm run build:tui
npm test
npm run check
npm run test:coverage
npm run test:package
node ./bin/anti-ai.mjs --help
```

Tests must observe the CLI through stdout, stderr, and exit codes. Prefer synthetic JSONL fixtures over mocks of internal code.

The TUI source lives in `src/tui/`; keep input orchestration in `app.jsx`, screen rendering in `screens/`, and never edit `dist/tui.mjs` directly. Ink and React are development dependencies bundled into that generated artifact so the published CLI keeps zero required runtime dependencies. Run `npm run build:tui` after changing TUI source or bundled dependencies; `npm run check` compares the committed bundle and notices byte-for-byte without rewriting them and rejects source modules above 1,500 lines. TUI tests should exercise rendered frames and keyboard input through `ink-testing-library`, including preview-confirm flows, focused direct actions, cancellation, input locking, result refresh, and failed concurrent writes for state-changing flows. The Daily Containment Broadcast must retain its stable five-section order, one-recommendation ceiling, details toggle, direct area escapes, bilingual/80-column frames, read-only projection, and CLI/TUI SVG equality. Clinic changes need deterministic threshold, source-capability, missing-field, insufficient-baseline, provisional-day, read-only history, schema migration, passive calendar-day completion, no-growth-reward, stable JSON, bilingual, and TUI action-service coverage. Collection displays, daily narrative interactions, and Expeditions also need coverage proving their limits, stable-ID persistence, historical-date filtering, non-rerollable plans, non-stacking opportunities, return presentation, and lack of Token-volume rewards. Read-only historical projections such as Chronicle, Pathology Constellations, Legendary reveal, and Collection Mutations need selected-date, privacy, no-state-creation, bilingual, stable-public-JSON, base-fingerprint compatibility, and display-capacity coverage. Living Habitat changes must keep route pools balanced and verify that terminal, TUI, JSON, SVG, motion-off, and 80-column views consume the same deterministic scene semantics.

Run `npm run verify` before requesting review. Changes to state behavior also need migration, read-only snapshot, and concurrent-write coverage as applicable.

## Pull requests

Keep pull requests focused and explain:

- what changed;
- why it changed;
- how users are affected;
- which commands verify the change.

By contributing, you agree that your contribution will be licensed under the MIT License.
