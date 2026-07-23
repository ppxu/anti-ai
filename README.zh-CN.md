# anti-ai

[English](./README.md) | 简体中文

把 Codex 和 Claude Code 的本地 Token 记录，变成一张不太令人愉快的 AI 资源账单。

```text
┌──────────────────────────────────────────────┐
  YOUR AI RECEIPT · 2026-07-23
├──────────────────────────────────────────────┤

  127,605,581 tokens · 1,058 次模型请求

  Codex       127,492,619
  Claude Code 112,962

  公开代理跨度（不是电表）
  ⚡  253.92–359.72 Wh
  💧  275.08–54,015.30 mL
  ☁️  31.74–1,368.39 gCO₂e

  生活翻译（终于像人话了）
  📱  15Wh 手机充电    16.93–23.98 次
  🚿  8L/min 淋浴      0.03–6.75 分钟
  🚗  平均燃油车        0.13–5.51 公里
  🌳  1 棵城市树        加班 0.19–8.32 天才能吸回来

  个人基线（过去 7 个自然日）
  Token +62.00% · 请求 -18.00%

  今日罪名：上下文囤积

  置信度：低 · 运行 anti-ai explain 查看口径

  机器开了 1058 张小票，地球只收到一段估算。
└──────────────────────────────────────────────┘
```

## 环境要求

- Node.js 20 或更高版本
- 已在本机使用过 Codex、Claude Code，至少存在一类本地 JSONL 日志
- 当前已在 macOS 验证

## 安装

```bash
npm install -g anti-ai
anti-ai doctor
```

从源码运行：

```bash
git clone https://github.com/ppxu/anti-ai.git
cd anti-ai
node ./bin/anti-ai.mjs today
```

卸载：

```bash
npm uninstall -g anti-ai
```

## 命令

```bash
anti-ai today
anti-ai today --date 2026-07-23
anti-ai today --source codex
anti-ai today --source claude
anti-ai today --lang en
anti-ai today --json

anti-ai week
anti-ai week --date 2026-07-23

anti-ai month
anti-ai month --date 2026-07-23

anti-ai doctor
anti-ai explain
anti-ai --version
anti-ai --help
```

### 语言

所有人类可读命令都支持 `--lang zh|en`，包括账单、周期汇总、日志诊断、口径说明、帮助、错误提示和讽刺文案。默认语言为 `zh`。

```bash
anti-ai today --lang en
anti-ai month --lang en
anti-ai explain --lang en
```

`today --json` 不受展示语言影响，字段名和结构保持稳定。

### `today`

打印指定自然日的 Token 用量、来源/模型拆分和公开资源代理跨度。日期按系统本地时区计算。人类可读账单会与此前 7 个自然日比较，并从扩充后的讽刺文案库中给出一条“今日罪名”。同一天的文案固定不变，这个过程不会调用模型。

`--json` 按来源和具体模型输出可精确核对的 Token 统计，不把低置信度资源估算、个人基线或吐槽混入机器数据。

人类可读账单会直接扫描比较窗口；本地日志很多时可能需要数秒。当前版本仍不创建持久化用量索引。

### `week`

打印截至指定日期的最近 7 个自然日趋势，并展示模型账单、资源账单和生活化对照。当前直接扫描近期日志，不建立索引；日志很多时可能需要数秒。

### `month`

打印本月第一天至指定日期的终端日历热力图，同时展示 AI 清醒日比例（例如 `7 天 / 23 天`）、最长清醒期、最重一天、模型账单和本月资源对照。

### `doctor`

检查默认日志目录是否存在，以及发现了多少 JSONL 文件。

### `explain`

展示所有资源换算系数、公式、来源和限制。

## Token 统计口径

默认日志位置：

- Codex：`~/.codex/sessions`
- Claude Code：`~/.claude/projects`

可通过环境变量覆盖，便于测试或使用自定义目录：

```bash
ANTI_AI_CODEX_DIR=/path/to/codex/sessions \
ANTI_AI_CLAUDE_DIR=/path/to/claude/projects \
anti-ai today
```

Codex：

- 累计每条 `token_count.info.last_token_usage`
- 使用同一会话中最近的 `turn_context.payload.model` 归属具体模型
- `cached_input_tokens` 是输入 Token 的子集，不重复加入总量
- `reasoning_output_tokens` 是输出 Token 的子集，不重复加入总量

Claude Code：

- 读取 assistant message 的 `usage`
- 同一流式响应可能多次落盘，按 `message.id` 只保留最完整快照
- 从 `message.model` 读取具体模型
- 输入总量包含普通输入、缓存读取和缓存写入

日志没有模型字段时会归入 `unknown`。终端账单最多展示 Token 用量最高的 5 个“来源 + 模型”组合，`today --json` 保留完整模型明细。

## 资源账单口径

Codex 和 Claude Code 没有向本工具提供逐请求的实际电力、水耗和碳排数据。因此，资源部分是不同厂商公开案例的跨度，不是测量值，也不是统计置信区间：

- Google：Gemini Apps 中位文本请求为 `0.24 Wh`、`0.26 mL` 水、`0.03 gCO₂e`。[来源](https://services.google.com/fh/files/misc/measuring_the_environmental_impact_of_delivering_ai_at_google_scale.pdf)
- OpenAI：平均 ChatGPT 查询为 `0.34 Wh`、`0.000085` 美制加仑水（换算为 `0.32176 mL`），但未披露完整测量边界。[来源](https://blog.samaltman.com/the-gentle-singularity)
- Mistral：Le Chat / Large 2 的 400 输出 Token 生命周期评估为 `45 mL` 水、`1.14 gCO₂e`。[来源](https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/)

实际 Codex、Claude Code 请求可能因模型、上下文长度、推理深度、硬件、批处理、数据中心和能源结构产生数量级差异，所以固定显示“置信度：低”。

## 生活化对照口径

- 工具根据资源代理区间的上界动态选择更适合当前数量级的对照物
- 点灯时间：按 10W LED 灯计算，`电力 Wh ÷ 10W`
- 手机充电：按一次 15Wh 计算，`电力 Wh ÷ 15Wh`
- 烧水：按烧开 1L 水消耗 100Wh 计算，`电力 Wh ÷ 100Wh`
- 瓶装水：按每瓶 550mL 计算，`水耗 mL ÷ 550`
- 淋浴时间：按 8L/min 计算，`水耗 mL ÷ 8,000`
- 驾车距离：美国 EPA 的平均燃油乘用车约排放 `400 g CO₂/英里`，换算为 `248.55 g CO₂/公里`。[来源](https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle)
- 树木吸碳：美国 EPA 对城市树木的估算约为 `60 kg CO₂/年`。[来源](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references)

生活用品的功率、容量和流量都是用于展示的假设，不是环境测量标准。树种、树龄和砍伐后的处理方式会显著影响碳排，因此工具不显示缺乏依据的“砍了几棵树”，而是显示“一棵城市树需要多久才能吸收对应碳排”。

## 隐私

- 完全本地运行，不联网发送日志
- 解析 JSONL 时只保留时间、消息 ID、模型和 usage 元数据
- 不采集、不保存、不输出 Prompt、回复或工具调用正文
- 不创建用量数据库或后台进程

## 测试

```bash
npm test
```

测试使用脱敏的合成 JSONL，不读取真实会话内容。

## 参与贡献

请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md) 和 [SECURITY.md](./SECURITY.md)。提交问题时请勿附带真实 Codex 或 Claude Code 日志。

## 许可证

[MIT](./LICENSE)
