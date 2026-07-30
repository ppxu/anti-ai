#!/usr/bin/env node

const { main } = await import("../src/cli.mjs");

await main();
