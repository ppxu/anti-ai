# anti-ai

[![npm version](https://img.shields.io/npm/v/anti-ai.svg)](https://www.npmjs.com/package/anti-ai)
[![CI](https://github.com/ppxu/anti-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/ppxu/anti-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[English](./README.md) | 简体中文

把本地 Codex、Claude Code、OpenCode、OpenClaw、Hermes 和 Pi 的使用记录，变成一张透明又刻薄的 AI 资源账单，以及一只由你的 AI 使用方式塑造出来的异变体。

```text
┌──────────────────────────────────────────────┐
  你的 AI 账单 · 2026-07-23
├──────────────────────────────────────────────┤
  127,605,581 tokens · 1,058 次模型请求

  估算资源消耗 · 公开高位参照
  ⚡ 359.72 Wh   💧 54,015.30 mL   ☁️ 1,368.39 gCO₂e

  生活翻译
  💡 10W LED 灯      1.50 天
  📱 19Wh 手机充电   18.93 次
  🚗 平均燃油车      5.60 公里

  今日罪名：刚需附件收藏家
└──────────────────────────────────────────────┘
```

人类可读输出默认使用简体中文，通过 `--lang en` 切换英文；JSON 字段名始终保持稳定。

## 它能做什么

- **资源账单：** 按来源和模型查看每天、每周、每月的 Token，再把公开资源估算换算成日常活动。
- **异变体：** 高消耗、节制使用和 AI 清醒日都会塑造一只持久化的本地怪物，但 Token 更多并不会升级更快。
- **收集体系：** 发现形态、器官、成就、事故、远征收藏、培养物、伴生物和访客。
- **多种入口：** 支持可脚本化 CLI、Ink 交互式 TUI、隐私安全的 SVG 卡片，以及可选的原生 macOS 桌面伴生体。
- **本地优先：** 对话内容留在本机，没有账号、遥测、排行榜，也没有后台用量索引。

## 运行要求

- Node.js 22 或更高版本
- 至少一种受支持 Agent 的本地记录
- 可选桌面伴生体需要 macOS 14+

## 安装

```bash
npm install -g anti-ai
anti-ai doctor
anti-ai
```

在交互式终端中直接运行 `anti-ai` 会打开 TUI；脚本和专注流程可以继续使用显式命令：

```bash
anti-ai today
anti-ai week --lang en
anti-ai creature
anti-ai expedition
anti-ai share > anti-ai-receipt.svg
```

具体参数不需要猜，使用分层帮助即可：

```bash
anti-ai --help
anti-ai help creature
anti-ai creature --help
anti-ai lab --help
```

### 安装 Agent Skill

先安装 CLI，再通过开源 [`skills`](https://github.com/vercel-labs/skills) 安装器加入仓库中的隐私安全工作流：

```bash
npx skills add ppxu/anti-ai --skill anti-ai -g -y
```

Skill 会帮助受支持的 Agent 在人类账单、稳定 JSON 和分享卡片之间选择，同时明确禁止读取原始对话内容。

### 可选 macOS 桌面伴生体

原生 Swift/AppKit 应用独立发布，不会给 npm CLI 增加桌面依赖：

```bash
anti-ai desktop link
open /Applications/anti-ai.app
```

它只读取经过收敛的本地快照，不读取 Agent 日志；没有守护进程和遥测。唯一网络路径是 Sparkle 签名更新检查，只有手动触发或明确开启后才会运行。

本体未锁定时，单击会显示一张不抢焦点的短状态气泡，拖动可调整位置，双击则进入当前建议对应的 TUI 区域。菜单常驻展示状态和主要动作；位置、展示态、动态、语言与更新统一收进“设置”。

> v4.1.0 桌面版目前使用 ad-hoc 签名，尚未经过 Apple 公证。请只从[官方 Release](https://github.com/ppxu/anti-ai/releases/tag/v4.1.0)下载；首次启动可能需要进入**系统设置 → 隐私与安全性 → 仍要打开**。

安装、操作、更新和隐私边界详见[桌面伴生体说明](./docs/desktop.zh-CN.md)。

## 支持的本地来源

| Agent | 默认记录位置 | 统计说明 |
|---|---|---|
| Codex | `~/.codex/sessions` | JSONL 用量快照 |
| Claude Code | `~/.claude/projects` | assistant 快照去重 |
| OpenCode | `~/.local/share/opencode/opencode.db` | 可选只读 SQLite 适配器 |
| OpenClaw | `~/.openclaw/agents` | 活动与 reset JSONL 去重 |
| Hermes | `~/.hermes/state.db` | 可选 SQLite，会话级近似 |
| Pi | `~/.pi/agent/sessions` | 会话条目全局去重 |

某个来源缺失不会阻塞其他健康来源。运行 `anti-ai doctor` 可以检查可用性、路径、存储类型和统计精度；环境变量覆盖方式见[统计与换算方法](./docs/methodology.zh-CN.md)。

## 命令地图

| 命令 | 用途 |
|---|---|
| `anti-ai` / `anti-ai tui` | 打开包含五个区域的交互式收容控制台 |
| `today`、`week`、`month` | 查看用量、模型、资源、代谢门诊和异变体摘要 |
| `clinic` | 检查 Token 代谢模式和本地被动研究 |
| `creature` | 查看成长、历史、选择、事故和生态舱 |
| `codex` | 浏览私有病理收藏 |
| `expedition` | 每个自然日进行一次不囤积的十格远征 |
| `lab` | 培养污染物并绑定伴生物 |
| `encounter` | 交换隐私安全的污染码并接待本地访客 |
| `share` | 向 stdout 渲染隐私安全的 1200×630 SVG 卡片 |
| `desktop` | 连接、检查或刷新可选桌面伴生体 |
| `doctor` | 诊断数据来源和原生 SQLite 兼容性 |
| `explain` | 查看公式、来源、隐私规则和功能边界 |

所有人类可读命令都支持 `--lang zh|en`，面向机器的 `--json` 使用稳定的语言无关字段。完整选项和子命令请运行 `anti-ai <command> --help`。

## 不鼓励刷 Token 的成长

异变体记录的是你成为了怎样的 AI 使用者，而不是奖励“烧得更多”的计分器。

- 每个结算自然日只增长一个经验日。
- 高消耗、节制使用和 AI 清醒日塑造不同能力与生态路线，但不会改变阶段速度。
- 转折点、事故、远征、收藏、培养物、伴生物和访客提供选择与外观变化，不提供可购买战力。
- 本地存档只保留派生 ID 与日期，不保存精确用量或对话内容。

可以从[异变体成长指南](./docs/creature.zh-CN.md)开始，也可以在[项目文档目录](./docs/README.zh-CN.md)中浏览全部系统。

## 统计方法与隐私

本地 Token 和模型统计来自受支持 Agent 的用量元数据。电力、水耗和碳排**不是本地实测值**：不同厂商公开案例会被分别计算，账单明确标注每种资源选中的高位参照。生活化对照是透明的展示换算，不是环境测量标准。

完整的来源统计规则、默认路径、计算公式、展示假设和一手资料见[统计与换算方法](./docs/methodology.zh-CN.md)，也可以直接检查当前安装版本：

```bash
anti-ai explain resources
anti-ai explain comparisons
anti-ai explain sources
anti-ai explain privacy
```

隐私边界：

- 不保存或打印 prompt、response 和 tool-call 内容；
- 不上传 Agent 日志数据；
- 扫描不会创建用量数据库或后台进程；
- 分享卡片省略精确 Token、请求数、模型、来源和本地路径；
- 写操作必须来自显式 CLI 输入或经过确认的 TUI 操作；
- 可选桌面更新器只获取签名 HTTPS app feed，不上传产品数据。

请勿把真实 Agent 日志或 SQLite 数据库附到公开 Issue，改用最小化、脱敏后的 fixture。

## 项目文档

[项目文档目录](./docs/README.zh-CN.md)按照统计报告、异变体成长、收藏探索、桌面端、架构和贡献主题整理了全部指南。

推荐入口：

- [统计方法与数据来源](./docs/methodology.zh-CN.md)
- [异变体成长系统](./docs/creature.zh-CN.md)
- [TUI 每日收容播报](./docs/daily-briefing.zh-CN.md)
- [收容远征](./docs/expeditions.zh-CN.md)
- [原生 macOS 桌面伴生体](./docs/desktop.zh-CN.md)
- [架构与扩展边界](./docs/architecture.zh-CN.md)

## 开发

```bash
git clone https://github.com/ppxu/anti-ai.git
cd anti-ai
npm ci
npm run verify
node ./bin/anti-ai.mjs --help
```

测试使用合成 JSONL 和 SQLite fixture 验证公开 CLI。改动行为或状态前请阅读[架构说明](./docs/architecture.zh-CN.md)、[贡献指南](./CONTRIBUTING.md)和[安全策略](./SECURITY.md)。

## 许可证

[MIT](./LICENSE)
