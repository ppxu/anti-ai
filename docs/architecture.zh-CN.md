# 架构说明

`anti-ai` 是纯本地 CLI，继续保持一个 npm 包、一个可选原生适配器和一个隐私安全的 JSON 状态文件。包内明确划分 Core、Application、Infrastructure 和展示适配层，但暂不引入 workspace 或 monorepo；这样既保留简单的安装与发版流程，也为未来真的出现独立消费者时留下可拆包边界。统计与玩法内核仍不依赖框架；面向人类的 `tui` 适配层使用 Ink 与 React，并编译成一个自包含发布产物。项目仍不引入服务器、账号、遥测或后台进程，必需运行时依赖保持为零。

`apps/macos/` 下的 Swift/AppKit 应用是正式的原生展示消费者，不属于 npm 包或 Node
运行时依赖图。它只能消费版本化、隐私安全的 `Desktop Snapshot v1` 和经过校验的一次性
CLI bridge。Scanner、结算、成长、门诊、访客、远征和行动规则仍由 Node 应用层与领域层
唯一负责；桌面进程不能复制这些规则、读取 Agent 日志或引入 daemon。Sparkle 只作为隔离
的原生分发依赖：它只能在手动操作或明确开启后检查签名 HTTPS App 更新源，不进入 npm
依赖图。

## 运行链路

1. `bin/anti-ai.mjs` 调用导出的 CLI `main()`。
2. `src/registry.mjs` 声明支持的命令、卡片与本地来源。
3. 显式报告与玩法命令继续经过 `src/infrastructure/sources/` 的来源适配器、应用用例、领域模块和现有终端或 SVG 适配层；`src/scanner.mjs` 只保留兼容门面。
4. `tui` 从 `src/application/` 加载与展示无关的快照、会话级动作控制器和本地分享导出控制器，再动态导入 `dist/tui.mjs` 中已打包的 Ink 适配层。
5. `desktop link` 记录精确的 Node/CLI bridge 并写入首份快照；`desktop refresh` 通过正常结算链路原子替换快照。关联后的玩法写入会尽力同步同一投影，但快照失败不会阻断已经合法完成的玩法写入。
6. 原生应用读取快照，并且只能调用固定的 `desktop refresh` 或 `tui` 入口；终端、TUI、SVG 与桌面适配层都只格式化派生结果，不读取会话正文。
7. 隔离更新适配器只能在手动操作或明确开启后获取签名 HTTPS appcast 与已公证桌面更新包；它不读取产品状态，也不替换独立的 npm CLI。

来源适配器彼此隔离。扫描 `all` 时，单个来源损坏不会遮蔽其他健康来源；输出只包含来源 ID 和错误码，不包含本地记录或会话片段。只有选中了实际存在的 SQLite 来源时，才会加载 `better-sqlite3`。

## 状态边界

`~/.anti-ai/creature.json` 仍是唯一持久化玩法文件，只保存离散用量带和派生玩法状态，不保存精确 Token、模型名、Prompt、回复、工具调用或来源路径。

`~/.anti-ai/desktop/link-v1.json` 与 `snapshot-v1.json` 是私有集成/展示文件，不是玩法状态。两者都使用 `0600` 权限和原子替换。只有 link 可以包含经过校验的 Node/CLI 绝对路径；snapshot 不能包含路径或原始统计值。`desktop status` 读取两者时不会扫描或写入。`creature reset` 也会移除桌面快照，避免已销毁的异变体继续被展示成当前状态。

- 完整来源的人类可读 `today`、`week`、`month`，以及 `creature`、`encounter --save`、`encounter host`、`encounter release`、改变状态的实验室动作、显式远征动作和 `clinic start`，可能写入本地成长史。
- 带来源过滤的报告和 `today --json` 只做统计。
- TUI 的浏览、档案查看、观察、回放、分享预览与取消操作保持只读。每日结算的影响预览可能扫描受支持的用量元数据但不会写入。后果陈列柜调整，以及每天各一次的“观察”和“接触”，只会在明确确认后写入稳定收藏/互动 ID。远征的定向启程、推进与分叉处置把当前选中项加 `Enter` 视为明确意图，并带有执行中输入锁；放弃和影响更大的选择仍保留独立预览。远征资格按本地自然日计算，不依赖异变体结算。所有写入都经过共享动作服务。确认分享预览后只会以禁止覆盖的方式新建一个 SVG，不会改变玩法状态；启动目录不可写时改用 `~/.anti-ai/exports`。
- `clinic`、`clinic history`、`encounter visitors`、`codex`、`creature habitat`、`creature chronicle`、所有 `share` 卡片、`doctor`、`explain` 与 Help 仍是只读快照。门诊历史只读取已封存的隐私安全每日样本，不扫描 Agent 存储。年鉴、世代对照、病理星图、馆藏异变、访客档案视图和活体生态舱场景继续在内存中派生。
- `creature reset` 是唯一主动删除状态文件及迁移备份的命令。

读取状态时会先校验 schema 以及所有已存在的嵌套状态外壳，再迁移或派生，并逐版本执行迁移。迁移后的第一次写入会在 `~/.anti-ai/backups/` 保存按内容寻址的原始副本。写入使用临时文件、原子重命名、短时文件锁和乐观指纹；过期并发命令会失败，而不会覆盖更新后的成长记录。

## 扩展边界

新增本地 Agent 时，在 `src/registry.mjs` 注册元数据，在 `src/infrastructure/sources/jsonl.mjs` 或 `sqlite.mjs` 实现适配器，并在 `src/infrastructure/sources/index.mjs` 注册。JSONL 应流式读取；SQLite 必须只读、可选，并在数据库不存在时返回空用量。公共解析、数值归一化、快照去重和原生模块懒加载放在 `runtime.mjs`，不要复制到具体适配器。

拥有较多编排逻辑的新命令放入 `src/commands/`。参数与白名单归注册/CLI 层，领域计算归领域模块，展示归 `src/cli/render.mjs` 或 `src/renderers/`。

桌面投影放在 `src/application/desktop-snapshot.mjs`；bridge 与快照的文件系统机制放在 `src/infrastructure/desktop-store.mjs`；公开编排放在 `src/commands/desktop.mjs`。所有已有写入都通过 `persistCreatureState()`，因此有效关联会收到一次尽力而为的快照同步。投影复用 TUI/Application 的双语播报、门诊、生态舱、伴生物、访客与建议语义，不复制它们的优先级规则。Swift 可以忽略主版本 1 中新增的字段，但两个运行时都会拒绝未知主版本。`DesktopUpdateController` 是独立原生分发适配器：更新配置必须在发版时注入，自动检查默认关闭，系统画像保持关闭，任何更新 API 都不能接收快照或玩法数据。

与展示无关的查询模型和动作编排放入 `src/application/`：`action-catalog.mjs` 派生可用性、禁用原因与确认模式；`actions.mjs` 负责 TUI 预览与确认会话；`action-execution.mjs` 是 CLI 与 TUI 共享的唯一写操作用例；`settlement.mjs` 保存共享结算链路；`archive.mjs` 派生孵化后的逐日收容记录。`daily-briefing.mjs` 把所选日期的档案记录、门诊诊断、收藏变化、活体生态舱场景和动作可用性压缩成一份确定性的五段播报，并且最多给出一个建议动作。`projections.mjs` 在一次请求内缓存异变体、图鉴、伴生物、实验室和培养架投影，避免同一屏幕或导出重复计算整张对象图。`share-export.mjs` 是 CLI 与 TUI 共用的卡片准备链路，以只读方式选择可写目录，并在确认后才创建目录和文件。CLI 命令和 TUI 调用这些服务，不重复实现领域规则；TUI 不能调用命令处理器或执行任意 Shell 命令，异变规则仍只能由领域模块负责。`src/clinic.mjs` 负责纯诊断和趋势规则，`src/clinic-studies.mjs` 从已封存样本派生被动研究状态，`src/application/clinic.mjs` 是 CLI 与 TUI 共享的研究启动写入服务。`src/visitation.mjs` 负责访客档案、共处状态约束和确定性共处投影，`src/visitation-content.mjs` 保存路线对等的双语内容，`src/application/visitation.mjs` 是 CLI 与 TUI 共用的接待/入住/送离服务。`creature-casebook.mjs` 负责区间病历查询，`src/chronicle.mjs` 再把它组合成当前身份、7/30/90 天病程和世代对照；`src/creature/codex.mjs` 从已经派生的异变体构建收藏投影，`src/creature/state.mjs` 负责 schema 归一化、顺序迁移和持久化接线；`src/collection-sets.mjs` 负责路线对等且只影响展示的星座定义、显露规则与病程阶段；`src/collection-phenotype.mjs` 根据带日期的固定发现派生里程碑馆藏异变，但不改变基础外观身份。这些查询模块都不能写状态或拥有动作。`src/habitat-scenes.mjs` 负责路线平衡的活体生态舱原型，并只读派生环境、本体姿态、关系语境、近期痕迹、时段和短讯。`src/incidents.mjs` 独立负责确定性的事故资格、上下文选择、响应封存、延迟后果和双章节事件链。`src/expedition.mjs` 负责不累计的本地日期资格、稳定十格计划、分叉、变化、收藏解锁和历史日期过滤；`src/expedition/content.mjs` 负责双语内容，`presentation.mjs` 派生 CLI、TUI 与 SVG 共同消费的事件层级和返航总结。适配层只负责展示或调用这些规则。

TUI 必须消费结构化快照，不能解析终端文案；五个区域依次为总览、生态舱、远征、实验室和图鉴。总览默认显示播报，`e` 只在会话内展开完整年鉴/标本档案和门诊投影；播报不是弹窗，数字键始终可以直接离开。门诊研究复用行动中心，不增加第六个区域、打卡动作或后台计时器。图鉴读取同一组十二项派生星座并按三条路线分栏。总览 `s` 与 CLI `share --card briefing` 渲染同一份播报结构，dossier 继续承担长期病程分享。生态舱直接消费与终端和 SVG 适配层相同的活体场景和可选访客投影，不重复拼装展示规则；`v` 浮层执行“粘贴 AA1 → 只读校验预览 → 明确保存”，再通过共享访客服务完成档案入住与送离。schema v14 曾增加远征索引，schema v15 新增门诊容器和隐私安全的每日代谢样本，schema v16 新增空的版本化访客共处记录，不会虚构访客或历史共处。既有内容迁移仍会给旧记录补上 `contentVersion: 1`，只让新结算日期进入 v2 内容池。`src/consequence-cabinet.mjs` 负责 3 个陈列位引用与确定性每日叙事反馈；`src/application/tui-motion.mjs` 负责确定性的 ASCII 帧、器官观察、异色故障特征、伴生动作、事件回放场景、低频活体环境变化和临时远征光标动态，本身不能访问计时器或持久化；`src/application/tui-controller.mjs` 负责显式的临时控制状态、总览展示模式与 reducer，并保证 Help、动作、分享和访客浮层打开时暂停动态；`src/tui/app.jsx` 负责输入和控制编排，`src/tui/screens/` 下的组件只负责各自页面展示。动态刷新最高 4 FPS，离开活体页面后暂停，也能在不改变快照的前提下彻底关闭。

Ink 与 React 只存在于 `devDependencies`，由 `scripts/build-tui.mjs` 打包为 `dist/tui.mjs`；普通命令不会加载框架，安装包仍没有必需运行时依赖。只编辑 `src/tui/`，不要直接修改生成产物。

异变体语料放在 `src/creature/content.mjs`，纯外观组合放在 `src/creature/appearance.mjs`，ANSI 上色放在 `src/renderers/creature-art.mjs`，带版本的每日成长策略放在 `src/creature/balance.mjs`，聚合成长规则留在 `src/creature.mjs`。终端报告组合留在 `src/reporting.mjs`，较大的确定性罪名文案决策树放在 `src/reporting/verdict.mjs`。平衡规则 v2 使用此前最多 28 个非零活跃日的中位数作为个人基线；绝对剂量过高只增加污染，不额外奖励能力点；当前生态由最近 28 个阅历日决定，同时保留终身累计值作为档案。任何新机制都必须守住产品护栏：高消耗、克制使用和 AI 清醒日可以塑造不同结果，但 Token 数量不能成为唯一升级路径。

## 质量门禁

- `npm test`：快速公共行为测试。
- `npm run build:tui`：编译自包含的 Ink/React 适配层。
- `npm run check`：检查语法、行尾空格、缺失的相对导入、运行时循环依赖、受保护层级边界、1500 行源码模块上限、本地 Markdown 链接，以及 TUI bundle 与第三方声明是否逐字节最新；该命令不会改写生成物。
- `npm run test:coverage`：`src` 行覆盖率 90%、函数 90%、分支 75%。
- `npm run test:package`：打包真实 tarball，在没有可选原生依赖时安装并运行。
- `npm run verify`：完整本地与发布前门禁。
- `cd apps/macos && swift test`：原生 schema、器官、动态、位置、多语言、全屏、bridge 与更新配置契约测试。
- `cd apps/macos && ./scripts/build-release.sh <version>`：通用架构 app/DMG/更新 ZIP 构建、内嵌框架与嵌套签名校验、体积预算、可见窗口启动与干净退出冒烟。公开产物还必须通过 Ed25519 签名 appcast、Developer ID 公证和真机验收。

CI 在 Node.js 22、24、26 上执行完整 Node 门禁，并使用 macOS 15 runner、以 macOS 14 为部署目标执行原生格式、测试以及 arm64/x86_64 release 构建；CodeQL 与 Dependabot 覆盖源码和依赖漂移。
