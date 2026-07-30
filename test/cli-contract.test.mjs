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
    assert.ok(lines.every((line) => /[█░]{10} [ 0-9]{3} \/ 255$/u.test(line)));
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

test("doctor reports all supported sources and their accounting precision", () => {
  const result = runCli(
    ["doctor"],
    {
      ANTI_AI_CLAUDE_DIR: path.join(fixtureDir, "claude"),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Codex\s+✓\s+1 个 JSONL 文件\s+·\s+逐消息精确/);
  assert.match(
    result.stdout,
    /Claude Code\s+✓\s+1 个 JSONL 文件\s+·\s+逐消息精确/,
  );
  assert.match(result.stdout, /OpenCode\s+✗\s+未找到 SQLite\s+·\s+逐消息精确/);
  assert.match(result.stdout, /OpenClaw\s+✗\s+0 个 JSONL 文件\s+·\s+逐消息精确/);
  assert.match(result.stdout, /Hermes\s+✗\s+未找到 SQLite\s+·\s+会话级近似/);
  assert.match(result.stdout, /Pi\s+✗\s+0 个 JSONL 文件\s+·\s+逐条目精确/);
  assert.match(result.stdout, /不采集、不保存、不输出会话正文/);
});

test("doctor treats missing SQLite parent directories as unavailable", (t) => {
  const home = mkdtempSync(path.join(tmpdir(), "anti-ai-doctor-empty-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const result = runCli(["doctor"], {
    HOME: home,
    ANTI_AI_OPENCODE_DB: path.join(home, "missing", "opencode", "opencode.db"),
    ANTI_AI_HERMES_DB: path.join(home, "missing", "hermes", "state.db"),
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OpenCode\s+✗\s+未找到 SQLite/);
  assert.match(result.stdout, /Hermes\s+✗\s+未找到 SQLite/);
});

test("explain discloses every estimate factor, formula, source, and limitation", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /资源消耗估算，不是实际测量值/);
  assert.doesNotMatch(result.stdout, /公开代理跨度/);
  assert.match(result.stdout, /Google.*0\.24 Wh.*0\.26 mL.*0\.03 gCO₂e/s);
  assert.match(result.stdout, /OpenAI.*0\.34 Wh.*0\.32176 mL/s);
  assert.match(result.stdout, /Mistral.*400 输出 tokens.*45 mL.*1\.14 gCO₂e/s);
  assert.match(result.stdout, /受支持的本地 Agent 都没有公开逐请求资源账单/);
  assert.match(result.stdout, /每项资源只展示数值最高的案例/);
  assert.doesNotMatch(result.stdout, /置信度|跨度|min\/max/);
  assert.match(result.stdout, /https:\/\/services\.google\.com\//);
  assert.match(result.stdout, /https:\/\/blog\.samaltman\.com\//);
  assert.match(result.stdout, /https:\/\/mistral\.ai\//);
});

test("explain supports focused resource and comparison topics", () => {
  const resources = runCli(["explain", "resources"]);
  const comparisons = runCli(["explain", "comparisons", "--lang", "en"]);
  const creature = runCli(["explain", "creature"]);

  assert.equal(resources.status, 0, resources.stderr);
  assert.match(resources.stdout, /公开高位参照/);
  assert.match(resources.stdout, /Google.*请求级生产测量.*0\.24 Wh/s);
  assert.match(resources.stdout, /OpenAI.*请求级公开平均.*0\.34 Wh/s);
  assert.match(resources.stdout, /Mistral.*生命周期高位.*400 输出 tokens/s);
  assert.match(resources.stdout, /分别计算.*只展示数值最高的具名案例/s);
  assert.doesNotMatch(resources.stdout, /污染进化系统|置信度/);

  assert.equal(comparisons.status, 0, comparisons.stderr);
  assert.match(comparisons.stdout, /19Wh phone charge/);
  assert.match(comparisons.stdout, /244\.2 gCO₂e\/km/);
  assert.match(comparisons.stdout, /7\.6L\/min WaterSense shower/);
  assert.match(comparisons.stdout, /12\.1L ENERGY STAR dishwasher/);
  assert.match(comparisons.stdout, /2\.5ML competition pool/);
  assert.match(comparisons.stdout, /12,194kWh\/year.*33\.4kWh\/day/s);
  assert.match(comparisons.stdout, /epa\.gov\/watersense\/showerheads/);
  assert.match(comparisons.stdout, /energystar\.gov\/products\/dishwashers/);
  assert.doesNotMatch(comparisons.stdout, /Mutation system/);

  assert.equal(creature.status, 0, creature.stderr);
  assert.match(creature.stdout, /异变体成长/);
  assert.match(creature.stdout, /普通能力每 255 点.*恶性增殖/);
  assert.match(creature.stdout, /AI 清醒日.*清醒性/);
  assert.doesNotMatch(creature.stdout, /Google|OpenAI|Mistral/);
});

test("explain discloses the assumptions behind everyday comparisons", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /10W LED 灯.*电力 Wh ÷ 10W/s);
  assert.match(result.stdout, /50W 笔记本电脑.*电力 Wh ÷ 50W/s);
  assert.match(result.stdout, /19Wh 手机充电.*电力 Wh ÷ 19Wh/s);
  assert.match(result.stdout, /烧开 1L 水.*电力 Wh ÷ 100Wh/s);
  assert.match(result.stdout, /0\.05mL 一滴水.*550mL 饮用水/s);
  assert.match(result.stdout, /1kW 微波炉.*1,000W/s);
  assert.match(result.stdout, /WaterSense 淋浴.*7,600mL\/min/s);
  assert.match(result.stdout, /ENERGY STAR 洗碗机.*12,100mL/s);
  assert.match(result.stdout, /250 万升泳池.*33\.4kWh.*150L/s);
  assert.match(result.stdout, /12,194kWh\/年.*33\.4kWh\/天/s);
  assert.match(result.stdout, /不足 0\.01 次.*还差多少倍.*0\.00/s);
  assert.match(result.stdout, /平均燃油车.*244\.2 g CO₂e\/公里/s);
  assert.match(result.stdout, /城市树.*60 kg CO₂\/年/s);
  assert.match(result.stdout, /不换算成“砍了几棵树”/);
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
  assert.match(result.stdout, /11 个罪名标题.*13 条详情.*143 种/s);
  assert.match(result.stdout, /跨月.*不会重置/s);
});

test("explain discloses how model usage is attributed", () => {
  const result = runCli(["explain"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /模型统计/);
  assert.match(result.stdout, /Codex.*turn_context.*model/s);
  assert.match(result.stdout, /Claude Code.*message\.model/s);
  assert.match(result.stdout, /OpenCode.*session_message/s);
  assert.match(result.stdout, /OpenClaw.*reset JSONL/s);
  assert.match(result.stdout, /Hermes.*会话级近似/s);
  assert.match(result.stdout, /Pi.*compaction.*branch_summary/s);
  assert.match(result.stdout, /缺少模型字段.*unknown/s);
  assert.match(
    result.stdout,
    /分享卡片.*不包含对话、路径、模型名或精确 Token/s,
  );
  assert.match(result.stdout, /anti-ai share --card pathology/);
  assert.match(result.stdout, /活体病历.*月度复诊/s);
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
  assert.match(result.stdout, /普通能力按 255 点循环.*恶性 I · 1\/255/s);
  assert.match(
    result.stdout,
    /能力值达到 5、15、30、60、120、220.*解锁.*畸变天赋/s,
  );
  assert.match(
    result.stdout,
    /异色能力.*R 0\.50%.*SR 0\.10%.*SSR 0\.02%.*重复觉醒.*升级/s,
  );
  assert.match(result.stdout, /AI 清醒日.*污染 -2.*不会清除历史性状/s);
  assert.match(result.stdout, /~\/\.anti-ai\/creature\.json/);
  assert.match(
    result.stdout,
    /schema v10.*用量带、派生生态点、基因\/部件 ID、成就.*化石.*进化选择.*转折病例.*培养物.*伴生绑定\/离散印记\/异常 ID.*不保存精确 Token、模型名、路径、对话或逐请求时间/s,
  );
  assert.match(result.stdout, /anti-ai creature reset/);
});

test("explain discloses ecology, companion guardrails, and schema v10", () => {
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
    /每 90 个阅历日.*永久化石.*下一代.*继承.*伤疤/s,
  );
  assert.match(
    result.stdout,
    /污染.*清醒.*悖论.*三选一.*触发概率.*能力值.*天赋.*收益.*代价/s,
  );
  assert.match(
    result.stdout,
    /污染实验室.*外来标本.*永久化石.*病例切片.*三份确定性配方.*不会消耗素材.*不会改变成长、能力或生态/s,
  );
  assert.match(
    result.stdout,
    /伴生异物.*每天只增加一枚印记.*高消耗、克制使用和 AI 清醒日.*成长速度相同.*寄生幼体.*共生异形.*共犯器官.*不改变主异变体的任何数值/s,
  );
  assert.match(
    result.stdout,
    /schema v10.*schema v1-v9.*不保存.*精确 Token.*模型名.*路径.*对话/s,
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
  assert.match(
    explain.stdout,
    /Pollution laboratory.*foreign specimens.*permanent fossils.*case slices.*three deterministic formulas.*does not consume materials.*does not change growth, abilities, or ecology/s,
  );
  assert.match(
    explain.stdout,
    /symbiotic companion.*one imprint per observed day.*heavy, restrained, and AI-free days grow at.*the same rate.*PARASITIC HATCHLING.*SYMBIOTIC ABERRATION.*ACCOMPLICE ORGAN.*changes no creature numbers/s,
  );
  assert.match(
    explain.stdout,
    /schema v10.*schema v1-v9 migrate sequentially.*local backup/s,
  );
  assert.doesNotMatch(explain.stdout, /模型统计|个人基线与判词/);

  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Turn local AI tokens into an uncomfortable resource bill/);
  assert.match(help.stdout, /share\s+Print a privacy-safe SVG share card/);
  assert.match(help.stdout, /creature\s+Inspect and manage the mutation file/);
  assert.match(help.stdout, /--lang <zh\|en>/);
  assert.doesNotMatch(help.stdout, /打印今天/);
});

test("--help documents public commands and routes command-specific options", () => {
  const result = runCli(["--help"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage: anti-ai <command> \[options\]/);
  assert.match(result.stdout, /today\s+打印指定日期的 AI 资源账单/);
  assert.match(result.stdout, /week\s+打印截至指定日期的 7 天趋势/);
  assert.match(result.stdout, /month\s+打印本月至指定日期的用量日历/);
  assert.match(result.stdout, /codex\s+查看本地病理图鉴/);
  assert.match(result.stdout, /share\s+输出隐私安全的 SVG 分享卡/);
  assert.match(result.stdout, /creature\s+查看和管理异变体档案/);
  assert.match(result.stdout, /encounter\s+让两只异变体在本地发生接触事故/);
  assert.match(result.stdout, /lab\s+查看和管理污染实验室/);
  assert.match(result.stdout, /doctor\s+检查本地记录来源/);
  assert.match(result.stdout, /explain\s+解释统计、资源换算和隐私边界/);
  assert.match(result.stdout, /--lang <zh\|en>/);
  assert.match(result.stdout, /anti-ai help <command>/);
  assert.doesNotMatch(result.stdout, /--source|--json|--card/);
});

test("command help documents only the selected command contract", () => {
  const today = runCli(["today", "--help"]);
  const englishMonth = runCli(["help", "month", "--lang", "en"]);
  const englishEncounter = runCli(["help", "encounter", "--lang", "en"]);
  const explain = runCli(["explain", "--help"]);

  assert.equal(today.status, 0, today.stderr);
  assert.match(today.stdout, /Usage: anti-ai today \[options\]/);
  assert.match(today.stdout, /--date <YYYY-MM-DD>/);
  assert.match(
    today.stdout,
    /--source <all\|codex\|claude\|opencode\|openclaw\|hermes\|pi>/,
  );
  assert.match(today.stdout, /--json/);
  assert.match(today.stdout, /相关命令.*week.*month.*explain/s);
  assert.doesNotMatch(today.stdout, /--card/);
  assert.doesNotMatch(today.stdout, /creature \[reset\|evolve\]/);

  assert.equal(englishMonth.status, 0, englishMonth.stderr);
  assert.match(englishMonth.stdout, /Usage: anti-ai month \[options\]/);
  assert.match(englishMonth.stdout, /calendar heatmap/i);
  assert.match(englishMonth.stdout, /Related commands.*week.*creature/s);
  assert.doesNotMatch(englishMonth.stdout, /打印本月/);

  assert.equal(englishEncounter.status, 0, englishEncounter.stderr);
  assert.match(
    englishEncounter.stdout,
    /Usage: anti-ai encounter <pollution-code> \[options\]/,
  );
  assert.match(englishEncounter.stdout, /--save/);
  assert.match(englishEncounter.stdout, /creature export/);

  assert.equal(explain.status, 0, explain.stderr);
  assert.match(explain.stdout, /--lang <zh\|en>/);
  assert.match(explain.stdout, /-h, --help/);
});

test("nested creature actions expose focused help", () => {
  const evolve = runCli(["creature", "evolve", "--help"]);
  const reset = runCli(["help", "creature", "reset", "--lang", "en"]);
  const exported = runCli(["creature", "export", "--help"]);

  assert.equal(evolve.status, 0, evolve.stderr);
  assert.match(evolve.stdout, /Usage: anti-ai creature evolve <1\|2\|3>/);
  assert.match(evolve.stdout, /显式封存本代进化选择/);
  assert.doesNotMatch(evolve.stdout, /--source/);

  assert.equal(reset.status, 0, reset.stderr);
  assert.match(reset.stdout, /Usage: anti-ai creature reset/);
  assert.match(reset.stdout, /permanently deletes/i);

  assert.equal(exported.status, 0, exported.stderr);
  assert.match(exported.stdout, /Usage: anti-ai creature export/);
  assert.match(exported.stdout, /污染编码/);
  assert.match(exported.stdout, /encounter/);
});

test("forked casebook actions expose focused bilingual help", () => {
  const expectations = [
    ["history", "Usage: anti-ai creature history [options]"],
    ["intervene", "Usage: anti-ai creature intervene [<1|2|3>] [options]"],
    ["prognosis", "Usage: anti-ai creature prognosis [options]"],
  ];
  for (const [action, usage] of expectations) {
    const direct = runCli([
      "creature",
      action,
      "--help",
      "--lang",
      "en",
    ]);
    const alias = runCli([
      "help",
      "creature",
      action,
      "--lang",
      "en",
    ]);
    assert.equal(direct.status, 0, direct.stderr);
    assert.equal(alias.status, 0, alias.stderr);
    assert.equal(direct.stdout, alias.stdout);
    assert.ok(direct.stdout.includes(usage), direct.stdout);
    assert.match(direct.stdout, /Related commands/);
    assert.doesNotMatch(direct.stdout, /[\p{Script=Han}]/u);
  }

  const share = runCli(["help", "share", "--lang", "en"]);
  assert.equal(share.status, 0, share.stderr);
  assert.match(
    share.stdout,
    /receipt\|pathology\|specimen\|wanted\|fossil\|encounter\|prognosis/,
  );
});

test("pollution laboratory actions expose focused bilingual help", () => {
  const top = runCli(["help", "lab", "--lang", "en"]);
  const expectations = [
    ["incubate", "Usage: anti-ai lab incubate <1|2|3> [options]"],
    ["shelf", "Usage: anti-ai lab shelf [options]"],
    ["inspect", "Usage: anti-ai lab inspect <culture-id> [options]"],
  ];

  assert.equal(top.status, 0, top.stderr);
  assert.match(top.stdout, /Usage: anti-ai lab \[options\]/);
  assert.match(top.stdout, /three stable local formulas/i);
  assert.match(top.stdout, /lab incubate 1/);
  assert.doesNotMatch(top.stdout, /[\p{Script=Han}]/u);

  for (const [action, usage] of expectations) {
    const direct = runCli(["lab", action, "--help", "--lang", "en"]);
    const alias = runCli(["help", "lab", action, "--lang", "en"]);
    assert.equal(direct.status, 0, direct.stderr);
    assert.equal(alias.status, 0, alias.stderr);
    assert.equal(direct.stdout, alias.stdout);
    assert.ok(direct.stdout.includes(usage), direct.stdout);
    assert.match(direct.stdout, /Related commands/);
    assert.doesNotMatch(direct.stdout, /[\p{Script=Han}]/u);
  }

  const share = runCli(["help", "share", "--lang", "en"]);
  assert.equal(share.status, 0, share.stderr);
  assert.match(share.stdout, /encounter\|prognosis\|culture/);
  assert.match(share.stdout, /--id <culture-id>/);
});

test("symbiotic companion actions expose focused bilingual help", () => {
  const zhBond = runCli(["help", "lab", "bond"]);
  const enBond = runCli(["help", "lab", "bond", "--lang", "en"]);
  const zhCompanion = runCli(["help", "lab", "companion"]);
  const enCompanion = runCli([
    "lab",
    "companion",
    "--help",
    "--lang",
    "en",
  ]);
  const share = runCli(["help", "share", "--lang", "en"]);

  for (const result of [
    zhBond,
    enBond,
    zhCompanion,
    enCompanion,
    share,
  ]) {
    assert.equal(result.status, 0, result.stderr);
  }
  assert.match(zhBond.stdout, /Usage: anti-ai lab bond <culture-id>/);
  assert.match(zhBond.stdout, /建立伴生关系/);
  assert.match(zhBond.stdout, /同一天最多形成一个印记/);
  assert.match(enBond.stdout, /Usage: anti-ai lab bond <culture-id>/);
  assert.match(enBond.stdout, /symbiotic bond/i);
  assert.match(zhCompanion.stdout, /Usage: anti-ai lab companion/);
  assert.match(zhCompanion.stdout, /寄生幼体、共生异形和共犯器官/);
  assert.match(enCompanion.stdout, /Usage: anti-ai lab companion/);
  assert.match(enCompanion.stdout, /--full/);
  assert.match(enCompanion.stdout, /one imprint per observed day/i);
  assert.match(share.stdout, /companion/);
  assert.match(share.stdout, /growing companion card/i);
  assert.doesNotMatch(enBond.stdout, /[\p{Script=Han}]/u);
  assert.doesNotMatch(enCompanion.stdout, /[\p{Script=Han}]/u);
});

test("laboratory rejects unavailable materials, invalid choices, and missing cultures", (t) => {
  const emptyHome = mkdtempSync(path.join(tmpdir(), "anti-ai-lab-empty-"));
  const readyHome = mkdtempSync(path.join(tmpdir(), "anti-ai-lab-invalid-"));
  t.after(() => {
    rmSync(emptyHome, { recursive: true, force: true });
    rmSync(readyHome, { recursive: true, force: true });
  });
  mkdirSync(path.join(emptyHome, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(emptyHome, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "lab-empty",
      days: {},
      generations: { fossils: [], evolutions: {} },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );
  mkdirSync(path.join(readyHome, ".anti-ai"), { recursive: true });
  writeFileSync(
    path.join(readyHome, ".anti-ai", "creature.json"),
    `${JSON.stringify({
      schemaVersion: 9,
      seed: "lab-invalid",
      days: {},
      generations: {
        fossils: [
          {
            id: "fossil07",
            generation: 1,
            sealedAt: "2026-07-10",
            ecologyId: "polluted",
            pathologyId: "context",
            scarId: "carbonized_spine",
          },
        ],
        evolutions: {},
      },
      casebook: { cases: [], nextAtExperience: 14 },
      foreignSpecimens: [],
      laboratory: { version: 1, nextBatch: 1, cultures: [] },
    })}\n`,
  );

  const locked = runCli(
    ["lab", "--date", "2026-07-30", "--json"],
    { HOME: emptyHome },
  );
  const unavailable = runCli(
    ["lab", "incubate", "1", "--date", "2026-07-30"],
    { HOME: emptyHome },
  );
  const invalid = runCli(
    ["lab", "incubate", "9", "--date", "2026-07-30"],
    { HOME: readyHome },
  );
  const missing = runCli(
    ["lab", "inspect", "missing001", "--date", "2026-07-30"],
    { HOME: readyHome },
  );
  const filtered = runCli(
    ["lab", "--source", "codex", "--date", "2026-07-30"],
    { HOME: readyHome },
  );

  assert.equal(locked.status, 0, locked.stderr);
  assert.deepEqual(JSON.parse(locked.stdout).proposals, []);
  assert.equal(JSON.parse(locked.stdout).status, "locked");
  assert.equal(unavailable.status, 2);
  assert.equal(unavailable.stderr, "当前没有可培养的派生原料。\n");
  assert.equal(invalid.status, 2);
  assert.equal(invalid.stderr, "培养方案必须是 1、2 或 3。\n");
  assert.equal(missing.status, 2);
  assert.equal(missing.stderr, "未找到培养物：missing001\n");
  assert.equal(filtered.status, 2);
  assert.match(filtered.stderr, /lab 必须使用完整数据源/);
  const state = JSON.parse(
    readFileSync(
      path.join(readyHome, ".anti-ai", "creature.json"),
      "utf8",
    ),
  );
  assert.deepEqual(state.laboratory.cultures, []);
  assert.equal(state.laboratory.nextBatch, 1);
});

test("top-level help keeps only global options and points to command help", () => {
  const result = runCli(["--help"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /anti-ai help <command>/);
  assert.match(result.stdout, /--lang <zh\|en>/);
  assert.match(result.stdout, /--version/);
  assert.doesNotMatch(result.stdout, /--date <YYYY-MM-DD>/);
  assert.doesNotMatch(result.stdout, /--source <all\|codex\|claude>/);
  assert.doesNotMatch(result.stdout, /--card <receipt/);
  assert.doesNotMatch(result.stdout, /--json/);
});

test("--version prints the published package version", () => {
  const result = runCli(["--version"]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "anti-ai 2.0.0\n");
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
