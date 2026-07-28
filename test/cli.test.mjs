import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

import {
  creatureAppearanceContentStats,
  creatureAppearanceState,
  creatureArt,
  deriveCreatureAppearance,
} from "../src/creature.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(testDir, "..");
const cliPath = path.join(projectDir, "bin", "anti-ai.mjs");
const fixtureDir = path.join(testDir, "fixtures");
const baselineCodexDir = path.join(fixtureDir, "baseline", "codex");

function runCli(args, env = {}) {
  const isolatedHome = env.HOME ?? mkdtempSync(
    path.join(tmpdir(), "anti-ai-cli-home-"),
  );
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectDir,
    encoding: "utf8",
    env: {
      ...process.env,
      TZ: "Asia/Shanghai",
      NO_COLOR: "1",
      HOME: isolatedHome,
      ANTI_AI_CODEX_DIR: path.join(fixtureDir, "codex"),
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "missing-claude"),
      ...env,
    },
  });
  if (!env.HOME) rmSync(isolatedHome, { recursive: true, force: true });
  return result;
}

function writeCodexUsage(root, usages, date = "2026-07-23") {
  const dayStart = new Date(`${date}T00:00:00+08:00`).getTime();
  const records = usages.flatMap((usage, index) => [
    {
      timestamp: new Date(dayStart + index * 60_000).toISOString(),
      type: "turn_context",
      payload: { model: "mutation-test" },
    },
    {
      timestamp: new Date(dayStart + index * 60_000 + 30_000).toISOString(),
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          last_token_usage: usage,
        },
      },
    },
  ]);
  const [year, month, day] = date.split("-");
  mkdirSync(path.join(root, year, month, day), { recursive: true });
  writeFileSync(
    path.join(root, year, month, day, "session.jsonl"),
    `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
  );
}

function shiftTestDate(date, days) {
  const shifted = new Date(`${date}T12:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function terminalWidth(value) {
  return Array.from(value).reduce(
    (width, character) =>
      width + (/\p{Script=Han}/u.test(character) ? 2 : 1),
    0,
  );
}

test("today --json counts Codex request usage on the requested local date", () => {
  const result = runCli([
    "today",
    "--date",
    "2026-07-23",
    "--source",
    "codex",
    "--json",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), {
    date: "2026-07-23",
    timezone: "Asia/Shanghai",
    sources: {
      codex: {
        requests: 2,
        inputTokens: 150,
        cachedInputTokens: 40,
        cacheWriteInputTokens: 0,
        outputTokens: 30,
        reasoningOutputTokens: 5,
        totalTokens: 180,
      },
    },
    models: {
      codex: {
        "gpt-test": {
          requests: 2,
          inputTokens: 150,
          cachedInputTokens: 40,
          cacheWriteInputTokens: 0,
          outputTokens: 30,
          reasoningOutputTokens: 5,
          totalTokens: 180,
        },
      },
    },
    totals: {
      requests: 2,
      inputTokens: 150,
      cachedInputTokens: 40,
      cacheWriteInputTokens: 0,
      outputTokens: 30,
      reasoningOutputTokens: 5,
      totalTokens: 180,
    },
  });
});

test("today --json deduplicates Claude Code streaming usage by message id", () => {
  const result = runCli(
    [
      "today",
      "--date",
      "2026-07-23",
      "--source",
      "claude",
      "--json",
    ],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), {
    date: "2026-07-23",
    timezone: "Asia/Shanghai",
    sources: {
      claude: {
        requests: 2,
        inputTokens: 125,
        cachedInputTokens: 90,
        cacheWriteInputTokens: 20,
        outputTokens: 45,
        reasoningOutputTokens: 0,
        totalTokens: 170,
      },
    },
    models: {
      claude: {
        "claude-test": {
          requests: 2,
          inputTokens: 125,
          cachedInputTokens: 90,
          cacheWriteInputTokens: 20,
          outputTokens: 45,
          reasoningOutputTokens: 0,
          totalTokens: 170,
        },
      },
    },
    totals: {
      requests: 2,
      inputTokens: 125,
      cachedInputTokens: 90,
      cacheWriteInputTokens: 20,
      outputTokens: 45,
      reasoningOutputTokens: 0,
      totalTokens: 170,
    },
  });
});

test("human-readable model names cannot inject terminal control characters", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "anti-ai-model-name-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const records = [
    {
      timestamp: "2026-07-22T16:00:00.000Z",
      type: "turn_context",
      payload: { model: "gpt\u001b[31m" },
    },
    {
      timestamp: "2026-07-22T16:01:00.000Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          last_token_usage: {
            input_tokens: 10,
            output_tokens: 5,
            total_tokens: 15,
          },
        },
      },
    },
  ];
  mkdirSync(path.join(root, "2026", "07", "23"), { recursive: true });
  writeFileSync(
    path.join(root, "2026", "07", "23", "session.jsonl"),
    `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
  );

  const result = runCli(["today", "--date", "2026-07-23", "--source", "codex"], {
    ANTI_AI_CODEX_DIR: root,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /\u001b/);
  assert.match(result.stdout, /Codex · gpt�\[31m/);
});

test("today prints a satirical receipt with transparent resource estimates", () => {
  const result = runCli(
    ["today", "--date", "2026-07-23"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /YOUR AI RECEIPT · 2026-07-23/);
  assert.match(result.stdout, /350 tokens · 4 次模型请求/);
  assert.match(result.stdout, /Codex\s+180/);
  assert.match(result.stdout, /Claude Code\s+170/);
  assert.match(result.stdout, /模型账单/);
  assert.match(result.stdout, /Codex · gpt-test\s+180 tokens · 2 次/);
  assert.match(
    result.stdout,
    /Claude Code · claude-test\s+170 tokens · 2 次/,
  );
  assert.match(result.stdout, /⚡\s+0\.96–1\.36 Wh/);
  assert.match(result.stdout, /💧\s+1\.04–8\.44 mL/);
  assert.match(result.stdout, /☁️\s+0\.12–0\.21 gCO₂e/);
  assert.match(result.stdout, /资源消耗估算（参考公开数据）/);
  assert.doesNotMatch(result.stdout, /公开代理跨度/);
  assert.match(result.stdout, /置信度：低/);
  assert.match(result.stdout, /机器开了 4 张小票，地球只收到一段估算/);
});

test("today supports a fully English human-readable receipt", () => {
  const result = runCli(
    ["today", "--date", "2026-07-23", "--lang", "en"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /350 tokens · 4 model requests/);
  assert.match(result.stdout, /Model bill/);
  assert.match(result.stdout, /Codex · gpt-test\s+180 tokens · 2 requests/);
  assert.match(result.stdout, /Estimated resource use \(from public data\)/);
  assert.doesNotMatch(result.stdout, /Published proxy range/);
  assert.match(result.stdout, /Everyday translation/);
  assert.match(result.stdout, /50W laptop\s+1\.15–1\.63 minutes/);
  assert.match(result.stdout, /250mL cup of water\s+0\.42%–3\.38% of one cup/);
  assert.match(result.stdout, /6L toilet flush\s+0\.02%–0\.14% of one flush/);
  assert.match(result.stdout, /Personal baseline \(prior 7 calendar days\)/);
  assert.match(result.stdout, /Today's charge: FIRST OFFENSE/);
  assert.match(result.stdout, /Confidence: LOW/);
  assert.doesNotMatch(result.stdout, /次模型请求|模型账单|今日罪名|置信度/);
});

test("English verdicts keep the same local rule and date rotation", () => {
  const result = runCli(
    ["today", "--date", "2026-07-23", "--source", "codex", "--lang", "en"],
    {
      ANTI_AI_CODEX_DIR: baselineCodexDir,
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Today's charge: CONTEXT HOARDING/);
  assert.match(
    result.stdout,
    /Requests stayed flat while tokens per request inflated to 3\.00×/,
  );
  assert.doesNotMatch(result.stdout, /上下文囤积|请求没多/);
});

test("today JSON is language-independent", () => {
  const zh = runCli([
    "today",
    "--date",
    "2026-07-23",
    "--source",
    "codex",
    "--json",
  ]);
  const en = runCli([
    "today",
    "--date",
    "2026-07-23",
    "--source",
    "codex",
    "--lang",
    "en",
    "--json",
  ]);

  assert.equal(zh.status, 0, zh.stderr);
  assert.equal(en.status, 0, en.stderr);
  assert.deepEqual(JSON.parse(en.stdout), JSON.parse(zh.stdout));
});

test("today translates abstract resources into everyday comparisons", () => {
  const result = runCli(
    ["today", "--date", "2026-07-23"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /生活翻译（终于像人话了）/);
  assert.match(result.stdout, /💡\s+10W LED 灯\s+5\.76–8\.16 分钟/);
  assert.match(
    result.stdout,
    /🚰\s+550mL 矿泉水\s+一瓶的 0\.19%–1\.53%/,
  );
  assert.match(result.stdout, /🚗\s+平均燃油车\s+0\.48–0\.86 米/);
  assert.match(
    result.stdout,
    /🌳\s+1 棵城市树\s+加班 1\.05–1\.87 分钟才能吸回来/,
  );
  assert.match(
    result.stdout,
    /💻\s+50W 笔记本电脑\s+1\.15–1\.63 分钟/,
  );
  assert.match(
    result.stdout,
    /☕\s+250mL 水杯\s+一杯的 0\.42%–3\.38%/,
  );
  assert.match(
    result.stdout,
    /🚽\s+6L 节水马桶\s+一次冲水的 0\.02%–0\.14%/,
  );
});

test("today compares usage with the prior seven days and prints one verdict", () => {
  const result = runCli(["today", "--date", "2026-07-23", "--source", "codex"], {
    ANTI_AI_CODEX_DIR: baselineCodexDir,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /个人基线（过去 7 个自然日）/);
  assert.match(result.stdout, /Token\s+\+200\.00%/);
  assert.match(result.stdout, /请求\s+0\.00%/);
  assert.match(result.stdout, /今日罪名：上下文囤积/);
  assert.match(result.stdout, /请求没多，单次 Token 用量却膨胀到 3\.00 倍/);
});

test("today rotates satirical copy deterministically by date", () => {
  const result = runCli(["today", "--date", "2026-07-24", "--source", "codex"], {
    ANTI_AI_CODEX_DIR: baselineCodexDir,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /今日罪名：窗口违建户/);
  assert.match(
    result.stdout,
    /模型没有被频繁打扰，只是每次都收到一整本附件/,
  );
});

test("today composes at least thirty non-repeating charges for one symptom", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-charge-pool-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const charges = [];

  for (let index = 0; index < 30; index += 1) {
    const date = shiftTestDate("2026-06-01", index);
    const root = path.join(workspace, String(index));
    for (let baselineDay = -7; baselineDay < 0; baselineDay += 1) {
      writeCodexUsage(
        root,
        [
          {
            input_tokens: 90,
            output_tokens: 10,
            total_tokens: 100,
          },
        ],
        shiftTestDate(date, baselineDay),
      );
    }
    writeCodexUsage(
      root,
      [
        {
          input_tokens: 290,
          output_tokens: 10,
          total_tokens: 300,
        },
      ],
      date,
    );

    const result = runCli(["today", "--date", date, "--source", "codex"], {
      ANTI_AI_CODEX_DIR: root,
    });
    assert.equal(result.status, 0, result.stderr);
    const charge = result.stdout.match(/今日罪名：(.+)\n\s+(.+)/);
    assert.ok(charge, `missing charge on ${date}`);
    charges.push(`${charge[1]} · ${charge[2]}`);
  }

  assert.equal(new Set(charges).size, 30);
});

test("today does not accuse normal personal cache usage every day", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "anti-ai-cache-baseline-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (let day = 16; day <= 23; day += 1) {
    writeCodexUsage(
      root,
      [
        {
          input_tokens: 100,
          cached_input_tokens: 80,
          output_tokens: 10,
          total_tokens: 110,
        },
      ],
      `2026-07-${day}`,
    );
  }

  const result = runCli(["today", "--date", "2026-07-23", "--source", "codex"], {
    ANTI_AI_CODEX_DIR: root,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /今日罪名：缓存考古学家/);
});

test("today rotates cache offense titles when cache usage is unusually high", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "anti-ai-cache-titles-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (let day = 16; day <= 24; day += 1) {
    writeCodexUsage(
      root,
      [
        {
          input_tokens: 100,
          cached_input_tokens: day >= 23 ? 80 : 40,
          output_tokens: 10,
          total_tokens: 110,
        },
      ],
      `2026-07-${day}`,
    );
  }

  const first = runCli(
    ["today", "--date", "2026-07-23", "--source", "codex"],
    { ANTI_AI_CODEX_DIR: root },
  );
  const second = runCli(
    ["today", "--date", "2026-07-24", "--source", "codex"],
    { ANTI_AI_CODEX_DIR: root },
  );
  const english = runCli(
    [
      "today",
      "--date",
      "2026-07-23",
      "--source",
      "codex",
      "--lang",
      "en",
    ],
    { ANTI_AI_CODEX_DIR: root },
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(english.status, 0, english.stderr);
  assert.match(first.stdout, /今日罪名：上下文遗址管理员/);
  assert.match(second.stdout, /今日罪名：电子包浆鉴定师/);
  assert.match(english.stdout, /Today's charge: CONTEXT RUINS CURATOR/);
});

test("today settles one creature day and appends a concise mutation summary", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-today-creature-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "today-creature",
  };

  const today = runCli(["today", "--date", "2026-07-23"], env);
  const creature = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    env,
  );

  assert.equal(today.status, 0, today.stderr);
  assert.equal(creature.status, 0, creature.stderr);
  assert.match(
    today.stdout,
    /异变体\s+污染性 \+1 · 仍为「熄火幼核」 · 今日成就 无/,
  );
  const report = JSON.parse(creature.stdout);
  assert.equal(report.experienceDays, 1);
  assert.deepEqual(report.ecology, {
    pollution: 1,
    clarity: 0,
    pollutionRate: 1,
    clarityRate: 0,
    type: "unformed",
    pendingType: "polluted",
    pendingDays: 1,
  });
});

test("today chooses human-scale comparisons for larger resource ranges", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "anti-ai-dynamic-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const records = Array.from({ length: 100 }, (_, index) =>
    JSON.stringify({
      timestamp: `2026-07-22T16:${String(index % 60).padStart(2, "0")}:00.000Z`,
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          last_token_usage: {
            input_tokens: 10,
            output_tokens: 1_000,
            total_tokens: 1_010,
          },
        },
      },
    }),
  );
  mkdirSync(path.join(root, "2026", "07", "23"), { recursive: true });
  writeFileSync(
    path.join(root, "2026", "07", "23", "session.jsonl"),
    `${records.join("\n")}\n`,
  );

  const result = runCli(["today", "--date", "2026-07-23", "--source", "codex"], {
    ANTI_AI_CODEX_DIR: root,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /📱\s+15Wh 手机充电\s+1\.60–2\.27 次/);
  assert.match(result.stdout, /🚿\s+8L\/min 淋浴\s+0\.00–1\.41 分钟/);
  assert.doesNotMatch(result.stdout, /10W LED 灯/);
  assert.doesNotMatch(result.stdout, /550mL 矿泉水/);
});

test("week prints the seven-day token trend ending on the requested date", () => {
  const result = runCli(
    ["week", "--date", "2026-07-23"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /YOUR AI HANGOVER · 2026-07-17 → 2026-07-23/,
  );
  assert.match(result.stdout, /07-17\s+·\s+0/);
  assert.match(result.stdout, /07-23\s+█+\s+350/);
  assert.match(result.stdout, /7 日合计\s+350 tokens · 4 次模型请求/);
  assert.match(result.stdout, /Codex · gpt-test\s+180 tokens · 2 次/);
  assert.match(
    result.stdout,
    /Claude Code · claude-test\s+170 tokens · 2 次/,
  );
  assert.match(result.stdout, /7 日资源账单/);
  assert.match(result.stdout, /⚡\s+0\.96–1\.36 Wh/);
  assert.match(result.stdout, /💧\s+1\.04–8\.44 mL/);
  assert.match(result.stdout, /☁️\s+0\.12–0\.21 gCO₂e/);
  assert.match(result.stdout, /💡\s+10W LED 灯\s+5\.76–8\.16 分钟/);
  assert.match(result.stdout, /代码也许能跑，账单肯定能/);
});

test("week appends a bilingual living casebook from the complete creature history", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-week-casebook-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "week-casebook",
  };

  const chinese = runCli(["week", "--date", "2026-07-23"], env);
  const english = runCli(
    ["week", "--date", "2026-07-23", "--lang", "en"],
    env,
  );

  assert.equal(chinese.status, 0, chinese.stderr);
  assert.equal(english.status, 0, english.stderr);
  assert.match(chinese.stdout, /活体病历 · 07-17 → 07-23/);
  assert.match(chinese.stdout, /本周主症状\s+核食/);
  assert.match(chinese.stdout, /生态变化\s+污染 \+8 · 清醒 \+0/);
  assert.match(
    chinese.stdout,
    /成长记录\s+阅历 \+7 · 异常胚体 I → 分化幼体 II/,
  );
  assert.match(chinese.stdout, /新增徽章.*基线纵火犯/);
  assert.match(chinese.stdout, /主治意见\s+\S+/);
  assert.match(english.stdout, /LIVING CASEBOOK · 07-17 → 07-23/);
  assert.match(english.stdout, /PRIMARY SYMPTOM\s+NUCLEAR FEEDING/);
  assert.match(english.stdout, /ECOLOGY CHANGE\s+pollution \+8 · clarity \+0/);
  assert.match(english.stdout, /ATTENDING NOTE\s+\S+/);
  assert.doesNotMatch(english.stdout, /活体病历|本周主症状|生态变化|成长记录/);
});

test("month prints a calendar heatmap and monthly usage summary", () => {
  const result = runCli(["month", "--date", "2026-07-23", "--source", "codex"], {
    ANTI_AI_CODEX_DIR: baselineCodexDir,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /YOUR AI CALENDAR · 2026-07-01 → 2026-07-23/,
  );
  assert.match(result.stdout, /一\s+二\s+三\s+四\s+五\s+六\s+日/);
  assert.match(result.stdout, /23█/);
  assert.match(result.stdout, /月度合计\s+1,000 tokens · 8 次模型请求/);
  assert.match(result.stdout, /AI 清醒日\s+15 天 \/ 23 天/);
  assert.match(result.stdout, /最长清醒期\s+15 天/);
  assert.match(result.stdout, /最重一天\s+07-23 · 300 tokens/);
  assert.match(
    result.stdout,
    /Codex · gpt-baseline\s+1,000 tokens · 8 次/,
  );
  assert.match(result.stdout, /本月资源账单/);
  assert.match(result.stdout, /⚡\s+1\.92–2\.72 Wh/);
  assert.match(result.stdout, /💧\s+2\.08–21\.38 mL/);
  assert.match(result.stdout, /☁️\s+0\.24–0\.54 gCO₂e/);
  assert.match(result.stdout, /💡\s+10W LED 灯\s+11\.52–16\.32 分钟/);
});

test("month appends a bilingual autopsy without diagnosing pre-hatch days", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-month-autopsy-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "month-autopsy",
  };

  const chinese = runCli(["month", "--date", "2026-07-23"], env);
  const english = runCli(
    ["month", "--date", "2026-07-23", "--lang", "en"],
    env,
  );

  assert.equal(chinese.status, 0, chinese.stderr);
  assert.equal(english.status, 0, english.stderr);
  assert.match(chinese.stdout, /月度尸检 · 2026-07/);
  assert.match(chinese.stdout, /有效观察\s+8 天 · 8 天活跃 · 0 天清醒/);
  assert.match(chinese.stdout, /主症状\s+核食/);
  assert.match(
    chinese.stdout,
    /生态人格\s+未定型 → 污染型 · 污染 \+9 · 清醒 \+0/,
  );
  assert.match(chinese.stdout, /成就回顾\s+\[4\].*基线纵火犯/);
  assert.match(chinese.stdout, /尸检结论\s+\S+/);
  assert.match(english.stdout, /MONTHLY AUTOPSY · 2026-07/);
  assert.match(english.stdout, /VALID OBSERVATION\s+8 days · 8 active · 0 AI-free/);
  assert.match(english.stdout, /ECOLOGY\s+UNFORMED → POLLUTED/);
  assert.match(english.stdout, /AUTOPSY CONCLUSION\s+\S+/);
  assert.doesNotMatch(english.stdout, /月度尸检|有效观察|主症状|生态人格/);
});

test("week and month support English summaries", () => {
  const week = runCli(
    ["week", "--date", "2026-07-23", "--lang", "en"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );
  const month = runCli(
    ["month", "--date", "2026-07-23", "--source", "codex", "--lang", "en"],
    {
      ANTI_AI_CODEX_DIR: baselineCodexDir,
    },
  );

  assert.equal(week.status, 0, week.stderr);
  assert.match(week.stdout, /7-day total\s+350 tokens · 4 model requests/);
  assert.match(week.stdout, /7-day resource bill/);
  assert.match(week.stdout, /Seven days passed/);
  assert.doesNotMatch(week.stdout, /7 日合计|资源账单|七天过去了/);

  assert.equal(month.status, 0, month.stderr);
  assert.match(month.stdout, /Mon\s+Tue\s+Wed\s+Thu\s+Fri\s+Sat\s+Sun/);
  assert.match(month.stdout, /Monthly total\s+1,000 tokens · 8 model requests/);
  assert.match(month.stdout, /AI-free days\s+15 days \/ 23 days/);
  assert.match(month.stdout, /Monthly resource bill/);
  assert.doesNotMatch(month.stdout, /月度合计|AI 清醒日|本月资源账单/);
});

test("share prints a privacy-safe SVG without exact tokens or model names", () => {
  const result = runCli(
    ["share", "--date", "2026-07-23"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^<svg\b/);
  assert.match(result.stdout, /YOUR AI RECEIPT/);
  assert.match(result.stdout, /2026-07-23/);
  assert.match(result.stdout, /0\.96–1\.36 Wh/);
  assert.match(result.stdout, /1\.04–8\.44 mL/);
  assert.match(result.stdout, /0\.12–0\.21 gCO₂e/);
  assert.match(result.stdout, /今日罪名：初犯记录/);
  assert.match(result.stdout, /隐私模式：未包含对话、路径、模型名和精确 Token/);
  assert.match(result.stdout, /<\/svg>\n$/);
  assert.doesNotMatch(result.stdout, /350 tokens|gpt-test|claude-test/);
  assert.doesNotMatch(result.stdout, /Codex|Claude Code|\/Users\//);
});

test("share supports a fully English privacy-safe SVG", () => {
  const result = runCli(
    ["share", "--date", "2026-07-23", "--lang", "en"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RESOURCE USE ESTIMATE/);
  assert.doesNotMatch(result.stdout, /PUBLISHED PROXY RANGE/);
  assert.match(result.stdout, /EVERYDAY TRANSLATION/);
  assert.match(result.stdout, /TODAY&apos;S CHARGE: FIRST OFFENSE/);
  assert.match(
    result.stdout,
    /PRIVACY MODE: no chats, paths, model names, or exact tokens/,
  );
  assert.doesNotMatch(result.stdout, /今日罪名|隐私模式|生活翻译/);
});

test("share --card pathology prints a bilingual privacy-safe creature autopsy", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-pathology-card-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "pathology-card",
    ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
  };

  const chinese = runCli(
    ["share", "--card", "pathology", "--date", "2026-07-23"],
    env,
  );
  const english = runCli(
    [
      "share",
      "--card",
      "pathology",
      "--date",
      "2026-07-23",
      "--lang",
      "en",
    ],
    env,
  );

  for (const result of [chinese, english]) {
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^<svg\b/);
    assert.match(result.stdout, /[0-9a-f]{8}/);
    assert.doesNotMatch(result.stdout, /350 tokens|gpt-test|claude-test/);
    assert.doesNotMatch(result.stdout, /Codex|Claude Code|\/Users\//);
  }
  assert.match(chinese.stdout, /异变体病理报告/);
  assert.match(chinese.stdout, /标本编号/);
  assert.match(chinese.stdout, /生态人格/);
  assert.match(chinese.stdout, /隐私模式：无对话、路径、模型名或精确 Token/);
  assert.match(english.stdout, /MUTATION PATHOLOGY REPORT/);
  assert.match(english.stdout, /SPECIMEN ID/);
  assert.match(english.stdout, /ECOLOGY/);
  assert.match(
    english.stdout,
    /PRIVACY MODE: no chats, paths, model names, or exact tokens/,
  );
  assert.doesNotMatch(english.stdout, /异变体病理报告|标本编号|生态人格/);
});

test("share --card pathology reports a recoverable corrupted creature file", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-pathology-corrupt-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(path.join(home, ".anti-ai", "creature.json"), "{not-json\n");

  const result = runCli(
    ["share", "--card", "pathology", "--date", "2026-07-23"],
    { HOME: home },
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(
    result.stderr,
    "病理报告无法读取异变体档案。运行 anti-ai creature reset 后可重新孵化。\n",
  );
  assert.doesNotMatch(result.stderr, /\/Users\/|SyntaxError|at runCreature/);
});

test("creature --json turns the latest 30 days into an initial mutation file", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-home-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    {
      HOME: home,
      ANTI_AI_CREATURE_SEED: "test-seed",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), {
    date: "2026-07-23",
    status: "active",
    stage: "contaminated_embryo",
    branch: "nuclear",
    form: "compute_embryo",
    exposure: 27,
    nextStageAt: 7,
    progressPercent: 14,
    quietStreakDays: 0,
    activeStreakDays: 1,
    ageDays: 1,
    experienceDays: 1,
    observedDays: 30,
    activeDays: 1,
    traits: {
      context: 0.01,
      cache: 15.2,
      frenzy: 1.08,
      nuclear: 22.68,
    },
    level: 1,
    abilities: {
      appetite: 1,
      memory: 0,
      shell: 1,
      mouths: 0,
      glow: 1,
      instability: 0,
      withdrawal: 0,
    },
    abilityPoints: 3,
    dominantAbility: "appetite",
    temperament: "voracious",
    epithet: "token_sink",
    talents: [],
    rareChancePercent: 8,
    rareAbilities: {},
    rareAbilityChancesPercent: {
      rare: 0.5,
      epic: 0.1,
      mythic: 0.02,
    },
    collections: {
      mutationEvents: 1,
      rareMutations: 0,
      talentsUnlocked: 0,
      rareAbilitiesUnlocked: 0,
      achievementsUnlocked: 0,
      formsUnlocked: 1,
      appearancePartsUnlocked: 3,
      specimensCollected: 1,
    },
    ecology: {
      pollution: 1,
      clarity: 0,
      pollutionRate: 1,
      clarityRate: 0,
      type: "unformed",
      pendingType: "polluted",
      pendingDays: 1,
    },
    ecologyForm: "extinguished_core",
    appearance: {
      version: 1,
      specimenId: "609f9f4b",
      geneIds: {
        body: "body_03",
        eyes: "eyes_08",
        mouth: "mouth_02",
        core: "core_01",
        limbs: "limbs_06",
        tail: "tail_06",
        pattern: "pattern_02",
      },
      partIds: ["body_03", "eyes_08", "mouth_02"],
      fingerprint: "a78d962af277",
      stageIndex: 0,
      ecology: "unformed",
      pathology: "nuclear",
      formId: "extinguished_core",
      achievementId: null,
      achievementCategory: null,
      rareAbilityId: null,
    },
    achievements: {
      unlocked: [],
      recent: [],
      total: 24,
    },
    title: {
      modifierId: "awaiting_shape",
      coreId: "extinguished_core",
      achievementId: null,
    },
    mood: "token_chewing",
    today: {
      pollutionDose: 27,
      usageBand: "calibrating",
      ecologyGains: {
        pollution: 1,
        clarity: 0,
      },
      event: {
        id: "cache_calcification",
        rarity: "common",
      },
      abilityGains: {
        appetite: 1,
        memory: 0,
        shell: 1,
        mouths: 0,
        glow: 1,
        instability: 0,
        withdrawal: 0,
      },
      rareAbilityGain: null,
      achievementUnlockIds: [],
      newTalents: [],
    },
  });
});

test("creature persists one deterministic mutation event per active day", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-event-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "test-seed",
  };

  const first = runCli(["creature", "--date", "2026-07-23", "--json"], env);
  const second = runCli(["creature", "--date", "2026-07-23", "--json"], env);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(JSON.parse(second.stdout), JSON.parse(first.stdout));
  assert.deepEqual(JSON.parse(first.stdout).today.event, {
    id: "cache_calcification",
    rarity: "common",
  });
});

test("creature gives every settled day neutral experience and exposes ecology", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-ecology-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(["creature", "--date", "2026-07-23", "--json"], {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "ecology-seed",
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.experienceDays, 1);
  assert.deepEqual(report.ecology, {
    pollution: 1,
    clarity: 0,
    pollutionRate: 1,
    clarityRate: 0,
    type: "unformed",
    pendingType: "polluted",
    pendingDays: 1,
  });
  assert.deepEqual(report.today.ecologyGains, {
    pollution: 1,
    clarity: 0,
  });
  assert.equal(report.today.usageBand, "calibrating");
});

test("creature uses the seven-day baseline for pollution and rewards quiet days equally", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-ecology-bands-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const regularUsage = [
    {
      input_tokens: 900,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 1_000,
    },
  ];
  const heavyUsage = [
    {
      input_tokens: 1_800,
      cached_input_tokens: 0,
      output_tokens: 200,
      total_tokens: 2_000,
    },
  ];
  for (let day = 1; day <= 7; day += 1) {
    writeCodexUsage(root, regularUsage, `2026-07-${String(day).padStart(2, "0")}`);
  }
  writeCodexUsage(root, heavyUsage, "2026-07-08");
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "ecology-bands",
  };

  const heavy = runCli(["creature", "--date", "2026-07-08", "--json"], env);
  const quiet = runCli(["creature", "--date", "2026-07-09", "--json"], env);

  assert.equal(heavy.status, 0, heavy.stderr);
  assert.equal(quiet.status, 0, quiet.stderr);
  const heavyReport = JSON.parse(heavy.stdout);
  const quietReport = JSON.parse(quiet.stdout);
  assert.equal(heavyReport.experienceDays, 8);
  assert.equal(heavyReport.stage, "mutated_juvenile");
  assert.equal(heavyReport.today.usageBand, "heavy");
  assert.deepEqual(heavyReport.today.ecologyGains, {
    pollution: 1,
    clarity: 0,
  });
  assert.equal(quietReport.experienceDays, 9);
  assert.equal(quietReport.stage, "mutated_juvenile");
  assert.equal(quietReport.today.usageBand, "sober");
  assert.deepEqual(quietReport.today.ecologyGains, {
    pollution: 0,
    clarity: 3,
  });
});

test("creature renders a stable individualized ASCII specimen from its local genome", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-genome-art-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const firstEnv = {
    HOME: path.join(workspace, "first"),
    ANTI_AI_CREATURE_SEED: "genome-first",
  };
  const secondEnv = {
    HOME: path.join(workspace, "second"),
    ANTI_AI_CREATURE_SEED: "genome-second",
  };

  const firstJson = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    firstEnv,
  );
  const repeatedArt = runCli(
    ["creature", "--date", "2026-07-23"],
    firstEnv,
  );
  const firstArt = runCli(
    ["creature", "--date", "2026-07-23"],
    firstEnv,
  );
  const englishArt = runCli(
    ["creature", "--date", "2026-07-23", "--lang", "en"],
    firstEnv,
  );
  const coloredArt = runCli(["creature", "--date", "2026-07-23"], {
    ...firstEnv,
    FORCE_COLOR: "1",
    NO_COLOR: "",
  });
  const secondJson = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    secondEnv,
  );
  const secondArt = runCli(
    ["creature", "--date", "2026-07-23"],
    secondEnv,
  );

  for (const result of [
    firstJson,
    repeatedArt,
    firstArt,
    englishArt,
    coloredArt,
    secondJson,
    secondArt,
  ]) {
    assert.equal(result.status, 0, result.stderr);
  }
  const firstReport = JSON.parse(firstJson.stdout);
  const secondReport = JSON.parse(secondJson.stdout);
  assert.match(firstReport.appearance.specimenId, /^[0-9a-f]{8}$/);
  assert.equal(firstReport.appearance.version, 1);
  assert.deepEqual(Object.keys(firstReport.appearance.geneIds), [
    "body",
    "eyes",
    "mouth",
    "core",
    "limbs",
    "tail",
    "pattern",
  ]);
  assert.ok(firstReport.appearance.partIds.length >= 3);
  assert.match(firstReport.appearance.fingerprint, /^[0-9a-f]{12}$/);
  assert.notEqual(
    firstReport.appearance.fingerprint,
    secondReport.appearance.fingerprint,
  );
  assert.match(firstArt.stdout, new RegExp(`标本编号\\s+${firstReport.appearance.specimenId}`));
  assert.equal(firstArt.stdout, repeatedArt.stdout);

  const artLines = (output) => {
    const lines = output.split("\n");
    const specimenIndex = lines.findIndex(
      (line) => line.includes("标本编号") || line.includes("SPECIMEN ID"),
    );
    return lines.slice(2, specimenIndex - 1);
  };
  const firstArtLines = artLines(firstArt.stdout);
  const englishArtLines = artLines(englishArt.stdout);
  const coloredArtLines = artLines(
    coloredArt.stdout.replace(/\u001b\[[0-9;]*m/g, ""),
  );
  const secondArtLines = artLines(secondArt.stdout);
  assert.deepEqual(firstArtLines, englishArtLines);
  assert.deepEqual(firstArtLines, coloredArtLines);
  assert.notDeepEqual(firstArtLines, secondArtLines);
  assert.ok(firstArtLines.length >= 5);
  assert.ok(firstArtLines.every((line) => terminalWidth(line) <= 39));
  assert.ok(secondArtLines.every((line) => terminalWidth(line) <= 39));
});

test("complete-form ASCII keeps 10,000 seeded specimens diverse and bounded", () => {
  const appearances = new Set();
  for (let index = 0; index < 10_000; index += 1) {
    const appearanceState = creatureAppearanceState(`collision-seed-${index}`);
    const appearance = deriveCreatureAppearance(
      appearanceState,
      3,
      "paradox",
      "context",
      [],
      {},
    );
    const art = creatureArt({ appearance });
    appearances.add(art);
    assert.ok(
      art.split("\n").every((line) => terminalWidth(line) <= 39),
      `seed ${index} exceeded 39 columns`,
    );
  }

  const collisionRate = (10_000 - appearances.size) / 10_000;
  assert.ok(collisionRate <= 0.05, `collision rate was ${collisionRate}`);
  assert.deepEqual(creatureAppearanceContentStats(), {
    basePartIds: 54,
    formFamilies: 16,
    achievements: 24,
  });
});

test("creature unlocks equally visible feeding and sobriety achievements", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-achievements-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const usage = [
    {
      input_tokens: 900,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 1_000,
    },
  ];
  for (let day = 1; day <= 7; day += 1) {
    writeCodexUsage(root, usage, `2026-07-${String(day).padStart(2, "0")}`);
  }
  writeCodexUsage(root, usage, "2026-07-11");
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "achievement-seed",
  };

  const active = runCli(["creature", "--date", "2026-07-07", "--json"], env);
  const quiet = runCli(["creature", "--date", "2026-07-08", "--json"], env);
  const human = runCli(["creature", "--date", "2026-07-08"], env);
  const coloredHuman = runCli(["creature", "--date", "2026-07-08"], {
    ...env,
    FORCE_COLOR: "1",
    NO_COLOR: "",
  });
  const paradoxHuman = runCli(["creature", "--date", "2026-07-11"], {
    ...env,
    FORCE_COLOR: "1",
    NO_COLOR: "",
  });

  assert.equal(active.status, 0, active.stderr);
  assert.equal(quiet.status, 0, quiet.stderr);
  assert.equal(human.status, 0, human.stderr);
  assert.equal(coloredHuman.status, 0, coloredHuman.stderr);
  assert.equal(paradoxHuman.status, 0, paradoxHuman.stderr);
  const activeReport = JSON.parse(active.stdout);
  const quietReport = JSON.parse(quiet.stdout);
  assert.ok(
    activeReport.achievements.unlocked.some(
      (achievement) => achievement.id === "seven_day_feeding",
    ),
  );
  assert.ok(
    quietReport.achievements.unlocked.some(
      (achievement) => achievement.id === "first_supply_cut",
    ),
  );
  assert.deepEqual(
    quietReport.achievements.recent.map((achievement) => achievement.id),
    ["first_supply_cut"],
  );
  assert.equal(
    quietReport.collections.achievementsUnlocked,
    quietReport.achievements.unlocked.length,
  );
  assert.match(quietReport.title.modifierId, /^[a-z_]+$/);
  assert.equal(quietReport.title.coreId, quietReport.ecologyForm);
  assert.match(human.stdout, /徽章\s+\[\d+\]/);
  assert.match(human.stdout, /今日成就\s+第一次断供/);
  assert.match(human.stdout, /称号\s+.*第一次断供/);
  assert.ok(coloredHuman.stdout.includes("\u001b[1;31m七日连喂"));
  assert.ok(coloredHuman.stdout.includes("\u001b[1;36m第一次断供"));
  assert.ok(paradoxHuman.stdout.includes("\u001b[1;33m续杯戒断者"));
});

test("repeatable achievements grow through three non-token tiers", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-achievement-tier-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const usage = [
    {
      input_tokens: 900,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 1_000,
    },
  ];
  for (let day = 1; day <= 30; day += 1) {
    writeCodexUsage(root, usage, `2026-06-${String(day).padStart(2, "0")}`);
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "achievement-tier-seed",
  };

  const json = runCli(["creature", "--date", "2026-06-30", "--json"], env);
  const human = runCli(["creature", "--date", "2026-06-30"], env);

  assert.equal(json.status, 0, json.stderr);
  assert.equal(human.status, 0, human.stderr);
  const achievement = JSON.parse(json.stdout).achievements.unlocked.find(
    (candidate) => candidate.id === "seven_day_feeding",
  );
  assert.deepEqual(achievement, {
    id: "seven_day_feeding",
    category: "offense",
    rarity: "common",
    tier: 2,
    maxTier: 3,
    progress: 30,
    nextTierAt: 100,
    unlockedAt: "2026-06-07",
  });
  assert.match(human.stdout, /七日连喂 \[定罪 30\/100\]/);
});

test("creature grows achievement-marked ASCII complexity without extra token experience", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-art-growth-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 900,
        cached_input_tokens: 0,
        output_tokens: 100,
        total_tokens: 1_000,
      },
    ],
    "2026-01-01",
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "art-growth",
  };

  const hatch = runCli(["creature", "--date", "2026-01-01", "--json"], env);
  const grown = runCli(["creature", "--date", "2026-03-31", "--json"], env);

  assert.equal(hatch.status, 0, hatch.stderr);
  assert.equal(grown.status, 0, grown.stderr);
  const hatchReport = JSON.parse(hatch.stdout);
  const grownReport = JSON.parse(grown.stdout);
  assert.equal(hatchReport.experienceDays, 1);
  assert.equal(hatchReport.appearance.partIds.length, 3);
  assert.equal(grownReport.experienceDays, 90);
  assert.equal(grownReport.stage, "catastrophe_complete");
  assert.equal(grownReport.ecology.type, "lucid");
  assert.equal(grownReport.appearance.partIds.length, 9);
  assert.ok(
    grownReport.appearance.partIds.some((partId) =>
      partId.startsWith("achievement_"),
    ),
  );
  assert.notEqual(
    grownReport.appearance.fingerprint,
    hatchReport.appearance.fingerprint,
  );
});

test("chromatic mutations visibly outrank achievement marks on complete forms", () => {
  const appearanceState = creatureAppearanceState("chromatic-priority");
  const achievements = [
    {
      id: "seven_day_feeding",
      category: "offense",
      rarity: "common",
      tier: 1,
      unlockedAt: "2026-01-07",
    },
  ];
  const achievementOnly = deriveCreatureAppearance(
    appearanceState,
    3,
    "polluted",
    "frenzy",
    achievements,
    {},
  );
  const chromatic = deriveCreatureAppearance(
    appearanceState,
    3,
    "polluted",
    "frenzy",
    achievements,
    { deadline_scent: { rarity: "rare", level: 1 } },
  );

  assert.equal(chromatic.partIds.at(-1), "chromatic_deadline_scent");
  assert.notEqual(chromatic.fingerprint, achievementOnly.fingerprint);
  assert.notEqual(
    creatureArt({ appearance: chromatic }),
    creatureArt({ appearance: achievementOnly }),
  );

  const embryo = deriveCreatureAppearance(
    appearanceState,
    0,
    "unformed",
    "frenzy",
    [],
    {},
  );
  const chromaticEmbryo = deriveCreatureAppearance(
    appearanceState,
    0,
    "unformed",
    "frenzy",
    [],
    { deadline_scent: { rarity: "rare", level: 1 } },
  );
  assert.equal(chromaticEmbryo.partIds.length, 3);
  assert.notEqual(chromaticEmbryo.fingerprint, embryo.fingerprint);
  assert.notEqual(
    creatureArt({ appearance: chromaticEmbryo }),
    creatureArt({ appearance: embryo }),
  );
});

test("creature grows deterministic random abilities and exposes playable state", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-abilities-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "ability-seed",
  };

  const first = runCli(["creature", "--date", "2026-07-23", "--json"], env);
  const second = runCli(["creature", "--date", "2026-07-23", "--json"], env);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const report = JSON.parse(first.stdout);
  assert.deepEqual(JSON.parse(second.stdout), report);
  assert.deepEqual(Object.keys(report.abilities), [
    "appetite",
    "memory",
    "shell",
    "mouths",
    "glow",
    "instability",
    "withdrawal",
  ]);
  assert.ok(
    Object.values(report.abilities).every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 999,
    ),
  );
  assert.ok(Object.values(report.today.abilityGains).some((value) => value > 0));
  assert.ok(Object.hasOwn(report.abilities, report.dominantAbility));
  assert.ok(report.level >= 1);
  assert.ok(report.abilityPoints > 0);
  assert.match(report.temperament, /^[a-z_]+$/);
  assert.match(report.mood, /^[a-z_]+$/);
  assert.ok(report.rareChancePercent >= 8);
  assert.deepEqual(report.collections, {
    mutationEvents: 1,
    rareMutations: 0,
    talentsUnlocked: report.talents.length,
    rareAbilitiesUnlocked: 0,
    achievementsUnlocked: report.achievements.unlocked.length,
    formsUnlocked: 1,
    appearancePartsUnlocked: report.appearance.partIds.length,
    specimensCollected: 1,
  });
});

test("creature abilities unlock talents and withdrawal grows on AI-free days", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-ability-growth-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  const usage = [
    {
      input_tokens: 10_000,
      cached_input_tokens: 0,
      output_tokens: 1_000_000,
      total_tokens: 1_010_000,
    },
  ];
  for (let day = 1; day <= 12; day += 1) {
    writeCodexUsage(root, usage, `2026-07-${String(day).padStart(2, "0")}`);
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "talent-seed",
  };

  const active = runCli(["creature", "--date", "2026-07-12", "--json"], env);
  const quiet = runCli(["creature", "--date", "2026-07-13", "--json"], env);

  assert.equal(active.status, 0, active.stderr);
  assert.equal(quiet.status, 0, quiet.stderr);
  const activeReport = JSON.parse(active.stdout);
  const quietReport = JSON.parse(quiet.stdout);
  assert.ok(activeReport.level > 1);
  assert.ok(activeReport.talents.length > 0);
  assert.ok(activeReport.today.newTalents.length > 0);
  assert.equal(
    quietReport.abilities.withdrawal,
    activeReport.abilities.withdrawal + 1,
  );
  assert.equal(quietReport.today.abilityGains.withdrawal, 1);
  assert.equal(quietReport.mood, "withdrawal_tremor");
  assert.equal(
    quietReport.collections.talentsUnlocked,
    quietReport.talents.length,
  );
});

test("grown Instability raises the future rare-mutation chance", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-instability-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const usage = [
    {
      input_tokens: 10_000,
      cached_input_tokens: 0,
      output_tokens: 1_000_000,
      total_tokens: 1_010_000,
    },
  ];
  const startDate = "2026-01-01";
  for (let day = 0; day < 200; day += 1) {
    writeCodexUsage(root, usage, shiftTestDate(startDate, day));
  }

  const env = {
    HOME: path.join(workspace, "home"),
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "instability-0",
  };
  const hatch = runCli(["creature", "--date", startDate, "--json"], env);
  const result = runCli(
    ["creature", "--date", shiftTestDate(startDate, 199), "--json"],
    env,
  );

  assert.equal(hatch.status, 0, hatch.stderr);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.abilities.instability >= 20);
  assert.ok(report.rareChancePercent > 8);
  assert.ok(report.collections.rareMutations > 0);
});

test("creature abilities retain more than one year of growth headroom", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-year-growth-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2025-01-01";
  const usage = [
    {
      input_tokens: 10_000,
      cached_input_tokens: 0,
      output_tokens: 100_000_000,
      total_tokens: 100_010_000,
    },
  ];

  for (let day = 0; day < 400; day += 1) {
    writeCodexUsage(root, usage, shiftTestDate(startDate, day));
  }

  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "one-year-growth",
  };
  const hatch = runCli(
    ["creature", "--date", startDate, "--json"],
    env,
  );
  const grown = runCli(
    ["creature", "--date", shiftTestDate(startDate, 399), "--json"],
    env,
  );

  assert.equal(hatch.status, 0, hatch.stderr);
  assert.equal(grown.status, 0, grown.stderr);
  const report = JSON.parse(grown.stdout);
  const values = Object.values(report.abilities);
  assert.equal(report.activeDays, 400);
  assert.ok(Math.max(...values) > 99);
  assert.ok(Math.max(...values) < 999);
  assert.ok(values.every((value) => value >= 0 && value <= 999));
  assert.ok(report.talents.includes("planetary_feedlot"));
});

test("creature awakens deterministic low-probability rare abilities", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-rare-ability-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(["creature", "--date", "2026-07-23", "--json"], {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "rare-ability-297",
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.rareAbilityChancesPercent, {
    rare: 0.5,
    epic: 0.1,
    mythic: 0.02,
  });
  assert.deepEqual(report.rareAbilities, {
    deadline_scent: {
      rarity: "rare",
      level: 1,
    },
  });
  assert.deepEqual(report.today.rareAbilityGain, {
    id: "deadline_scent",
    rarity: "rare",
    points: 1,
  });
  assert.equal(report.collections.rareAbilitiesUnlocked, 1);
});

test("drawing the same rare ability again grows its level", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-rare-growth-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const usage = [
    {
      input_tokens: 1_000,
      cached_input_tokens: 0,
      output_tokens: 1_000,
      total_tokens: 2_000,
    },
  ];
  writeCodexUsage(root, usage, "2026-07-12");
  writeCodexUsage(root, usage, "2026-08-27");
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "growth-3",
  };

  const first = runCli(
    ["creature", "--date", "2026-07-12", "--json"],
    env,
  );
  const second = runCli(
    ["creature", "--date", "2026-08-27", "--json"],
    env,
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const report = JSON.parse(second.stdout);
  assert.deepEqual(report.rareAbilities.rubber_duck_necromancy, {
    rarity: "rare",
    level: 2,
  });
  assert.deepEqual(report.today.rareAbilityGain, {
    id: "rubber_duck_necromancy",
    rarity: "rare",
    points: 1,
  });
});

test("v0.6 creature files migrate without losing stored ability growth", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-v06-migration-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const days = {};
  const startDate = "2026-01-01";
  for (let day = 0; day < 100; day += 1) {
    days[shiftTestDate(startDate, day)] = {
      pollutionDose: 40,
      active: true,
      traits: {
        context: 0,
        cache: 0,
        frenzy: 40,
        nuclear: 0,
      },
      event: {
        id: "request_budding",
        rarity: "common",
      },
      abilityGains: {
        appetite: 1,
        memory: 0,
        shell: 0,
        mouths: 2,
        glow: 0,
        instability: 0,
        withdrawal: 0,
      },
    };
  }
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(home, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 2,
      seed: "v06-migration",
      days,
    })}\n`,
  );
  const env = { HOME: home };
  const date = shiftTestDate(startDate, 99);

  const first = runCli(["creature", "--date", date, "--json"], env);
  const second = runCli(["creature", "--date", date, "--json"], env);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const report = JSON.parse(first.stdout);
  assert.deepEqual(JSON.parse(second.stdout), report);
  assert.equal(report.abilities.mouths, 198);
  assert.ok(report.collections.rareAbilitiesUnlocked >= 0);
});

test("schema v1-v3 creature files migrate idempotently to private ecology state", (t) => {
  for (const schemaVersion of [1, 2, 3]) {
    const home = mkdtempSync(
      path.join(tmpdir(), `anti-ai-schema-${schemaVersion}-`),
    );
    t.after(() => rmSync(home, { recursive: true, force: true }));
    mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
    writeFileSync(
      path.join(home, ".anti-ai", "creature.json"),
      `${JSON.stringify({
        schemaVersion,
        seed: `schema-${schemaVersion}`,
        days: {
          "2026-07-01": {
            pollutionDose: 40,
            active: true,
            traits: {
              context: 40,
              cache: 0,
              frenzy: 0,
              nuclear: 0,
            },
            event: {
              id: "misplaced_context",
              rarity: "common",
            },
          },
          "2026-07-02": {
            pollutionDose: 0,
            active: false,
            traits: {
              context: 0,
              cache: 0,
              frenzy: 0,
              nuclear: 0,
            },
            event: null,
          },
        },
      })}\n`,
    );
    const env = { HOME: home };

    const first = runCli(
      ["creature", "--date", "2026-07-02", "--json"],
      env,
    );
    const second = runCli(
      ["creature", "--date", "2026-07-02", "--json"],
      env,
    );

    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.deepEqual(JSON.parse(second.stdout), JSON.parse(first.stdout));
    const report = JSON.parse(first.stdout);
    assert.equal(report.experienceDays, 2);
    assert.equal(report.ecology.pollution, 1);
    assert.equal(report.ecology.clarity, 3);
    const saved = JSON.parse(
      readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
    );
    assert.equal(saved.schemaVersion, 4);
    assert.equal(saved.appearance.version, 1);
    assert.match(saved.appearance.specimenId, /^[0-9a-f]{8}$/);
    assert.equal(saved.specimens.length, 1);
    assert.match(saved.specimens[0].fingerprint, /^[0-9a-f]{12}$/);
    assert.equal(saved.specimens[0].renderVersion, 1);
    assert.equal(saved.specimens[0].recordedAt, "2026-07-02");
    assert.deepEqual(saved.days["2026-07-02"].ecologyGains, {
      pollution: 0,
      clarity: 3,
    });
    assert.doesNotMatch(
      JSON.stringify(saved),
      /totalTokens|modelName|prompt|response|requestTimestamp/,
    );
  }
});

test("creature can reach a rare mutation from its local deterministic seed", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-rare-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(["creature", "--date", "2026-07-23", "--json"], {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "rare-4",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).today.event, {
    id: "infinite_appendix",
    rarity: "rare",
  });
});

test("creature evolves into four branches from distinct usage patterns", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-branches-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const patterns = {
    context: [
      {
        input_tokens: 5_000_000,
        cached_input_tokens: 0,
        output_tokens: 100,
        total_tokens: 5_000_100,
      },
    ],
    cache: [
      {
        input_tokens: 1_000_000,
        cached_input_tokens: 950_000,
        output_tokens: 100,
        total_tokens: 1_000_100,
      },
    ],
    frenzy: Array.from({ length: 60 }, () => ({
      input_tokens: 1_000,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 1_100,
    })),
    nuclear: [
      {
        input_tokens: 10_000,
        cached_input_tokens: 0,
        output_tokens: 1_000_000,
        total_tokens: 1_010_000,
      },
    ],
  };
  const actual = {};

  for (const [name, usages] of Object.entries(patterns)) {
    const root = path.join(workspace, name, "codex");
    const home = path.join(workspace, name, "home");
    mkdirSync(home, { recursive: true });
    writeCodexUsage(root, usages);
    const result = runCli(["creature", "--date", "2026-07-23", "--json"], {
      HOME: home,
      ANTI_AI_CODEX_DIR: root,
      ANTI_AI_CREATURE_SEED: "branch-seed",
    });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    actual[name] = {
      branch: report.branch,
      form: report.form,
      ecologyForm: report.ecologyForm,
    };
  }

  assert.deepEqual(actual, {
    context: {
      branch: "context",
      form: "context_polyp",
      ecologyForm: "blank_dossier_embryo",
    },
    cache: {
      branch: "cache",
      form: "cache_moss",
      ecologyForm: "standby_moss",
    },
    frenzy: {
      branch: "frenzy",
      form: "request_spore",
      ecologyForm: "unsent_spore",
    },
    nuclear: {
      branch: "nuclear",
      form: "compute_embryo",
      ecologyForm: "extinguished_core",
    },
  });
});

test("creature evolves across active days and becomes dormant on AI-free days", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-evolution-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  const heavyContextUsage = [
    {
      input_tokens: 5_000_000,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 5_000_100,
    },
  ];
  for (const date of ["2026-07-20", "2026-07-21", "2026-07-22"]) {
    writeCodexUsage(root, heavyContextUsage, date);
  }
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "evolution-seed",
  };

  const firstQuietDay = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    env,
  );
  const secondQuietDay = runCli(
    ["creature", "--date", "2026-07-24", "--json"],
    env,
  );

  assert.equal(firstQuietDay.status, 0, firstQuietDay.stderr);
  assert.equal(secondQuietDay.status, 0, secondQuietDay.stderr);
  assert.deepEqual(
    [firstQuietDay, secondQuietDay].map((result) => {
      const report = JSON.parse(result.stdout);
      return {
        status: report.status,
        stage: report.stage,
        branch: report.branch,
        form: report.form,
        experienceDays: report.experienceDays,
        ecologyType: report.ecology.type,
        exposure: report.exposure,
        quietStreakDays: report.quietStreakDays,
        event: report.today.event,
      };
    }),
    [
      {
        status: "dormant",
        stage: "contaminated_embryo",
        branch: "context",
        form: "context_polyp",
        experienceDays: 4,
        ecologyType: "polluted",
        exposure: 238,
        quietStreakDays: 1,
        event: null,
      },
      {
        status: "dormant",
        stage: "contaminated_embryo",
        branch: "context",
        form: "context_polyp",
        experienceDays: 5,
        ecologyType: "polluted",
        exposure: 236,
        quietStreakDays: 2,
        event: null,
      },
    ],
  );
});

test("creature backfills the full gap between visits after its initial 30 days", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-gap-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  const usage = [
    {
      input_tokens: 5_000_000,
      cached_input_tokens: 0,
      output_tokens: 100,
      total_tokens: 5_000_100,
    },
  ];
  writeCodexUsage(root, usage, "2026-06-01");
  writeCodexUsage(root, usage, "2026-07-01");
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "gap-seed",
  };

  const firstVisit = runCli(
    ["creature", "--date", "2026-06-01", "--json"],
    env,
  );
  const laterVisit = runCli(
    ["creature", "--date", "2026-08-15", "--json"],
    env,
  );

  assert.equal(firstVisit.status, 0, firstVisit.stderr);
  assert.equal(laterVisit.status, 0, laterVisit.stderr);
  assert.equal(JSON.parse(firstVisit.stdout).activeDays, 1);
  assert.equal(JSON.parse(laterVisit.stdout).activeDays, 2);
});

test("creature renders bilingual mutation files without leaking raw usage", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-copy-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const env = {
    HOME: path.join(workspace, "home"),
    ANTI_AI_CREATURE_SEED: "test-seed",
  };
  mkdirSync(env.HOME, { recursive: true });

  const zh = runCli(["creature", "--date", "2026-07-23"], env);
  const en = runCli(
    ["creature", "--date", "2026-07-23", "--lang", "en"],
    env,
  );

  assert.equal(zh.status, 0, zh.stderr);
  assert.match(zh.stdout, /TOKEN MUTATION FILE · 2026-07-23/);
  assert.match(zh.stdout, /☢ 今日污染剂量\s+\+27/);
  assert.match(zh.stdout, /阶段\s+异常胚体 I · 14%/);
  assert.match(zh.stdout, /进化分支\s+核食系/);
  assert.match(zh.stdout, /生态人格\s+未定型/);
  assert.match(zh.stdout, /形态\s+熄火幼核/);
  assert.match(zh.stdout, /标本编号\s+[0-9a-f]{8}/);
  assert.match(zh.stdout, /徽章\s+\[\d+\]/);
  assert.match(zh.stdout, /今日成就/);
  assert.match(zh.stdout, /今日突变\s+\[普通\] 缓存钙化/);
  assert.match(zh.stdout, /能力值 · Lv\.\d+/);
  assert.match(zh.stdout, /吞噬欲/);
  assert.match(zh.stdout, /今日加点/);
  assert.match(zh.stdout, /今日解锁/);
  assert.match(zh.stdout, /畸变天赋/);
  assert.match(zh.stdout, /性格\s+/);
  assert.match(zh.stdout, /心情\s+/);
  assert.match(zh.stdout, /不保存对话、路径、模型名或精确 Token/);
  assert.doesNotMatch(zh.stdout, /180 tokens|gpt-test|Codex|\/Users\//);

  assert.equal(en.status, 0, en.stderr);
  assert.match(en.stdout, /TODAY'S POLLUTION DOSE\s+\+27/);
  assert.match(en.stdout, /STAGE\s+ANOMALOUS EMBRYO I · 14%/);
  assert.match(en.stdout, /EVOLUTION BRANCH\s+NUCLEAR FEEDER/);
  assert.match(en.stdout, /ECOLOGY\s+UNFORMED/);
  assert.match(en.stdout, /FORM\s+EXTINGUISHED CORE/);
  assert.match(en.stdout, /SPECIMEN ID\s+[0-9a-f]{8}/);
  assert.match(en.stdout, /BADGES\s+\[\d+\]/);
  assert.match(en.stdout, /TODAY'S ACHIEVEMENTS/);
  assert.match(en.stdout, /TODAY'S MUTATION\s+\[COMMON\] CACHE CALCIFICATION/);
  assert.match(en.stdout, /ABILITIES · LV\.\d+/);
  assert.match(en.stdout, /APPETITE/);
  assert.match(en.stdout, /TODAY'S GROWTH/);
  assert.match(en.stdout, /TODAY'S UNLOCKS/);
  assert.match(en.stdout, /MUTATION TALENTS/);
  assert.match(en.stdout, /TEMPERAMENT\s+/);
  assert.match(en.stdout, /MOOD\s+/);
  assert.match(en.stdout, /stores no chats, paths, model names, or exact tokens/);
  assert.doesNotMatch(en.stdout, /今日污染|阶段|进化分支|今日突变/);
});

test("creature ability bars and numeric values align in both languages", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-alignment-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const env = {
    HOME: path.join(workspace, "home"),
    ANTI_AI_CREATURE_SEED: "alignment-seed",
  };
  mkdirSync(env.HOME, { recursive: true });

  const reports = [
    runCli(["creature", "--date", "2026-07-23"], env),
    runCli(["creature", "--date", "2026-07-23", "--lang", "en"], env),
  ];

  for (const report of reports) {
    assert.equal(report.status, 0, report.stderr);
    const lines = report.stdout
      .split("\n")
      .filter((line) => /[█░]{10}/u.test(line));
    assert.equal(lines.length, 7);
    const barColumns = lines.map((line) =>
      terminalWidth(line.slice(0, line.search(/[█░]/u))),
    );
    assert.equal(new Set(barColumns).size, 1);
    assert.ok(lines.every((line) => /[█░]{10} [ 0-9]{3} \/ 999$/u.test(line)));
  }
});

test("rare ability tiers use distinct terminal colors", (t) => {
  const cases = [
    ["rare-ability-297", "1;36", "[R] 截止日嗅觉"],
    ["rare-ability-268", "1;35", "[SR] 幻觉抗体"],
    ["rare-ability-345", "1;33", "[SSR] Token 炼金术"],
  ];

  for (const [seed, code, label] of cases) {
    const home = mkdtempSync(path.join(tmpdir(), "anti-ai-rare-color-"));
    t.after(() => rmSync(home, { recursive: true, force: true }));
    const result = runCli(["creature", "--date", "2026-07-23"], {
      HOME: home,
      ANTI_AI_CREATURE_SEED: seed,
      FORCE_COLOR: "1",
      NO_COLOR: "",
    });

    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes(`\u001b[${code}m${label}`));
  }
});

test("creature reset removes prior evolution through an explicit CLI action", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-reset-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 5_000_000,
        cached_input_tokens: 0,
        output_tokens: 100,
        total_tokens: 5_000_100,
      },
    ],
    "2026-06-01",
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "reset-seed",
  };

  const before = runCli(["creature", "--date", "2026-06-01", "--json"], env);
  const reset = runCli(["creature", "reset", "--json"], env);
  const after = runCli(["creature", "--date", "2026-07-23", "--json"], {
    ...env,
    ANTI_AI_CODEX_DIR: path.join(workspace, "empty-codex"),
  });

  assert.equal(before.status, 0, before.stderr);
  assert.equal(reset.status, 0, reset.stderr);
  assert.deepEqual(JSON.parse(reset.stdout), { reset: true });
  assert.equal(after.status, 0, after.stderr);
  assert.deepEqual(
    (({ status, exposure, activeDays, quietStreakDays }) => ({
      status,
      exposure,
      activeDays,
      quietStreakDays,
    }))(JSON.parse(after.stdout)),
    {
      status: "dormant",
      exposure: 0,
      activeDays: 0,
      quietStreakDays: 0,
    },
  );
});

test("creature rejects filtered sources that would corrupt one evolution history", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-source-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(
    ["creature", "--date", "2026-07-23", "--source", "codex"],
    { HOME: home },
  );

  assert.equal(result.status, 2);
  assert.equal(
    result.stderr,
    "creature 必须使用完整数据源；请移除 --source 过滤。\n",
  );
  assert.equal(result.stdout, "");
});

test("creature reports a recoverable error for a corrupted mutation file", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-creature-corrupt-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(path.join(home, ".anti-ai"), { recursive: true });
  writeFileSync(path.join(home, ".anti-ai", "creature.json"), "{not-json\n");

  const result = runCli(["creature", "--date", "2026-07-23"], { HOME: home });

  assert.equal(result.status, 1);
  assert.equal(
    result.stderr,
    "异变体档案无法读取。运行 anti-ai creature reset 后可重新孵化。\n",
  );
  assert.equal(result.stdout, "");
  assert.doesNotMatch(result.stderr, /\/Users\/|SyntaxError|at runCreature/);
});

test("doctor confirms both local log sources without exposing conversation text", () => {
  const result = runCli(
    ["doctor"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Codex\s+✓\s+1 个 JSONL 文件/);
  assert.match(result.stdout, /Claude Code\s+✓\s+1 个 JSONL 文件/);
  assert.match(result.stdout, /不采集、不保存、不输出会话正文/);
});

test("explain discloses every estimate factor, formula, source, and limitation", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /资源消耗估算，不是实际测量值/);
  assert.doesNotMatch(result.stdout, /公开代理跨度/);
  assert.match(result.stdout, /Google.*0\.24 Wh.*0\.26 mL.*0\.03 gCO₂e/s);
  assert.match(result.stdout, /OpenAI.*0\.34 Wh.*0\.32176 mL/s);
  assert.match(result.stdout, /Mistral.*400 输出 tokens.*45 mL.*1\.14 gCO₂e/s);
  assert.match(result.stdout, /Codex 和 Claude Code 没有公开逐请求资源账单/);
  assert.match(result.stdout, /置信度：低/);
  assert.match(result.stdout, /https:\/\/services\.google\.com\//);
  assert.match(result.stdout, /https:\/\/blog\.samaltman\.com\//);
  assert.match(result.stdout, /https:\/\/mistral\.ai\//);
});

test("explain discloses the assumptions behind everyday comparisons", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /10W LED 灯.*电力 Wh ÷ 10W/s);
  assert.match(result.stdout, /50W 笔记本电脑.*电力 Wh ÷ 50W/s);
  assert.match(result.stdout, /15Wh 手机充电.*电力 Wh ÷ 15Wh/s);
  assert.match(result.stdout, /烧开 1L 水.*电力 Wh ÷ 100Wh/s);
  assert.match(result.stdout, /250mL 水杯.*水耗 mL ÷ 250/s);
  assert.match(result.stdout, /550mL 矿泉水.*水耗 mL ÷ 550/s);
  assert.match(result.stdout, /6L 节水马桶.*水耗 mL ÷ 6,000/s);
  assert.match(result.stdout, /8L\/min 淋浴.*水耗 mL ÷ 8,000/s);
  assert.match(
    result.stdout,
    /电力对照按区间上界选择.*< 15 Wh.*< 1,500 Wh/s,
  );
  assert.match(
    result.stdout,
    /水耗对照按区间上界选择.*< 550 mL.*< 8,000 mL/s,
  );
  assert.match(
    result.stdout,
    /平均燃油车.*400 g CO₂\/英里.*248\.55 g CO₂\/公里/s,
  );
  assert.match(result.stdout, /城市树.*60 kg CO₂\/年/s);
  assert.match(result.stdout, /不换算成“砍了几棵树”/);
  assert.match(result.stdout, /https:\/\/www\.epa\.gov\/greenvehicles\//);
  assert.match(result.stdout, /https:\/\/www\.epa\.gov\/energy\//);
});

test("explain discloses the personal baseline and verdict rules", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /个人基线与判词.*过去 7 个自然日/s);
  assert.match(
    result.stdout,
    /上下文囤积.*请求数不高于基线 1\.2 倍.*单次 Token 不低于 1\.8 倍/s,
  );
  assert.match(result.stdout, /请求连发.*请求数不低于基线 2 倍/s);
  assert.match(
    result.stdout,
    /缓存类罪名.*缓存读取占输入至少 70%.*高出个人基线至少 10 个百分点/s,
  );
  assert.match(result.stdout, /同类罪名标题和文案按日期固定轮换/);
  assert.match(result.stdout, /判词由本地固定规则生成，不调用模型/);
  assert.match(result.stdout, /文案按日期固定轮换/);
  assert.match(result.stdout, /7 个罪名标题.*5 条详情.*35 种/s);
  assert.match(result.stdout, /跨月.*不会重置/s);
});

test("explain discloses how model usage is attributed", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /模型统计/);
  assert.match(result.stdout, /Codex.*turn_context.*model/s);
  assert.match(result.stdout, /Claude Code.*message\.model/s);
  assert.match(result.stdout, /缺少模型字段.*unknown/s);
  assert.match(
    result.stdout,
    /分享卡片.*不包含对话、路径、模型名或精确 Token/s,
  );
  assert.match(result.stdout, /anti-ai share --card pathology/);
  assert.match(result.stdout, /活体病历.*月度尸检/s);
});

test("explain discloses creature growth, chance, recovery, and state privacy", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /污染进化系统/);
  assert.match(
    result.stdout,
    /污染剂量.*log10\(当日 Token \+ 1\).*每日上限 100/s,
  );
  assert.match(result.stdout, /首次运行回看最近 30 个自然日/);
  assert.match(
    result.stdout,
    /上下文病变.*非缓存输入.*缓存化石.*缓存读取占比.*请求增殖.*请求数.*核食.*兜底/s,
  );
  assert.match(result.stdout, /生命阶段.*1、7、30、90/s);
  assert.match(result.stdout, /SHA-256.*8%.*稀有突变/s);
  assert.match(
    result.stdout,
    /7 个能力值.*吞噬欲.*赘生脑回.*化石甲.*请求口器.*核素亮度.*失控指数.*戒断反应/s,
  );
  assert.match(result.stdout, /活跃日.*确定性随机加点/s);
  assert.match(
    result.stdout,
    /失控指数.*每 10 点.*稀有突变率.*1.*上限 20%/s,
  );
  assert.match(result.stdout, /能力上限 999/);
  assert.match(
    result.stdout,
    /能力值达到 5、15、30、100、300、700.*解锁.*畸变天赋/s,
  );
  assert.match(
    result.stdout,
    /异色能力.*R 0\.50%.*SR 0\.10%.*SSR 0\.02%.*重复觉醒.*升级/s,
  );
  assert.match(result.stdout, /AI 清醒日.*污染 -2.*不会清除历史性状/s);
  assert.match(result.stdout, /~\/\.anti-ai\/creature\.json/);
  assert.match(
    result.stdout,
    /schema v4.*用量带、派生生态点、基因\/部件 ID、成就.*不保存精确 Token、模型名、路径、对话或逐请求时间/s,
  );
  assert.match(result.stdout, /anti-ai creature reset/);
});

test("explain discloses ecology, individualized ASCII, achievements, and schema v4", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /阅历.*每个已结算自然日.*高 Token.*不能加速/s,
  );
  assert.match(
    result.stdout,
    /污染性.*清醒性.*未定型.*污染型.*清醒型.*矛盾型/s,
  );
  assert.match(result.stdout, /连续 3 个已结算日.*生态人格/);
  assert.match(
    result.stdout,
    /稳定本地基因.*生命阶段.*使用病型.*成就部件.*异色突变/s,
  );
  assert.match(result.stdout, /罪证章.*戒断章.*悖论章/);
  assert.match(
    result.stdout,
    /schema v4.*不保存.*精确 Token.*模型名.*路径.*对话/s,
  );
});

test("doctor, explain, and help support English output", () => {
  const doctor = runCli(
    ["doctor", "--lang", "en"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );
  const explain = runCli(["explain", "--lang", "en"]);
  const help = runCli(["--help", "--lang", "en"]);

  assert.equal(doctor.status, 0, doctor.stderr);
  assert.match(doctor.stdout, /Does not collect, store, or print conversation text/);
  assert.doesNotMatch(doctor.stdout, /不采集/);

  assert.equal(explain.status, 0, explain.stderr);
  assert.match(explain.stdout, /Estimated resource use, not a measurement/);
  assert.doesNotMatch(explain.stdout, /Published proxy range/);
  assert.match(explain.stdout, /Model attribution/);
  assert.match(explain.stdout, /Verdicts are generated by fixed local rules/);
  assert.match(
    explain.stdout,
    /Share card.*omits chats, paths, model names, and exact token counts/s,
  );
  assert.match(explain.stdout, /Mutation system/);
  assert.match(explain.stdout, /8%.*rare mutation/s);
  assert.doesNotMatch(explain.stdout, /模型统计|个人基线与判词/);

  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Turn local AI tokens into an uncomfortable resource bill/);
  assert.match(help.stdout, /share\s+Print a privacy-safe SVG share card/);
  assert.match(help.stdout, /creature \[reset\]\s+Inspect or reset your mutation file/);
  assert.match(help.stdout, /--lang <zh\|en>/);
  assert.doesNotMatch(help.stdout, /打印今天/);
});

test("--help documents the public commands and filters", () => {
  const result = runCli(["--help"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage: anti-ai <command> \[options\]/);
  assert.match(result.stdout, /today\s+打印今天的 AI 资源账单/);
  assert.match(result.stdout, /week\s+打印最近 7 天趋势/);
  assert.match(result.stdout, /month\s+打印本月至指定日期的用量热力图/);
  assert.match(result.stdout, /share\s+输出隐私安全的 SVG 分享卡片/);
  assert.match(result.stdout, /creature \[reset\]\s+查看或重置异变体档案/);
  assert.match(result.stdout, /doctor\s+检查本地日志/);
  assert.match(result.stdout, /explain\s+解释资源估算口径/);
  assert.match(result.stdout, /--source <all\|codex\|claude>/);
  assert.match(result.stdout, /--json/);
  assert.match(result.stdout, /--lang <zh\|en>/);
});

test("--version prints the published package version", () => {
  const result = runCli(["--version"]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "anti-ai 1.0.0\n");
  assert.equal(result.stderr, "");
});

test("an unknown option fails with a useful error", () => {
  const result = runCli(["today", "--wat"]);

  assert.equal(result.status, 2);
  assert.equal(result.stderr, "未知参数：--wat\n");
  assert.equal(result.stdout, "");
});

test("an option that needs a value fails when the value is missing", () => {
  const result = runCli(["today", "--date"]);

  assert.equal(result.status, 2);
  assert.equal(result.stderr, "参数 --date 缺少值\n");
  assert.equal(result.stdout, "");
});

test("an unknown source fails instead of returning an empty report", () => {
  const result = runCli(["today", "--source", "cursor", "--json"]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /不支持的数据源：cursor/);
  assert.equal(result.stdout, "");
});

test("an unknown language fails instead of silently falling back", () => {
  const result = runCli(["today", "--lang", "fr"]);

  assert.equal(result.status, 2);
  assert.equal(result.stderr, "不支持的语言：fr\n");
  assert.equal(result.stdout, "");
});

test("an impossible calendar date fails instead of being auto-corrected", () => {
  const result = runCli(["today", "--date", "2026-02-30", "--json"]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /无效日期：2026-02-30/);
  assert.equal(result.stdout, "");
});
