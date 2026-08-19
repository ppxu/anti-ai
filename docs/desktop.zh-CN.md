# 原生 macOS 桌面伴生体

[English](./desktop.md)

anti-ai v4.2 继续把 macOS 14 或更高版本的可选原生桌面层保持得足够轻，同时增加一个直接的“活体触点”。完整统计和玩法仍由 CLI 与 TUI 承担。

## 安装与关联

CLI 与桌面应用是两个独立产物。先安装 CLI，再从通用 DMG 安装 `anti-ai.app`，最后明确关联这一份 CLI：

```bash
npm install -g anti-ai
anti-ai desktop link
open /Applications/anti-ai.app
```

以下命令用于检查或修复关联：

```bash
anti-ai desktop status
anti-ai desktop status --json
anti-ai desktop refresh
anti-ai desktop link
```

`status` 完全只读。`link` 会保存 `process.execPath` 与当前 CLI 入口的绝对路径，并执行第一次显式刷新。`refresh` 复用正常六来源 Scanner 与结算链路，结算到今天。来源报错或 bridge 无效时会保留上一份可读快照。

切换 Node 版本管理器、移动 npm 安装目录，或把 anti-ai 重装到其他位置后，应重新运行 `desktop link`。

## 桌面交互

应用采用 accessory 模式，没有 Dock 主窗口；透明的 150×140 pt 本体与 anti-ai 菜单栏图标是仅有的常驻 UI。

- 直接拖动本体；选择“锁定位置”后，整个透明窗口会点击穿透。
- 单击未锁定本体会显示一张短状态气泡，包含当前状态、主诊断和最多一项既有建议。气泡自动消失，不会成为 key/main window。
- 双击会进入建议动作对应的 TUI 白名单区域，无法定向时回到总览。移动超过阈值会被识别为拖拽，不会误开气泡或 TUI。
- 显示器断连或布局变化后，可用“重置位置”恢复。
- `待机`、`过载`、`清醒`、`异常` 可以临时预览展示态；新快照会恢复派生状态。
- 动态可选“关闭”“低动态”“完整动态”，最高 4 FPS；系统开启“减少动态效果”时，完整动态会降为低动态。
- “刷新桌面快照”只执行一次显式 CLI 刷新。
- “打开完整 TUI”用于统计、收藏、实验室、远征、访客和其他操作。
- “检查更新…”只手动检查桌面应用；“自动检查更新”默认关闭，只有用户明确开启后才生效。
- 整份菜单可在中英文间切换，语言选择保存在本地。
- 菜单顶层保留身份、同步、诊断、建议、刷新和完整 TUI；位置、展示态、动态、语言和更新统一放入“设置”。

本体在隐藏或屏幕休眠时暂停；前台应用拥有铺满屏幕的全屏窗口时自动隐藏。只有在用户原本没有手动隐藏时，它才会在离开全屏后恢复。应用不会成为 key/main window。

## 快照契约

`~/.anti-ai/desktop/snapshot-v1.json` 是使用 mode `0600` 原子写入的展示缓存，包含：

- 生成日期、时间和同步状态；
- 稳定的异变体指纹、阶段、生态、病型、形态、器官、异色、伤痕和嫁接 ID；
- 可选伴生物与访客展示 ID；
- 生态舱场景、时段与现象 ID；
- 双语每日收容播报段落；
- 门诊诊断与证据状态；
- 最多一项既有建议动作。

Swift 解码器会忽略未知字段，遇到未知主版本会安全失败。缺失、过期、损坏、不兼容、刷新失败和 TUI 打开失败都会明确显示在菜单里；应用不会静默把原型标本伪装成当前数据。

独立的 `~/.anti-ai/desktop/link-v1.json` 保存 GUI 启动所需的 Node 与 CLI 路径，解决图形应用 `PATH` 不包含版本管理器的问题。路径不会进入快照、`desktop status --json` 或分享卡。

## 隐私与进程边界

桌面应用不会解析 Codex、Claude Code、OpenCode、OpenClaw、Hermes 或 Pi 记录，也不会导入或重写 Scanner、结算、成长、门诊、访客、远征或动作规则。这些逻辑继续只存在于 Node 应用层和领域层。

只有用户选择“刷新桌面快照”后，应用才启动一次子进程。`Process` 只接收经过校验的 Node 可执行文件与固定参数 `<cli-entry> desktop refresh --json`，不经过 Shell，也不接收任意动作字符串。“打开完整 TUI”和本体双击会生成一个 mode `0700`、完成安全引号处理的 `.command` 文件，其中只有经过校验的 Node 路径、CLI 路径、固定 `tui --area` 动作和一个由枚举约束的白名单区域，再交给 macOS 用用户终端打开。

快照不包含精确 Token、请求数、来源/模型名、Prompt、回复、工具调用正文、项目路径、逐请求时间、对话、污染编码或内部计划哈希。应用不增加账号、遥测、hook、登录项、watcher 或 daemon。

桌面更新由隔离的 Sparkle 适配器负责。自动检查默认关闭；只有用户选择“检查更新…”，或明确开启自动检查后，应用才会发起网络请求。更新源使用 HTTPS，更新包必须通过 Ed25519 签名校验，系统画像收集保持关闭，安装时只运行 Sparkle 的短生命周期 helper，不引入常驻服务。检查更新会不可避免地向 GitHub 托管的更新源暴露网络地址和当前 App 版本，但不会上传桌面快照、异变体状态、Agent 日志、路径、Prompt、回复、Token、来源/模型元数据或设备画像。独立安装的 CLI 仍通过 npm 更新，桌面更新器不会替换 CLI。

## 构建本地正式候选

需要 macOS 14+、Xcode Command Line Tools 与 Swift 6.1+：

```bash
cd apps/macos
./scripts/build-release.sh 4.2.0
```

脚本会执行格式与测试，分别交叉构建 arm64 和 x86_64，合成通用二进制，嵌入 Sparkle，生成图标和应用包，从内到外签名嵌套 helper，并制作压缩 DMG 与更新 ZIP；随后验证元数据、双架构、签名、可见窗口启动、低于 15 MiB 的包体积和退出无残留。没有额外环境配置时使用 ad-hoc 签名并禁用更新菜单，适合本机验证。

## 安装 v4.2 未公证预览版

v4.2.0 桌面下载是明确的临时**未公证预览版**：它只使用 ad-hoc 签名，没有 Apple 可识别的开发者身份，也没有经过 Apple 公证。请只从[官方 v4.2.0 GitHub Release](https://github.com/ppxu/anti-ai/releases/tag/v4.2.0)下载，可以再核对随包发布的 SHA-256 文件；把 `anti-ai.app` 拖入“应用程序”后先尝试打开一次。如果 macOS 阻止启动且你确认要继续，请进入**系统设置 → 隐私与安全性**，滚动到“安全性”，选择**仍要打开**，然后再次确认“打开”。Apple 明确提醒绕过这项保护会带来额外风险，因此不要运行来自其他渠道的副本。

Sparkle 更新包仍必须通过项目的 Ed25519 签名校验，但它只验证更新归档，不能替代 Apple Developer ID 身份和公证。自动检查仍默认关闭。构建这种预览包时必须显式选择该模式：

```bash
ANTI_AI_ALLOW_UNNOTARIZED_RELEASE=1 \
ANTI_AI_SPARKLE_PUBLIC_KEY="<已生成的 Sparkle 公钥>" \
./scripts/build-release.sh 4.2.0
```

未来的稳定桌面分发仍以 Developer ID 签名、Apple 公证和下方真机验收为门禁。

公开分发前只需创建一次 Sparkle 签名密钥。私钥保存在登录钥匙串中，命令会输出写入 App 的公钥：

```bash
cd apps/macos
swift build
./scripts/sparkle-key.sh
```

然后配置公钥、Developer ID 身份与 `notarytool` Keychain profile：

```bash
ANTI_AI_SPARKLE_PUBLIC_KEY="<上一步输出的公钥>" \
ANTI_AI_CODESIGN_IDENTITY="Developer ID Application: Example (TEAMID)" \
ANTI_AI_NOTARY_PROFILE="anti-ai-notary" \
./scripts/build-release.sh 4.2.0
```

此时脚本会启用 hardened runtime 与时间戳，在生成更新包前公证并装订 App，再公证 DMG，校验两条分发路径并写出 SHA-256 文件。签名公钥只在构建时注入，私钥绝不能提交。

发布用更新 ZIP 生成后，再签出更新源：

```bash
ANTI_AI_SPARKLE_RELEASE_NOTES_FILE="../../release-notes.md" \
./scripts/generate-appcast.sh 4.2.0
```

脚本复用同一钥匙串账户，只把当前版本的更新包与可选发布说明放入临时目录，生成一条新签名记录，再从上一份 `dist/appcast.xml` 合并最多两条保持原样的历史记录，避免旧归档被错误换成当前版本下载地址。上一份更新源位于其他位置时可设置 `ANTI_AI_SPARKLE_PREVIOUS_APPCAST`。脚本仍不生成 delta，最终写出 `dist/appcast.xml`。把 DMG、更新 ZIP 与 `appcast.xml` 上传到对应 GitHub Release。默认更新源是 GitHub 的 `releases/latest/download/appcast.xml`；更新源和下载地址均可通过文档中的 `ANTI_AI_SPARKLE_*` 环境变量覆盖。真正上传仍是独立发版动作。

## 发布验收

自动化门禁覆盖 schema 兼容、隐私标志、40 个基础器官变体、单击/拖拽/双击路由、不抢焦点的状态气泡、位置锁定、全屏抑制、固定白名单 bridge 参数、Shell 引号、双语、更新配置、动画、通用应用包、内嵌框架解析、嵌套签名、更新 ZIP 解包、可见窗口、体积与残留进程。

稳定公开分发还需要 Developer ID 公证产物，以及原计划中的真实设备验收：至少五台 Mac，尽可能覆盖 Apple Silicon/Intel、单屏/外接屏、浅色/深色、普通/全屏应用，并连续预发布使用七天，其中包含一个工作日的长时间资源观察。这些属于发布操作门禁，不是本地源码构建已经完成的事实。
