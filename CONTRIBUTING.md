# Contributing

Thanks for helping improve `anti-ai`.

## Before opening a change

- Use Node.js 20 or newer.
- Keep runtime dependencies at zero unless a dependency clearly reduces risk or complexity.
- Do not add real Codex or Claude Code logs, prompts, responses, identifiers, or file paths to tests or issues.
- Add or update a public CLI behavior test before changing user-visible behavior.
- Document every new environmental conversion factor with its formula, scope, date, and primary source.

## Local workflow

```bash
npm test
npm run check
node ./bin/anti-ai.mjs --help
```

Tests must observe the CLI through stdout, stderr, and exit codes. Prefer synthetic JSONL fixtures over mocks of internal code.

## Pull requests

Keep pull requests focused and explain:

- what changed;
- why it changed;
- how users are affected;
- which commands verify the change.

By contributing, you agree that your contribution will be licensed under the MIT License.
