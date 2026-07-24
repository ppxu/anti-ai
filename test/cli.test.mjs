import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(testDir, "..");
const cliPath = path.join(projectDir, "bin", "anti-ai.mjs");
const fixtureDir = path.join(testDir, "fixtures");
const baselineCodexDir = path.join(fixtureDir, "baseline", "codex");

function runCli(args, env = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectDir,
    encoding: "utf8",
    env: {
      ...process.env,
      TZ: "Asia/Shanghai",
      NO_COLOR: "1",
      ANTI_AI_CODEX_DIR: path.join(fixtureDir, "codex"),
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "missing-claude"),
      ...env,
    },
  });
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

test("today prints a satirical receipt with transparent resource proxy ranges", () => {
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
  assert.match(result.stdout, /Published proxy range \(not a power meter\)/);
  assert.match(result.stdout, /Everyday translation/);
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
  assert.match(result.stdout, /今日罪名：上下文囤积/);
  assert.match(
    result.stdout,
    /模型没有被频繁打扰，只是每次都收到一整本附件/,
  );
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
  assert.match(result.stdout, /PUBLISHED PROXY RANGE/);
  assert.match(result.stdout, /EVERYDAY TRANSLATION/);
  assert.match(result.stdout, /TODAY&apos;S CHARGE: FIRST OFFENSE/);
  assert.match(
    result.stdout,
    /PRIVACY MODE: no chats, paths, model names, or exact tokens/,
  );
  assert.doesNotMatch(result.stdout, /今日罪名|隐私模式|生活翻译/);
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

test("explain discloses every proxy factor, formula, source, and limitation", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /公开代理跨度，不是测量值/);
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
  assert.match(result.stdout, /15Wh 手机充电.*电力 Wh ÷ 15Wh/s);
  assert.match(result.stdout, /烧开 1L 水.*电力 Wh ÷ 100Wh/s);
  assert.match(result.stdout, /550mL 矿泉水.*水耗 mL ÷ 550/s);
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
  assert.match(result.stdout, /缓存考古学家.*缓存读取占输入至少 70%/s);
  assert.match(result.stdout, /判词由本地固定规则生成，不调用模型/);
  assert.match(result.stdout, /文案按日期固定轮换/);
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
  assert.match(explain.stdout, /Published proxy range, not a measurement/);
  assert.match(explain.stdout, /Model attribution/);
  assert.match(explain.stdout, /Verdicts are generated by fixed local rules/);
  assert.match(
    explain.stdout,
    /Share card.*omits chats, paths, model names, and exact token counts/s,
  );
  assert.doesNotMatch(explain.stdout, /模型统计|个人基线与判词/);

  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Turn local AI tokens into an uncomfortable resource bill/);
  assert.match(help.stdout, /share\s+Print a privacy-safe SVG share card/);
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
  assert.match(result.stdout, /doctor\s+检查本地日志/);
  assert.match(result.stdout, /explain\s+解释资源代理口径/);
  assert.match(result.stdout, /--source <all\|codex\|claude>/);
  assert.match(result.stdout, /--json/);
  assert.match(result.stdout, /--lang <zh\|en>/);
});

test("--version prints the published package version", () => {
  const result = runCli(["--version"]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "anti-ai 0.4.0\n");
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
