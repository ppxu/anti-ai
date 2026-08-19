# 统计与换算方法

[English](./methodology.md) | 简体中文

这份文档明确区分 `anti-ai` 能从本地记录中统计的内容，以及只能通过公开资料估算的内容。

- **Token 与模型用量：** 按各 Agent 的数据结构，从本地用量元数据派生。
- **电力、水耗与碳排：** 使用公开参照案例，不是本地实测。
- **生活化翻译：** 使用透明的展示换算，不是环境测量标准。

当前安装版本中的可执行说明始终是最终依据：

```bash
anti-ai explain sources
anti-ai explain resources
anti-ai explain comparisons
```

## 本地数据来源

默认位置：

| Agent | 默认路径 | 覆盖变量 |
|---|---|---|
| Codex | `~/.codex/sessions` | `ANTI_AI_CODEX_DIR` |
| Claude Code | `~/.claude/projects` | `ANTI_AI_CLAUDE_DIR` |
| OpenCode | `~/.local/share/opencode/opencode.db` | `ANTI_AI_OPENCODE_DB` |
| OpenClaw | `~/.openclaw/agents` | `ANTI_AI_OPENCLAW_DIR` |
| Hermes | `~/.hermes/state.db` | `ANTI_AI_HERMES_DB` |
| Pi | `~/.pi/agent/sessions` | `ANTI_AI_PI_DIR` |

覆盖示例：

```bash
ANTI_AI_CODEX_DIR=/path/to/codex/sessions \
ANTI_AI_CLAUDE_DIR=/path/to/claude/projects \
ANTI_AI_OPENCODE_DB=/path/to/opencode.db \
ANTI_AI_OPENCLAW_DIR=/path/to/openclaw/agents \
ANTI_AI_HERMES_DB=/path/to/hermes/state.db \
ANTI_AI_PI_DIR=/path/to/pi/sessions \
anti-ai today
```

## Token 统计口径

### Codex

- 累计每条 `token_count.info.last_token_usage` 快照。
- 使用同一会话中最近的 `turn_context.payload.model` 归属具体模型。
- 缓存输入和推理输出是展示子集，不重复加入总量。

### Claude Code

- 读取 assistant message 的 `usage`。
- 同一流式响应可能多次落盘，按 `message.id` 去重并保留最完整快照。
- 从 `message.model` 读取模型。
- 输入总量包含普通输入、缓存读取和缓存写入。

### OpenCode、OpenClaw、Hermes 与 Pi

- **OpenCode：** 从 SQLite 的 `message` 或 `session_message` 表读取 assistant usage。
- **OpenClaw：** 跨活动日志与 `.reset.*` JSONL 按消息 ID 去重，并排除 trajectory 导出。
- **Hermes：** 优先读取包含辅助调用的 `session_model_usage`，否则回退到 `sessions` 汇总。这些总量可能跨越多个自然日，工具按会话最后活动日归档，因此 `doctor` 会标为“会话级近似”。
- **Pi：** 统计 assistant、compaction 和 branch-summary 用量，并对复制或分叉会话中的同一 entry ID 做全局去重。

OpenCode 和 Hermes 使用可选的 `better-sqlite3` 适配器。驱动缺失或 Node ABI 不兼容不会阻塞 JSONL 来源。全来源报告会保留健康来源并显示隐私安全的警告；显式选择损坏的 SQLite 来源时则会以可操作错误退出。

日志没有模型字段时归入 `unknown`。终端报告展示 Token 最高的五个“来源 + 模型”组合，JSON 保留完整明细。

## 公开资源参照

受支持的 Agent 都没有向本工具提供逐请求的实际电力、水耗或碳排。`anti-ai` 会独立计算每个具名公开案例，并为每项资源选择最高结果；不会把测量边界不同的数据拼成虚假的范围。

| 案例 | 公开单位 | 电力 | 水耗 | 碳排 | 边界 |
|---|---:|---:|---:|---:|---|
| Google | 中位文本请求 | 0.24 Wh | 0.26 mL | 0.03 gCO₂e | 生产测量，包含活跃加速器、主机、空闲容量和数据中心开销 |
| OpenAI | 平均 ChatGPT 查询 | 0.34 Wh | 0.32176 mL | 未公开 | 未披露模型、请求长度和完整测量边界 |
| Mistral | 使用 Large 2、输出 400 Token 的 Le Chat 响应 | 未公开 | 45 mL | 1.14 gCO₂e | 生命周期高位案例，包含服务器制造等上游影响，不包含用户终端 |

一手资料：

- [Google — Measuring the environmental impact of delivering AI at Google Scale](https://services.google.com/fh/files/misc/measuring_the_environmental_impact_of_delivering_ai_at_google_scale.pdf)
- [OpenAI 披露 — The Gentle Singularity](https://blog.samaltman.com/the-gentle-singularity)
- [Mistral — Our contribution to a global environmental standard for AI](https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/)

设 `R` 为模型请求数，`O` 为输出 Token：

```text
电力 Wh     = max(R × 0.24, R × 0.34)
水耗 mL     = max(R × 0.26, R × 0.32176, O ÷ 400 × 45)
碳排 gCO₂e  = max(R × 0.03, O ÷ 400 × 1.14)
```

账单会标出每项资源最终选中的案例。结果既不是本地实测，也不是统计置信区间。实际请求会因模型、上下文长度、推理深度、硬件、批处理、数据中心和能源结构产生数量级差异。

## 生活化翻译

报告固定展示五条对照：`today` 使用小型日常活动，`week` 使用中型活动，`month` 使用大型活动。

设 `E` 为估算电力 Wh，`W` 为水耗 mL，`C` 为碳排 gCO₂e：

| 周期 | 活动 | 换算 | 依据 |
|---|---|---|---|
| today | 10W LED 灯 | `E ÷ 10` 小时 | 整值展示假设 |
| today | 19Wh 手机充电 | `E ÷ 19` 次 | 整值展示假设 |
| today | 550mL 饮用水 | `W ÷ 550` 瓶 | 整值展示假设 |
| today | 一滴水 | `W ÷ 0.05` 滴 | 整值展示假设 |
| today | 平均燃油车 | `C ÷ 244.2` 公里 | 美国 EPA 等效换算 |
| week | 烧开 1L 水 | `E ÷ 100` 壶 | 100Wh 整值展示假设 |
| week | 50W 笔记本电脑 | `E ÷ 50` 小时 | 整值展示假设 |
| week | 1kW 微波炉 | `E ÷ 1,000` 小时 | 整值展示假设 |
| week | WaterSense 淋浴 | `W ÷ 7,600` 分钟 | EPA 2.0 gal/min 上限，约 7.6L/min |
| week | ENERGY STAR 洗碗机 | `W ÷ 12,100` 次 | 标准洗碗机 3.2 gal/cycle 上限，约 12.1L |
| month | 平均燃油车 | `C ÷ 244.2` 公里 | 美国 EPA 等效换算 |
| month | 一棵城市树 | `C ÷ 60,000 × 365 × 24` 小时吸收 | 美国 EPA 估算 0.060 公吨 CO₂/年 |
| month | 标准泳池 | `W ÷ 2,500,000,000` 池 | 250 万升整值展示假设 |
| month | 美国家庭日均用电 | `E ÷ 33,400` 天 | EPA 12,194kWh/年除以 365 |
| month | 一缸洗澡水 | `W ÷ 150,000` 缸 | 150L 整值展示假设 |

官方换算资料：

- [EPA WaterSense 淋浴喷头](https://www.epa.gov/watersense/showerheads)
- [ENERGY STAR 洗碗机标准](https://www.energystar.gov/products/dishwashers/key_product_criteria)
- [美国 EPA 温室气体等效换算与参考](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references)

日常用品的整值功率和容量用于帮助理解量级，不是环境测量标准。大型活动不足 `0.01` 个时，会显示“还差多少倍”而不是四舍五入为 `0.00`。

树木对照表达的是“一棵城市树需要多久才能吸收对应估算”，**不代表实际砍了多少棵树**。

## 隐私与复现

扫描只保留聚合所需的时间、消息身份、模型与用量元数据，不保存或打印 prompt、response 和 tool-call 内容，也不创建持久用量索引。被选中的来源会并发扫描；报告与结算区间重叠时，请求级会话只扫描当前内存结果中缺失的日期，复用范围不会超出当前命令或已确认的 TUI 动作。Codex JSONL 只解码有大小上限的用量/模型候选记录，因此超大的无关记录会被跳过，不会以会话正文形式进入内存。

交互式终端扫描超过短暂延迟后，stderr 会显示本地化活动提示。JSON、非交互式 stderr 和 TUI 不显示该提示，报告数据也不会包含它。

需要稳定机器处理时使用 `--json`；需要检查当前安装版本采用的方法时使用 `anti-ai explain`。公开常量与高位选择逻辑位于 [`src/methodology.mjs`](../src/methodology.mjs)，展示换算位于 [`src/comparisons.mjs`](../src/comparisons.mjs)。
