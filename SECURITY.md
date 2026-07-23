# Security Policy

## Supported versions

Security fixes are applied to the latest published version.

## Reporting a vulnerability

Use GitHub private vulnerability reporting for `ppxu/anti-ai`. Do not open a public issue for a vulnerability that could expose local files, prompts, responses, identifiers, or credentials.

Include only the minimum reproduction needed. Redact all local AI logs and use synthetic fixtures whenever possible.

## Privacy boundary

`anti-ai` scans local JSONL files and keeps only usage metadata needed for aggregation. It does not upload logs, create a usage database, or start a background process.
