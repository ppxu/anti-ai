# anti-ai

[English](./README.md) | 简体中文

把 Codex、Claude Code、OpenCode、OpenClaw、Hermes 和 Pi 的本地 Token 记录，变成一张不太令人愉快的 AI 资源账单，以及一只被算力废料喂大的异变体。

```text
┌──────────────────────────────────────────────┐
  YOUR AI RECEIPT · 2026-07-23
├──────────────────────────────────────────────┤

  127,605,581 tokens · 1,058 次模型请求

  Codex       127,492,619
  Claude Code 112,962

  资源消耗估算 · 公开高位参照
  ⚡  359.72 Wh · OpenAI 请求级公开平均
  💧  54,015.30 mL · Mistral 生命周期高位
  ☁️  1,368.39 gCO₂e · Mistral 生命周期高位

  生活翻译（终于像人话了）
  💡  10W LED 灯         1.50 天
  📱  19Wh 手机充电      18.93 次
  🥤  550mL 饮用水       98.21 瓶
  💧  一滴水             1,080,306 滴
  🚗  平均燃油车         5.60 公里

  个人基线（过去 7 个自然日）
  Token +62.00% · 请求 -18.00%

  今日罪名：必要附件收藏家

  运行 anti-ai explain resources 查看参照边界
└──────────────────────────────────────────────┘
```

## 环境要求

- Node.js 20 或更高版本
- 已在本机使用过至少一个受支持的 Agent，存在 JSONL 或 SQLite 本地记录
- 当前已在 macOS 验证

## 安装

```bash
npm install -g anti-ai
anti-ai doctor
```

### 安装 Agent Skill

先安装 CLI，再使用开放的 [`skills`](https://github.com/vercel-labs/skills) 安装器，让 Codex、Claude Code、Cursor 等 Agent 获得安全调用 anti-ai 的工作流：

```bash
npm install -g anti-ai
npx skills add ppxu/anti-ai --skill anti-ai -g -y
```

也可以显式指定 Agent：

```bash
npx skills add ppxu/anti-ai --skill anti-ai -g -a codex -y
npx skills add ppxu/anti-ai --skill anti-ai -g -a claude-code -y
```

Skill 会告诉 Agent 何时读取精确 JSON、何时展示人类账单、如何生成分享卡片，以及为什么不能直接读取原始会话日志。

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
anti-ai today --source opencode
anti-ai today --source openclaw
anti-ai today --source hermes
anti-ai today --source pi
anti-ai today --lang en
anti-ai today --json

anti-ai week
anti-ai week --date 2026-07-23

anti-ai month
anti-ai month --date 2026-07-23

anti-ai codex
anti-ai codex --json

anti-ai share > anti-ai-receipt.svg
anti-ai share --lang en > anti-ai-receipt.svg
anti-ai share --card pathology > anti-ai-pathology.svg
anti-ai share --card specimen > anti-ai-specimen.svg
anti-ai share --card wanted > anti-ai-wanted.svg
anti-ai share --card fossil > anti-ai-fossil.svg

anti-ai creature
anti-ai creature --json
anti-ai creature evolve
anti-ai creature evolve 2
anti-ai creature reset

anti-ai doctor
anti-ai explain
anti-ai explain resources
anti-ai help today
anti-ai creature --help
anti-ai --version
anti-ai --help
```

### 语言

所有人类可读命令都支持 `--lang zh|en`，包括账单、周期汇总、日志诊断、口径说明、帮助、错误提示和讽刺文案。默认语言为 `zh`。

```bash
anti-ai today --lang en
anti-ai month --lang en
anti-ai creature --lang en
anti-ai explain --lang en
```

`today --json`、`codex --json` 和 `creature --json` 不受展示语言影响，字段名和结构保持稳定。

### `today`

打印指定自然日的 Token 用量、来源/模型拆分和参考公开数据得到的资源消耗估算。日期按系统本地时区计算。人类可读账单会与此前 7 个自然日比较，并从扩充后的讽刺文案库中给出一条“今日罪名”。同一天的标题和文案固定不变，这个过程不会调用模型。

缓存类罪名不会再因为日常高缓存率而长期霸榜：只有当日缓存读取占输入至少 `70%`，并且高出个人 7 日基线至少 `10` 个百分点时才会触发。

每类判词现在由 11 个罪名标题和 13 条详情组合；同一天结果固定，跨月不会重新从第一条开始。同一种症状连续触发时，有 143 种完整组合后才会原样重复。

`--json` 按来源和具体模型输出可核对的 Token 统计，不把资源参照、个人基线或吐槽混入机器数据。Hermes 的日期归档是明确标注的会话级近似。

默认的完整来源人类账单会在末尾结算当天异变体，并追加生态变化、当前形态、今日成就、新封存化石、待选择进化和当日图鉴入库反馈；`today --json` 与带 `--source` 的账单不会改动这条完整成长史。

人类可读账单会直接扫描比较窗口；本地日志很多时可能需要数秒。当前版本仍不创建持久化用量索引。

### `week`

打印截至指定日期的最近 7 个自然日趋势，并展示模型账单、资源账单和生活化对照。完整来源的人类可读报告还会结算成长史，追加“活体病历”：本周主症状、污染/清醒变化、阶段与世代成长、本期新化石、新徽章、新增收藏和固定轮换的主治意见。带 `--source` 的报告只展示用量，不改动完整成长史。当前直接扫描近期日志，不建立索引；日志很多时可能需要数秒。

### `month`

打印本月第一天至指定日期的终端日历热力图，同时展示 AI 清醒日比例（例如 `7 天 / 23 天`）、最长清醒期、最重一天、模型账单和本月资源对照。

完整来源的人类可读报告还会追加“月度复诊”，汇总孵化后的有效观察期、主症状、生态人格迁移、阶段与世代成长、本月化石、成就和新增收藏；孵化前的空白日不会被误诊为戒断。

### `codex`

查看从现有成长史派生出的本地病理图鉴：

```bash
anti-ai codex
anti-ai codex --date 2026-07-23 --lang en
anti-ai codex --json
```

固定收藏共 50 项：16 个形态家族、24 个成就、6 个异色能力和 4 种世代伤痕。人类可读输出只揭示已发现名称，锁定项保持 `???`；动态标本指纹和永久化石则不设人为上限。

`codex --json` 提供稳定 ID、发现状态与日期、收藏计数，以及指定日期的 `recent` 新发现。图鉴与 `creature` 共用完整的六来源成长史，因此拒绝 `--source` 过滤；它不新增状态，也不会把多烧 Token 变成首选收集路线。

### `share`

向标准输出生成一张 1200×630 的 SVG 分享卡片。它沿用 `today` 的资源估算公式、个人基线和确定性判词，但默认不包含 Prompt、回复、路径、模型名、请求数或精确 Token。

```bash
anti-ai share > anti-ai-receipt.svg
anti-ai share --date 2026-07-23 --lang en > anti-ai-receipt.svg
anti-ai share --card pathology > anti-ai-pathology.svg
anti-ai share --card pathology --lang en > anti-ai-pathology.svg
anti-ai share --card specimen > anti-ai-specimen.svg
anti-ai share --card wanted > anti-ai-wanted.svg
anti-ai share --card fossil > anti-ai-fossil.svg
```

成长史现在支持 4 种隐私安全卡片：`pathology` 是病理切片，`specimen` 是当前收藏标本，`wanted` 是讽刺悬赏令，`fossil` 是最近一代的永久化石证书。化石证书会在第 90 个阅历日后开放。

工具不会上传卡片；所有卡片均不包含精确 Token、请求数、来源/模型名、路径或对话正文，保存位置完全由你的命令行重定向决定。异变体卡片必须使用完整数据，因此会拒绝 `--source` 过滤。

### `creature`

把最近的 Token 使用变成一只持续进化的“算力异变体”：

```bash
anti-ai creature
anti-ai creature --date 2026-07-23
anti-ai creature --lang en
anti-ai creature --json
anti-ai creature evolve
anti-ai creature evolve 2
```

首次运行会回看最近 30 个自然日，后续运行会自动补齐两次查看之间的空档。每个孵化后的已结算自然日只增加 `1` 天阅历，因此高消耗、低消耗和 AI 清醒日拥有相同的生命阶段速度。每天的 Token 总量仍会经过对数压缩，换算为 `1–100` 的污染剂量，用于塑造病型、能力和事件，但不能加速阶段。

日志量很大时，首次回看可能需要数秒；档案建立后，同一天再次查看只增量扫描当天。

每个 90 天世代都有 4 个生命阶段：

| 阶段 | 阅历 | 外观槽位 |
|---|---:|---:|
| 异常胚体 I | 1–6 天 | 3 |
| 分化幼体 II | 7–29 天 | 5 |
| 定型成体 III | 30–89 天 | 7 |
| 生态完全体 IV | 第 90 天 | 9 |

Token 工作方式继续形成 4 条使用病型：

| 分支 | 主要驱动 |
|---|---|
| 上下文病变系 | 每次请求的非缓存输入量 |
| 缓存化石系 | 缓存读取占输入的比例 |
| 请求增殖系 | 当日请求数量 |
| 核食系 | 没有单项性状占优时的高污染兜底 |

相对过去 7 个自然日的个人基线，高用量会增加 `1–3` 点污染性，低用量增加 `1–2` 点清醒性，AI 清醒日增加 `3` 点清醒性。两项长期并存，形成未定型、污染型、清醒型或矛盾型生态人格；候选状态要连续成立 3 个已结算日才会正式切换，避免怪兽每天在善恶边界上横跳。

第 90 天会把完全体封存为永久化石。下一个已结算日进入新世代并回到胚体，继承上一代一种能力的 `+5` 加成，同时留下会改变外观指纹和 ASCII 纹路的路线伤痕。长期成长得以保留，但多烧 Token 仍不能购买更快的世代。

从第一枚化石开始，每个新世代都有一次显式且不可反悔的进化选择：

| 路线 | 驱动能力 | 触发收益 | 代价 |
|---|---|---|---|
| 污染路线 | 一种消耗型能力 | 额外能力成长 | 增加污染性 |
| 清醒路线 | 戒断反应 | 增加清醒性 | 放慢旧污染消退 |
| 悖论路线 | 失控指数 | 提高稀有突变概率 | 承担污染风险 |

用 `anti-ai creature evolve` 查看菜单，再用 `anti-ai creature evolve <1|2|3>` 封存选择。忽略选择不会卡住成长，但会在该世代结束时过期。每日触发率为 `min(35, 5 + floor(能力值 / 25) + 2 × 已解锁天赋数)%`；天赋会同时放大收益点和代价点，终端会展示累计触发、收益与代价。

ASCII 外观建立在同一条连续生长的核能巨兽骨架上：算力胚胎、反应堆幼兽、核食巨兽和算力熔毁体。本地稳定基因决定眼、颚、甲壳、反应堆核心、四肢、尾和胸腔纹路，使用病型、生态人格、继承伤痕、成就部件与异色能力则继续改写这条骨架。同一份档案始终得到同一只标本，中英文和 `NO_COLOR=1` 不改变它的形状。系统包含 16 个核心形态族、54 个基础外观部件，并通过 10,000 个 seed 的完全体碰撞与 39 列宽度测试。

它还会长出 7 种不太健康的能力值：

| 能力 | 主要成长来源 |
|---|---|
| 吞噬欲 | 当日污染剂量 |
| 赘生脑回 | 上下文型使用 |
| 化石甲 | 缓存输入 |
| 请求口器 | 请求增殖 |
| 核素亮度 | 没有专门性状占优的算力污染 |
| 失控指数 | 确定性随机加点与稀有事件 |
| 戒断反应 | 孵化后的 AI 清醒日 |

普通能力上限为 `999`。每个活跃日会获得 `1–2` 点吞噬欲、`1` 点主使用能力、`25%` 概率的确定性随机加点和 `1` 点事件关联能力；即使连续 400 天重度使用也仍有成长空间。能力达到 `5`、`15`、`30`、`100`、`300`、`700` 时，会依次解锁总计 42 个越来越不妙的畸变天赋。失控指数每 10 点让稀有突变率增加 1 个百分点，从基础 `8%` 最高升到 `20%`。

它还可能觉醒 6 种“异色能力”：

| 稀有度 | 每个活跃日 | 能力 |
|---|---:|---|
| R（青色） | `0.50%` | 截止日嗅觉、幽灵缓存、黄鸭招魂术 |
| SR（品红） | `0.10%` | 提示词读心术、幻觉抗体 |
| SSR（黄色） | `0.02%` | Token 炼金术 |

异色能力由本地种子和日期确定；重复觉醒同一能力会继续升级，最高 `9` 级。等级、性格、心情、称号、活跃连击、孵化年龄、天赋收藏、异色收藏和今日加点都会出现在终端以及 `creature --json` 中。支持颜色的终端会用不同颜色区分 R / SR / SSR，`NO_COLOR=1` 可关闭颜色。

首批 24 项成就平均分成红色罪证章、青色戒断章和黄色悖论章。高消耗、低消耗、AI 清醒日和状态转变都拥有独立解锁内容；可重复成就会按行为次数成长为三级，并显示下一档进度，不使用精确 Token 作为等级条件。当前称号由生态行为、核心形态和代表成就组合生成。

每天仍会根据本地随机种子和日期触发一个可复现事件。首个活跃日之后，每个 AI 清醒日还会让旧的累计污染减少 `2`、戒断反应增加 `1`，但历史性状不会被清空。

档案保存在 `~/.anti-ai/creature.json`，当前为 schema v5。文件只保存离散用量带、派生生态点、稳定基因/部件 ID、成就、外观指纹、污染剂量、性状、普通/异色能力加点、事件 ID、永久化石、已封存进化选择和本地随机种子，不包含 Prompt、回复、路径、模型名、精确 Token、个人基线数值或逐请求时间。schema v1/v2/v3/v4 会在本地幂等迁移并保留已有成长；`anti-ai codex` 直接从这份现有状态派生固定与动态收藏，不增加新迁移。成长档案固定使用全部受支持来源，因此 `creature` 和 `codex` 都不能配合 `--source` 过滤。

显式重开：

```bash
anti-ai creature reset
```

### `doctor`

检查六个默认来源的路径、可用性、存储类型和统计精度。检查全部来源时，缺少未安装的 Agent 不会报错；显式检查一个缺失来源时会返回失败状态。

### `explain`

展示所有资源换算系数、公式、来源和限制。可使用 `anti-ai explain resources|comparisons|sources|creature|privacy` 聚焦查看。

## Token 统计口径

默认日志位置：

- Codex：`~/.codex/sessions`
- Claude Code：`~/.claude/projects`
- OpenCode：`~/.local/share/opencode/opencode.db`
- OpenClaw：`~/.openclaw/agents`
- Hermes：`~/.hermes/state.db`
- Pi：`~/.pi/agent/sessions`

可通过环境变量覆盖，便于测试或使用自定义目录：

```bash
ANTI_AI_CODEX_DIR=/path/to/codex/sessions \
ANTI_AI_CLAUDE_DIR=/path/to/claude/projects \
ANTI_AI_OPENCODE_DB=/path/to/opencode.db \
ANTI_AI_OPENCLAW_DIR=/path/to/openclaw/agents \
ANTI_AI_HERMES_DB=/path/to/hermes/state.db \
ANTI_AI_PI_DIR=/path/to/pi/sessions \
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

OpenCode 从 SQLite 的 `message` 或 `session_message` 表读取 assistant usage。OpenClaw 跨活动日志与 `.reset.*` 历史文件按消息 ID 去重，并排除 trajectory 导出。Pi 统计 assistant、compaction 和 branch_summary 的模型用量，对复制或分叉会话中的同一 entry ID 做全局去重。

Hermes 是有意保留的精度例外：优先读取包含辅助调用的 `session_model_usage`，否则回退到 `sessions` 汇总。汇总可能跨越多个自然日，工具按最后活动日归档，因此 `doctor` 会明确标为“会话级近似”。

日志没有模型字段时会归入 `unknown`。终端账单最多展示 Token 用量最高的 5 个“来源 + 模型”组合，`today --json` 保留完整模型明细。

## 资源账单口径

受支持的 Agent 都没有向本工具提供逐请求的实际电力、水耗和碳排数据。工具分别计算具名公开案例，每项资源只展示数值最高的案例，不把不可直接比较的口径拼成假区间；结果不是本地测量值，也不是统计置信区间：

- Google：Gemini Apps 中位文本请求为 `0.24 Wh`、`0.26 mL` 水、`0.03 gCO₂e`。[来源](https://services.google.com/fh/files/misc/measuring_the_environmental_impact_of_delivering_ai_at_google_scale.pdf)
- OpenAI：平均 ChatGPT 查询为 `0.34 Wh`、`0.000085` 美制加仑水（换算为 `0.32176 mL`），但未披露完整测量边界。[来源](https://blog.samaltman.com/the-gentle-singularity)
- Mistral：Le Chat / Large 2 的 400 输出 Token 生命周期评估为 `45 mL` 水、`1.14 gCO₂e`。[来源](https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/)

实际请求可能因模型、上下文长度、推理深度、硬件、批处理、数据中心和能源结构产生数量级差异，因此账单始终显示对应的具名参照，不声称模型级实测。

## 生活化对照口径

- today、week、month 固定展示 5 条，分别对应小、中、大尺度活动；不足 `0.01` 个大事务时显示“还差多少倍”
- 点灯时间：按 10W LED 灯计算，`电力 Wh ÷ 10W`
- 笔记本电脑：按 50W 计算，`电力 Wh ÷ 50W`
- 手机充电：按一次 19Wh 计算，`电力 Wh ÷ 19Wh`
- 烧水：按烧开 1L 水消耗 100Wh 计算，`电力 Wh ÷ 100Wh`
- 瓶装水：按每瓶 550mL 计算，`水耗 mL ÷ 550`
- 一滴水按 `0.05mL`，微波炉按 `1kW`，泳池按 `250 万升`，一缸洗澡水按 `150L`
- 淋浴采用 [EPA WaterSense](https://www.epa.gov/watersense/showerheads) 的 `7.6L/min`，洗碗机采用 [ENERGY STAR](https://www.energystar.gov/products/dishwashers/key_product_criteria) 的 `12.1L/次`
- 驾车距离：使用美国 EPA 等效换算因子 `244.2 g CO₂e/公里`。[来源](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references)
- 树木吸碳：美国 EPA 对城市树木的估算约为 `60 kg CO₂/年`。[来源](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references)

WaterSense 淋浴采用 EPA 的 `2.0 gal/min` 上限（约 `7.6L/min`），标准 ENERGY STAR 洗碗机采用 `3.2 gal/cycle` 上限（约 `12.1L/次`）；美国家庭日均用电以 EPA 的 `12,194kWh/年 ÷ 365 ≈ 33.4kWh/天` 计算。[WaterSense](https://www.epa.gov/watersense/showerheads) · [ENERGY STAR](https://www.energystar.gov/products/dishwashers/key_product_criteria) · [EPA 等效换算](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references)

其余生活用品的整值功率和容量是用于展示的假设，不是环境测量标准。树种、树龄和砍伐后的处理方式会显著影响碳排，因此工具不显示缺乏依据的“砍了几棵树”，而是显示“一棵城市树需要多久才能吸收对应碳排”。

## 隐私

- 完全本地运行，不联网发送日志
- 扫描 JSONL/SQLite 时只处理时间、消息 ID、模型和 usage 元数据
- 不采集、不保存、不输出 Prompt、回复或工具调用正文
- 默认分享卡片不包含路径、模型名、请求数或精确 Token
- 不创建用量数据库或后台进程；`creature` 只维护一个不含精确用量的本地成长档案

## 测试

```bash
npm test
```

测试使用脱敏的合成 JSONL 和 SQLite，不读取真实会话内容。

## 代码结构

- `bin/anti-ai.mjs`：最小可执行入口
- `src/cli.mjs`：参数校验与命令编排
- `src/help.mjs`：全局与分命令帮助
- `src/scanner.mjs`：六来源 JSONL/SQLite 扫描和统计
- `src/methodology.mjs`：具名公开案例与高位选择
- `src/comparisons.mjs`：按周期分级的生活对照
- `src/content.mjs`：确定性中英文尾句与分享文案池
- `src/reporting.mjs`：账单、日历、卡片与每日罪名
- `src/creature.mjs`：异变体成长规则和本地档案
- `src/shared.mjs`：共享的语言和空统计结构

## 参与贡献

请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md) 和 [SECURITY.md](./SECURITY.md)。提交问题时请勿附带真实 Agent 日志或 SQLite 数据库。

## 许可证

[MIT](./LICENSE)
