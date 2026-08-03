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

- Node.js 22 或更高版本
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

anti-ai tui
anti-ai tui --lang en
anti-ai tui --no-motion

anti-ai codex
anti-ai codex --json

anti-ai creature export
anti-ai encounter <污染编码>
anti-ai encounter <污染编码> --save

anti-ai lab
anti-ai lab --json
anti-ai lab incubate 1
anti-ai lab shelf
anti-ai lab inspect <培养物编号>
anti-ai lab bond <培养物编号>
anti-ai lab companion

anti-ai share > anti-ai-receipt.svg
anti-ai share --lang en > anti-ai-receipt.svg
anti-ai share --card pathology > anti-ai-pathology.svg
anti-ai share --card specimen > anti-ai-specimen.svg
anti-ai share --card wanted > anti-ai-wanted.svg
anti-ai share --card fossil > anti-ai-fossil.svg
anti-ai share --card encounter --with <污染编码> > anti-ai-encounter.svg
anti-ai share --card prognosis > anti-ai-prognosis.svg
anti-ai share --card culture --id <培养物编号> > anti-ai-culture.svg
anti-ai share --card companion > anti-ai-companion.svg
anti-ai share --card habitat > anti-ai-habitat.svg

anti-ai creature
anti-ai creature --full
anti-ai creature --json
anti-ai creature habitat
anti-ai creature habitat --full
anti-ai creature history
anti-ai creature prognosis
anti-ai creature intervene
anti-ai creature intervene 2
anti-ai creature incident
anti-ai creature incident 2
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

`today --json`、`codex --json`、`creature --json`、`encounter --json` 和 `lab --json` 不受展示语言影响，字段名和结构保持稳定。

### `tui`

为人类打开可执行受控本地行动的收容控制台：

```bash
anti-ai tui
anti-ai tui --date 2026-07-23
anti-ai tui --lang en
anti-ai tui --no-motion
```

控制台把总览、生态舱、实验室和图鉴放进同一个键盘交互界面。在任意区域按 `a` 可打开行动中心，也可在出现上下文主行动时直接按 `Enter`。当前支持结算今日工作后遗症、响应收容事故、处理转折病例、选择世代进化、孵化培养物和缔结伴生关系；每条流程都遵循“影响预览 → 明确确认 → 执行结果 → 档案刷新”，`Enter` 或 `y` 确认，`Esc` 或 `n` 取消。

异变体与当前伴生物会以刻意克制的默认频率呼吸、眨眼和脉动。按 `m` 在“低频 / 完整 / 关闭”之间切换，也可以用 `--no-motion` 直接进入完全静态模式；动态效果不会改变成长或存档。

使用 `1`–`4` 或方向键切换区域。在生态舱中按 `Enter` 可逐个观察可见器官，并查看它们与既有能力值的关系；按 `r` 可回放最近一次已封存生态事件。只有已经发现异色能力的档案，才有极低概率出现异色故障帧。按 `?` 查看快捷键，按 `esc` 离开当前观察模式，按 `q` 退出且不惊动标本。

浏览、回放、观察和取消操作都保持只读，不会扫描 Agent 记录。打开“今日结算”的影响预览时，控制台可能扫描受支持的用量元数据，以便在确认前展示准确影响，但不会写入；只有明确确认后，才会通过与 CLI 相同的动作服务和原子并发检查更新异变体档案。脚本与 Agent 应继续使用明确命令和 `--json`；`anti-ai tui` 是面向人类的交互界面。

### `today`

打印指定自然日的 Token 用量、来源/模型拆分和参考公开数据得到的资源消耗估算。日期按系统本地时区计算。人类可读账单会与此前 7 个自然日比较，并从扩充后的讽刺文案库中给出一条“今日罪名”。同一天的标题和文案固定不变，这个过程不会调用模型。

缓存类罪名不会再因为日常高缓存率而长期霸榜：只有当日缓存读取占输入至少 `70%`，并且高出个人 7 日基线至少 `10` 个百分点时才会触发。

每类判词现在由 11 个罪名标题和 13 条详情组合；同一天结果固定，跨月不会重新从第一条开始。同一种症状连续触发时，有 143 种完整组合后才会原样重复。

`--json` 按来源和具体模型输出可核对的 Token 统计，不把资源参照、个人基线或吐槽混入机器数据。Hermes 的日期归档是明确标注的会话级近似。

默认的完整来源人类账单会在末尾结算当天异变体，并追加生态变化、当前形态、今日成就、新封存化石、待选择进化、当日图鉴入库反馈和一句当前生态舱观察；`today --json` 与带 `--source` 的账单不会改动这条完整成长史。

人类可读账单会直接扫描比较窗口；本地日志很多时可能需要数秒。当前版本仍不创建持久化用量索引。

### `week`

打印截至指定日期的最近 7 个自然日趋势，并展示模型账单、资源账单和生活化对照。完整来源的人类可读报告还会结算成长史，追加“活体病历”：本周主症状、污染/清醒变化、阶段与世代成长、本期新化石、新徽章、新增收藏、固定轮换的主治意见，以及当前生态舱关系与本期封存事件。带 `--source` 的报告只展示用量，不改动完整成长史。当前直接扫描近期日志，不建立索引；日志很多时可能需要数秒。

### `month`

打印本月第一天至指定日期的终端日历热力图，同时展示 AI 清醒日比例（例如 `7 天 / 23 天`）、最长清醒期、最重一天、模型账单和本月资源对照。

完整来源的人类可读报告还会追加“月度复诊”，汇总孵化后的有效观察期、主症状、生态人格迁移、阶段与世代成长、本月化石、成就、新增收藏和生态舱事故；孵化前的空白日不会被误诊为戒断。

### `codex`

查看从现有成长史派生出的本地病理图鉴：

```bash
anti-ai codex
anti-ai codex --date 2026-07-23 --lang en
anti-ai codex --json
```

固定收藏共 68 项：16 个形态家族、24 个成就、6 个异色能力、4 种世代伤痕和 18 个路线对等的生态现象。人类可读输出只揭示已发现名称，锁定项保持 `???`；动态标本指纹、外来遭遇标本、永久化石、已封存病例切片、污染培养物、已绑定伴生形态和已结案事故报告则不设人为上限。

`codex --json` 提供稳定 ID、发现状态与日期、收藏计数，以及指定日期的 `recent` 新发现。图鉴与 `creature` 共用完整的六来源成长史，因此拒绝 `--source` 过滤；它不新增状态，也不会把多烧 Token 变成首选收集路线。

人类可读图鉴还会展示生成器的 **21,233,664 种去重后的最终 ASCII 形象**。这是理论物种空间，不是个人收集进度。容量算法与视觉覆盖优先级详见[异变体成长指南](./docs/creature.zh-CN.md)。

### `encounter`

把当前形态导出为隐私安全的污染编码，与别人交换后，在本地制造一次事故：

```bash
anti-ai creature export
anti-ai encounter <污染编码>
anti-ai encounter <污染编码> --save
anti-ai encounter <污染编码> --json
```

同一对外观指纹始终生成同一个事故编号、接触类型和混种标本；算力天气则由所选日期确定。`--save` 只会把混种放进一次本地外来标本柜，不是必选项，也不会改变成长速度、评分或 Token 激励。

污染编码只包含协议版本和派生外观 ID，不包含精确 Token、来源/模型名、路径、Prompt、回复或请求时间。这个玩法没有服务器、上传、排行榜、战力或 Token 排名。协议、安全边界和收藏逻辑见[本地异变体遭遇](./docs/encounters.zh-CN.md)。

### `lab`

把已保存的外来标本、永久化石和病例切片送进纯本地污染实验室：

```bash
anti-ai lab
anti-ai lab --json
anti-ai lab incubate 1
anti-ai lab shelf
anti-ai lab shelf --full
anti-ai lab inspect <培养物编号>
anti-ai lab bond <培养物编号>
anti-ai lab companion
anti-ai lab companion --full
```

每个批次会给出三组确定性配方。重复查看不能重抽：相同本地 seed、派生原料库存和批次始终得到相同选择。显式选择一组后，会封存一份拥有独立培养皿 ASCII、稀有度、生态、病灶、并发症和副作用的培养物；另外两组配方随本批次结束。

原料只是引用，不会消耗。培养物不会改变阅历、能力、恶性阶、生态、进化概率、战力或 Token 收益。配方生成和培养只读取派生本地状态，不扫描 Agent 记录。

已封存培养物可以通过 `lab bond` 成为伴生异物。它每天只获得一枚印记：高消耗、克制使用和 AI 清醒日成长速度相同，但会分别塑造污染、清醒或悖论路线。它会从寄生幼体成长为共生异形与共犯器官，并在第 7 天和第 21 天获得确定性异常和新的 ASCII 身体。直接运行伴生命令时，会通过和 `creature` 相同的隐私安全本地用量统计补齐尚未观察的日期，但不会读取对话正文。配方规则见[污染实验室](./docs/laboratory.zh-CN.md)，完整成长模型见[伴生异物](./docs/companions.zh-CN.md)。

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
anti-ai share --card encounter --with <污染编码> > anti-ai-encounter.svg
anti-ai share --card prognosis > anti-ai-prognosis.svg
anti-ai share --card culture --id <培养物编号> > anti-ai-culture.svg
anti-ai share --card companion > anti-ai-companion.svg
anti-ai share --card habitat > anti-ai-habitat.svg
```

成长史与实验室现在支持 9 种隐私安全卡片：`pathology` 是病理切片，`specimen` 是当前收藏标本，`wanted` 是讽刺悬赏令，`fossil` 是最近一代的永久化石证书，`encounter` 是本地接触事故卡，`prognosis` 是当前病例的三路线预演，`culture` 是已封存培养事故，`companion` 是当前绑定伴生异物的成长档案，`habitat` 是双体收容场景。化石证书会在第 90 个阅历日后开放；预后卡会在转折病例待处理时开放；培养物卡默认选择最近一份，也可使用 `--id` 指定；伴生卡会在执行 `lab bond` 后开放。生态舱卡在伴生位空置时也可以生成。

工具不会上传卡片；所有卡片均不包含精确 Token、请求数、来源/模型名、路径或对话正文，保存位置完全由你的命令行重定向决定。异变体卡片必须使用完整数据，因此会拒绝 `--source` 过滤。

### `creature`

把最近的 Token 使用变成一只持续进化的“算力异变体”：

```bash
anti-ai creature
anti-ai creature --date 2026-07-23
anti-ai creature --lang en
anti-ai creature --json
anti-ai creature --full
anti-ai creature habitat
anti-ai creature habitat --full
anti-ai creature habitat --json
anti-ai creature export
anti-ai creature history
anti-ai creature history --full
anti-ai creature prognosis
anti-ai creature intervene
anti-ai creature intervene 2
anti-ai creature incident
anti-ai creature incident 2
anti-ai creature evolve
anti-ai creature evolve 2
```

每个已结算自然日只增加一天阅历，因此高消耗、低消耗和 AI 清醒日会长出不同性状，却不能靠多烧 Token 加速阶段。每个 90 天世代依次经历算力胚胎、反应堆幼兽、核食巨兽和算力熔毁体，最终封存为永久化石。

普通能力按 255 点循环；溢出会无损转化为恶性阶，获得路线专属诊断和进化修正，并记录进永久化石。

每 14 个阅历日最多出现一个转折病例。污染、清醒、悖论三条路线都会明示收益和代价；病例未处理时不会继续堆积选择。`history` 压缩关键成长节点，`prognosis` 使用定性标签预演三个可解释方向，不伪造精确概率。

每 7 个阅历日还可能出现一场收容事故。紧急隔离、继续观察和允许共振都会封存一组公开的收益与代价；延迟后果会在 3 个阅历日后揭晓，并可能开启一个确定性后续章节。待处理事故不会堆积，响应也不会增加能力、阅历、生态点或 Token 奖励。

核能巨兽生成器包含 16 个核心形态家族，以及 **21,233,664 种去重后的最终 ASCII 形象**。本地稳定基因决定器官，使用病型、生态人格、伤疤、成就和异色稀有度则继续改写同一条骨架。运行 `anti-ai codex` 可以对照理论容量与个人收藏。

`creature habitat` 会把当前标本、活动伴生物和收藏痕迹组合成已选择的单屏收容场景。它是只读命令，每 7 个阅历日派生一个确定性事件，不能靠重复查看或增加 Token 重抽、加速。

生命周期和外观规则见[异变体成长指南](./docs/creature.zh-CN.md)；关键病程和选择见[分叉病历](./docs/casebook.zh-CN.md)；延迟事件链见[收容事故](./docs/incidents.zh-CN.md)；培养配方与陈列见[污染实验室](./docs/laboratory.zh-CN.md)；伴生路线见[伴生异物](./docs/companions.zh-CN.md)；关系、场景和生态现象见[收容生态舱](./docs/habitat.zh-CN.md)。[Creature Guide](./docs/creature.md) · [Forked Casebook](./docs/casebook.md) · [Containment Incidents](./docs/incidents.md) · [Pollution Laboratory](./docs/laboratory.md) · [Symbiotic Companions](./docs/companions.md) · [Containment Habitat](./docs/habitat.md)。

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

OpenCode 和 Hermes 使用可选的 `better-sqlite3` 适配器。npm 会正常尝试安装，但驱动缺失或 Node ABI 不兼容时，不再阻塞 Codex、Claude Code、OpenClaw 与 Pi。可以运行 `anti-ai doctor` 查看降级来源：使用 `all` 时会保留健康来源并显示隐私安全的警告；显式选择损坏的 SQLite 来源时会以可操作的错误退出。

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
- `codex` 与全部 `share` 卡片只派生只读快照，不会结算或改写成长档案
- TUI 的浏览与取消保持只读；结算预览可能扫描用量元数据，任何写入都需要明确确认
- 持久化 schema 迁移会保留精确的内容寻址备份；并发写入会被拒绝，不会静默覆盖成长进度

## 测试

```bash
npm test
npm run check
npm run test:coverage
npm run test:package
```

测试使用脱敏的合成 JSONL 和 SQLite，不读取真实会话内容。

## 代码结构

- `bin/anti-ai.mjs`：最小可执行入口
- `src/cli.mjs`：轻量命令注册与分发
- `src/cli/`：参数解析、终端渲染和方法论说明
- `src/commands/`：异变体、遭遇、实验室、分享和 TUI 命令
- `src/application/`：与展示无关的读取模型和共享动作编排
- `src/tui/`：受控交互式收容控制台的 Ink 源码
- `dist/tui.mjs`：生成的自包含 Ink/React 运行时
- `src/help.mjs`：全局与分命令帮助
- `src/registry.mjs`：命令、卡片和本地来源元数据
- `src/scanner.mjs`：彼此隔离的六来源 JSONL/可选 SQLite 适配器
- `src/methodology.mjs`：具名公开案例与高位选择
- `src/comparisons.mjs`：按周期分级的生活对照
- `src/content.mjs`：确定性中英文尾句与分享文案池
- `src/reporting.mjs`：终端账单、日历与每日罪名
- `src/renderers/svg.mjs`：隐私安全的 SVG 卡片
- `src/creature.mjs`：异变体成长和收藏规则
- `src/creature/`：内容池与外观生成
- `src/state-store.mjs`：带校验、备份和冲突保护的本地状态存储
- `src/laboratory.mjs`：派生配方、封存培养物和培养架
- `src/companion.mjs`：伴生绑定、印记、路线和 ASCII 成长
- `src/habitat.mjs`：只读关系、场景装饰和七日生态事件
- `src/shared.mjs`：共享的语言和空统计结构
- `docs/architecture.zh-CN.md`：扩展、状态、隐私与质量边界
- `docs/creature.zh-CN.md`：完整的异变体系统与理论物种容量指南
- `docs/companions.zh-CN.md`：完整的伴生异物成长指南
- `docs/habitat.zh-CN.md`：完整的收容生态舱指南

## 参与贡献

请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md) 和 [SECURITY.md](./SECURITY.md)。提交问题时请勿附带真实 Agent 日志或 SQLite 数据库。

## 许可证

[MIT](./LICENSE)
