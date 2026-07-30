# Security Policy

## Supported versions

Security fixes are applied to the latest published version.
The supported runtime is Node.js 22 or newer.

## Reporting a vulnerability

Use GitHub private vulnerability reporting for `ppxu/anti-ai`. Do not open a public issue for a vulnerability that could expose local files, prompts, responses, identifiers, or credentials.

Include only the minimum reproduction needed. Redact all local AI logs and use synthetic fixtures whenever possible.

## Privacy boundary

`anti-ai` scans local JSONL files and keeps only usage metadata needed for aggregation. It does not upload logs, create a usage database, or start a background process.

SQLite support is optional and lazy-loaded. A missing or incompatible native driver does not prevent JSONL sources from running.

Creature schema and its state envelope are validated before use. Future schemas are rejected, migrations keep an exact local backup under `~/.anti-ai/backups/`, and stale concurrent writes are cancelled instead of overwriting newer state. Backups contain the same privacy-safe derived data as the main Creature file and should still be treated as personal local files. An explicit `anti-ai creature reset` removes both the current state and these backups.
