# 架构说明

`anti-ai` 是纯本地 CLI，继续保持一个 npm 包、一个可选原生适配器和一个隐私安全的 JSON 状态文件。统计与玩法内核仍不依赖框架；面向人类的 `tui` 适配层使用 Ink 与 React，并编译成一个自包含发布产物。项目仍不引入服务器、账号、遥测或后台进程，必需运行时依赖保持为零。

## 运行链路

1. `bin/anti-ai.mjs` 调用导出的 CLI `main()`。
2. `src/registry.mjs` 声明支持的命令、卡片与本地来源。
3. 显式报告与玩法命令继续经过扫描器、领域模块和现有终端或 SVG 适配层。
4. `tui` 从 `src/application/` 加载与展示无关的快照、会话级动作控制器和本地分享导出控制器，再动态导入 `dist/tui.mjs` 中已打包的 Ink 适配层。
5. 终端、TUI 和 SVG 适配层只格式化派生结果，不读取会话正文。

来源适配器彼此隔离。扫描 `all` 时，单个来源损坏不会遮蔽其他健康来源；输出只包含来源 ID 和错误码，不包含本地记录或会话片段。只有选中了实际存在的 SQLite 来源时，才会加载 `better-sqlite3`。

## 状态边界

`~/.anti-ai/creature.json` 仍是唯一持久化玩法文件，只保存离散用量带和派生玩法状态，不保存精确 Token、模型名、Prompt、回复、工具调用或来源路径。

- 完整来源的人类可读 `today`、`week`、`month`，以及 `creature`、`encounter`、改变状态的实验室动作和显式远征动作，可能写入本地成长史。
- 带来源过滤的报告和 `today --json` 只做统计。
- TUI 的浏览、档案查看、观察、回放、分享预览与取消操作保持只读。每日结算的影响预览可能扫描受支持的用量元数据但不会写入。后果陈列柜调整，以及每天各一次的“观察”和“接触”，只会在明确确认后写入稳定收藏/互动 ID。远征的定向启程、推进与分叉处置把当前选中项加 `Enter` 视为明确意图，并带有执行中输入锁；放弃和影响更大的选择仍保留独立预览。远征资格按本地自然日计算，不依赖异变体结算。所有写入都经过共享动作服务。确认分享预览后只会以禁止覆盖的方式新建一个 SVG，不会改变玩法状态；启动目录不可写时改用 `~/.anti-ai/exports`。
- `codex`、`creature habitat`、`creature chronicle`、所有 `share` 卡片、`doctor`、`explain` 与 Help 仍是只读快照。年鉴、世代对照、病理星图、馆藏异变和活体生态舱场景只在内存中派生，不增加 schema 字段。
- `creature reset` 是唯一主动删除状态文件及迁移备份的命令。

读取状态时会先校验 schema 和根状态外壳，再逐版本迁移。迁移后的第一次写入会在 `~/.anti-ai/backups/` 保存按内容寻址的原始副本。写入使用临时文件、原子重命名、短时文件锁和乐观指纹；过期并发命令会失败，而不会覆盖更新后的成长记录。

## 扩展边界

新增本地 Agent 时，在 `src/registry.mjs` 注册元数据，并在 `src/scanner.mjs` 增加一个适配操作。JSONL 应流式读取；SQLite 必须只读、可选，并在数据库不存在时返回空用量。

拥有较多编排逻辑的新命令放入 `src/commands/`。参数与白名单归注册/CLI 层，领域计算归领域模块，展示归 `src/cli/render.mjs` 或 `src/renderers/`。

与展示无关的查询模型和动作编排放入 `src/application/`：`action-catalog.mjs` 派生可用性、禁用原因与确认模式，`actions.mjs` 负责预览和执行会话，`settlement.mjs` 保存共享结算链路，`archive.mjs` 派生孵化后的逐日收容记录。`share-export.mjs` 只从已结算状态在内存中准备当前场景的 SVG，以只读方式选择可写目录，并在确认后才创建目录和文件。CLI 命令和 TUI 调用这些服务，不重复实现领域规则；TUI 不能调用命令处理器或执行任意 Shell 命令，异变规则仍只能由领域模块负责。`src/chronicle.mjs` 把历史异变查询组合成当前身份、7/30/90 天病程和世代对照；`src/collection-sets.mjs` 负责路线对等且只影响展示的星座定义、显露规则与病程阶段；`src/collection-phenotype.mjs` 根据带日期的固定发现派生里程碑馆藏异变，但不改变基础外观身份。这些模块都不能写状态或拥有动作。`src/habitat-scenes.mjs` 负责路线平衡的活体生态舱原型，并只读派生环境、本体姿态、关系语境、近期痕迹、时段和短讯。`src/incidents.mjs` 独立负责确定性的事故资格、上下文选择、响应封存、延迟后果和双章节事件链。`src/expedition.mjs` 负责不累计的本地日期资格、稳定十格计划、分叉、变化、收藏解锁和历史日期过滤；`src/expedition/content.mjs` 负责双语内容，`presentation.mjs` 派生 CLI、TUI 与 SVG 共同消费的事件层级和返航总结。适配层只负责展示或调用这些规则。

TUI 必须消费结构化快照，不能解析终端文案；五个区域依次为总览、生态舱、远征、实验室和图鉴。总览读取年鉴投影，图鉴读取同一组十二项派生星座并按三条路线分栏；两者都不会增加第六个区域或新动作。生态舱直接消费与终端和 SVG 适配层相同的活体场景对象，不重复拼装展示规则。schema v14 为 v13 档案增加空远征索引，不虚构过去的远征；v3.5 继续使用 schema v14，因为年鉴、星图、馆藏异变和场景状态都会重算。既有内容迁移仍会给旧记录补上 `contentVersion: 1`，只让新结算日期进入 v2 内容池。`src/consequence-cabinet.mjs` 负责 3 个陈列位引用与确定性每日叙事反馈；`src/application/tui-motion.mjs` 负责确定性的 ASCII 帧、器官观察、异色故障特征、伴生动作、事件回放场景、低频活体环境变化和临时远征光标动态，本身不能访问计时器或持久化；`src/tui/` 只保存临时帧计数、键盘焦点、紧凑布局和确认状态。动态刷新最高 4 FPS，离开活体页面后暂停，也能在不改变快照的前提下彻底关闭。

Ink 与 React 只存在于 `devDependencies`，由 `scripts/build-tui.mjs` 打包为 `dist/tui.mjs`；普通命令不会加载框架，安装包仍没有必需运行时依赖。只编辑 `src/tui/`，不要直接修改生成产物。

异变体语料放在 `src/creature/content.mjs`，外观组合放在 `src/creature/appearance.mjs`，带版本的每日成长策略放在 `src/creature/balance.mjs`，聚合成长和收藏规则留在 `src/creature.mjs`。平衡规则 v2 使用此前最多 28 个非零活跃日的中位数作为个人基线；绝对剂量过高只增加污染，不额外奖励能力点；当前生态由最近 28 个阅历日决定，同时保留终身累计值作为档案。任何新机制都必须守住产品护栏：高消耗、克制使用和 AI 清醒日可以塑造不同结果，但 Token 数量不能成为唯一升级路径。

## 质量门禁

- `npm test`：快速公共行为测试。
- `npm run build:tui`：编译自包含的 Ink/React 适配层。
- `npm run check`：检查语法、行尾空格、缺失的相对导入、运行时循环依赖和本地 Markdown 链接。
- `npm run test:coverage`：`src` 行覆盖率 90%、函数 90%、分支 75%。
- `npm run test:package`：打包真实 tarball，在没有可选原生依赖时安装并运行。
- `npm run verify`：完整本地与发布前门禁。

CI 在 Node.js 22、24、26 上执行完整门禁，并由 CodeQL 与 Dependabot 覆盖源码和依赖漂移。
