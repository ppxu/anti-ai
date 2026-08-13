# 项目文档

[English](./README.md) | 简体中文

根目录 [README](../README.zh-CN.md) 是精简的项目入口；这里集中导航实现细节、玩法规则、数据边界和扩展说明。

## 从这里开始

| 文档 | 内容 |
|---|---|
| [统计与换算方法](./methodology.zh-CN.md) | Agent 统计规则、资源公式、生活化对照、展示假设和一手资料 |
| [架构说明](./architecture.zh-CN.md) | 运行时分层、状态归属、扩展接口、隐私边界和质量门禁 |
| [原生 macOS 桌面伴生体](./desktop.zh-CN.md) | 安装连接、操作、快照、更新、分发和桌面隐私 |

精确命令语法以当前安装版本自带的帮助为准：

```bash
anti-ai --help
anti-ai <command> --help
anti-ai explain
```

## 报告与诊断

| 文档 | 内容 |
|---|---|
| [每日收容播报](./daily-briefing.zh-CN.md) | TUI 总览的信息层级、建议、收藏更新和操作边界 |
| [Token 代谢门诊](./clinic.zh-CN.md) | 确定性诊断、证据窗口、被动研究和隐私安全状态 |

## 异变体成长与历史

| 文档 | 内容 |
|---|---|
| [异变体成长指南](./creature.zh-CN.md) | 生命周期、能力、生态、世代、稀有度、持久化和形态容量 |
| [基础器官图鉴](./creature-organs.zh-CN.md) | 组成 ASCII 异变体的全部基础器官图形 |
| [成长外观图鉴](./creature-growth-appearance.zh-CN.md) | 阶段、病理、生态、伤痕、成就和嫁接外观 |
| [异变年鉴](./chronicle.zh-CN.md) | 7/30/90 天回顾、世代比较、预后和病理套组 |
| [分叉病历](./casebook.zh-CN.md) | 转折点、三路线选择和历史行为 |
| [收容事故](./incidents.zh-CN.md) | 延迟事故、响应代价、余波和后续章节 |

## 探索与收藏

| 文档 | 内容 |
|---|---|
| [收容远征](./expeditions.zh-CN.md) | 每日一次的十格流程、目的地、事件、选择、藏品和总结 |
| [污染实验室](./laboratory.zh-CN.md) | 派生材料、确定性配方、培养物和培养架行为 |
| [伴生异物](./companions.zh-CN.md) | 绑定、每日印记、路线、阶段和伴生外观 |
| [活体生态舱](./habitat.zh-CN.md) | 共同场景、关系、生态、后果陈列和轻量每日互动 |
| [本地异变体遭遇](./encounters.zh-CN.md) | AA1 污染码、确定性混合体和外来标本存储 |
| [本地访客共处](./visitors.zh-CN.md) | 访客接待、寄宿、共处、释放和纯本地边界 |

## 项目资料

- [更新日志](../CHANGELOG.md)
- [贡献指南](../CONTRIBUTING.md)
- [安全策略](../SECURITY.md)
- [行为准则](../CODE_OF_CONDUCT.md)
- [Agent Skill](../skills/anti-ai/SKILL.md)

项目文档同时维护英文与简体中文。行为变化时，应同步更新对应的双语文档，并按需更新 CLI Help 与 `anti-ai explain`。
