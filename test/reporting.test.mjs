import {
  assert,
  Database,
  mkdirSync,
  mkdtempSync,
  path,
  readFileSync,
  rmSync,
  spawnSync,
  test,
  tmpdir,
  writeFileSync,
  baselineCodexDir,
  cliPath,
  fixtureDir,
  projectDir,
  testDir,
  creatureAppearanceContentStats,
  creatureAppearanceState,
  creatureArt,
  creatureClinicalNote,
  creatureEvent,
  deriveCreatureAppearance,
  everydayComparisonLines,
  framedFooter,
  runCli,
  shiftTestDate,
  terminalWidth,
  writeCodexUsage,
  writeHermesDb,
  writeHermesModelUsage,
  writeJsonl,
  writeOpenCodeDb,
  writeOpenCodeSessionMessageDb,
} from "./helpers.mjs";

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
  assert.match(result.stdout, /⚡\s+1\.36 Wh.*OpenAI/s);
  assert.match(result.stdout, /💧\s+8\.44 mL.*Mistral/s);
  assert.match(result.stdout, /☁️\s+0\.21 gCO₂e.*Mistral/s);
  assert.match(result.stdout, /资源消耗估算（参考公开数据）/);
  assert.doesNotMatch(result.stdout, /公开代理跨度/);
  assert.doesNotMatch(result.stdout, /置信度/);
  assert.match(result.stdout, /anti-ai explain resources/);
  assert.ok(framedFooter(result.stdout));
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
  assert.match(result.stdout, /10W LED light\s+8\.16 minutes/);
  assert.match(result.stdout, /19Wh phone charge\s+0\.07 charges/);
  assert.match(result.stdout, /550mL drinking water\s+1\.53% of 1 bottle/);
  assert.match(result.stdout, /Personal baseline \(prior 7 calendar days\)/);
  assert.match(result.stdout, /Today's charge: [A-Z][A-Z -]+/);
  assert.doesNotMatch(result.stdout, /Confidence:/);
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
  assert.match(result.stdout, /Today's charge: [A-Z][A-Z -]+/);
  assert.match(result.stdout, /3\.00× normal/);
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
  assert.match(result.stdout, /💡\s+10W LED 灯\s+8\.16 分钟/);
  assert.match(
    result.stdout,
    /🥤\s+550mL 饮用水\s+相当于 1 瓶的 1\.53%/,
  );
  assert.match(result.stdout, /🚗\s+平均燃油车\s+0\.88 米/);
  assert.match(
    result.stdout,
    /📱\s+19Wh 手机充电\s+0\.07 次/,
  );
  assert.match(
    result.stdout,
    /💧\s+一滴水\s+168\.75 滴/,
  );
});

test("today names one high-side public reference and prints exactly five small comparisons", () => {
  const result = runCli(
    ["today", "--date", "2026-07-23"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /公开高位参照/);
  assert.match(result.stdout, /⚡\s+1\.36 Wh.*OpenAI.*请求级/);
  assert.match(result.stdout, /💧\s+8\.44 mL.*Mistral.*生命周期/);
  assert.match(result.stdout, /☁️\s+0\.21 gCO₂e.*Mistral.*生命周期/);
  assert.doesNotMatch(result.stdout, /置信度：低|Confidence: LOW/);

  const comparisons = everydayComparisonLines(result.stdout);
  assert.equal(comparisons.length, 5, result.stdout);
  assert.match(comparisons.join("\n"), /10W LED 灯/);
  assert.match(comparisons.join("\n"), /19Wh 手机充电/);
  assert.match(comparisons.join("\n"), /550mL 饮用水/);
  assert.match(comparisons.join("\n"), /一滴水/);
  assert.match(comparisons.join("\n"), /平均燃油车/);
});

test("week prints exactly five medium everyday activities", () => {
  const result = runCli(
    ["week", "--date", "2026-07-23"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const comparisons = everydayComparisonLines(result.stdout);
  assert.equal(comparisons.length, 5, result.stdout);
  assert.match(comparisons.join("\n"), /烧开 1L 水/);
  assert.match(comparisons.join("\n"), /50W 笔记本电脑/);
  assert.match(comparisons.join("\n"), /1kW 微波炉/);
  assert.match(comparisons.join("\n"), /WaterSense 淋浴/);
  assert.match(comparisons.join("\n"), /ENERGY STAR 洗碗机/);
});

test("month prints exactly five large comparisons without rounding tiny shares to zero", () => {
  const result = runCli(["month", "--date", "2026-07-23", "--source", "codex"], {
    ANTI_AI_CODEX_DIR: baselineCodexDir,
  });

  assert.equal(result.status, 0, result.stderr);
  const comparisons = everydayComparisonLines(result.stdout);
  assert.equal(comparisons.length, 5, result.stdout);
  assert.match(comparisons.join("\n"), /平均燃油车/);
  assert.match(comparisons.join("\n"), /1 棵城市树/);
  assert.match(comparisons.join("\n"), /标准泳池/);
  assert.match(comparisons.join("\n"), /美国家庭日均用电/);
  assert.match(comparisons.join("\n"), /一缸洗澡水/);
  assert.match(comparisons.join("\n"), /还差 [\d,.]+ 倍/);
  assert.doesNotMatch(comparisons.join("\n"), /\b0\.00\b/);
});

test("empty period comparisons render zero instead of infinite gaps", () => {
  const week = runCli(["week", "--date", "2026-01-07"]);
  const month = runCli(["month", "--date", "2026-01-31"]);

  assert.equal(week.status, 0, week.stderr);
  assert.equal(month.status, 0, month.stderr);
  assert.doesNotMatch(week.stdout, /∞|Infinity/);
  assert.doesNotMatch(month.stdout, /∞|Infinity/);
});

test("today compares usage with the prior seven days and prints one verdict", () => {
  const result = runCli(["today", "--date", "2026-07-23", "--source", "codex"], {
    ANTI_AI_CODEX_DIR: baselineCodexDir,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /个人基线（过去 7 个自然日）/);
  assert.match(result.stdout, /Token\s+\+200\.00%/);
  assert.match(result.stdout, /请求\s+0\.00%/);
  assert.match(result.stdout, /今日罪名：\S+/);
  assert.match(result.stdout, /3\.00 倍/);
});

test("today rotates satirical copy deterministically by date", () => {
  const first = runCli(
    ["today", "--date", "2026-07-23", "--source", "codex"],
    { ANTI_AI_CODEX_DIR: baselineCodexDir },
  );
  const repeated = runCli(
    ["today", "--date", "2026-07-23", "--source", "codex"],
    { ANTI_AI_CODEX_DIR: baselineCodexDir },
  );
  const next = runCli(
    ["today", "--date", "2026-07-24", "--source", "codex"],
    { ANTI_AI_CODEX_DIR: baselineCodexDir },
  );

  assert.equal(first.status, 0, first.stderr);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(next.status, 0, next.stderr);
  const firstCharge = first.stdout.match(/今日罪名：(.+)\n\s+(.+)/)?.[0];
  const repeatedCharge = repeated.stdout.match(/今日罪名：(.+)\n\s+(.+)/)?.[0];
  const nextCharge = next.stdout.match(/今日罪名：(.+)\n\s+(.+)/)?.[0];
  assert.ok(firstCharge);
  assert.equal(repeatedCharge, firstCharge);
  assert.notEqual(nextCharge, firstCharge);
});

test("period footers and share methodology rotate through richer bilingual pools", () => {
  const weekFooters = new Set();
  const monthFooters = new Set();
  const shareMethodology = new Set();

  for (let day = 1; day <= 14; day += 1) {
    const date = `2026-09-${String(day).padStart(2, "0")}`;
    const week = runCli(["week", "--date", date, "--source", "codex"]);
    const month = runCli(["month", "--date", date, "--source", "codex"]);
    const share = runCli([
      "share",
      "--date",
      date,
      "--source",
      "codex",
    ]);

    assert.equal(week.status, 0, week.stderr);
    assert.equal(month.status, 0, month.stderr);
    assert.equal(share.status, 0, share.stderr);
    weekFooters.add(framedFooter(week.stdout));
    monthFooters.add(framedFooter(month.stdout));
    const methodology = share.stdout.match(
      /<text x="72" y="580"[^>]*>([^<]+)<\/text>/,
    )?.[1];
    assert.ok(methodology);
    shareMethodology.add(methodology);
  }

  assert.ok(weekFooters.size >= 12, `week footers: ${weekFooters.size}`);
  assert.ok(monthFooters.size >= 12, `month footers: ${monthFooters.size}`);
  assert.ok(
    shareMethodology.size >= 10,
    `share methodology lines: ${shareMethodology.size}`,
  );

  const english = runCli([
    "week",
    "--date",
    "2026-09-14",
    "--source",
    "codex",
    "--lang",
    "en",
  ]);
  assert.equal(english.status, 0, english.stderr);
  assert.doesNotMatch(framedFooter(english.stdout), /[\p{Script=Han}]/u);
});

test("today composes at least sixty non-repeating charges for one symptom", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-charge-pool-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const charges = [];

  for (let index = 0; index < 60; index += 1) {
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

  assert.equal(new Set(charges).size, 60);
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
  const firstTitle = first.stdout.match(/今日罪名：(.+)/)?.[1];
  const secondTitle = second.stdout.match(/今日罪名：(.+)/)?.[1];
  assert.ok(firstTitle);
  assert.ok(secondTitle);
  assert.notEqual(firstTitle, secondTitle);
  assert.match(first.stdout, /缓存占比|缓存占到|旧上下文|旧答案|缓存命中/);
  assert.match(english.stdout, /Today's charge: [A-Z][A-Z -]+/);
  assert.match(english.stdout, /cache/i);
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
    /今日异变体[\s\S]*生态切片\s+污染性 \+1 · 仍为「熄火幼核」[\s\S]*今日成就\s+无/,
  );
  const report = JSON.parse(creature.stdout);
  assert.equal(report.experienceDays, 1);
  assert.deepEqual(report.ecology, {
    balanceVersion: 2,
    pollution: 1,
    clarity: 0,
    pollutionRate: 1,
    clarityRate: 0,
    windowDays: 1,
    windowPollution: 1,
    windowClarity: 0,
    type: "unformed",
    pendingType: "polluted",
    pendingDays: 1,
  });
});

test("today keeps the mutation section inside the receipt after the daily charge", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-today-layout-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const result = runCli(["today", "--date", "2026-07-23"], {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "today-layout",
  });

  assert.equal(result.status, 0, result.stderr);
  const chargeIndex = result.stdout.indexOf("今日罪名：");
  const mutationIndex = result.stdout.indexOf("今日异变体");
  const closingIndex = result.stdout.lastIndexOf("└");
  assert.ok(chargeIndex >= 0, result.stdout);
  assert.ok(mutationIndex > chargeIndex, result.stdout);
  assert.ok(closingIndex > mutationIndex, result.stdout);
  assert.match(
    result.stdout,
    /今日异变体[\s\S]*查看完整档案\s+anti-ai creature[\s\S]*查看图鉴\s+anti-ai codex/,
  );
  assert.equal(result.stdout.trimEnd().split("\n").at(-1).startsWith("└"), true);
});

test("today keeps small-category comparisons readable for larger values", (t) => {
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
  assert.match(result.stdout, /💡\s+10W LED 灯\s+3\.40 小时/);
  assert.match(result.stdout, /📱\s+19Wh 手机充电\s+1\.79 次/);
  assert.match(result.stdout, /🥤\s+550mL 饮用水\s+20\.45 瓶/);
  assert.match(result.stdout, /🚗\s+平均燃油车\s+1\.17 公里/);
  assert.doesNotMatch(result.stdout, /淋浴|洗碗机|标准泳池/);
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
  assert.match(result.stdout, /⚡\s+1\.36 Wh/);
  assert.match(result.stdout, /💧\s+8\.44 mL/);
  assert.match(result.stdout, /☁️\s+0\.21 gCO₂e/);
  assert.match(result.stdout, /🫖\s+烧开 1L 水\s+0\.01 壶/);
  assert.ok(framedFooter(result.stdout));
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
  assert.match(chinese.stdout, /异变体周报 · 07-17 → 07-23/);
  assert.match(chinese.stdout, /本周主症状\s+核食/);
  assert.match(chinese.stdout, /生态变化\s+污染 \+1 · 清醒 \+0/);
  assert.match(
    chinese.stdout,
    /成长记录\s+阅历 \+7 · 异常胚体 I → 分化幼体 II/,
  );
  assert.match(chinese.stdout, /新增徽章.*桌面反应堆/);
  assert.match(chinese.stdout, /主治意见\s+\S+/);
  assert.match(english.stdout, /MUTATION WEEKLY · 07-17 → 07-23/);
  assert.match(english.stdout, /PRIMARY SYMPTOM\s+NUCLEAR FEEDING/);
  assert.match(english.stdout, /ECOLOGY CHANGE\s+pollution \+1 · clarity \+0/);
  assert.match(english.stdout, /ATTENDING NOTE\s+\S+/);
  assert.doesNotMatch(english.stdout, /异变体周报|本周主症状|生态变化|成长记录/);
});

test("week renders its mutation follow-up after everyday translation inside one frame", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-week-layout-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const result = runCli(["week", "--date", "2026-07-23"], {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "week-layout",
  });

  assert.equal(result.status, 0, result.stderr);
  const translationIndex = result.stdout.indexOf("生活翻译");
  const mutationIndex = result.stdout.indexOf("异变体周报");
  const closingIndex = result.stdout.lastIndexOf("└");
  assert.ok(mutationIndex > translationIndex, result.stdout);
  assert.ok(closingIndex > mutationIndex, result.stdout);
  assert.match(
    result.stdout,
    /异变体周报[\s\S]*查看完整档案\s+anti-ai creature[\s\S]*查看图鉴\s+anti-ai codex/,
  );
  assert.equal(result.stdout.trimEnd().split("\n").at(-1).startsWith("└"), true);
});

test("week and month keep achievement category colors", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-period-achievement-color-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "period-achievement-color",
    FORCE_COLOR: "1",
    NO_COLOR: "",
  };

  const week = runCli(["week", "--date", "2026-07-23"], env);
  const month = runCli(["month", "--date", "2026-07-23"], env);

  assert.equal(week.status, 0, week.stderr);
  assert.equal(month.status, 0, month.stderr);
  assert.match(week.stdout, /新增徽章.*\u001b\[1;31m桌面反应堆\u001b\[0m/);
  assert.match(
    month.stdout,
    /成就回顾.*\u001b\[1;31m桌面反应堆\u001b\[0m/,
  );
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
  assert.match(result.stdout, /⚡\s+2\.72 Wh/);
  assert.match(result.stdout, /💧\s+21\.38 mL/);
  assert.match(result.stdout, /☁️\s+0\.54 gCO₂e/);
  assert.match(result.stdout, /🚗\s+平均燃油车\s+2\.22 米/);
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
  assert.match(chinese.stdout, /月度复诊 · 2026-07/);
  assert.match(chinese.stdout, /有效观察\s+8 天 · 8 天活跃 · 0 天清醒/);
  assert.match(chinese.stdout, /主症状\s+核食/);
  assert.match(
    chinese.stdout,
    /生态人格\s+未定型 → 未定型 · 污染 \+2 · 清醒 \+0/,
  );
  assert.match(chinese.stdout, /成就回顾\s+\[2\].*桌面反应堆/);
  assert.match(chinese.stdout, /复诊意见\s+\S+/);
  assert.match(english.stdout, /MONTHLY FOLLOW-UP · 2026-07/);
  assert.match(english.stdout, /VALID OBSERVATION\s+8 days · 8 active · 0 AI-free/);
  assert.match(english.stdout, /ECOLOGY\s+UNFORMED → UNFORMED/);
  assert.match(english.stdout, /FOLLOW-UP NOTE\s+\S+/);
  assert.doesNotMatch(english.stdout, /月度复诊|有效观察|主症状|生态人格/);
});

test("month aligns calendar cells and renders a monthly follow-up inside the frame", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-month-layout-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const result = runCli(["month", "--date", "2026-07-23"], {
    HOME: home,
    ANTI_AI_CODEX_DIR: baselineCodexDir,
    ANTI_AI_CREATURE_SEED: "month-layout",
  });

  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.split("\n");
  const header = lines.find((line) => /一.*二.*三.*四.*五.*六.*日/.test(line));
  const firstWeek = lines.find((line) => /01[·░▒▓█]/.test(line));
  assert.ok(header, result.stdout);
  assert.ok(firstWeek, result.stdout);
  const headerWednesday = terminalWidth(header.slice(0, header.indexOf("三")));
  const dayOne = terminalWidth(firstWeek.slice(0, firstWeek.indexOf("01")));
  assert.equal(dayOne, headerWednesday);

  const translationIndex = result.stdout.indexOf("生活翻译");
  const followUpIndex = result.stdout.indexOf("月度复诊");
  const closingIndex = result.stdout.lastIndexOf("└");
  assert.ok(followUpIndex > translationIndex, result.stdout);
  assert.ok(closingIndex > followUpIndex, result.stdout);
  assert.match(result.stdout, /复诊意见\s+\S+/);
  assert.match(result.stdout, /查看完整档案\s+anti-ai creature/);
  assert.match(result.stdout, /查看图鉴\s+anti-ai codex/);
  assert.doesNotMatch(result.stdout, /尸检|AUTOPSY/);
  assert.equal(result.stdout.trimEnd().split("\n").at(-1).startsWith("└"), true);
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
  assert.ok(framedFooter(week.stdout));
  assert.doesNotMatch(week.stdout, /7 日合计|资源账单|[\p{Script=Han}]/u);

  assert.equal(month.status, 0, month.stderr);
  assert.match(month.stdout, /Mon\s+Tue\s+Wed\s+Thu\s+Fri\s+Sat\s+Sun/);
  assert.match(month.stdout, /Monthly total\s+1,000 tokens · 8 model requests/);
  assert.match(month.stdout, /AI-free days\s+15 days \/ 23 days/);
  assert.match(month.stdout, /Monthly resource bill/);
  assert.doesNotMatch(month.stdout, /月度合计|AI 清醒日|本月资源账单/);
});
