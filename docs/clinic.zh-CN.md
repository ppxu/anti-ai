# Token 代谢门诊

[English](./clinic.md)

Token 代谢门诊把本地 usage metadata 解释成确定性、带证据边界的使用模式。它是对账单信号的反讽，不是医学诊断、生产力评分、因果结论或个人能力评价。

## 命令

```bash
anti-ai clinic
anti-ai clinic --date 2026-07-23 --source codex
anti-ai clinic --json
anti-ai clinic start <cache-rehab|context-diet|load-recovery>
anti-ai clinic history
```

`clinic` 扫描目标日期及此前 30 个自然日。`clinic history` 只读取既有异变体档案，不扫描 Agent 记录。两者都只读；`clinic start` 是门诊唯一会写入状态的命令。

人类可读的 `today`、`week`、`month` 会追加与周期相称的门诊段落。`today --json` 保持不变，脚本应使用有版本的 `clinic --json`。TUI 复用总览和行动中心，不增加第六个一级区域。

## 证据模型

目标日会与 31 天窗口内此前最多 14 个活跃日比较。相对规则至少需要 3 个可比活跃日。请求级信号先在各来源内部计算，不会把不同 Agent 的事件语义直接混加。

报告会明确给出：

- `fieldsUsed`：支持主诊断的标准用量字段；
- `sourcesUsed`：为该诊断提供有效证据的来源；
- `excludedSources`：来源 ID 与 `field_unavailable`、`scan_failed` 或 `no_comparable_baseline` 原因；
- `baselineActiveDays`：实际使用的可比历史日数；
- `provisional`：所选本地自然日尚未结束时为 `true`；
- 固定限制声明：结果只描述相关性，不评价生产力或因果关系。

字段缺失不会被当成 0。Hermes 默认只进入总量规则；未来只有在适配器能证明请求、缓存或模型字段存在时，才会进入相应规则。Pi 的请求密度只与 Pi 自身历史比较。模型 ID 可在内存中用于判断主导模型变化，但模型名不会进入门诊 JSON 或持久化状态。

## 诊断

每天最多突出一个主诊断；同时出现多个信号时，使用固定优先级：

1. `burst_overload`
2. `cache_imbalance`
3. `context_bloat`
4. `request_fragmentation`
5. `model_migration`
6. `restrained_recovery`
7. `stable_metabolism`
8. `insufficient_evidence`

| ID | 规则 |
|---|---|
| `burst_overload` | 当日总量不低于此前活跃日中位数的 2.5 倍 |
| `cache_imbalance` | 同一可用来源的缓存写入至少占输入 35%，缓存读取低于 15%，且至少 3 次事件 |
| `context_bloat` | 每次事件的新鲜输入不低于该来源历史中位数的 2.2 倍，且至少 3 次事件 |
| `request_fragmentation` | 事件数不低于该来源历史中位数的 2 倍，同时每次事件 Token 不高于中位数的 55% |
| `model_migration` | 连续 3 个可比活跃日由同一模型占至少 60%，目标日换成另一个占至少 60% 的主导模型 |
| `restrained_recovery` | 已结束自然日的总量不高于此前中位数的 45%，包括 AI 清醒日 |
| `stable_metabolism` | 证据充分且没有触发信号 |
| `insufficient_evidence` | 缺少可比基线或可用证据 |

本地自然日结束前不会封存低用量恢复结论，高位信号可以标记为“今日观察中”。7/30 天趋势统计可判断天数、活跃日、AI 清醒日、信号日，以及增加/减少/持平的定性方向，不生成健康分或效率分。

`freshInput = max(0, inputTokens - cachedInputTokens - cacheWriteInputTokens)`。

## 被动研究

同一时间最多有一个尚未结束的课题：

| CLI 协议 | 时长 | 观察内容 | 可能印章 |
|---|---:|---|---|
| `cache-rehab` | 7 天 | 缓存失调 | 缓存趋稳、写入反复、证据不足 |
| `context-diet` | 14 天 | 上下文膨胀与请求碎片化 | 上下文收束、持续膨胀、请求碎片化、证据不足 |
| `load-recovery` | 30 天 | 突发过载与克制恢复 | 负载恢复、过载反复、负载震荡、证据不足 |

课题按本地自然日推进，不依赖打卡、Token 量或后台任务。结束日为“开始日 + 时长 - 1”，次日视为完成。漏日不会清零、惩罚或延长课题；缺少已封存样本只会降低证据覆盖，可能得到“证据不足”，不会产生失败惩罚。

完成课题只增加一枚本地报告印章，不提供能力、阅历、生态、稀有率、收藏进度、伴生成长、远征次数或 Token 奖励。

## 状态与隐私

异变体 schema v15 新增：

- `clinic.studies`：只包含稳定协议 ID、开始/结束日期和内容版本；
- 可选的 `days[date].metabolism`：在正常异变体结算时封存的隐私安全代谢快照。

每日快照只保存主诊断 ID、信号 ID 与严重度档位、标准字段 ID、来源 ID、排除来源 ID、可比日数和 provisional 标记。自然日尚未结束时可以保留 provisional 样本；下一次明确执行异变体结算时，会在自然日结束后只完成该诊断，不改写当天成长。它不保存精确 Token、比例、逐请求时间、模型名、Prompt、回复、工具调用正文、项目路径或原始记录。

schema v14 会顺序迁移到 v15，只增加空门诊容器，不虚构历史诊断或课题。浏览 `clinic`、`clinic history`、周期报告或 TUI 不会改写已经完成的代谢样本。全部统计与研究派生都留在本地，没有账号、网络请求、遥测、daemon、通知或云同步。

## JSON 稳定性

`clinic --json` 返回语言无关的 version 1 envelope，包含 `date`、`provisional`、`diagnosis`、`evidence`、`trends`、`study` 和 `limitations`。同一份 usage metadata、日期、来源过滤与 anti-ai 版本会得到相同的稳定 ID 和数组；讽刺文案与 ANSI 不进入 JSON。

`clinic history --json` 按开始日期倒序返回有版本的研究记录。完成结果只从已封存的隐私安全每日样本派生，历史查看不会扫描原始 Agent 存储。
