# 分叉病历

[English](./casebook.md) | 简体中文

分叉病历给异变体加入纯本地选择，但不会把多烧 Token 变成成长捷径。它会记录怪兽长成了什么、偶尔给出带代价的选择，并预演几种可能方向，却不假装能精确预测未来。

## 命令

```bash
anti-ai creature history
anti-ai creature history --full
anti-ai creature history --json

anti-ai creature intervene
anti-ai creature intervene <1|2|3>
anti-ai creature intervene --json

anti-ai creature incident
anti-ai creature incident <1|2|3>
anti-ai creature incident --json

anti-ai creature prognosis
anti-ai creature prognosis --json

anti-ai share --card prognosis > anti-ai-prognosis.svg
```

运行 `anti-ai help creature history`、`anti-ai help creature intervene`、`anti-ai help creature incident` 或 `anti-ai help creature prognosis` 可以查看对应帮助。完整延迟事件链规则见[收容事故](./incidents.zh-CN.md)。

## 关键病程

`creature history` 会把很长的本地成长史压缩为真正重要的节点：

- 首次孵化与生命阶段变化；
- 稀有突变与异色觉醒；
- 新解锁的成就；
- 永久化石与已封存进化选择；
- 转折病例与已封存选择；
- 收容事故、已封存响应与已揭晓后果。

`--full` 会额外展开每个阅历日，但每行只包含日期、阅历日序号、活跃/休眠状态、离散用量带和事件 ID。它不会暴露精确 Token、模型、路径、Prompt、回复或逐请求时间。

## 转折病例

孵化后，每 14 个阅历日最多出现一个病例。Token 量不能让病例更早出现：一个已结算自然日依然只等于一个阅历日。

同时最多保留一个待处理病例。只要它还没选择，后续间隔就不会堆出一串待办。当前内置 24 个确定性病例骨架：四种使用病型和两种生态路线各有 4 个，原有示例仍保留在池中：

- 上下文：上下文回声室、递归记忆热；
- 缓存：缓存木乃伊化、回滚钙化症；
- 请求：请求口器自主续杯、队列寄生虫；
- 核食：反应堆盗汗、瓦时高热；
- 清醒：戒断谵妄、清醒排异；
- 悖论：裂解诊断、借来症状。

每个病例都提供同样三种价值方向，并明确展示收益和代价：

1. **污染 / 放任增殖**：后续预后会把污染路线记为既往倾向，本地病历则永久留下一道“增殖缝线”。
2. **清醒 / 强制戒断**：后续预后会把清醒路线记为既往倾向，本地病历则永久贴上一枚“戒断封条”。
3. **悖论 / 交叉移植**：后续预后会把悖论路线记为既往倾向，本地病历则永久形成一道“分叉瘢痕”。

查看病例不会自动选择。只有显式运行 `creature intervene <1|2|3>` 才会写入路线；一旦封存就不能改选。

## 三路预后

`creature prognosis` 会在 14–30 个阅历日的窗口中同时比较污染、清醒、悖论。它根据当前生态、连续活跃/清醒状态、失控指数和既往选择，解释每条路线为何属于：

- `主导病程`；
- `可能并发`；
- `潜伏分支`。

这些是定性的方向标签，不是百分比。预后来自确定性的本地游戏规则，不调用模型，也不是预测承诺、任务或奖励保证。

预后分享卡会展示当前病例及三条路线的公开代价。卡片刻意省略精确 Token、模型、来源、路径、Prompt、回复、请求数和污染编码。

## 图鉴与持久化

已封存选择会成为 `anti-ai codex` 中不限数量的病例切片。它们不会改变固定 134 项收藏的分母，也不会提供战力或 Token 分数。

异变体档案使用 schema v16。病例与事故只保存：

- 稳定的病例与路线 ID；
- 出现日期和选择日期；
- 作为触发摘要的阅历日、生态、病型与能力 ID；
- 下一次病例间隔。
- 稳定的事故、响应、后果和事件链 ID，以及隐私安全的触发摘要与日期。

schema v1–v12 会在本地逐版本幂等迁移。迁移会保留病历、把旧日期冻结为 v1 内容，并在需要时建立空索引，不会虚构历史选择、事故、实验、绑定、陈列或互动。

所有内容仍保存在 `~/.anti-ai/creature.json`。没有账号、服务器、上传、排行榜、每日签到或 Token 消耗加速器。
