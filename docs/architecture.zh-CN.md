# 架构说明

`anti-ai` 是纯本地 CLI。2.0 继续保持一个 npm 包、一个可选原生适配器和一个隐私安全的 JSON 状态文件，不引入框架、服务器、账号、遥测或后台进程。

## 运行链路

1. `bin/anti-ai.mjs` 调用导出的 CLI `main()`。
2. `src/registry.mjs` 声明支持的命令、卡片与本地来源。
3. `src/scanner.mjs` 运行选中的来源适配器，按日期返回用量元数据。
4. `src/methodology.mjs` 与 `src/comparisons.mjs` 换算具名公开参照。
5. 独立命令处理器派生账单、异变体、遭遇、培养物或伴生异物。
6. 终端和 SVG 渲染器只格式化派生结果，不读取会话正文。

来源适配器彼此隔离。扫描 `all` 时，单个来源损坏不会遮蔽其他健康来源；输出只包含来源 ID 和错误码，不包含本地记录或会话片段。只有选中了实际存在的 SQLite 来源时，才会加载 `better-sqlite3`。

## 状态边界

`~/.anti-ai/creature.json` 仍是唯一持久化玩法文件，只保存离散用量带和派生玩法状态，不保存精确 Token、模型名、Prompt、回复、工具调用或来源路径。

- 完整来源的人类可读 `today`、`week`、`month`，以及 `creature`、`encounter` 和改变状态的实验室动作，可能结算本地成长史。
- 带来源过滤的报告和 `today --json` 只做统计。
- `codex`、所有 `share` 卡片、`doctor`、`explain` 与 Help 都是只读快照。
- `creature reset` 是唯一主动删除状态文件及迁移备份的命令。

读取状态时会先校验 schema 和根状态外壳，再逐版本迁移。迁移后的第一次写入会在 `~/.anti-ai/backups/` 保存按内容寻址的原始副本。写入使用临时文件、原子重命名、短时文件锁和乐观指纹；过期并发命令会失败，而不会覆盖更新后的成长记录。

## 扩展边界

新增本地 Agent 时，在 `src/registry.mjs` 注册元数据，并在 `src/scanner.mjs` 增加一个适配操作。JSONL 应流式读取；SQLite 必须只读、可选，并在数据库不存在时返回空用量。

拥有较多编排逻辑的新命令放入 `src/commands/`。参数与白名单归注册/CLI 层，领域计算归领域模块，展示归 `src/cli/render.mjs` 或 `src/renderers/`。

异变体语料放在 `src/creature/content.mjs`，外观组合放在 `src/creature/appearance.mjs`，成长和收藏规则留在 `src/creature.mjs`。任何新机制都必须守住产品护栏：高消耗、克制使用和 AI 清醒日可以塑造不同结果，但 Token 数量不能成为唯一升级路径。

## 质量门禁

- `npm test`：快速公共行为测试。
- `npm run check`：检查语法、行尾空格、缺失的相对导入、运行时循环依赖和本地 Markdown 链接。
- `npm run test:coverage`：`src` 行覆盖率 90%、函数 90%、分支 75%。
- `npm run test:package`：打包真实 tarball，在没有可选原生依赖时安装并运行。
- `npm run verify`：完整本地与发布前门禁。

CI 在 Node.js 22、24、26 上执行完整门禁，并由 CodeQL 与 Dependabot 覆盖源码和依赖漂移。
